import sqlite3

db_path = r"d:\Coolsun Hostel\Coolsun Hostel\hostel.db"
print(f"Migrating PHASE 2 {db_path}...")

try:
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    tables_updates = {
        "ledger": [
            "payment_method TEXT",
            "description TEXT",
            "timestamp DATETIME"
        ],
        "expenses": [
            "category TEXT",
            "description TEXT",
            "sub_note TEXT",
            "date DATE"
        ],
        "meter_readings": [
            "previous_reading INTEGER",
            "current_reading INTEGER",
            "units_consumed INTEGER",
            "unit_cost NUMERIC(10, 2)",
            "total_bill NUMERIC(10, 2)",
            "reading_date DATE",
            "is_billed BOOLEAN DEFAULT FALSE"
        ],
        "water_bills": [
            "room_id INTEGER REFERENCES rooms(id)",
            "amount NUMERIC(10, 2)",
            "billing_date DATE"
        ],
        "internet_bills": [
            "room_id INTEGER REFERENCES rooms(id)",
            "amount NUMERIC(10, 2)",
            "billing_date DATE"
        ]
    }
    
    for table, cols in tables_updates.items():
        for col in cols:
            col_name = col.split()[0]
            try:
                cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col}")
                print(f"Success: Added {col_name} to {table}")
            except sqlite3.OperationalError as e:
                print(f"Note {table}.{col_name}: {e}")
                
    conn.commit()
    conn.close()
    print("Phase 2 Migration finished.")
except Exception as e:
    print(f"CRITICAL ERROR: {e}")
