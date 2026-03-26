import sqlite3

db_path = r"d:\Coolsun Hostel\Coolsun Hostel\hostel.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

def add_column(table, col, definition):
    try:
        cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {definition}")
        print(f"Added {col} to {table}")
    except sqlite3.OperationalError:
        print(f"{col} already exists in {table}")

add_column("fine_types", "name", "VARCHAR(100)")
add_column("fine_types", "amount", "NUMERIC(10, 2)")
add_column("fine_types", "description", "TEXT")
add_column("fine_types", "created_at", "DATETIME DEFAULT CURRENT_TIMESTAMP")

conn.commit()
conn.close()
