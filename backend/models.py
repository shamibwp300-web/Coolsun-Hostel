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

class Room(db.Model, SoftDeleteMixin):
    __tablename__ = "rooms"
    id = db.Column(db.Integer, primary_key=True)
    floor_id = db.Column(db.Integer, db.ForeignKey("floors.id"))
    floor = db.Column(db.Integer)
    number = db.Column(db.String(10), unique=True)
    type = db.Column(db.String(20))
    capacity = db.Column(db.Integer)
    base_rent = db.Column(db.Numeric(10, 2))
    tenants = db.relationship("Tenant", backref="room", lazy=True)

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
    billing_profile = db.relationship("BillingProfile", uselist=False, backref="tenant")
    documents = db.relationship("Document", backref="tenant", lazy=True)
    transactions = db.relationship("Ledger", backref="tenant", lazy=True)

class Task(db.Model, SoftDeleteMixin):
    __tablename__ = "tasks"
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200))
    status = db.Column(db.String(20))

class StaffMember(db.Model, SoftDeleteMixin):
    __tablename__ = "staff_members"
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100))

class StaffAttendance(db.Model, SoftDeleteMixin):
    __tablename__ = "staff_attendance"
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey("staff_members.id"))

class MaintenanceRequest(db.Model, SoftDeleteMixin):
    __tablename__ = "maintenance_requests"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"))
    description = db.Column(db.Text)
    status = db.Column(db.String(20))

class BillingProfile(db.Model, SoftDeleteMixin):
    __tablename__ = "billing_profiles"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"))
    rent_amount = db.Column(db.Numeric(10, 2))

class Ledger(db.Model, SoftDeleteMixin):
    __tablename__ = "ledger"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"))
    amount = db.Column(db.Numeric(10, 2))
    type = db.Column(db.String(20))
    status = db.Column(db.String(20))

class Document(db.Model, SoftDeleteMixin):
    __tablename__ = "documents"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"))
    url = db.Column(db.String(255))

class MeterReading(db.Model, SoftDeleteMixin):
    __tablename__ = "meter_readings"
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey("rooms.id"))

class WaterBill(db.Model, SoftDeleteMixin):
    __tablename__ = "water_bills"
    id = db.Column(db.Integer, primary_key=True)

class InternetBill(db.Model, SoftDeleteMixin):
    __tablename__ = "internet_bills"
    id = db.Column(db.Integer, primary_key=True)

class FineType(db.Model, SoftDeleteMixin):
    __tablename__ = "fine_types"
    id = db.Column(db.Integer, primary_key=True)

class AuditLog(db.Model):
    __tablename__ = "audit_logs"
    id = db.Column(db.Integer, primary_key=True)
    action = db.Column(db.String(255))
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class Expense(db.Model, SoftDeleteMixin):
    __tablename__ = "expenses"
    id = db.Column(db.Integer, primary_key=True)
    amount = db.Column(db.Numeric(10, 2))

class MoveOutRecord(db.Model, SoftDeleteMixin):
    __tablename__ = "move_out_records"
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey("tenants.id"))
    exit_date = db.Column(db.Date)
