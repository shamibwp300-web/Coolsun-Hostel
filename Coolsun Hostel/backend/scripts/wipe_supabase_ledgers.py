import os
import sys

# Ensure utf-8 encoding for stdout to avoid emoji crash
sys.stdout.reconfigure(encoding='utf-8')

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..')))

from backend.app import create_app
from backend.models import db, Ledger
from datetime import datetime

def wipe_all_ledgers():
    app = create_app()
    with app.app_context():
        # Get all ledgers that are not deleted
        ledgers = Ledger.query.filter_by(deleted_at=None).all()
        count = 0
        for l in ledgers:
            l.deleted_at = datetime.utcnow()
            count += 1
            
        db.session.commit()
        print(f"Successfully voided {count} ledger entries in the database (Supabase).")

if __name__ == '__main__':
    wipe_all_ledgers()
