from backend.app import create_app
from backend.models import db, Floor, Room, Tenant, Ledger

app = create_app()
with app.app_context():
    # 1. Setup: Clean state but keep Floor 1 and Room 101
    Tenant.query.delete()
    Ledger.query.delete()
    Floor.query.delete()
    Room.query.delete()
    db.session.commit()
    
    f1 = Floor(floor_number=1, name="First Floor")
    db.session.add(f1)
    db.session.flush()
    
    # Create Room 101 with WRONG linkage (floor_id=None, only floor=1)
    r101 = Room(floor=1, floor_id=None, number='101', type='Large', capacity=4, base_rent=10000)
    db.session.add(r101)
    db.session.commit()
    
    print(f"Setup Complete: Floor ID {f1.id}, Room 101 Floor ID: {r101.floor_id}")

    # 2. Simulate Frontend Request to /api/floors/<id>/bulk_config
    # Selected Room ID: r101.id
    data = {
        "is_bulk_rented": True,
        "selected_room_ids": [r101.id],
        "bulk_tenant_id": None,
        "bulk_rent_amount": 50000,
        "bulk_security_deposit": 50000,
        "max_bulk_capacity": 30
    }
    
    # Mocking the save_bulk_config logic
    floor = Floor.query.get(f1.id)
    floor.is_bulk_rented = data['is_bulk_rented']
    floor.bulk_tenant_id = data['bulk_tenant_id']
    floor.bulk_rent_amount = data['bulk_rent_amount']
    floor.bulk_security_deposit = data['bulk_security_deposit']
    floor.max_bulk_capacity = data['max_bulk_capacity']
    
    print(f"Rooms linked to Floor 1: {[r.number for r in floor.rooms]}")
    if not floor.rooms:
        print("FAIL: No rooms found for Floor 1! Bulk update for rooms will skip.")
    
    for room in floor.rooms:
        if room.id in data['selected_room_ids']:
            room.is_bulk_rented = True
            print(f"Set Room {room.number} to bulk")
        else:
            room.is_bulk_rented = False
            
    db.session.commit()
    
    # 3. Verify Final State
    r101_final = Room.query.filter_by(number='101').first()
    f1_final = Floor.query.filter_by(floor_number=1).first()
    
    print(f"\nFinal State:")
    print(f"Floor 1 is_bulk_rented: {f1_final.is_bulk_rented}")
    print(f"Room 101 is_bulk_rented: {r101_final.is_bulk_rented}")
    
    if f1_final.is_bulk_rented and not r101_final.is_bulk_rented:
        print("\nREPRODUCED: Floor is bulk, but Room is NOT (due to missing floor_id link)")
    else:
        print("\nNOT REPRODUCED or different issue.")
