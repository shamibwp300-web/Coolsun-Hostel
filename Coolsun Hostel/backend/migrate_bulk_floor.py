import sqlite3
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'hostel.db'))
print(f"Migrating database: {db_path}")

db = sqlite3.connect(db_path)
c = db.cursor()
try:
    c.execute("ALTER TABLE floors ADD COLUMN is_bulk_rented BOOLEAN DEFAULT 0")
    print("Added is_bulk_rented")
except Exception as e:
    print(e)
try:
    c.execute("ALTER TABLE floors ADD COLUMN bulk_tenant_id INTEGER REFERENCES tenants(id)")
    print("Added bulk_tenant_id")
except Exception as e:
    print(e)
try:
    c.execute("ALTER TABLE floors ADD COLUMN bulk_rent_amount NUMERIC(10, 2)")
    print("Added bulk_rent_amount")
except Exception as e:
    print(e)
try:
    c.execute("ALTER TABLE floors ADD COLUMN max_bulk_capacity INTEGER DEFAULT 30")
    print("Added max_bulk_capacity")
except Exception as e:
    print(e)

db.commit()
db.close()
print("Migration completed.")
