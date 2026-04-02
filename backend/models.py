from datetime import datetime, date, timedelta
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import CheckConstraint
from werkzeug.security import generate_password_hash, check_password_hash

db = SQLAlchemy()

class SoftDeleteMixin(object):
    deleted_at = db.Column(db.DateTime, nullable=True)
    def delete(self):
        self.deleted_at = datetime.utcnow()
        db.session.add(self)
    @classmethod
    def query_active(cls):
        return cls.query.filter_by(deleted_at=None)

class User(db.Model, SoftDeleteMixin):
    __tablename__ = "users"
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True)
    password_hash = db.Column(db.String(255))
    role = db.Column(db.Enum("Owner", "Manager", "Admin"))
    is_on_duty = db.Column(db.Boolean, default=True)
    def set_password(self, pw): self.password_hash = generate_password_hash(pw)
    def check_password(self, pw): return check_password_hash(self.password_hash, pw)

class Floor(db.Model, SoftDeleteMixin):
    __tablename__ = "floors"
    id = db.Column(db.Integer, primary_key=True)
    floor_number = db.Column(db.Integer, unique=True)
    name = db.Column(db.String(100))
    rooms = db.relationship("Room", backref="floor_ref", lazy=True)
    
    # Bulk Floor Renting Fields
    is_bulk_rented = db.Column(db.Boolean, default=False)
    bulk_tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"), nullable=True)
    bulk_rent_amount = db.Column(db.Numeric(10, 2), nullable=True)
    bulk_security_deposit = db.Column(db.Numeric(10, 2), nullable=True)
    max_bulk_capacity = db.Column(db.Integer, default=30)

class Room(db.Model, SoftDeleteMixin):
    __tablename__ = "rooms"
    id = db.Column(db.Integer, primary_key=True)
    floor_id = db.Column(db.Integer, db.ForeignKey("floors.id"))
    floor = db.Column(db.Integer)
    number = db.Column(db.String(10), unique=True)
    type = db.Column(db.String(20))
    capacity = db.Column(db.Integer)
    base_rent = db.Column(db.Numeric(10, 2))
    is_bulk_rented = db.Column(db.Boolean, default=False)
    tenants = db.relationship("Tenant", backref="room", lazy=True)
    def get_active_tenants(self): return [t for t in self.tenants if t.deleted_at is None]

class Tenant(db.Model, SoftDeleteMixin):
    __tablename__ = "tenants"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    cnic = db.Column(db.String(20))
    phone = db.Column(db.String(20))
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id"))
    agreement_start_date = db.Column(db.Date)
    actual_move_in_date = db.Column(db.Date)
    police_status = db.Column(db.String(20))
    
    # Pre-Launch Added Fields
    father_name = db.Column(db.String(100))
    permanent_address = db.Column(db.String(255))
    police_station = db.Column(db.String(100))
    id_card_front_url = db.Column(db.String(255))
    id_card_back_url = db.Column(db.String(255))
    police_form_url = db.Column(db.String(255))
    agreement_url = db.Column(db.String(255))
    police_form_submitted = db.Column(db.DateTime)
    internet_opt_in = db.Column(db.Boolean, default=False)
    tenancy_type = db.Column(db.String(50))
    emergency_contact = db.Column(db.String(50))
    is_partial_payment = db.Column(db.Boolean, default=False)
    parent_tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"))
    compliance_alert = db.Column(db.Boolean, default=False)
    bed_label = db.Column(db.String(20))
    
    billing_profile = db.relationship("BillingProfile", uselist=False, backref="tenant")
    documents = db.relationship("Document", backref="tenant", lazy=True)
    transactions = db.relationship("Ledger", backref="tenant", lazy=True)
    
    def get_compliance_status(self):
        return {
            "status": self.police_status,
            "alert": self.compliance_alert,
            "submitted_at": self.police_form_submitted.isoformat() if self.police_form_submitted else None
        }

