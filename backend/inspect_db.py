import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app import create_app
from backend.models import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    with db.engine.connect() as conn:
        res = conn.execute(text("PRAGMA table_info(ledger)"))
        for row in res.fetchall():
            print(row)
