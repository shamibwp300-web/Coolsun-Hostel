import os
from dotenv import load_dotenv
from backend.app import create_app
from backend.models import db, Floor, Room, User
load_dotenv()
app = create_app()
uri = os.getenv("DATABASE_URL")
if uri and uri.startswith("postgres://"):
    uri = uri.replace("postgres://", "postgresql://", 1)
app.config["SQLALCHEMY_DATABASE_URI"] = uri
with app.app_context():
    print(f"🛰️ Connecting to Supabase...")
    db.drop_all()
    db.create_all()
    f1 = Floor(floor_number=1, name="Ground Floor"); db.session.add(f1); db.session.commit()
    r1 = Room(floor_id=f1.id, floor=1, number="101", type="Small", capacity=4, base_rent=12000); db.session.add(r1)
    u = User(username="admin", role="Owner"); u.set_password("admin123"); db.session.add(u)
    db.session.commit()
    print("✅ SUCCESS: Supabase is Seeded and Ready!")