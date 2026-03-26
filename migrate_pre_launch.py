import sqlite3
import os

db_path = r"d:\Coolsun Hostel\Coolsun Hostel\hostel.db"
print(f"Migrating PRE-LAUNCH {db_path}...")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    tenant_cols = [
        "father_name TEXT",
        "permanent_address TEXT",
        "police_station TEXT",
        "id_card_front_url TEXT",
        "id_card_back_url TEXT",
        "police_form_url TEXT",
        "police_form_submitted DATETIME",
        "internet_opt_in BOOLEAN DEFAULT FALSE",
        "tenancy_type TEXT",
        "emergency_contact TEXT",
        "is_partial_payment BOOLEAN DEFAULT FALSE",
        "parent_tenant_id INTEGER REFERENCES tenants(id)",
        "compliance_alert BOOLEAN DEFAULT FALSE",
        "bed_label TEXT"
    ]
    
    for col in tenant_cols:
        col_name = col.split()[0]
        try:
            cursor.execute(f"ALTER TABLE tenants ADD COLUMN {col}")
            print(f"Success: Added {col_name} to tenants")
        except sqlite3.OperationalError as e:
            print(f"Note {col_name}: {e}")
            
    billing_cols = [
        "security_deposit NUMERIC(10, 2)",
        "pro_rata_rent NUMERIC(10, 2)",
        "due_day INTEGER DEFAULT 1"
    ]
    
    for col in billing_cols:
        col_name = col.split()[0]
        try:
            cursor.execute(f"ALTER TABLE billing_profiles ADD COLUMN {col}")
            print(f"Success: Added {col_name} to billing_profiles")
        except sqlite3.OperationalError as e:
            print(f"Note {col_name}: {e}")
            
    conn.commit()
    conn.close()
    print("Pre-Launch Migration finished.")
except Exception as e:
    print(f"CRITICAL ERROR: {e}")
