from backend.app import create_app
from backend.models import User

app = create_app()
with app.app_context():
    users = User.query.all()
    print("Users in Database:")
    for u in users:
        print(f"- Username: {u.username}, Role: {u.role}, On Duty: {u.is_on_duty}")
