import sqlite3
import os

def scan_all_dbs():
    search_paths = [
        r'd:\Coolsun Hostel',
        r'd:\Coolsun Hostel Backup 3-31-26'
    ]
    
    print(f"Scanning for hostel.db in {search_paths}...")
    
    found_any = False
    for root_search in search_paths:
        for root, dirs, files in os.walk(root_search):
            if 'hostel.db' in files:
                db_path = os.path.join(root, 'hostel.db')
                try:
                    conn = sqlite3.connect(db_path)
                    cursor = conn.cursor()
                    cursor.execute("SELECT COUNT(*) FROM tenants")
                    tenant_count = cursor.fetchone()[0]
                    cursor.execute("SELECT COUNT(*) FROM rooms")
                    room_count = cursor.fetchone()[0]
                    
                    print(f"✅ Found DB: {db_path}")
                    print(f"   - Tenants: {tenant_count}")
                    print(f"   - Rooms:   {room_count}")
                    print(f"   - Modified: {os.path.getmtime(db_path)}")
                    
                    if tenant_count >= 10:
                        print(f"🌟 POTENTIAL ACTIVE DB FOUND: {db_path} 🌟")
                        
                    found_any = True
                    conn.close()
                except Exception as e:
                    print(f"❌ Error reading {db_path}: {e}")
    
    if not found_any:
        print("No hostel.db files found.")

if __name__ == "__main__":
    scan_all_dbs()
