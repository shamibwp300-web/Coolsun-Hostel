from backend.app import create_app
from backend.models import db, Tenant, BillingProfile, Ledger
from datetime import datetime

app = create_app()

with app.app_context():
    tenants = Tenant.query.filter_by(deleted_at=None).all()
    count_missing_profiles = 0
    count_sec_added = 0
    count_already_sec = 0

    for t in tenants:
        if not t.billing_profile:
            bp = BillingProfile(
                tenant_id=t.id, 
                rent_amount=t.room.base_rent if t.room else 10000, 
                security_deposit=t.room.base_rent if t.room else 10000
            )
            db.session.add(bp)
            count_missing_profiles += 1
            # flush so we can use it
            db.session.flush()
        
        # Check if they have a DEPOSIT ledger
        deposits = Ledger.query.filter_by(tenant_id=t.id, type='DEPOSIT', deleted_at=None).all()
        if not deposits:
            # Create a PENDING DEPOSIT ledger
            sec_amt = t.billing_profile.security_deposit if t.billing_profile else (t.room.base_rent if t.room else 10000)
            if sec_amt > 0:
                l = Ledger(
                    tenant_id=t.id,
                    amount=sec_amt,
                    type='DEPOSIT',
                    status='PENDING',
                    description='Initial Security Deposit',
                    timestamp=t.agreement_start_date or datetime.utcnow()
                )
                db.session.add(l)
                count_sec_added += 1
        else:
            count_already_sec += 1

    db.session.commit()
    print(f"Total Active Tenants: {len(tenants)}")
    print(f"Created Missing Billing Profiles: {count_missing_profiles}")
    print(f"Created Initial Security Deposit Ledgers: {count_sec_added}")
    print(f"Tenants already having Security Deposit: {count_already_sec}")
