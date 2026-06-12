import os
import re
from datetime import timedelta

from flask import Flask, send_from_directory
from flask_cors import CORS
from flask_jwt_extended import JWTManager
from dotenv import load_dotenv

from models import db
from models.guest import Guest
from models.property import Property
from models.user import User
from routes.auth import auth_bp
from routes.guest import guest_bp
from routes.property import property_bp
from routes.user import user_bp


def create_app():
    load_dotenv()

    app = Flask(__name__)

    base_dir = os.path.abspath(os.path.dirname(__file__))
    upload_root = os.path.join(base_dir, "uploads")

    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "change-this-secret-key-use-at-least-32-characters")
    app.config["JWT_SECRET_KEY"] = os.getenv(
        "JWT_SECRET_KEY",
        "change-this-jwt-secret-use-at-least-32-characters",
    )
    app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=8)
    app.config["SQLALCHEMY_DATABASE_URI"] = os.getenv(
        "DATABASE_URL",
        f"sqlite:///{os.path.join(base_dir, 'hotel_guest.db')}",
    )
    app.config["SQLALCHEMY_TRACK_MODIFICATIONS"] = False
    app.config["UPLOAD_FOLDER"] = upload_root
    app.config["MAX_CONTENT_LENGTH"] = int(os.getenv("MAX_UPLOAD_MB", "30")) * 1024 * 1024

    frontend_origin = os.getenv("FRONTEND_ORIGIN", "*")
    allowed_origins = "*"
    if frontend_origin != "*":
        allowed_origins = [origin.strip() for origin in frontend_origin.split(",") if origin.strip()]
        allowed_origins.extend(
            [
                re.compile(r"^http://localhost:\d+$"),
                re.compile(r"^http://127\.0\.0\.1:\d+$"),
                re.compile(r"^http://\d{1,3}(\.\d{1,3}){3}:\d+$"),
            ]
        )
    CORS(app, resources={r"/api/*": {"origins": allowed_origins}})
    JWTManager(app)
    db.init_app(app)

    app.register_blueprint(auth_bp, url_prefix="/api")
    app.register_blueprint(guest_bp, url_prefix="/api")
    app.register_blueprint(property_bp, url_prefix="/api")
    app.register_blueprint(user_bp, url_prefix="/api")

    @app.get("/")
    def health_check():
        return {
            "message": "Hotel Guest ID Management backend is running",
            "api": {
                "login": "/api/login",
                "guest_save": "/api/guest",
                "guest_search": "/api/guest/search",
                "manager_list": "/api/users/managers",
                "properties": "/api/properties",
            },
        }

    @app.get("/uploads/<path:filename>")
    def uploaded_file(filename):
        return send_from_directory(upload_root, filename)

    with app.app_context():
        db.create_all()
        upgrade_schema()
        ensure_upload_dirs(upload_root)
        default_property = seed_properties()
        seed_admin(default_property)
        assign_existing_records(default_property)

    return app


def ensure_upload_dirs(upload_root):
    for folder in ("id_front", "id_back", "guest_photo"):
        os.makedirs(os.path.join(upload_root, folder), exist_ok=True)


def upgrade_schema():
    engine_name = db.engine.url.get_backend_name()
    if engine_name.startswith("postgresql"):
        db.session.execute(db.text("ALTER TABLE users ADD COLUMN IF NOT EXISTS property_id INTEGER"))
        db.session.execute(db.text("ALTER TABLE guests ADD COLUMN IF NOT EXISTS property_id INTEGER"))
        db.session.commit()


def seed_properties():
    default_properties = [
        {
            "name": "Hotel Swapna Grand",
            "address": "Dantulurivari St, Bhanugudi Junction, Perrajupeta, Kakinada, Andhra Pradesh 533003",
        },
        {
            "name": "Hotel Mayuri Grand",
            "address": "Srinagar, Kakinada, Andhra Pradesh 533003",
        },
    ]

    for property_data in default_properties:
        property_item = Property.query.filter_by(name=property_data["name"]).first()
        if property_item:
            property_item.address = property_data["address"]
            continue

        db.session.add(Property(**property_data))

    db.session.commit()
    cleanup_property_records()
    return Property.query.filter_by(name=os.getenv("DEFAULT_PROPERTY_NAME", "Hotel Swapna Grand")).first()


def cleanup_property_records():
    aliases = {
        "swapna grand": "Hotel Swapna Grand",
    }

    for property_item in Property.query.all():
        target_name = aliases.get(normalize_property_name(property_item.name))
        if not target_name:
            continue

        target = Property.query.filter_by(name=target_name).first()
        if target and target.id != property_item.id:
            reassign_property(property_item.id, target.id)
            db.session.delete(property_item)
        else:
            property_item.name = target_name

    db.session.commit()

    seen = {}
    for property_item in Property.query.order_by(Property.id.asc()).all():
        normalized_name = normalize_property_name(property_item.name)
        if normalized_name not in seen:
            seen[normalized_name] = property_item
            continue

        reassign_property(property_item.id, seen[normalized_name].id)
        db.session.delete(property_item)

    db.session.commit()


def normalize_property_name(name):
    return " ".join((name or "").strip().lower().split())


def reassign_property(old_property_id, new_property_id):
    User.query.filter_by(property_id=old_property_id).update({"property_id": new_property_id})
    Guest.query.filter_by(property_id=old_property_id).update({"property_id": new_property_id})


def seed_admin(default_property):
    if User.query.filter_by(username="admin").first():
        return

    admin = User(username="admin", role="ADMIN", property_id=default_property.id)
    admin.set_password(os.getenv("DEFAULT_ADMIN_PASSWORD", "123456"))
    db.session.add(admin)
    db.session.commit()


def assign_existing_records(default_property):
    User.query.filter(User.property_id.is_(None)).update({"property_id": default_property.id})
    Guest.query.filter(Guest.property_id.is_(None)).update({"property_id": default_property.id})
    db.session.commit()


app = create_app()

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.getenv("PORT", 5000)), debug=True, use_reloader=False)
