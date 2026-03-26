from backend.app import create_app
from backend.models import db, Floor, Room
import os

app = create_app()
with app.app_context():
    # 1. Update/Create Ground Floor (0)
    g_floor = Floor.query.filter_by(floor_number=0).first()
    if not g_floor:
        g_floor = Floor(floor_number=0, name="Ground Floor")
        db.session.add(g_floor)
        print("Created Ground Floor (0)")
    else:
        g_floor.name = "Ground Floor"
        print("Updated Ground Floor (0)")
    
    # 2. Update First Floor (1)
    f1 = Floor.query.filter_by(floor_number=1).first()
    if f1:
        f1.name = "First Floor"
        print("Updated Floor 1 to 'First Floor'")
    
    # 3. Update Second Floor (2)
    f2 = Floor.query.filter_by(floor_number=2).first()
    if f2:
        f2.name = "Second Floor"
        print("Updated Floor 2 to 'Second Floor'")
    
    # 4. Update Third Floor (3)
    f3 = Floor.query.filter_by(floor_number=3).first()
    if f3:
        f3.name = "Third Floor"
        print("Updated Floor 3 to 'Third Floor'")

    # 5. Review any rooms that might need moving
    # If there are rooms like '101' on Floor 1, they are now on 'First Floor' (Correct).
    # If there are rooms that the user *meant* to be on Ground Floor but were on Floor 1,
    # they would have to be moved to Floor 0.
    # But since Room 101 was on Floor 1 and user said it SHOULD be First Floor, we are good.

    db.session.commit()
    print("\nFloor naming correction completed.")

    # Re-verify Room 101
    r101 = Room.query.filter_by(number='101').first()
    if r101:
        print(f"Room 101 is now on: {r101.floor_ref.name if r101.floor_ref else 'None'} (Floor {r101.floor})")
