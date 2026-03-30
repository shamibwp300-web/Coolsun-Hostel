import os
import sys
import sqlite3

# Add the project root to sys.path
sys.path.append(os.getcwd())

from backend.app import create_app
from backend.models import db, Expense

app = create_app()

with app.app_context():
    expenses = Expense.query.all()
    print(f"Total expenses: {len(expenses)}")
    for exp in expenses:
        print(f"ID: {exp.id}, Amount: {exp.amount}, Category: {exp.category}")
        print(f"  Date: {exp.date} (Type: {type(exp.date)})")
        if exp.date is not None:
            try:
                print(f"  Strftime check: {exp.date.strftime('%Y-%m-%d')}")
            except Exception as e:
                print(f"  CRASH: {e}")
        else:
            print("  Date is None")

    print("\nAttempting to query directly via sqlite3 to be sure:")
    db_path = os.path.join('backend', 'instance', 'hostel.db')
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()
    cur.execute("SELECT id, amount, date FROM expenses")
    rows = cur.fetchall()
    for row in rows:
        print(f"Row: {row}")
    conn.close()