class Task(db.Model, SoftDeleteMixin):
    __tablename__ = "tasks"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200))
    status = db.Column(db.String(20), default="Pending")
    priority = db.Column(db.String(20), default="Medium")
    service_queue = db.Column(db.String(100))
    proof_url = db.Column(db.String(255))

class StaffMember(db.Model, SoftDeleteMixin):
    __tablename__ = "staff_members"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    role = db.Column(db.String(50))
    phone = db.Column(db.String(20))
    salary = db.Column(db.Numeric(10, 2))
    joined_at = db.Column(db.Date)

class StaffAttendance(db.Model, SoftDeleteMixin):
    __tablename__ = "staff_attendance"
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey("staff_members.id"))
    date = db.Column(db.Date)
    status = db.Column(db.String(20), default="Present")
    time_in = db.Column(db.String(10))
    time_out = db.Column(db.String(10))
    notes = db.Column(db.Text)

class MaintenanceRequest(db.Model, SoftDeleteMixin):
    __tablename__ = "maintenance_requests"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"))
    description = db.Column(db.Text)
    status = db.Column(db.String(20))
    priority = db.Column(db.String(20), default="Routine")
    is_approved = db.Column(db.Boolean, default=False)
    assigned_to = db.Column(db.String(100))
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class BillingProfile(db.Model, SoftDeleteMixin):
    __tablename__ = "billing_profiles"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"))
    rent_amount = db.Column(db.Numeric(10, 2))
    security_deposit = db.Column(db.Numeric(10, 2))
    pro_rata_rent = db.Column(db.Numeric(10, 2))
    due_day = db.Column(db.Integer, default=1)

class Ledger(db.Model, SoftDeleteMixin):
    __tablename__ = "ledger"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"))
    amount = db.Column(db.Numeric(10, 2))
    type = db.Column(db.String(20))
    status = db.Column(db.String(20))
    payment_method = db.Column(db.String(50))
    description = db.Column(db.String(255))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class Document(db.Model, SoftDeleteMixin):
    __tablename__ = "documents"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"))
    type = db.Column(db.Enum('ID_Front', 'ID_Back', 'Agreement', 'Police_Form'))
    url = db.Column(db.String(255), nullable=False)

class MeterReading(db.Model, SoftDeleteMixin):
    __tablename__ = "meter_readings"
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id"))
    previous_reading = db.Column(db.Integer)
    current_reading = db.Column(db.Integer)
    units_consumed = db.Column(db.Integer)
    unit_cost = db.Column(db.Numeric(10, 2))
    total_bill = db.Column(db.Numeric(10, 2))
    reading_date = db.Column(db.Date)
    is_billed = db.Column(db.Boolean, default=False)
    
    room = db.relationship("Room", backref="meter_readings")

class WaterBill(db.Model, SoftDeleteMixin):
    __tablename__ = "water_bills"
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id"))
    amount = db.Column(db.Numeric(10, 2))
    billing_date = db.Column(db.Date)

class InternetBill(db.Model, SoftDeleteMixin):
    __tablename__ = "internet_bills"
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id"))
    amount = db.Column(db.Numeric(10, 2))
    billing_date = db.Column(db.Date)

class FineType(db.Model, SoftDeleteMixin):
    __tablename__ = "fine_types"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))
    amount = db.Column(db.Numeric(10, 2))
    description = db.Column(db.Text)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class AuditLog(db.Model):
    __tablename__ = "audit_logs"
    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(255))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class Expense(db.Model, SoftDeleteMixin):
    __tablename__ = "expenses"
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Numeric(10, 2))
    category = db.Column(db.String(100))
    description = db.Column(db.Text)
    sub_note = db.Column(db.Text)
    date = db.Column(db.Date, default=date.today)
    approval_status = db.Column(db.String(20), default="Pending")

class MoveOutRecord(db.Model, SoftDeleteMixin):
    __tablename__ = "move_out_records"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"))
    exit_date = db.Column(db.Date)