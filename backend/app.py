from flask import Flask, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from backend.models import db
import os
from dotenv import load_dotenv

# ─── Load Environment Variables ──────────────────────────────────────────────
# Ise shuru mein load karna lazmi hai taake Supabase ka link mil sakay
load_dotenv()

# ─── Absolute DB path (Smart Discovery) ──────────────────────────────────────
_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def find_best_db():
    import sqlite3
    potential_paths = [
        "/app/backend/instance/hostel.db", # Most likely for sync scripts
        "/app/instance/hostel.db",         # Coolify volume path
        "/app/hostel.db",                  # Root fallback
        os.path.abspath(os.path.join(os.path.dirname(__file__), 'instance', 'hostel.db')),
        os.path.abspath(os.path.join(_BASE_DIR, 'hostel.db'))
    ]
    
    best_path = None
    max_data_points = -1
    
    print(f"🔍 SEARCHING FOR REAL DATABASE...")
    for p in potential_paths:
        if os.path.exists(p) and os.path.getsize(p) > 0:
            try:
                conn = sqlite3.connect(p)
                c = conn.cursor()
                # Check tenants & rooms as proxy for "real database"
                c.execute("SELECT COUNT(*) FROM tenants")
                tenants = c.fetchone()[0]
                c.execute("SELECT COUNT(*) FROM rooms")
                rooms = c.fetchone()[0]
                conn.close()
                
                # Calculation to prioritize the real populated database
                data_points = tenants + (rooms * 0.1)
                print(f"   - {p}: {tenants} tenants, {rooms} rooms -> {data_points} pts")
                
                if data_points > max_data_points:
                    max_data_points = data_points
                    best_path = p
            except Exception as e:
                print(f"   - {p}: Skipped ({e})")
                continue
    
    final_path = best_path or "/app/instance/hostel.db"
    print(f"🎯 SELECTED DATABASE: {final_path}")
    return final_path

_DB_PATH = find_best_db()

# Persistent Upload Folder (Docker Volume mapping)
# Prioritize /app/uploads if it exists (Prod/Coolify environment)
_PERSISTENT_UPLOAD_BASE = "/app/uploads" if os.path.exists("/app/uploads") else os.path.join(os.path.dirname(__file__), 'static', 'uploads')
_UPLOAD_DIR = os.path.join(_PERSISTENT_UPLOAD_BASE, 'documents')
os.makedirs(_UPLOAD_DIR, exist_ok=True)

