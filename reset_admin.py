import os
from dotenv import load_dotenv
from backend.app import create_app
from backend.models import db, User
from werkzeug.security import generate_password_hash

load_dotenv()
app = create_app()

with app.app_context():
    # 1. Purane users check karein
    admin_email = "admin@coolsun.pk"
    user = User.query.filter_by(username=admin_email).first()
    
    if user:
        print(f"🔄 User {admin_email} mila, password reset kar raha hoon...")
        user.password_hash = generate_password_hash("Coolsun123")
    else:
        print(f"✨ Naya Admin user bana raha hoon: {admin_email}")
        user = User(
            username=admin_email,
            role="Owner",
            password_hash=generate_password_hash("Coolsun123")
        )
        db.session.add(user)
    
    try:
        db.session.commit()
        print("✅ SUCCESS: Login Details Update Ho Gayi Hain!")
        print(f"📧 Username: {admin_email}")
        print("🔑 Password: Coolsun123")
    except Exception as e:
        print(f"❌ Error: {e}")