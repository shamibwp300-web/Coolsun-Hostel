import sqlite3
import os

db_path = r"D:\Coolsun Hostel\Coolsun Hostel\hostel.db"
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("UPDATE expenses SET date = '2026-03-28'")
print(f"Updated {cursor.rowcount} rows")

conn.commit()
conn.close()
