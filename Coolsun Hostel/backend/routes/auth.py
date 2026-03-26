from flask import Blueprint, request, jsonify, session
from backend.models import db, User
from werkzeug.security import generate_password_hash
import jwt
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv

load_dotenv()
auth_bp = Blueprint('auth', __name__)

# Very simple secret string for JWT tokens (password resets)
# In production, ensure SECRET_KEY is set in your .env
JWT_SECRET = os.getenv('SECRET_KEY', 'dev_key_123')

@auth_bp.route('/auth/login', methods=['POST'])
def login():
    data = request.json
    username = data.get('username')
    password = data.get('password')

    if not username or not password:
        return jsonify({"error": "Username and password required"}), 400

    user = User.query.filter_by(username=username).first()
    if not user or not user.check_password(password):
        return jsonify({"error": "Invalid credentials"}), 401

    if not user.is_on_duty:
        return jsonify({"error": "Account is inactive"}), 403

    # Add to session
    session['user_id'] = user.id
    session['username'] = user.username
    session['role'] = user.role

    return jsonify({
        "message": "Login successful",
        "user": {
            "id": user.id,
            "username": user.username,
            "role": user.role
        }
    }), 200

@auth_bp.route('/auth/logout', methods=['POST'])
def logout():
    session.clear()
    return jsonify({"message": "Logged out successfully"}), 200

@auth_bp.route('/auth/forgot-password', methods=['POST'])
def forgot_password():
    data = request.json
    username = data.get('username')

    if not username:
        return jsonify({"error": "Username required"}), 400

    user = User.query.filter_by(username=username).first()
    if not user:
        # Prevent username enumeration (always send a success-sounding message)
        return jsonify({"message": "If the username exists, a recovery instruction was generated."}), 200

    # Generate a time-restricted JWT token for recovery
    token = jwt.encode({
        "user_id": user.id,
        "exp": datetime.utcnow() + timedelta(hours=1)
    }, JWT_SECRET, algorithm="HS256")

    # In a real app with SMTP, you would email this.
    # We will log it to the console for the administrator to access
    reset_link = f"http://localhost:5173/reset-password/{token}"
    print("\n" + "="*50)
    print("🔐 PASSWORD RESET REQUESTED")
    print(f"👤 For User: {username}")
    print(f"🔗 Reset Link: {reset_link}")
    print("="*50 + "\n")

    return jsonify({"message": "If the username exists, a recovery instruction was generated. Please check server logs for the token."}), 200


@auth_bp.route('/auth/reset-password', methods=['POST'])
def reset_password():
    data = request.json
    token = data.get('token')
    new_password = data.get('password')

    if not token or not new_password:
        return jsonify({"error": "Token and password required"}), 400

    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        user_id = payload['user_id']
        user = User.query.get(user_id)

        if not user:
            return jsonify({"error": "Invalid token user"}), 400

        user.set_password(new_password)
        db.session.commit()
        return jsonify({"message": "Password updated successfully"}), 200

    except jwt.ExpiredSignatureError:
        return jsonify({"error": "Token has expired"}), 400
    except jwt.InvalidTokenError:
        return jsonify({"error": "Invalid token"}), 400
