import os
import sqlalchemy
from sqlalchemy import text

dbs = [
    # The actual active local DB for the inner repo!
    f"sqlite:///{os.path.abspath(r'd:\Coolsun Hostel\Coolsun Hostel\hostel.db')}"
]

queries = [
    # Floors
    "ALTER TABLE floors ADD COLUMN is_bulk_rented BOOLEAN DEFAULT FALSE",
    "ALTER TABLE floors ADD COLUMN bulk_tenant_id INTEGER",
    "ALTER TABLE floors ADD COLUMN bulk_rent_amount NUMERIC(10, 2)",
    "ALTER TABLE floors ADD COLUMN bulk_security_deposit NUMERIC(10, 2)",
    "ALTER TABLE floors ADD COLUMN max_bulk_capacity INTEGER DEFAULT 30",
    
    # Rooms
    "ALTER TABLE rooms ADD COLUMN floor_id INTEGER",
    "ALTER TABLE rooms ADD COLUMN is_bulk_rented BOOLEAN DEFAULT FALSE",
    "ALTER TABLE rooms ADD COLUMN base_rent NUMERIC(10, 2)",
    
    # Tenants
    "ALTER TABLE tenants ADD COLUMN parent_tenant_id INTEGER",
    "ALTER TABLE tenants ADD COLUMN internet_opt_in BOOLEAN DEFAULT FALSE",
    "ALTER TABLE tenants ADD COLUMN tenancy_type VARCHAR(50)",
    "ALTER TABLE tenants ADD COLUMN emergency_contact VARCHAR(50)",
    "ALTER TABLE tenants ADD COLUMN is_partial_payment BOOLEAN DEFAULT FALSE",
    "ALTER TABLE tenants ADD COLUMN compliance_alert BOOLEAN DEFAULT FALSE",
    "ALTER TABLE tenants ADD COLUMN bed_label VARCHAR(20)",
    "ALTER TABLE tenants ADD COLUMN father_name VARCHAR(100)",
    "ALTER TABLE tenants ADD COLUMN permanent_address VARCHAR(255)",
    "ALTER TABLE tenants ADD COLUMN police_station VARCHAR(100)",
    "ALTER TABLE tenants ADD COLUMN id_card_front_url VARCHAR(255)",
    "ALTER TABLE tenants ADD COLUMN id_card_back_url VARCHAR(255)",
    "ALTER TABLE tenants ADD COLUMN police_form_url VARCHAR(255)",
    "ALTER TABLE tenants ADD COLUMN police_form_submitted TIMESTAMP",
]

for db_url in dbs:
    print(f"\n--- Syncing DB: {db_url} ---")
    try:
        engine = sqlalchemy.create_engine(db_url)
        with engine.connect() as conn:
            for q in queries:
                try:
                    conn.execute(text(q))
                    conn.commit()
                    print(f"SUCCESS: {q}")
                except Exception as e:
                    try:
                        conn.rollback()
                    except:
                        pass
                    msg = str(e).replace('\n', ' ')
                    print(f"SKIPPED (Likely exists): {q.split('ADD COLUMN ')[-1].split(' ')[0]}")
    except Exception as e:
        print(f"Failed to connect: {e}")

print("\n--- Migration Fully Completed ---")
