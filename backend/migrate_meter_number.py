import sqlite3
import os

db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), 'instance', 'hostel.db'))
# Note: Checking if it's in top-level or backend/instance
if not os.path.exists(db_path):
    db_path = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'hostel.db'))

print(f"Migrating database: {db_path}")

db = sqlite3.connect(db_path)
c = db.cursor()
try:
    c.execute("ALTER TABLE rooms ADD COLUMN meter_number VARCHAR(50)")
    print("Added meter_number successfully.")
except Exception as e:
    print(f"Error or already exists: {e}")

db.commit()
db.close()
print("Migration completed.")
