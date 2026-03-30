import sqlite3
import os

db_path = os.path.join('backend', 'instance', 'hostel.db')
if not os.path.exists(db_path):
    db_path = 'hostel.db'

def migrate():
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    columns_to_add = [
        ("category", "VARCHAR(100) DEFAULT 'Operational'"),
        ("date", "DATE"),
        ("deleted_at", "DATETIME"),
        ("sub_note", "TEXT"),
        ("description", "TEXT"),
        ("approval_status", "VARCHAR(20) DEFAULT 'Pending'")
    ]
    
    for col_name, col_def in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE expenses ADD COLUMN {col_name} {col_def}")
            print(f"Added {col_name} to expenses")
        except sqlite3.OperationalError:
            print(f"{col_name} already exists in expenses")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
