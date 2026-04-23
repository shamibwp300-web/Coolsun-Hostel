import os
import sys

sys.stdout.reconfigure(encoding='utf-8')
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from backend.app import create_app
from backend.models import db, Ledger
from datetime import datetime

def check_ledgers():
    app = create_app()
    with app.app_context():
        ledgers = Ledger.query.filter_by(deleted_at=None).all()
        for l in ledgers:
            print(f"Ledger ID={l.id}, tenant_id={l.tenant_id}, amount={l.amount}, type={l.type}, timestamp={l.timestamp}")

if __name__ == '__main__':
    check_ledgers()
