from backend.app import create_app
from backend.models import db, Room, Floor
import os

app = create_app()
with app.app_context():
    print("--- ALL ROOMS ---")
    rooms = Room.query.all()
    for r in rooms:
        print(f"Room: {r.number}, Floor Value: {r.floor}, Floor Name: {r.floor_ref.name if r.floor_ref else 'None'}")
