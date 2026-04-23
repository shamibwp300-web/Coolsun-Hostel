import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.app import create_app
from backend.models import db, Tenant, Room, Floor, Ledger

def debug_101():
    app = create_app()
    with app.app_context():
        room = Room.query.filter_by(number='101').first()
        if not room:
            print("Room 101 not found")
            return
            
        print(f"Room 101: ID={room.id}, floor_id={room.floor_id}")
        if room.floor_ref:
            f = room.floor_ref
            print(f"Floor {f.name}: is_bulk_rented={f.is_bulk_rented}, bulk_tenant_id={f.bulk_tenant_id}")
            
        tenants = Tenant.query.filter_by(room_id=room.id, deleted_at=None).all()
        for t in tenants:
            print(f"Tenant: {t.name}, ID={t.id}, is_primary={not t.parent_tenant_id}")
            ledgers = Ledger.query.filter_by(tenant_id=t.id, deleted_at=None).all()
            print(f"  Ledgers count: {len(ledgers)}")
            for l in ledgers:
                print(f"    {l.type}: {l.amount} ({l.timestamp})")

if __name__ == '__main__':
    debug_101()
