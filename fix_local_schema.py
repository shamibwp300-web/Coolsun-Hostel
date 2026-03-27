from backend.app import create_app
from backend.models import db
from sqlalchemy import text

app = create_app()
with app.app_context():
    queries = [
        "ALTER TABLE floors ADD COLUMN is_bulk_rented BOOLEAN DEFAULT FALSE",
        "ALTER TABLE floors ADD COLUMN bulk_tenant_id INTEGER",
        "ALTER TABLE floors ADD COLUMN bulk_rent_amount NUMERIC(10, 2)",
        "ALTER TABLE floors ADD COLUMN bulk_security_deposit NUMERIC(10, 2)",
        "ALTER TABLE floors ADD COLUMN max_bulk_capacity INTEGER DEFAULT 30",
        "ALTER TABLE rooms ADD COLUMN floor_id INTEGER",
        "ALTER TABLE rooms ADD COLUMN is_bulk_rented BOOLEAN DEFAULT FALSE",
        "ALTER TABLE rooms ADD COLUMN base_rent NUMERIC(10, 2)",
        "ALTER TABLE tenants ADD COLUMN parent_tenant_id INTEGER",
        "ALTER TABLE tenants ADD COLUMN internet_opt_in BOOLEAN DEFAULT FALSE",
        "ALTER TABLE tenants ADD COLUMN tenancy_type VARCHAR(50)",
        "ALTER TABLE tenants ADD COLUMN emergency_contact VARCHAR(50)",
        "ALTER TABLE tenants ADD COLUMN is_partial_payment BOOLEAN DEFAULT FALSE",
        "ALTER TABLE tenants ADD COLUMN compliance_alert BOOLEAN DEFAULT FALSE",
        "ALTER TABLE tenants ADD COLUMN bed_label VARCHAR(20)",
    ]
    with db.engine.connect() as conn:
        for q in queries:
            try:
                conn.execute(text(q))
                conn.commit()
                print(f"Success: {q}")
            except Exception as e:
                print(f"Skipped/Failed: {q} ({e})")
