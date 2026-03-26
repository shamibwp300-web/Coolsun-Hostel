from backend.app import create_app
from backend.models import db, Room, Floor
import os

app = create_app()
with app.app_context():
    print("--- FLOORS ---")
    floors = Floor.query.all()
    for f in floors:
        print(f"ID: {f.id}, Floor Number: {f.floor_number}, Name: {f.name}")
    
    print("\n--- ROOM 101 ---")
    rooms = Room.query.filter_by(number='101').all()
    for r in rooms:
        print(f"ID: {r.id}, Number: {r.number}, Floor Value: {r.floor}, Floor ID: {r.floor_id}, Deleted At: {r.deleted_at}")
