import sqlite3
import os

def restore_live_data():
    # Target the REAL active database found in the nested directory
    db_path = os.path.join('Coolsun Hostel', 'hostel.db')
    
    if not os.path.exists(db_path):
        print(f"❌ Actual database not found at {db_path}. Trying absolute path...")
        db_path = r'd:\Coolsun Hostel\Coolsun Hostel\hostel.db'
        if not os.path.exists(db_path):
            print(f"❌ Still not found at {db_path}.")
            return

    print(f"✅ Found LIVE database at {db_path}. Restoring data visibility...")
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # 1. Add agreement_url column to tenants if missing
        cursor.execute("PRAGMA table_info(tenants)")
        columns = [column[1] for column in cursor.fetchall()]
        
        if 'agreement_url' not in columns:
            print("Adding agreement_url column to tenants table...")
            cursor.execute("ALTER TABLE tenants ADD COLUMN agreement_url VARCHAR(255)")
            conn.commit()
            print("Successfully added agreement_url column.")
        else:
            print("agreement_url column already exists.")

        # 2. Migrate existing Agreement documents to the Tenant model
        print("Migrating agreement links from documents table...")
        # Note: In the nested DB schema, 'type' might be different or Enum based.
        # Let's check the documents table schema first.
        cursor.execute("PRAGMA table_info(documents)")
        doc_cols = [c[1] for c in cursor.fetchall()]
        
        if 'type' in doc_cols:
            cursor.execute("SELECT tenant_id, url FROM documents WHERE type = 'Agreement'")
            agreements = cursor.fetchall()
            updated_count = 0
            for tenant_id, url in agreements:
                cursor.execute("UPDATE tenants SET agreement_url = ? WHERE id = ? AND agreement_url IS NULL", (url, tenant_id))
                if cursor.rowcount > 0:
                    updated_count += 1
            conn.commit()
            print(f"Successfully migrated {updated_count} agreement links.")
        else:
            print("Documents table doesn't have a 'type' column, skipping auto-migration.")

        # 3. Final Verification and Count
        cursor.execute("SELECT COUNT(*) FROM tenants")
        tenant_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM rooms")
        room_count = cursor.fetchone()[0]
        cursor.execute("SELECT COUNT(*) FROM floors")
        floor_count = cursor.fetchone()[0]

        print("\n📊 --- LIVE DATA RESTORED ---")
        print(f"TOTAL TENANTS: {tenant_count}")
        print(f"TOTAL ROOMS:   {room_count}")
        print(f"TOTAL FLOORS:  {floor_count}")
        print("----------------------------\n")
        print("Backend should now be functional. Please refresh your browser.")

    except Exception as e:
        print(f"❌ An error occurred during restoration: {e}")
        conn.rollback()
    finally:
        conn.close()

if __name__ == "__main__":
    restore_live_data()
