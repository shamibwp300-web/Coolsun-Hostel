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
    
    # ─── Production Security ─────────────────────────────────────────────────────
    app.config['SESSION_COOKIE_SECURE'] = True
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    
    # ─── Cloudflare Proxy Fix ───────────────────────────────────────────────────
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

    # ─── CORS ───────────────────────────────────────────────────────────────────
    # Local development aur Live site dono ke liye allow kiya hai
    CORS(app, resources={r"/api/*": {"origins": ["https://hostel.coolsun.co.uk", "http://localhost:5173", "http://localhost:3000"]}})

    db.init_app(app)

    # Auto-create tables and Seed default users on startup
    with app.app_context():
        is_prod = "supabase" in app.config['SQLALCHEMY_DATABASE_URI'].lower()
        
        # 🛡️ Structural Guard: Auto-create and migration only for SQLite by default
        if not is_prod or os.getenv('ALLOW_MIGRATIONS_IN_PROD') == 'TRUE':
            db.create_all()
        
        # --- Auto Schema Migration (Lock) ---
        from sqlalchemy import text, inspect
        inspector = inspect(db.engine)
        queries = [
            "ALTER TABLE floors ADD COLUMN IF NOT EXISTS is_bulk_rented BOOLEAN DEFAULT FALSE",
            "ALTER TABLE floors ADD COLUMN IF NOT EXISTS bulk_tenant_id INTEGER",
            "ALTER TABLE floors ADD COLUMN IF NOT EXISTS bulk_rent_amount NUMERIC(10, 2)",
            "ALTER TABLE floors ADD COLUMN IF NOT EXISTS bulk_security_deposit NUMERIC(10, 2)",
            "ALTER TABLE floors ADD COLUMN IF NOT EXISTS max_bulk_capacity INTEGER DEFAULT 30",
            "ALTER TABLE rooms ADD COLUMN IF NOT EXISTS floor_id INTEGER",
            "ALTER TABLE rooms ADD COLUMN IF NOT EXISTS is_bulk_rented BOOLEAN DEFAULT FALSE",
            "ALTER TABLE rooms ADD COLUMN IF NOT EXISTS base_rent NUMERIC(10, 2)",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS parent_tenant_id INTEGER",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS internet_opt_in BOOLEAN DEFAULT FALSE",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS tenancy_type VARCHAR(50)",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS emergency_contact VARCHAR(50)",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS is_partial_payment BOOLEAN DEFAULT FALSE",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS compliance_alert BOOLEAN DEFAULT FALSE",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS bed_label VARCHAR(20)",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS father_name VARCHAR(100)",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS permanent_address VARCHAR(255)",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS police_station VARCHAR(100)",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS id_card_front_url VARCHAR(255)",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS id_card_back_url VARCHAR(255)",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS police_form_url VARCHAR(255)",
            "ALTER TABLE tenants ADD COLUMN IF NOT EXISTS police_form_submitted TIMESTAMP",
        ]
        
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
                    try:
                        conn.rollback()
                    except:
                        pass
        # ------------------------------------
        
        # ─── AUTO DATA REPAIR (Floor Linkage Fix) ───
        try:
            from backend.models import Floor, Room
            # Ensure Standard Floors Exist
            floor_defs = [(0, "Ground Floor"), (1, "First Floor"), (2, "Second Floor"), (3, "Third Floor")]
            f_map = {}
            for n, nm in floor_defs:
                f = Floor.query.filter_by(floor_number=n).first()
                if not f:
                    f = Floor(floor_number=n, name=nm)
                    db.session.add(f)
                    db.session.flush()
                f_map[n] = f.id
            
            # Link all Rooms to Floor IDs if missing
            rooms_to_fix = Room.query.filter((Room.floor_id == None)).all()
            for r in rooms_to_fix:
                if r.floor in f_map:
                    r.floor_id = f_map[r.floor]
            
            db.session.commit()
            print("✅ AUTO-REPAIR: Floor Linkage Synchronized.")
        except Exception as e:
            print(f"⚠️ Auto-Repair Warning: {str(e)}")
            db.session.rollback()
        # ------------------------------------
        
        from backend.models import User
        
        # 1. Default Admin
        if not User.query.filter_by(username='admin').first():
            u = User(username='admin', role='Owner')
            u.set_password('admin123')
            db.session.add(u)
            print("🚀 AUTO-SEED: Admin User (admin/admin123) Created.")
            
        # 2. Default Owner
        if not User.query.filter_by(username='ewardjain@gmail.com').first():
            o = User(username='ewardjain@gmail.com', role='Owner')
            o.set_password('Coolsun@23*+')
            db.session.add(o)
            print("🚀 AUTO-SEED: Owner User (ewardjain@gmail.com) Created.")
            
        db.session.commit()

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
        return jsonify({"status": "Online", "database": db_type}), 200

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