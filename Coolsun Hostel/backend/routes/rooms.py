from flask import Blueprint, request, jsonify
from backend.models import db, Room, Tenant, Floor, Ledger
from sqlalchemy.exc import IntegrityError
from datetime import datetime

rooms_bp = Blueprint('rooms', __name__)

@rooms_bp.route('/rooms', methods=['GET'])
def get_rooms():
    try:
        rooms = Room.query.filter_by(deleted_at=None).all()
        result = []
        for room in rooms:
            active_tenants = room.get_active_tenants()
            floor = room.floor_ref
            floor_rooms = [r.id for r in floor.rooms if r.deleted_at is None] if floor else []
            active_floor_tenants = Tenant.query.filter(Tenant.room_id.in_(floor_rooms), Tenant.deleted_at == None).count() if floor_rooms else 0

            result.append({
                "id": room.id,
                "number": room.number,
                "floor": room.floor,
                "type": room.type,
                "capacity": room.capacity,
                "base_rent": float(room.base_rent or 0),
                "occupied_beds": len(active_tenants),
                "available_slots": room.capacity - len(active_tenants),
                "is_bulk_rented": room.is_bulk_rented,
                "max_bulk_capacity": floor.max_bulk_capacity if floor else 30,
                "active_floor_tenants": active_floor_tenants,
                "bulk_tenant_id": floor.bulk_tenant_id if floor else None
            })
        return jsonify(result), 200
    finally:
        db.session.remove()

