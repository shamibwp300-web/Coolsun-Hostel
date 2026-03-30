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
        try:
            print(f"\nChecking: {db_path}")
            conn = sqlite3.connect(db_path)
            cur = conn.cursor()
            cur.execute("SELECT count(*) FROM expenses")
            count = cur.fetchone()[0]
            print(f"  Total expenses: {count}")
            
            # Check schema of expenses table
            cur.execute("PRAGMA table_info(expenses)")
            cols = [c[1] for c in cur.fetchall()]
            print(f"  Columns: {cols}")
            
            if count > 0:
                cur.execute("SELECT id, amount, date FROM expenses")
                rows = cur.fetchall()
                for row in rows:
                    print(f"  Row: {row}")
            
            conn.close()
        except Exception as e:
            print(f"  Error: {e}")
    else:
        print(f"\nNot found: {db_path}")
