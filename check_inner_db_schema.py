import sqlite3
import traceback

def test_db():
    db_path = r'd:\Coolsun Hostel\Coolsun Hostel\backend\instance\hostel.db'
    print(f"Connecting to: {db_path}")
    try:
        conn = sqlite3.connect(db_path, timeout=5)
        c = conn.cursor()
        
        # Check if table exists
        c.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='rooms';")
        if not c.fetchone():
            print("ERROR: rooms table does not exist!")
            return
            
        print("rooms table exists. Attempting ALTER TABLE...")
        c.execute("ALTER TABLE rooms ADD COLUMN is_bulk_rented BOOLEAN DEFAULT FALSE")
        conn.commit()
        print("SUCCESS! Column added.")
    except Exception as e:
        print("ERROR:", e)
        traceback.print_exc()

test_db()
