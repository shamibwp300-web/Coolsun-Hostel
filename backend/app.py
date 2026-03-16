def create_app():
    # Frontend dist folder ka rasta
    _FRONTEND_DIST = os.path.abspath(os.path.join(_BASE_DIR, 'frontend', 'dist'))
    app = Flask(__name__, static_folder=_FRONTEND_DIST, static_url_path='/')
    
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{_DB_PATH}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SECRET_KEY'] = 'dev_key'
    
    # Production Security
    app.config['SESSION_COOKIE_SECURE'] = True
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    
    # Proxy Fix (Cloudflare/Nginx ke liye)
    app.wsgi_app = ProxyFix(app.wsgi_app, x_proto=1, x_host=1)

    # CORS
    CORS(app, resources={r"/api/*": {"origins": "https://hostel.coolsun.co.uk"}})

    db.init_app(app)

    # ✅ FIXED: Database tables banane ka mehfooz tareeqa
    with app.app_context():
        try:
            db.create_all()
        except Exception:
            # Agar table pehle se hai toh error ko ignore karein
            pass

    # Register Blueprints (Aap ke purane blueprints)
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

    @app.route('/api/debug/ping')
    def ping():
        return "pong", 200

    @app.route('/', defaults={'path': ''})
    @app.route('/<path:path>')
    def catch_all(path):
        full_path = os.path.join(app.static_folder, path)
        if path != "" and os.path.exists(full_path):
            return send_from_directory(app.static_folder, path)
        return send_from_directory(app.static_folder, 'index.html')

    return app
