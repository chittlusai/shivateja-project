from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, jwt_required

from models import db
from models.property import Property
from models.user import User


user_bp = Blueprint("user", __name__)


def require_admin():
    claims = get_jwt()
    return claims.get("role") == "ADMIN"


@user_bp.get("/users/managers")
@jwt_required()
def list_managers():
    if not require_admin():
        return jsonify({"message": "Admin access required"}), 403

    managers = User.query.filter_by(role="MANAGER").order_by(User.created_at.desc()).all()
    return jsonify({"managers": [manager.to_dict() for manager in managers]})


@user_bp.post("/users/managers")
@jwt_required()
def create_manager():
    if not require_admin():
        return jsonify({"message": "Admin access required"}), 403

    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""
    property_id = data.get("property_id")

    if not username or not password or not property_id:
        return jsonify({"message": "Username, password, and property are required"}), 400

    if len(password) < 6:
        return jsonify({"message": "Password must be at least 6 characters"}), 400

    if User.query.filter_by(username=username).first():
        return jsonify({"message": "Username already exists"}), 409

    property_item = Property.query.get(property_id)
    if not property_item:
        return jsonify({"message": "Selected property does not exist"}), 400

    manager = User(username=username, role="MANAGER", property_id=property_item.id)
    manager.set_password(password)
    db.session.add(manager)
    db.session.commit()

    return jsonify({"message": "Manager created successfully", "manager": manager.to_dict()}), 201
