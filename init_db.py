# init_db.py
import sys
import os

# Project folder ko rasta dikhane ke liye
sys.path.append(os.getcwd())

# Aap ke 'create_app' function ko backend se bulana
from backend.app import create_app
from backend.models import db

# App instance banana
app = create_app()

with app.app_context():
    print("🛰️ Antigravity connecting to Supabase...")
    try:
        db.create_all()
        print("✅ Tables Created! Supabase ab Hostel data ke liye taiyar hai.")
    except Exception as e:
        print(f"❌ Error: Supabase se connect nahi ho saka. Password check karein.\n{e}")