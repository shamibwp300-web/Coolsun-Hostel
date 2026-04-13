import sqlite3
import os

def find_best_db():
    potential_paths = [
        "backend/instance/hostel.db",
        "instance/hostel.db",
        "hostel.db",
        "../hostel.db",
        "backend/hostel_erp.db"
    ]
    for p in potential_paths:
        if os.path.exists(p) and os.path.getsize(p) > 0:
            return p
    return None

def cleanup():
    db_path = find_best_db()
    if not db_path:
        print("Could not find database!")
        return

    print(f"Connecting to {db_path}...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 1. Identify Sub-tenants
        cursor.execute("SELECT id, name FROM tenants WHERE parent_tenant_id IS NOT NULL")
        sub_tenants = cursor.fetchall()
        
        if not sub_tenants:
            print("No sub-tenants found to clean up.")
            return

        print(f"Found {len(sub_tenants)} sub-tenants. Starting cleanup...")

        for t_id, t_name in sub_tenants:
            # 2. Zero out rent in billing_profiles
            cursor.execute("UPDATE billing_profiles SET rent_amount = 0 WHERE tenant_id = ?", (t_id,))
            print(f" - Zeroed rent for {t_name} (ID: {t_id})")

            # 3. Void pending rent charges in ledger
            # We look for PENDING entries of type RENT or PRIVATE_RENT
            cursor.execute("""
                UPDATE ledger 
                SET status = 'VOIDED', description = description || ' (Auto-Voided: Sub-tenant covered by Primary)'
                WHERE tenant_id = ? AND status = 'PENDING' AND type IN ('RENT', 'PRIVATE_RENT')
            """, (t_id,))
            
            rows_affected = cursor.rowcount
            if rows_affected > 0:
                print(f"   * Voided {rows_affected} pending rent charge(s) for {t_name}")

        conn.commit()
        print("\nCleanup Complete! Database changes committed.")

    except Exception as e:
        print(f"Error during cleanup: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    cleanup()
