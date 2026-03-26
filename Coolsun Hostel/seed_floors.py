from backend.app import create_app
from backend.models import db, Floor

app = create_app()

with app.app_context():
    names = {2: 'First Floor', 3: 'Second Floor', 4: 'Third Floor'}
    for idx in range(2, 5):
        if not Floor.query.filter_by(floor_number=idx).first():
            f = Floor(floor_number=idx, name=names.get(idx, f"Floor {idx}"))
            db.session.add(f)
            print(f"Added {f.name} (Floor {idx})")
            
    db.session.commit()
    print("Multi-floor seeding completed.")
