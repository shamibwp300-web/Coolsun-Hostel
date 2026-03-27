from backend.app import create_app
from backend.models import db, Floor, Room

def repair():
    app = create_app()
    with app.app_context():
        print("--- REPAIRING DATA ---")
        
        # 1. Ensure Standard Floors Exist
        floor_definitions = [
            (0, "Ground Floor"),
            (1, "First Floor"),
            (2, "Second Floor"),
            (3, "Third Floor")
        ]
        
        floor_map = {}
        for num, name in floor_definitions:
            f = Floor.query.filter_by(floor_number=num).first()
            if not f:
                f = Floor(floor_number=num, name=name)
                db.session.add(f)
                db.session.flush()
                print(f"Created {name} (Floor {num})")
            else:
                f.name = name
                print(f"Updated {name} (Floor {num})")
            floor_map[num] = f.id
            
        # 2. Link all Rooms to Floor IDs
        rooms = Room.query.all()
        repaired_rooms = 0
        for r in rooms:
            correct_floor_id = floor_map.get(r.floor)
            if correct_floor_id and r.floor_id != correct_floor_id:
                r.floor_id = correct_floor_id
                repaired_rooms += 1
                
        print(f"Linked {repaired_rooms} rooms to correct floor objects.")
        
        # 3. Clear Inconsistent Bulk Status
        # If a floor is not bulk but room is, or vice versa, reset to match floor
        inconsistent_rooms = 0
        for r in rooms:
            if r.floor_ref and r.is_bulk_rented != r.floor_ref.is_bulk_rented:
                # If floor is NOT bulk, room SHOULD NOT be bulk
                if not r.floor_ref.is_bulk_rented:
                    r.is_bulk_rented = False
                    inconsistent_rooms += 1
        
        print(f"Cleared {inconsistent_rooms} inconsistent bulk rental flags.")
        
        db.session.commit()
        print("\n--- REPAIR COMPLETED SUCCESSFULLY ---")

if __name__ == "__main__":
    repair()
