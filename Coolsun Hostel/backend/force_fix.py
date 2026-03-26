import os

content = """from datetime import datetime, date, timedelta
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

class Floor(db.Model, SoftDeleteMixin):
    __tablename__ = 'floors'
    id = db.Column(db.Integer, primary_key=True)
    floor_number = db.Column(db.Integer, nullable=False, unique=True)
    name = db.Column(db.String(100), nullable=True)
    is_contracted = db.Column(db.Boolean, default=False)
    contractor_name = db.Column(db.String(100), nullable=True)
    contract_rent = db.Column(db.Numeric(10, 2), default=0)
    max_capacity = db.Column(db.Integer, default=30)
    rooms = db.relationship('Room', backref='floor_ref', lazy=True)

class User(db.Model, SoftDeleteMixin):
    __tablename__ = 'users'
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(50), unique=True, nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.Enum('Owner', 'Manager', 'Admin'), nullable=False)
    is_on_duty = db.Column(db.Boolean, default=True)
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Room(db.Model, SoftDeleteMixin):
    __tablename__ = 'rooms'
    id = db.Column(db.Integer, primary_key=True)
    floor_id = db.Column(db.Integer, db.ForeignKey('floors.id'), nullable=True)
    floor = db.Column(db.Integer, nullable=False)
    number = db.Column(db.String(10), nullable=False, unique=True)
    type = db.Column(db.Enum('Small', 'Medium', 'Large'), nullable=False)
    capacity = db.Column(db.Integer, nullable=False)
    base_rent = db.Column(db.Numeric(10, 2), default=10000.00)
    tenants = db.relationship('Tenant', backref='room', lazy=True)
    def get_active_tenants(self):
        return [t for t in self.tenants if t.deleted_at is None]

class Tenant(db.Model, SoftDeleteMixin):
    __tablename__ = 'tenants'
    id = db.Column(db.Integer, primary_key=True)
    name = db.Column(db.String(100), nullable=False)
    cnic = db.Column(db.String(20), nullable=False)
    phone = db.Column(db.String(20), nullable=False)
    room_id = db.Column(db.Integer, db.ForeignKey('rooms.id'), nullable=False)
    police_status = db.Column(db.Enum('Pending', 'Submitted', 'Verified'), default='Pending')
    agreement_start_date = db.Column(db.Date, nullable=False)
    actual_move_in_date = db.Column(db.Date, nullable=False)
    tenancy_type = db.Column(db.Enum('Shared', 'Private'), default='Shared')
    billing_profile = db.relationship('BillingProfile', uselist=False, backref='tenant', cascade="all, delete-orphan")
    documents = db.relationship('Document', backref='tenant', lazy=True)
    transactions = db.relationship('Ledger', backref='tenant', lazy=True)

class BillingProfile(db.Model, SoftDeleteMixin):
    __tablename__ = 'billing_profiles'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    rent_amount = db.Column(db.Numeric(10, 2), nullable=False)
    due_day = db.Column(db.Integer, default=1)

class Ledger(db.Model, SoftDeleteMixin):
    __tablename__ = 'ledger'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    amount = db.Column(db.Numeric(10, 2), nullable=False)
    type = db.Column(db.Enum('DEPOSIT', 'RENT', 'FINE', 'UTILITY'), nullable=False)
    status = db.Column(db.Enum('PAID', 'PENDING'), default='PENDING')
    timestamp = db.Column(db.DateTime, default=datetime.utcnow)

class Document(db.Model, SoftDeleteMixin):
    __tablename__ = 'documents'
    id = db.Column(db.Integer, primary_key=True)
    tenant_id = db.Column(db.Integer, db.ForeignKey('tenants.id'), nullable=False)
    type = db.Column(db.Enum('ID_Front', 'ID_Back', 'Agreement'), nullable=False)
    url = db.Column(db.String(255), nullable=False)
"""

model_path = os.path.join('backend', 'models.py')
with open(model_path, 'w', encoding='utf-8') as f:
    f.write(content)

print(f"✅ SUCCESSFULLY FIXED: {model_path} has been overwritten with full code!")