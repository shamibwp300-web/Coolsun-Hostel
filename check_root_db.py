import sqlite3
import os

db_path = 'hostel.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()
cursor.execute("PRAGMA table_info(expenses)")
columns = cursor.fetchall()
for col in columns:
    print(col)

cursor.execute("SELECT count(*) FROM expenses")
count = cursor.fetchone()[0]
print(f"Total expenses: {count}")

conn.close()
