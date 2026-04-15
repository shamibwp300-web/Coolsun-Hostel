import sys
import os
from datetime import datetime

# Adjust path to import backend
sys.path.append(os.getcwd())

from backend.app import app
from backend.models import db, Tenant, Room, Ledger

def repair_room_201():
    with app.app_context():
        print("Starting Data Repair for Room 201...")
        
        # 1. Find Room 201
        room = Room.query.filter_by(number='201', deleted_at=None).first()
        if not room:
            print("Error: Room 201 not found.")
            return

        print(f"Room 201 ID: {room.id}")
        
        # 2. Find All Tenants in Room 201
        tenants = Tenant.query.filter_by(room_id=room.id, deleted_at=None).all()
        print(f"Found {len(tenants)} active tenants in Room 201.")

        # 3. Identify Sub-tenants and their April 2026 Rent
        current_month = datetime.utcnow().strftime('%Y-%m')
        
        for t in tenants:
            if t.parent_tenant_id:
                print(f"Cleaning up sub-tenant: {t.name} (Parent ID: {t.parent_tenant_id})")
                
                # Find April Rent ledgers
                rent_ledgers = Ledger.query.filter(
                    Ledger.tenant_id == t.id,
                    Ledger.type.in_(['RENT', 'PRIVATE_RENT']),
                    Ledger.deleted_at == None
                ).all()
                
                for l in rent_ledgers:
                    if l.timestamp.strftime('%Y-%m') == current_month:
                        print(f"  - Deleting duplicate rent ledger ID {l.id} (Amount: {l.amount})")
                        l.deleted_at = datetime.utcnow()
            else:
                print(f"Keeping primary tenant: {t.name}")

        db.session.commit()
        print("Repair complete. Room 201 now correctly reflects only the Primary Tenant's rent.")

if __name__ == "__main__":
    repair_room_201()
