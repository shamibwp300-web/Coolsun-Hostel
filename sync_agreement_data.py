import sqlite3
import os

# Update this path to the correct database file
db_path = r"d:\Coolsun Hostel\Coolsun Hostel\hostel.db"

def sync_agreements():
    if not os.path.exists(db_path):
        print(f"Error: Database not found at {db_path}")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    print("Starting Agreement Form synchronization...")

    try:
        # Find all documents of type 'Agreement' and get the latest one for each tenant
        cursor.execute("""
            SELECT tenant_id, url 
            FROM documents 
            WHERE type = 'Agreement' AND deleted_at IS NULL
            ORDER BY id DESC
        """)
        
        agreements = cursor.fetchall()
        
        # We'll use a dict to keep only the latest agreement per tenant
        latest_agreements = {}
        for tenant_id, url in agreements:
            if tenant_id not in latest_agreements:
                latest_agreements[tenant_id] = url

        print(f"Found {len(latest_agreements)} Agreement Forms to sync.")

        updated_count = 0
        for tenant_id, url in latest_agreements.items():
            # Update the agreement_url field in the tenants table
            cursor.execute("UPDATE tenants SET agreement_url = ? WHERE id = ?", (url, tenant_id))
            updated_count += cursor.rowcount

        conn.commit()
        print(f"Successfully synchronized {updated_count} tenants.")

    except Exception as e:
        print(f"An error occurred: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    sync_agreements()
