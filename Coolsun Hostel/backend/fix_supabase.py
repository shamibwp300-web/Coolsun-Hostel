import os
from dotenv import load_dotenv
from backend.app import create_app
from backend.models import db, Floor, Room, User

# 1. Load Environment Variables
load_dotenv()

app = create_app()
# Forcefully ensure we are using Supabase URL
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL')

with app.app_context():
    print(f"🛰️ Connecting to Supabase: {app.config['SQLALCHEMY_DATABASE_URI'][:25]}...")
    
    # 2. Sync Tables (Ye missing columns wala masla hal kar dega)
    print("🔄 Syncing table structures...")
    db.create_all()

    # 3. Create Floor 1
    f1 = Floor.query.filter_by(floor_number=1).first()
    if not f1:
        f1 = Floor(floor_number=1, name='Ground Floor', max_capacity=30)
        db.session.add(f1)
        db.session.commit()
        print("🏢 Floor 1 created.")
    else:
        print("🏢 Floor 1 already exists.")

    # 4. Create Room 101
    r1 = Room.query.filter_by(number='101').first()
    if not r1:
        r1 = Room(floor_id=f1.id, floor=1, number='101', type='Small', capacity=4, base_rent=12000)
        db.session.add(r1)
        db.session.commit()
        print("🛌 Room 101 created.")
    else:
        print("🛌 Room 101 already exists.")

    # 5. Create Admin User
    u = User.query.filter_by(username='admin').first()
    if not u:
        u = User(username='admin', role='Owner')
        u.set_password('admin123')
        db.session.add(u)
        db.session.commit()
        print("👤 Admin User (admin/admin123) created.")
    else:
        print("👤 Admin User already exists.")

    print("\n✅ MISSION ACCOMPLISHED: Cloud Database is Seeded and Ready!")