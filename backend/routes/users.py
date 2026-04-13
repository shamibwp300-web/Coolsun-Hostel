from flask import Blueprint, jsonify, request, session
from backend.models import db, User
from werkzeug.security import generate_password_hash
import json

users_bp = Blueprint('users', __name__)

def check_is_owner_or_settings():
    user_id = session.get('user_id')
    if not user_id: return False
    user = User.query.get(user_id)
    if not user: return False
    if user.role == 'Owner': return True
    
    # Check if settings permission is granted
    if user.permissions and user.permissions.get('settings'):
        return True
    return False

@users_bp.route('/users', methods=['GET'])
def get_users():
    if not check_is_owner_or_settings():
        return jsonify({"error": "Unauthorized"}), 403
    
    users = User.query.filter_by(deleted_at=None).all()
    return jsonify([{
        "id": u.id,
        "username": u.username,
        "role": u.role,
        "permissions": u.permissions,
        "is_on_duty": u.is_on_duty
    } for u in users]), 200

@users_bp.route('/users', methods=['POST'])
def create_user():
    if not check_is_owner_or_settings():
        return jsonify({"error": "Unauthorized"}), 403
        
    data = request.json
    username = data.get('username')
    password = data.get('password')
    role = data.get('role', 'Admin')
    permissions = data.get('permissions', {})

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400
        
    if User.query.filter_by(username=username).first():
        return jsonify({"error": "Username already exists"}), 400

    user = User(
        username=username, 
        role=role, 
        permissions=permissions
    )
    user.set_password(password)
    db.session.add(user)
    db.session.commit()
    
    return jsonify({"message": "User created successfully"}), 201

@users_bp.route('/users/<int:user_id>', methods=['PUT'])
def update_user(user_id):
    if not check_is_owner_or_settings():
        return jsonify({"error": "Unauthorized"}), 403
        
    user = User.query.get_or_404(user_id)
    data = request.json
    
    if 'username' in data:
        user.username = data['username']
    if 'password' in data and data['password']:
        user.set_password(data['password'])
    if 'role' in data:
        user.role = data['role']
    if 'permissions' in data:
        user.permissions = data['permissions']
    if 'is_on_duty' in data:
        user.is_on_duty = data['is_on_duty']
        
    db.session.commit()
    return jsonify({"message": "User updated successfully"}), 200

@users_bp.route('/users/<int:user_id>', methods=['DELETE'])
def delete_user(user_id):
    if not check_is_owner_or_settings():
        return jsonify({"error": "Unauthorized"}), 403
        
    user = User.query.get_or_404(user_id)
    
    # Prevent deleting self
    if user.id == session.get('user_id'):
        return jsonify({"error": "Cannot delete yourself"}), 400
        
    user.delete() # Soft delete
    db.session.commit()
    return jsonify({"message": "User deleted successfully"}), 200
