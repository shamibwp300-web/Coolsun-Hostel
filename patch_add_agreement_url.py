import sqlite3
import os

def patch_db():
    db_path = 'hostel.db'
    if not os.path.exists(db_path):
        print(f"Database {db_path} not found.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 1. Add agreement_url column if it doesn't exist
        print("Checking for agreement_url column...")
        cursor.execute("PRAGMA table_info(tenants)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'agreement_url' not in columns:
            print("Adding agreement_url column to tenants table...")
            cursor.execute("ALTER TABLE tenants ADD COLUMN agreement_url VARCHAR(255)")
            conn.commit()
            print("Successfully added agreement_url column.")
        else:
            print("agreement_url column already exists.")

        # 2. Populate agreement_url from documents table
        print("Populating agreement_url from documents table...")
        cursor.execute("SELECT tenant_id, url FROM documents WHERE type = 'Agreement'")
        agreements = cursor.fetchall()
        
        updated_count = 0
        for tenant_id, url in agreements:
            cursor.execute("UPDATE tenants SET agreement_url = ? WHERE id = ? AND agreement_url IS NULL", (url, tenant_id))
            if cursor.rowcount > 0:
                updated_count += 1
        
        conn.commit()
        print(f"Successfully updated agreement_url for {updated_count} tenants.")

    except Exception as e:
        print(f"An error occurred: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    patch_db()
