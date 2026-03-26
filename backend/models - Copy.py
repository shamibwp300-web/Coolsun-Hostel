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
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('Owner', 'Manager', 'Admin'), nullable=False)
    is_on_duty = db.Column(db.Boolean, default=True) # For Escalation Logic

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Room(db.Model, SoftDeleteMixin):
    __tablename__ = 'rooms'
    id = db.Column(db.Integer, primary_key=True)
    floor = db.Column(db.Integer, nullable=False)
    number = db.Column(db.String(10), nullable=False, unique=True)
    type = db.Column(db.Enum('Small', 'Medium', 'Large'), nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    base_rent = db.Column(db.Numeric(10, 2), default=10000.00)
    # Relationships
    tenants = db.relationship('Tenant', backref='room', lazy=True)

    def get_active_tenants(self):
        return [t for t in self.tenants if t.deleted_at is None]

    @property
    def available_slots(self):
        """Computed property for available beds. Returns 0 if a Private tenant is active."""
        active_tenants = [t for t in self.tenants if not t.deleted_at]
        # Occupancy Lock: If any tenant in this room is 'Private', room is full.
        if any(getattr(t, 'tenancy_type', 'Shared') == 'Private' for t in active_tenants):
            return 0
        return max(0, self.capacity - len(active_tenants))

    def get_ghost_slots(self):
        """Legacy method alias for available_slots."""
        return self.available_slots

class Tenant(db.Model, SoftDeleteMixin):
    __tablename__ = 'tenants'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False) # UTF-8 supported by DB config
    cnic = db.Column(db.String(20), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    
    # Police Verification Fields
    police_status = db.Column(db.Enum('Pending', 'Submitted', 'Verified'), default='Pending')
    police_form_submitted = db.Column(db.DateTime, nullable=True) # Track submission date
    father_name = db.Column(db.String(100), nullable=True)
    permanent_address = db.Column(db.Text, nullable=True)
    police_station = db.Column(db.String(100), nullable=True)

    compliance_alert = db.Column(db.Boolean, default=False)
    
    agreement_start_date = db.Column(db.Date, nullable=False)
    actual_move_in_date = db.Column(db.Date, nullable=False)

    # Parity fields — now real persisted DB columns
    bed_label = db.Column(db.String(50), nullable=True)         # e.g. 'Window Side'
    cnic_expiry_date = db.Column(db.Date, nullable=True)
    is_partial_payment = db.Column(db.Boolean, default=False)
    # Phase 7 & 8 fields
    internet_opt_in = db.Column(db.Boolean, default=True)
    tenancy_type = db.Column(db.Enum('Shared', 'Private'), default='Shared')
    
    # Document Verification Fields (Direct URLs)
    id_card_front_url = db.Column(db.String(255), nullable=True)
    id_card_back_url = db.Column(db.String(255), nullable=True)
    police_form_url = db.Column(db.String(255), nullable=True)

    parent_tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    sub_tenants = db.relationship('Tenant', backref=db.backref('parent_tenant', remote_side=[id]))

    billing_profile = db.relationship('BillingProfile', uselist=False, backref='tenant', cascade="all, delete-orphan")
    documents = db.relationship('Document', backref='tenant', lazy=True)
    transactions = db.relationship('Ledger', backref='tenant', lazy=True)

    @property
    def emergency_contact(self):
        return "Not Provided"
        
    @emergency_contact.setter
    def emergency_contact(self, value):
        pass

    def get_compliance_status(self):
        """
        Calculates Compliance Status based on Agreement Start Date and CNIC Expiry.
        Logic:
        - 0-7 days: NORMAL (Green)
        - 8-30 days: WARNING (Yellow)
        - 30+ days: CRITICAL (Red)
        - CNIC Expired: WARNING
        """
        # Check CNIC Expiry
        if self.cnic_expiry_date and self.cnic_expiry_date < datetime.utcnow().date():
            return 'WARNING' # CNIC Expired

        if self.police_status == 'Verified':
            return 'VERIFIED'
            
        if not self.agreement_start_date:
            return 'UNKNOWN'
            
        delta = (datetime.utcnow().date() - self.agreement_start_date).days
        
        if delta <= 7:
            return 'NORMAL'
        elif delta <= 30:
            return 'WARNING'
        else:
            return 'CRITICAL'

class MeterReading(db.Model, SoftDeleteMixin):
    __tablename__ = 'meter_readings'
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    previous_reading = db.Column(db.Integer, nullable=False)
    current_reading = db.Column(db.Integer, nullable=False)
    units_consumed = db.Column(db.Integer, nullable=False) # Auto-calculated
    unit_cost = db.Column(db.Numeric(10, 2), nullable=False) # Configurable per entry
    total_bill = db.Column(db.Numeric(10, 2), nullable=False)
    reading_date = db.Column(db.DateTime, default=datetime.utcnow)
    is_billed = db.Column(db.Boolean, default=False)
    
    room = db.relationship('Room', backref=db.backref('meter_readings', lazy=True))

class WaterBill(db.Model, SoftDeleteMixin):
    __tablename__ = 'water_bills'
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    billing_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    room = db.relationship('Room', backref=db.backref('water_bills', lazy=True))

class InternetBill(db.Model, SoftDeleteMixin):
    __tablename__ = 'internet_bills'
    id = db.Column(db.Integer, primary_key=True)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    billing_date = db.Column(db.DateTime, default=datetime.utcnow)
    
    room = db.relationship('Room', backref=db.backref('internet_bills', lazy=True))

class BillingProfile(db.Model, SoftDeleteMixin):
    __tablename__ = 'billing_profiles'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    rent_amount = db.Column(db.Numeric(10, 2), nullable=False)
    security_deposit = db.Column(db.Numeric(10, 2), default=0)
    pro_rata_rent = db.Column(db.Numeric(10, 2), default=0)
    due_day = db.Column(db.Integer, default=1) # Supports individual due dates

class Ledger(db.Model, SoftDeleteMixin):
    __tablename__ = 'ledger'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    type = db.Column(db.Enum('DEPOSIT', 'RENT', 'FINE', 'UTILITY', 'PRIVATE_RENT'), nullable=False)
    status = db.Column(db.Enum('PAID', 'PENDING'), default='PENDING')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)
    description = db.Column(db.String(255), nullable=True)
    payment_method = db.Column(db.String(20), default='Cash') # Cash or Account

