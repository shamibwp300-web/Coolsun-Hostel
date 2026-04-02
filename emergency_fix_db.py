import sqlite3
import os

def emergency_patch():
    # Correct path to the active database
    db_path = os.path.join('backend', 'instance', 'hostel.db')
    
    if not os.path.exists(db_path):
        print(f"❌ Actual database not found at {db_path}.")
        # Search for any other hostel.db just in case
        return

    print(f"✅ Found active database at {db_path}. Applying emergency fixes...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 1. Add agreement_url column to tenants
        cursor.execute("PRAGMA table_info(tenants)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'agreement_url' not in columns:
            print("Adding agreement_url column to tenants table...")
            cursor.execute("ALTER TABLE tenants ADD COLUMN agreement_url VARCHAR(255)")
            conn.commit()
            print("Successfully added agreement_url column.")
        else:
            print("agreement_url column already exists.")

        # 2. Verify and Count Data to reassure the user
        cursor.execute("SELECT COUNT(*) FROM tenants")
        tenant_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM rooms")
        room_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM floors")
        floor_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM documents")
        doc_count = cursor.fetchone()[0]

        print("\n📊 --- DATA STATUS REPORT ---")
        print(f"Total Tenants: {tenant_count}")
        print(f"Total Rooms:   {room_count}")
        print(f"Total Floors:  {floor_count}")
        print(f"Total Documents: {doc_count}")
        print("----------------------------\n")

        # 3. Populate agreement_url if possible
        cursor.execute("SELECT tenant_id, url FROM documents WHERE type = 'Agreement'")
        agreements = cursor.fetchall()
        updated_count = 0
        for tenant_id, url in agreements:
            cursor.execute("UPDATE tenants SET agreement_url = ? WHERE id = ? AND agreement_url IS NULL", (url, tenant_id))
            if cursor.rowcount > 0:
                updated_count += 1
        
        conn.commit()
        if updated_count > 0:
            print(f"Successfully migrated {updated_count} agreement links.")

    except Exception as e:
        print(f"❌ An error occurred during emergency fix: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    emergency_patch()
