import sqlite3
import datetime

dbs = [
    r'd:\Coolsun Hostel\hostel.db',
    r'd:\Coolsun Hostel\backend\instance\hostel.db',
    r'd:\Coolsun Hostel\Coolsun Hostel\hostel.db',
    r'd:\Coolsun Hostel\Coolsun Hostel\backend\instance\hostel.db'
]

def wipe_all_ledgers(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if ledger table exists
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='ledger'")
        if not cursor.fetchone():
            return
            
        # Soft delete ALL ledger entries
        now = datetime.datetime.utcnow().isoformat()
        cursor.execute("UPDATE ledger SET deleted_at = ? WHERE deleted_at IS NULL", (now,))
        
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        
        print(f"[{db_path}] Voided {affected} ledger entries for ALL tenants.")
    except Exception as e:
        print(f"[{db_path}] Error: {e}")

for db in dbs:
    wipe_all_ledgers(db)
