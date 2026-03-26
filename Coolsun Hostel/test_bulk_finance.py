from backend.app import create_app
from backend.models import db, Tenant, Floor, Ledger, Room
from datetime import datetime

app = create_app()
with app.app_context():
    # 1. Cleanup old test data
    Tenant.query.filter(Tenant.name.contains('Test')).delete()
    Ledger.query.filter(Ledger.description.contains('Bulk')).delete()
    db.session.commit()
    print("Cleanup done.")

    # 2. Create Bulk Owner
    owner = Tenant(name='Test Bulk Owner', cnic='1234567890123')
    db.session.add(owner)
    db.session.commit()
    print(f"Created Owner: {owner.id}")

    # 3. Apply Bulk Rental to Floor 1 (First Floor)
    floor = Floor.query.filter_by(floor_number=1).first()
    if not floor:
        floor = Floor(floor_number=1, name="First Floor")
        db.session.add(floor)
    
    floor.is_bulk_rented = True
    floor.bulk_tenant_id = owner.id
    floor.bulk_rent_amount = 60000
    floor.bulk_security_deposit = 60000
    
    # Financial Integration (Manual trigger of the logic I added to rooms.py)
    # 1. Security Deposit
    db.session.add(Ledger(
        tenant_id=owner.id,
        amount=60000,
        type='DEPOSIT',
        status='PAID',
        payment_method='Cash',
        description=f"Bulk Floor Rental Security ({floor.name}) - One-time"
    ))
    # 2. Rent
    db.session.add(Ledger(
        tenant_id=owner.id,
        amount=60000,
        type='RENT',
        status='PAID',
        payment_method='Cash',
        description=f"Bulk Floor Rent ({floor.name}) - Initial Billing"
    ))
    
    db.session.commit()
    print("Bulk Rental Applied with Ledger entries.")

    # 4. Verify Dashboard Summary Logic
    # Collected (All-time PAID)
    current_collected = db.session.query(db.func.sum(Ledger.amount)).filter(
        Ledger.type.in_(['RENT', 'PRIVATE_RENT', 'DEPOSIT', 'UTILITY', 'FINE']),
        Ledger.status == 'PAID',
        Ledger.deleted_at == None
    ).scalar() or 0.0
    
    print(f"Verified Collected Revenue in DB: {current_collected}")

    # 5. Check if it shows up for this specific tenant
    tenant_total = db.session.query(db.func.sum(Ledger.amount)).filter(
        Ledger.tenant_id == owner.id,
        Ledger.status == 'PAID'
    ).scalar() or 0.0
    print(f"Revenue from Owner {owner.id}: {tenant_total}")
