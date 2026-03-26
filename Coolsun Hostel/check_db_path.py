import os
from backend.app import create_app
from backend.models import User, db

app = create_app()
with app.app_context():
    print(f"Database URI: {app.config['SQLALCHEMY_DATABASE_URI']}")
    users = User.query.all()
    print("Users in Database:")
    for u in users:
        print(f"- {u.username}")

# Also check the parent directory database just in case
parent_db = os.path.abspath("../hostel.db")
if os.path.exists(parent_db):
    print(f"\nParent DB exists at: {parent_db}")
