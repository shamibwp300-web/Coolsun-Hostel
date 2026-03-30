import sqlite3
import os

db_path = r"D:\Coolsun Hostel\Coolsun Hostel\hostel.db"

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("SELECT id, amount, date FROM expenses")
rows = cursor.fetchall()
for row in rows:
    print(f"Row: {row}")
conn.close()