@rooms_bp.route('/rooms/<int:room_id>', methods=['PUT'])
def update_room(room_id):
    room = Room.query.get_or_404(room_id)
    data = request.json
    
    # Logic Guard: Capacity cannot be less than active tenants
    active_tenants_count = len(room.get_active_tenants())
    new_capacity = data.get('capacity', room.capacity)
    
    if new_capacity < active_tenants_count:
        return jsonify({
            "error": "Conflict", 
            "message": f"Cannot reduce capacity to {new_capacity}. Room has {active_tenants_count} active tenants."
        }), 409

    try:
        new_floor_num = int(data.get('floor', room.floor))
        floor_obj = Floor.query.filter_by(floor_number=new_floor_num, deleted_at=None).first()
        if not floor_obj:
            floor_obj = Floor(floor_number=new_floor_num, name=f"Floor {new_floor_num}")
            db.session.add(floor_obj)
            db.session.flush()

        room.number = data.get('number', room.number)
        room.type = data.get('type', room.type)
        room.capacity = new_capacity
        room.base_rent = float(data.get('base_rent', room.base_rent))
        room.floor = new_floor_num
        room.floor_id = floor_obj.id
        room.is_bulk_rented = data.get('is_bulk_rented', room.is_bulk_rented)
        
        db.session.commit()
        return jsonify({"message": "Room updated successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.session.remove()

@rooms_bp.route('/rooms', methods=['POST'])
def create_room():
    data = request.json
    
    # 0. Strict Validation for required fields
    required_fields = ['number', 'floor', 'type', 'capacity', 'base_rent']
    for field in required_fields:
        if field not in data or data[field] == '' or data[field] is None:
            return jsonify({
                "error": "Missing Field",
                "message": f"The '{field}' field is required and cannot be empty."
            }), 400
            
    number = str(data.get('number', '')).strip()
    
    # 1. Check for Duplicate Room Number (including soft-deleted)
    existing = Room.query.filter_by(number=number).first()
    if existing and existing.deleted_at is None:
        return jsonify({
            "error": "Duplicate Room",
            "message": f"Room '{number}' already exists in the inventory."
        }), 409

    try:
        floor_num = int(data.get('floor', 1))
        floor_obj = Floor.query.filter_by(floor_number=floor_num, deleted_at=None).first()
        if not floor_obj:
            floor_obj = Floor(floor_number=floor_num, name=f"Floor {floor_num}")
            db.session.add(floor_obj)
            db.session.flush()

        if existing:
            # Recycle soft-deleted room
            new_room = existing
            new_room.floor_id = floor_obj.id
            new_room.floor = floor_num
            new_room.type = data.get('type', 'Small')
            new_room.capacity = int(data.get('capacity', 2))
            new_room.base_rent = float(data.get('base_rent', 10000.00))
            new_room.is_bulk_rented = data.get('is_bulk_rented', floor_obj.is_bulk_rented)
            new_room.deleted_at = None
        else:
            # Create brand new room
            new_room = Room(
                floor_id=floor_obj.id,
                floor=floor_num,
                number=number,
                type=data.get('type', 'Small'),
                capacity=int(data.get('capacity', 2)),
                base_rent=float(data.get('base_rent', 10000.00)),
                is_bulk_rented=data.get('is_bulk_rented', floor_obj.is_bulk_rented)
            )
            db.session.add(new_room)
            
        db.session.commit()
        return jsonify({"message": "Room created successfully", "id": new_room.id}), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.session.remove()

@rooms_bp.route('/rooms/<int:room_id>', methods=['DELETE'])
def delete_room(room_id):
    room = Room.query.get_or_404(room_id)
    if len(room.get_active_tenants()) > 0:
        return jsonify({"error": "Cannot delete room with active tenants"}), 409
    try:
        room.delete()
        db.session.commit()
        return jsonify({"message": "Room deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.session.remove()

@rooms_bp.route('/floors', methods=['GET'])
def get_floors():
    try:
        floors = Floor.query.filter_by(deleted_at=None).all()
        result = []
        for f in floors:
            floor_rooms = [r.id for r in f.rooms if r.deleted_at is None]
            active_tenants = Tenant.query.filter(Tenant.room_id.in_(floor_rooms), Tenant.deleted_at == None).count() if floor_rooms else 0
            
            result.append({
                "id": f.id,
                "floor_number": f.floor_number,
                "name": f.name,
                "is_bulk_rented": f.is_bulk_rented,
                "bulk_tenant_id": f.bulk_tenant_id,
                "bulk_rent_amount": float(f.bulk_rent_amount or 0),
                "bulk_security_deposit": float(f.bulk_security_deposit or 0),
                "max_bulk_capacity": f.max_bulk_capacity,
                "active_tenants": active_tenants
            })
        return jsonify(result), 200
    finally:
        db.session.remove()

@rooms_bp.route('/floors/<int:floor_id>/bulk_config', methods=['POST'])
def save_bulk_config(floor_id):
    floor = Floor.query.get_or_404(floor_id)
    data = request.json
    
    selected_room_ids = data.get('selected_room_ids', [])
    is_bulk = data.get('is_bulk_rented', False)
    
    floor.is_bulk_rented = is_bulk
    if is_bulk:
        raw_tid = data.get('bulk_tenant_id')
        tenant_id = int(raw_tid) if raw_tid and str(raw_tid).strip() else None
        floor.bulk_tenant_id = tenant_id
        floor.bulk_rent_amount = data.get('bulk_rent_amount')
        floor.bulk_security_deposit = data.get('bulk_security_deposit')
        floor.max_bulk_capacity = data.get('max_bulk_capacity', 30)

        if tenant_id:
            existing_deposit = Ledger.query.filter_by(
                tenant_id=tenant_id, 
                type='DEPOSIT', 
                deleted_at=None
            ).filter(Ledger.description.contains(f"Bulk Floor Rental Security ({floor.name})")).first()
            
            if not existing_deposit and floor.bulk_security_deposit:
                db.session.add(Ledger(
                    tenant_id=tenant_id,
                    amount=floor.bulk_security_deposit,
                    type='DEPOSIT',
                    status='PAID',
                    payment_method='Cash',
                    description=f"Bulk Floor Rental Security ({floor.name}) - One-time"
                ))
            
            current_month = datetime.utcnow().strftime('%Y-%m')
            existing_rent = Ledger.query.filter_by(
                tenant_id=tenant_id,
                type='RENT',
                deleted_at=None
            ).filter(Ledger.description.contains(f"Bulk Floor Rent ({floor.name})")).all()
            
            already_billed = any(e.timestamp.strftime('%Y-%m') == current_month for e in existing_rent)
            if not already_billed and floor.bulk_rent_amount:
                db.session.add(Ledger(
                    tenant_id=tenant_id,
                    amount=floor.bulk_rent_amount,
                    type='RENT',
                    status='PAID',
                    payment_method='Cash',
                    description=f"Bulk Floor Rent ({floor.name}) - Initial Billing"
                ))
    else:
        floor.bulk_tenant_id = None
        floor.bulk_rent_amount = None
        floor.bulk_security_deposit = None
        
    for room in floor.rooms:
        if room.id in selected_room_ids:
            room.is_bulk_rented = True
        else:
            room.is_bulk_rented = False
            
    try:
        db.session.commit()
        return jsonify({"message": "Bulk configuration saved successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.session.remove()

@rooms_bp.route('/floors/<int:floor_id>/bulk_rent', methods=['POST'])
def update_bulk_rent(floor_id):
    floor = Floor.query.get_or_404(floor_id)
    data = request.json
    
    is_bulk_rented = data.get('is_bulk_rented', False)
    
    if is_bulk_rented:
        floor.is_bulk_rented = True
        raw_tid = data.get('bulk_tenant_id')
        floor.bulk_tenant_id = int(raw_tid) if raw_tid and str(raw_tid).strip() else None
        floor.bulk_rent_amount = data.get('bulk_rent_amount')
        floor.max_bulk_capacity = data.get('max_bulk_capacity', 30)
    else:
        floor.is_bulk_rented = False
        floor.bulk_tenant_id = None
        floor.bulk_rent_amount = None
        
    try:
        db.session.commit()
        return jsonify({"message": "Floor bulk rent updated"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500
    finally:
        db.session.remove()
