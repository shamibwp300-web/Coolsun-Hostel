from backend.app import create_app
from backend.models import db, Tenant, Ledger
from sqlalchemy import func

app = create_app()
with app.app_context():
    # 1. Create a test tenant
    t = Tenant(name="Opening Balance Test", cnic="9999999999999")
    db.session.add(t)
    db.session.commit()
    print(f"Created Test Tenant: {t.id}")

    # 2. Add Opening Balance (Due) - Receivable
    db.session.add(Ledger(
        tenant_id=t.id,
        amount=5000,
        type='OPENING_BALANCE',
        status='PENDING',
        description="Manual Opening Balance (Due) - TEST"
    ))
    
    # 3. Add Opening Balance (Advance) - Credit
    db.session.add(Ledger(
        tenant_id=t.id,
        amount=2000,
        type='OPENING_BALANCE',
        status='PAID',
        payment_method='Manual Entry',
        description="Manual Opening Balance (Advance) - TEST"
    ))
    db.session.commit()
    print("Added test opening balances.")

    # 4. Verify Dashboard Query Logic
    collected = db.session.query(func.sum(Ledger.amount)).filter(
        Ledger.type.in_(['RENT', 'PRIVATE_RENT', 'DEPOSIT', 'UTILITY', 'FINE', 'OPENING_BALANCE']),
        Ledger.status == 'PAID',
        Ledger.deleted_at == None
    ).scalar() or 0.0
    
    pending = db.session.query(func.coalesce(func.sum(Ledger.amount), 0.0)).filter(
        Ledger.type.in_(['RENT', 'PRIVATE_RENT', 'DEPOSIT', 'UTILITY', 'FINE', 'OPENING_BALANCE']),
        Ledger.status == 'PENDING',
        Ledger.deleted_at == None
    ).scalar() or 0.0
    
    print(f"Internal Dash Check - Collected: {collected}, Pending: {pending}")
    # Cleanup
    Tenant.query.filter_by(id=t.id).delete()
    Ledger.query.filter(Ledger.description.contains("- TEST")).delete()
    db.session.commit()
    print("Cleanup done.")
