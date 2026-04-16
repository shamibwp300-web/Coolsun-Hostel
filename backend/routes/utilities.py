from flask import Blueprint, jsonify, request
from backend.models import db, Room, MeterReading, Ledger, WaterBill, InternetBill
from datetime import datetime

utilities_bp = Blueprint('utilities', __name__)

@utilities_bp.route('/utilities/meter-reading', methods=['POST'])
def add_reading():
    data = request.json
    room_id = data.get('room_id')
    current_reading = int(data.get('current_reading'))
    unit_cost = float(data.get('unit_cost', 0))
    
    room = Room.query.get_or_404(room_id)
    
    # Use provided previous reading or fallback to database
    previous_reading_input = data.get('previous_reading')
    if previous_reading_input is not None:
        previous_reading = int(previous_reading_input)
    else:
        last_reading = MeterReading.query.filter_by(room_id=room_id).order_by(MeterReading.reading_date.desc()).first()
        previous_reading = last_reading.current_reading if last_reading else 0
    
    # Update meter number if provided
    meter_number = data.get('meter_number')
    if meter_number:
        room.meter_number = meter_number
    
    if current_reading < previous_reading:
        return jsonify({"error": "Current reading cannot be less than previous reading"}), 400
        
    units_consumed = current_reading - previous_reading
    total_bill = units_consumed * unit_cost
    
    reading_date_str = data.get('reading_date')
    reading_date = datetime.strptime(reading_date_str, '%Y-%m-%d') if reading_date_str else datetime.utcnow()
    
    new_reading = MeterReading(
        room_id=room_id,
        previous_reading=previous_reading,
        current_reading=current_reading,
        units_consumed=units_consumed,
        unit_cost=unit_cost,
        total_bill=total_bill,
        reading_date=reading_date
    )
    
    try:
        db.session.add(new_reading)
        
        # --- BILL SPLITTING LOGIC ---
        active_tenants = room.get_active_tenants()
        num_heads = len(active_tenants)
        
        if num_heads > 0 and total_bill > 0:
            split_amount = total_bill / num_heads
            
            # Format the description nicely
            month_name = reading_date.strftime('%B %Y')
            description = f"Electricity Bill ({month_name}) - Room {room.number} Share ({num_heads} active tenants)"
            
            for tenant in active_tenants:
                liable_tenant_id = tenant.parent_tenant_id if tenant.parent_tenant_id else tenant.id
                
                utility_charge = Ledger(
                    tenant_id=liable_tenant_id,
                    amount=split_amount,
                    type='UTILITY',
                    status='PENDING',
                    timestamp=reading_date,
                    description=f"{description} (for {tenant.name})" if tenant.parent_tenant_id else description
                )
                db.session.add(utility_charge)
                
            new_reading.is_billed = True

        db.session.commit()
        return jsonify({
            "message": "Meter reading saved and billed to tenants successfully",
            "bill_amount": total_bill,
            "units_consumed": units_consumed,
            "tenants_billed": num_heads
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@utilities_bp.route('/utilities/meter-reading', methods=['GET'])
def get_readings():
    # Can filter by room_id
    room_id = request.args.get('room_id')
    query = MeterReading.query
    if room_id:
        query = query.filter_by(room_id=room_id)
        
    readings = query.order_by(MeterReading.reading_date.desc()).all()
    
    result = []
    for r in readings:
        result.append({
            "id": r.id,
            "room_id": r.room_id,
            "room_number": r.room.number if r.room else "Unknown",
            "previous_reading": r.previous_reading,
            "current_reading": r.current_reading,
            "units_consumed": r.units_consumed,
            "unit_cost": float(r.unit_cost),
            "total_bill": float(r.total_bill),
            "reading_date": r.reading_date.strftime('%Y-%m-%d'),
            "is_billed": r.is_billed
        })
        
    return jsonify(result), 200

@utilities_bp.route('/utilities/water-bill', methods=['POST'])
def add_water_bill():
    data = request.json
    room_id = data.get('room_id')
    amount = float(data.get('amount', 0))
    
    room = Room.query.get_or_404(room_id)
    
    billing_date_str = data.get('billing_date')
    billing_date = datetime.strptime(billing_date_str, '%Y-%m-%d') if billing_date_str else datetime.utcnow()
    
    new_bill = WaterBill(
        room_id=room_id,
        amount=amount,
        billing_date=billing_date
    )
    
    try:
        db.session.add(new_bill)
        
        # --- BILL SPLITTING LOGIC ---
        active_tenants = room.get_active_tenants()
        num_heads = len(active_tenants)
        
        if num_heads > 0 and amount > 0:
            split_amount = amount / num_heads
            month_name = billing_date.strftime('%B %Y')
            description = f"Water Bill ({month_name}) - Room {room.number} Share"
            
            for tenant in active_tenants:
                liable_tenant_id = tenant.parent_tenant_id if tenant.parent_tenant_id else tenant.id
                
                utility_charge = Ledger(
                    tenant_id=liable_tenant_id,
                    amount=split_amount,
                    type='UTILITY',
                    status='PENDING',
                    timestamp=billing_date,
                    description=f"{description} (for {tenant.name})" if tenant.parent_tenant_id else description
                )
                db.session.add(utility_charge)
                
        db.session.commit()
        return jsonify({
            "message": "Water bill saved and split successfully",
            "bill_amount": amount,
            "tenants_billed": num_heads
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@utilities_bp.route('/utilities/internet-bill', methods=['POST'])
def add_internet_bill():
    data = request.json
    room_id = data.get('room_id')
    amount = float(data.get('amount', 0))
    
    room = Room.query.get_or_404(room_id)
    
    billing_date_str = data.get('billing_date')
    billing_date = datetime.strptime(billing_date_str, '%Y-%m-%d') if billing_date_str else datetime.utcnow()
    
    new_bill = InternetBill(
        room_id=room_id,
        amount=amount,
        billing_date=billing_date
    )
    
    try:
        db.session.add(new_bill)
        
        # --- BILL SPLITTING LOGIC (OPT-IN ONLY) ---
        active_tenants = room.get_active_tenants()
        # Only count tenants who opted in to internet
        internet_tenants = [t for t in active_tenants if t.internet_opt_in]
        num_heads = len(internet_tenants)
        
        if num_heads > 0 and amount > 0:
            split_amount = amount / num_heads
            month_name = billing_date.strftime('%B %Y')
            description = f"Internet Bill ({month_name}) - Room {room.number} Share"
            
            for tenant in internet_tenants:
                liable_tenant_id = tenant.parent_tenant_id if tenant.parent_tenant_id else tenant.id
                
                utility_charge = Ledger(
                    tenant_id=liable_tenant_id,
                    amount=split_amount,
                    type='UTILITY',
                    status='PENDING',
                    timestamp=billing_date,
                    description=f"{description} (for {tenant.name})" if tenant.parent_tenant_id else description
                )
                db.session.add(utility_charge)
                
        db.session.commit()
        return jsonify({
            "message": "Internet bill saved and split successfully",
            "bill_amount": amount,
            "tenants_billed": num_heads
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@utilities_bp.route('/utilities/rooms-status', methods=['GET'])
def rooms_utility_status():
    """Returns all rooms with their latest meter reading for easy grid viewing"""
    rooms = Room.query.all()
    result = []
    for room in rooms:
        last_reading = MeterReading.query.filter_by(room_id=room.id).order_by(MeterReading.reading_date.desc()).first()
        last_water = WaterBill.query.filter_by(room_id=room.id).order_by(WaterBill.billing_date.desc()).first()
        last_internet = InternetBill.query.filter_by(room_id=room.id).order_by(InternetBill.billing_date.desc()).first()
        
        # Calculate how many tenants in the room are opted in to the internet
        internet_opt_in_count = len([t for t in room.get_active_tenants() if t.internet_opt_in])
        
        result.append({
            "room_id": room.id,
            "room_number": room.number,
            "capacity": room.capacity,
            "occupied_beds": len(room.get_active_tenants()),
            "meter_number": room.meter_number,
            "internet_opt_in_count": internet_opt_in_count,
            "last_reading": last_reading.current_reading if (last_reading and last_reading.current_reading is not None) else 0,
            "last_reading_date": last_reading.reading_date.strftime('%Y-%m-%d') if (last_reading and last_reading.reading_date) else None,
            "last_unit_cost": float(last_reading.unit_cost or 0) if last_reading else 0.0,
            "last_bill_amount": float(last_reading.total_bill or 0) if last_reading else 0.0,
            "last_units_consumed": last_reading.units_consumed if (last_reading and last_reading.units_consumed is not None) else 0,
            "last_water_bill_amount": float(last_water.amount or 0) if last_water else 0.0,
            "last_water_bill_date": last_water.billing_date.strftime('%Y-%m-%d') if (last_water and last_water.billing_date) else None,
            "last_internet_bill_amount": float(last_internet.amount or 0) if last_internet else 0.0,
            "last_internet_bill_date": last_internet.billing_date.strftime('%Y-%m-%d') if (last_internet and last_internet.billing_date) else None
        })
    return jsonify(result), 200
