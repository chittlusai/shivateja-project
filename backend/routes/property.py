from flask import Blueprint, jsonify, request
from flask_jwt_extended import get_jwt, jwt_required

from models import db
from models.property import Property


property_bp = Blueprint("property", __name__)


def is_admin():
    return get_jwt().get("role") == "ADMIN"


@property_bp.get("/properties")
@jwt_required()
def list_properties():
    properties = Property.query.order_by(Property.name.asc()).all()
    unique_properties = []
    seen_names = set()

    for property_item in properties:
        normalized_name = " ".join(property_item.name.strip().lower().split())
        if normalized_name in seen_names:
            continue
        seen_names.add(normalized_name)
        unique_properties.append(property_item.to_dict())

    return jsonify({"properties": unique_properties})


@property_bp.post("/properties")
@jwt_required()
def create_property():
    if not is_admin():
        return jsonify({"message": "Admin access required"}), 403

    data = request.get_json(silent=True) or {}
    name = (data.get("name") or "").strip()
    address = (data.get("address") or "").strip() or None

    if not name:
        return jsonify({"message": "Property name is required"}), 400

    if Property.query.filter_by(name=name).first():
        return jsonify({"message": "Property already exists"}), 409

    property_item = Property(name=name, address=address)
    db.session.add(property_item)
    db.session.commit()

    return jsonify({"message": "Property created successfully", "property": property_item.to_dict()}), 201
