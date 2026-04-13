from backend.app import create_app
from backend.models import db, Tenant, BillingProfile, Ledger, Room

app = create_app()

def fix_room_billing(room_number):
    with app.app_context():
        print(f"--- Fixing Billing for Room {room_number} ---")
        room = Room.query.filter_by(number=room_number).first()
        if not room:
            print("Room not found.")
            return

        # Find active tenants in this room
        tenants = Tenant.query.filter_by(room_id=room.id, deleted_at=None).all()
        
        primary_tenants = [t for t in tenants if t.parent_tenant_id is None]
        sub_tenants = [t for t in tenants if t.parent_tenant_id is not None]

        print(f"Found {len(primary_tenants)} primary and {len(sub_tenants)} sub-tenants.")

        if len(primary_tenants) == 1 and len(sub_tenants) > 0:
            print(f"Applying 'Primary Pays All' fix for Room {room_number}...")
            
            for sub in sub_tenants:
                print(f"Fixing sub-tenant: {sub.name}")
                
                # 1. Update Billing Profile to 0
                bp = BillingProfile.query.filter_by(tenant_id=sub.id).first()
                if bp:
                    old_rent = bp.rent_amount
                    bp.rent_amount = 0.0
                    bp.pro_rata_rent = 0.0
                    print(f"  - Reset monthly rent from {old_rent} to 0.0")
                
                # 2. Fix Ledger Entries (Cancel pending rents)
                pendings = Ledger.query.filter_by(
                    tenant_id=sub.id, 
                    type='RENT', 
                    status='PENDING'
                ).all()
                
                for entry in pendings:
                    entry.amount = 0.0
                    entry.description += " (Auto-fixed: Multiplied Rent Correction)"
                    print(f"  - Zeroed out pending ledger entry: {entry.id}")

            db.session.commit()
            print("✅ Room billing fixed successfully.")
        else:
            print("Criteria not met (need exactly 1 primary and at least 1 sub-tenant).")

if __name__ == "__main__":
    fix_room_billing("201")
