import os
from dotenv import load_dotenv
from backend.app import create_app
from backend.models import db, User
from werkzeug.security import generate_password_hash

# Force load .env if present
load_dotenv()

app = create_app()

with app.app_context():
    admin_email = "admin@coolsun.pk"
    user = User.query.filter_by(username=admin_email).first()
    
    if not user:
        # Check for 'admin' (old username) to migrate
        user = User.query.filter_by(username='admin').first()
        if user:
            print(f"🔄 Migrating 'admin' to '{admin_email}'...")
            user.username = admin_email
        else:
            print(f"✨ Creating new admin user: {admin_email}")
            user = User(username=admin_email, role="Owner")
            db.session.add(user)
    
    print(f"🔐 Setting password for {admin_email} to 'Coolsun123'...")
    user.set_password("Coolsun123")
    user.is_on_duty = True # Ensure they aren't disabled
    
    try:
        db.session.commit()
        print("✅ SUCCESS: Live Admin Password Reset Complete!")
        print(f"📧 Username: {admin_email}")
        print("🔑 Password: Coolsun123")
    except Exception as e:
        print(f"❌ Error during commit: {e}")