def create_app():
    # Configure Flask to serve static files from the React dist folder securely
    _FRONTEND_DIST = os.path.abspath(os.path.join(_BASE_DIR, 'frontend', 'dist'))
    app = Flask(__name__, static_folder=_FRONTEND_DIST, static_url_path='/')
    
    # 🛰️ DATABASE CONFIGURATION
    # Agar .env mein DATABASE_URL hai (Supabase), toh wo use hoga. 
    # Agar nahi hai, toh purana hostel.db (SQLite) chale ga.
    supabase_url = os.getenv('DATABASE_URL')
    if supabase_url and supabase_url.startswith("postgres://"):
        # Fix for SQLAlchemy (Postgresql:// instead of postgres://)
        supabase_url = supabase_url.replace("postgres://", "postgresql://", 1)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = supabase_url or f'sqlite:///{_DB_PATH}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev_key_123')
    app.config['UPLOAD_FOLDER'] = _UPLOAD_DIR
    
    # ─── Production Security ─────────────────────────────────────────────────────
    app.config['SESSION_COOKIE_SECURE'] = True
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    
    # ─── Cloudflare Proxy Fix ───────────────────────────────────────────────────
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

    # ─── CORS ───────────────────────────────────────────────────────────────────
    # Local development aur Live site dono ke liye allow kiya hai
    CORS(app, resources={r"/api/*": {"origins": ["https://hostel.coolsun.co.uk", "http://localhost:5173", "http://localhost:3000"]}})

    db.init_app(app)

    # 1. Ensure tables exist (Wrapped in try for Gunicorn race conditions)
    try:
        with app.app_context():
            db.create_all()
    except Exception as e:
        app.logger.warning(f"Database table sync skipped/failed (likely already exists): {e}")

    # 2. Auto-seed default users (Independently wrapped)
    try:
        with app.app_context():
            # 🛡️ Structural Guard: Auto-migration for SQLite/Postgres
            from sqlalchemy import text, inspect
            inspector = inspect(db.engine)
            queries = []

            # Tenants table checks
            tenant_cols = [c['name'] for c in inspector.get_columns('tenants')]
            if 'agreement_url' not in tenant_cols:
                queries.append("ALTER TABLE tenants ADD COLUMN agreement_url VARCHAR(255)")
                
            # Ledger table checks
            if 'ledger' in inspector.get_table_names():
                ledger_cols = [c['name'] for c in inspector.get_columns('ledger')]
                if 'payment_method' not in ledger_cols:
                    queries.append("ALTER TABLE ledger ADD COLUMN payment_method VARCHAR(50) DEFAULT 'Cash'")
            
            with db.engine.connect() as conn:
                for q in queries:
                    try:
                        conn.execute(text(q))
                        conn.commit()
                        print(f"✅ AUTO-MIGRATION: {q}")
                    except Exception:
                        try: conn.rollback()
                        except: pass

            from backend.models import User
            if not User.query.filter_by(username='admin').first():
                u = User(username='admin', role='Owner')
                u.set_password('admin123')
                db.session.add(u)
                db.session.commit()
                print("🚀 AUTO-SEED: Admin User (admin/admin123) Created.")
                
            if not User.query.filter_by(username='ewardjain@gmail.com').first():
                o = User(username='ewardjain@gmail.com', role='Owner')
                o.set_password('Coolsun@23*+')
                db.session.add(o)
                db.session.commit()
                print("🚀 AUTO-SEED: Owner User (ewardjain@gmail.com) Created.")
    except Exception as e:
        # We don't rollback here because if it fails due to a lock, another worker might have done it
        app.logger.warning(f"Auto-seed skipped/failed (likely concurrent startup): {e}")

    # Register Blueprints
    from backend.routes.onboarding import onboarding_bp
    from backend.routes.dashboard import dashboard_bp
    from backend.routes.rooms import rooms_bp
    from backend.routes.tenants import tenants_bp
    from backend.routes.utilities import utilities_bp
    from backend.routes.police import police_bp
    from backend.routes.settings import settings_bp
    from backend.routes.tasks import tasks_bp
    from backend.routes.moveout import moveout_bp
    from backend.routes.finance import finance_bp
    from backend.routes.admin import admin_bp
    from backend.routes.auth import auth_bp

    app.register_blueprint(onboarding_bp, url_prefix='/api')
    app.register_blueprint(dashboard_bp, url_prefix='/api')
    app.register_blueprint(rooms_bp, url_prefix='/api')
    app.register_blueprint(tenants_bp, url_prefix='/api')
    app.register_blueprint(utilities_bp, url_prefix='/api')
    app.register_blueprint(police_bp, url_prefix='/api')
    app.register_blueprint(settings_bp, url_prefix='/api')
    app.register_blueprint(tasks_bp, url_prefix='/api')
    app.register_blueprint(moveout_bp, url_prefix='/api')
    app.register_blueprint(finance_bp, url_prefix='/api')
    app.register_blueprint(admin_bp, url_prefix='/api')
    app.register_blueprint(auth_bp, url_prefix='/api')

    # ─── Debug / Schema Recovery Endpoint ──────────────────────────────────────
    @app.route('/api/debug/inspect-db')
    def inspect_db():
        from sqlalchemy import inspect
        inspector = inspect(db.engine)
        schema_info = {}
        for table in inspector.get_table_names():
            schema_info[table] = [c['name'] for c in inspector.get_columns(table)]
        
        # Also check counts for reassurance
        from backend.models import Tenant, Room, Floor
        try:
            counts = {
                "tenants": Tenant.query.count(),
                "rooms": Room.query.count(),
                "floors": Floor.query.count()
            }
        except: counts = "Error counting"
        
        return jsonify({"tables": schema_info, "counts": counts}), 200

    # ─── Static Files for Uploads ──────────────────────────────────────────────
    @app.route('/api/docs/<path:filename>')
    def serve_uploaded_docs(filename):
        # Serve from the persistent upload directory
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    # ─── SPA Fallback Route ─────────────────────────────────────────────────────
    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def catch_all(path):
        full_path = os.path.join(app.static_folder, path)
        if path != "" and os.path.exists(full_path):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, use_reloader=False, port=5000)