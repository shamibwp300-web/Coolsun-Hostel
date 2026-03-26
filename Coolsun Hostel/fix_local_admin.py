from backend.app import create_app
from backend.models import User, db
from werkzeug.security import generate_password_hash

app = create_app()
with app.app_context():
    # Fix 'admin' user to match what we expect
    admin_email = "admin@coolsun.pk"
    
    # 1. Update the 'admin' user or create 'admin@coolsun.pk'
    user = User.query.filter_by(username='admin').first()
    if user:
        print("Changing 'admin' to 'admin@coolsun.pk' and setting password...")
        user.username = admin_email
        user.set_password("Coolsun123")
    else:
        user = User.query.filter_by(username=admin_email).first()
        if not user:
            print(f"Creating {admin_email}...")
            user = User(username=admin_email, role="Owner")
            user.set_password("Coolsun123")
            db.session.add(user)
        else:
            print(f"User {admin_email} already exists, updating password...")
            user.set_password("Coolsun123")
    
    db.session.commit()
    print("✅ Local database updated successfully.")
