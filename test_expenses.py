import os
import sys

# Add the project root to sys.path
sys.path.append(os.getcwd())

from backend.app import create_app
from backend.models import db, Expense

app = create_app()

with app.app_context():
    expenses = Expense.query.filter_by(deleted_at=None).all()
    print(f"Total expenses: {len(expenses)}")
    for exp in expenses:
        try:
            d = exp.date.strftime('%Y-%m-%d') if exp.date else "N/A"
            # print(f"ID {exp.id}: {d}")
        except AttributeError as e:
            print(f"CRASH on ID {exp.id}: {exp.date} (Type: {type(exp.date)})")
            print(f"Error: {e}")
    
    print("Test finished.")
