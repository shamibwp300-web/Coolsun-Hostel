from backend.app import create_app
from backend.models import db, Floor, Room, User

app = create_app()

with app.app_context():
    print("🛰️ Connecting to Supabase...")
    db.create_all()

    # 1. Check if Floor 1 already exists
    if not Floor.query.filter_by(floor_number=1).first():
        f1 = Floor(floor_number=1, name='Ground Floor')
        db.session.add(f1)
        db.session.commit()
        print("🏢 Floor 1 Added.")
    else:
        print("🏢 Floor 1 already exists.")
        f1 = Floor.query.filter_by(floor_number=1).first()

    # 2. Check if Room 101 already exists
    if not Room.query.filter_by(number='101').first():
        r1 = Room(floor_id=f1.id, floor=1, number='101', type='Small', capacity=4, base_rent=12000)
        db.session.add(r1)
        db.session.commit()
        print("🛌 Room 101 Added.")

    # 3. Check if Admin User exists
    if not User.query.filter_by(username='admin').first():
        u = User(username='admin', role='Owner')
        u.set_password('admin123')
        db.session.add(u)
        db.session.commit()
        print("👤 Admin User (admin/admin123) Added.")

    print("\n✅ MISSION ACCOMPLISHED: Database is now ready for Login!")