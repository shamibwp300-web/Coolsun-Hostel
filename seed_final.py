from backend.app import create_app
from backend.models import db, Floor, Room, User
app = create_app()
with app.app_context():
    db.create_all()
    if not Floor.query.filter_by(floor_number=1).first():
        f1 = Floor(floor_number=1, name="Ground Floor"); db.session.add(f1); db.session.commit()
    else: f1 = Floor.query.filter_by(floor_number=1).first()
    if not Room.query.filter_by(number="101").first():
        r1 = Room(floor_id=f1.id, floor=1, number="101", type="Small", capacity=4, base_rent=12000); db.session.add(r1)
    if not User.query.filter_by(username="admin").first():
        u = User(username="admin", role="Owner"); u.set_password("admin123"); db.session.add(u)
    db.session.commit()
    print("SUCCESS: Admin (admin/admin123) and Floor 1 created!")