class MaintenanceRequest(db.Model, SoftDeleteMixin):
    __tablename__ = 'maintenance_requests'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=True)
    description = db.Column(db.Text, nullable=False)
    priority = db.Column(db.Enum('Critical', 'High', 'Routine'), default='Routine')
    status = db.Column(db.Enum('Pending', 'Approved', 'Open', 'In Progress', 'Resolved'), default='Pending')
    is_approved = db.Column(db.Boolean, default=False)
    assigned_to = db.Column(db.String(100), nullable=True)
    is_escalated = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Expense(db.Model, SoftDeleteMixin):
    __tablename__ = 'expenses'
    id = db.Column(db.Integer, primary_key=True)
    category = db.Column(db.Enum('Operational', 'Owner Personal', 'Repairs', 'Utility'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    description = db.Column(db.Text, nullable=True)
    sub_note = db.Column(db.Text, nullable=True) # For Owner Personal details
    date = db.Column(db.DateTime, default=datetime.utcnow)
    receipt_url = db.Column(db.String(255), nullable=True)  # Phase 10: receipt photo
    
    # Phase 10: Approval Pipeline
    approval_status = db.Column(db.Enum('Pending', 'Approved', 'Rejected'), default='Pending')
    submitted_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    approved_at = db.Column(db.DateTime, nullable=True)
    
    # Phase 4 Updates
    maintenance_id = db.Column(db.Integer, db.ForeignKey('maintenance_requests.id'), nullable=True)
    paid_from_cash_drawer = db.Column(db.Boolean, default=True)

    def __init__(self, **kwargs):
        super(Expense, self).__init__(**kwargs)
        self.validate_owner_personal()

    def validate_owner_personal(self):
        if self.category == 'Owner Personal' and not self.description:
            raise ValueError("Description is mandatory for Owner Personal expenses.")

class Task(db.Model, SoftDeleteMixin):
    __tablename__ = 'tasks'
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    priority = db.Column(db.Enum('High', 'Medium', 'Low'), default='Medium')
    status = db.Column(db.Enum('Pending', 'Completed'), default='Pending')
    service_queue = db.Column(db.String(50), nullable=True) # e.g. 'Carpenter'
    proof_url = db.Column(db.String(255), nullable=True)

class Document(db.Model, SoftDeleteMixin):
    __tablename__ = 'documents'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    type = db.Column(db.Enum('ID_Front', 'ID_Back', 'Agreement', 'Police_Form', 'Tenant_Photo'), nullable=False)
    url = db.Column(db.String(255), nullable=False)


# ─────────────────────────────────────────────
# Phase 10: Fine Library
# ─────────────────────────────────────────────
class FineType(db.Model, SoftDeleteMixin):
    """Configurable fine types (Late Rent, Damage, Smoking, etc.)"""
    __tablename__ = 'fine_types'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)      # e.g. 'Late Rent Fine'
    amount = db.Column(db.Numeric(10, 2), nullable=False) # Current fine amount (editable)
    description = db.Column(db.Text, nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)


# ─────────────────────────────────────────────
# Phase 10: Immutable Audit Log
# ─────────────────────────────────────────────
class AuditLog(db.Model):
    """Immutable record of every significant action. Never soft-deleted."""
    __tablename__ = 'audit_logs'
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    action = db.Column(db.String(200), nullable=False)    # e.g. 'CREATE_TENANT'
    entity = db.Column(db.String(100), nullable=True)     # e.g. 'Tenant'
    entity_id = db.Column(db.Integer, nullable=True)
    details = db.Column(db.Text, nullable=True)           # JSON string of changes
    ip_address = db.Column(db.String(45), nullable=True)
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)


