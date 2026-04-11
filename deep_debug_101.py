from backend.app import create_app
from backend.models import db, Room, Tenant, Floor, Ledger

app = create_app()

with app.app_context():
    room = Room.query.filter_by(number='101', deleted_at=None).first()
    if not room:
        print("Active Room 101 NOT FOUND")
    else:
        print(f"Room 101 ID: {room.id}")
        floor = room.floor_ref
        if floor:
            print(f"Floor: {floor.name} (ID: {floor.id})")
            print(f"Is Bulk Rented: {floor.is_bulk_rented}")
            print(f"Bulk Tenant ID: {floor.bulk_tenant_id}")
        else:
            print("Room 101 has NO FLOOR reference")
            
        tenants = Tenant.query.filter_by(room_id=room.id, deleted_at=None).all()
        print(f"Active Tenants in Room 101: {len(tenants)}")
        for t in tenants:
            print(f" - {t.name} (ID: {t.id})")
            
    # Check if there are any archived rooms with number 101
    archived = Room.query.filter(Room.number == '101', Room.deleted_at != None).all()
    print(f"Archived Room 101s: {len(archived)}")
