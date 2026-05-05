from flask import Flask, jsonify, send_from_directory
from flask_sqlalchemy import SQLAlchemy
from flask_cors import CORS
from werkzeug.middleware.proxy_fix import ProxyFix
from backend.models import db
import sqlite3
import os
from dotenv import load_dotenv

# ─── Load Environment Variables ──────────────────────────────────────────────
# Ise shuru mein load karna lazmi hai taake Supabase ka link mil sakay
load_dotenv()

# ─── Absolute DB path (Smart Discovery) ──────────────────────────────────────
_BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))

def find_best_db():
    potential_paths = [
        "/app/backend/instance/hostel.db", # Most likely for sync scripts
        "/app/instance/hostel.db",         # Coolify volume path
        "/app/hostel.db",                  # Root fallback
        os.path.abspath(os.path.join(os.path.dirname(__file__), 'instance', 'hostel.db')),
        os.path.abspath(os.path.join(_BASE_DIR, 'hostel.db'))
    ]
    
    best_path = None
    max_tenants = -1
    
    for p in potential_paths:
        try:
            if not os.path.exists(p) or os.path.getsize(p) == 0:
                continue
                
            # Perform a deep check to find real data
            with sqlite3.connect(p, timeout=5) as conn:
                cursor = conn.cursor()
                # Confirm we have a real hostel database
                cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tenants'")
                if cursor.fetchone():
                    cursor.execute("SELECT COUNT(*) FROM tenants WHERE deleted_at IS NULL")
                    count = cursor.fetchone()[0]
                    if count > max_tenants:
                        max_tenants = count
                        best_path = p
        except Exception:
            continue
            
    # Default to the most likely target if no populated DB found
    return best_path or "/app/instance/hostel.db"

_DB_PATH = find_best_db()

def create_app():
    # Configure Flask to serve static files from the React dist folder securely
    _FRONTEND_DIST = os.path.abspath(os.path.join(_BASE_DIR, 'frontend', 'dist'))
    app = Flask(__name__, static_folder=_FRONTEND_DIST, static_url_path='/')
    
    # 🛰️ DATABASE CONFIGURATION
    supabase_url = os.getenv('DATABASE_URL')
    if supabase_url and supabase_url.startswith("postgres://"):
        supabase_url = supabase_url.replace("postgres://", "postgresql://", 1)
    
    app.config['SQLALCHEMY_DATABASE_URI'] = supabase_url or f'sqlite:///{_DB_PATH}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev_key_123')
    
    # 🛰️ UPLOAD CONFIGURATION
    if os.path.exists('/app'):
        app.config['UPLOAD_FOLDER'] = '/app/uploads/documents'
    else:
        app.config['UPLOAD_FOLDER'] = os.path.join(_BASE_DIR, 'backend', 'static', 'uploads', 'documents')
    os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)
    
    # 🛰️ EMERGENCY SCHEMA REPAIR FUNCTION
    def repair_schema(engine):
        from sqlalchemy import text, inspect
        inspector = inspect(engine)
        try:
            tables = inspector.get_table_names()
        except Exception: return # Engine not ready
        
        with engine.connect() as conn:
            for table in tables:
                try:
                    columns = [c['name'] for c in inspector.get_columns(table)]
                    # 1. Add deleted_at to all tables (Safe and required for SoftDeleteMixin)
                    if 'deleted_at' not in columns:
                        conn.execute(text(f"ALTER TABLE {table} ADD COLUMN deleted_at DATETIME"))
                        conn.commit()
                        print(f"✅ AUTO-REPAIR: Added 'deleted_at' to {table}")
                    
                    # 2. Add meter_number to rooms specifically
                    if table == 'rooms' and 'meter_number' not in columns:
                        conn.execute(text("ALTER TABLE rooms ADD COLUMN meter_number VARCHAR(50)"))
                        conn.commit()
                        print(f"✅ AUTO-REPAIR: Added 'meter_number' to rooms")
                    # 3. Add MoveOutRecord columns
                    if table == 'move_out_records':
                        mo_cols = ['security_deposit_held', 'damage_deduction', 'fine_deduction', 'unpaid_rent', 'refund_amount', 'notes', 'created_at']
                        for col in mo_cols:
                            if col not in columns:
                                col_type = "DATETIME" if col == 'created_at' else ("TEXT" if col == 'notes' else "NUMERIC(10,2)")
                                conn.execute(text(f"ALTER TABLE move_out_records ADD COLUMN {col} {col_type}"))
                                conn.commit()
                                print(f"✅ AUTO-REPAIR: Added {col} to move_out_records")
                except Exception as e:
                    print(f"⚠️ AUTO-REPAIR skipped for {table}: {e}")
                    try: conn.rollback()
                    except: pass
    
    # ─── Production Security ─────────────────────────────────────────────────────
    app.config['SESSION_COOKIE_SECURE'] = True
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)
    CORS(app, resources={r"/api/*": {"origins": ["https://hostel.coolsun.co.uk", "http://localhost:5173", "http://localhost:3000"]}})

    db.init_app(app)

    # 1. Run Repair & Sync
    try:
        with app.app_context():
            repair_schema(db.engine)
            db.create_all()
    except Exception as e:
        print(f"Database setup failed: {e}")

    # 2. Auto-seed default users
    try:
        with app.app_context():
            from sqlalchemy import text, inspect
            inspector = inspect(db.engine)
            queries = []

            # Tenants table checks
            tenant_cols = [c['name'] for c in inspector.get_columns('tenants')]
            if 'agreement_url' not in tenant_cols:
                queries.append("ALTER TABLE tenants ADD COLUMN agreement_url VARCHAR(255)")
                
            with db.engine.connect() as conn:
                for q in queries:
                    try:
                        conn.execute(text(q))
                        conn.commit()
                    except Exception:
                        try: conn.rollback()
                        except: pass

            from backend.models import User
            if not User.query.filter_by(username='admin').first():
                u = User(username='admin', role='Owner')
                u.set_password('Coolsun@23*+')
                db.session.add(u)
                
            if not User.query.filter_by(username='ewardjain@gmail.com').first():
                o = User(username='ewardjain@gmail.com', role='Owner')
                o.set_password('Coolsun@23*+')
                db.session.add(o)
                
            db.session.commit()
    except Exception as e:
        print(f"Auto-seed failed: {e}")
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

    # ─── Debug Routes ──────────────────────────────────────────────────────────
    @app.route('/api/debug/ping')
    def ping():
        db_type = "Supabase (Cloud)" if "supabase" in app.config['SQLALCHEMY_DATABASE_URI'] else "SQLite (Local)"
        return jsonify({"status": "Online", "database": db_type, "version": "1.0.5-DOC-FIX"}), 200

    @app.route('/api/debug/list-uploads')
    def list_uploads():
        import os
        folder = app.config['UPLOAD_FOLDER']
        files = []
        if os.path.exists(folder):
            files = os.listdir(folder)
        return jsonify({"folder": folder, "files": files, "exists": os.path.exists(folder)}), 200

    # ─── Document Serving Route ────────────────────────────────────────────────
    @app.route('/api/docs/<path:filename>')
    def serve_docs(filename):
        return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

    @app.route('/static/uploads/documents/<path:filename>')
    def serve_legacy_docs(filename):
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