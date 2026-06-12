import os
from datetime import datetime
from uuid import uuid4

from flask import Blueprint, current_app, jsonify, request
from flask_jwt_extended import get_jwt, get_jwt_identity, jwt_required
from werkzeug.utils import secure_filename

from models import db
from models.guest import Guest
from models.property import Property
from models.user import User


guest_bp = Blueprint("guest", __name__)

ALLOWED_EXTENSIONS = {"jpg", "jpeg", "png"}
REQUIRED_FIELDS = (
    "guest_name",
    "mobile",
    "address",
    "room_number",
    "id_type",
    "id_number",
    "checkin_date",
)


@guest_bp.post("/guest")
@jwt_required()
def create_guest():
    user = User.query.get(int(get_jwt_identity()))
    if not user:
        return jsonify({"message": "User not found"}), 401

    missing = [field for field in REQUIRED_FIELDS if not request.form.get(field)]
    if "front_image" not in request.files:
        missing.append("front_image")

    property_id = resolve_property_id(user, request.form.get("property_id"))
    if not property_id:
        missing.append("property_id")

    if missing:
        return jsonify({"message": "Missing required fields", "fields": missing}), 400

    try:
        checkin_date = datetime.strptime(request.form["checkin_date"], "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"message": "checkin_date must be YYYY-MM-DD"}), 400

    front_image = save_upload("front_image", "id_front")
    if not front_image:
        return jsonify({"message": "Front ID image must be jpg, jpeg, or png"}), 400

    back_image = save_upload("back_image", "id_back", required=False)
    guest_photo = save_upload("guest_photo", "guest_photo", required=False)

    guest = Guest(
        guest_name=request.form["guest_name"].strip(),
        mobile=request.form["mobile"].strip(),
        address=request.form["address"].strip(),
        room_number=request.form["room_number"].strip(),
        id_type=request.form["id_type"].strip(),
        id_number=request.form["id_number"].strip(),
        front_image=front_image,
        back_image=back_image,
        guest_photo=guest_photo,
        checkin_date=checkin_date,
        created_by=user.id,
        property_id=property_id,
    )

    db.session.add(guest)
    db.session.commit()

    return jsonify({"message": "Guest saved successfully", "guest": guest.to_dict()}), 201


@guest_bp.get("/guest/search")
@jwt_required()
def search_guests():
    query = Guest.query
    claims = get_jwt()

    name = request.args.get("name", "").strip()
    mobile = request.args.get("mobile", "").strip()
    room_number = request.args.get("room_number", "").strip()
    date = request.args.get("date", "").strip()
    property_id = request.args.get("property_id", "").strip()

    if claims.get("role") == "ADMIN":
        if property_id:
            try:
                query = query.filter(Guest.property_id == int(property_id))
            except ValueError:
                return jsonify({"message": "property_id must be a number"}), 400
    else:
        query = query.filter(Guest.property_id == claims.get("property_id"))

    if name:
        query = query.filter(Guest.guest_name.ilike(f"%{name}%"))
    if mobile:
        query = query.filter(Guest.mobile.ilike(f"%{mobile}%"))
    if room_number:
        query = query.filter(Guest.room_number.ilike(f"%{room_number}%"))
    if date:
        try:
            checkin_date = datetime.strptime(date, "%Y-%m-%d").date()
        except ValueError:
            return jsonify({"message": "date must be YYYY-MM-DD"}), 400
        query = query.filter(Guest.checkin_date == checkin_date)

    guests = query.order_by(Guest.created_at.desc()).limit(100).all()
    return jsonify({"guests": [guest.to_dict() for guest in guests]})


@guest_bp.get("/guest/<int:guest_id>")
@jwt_required()
def get_guest(guest_id):
    guest = Guest.query.get_or_404(guest_id)
    claims = get_jwt()
    if claims.get("role") != "ADMIN" and guest.property_id != claims.get("property_id"):
        return jsonify({"message": "You do not have access to this guest record"}), 403
    return jsonify({"guest": guest.to_dict()})


def resolve_property_id(user, requested_property_id):
    if user.role == "ADMIN":
        if not requested_property_id:
            return None
        try:
            requested_property_id = int(requested_property_id)
        except ValueError:
            return None
        property_item = Property.query.get(requested_property_id)
        return property_item.id if property_item else None

    return user.property_id


def save_upload(field_name, folder, required=True):
    file = request.files.get(field_name)
    if not file or not file.filename:
        return None if not required else ""

    if not allowed_file(file.filename):
        return ""

    extension = file.filename.rsplit(".", 1)[1].lower()
    filename = secure_filename(f"{uuid4().hex}_{field_name}.{extension}")
    relative_path = os.path.join(folder, filename).replace("\\", "/")
    absolute_dir = os.path.join(current_app.config["UPLOAD_FOLDER"], folder)
    os.makedirs(absolute_dir, exist_ok=True)
    file.save(os.path.join(absolute_dir, filename))
    return relative_path


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@guest_bp.post("/guest/extract-id")
@jwt_required()
def extract_id():
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        return jsonify({"message": "Gemini API key is not configured in the backend .env file."}), 501

    if "front_image" not in request.files:
        return jsonify({"message": "No front_image file provided"}), 400

    file = request.files["front_image"]
    if not file or not file.filename:
        return jsonify({"message": "Invalid file upload"}), 400

    if not allowed_file(file.filename):
        return jsonify({"message": "File type not allowed. Must be jpg, jpeg, or png."}), 400

    try:
        import google.generativeai as genai
        import json

        genai.configure(api_key=api_key)

        file_bytes = file.read()
        extension = file.filename.rsplit(".", 1)[1].lower()
        mime_type = "image/png" if extension == "png" else "image/jpeg"

        image_part = {
            "mime_type": mime_type,
            "data": file_bytes
        }

        prompt = """
        You are an assistant for a hotel reception desk. Analyze the uploaded ID card image.
        This could be the FRONT or BACK side of an Aadhaar card, Driving License, Passport, or Voter ID.
        
        Extract the following details as a JSON object:
        - guest_name: The full name of the guest. Look for names in English or Hindi. If not visible, set to empty string.
        - id_number: The identification number (Aadhaar 12-digit number, DL number, Passport number, Voter ID EPIC number). Format nicely. If not visible, set to empty string.
        - address: The full address of the guest. On Aadhaar cards, the address is usually on the BACK side and starts after "Address:" or "पता:". Extract the complete address including village/town, district, state, and pincode. If not visible, set to empty string.
        - id_type: The type of ID. Must be one of: "Aadhaar", "Driving License", "Passport", "Voter ID". If unclear, set to "Aadhaar".
        
        IMPORTANT: Extract ALL visible text fields. Even partial information is useful.
        Return ONLY a JSON object matching this schema. Do not wrap it in markdown.
        """

        model = genai.GenerativeModel('gemini-2.5-flash')
        response = model.generate_content(
            [image_part, prompt],
            generation_config={"response_mime_type": "application/json"}
        )

        data = json.loads(response.text)

        result = {
            "guest_name": data.get("guest_name", "").strip(),
            "id_number": data.get("id_number", "").strip(),
            "address": data.get("address", "").strip(),
            "id_type": data.get("id_type", "Aadhaar")
        }

        return jsonify(result), 200

    except Exception as e:
        current_app.logger.error(f"Error in extract_id: {str(e)}")
        return jsonify({"message": f"Failed to extract details: {str(e)}"}), 500

