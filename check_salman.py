import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.app import create_app
from backend.models import db, Tenant, Room, Floor

def check_salman():
    app = create_app()
    with app.app_context():
        t = Tenant.query.filter_by(name='Salman Ahmed').first()
        if not t:
            print("Salman Ahmed not found")
            return
            
        print(f"Tenant: {t.name}, Room: {t.room.number if t.room else 'N/A'}")
        if t.room:
            r = t.room
            print(f"Room {r.number}: is_bulk_rented={r.is_bulk_rented}, floor_id={r.floor_id}")
            if r.floor_ref:
                f = r.floor_ref
                print(f"Floor {f.name}: is_bulk_rented={f.is_bulk_rented}, bulk_tenant_id={f.bulk_tenant_id}, bulk_rent_amount={f.bulk_rent_amount}")

if __name__ == '__main__':
    check_salman()
