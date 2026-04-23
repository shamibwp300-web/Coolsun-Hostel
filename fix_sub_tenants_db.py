import sqlite3
import datetime

dbs = [
    r'd:\Coolsun Hostel\hostel.db',
    r'd:\Coolsun Hostel\backend\instance\hostel.db',
    r'd:\Coolsun Hostel\Coolsun Hostel\hostel.db',
    r'd:\Coolsun Hostel\Coolsun Hostel\backend\instance\hostel.db'
]

def fix_db(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if tenants and ledger tables exist
        cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tenants'")
        if not cursor.fetchone():
            return
            
        # Find sub-tenants
        cursor.execute("SELECT id FROM tenants WHERE parent_tenant_id IS NOT NULL AND deleted_at IS NULL")
        sub_tenants = cursor.fetchall()
        
        if not sub_tenants:
            print(f"[{db_path}] No sub-tenants found.")
            return
            
        sub_tenant_ids = [str(st[0]) for st in sub_tenants]
        ids_str = ",".join(sub_tenant_ids)
        
        # Soft delete their ledger entries
        now = datetime.datetime.utcnow().isoformat()
        cursor.execute(f"UPDATE ledger SET deleted_at = ? WHERE tenant_id IN ({ids_str}) AND deleted_at IS NULL", (now,))
        
        affected = cursor.rowcount
        conn.commit()
        conn.close()
        
        print(f"[{db_path}] Found {len(sub_tenants)} sub-tenants. Voided {affected} ledger entries.")
    except Exception as e:
        print(f"[{db_path}] Error: {e}")

for db in dbs:
    fix_db(db)
