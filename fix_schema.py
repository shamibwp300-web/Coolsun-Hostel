import sqlite3

def migrate():
    conn = sqlite3.connect('hostel.db')
    cursor = conn.cursor()
    
    # 1. Add priority to maintenance_requests if missing
    try:
        cursor.execute("ALTER TABLE maintenance_requests ADD COLUMN priority VARCHAR(20) DEFAULT 'Routine'")
        print("Added priority to maintenance_requests")
    except sqlite3.OperationalError:
        print("priority already exists in maintenance_requests")

    # 2. Add approval_status to expenses if missing
    try:
        cursor.execute("ALTER TABLE expenses ADD COLUMN approval_status VARCHAR(20) DEFAULT 'Pending'")
        print("Added approval_status to expenses")
    except sqlite3.OperationalError:
        print("approval_status already exists in expenses")

    conn.commit()
    conn.close()

if __name__ == "__main__":
    migrate()
