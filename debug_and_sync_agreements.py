import sqlite3
import os

def check_db(db_path):
    if not os.path.exists(db_path):
        print(f"--- DB NOT FOUND: {db_path} ---")
        return

    print(f"\n--- CHECKING DB: {db_path} ---")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    try:
        cursor.execute("SELECT type, COUNT(*) FROM documents GROUP BY type")
        types = cursor.fetchall()
        print("Document Types:", types)
        
        cursor.execute("SELECT id, name, agreement_url FROM tenants WHERE agreement_url IS NOT NULL LIMIT 5")
        tenants = cursor.fetchall()
        print("Tenants with agreement_url:", tenants)
        
        # Check for any case-insensitive 'agreement' types
        cursor.execute("SELECT id, tenant_id, type, url FROM documents WHERE type LIKE '%agreement%' LIMIT 5")
        agreements = cursor.fetchall()
        print("Agreement-like documents:", agreements)

        if agreements:
            print("Syncing...")
            for doc_id, tenant_id, doc_type, url in agreements:
                cursor.execute("UPDATE tenants SET agreement_url = ? WHERE id = ? AND (agreement_url IS NULL OR agreement_url = '')", (url, tenant_id))
            conn.commit()
            print("Sync complete for this DB.")

    except Exception as e:
        print(f"Error checking DB: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    check_db(r"d:\Coolsun Hostel\Coolsun Hostel\hostel.db")
    check_db(r"d:\Coolsun Hostel\hostel.db")