# ─────────────────────────────────────────────
# Phase 11: Staff Management
# ─────────────────────────────────────────────
class StaffMember(db.Model, SoftDeleteMixin):
    """Guard, Cleaners - no system login access."""
    __tablename__ = 'staff_members'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    role = db.Column(db.Enum('Guard', 'Cleaner', 'Other'), nullable=False)
    phone = db.Column(db.String(20), nullable=True)
    salary = db.Column(db.Numeric(10, 2), nullable=True)
    joined_at = db.Column(db.Date, nullable=True)
    attendance = db.relationship('StaffAttendance', backref='staff', lazy=True)


class StaffAttendance(db.Model):
    """Daily check-in/out attendance for non-system staff."""
    __tablename__ = 'staff_attendance'
    id = db.Column(db.Integer, primary_key=True)
    staff_id = db.Column(db.Integer, db.ForeignKey('staff_members.id'), nullable=False)
    date = db.Column(db.Date, nullable=False, default=date.today)
    status = db.Column(db.Enum('Present', 'Absent', 'Late'), default='Present')
    time_in = db.Column(db.String(10), nullable=True)    # e.g. '09:30'
    time_out = db.Column(db.String(10), nullable=True)
    notes = db.Column(db.Text, nullable=True)


# ─────────────────────────────────────────────
# Phase 12: Move-Out / Settlement
# ─────────────────────────────────────────────
class MoveOutRecord(db.Model, SoftDeleteMixin):
    """Tracks formal tenant exit and security deposit settlement."""
    __tablename__ = 'move_out_records'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    notice_date = db.Column(db.Date, nullable=False)
    exit_date = db.Column(db.Date, nullable=False)
    security_deposit_held = db.Column(db.Numeric(10, 2), default=0)
    damage_deduction = db.Column(db.Numeric(10, 2), default=0)
    fine_deduction = db.Column(db.Numeric(10, 2), default=0)
    unpaid_rent = db.Column(db.Numeric(10, 2), default=0)
    refund_amount = db.Column(db.Numeric(10, 2), default=0)  # Auto-calculated
    notes = db.Column(db.Text, nullable=True)
    approved_by = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
