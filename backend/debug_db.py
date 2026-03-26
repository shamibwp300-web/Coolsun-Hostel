import sqlite3
import os
from datetime import datetime

_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
_DB_PATH = os.path.join(_BASE_DIR, 'hostel.db')

def debug():
    print(f"DEBUG: Connecting to {_DB_PATH}")
    if not os.path.exists(_DB_PATH):
        print("ERROR: Database file not found!")
        return

    conn = sqlite3.connect(_DB_PATH)
    cursor = conn.cursor()

    print("\n--- TENANTS ---")
    cursor.execute("SELECT id, name, room_id, deleted_at FROM tenants WHERE deleted_at IS NULL")
    for t in cursor.fetchall():
        print(f"Tenant: ID={t[0]}, Name={t[1]}, RoomID={t[2]}")

    print("\n--- FLOORS ---")
    cursor.execute("SELECT id, floor_number, name, is_bulk_rented, bulk_tenant_id FROM floors WHERE deleted_at IS NULL")
    for f in cursor.fetchall():
        print(f"Floor: ID={f[0]}, Num={f[1]}, Name='{f[2]}', Bulk={f[3]}, OwnerID={f[4]}")

    print("\n--- ROOMS ---")
    cursor.execute("SELECT id, number, floor_id, floor, is_bulk_rented FROM rooms WHERE deleted_at IS NULL")
    for r in cursor.fetchall():
        print(f"Room: ID={r[0]}, Num='{r[1]}', FloorID={r[2]}, FloorNum={r[3]}, Bulk={r[4]}")

    print("\n--- LEDGER (PENDING) ---")
    cursor.execute("SELECT id, tenant_id, amount, type, status, description, timestamp FROM ledger WHERE deleted_at IS NULL AND status = 'PENDING'")
    for l in cursor.fetchall():
        print(f"Ledger: ID={l[0]}, TenID={l[1]}, Amt={l[2]}, Type={l[3]}, Desc='{l[5]}', Date={l[6]}")

    conn.close()

if __name__ == "__main__":
    debug()
