import sqlite3
import os

db_path = r"d:\Coolsun Hostel\Coolsun Hostel\hostel.db"
print(f"Migrating {db_path}...")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    # 1. Add is_bulk_rented to rooms
    try:
        cursor.execute("ALTER TABLE rooms ADD COLUMN is_bulk_rented BOOLEAN DEFAULT FALSE")
        conn.commit()
        print("Success: Added is_bulk_rented to rooms")
    except sqlite3.OperationalError as e:
        print(f"Rooms Note: {e}")
        
    # 2. Add is_bulk_rented to floors
    try:
        cursor.execute("ALTER TABLE floors ADD COLUMN is_bulk_rented BOOLEAN DEFAULT FALSE")
        conn.commit()
        print("Success: Added is_bulk_rented to floors")
    except sqlite3.OperationalError as e:
        print(f"Floors Note: {e}")
        
    # 2.1 Add bulk_tenant_id to floors
    try:
        cursor.execute("ALTER TABLE floors ADD COLUMN bulk_tenant_id INTEGER REFERENCES tenants(id)")
        conn.commit()
        print("Success: Added bulk_tenant_id to floors")
    except sqlite3.OperationalError as e:
        print(f"Floors bulk_tenant_id Note: {e}")
        
    # 2.2 Add bulk_rent_amount to floors
    try:
        cursor.execute("ALTER TABLE floors ADD COLUMN bulk_rent_amount NUMERIC(10, 2)")
        conn.commit()
        print("Success: Added bulk_rent_amount to floors")
    except sqlite3.OperationalError as e:
        print(f"Floors bulk_rent_amount Note: {e}")

    # 2.3 Add bulk_security_deposit to floors
    try:
        cursor.execute("ALTER TABLE floors ADD COLUMN bulk_security_deposit NUMERIC(10, 2)")
        conn.commit()
        print("Success: Added bulk_security_deposit to floors")
    except sqlite3.OperationalError as e:
        print(f"Floors bulk_security_deposit Note: {e}")

    # 2.4 Add max_bulk_capacity to floors
    try:
        cursor.execute("ALTER TABLE floors ADD COLUMN max_bulk_capacity INTEGER DEFAULT 30")
        conn.commit()
        print("Success: Added max_bulk_capacity to floors")
    except sqlite3.OperationalError as e:
        print(f"Floors max_bulk_capacity Note: {e}")
        
    # 3. Add floor_id to rooms (in case it's missing)
    try:
        cursor.execute("ALTER TABLE rooms ADD COLUMN floor_id INTEGER REFERENCES floors(id)")
        conn.commit()
        print("Success: Added floor_id to rooms")
    except sqlite3.OperationalError as e:
        print(f"Floor ID Note: {e}")
        
    conn.close()
    print("Migration finished.")
except Exception as e:
    print(f"CRITICAL ERROR: {e}")
