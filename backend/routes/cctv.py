from flask import Blueprint, jsonify, request, session
from backend.models import db, CCTVCamera, User

cctv_bp = Blueprint('cctv', __name__)

def check_permission(module):
    user_id = session.get('user_id')
    if not user_id: return False
    user = User.query.get(user_id)
    if not user: return False
    if user.role == 'Owner': return True
    if user.permissions and user.permissions.get(module):
        return True
    return False

@cctv_bp.route('/cctv/cameras', methods=['GET'])
def get_cameras():
    # We allows viewers if they have 'cctv' permission
    if not check_permission('cctv'):
        return jsonify({"error": "Unauthorized"}), 403
    
    cameras = CCTVCamera.query.filter_by(deleted_at=None).order_by(CCTVCamera.position_index).all()
    return jsonify([{
        "id": c.id,
        "name": c.name,
        "type": c.type,
        "url": c.url,
        "description": c.description,
        "position_index": c.position_index,
        "is_active": c.is_active
    } for c in cameras]), 200

@cctv_bp.route('/cctv/cameras', methods=['POST'])
def add_camera():
    # Only Owner or Settings permission can ADD cameras
    if not check_permission('settings'):
        return jsonify({"error": "Unauthorized"}), 403
        
    data = request.json
    camera = CCTVCamera(
        name=data.get('name'),
        type=data.get('type', 'Embed'),
        url=data.get('url'),
        description=data.get('description'),
        position_index=data.get('position_index', 0)
    )
    db.session.add(camera)
    db.session.commit()
    return jsonify({"message": "Camera added successfully", "id": camera.id}), 201

@cctv_bp.route('/cctv/cameras/<int:camera_id>', methods=['PUT'])
def update_camera(camera_id):
    if not check_permission('settings'):
        return jsonify({"error": "Unauthorized"}), 403
        
    camera = CCTVCamera.query.get_or_404(camera_id)
    data = request.json
    
    if 'name' in data: camera.name = data['name']
    if 'type' in data: camera.type = data['type']
    if 'url' in data: camera.url = data['url']
    if 'description' in data: camera.description = data['description']
    if 'position_index' in data: camera.position_index = data['position_index']
    if 'is_active' in data: camera.is_active = data['is_active']
    
    db.session.commit()
    return jsonify({"message": "Camera updated successfully"}), 200

@cctv_bp.route('/cctv/cameras/<int:camera_id>', methods=['DELETE'])
def delete_camera(camera_id):
    if not check_permission('settings'):
        return jsonify({"error": "Unauthorized"}), 403
        
    camera = CCTVCamera.query.get_or_404(camera_id)
    camera.delete() # Soft delete
    db.session.commit()
    return jsonify({"message": "Camera deleted successfully"}), 200
