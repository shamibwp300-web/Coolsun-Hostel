import os
import sys

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.app import create_app
from backend.models import db, Tenant, Ledger, Room, Floor
import datetime

def test_generate_rent():
    app = create_app()
    with app.app_context():
        # Find room 102
        room = Room.query.filter_by(number='102').first()
        print(f"Room 102: ID={room.id}, is_bulk_rented={room.is_bulk_rented}")
        
        # Check floor
        if room.floor_ref:
            print(f"Floor: ID={room.floor_ref.id}, is_bulk_rented={room.floor_ref.is_bulk_rented}, bulk_tenant_id={room.floor_ref.bulk_tenant_id}, bulk_rent_amount={room.floor_ref.bulk_rent_amount}")
        
        # Check tenant Abid Naveed
        abid = Tenant.query.filter_by(name='Abid Naveed').first()
        if abid:
            print(f"Abid Naveed: ID={abid.id}, room_id={abid.room_id}")
            ledgers = Ledger.query.filter_by(tenant_id=abid.id).all()
            for l in ledgers:
                print(f"Ledger ID={l.id}, type={l.type}, amount={l.amount}, timestamp={l.timestamp}, deleted_at={l.deleted_at}")
        else:
            print("Abid Naveed not found")

if __name__ == '__main__':
    test_generate_rent()
