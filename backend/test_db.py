import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from backend.app import create_app
from backend.models import db, Ledger

app = create_app()

with app.app_context():
    try:
        from sqlalchemy import text
        print("db connection:", db.engine.url)
        entry = Ledger(
            tenant_id=None,
            amount=748588,
            type='OWNER_FUND',
            status='PAID',
            payment_method='Manual Entry',
            description='Owner Capital / Funds Added'
        )
        db.session.add(entry)
        db.session.commit()
        print("Success! Entry created with ID:", entry.id)
    except Exception as e:
        print("Database Error:", e)
