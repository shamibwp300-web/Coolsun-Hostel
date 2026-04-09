import sqlite3
import os

db_paths = [
    r"D:\Coolsun Hostel\hostel.db",
    r"D:\Coolsun Hostel\backend\instance\hostel.db",
    r"D:\Coolsun Hostel\Coolsun Hostel\hostel.db",
    r"D:\Coolsun Hostel\Coolsun Hostel\backend\instance\hostel.db"
]

for db_path in db_paths:
    if os.path.exists(db_path):
        print(f"Checking database: {db_path}")
        try:
            db = sqlite3.connect(db_path)
            c = db.cursor()
            # Check if 'rooms' table exists
            c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='rooms';")
            if c.fetchone():
                try:
                    c.execute("ALTER TABLE rooms ADD COLUMN meter_number VARCHAR(50)")
                    db.commit()
                    print(f"Added meter_number successfully to {db_path}")
                except Exception as e:
                    print(f"Error or already exists in {db_path}: {e}")
            else:
                print(f"Table 'rooms' does not exist in {db_path}")
            db.close()
        except Exception as e:
            print(f"Error connecting to {db_path}: {e}")
    else:
        print(f"Path does not exist: {db_path}")

print("Migration run complete.")
