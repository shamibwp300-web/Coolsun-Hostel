import sqlite3

db_path = r"d:\Coolsun Hostel\Coolsun Hostel\hostel.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE maintenance_requests ADD COLUMN is_approved BOOLEAN DEFAULT 0")
    print("Added is_approved to maintenance_requests")
except sqlite3.OperationalError:
    print("is_approved already exists in maintenance_requests")

conn.commit()
conn.close()
