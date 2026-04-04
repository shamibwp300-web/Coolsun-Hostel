import sys
import os

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from backend.app import create_app
from backend.models import db
from sqlalchemy import text

app = create_app()

with app.app_context():
    try:
        with db.engine.connect() as conn:
            conn.execute(text("PRAGMA foreign_keys=off;"))
            
            new_table_sql = """
            CREATE TABLE IF NOT EXISTS ledger_new (
                id INTEGER PRIMARY KEY,
                tenant_id INTEGER REFERENCES tenants(id),
                amount NUMERIC(10, 2),
                type VARCHAR(20),
                status VARCHAR(20),
                payment_method VARCHAR(50),
                description VARCHAR(255),
                timestamp DATETIME,
                deleted_at DATETIME
            );
            """
            conn.execute(text(new_table_sql))
            conn.execute(text("INSERT INTO ledger_new SELECT id, tenant_id, amount, type, status, payment_method, description, timestamp, deleted_at FROM ledger;"))
            conn.execute(text("DROP TABLE ledger;"))
            conn.execute(text("ALTER TABLE ledger_new RENAME TO ledger;"))
            conn.execute(text("PRAGMA foreign_keys=on;"))
            conn.commit()
            print("✅ Success! Ledger table rebuilt.")
    except Exception as e:
        print("ERROR:", e)
