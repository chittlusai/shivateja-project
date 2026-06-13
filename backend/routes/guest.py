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
    if "front_image" not in request.files:
        return jsonify({"message": "No front_image file provided"}), 400

    file = request.files["front_image"]
    if not file or not file.filename:
        return jsonify({"message": "Invalid file upload"}), 400

    if not allowed_file(file.filename):
        return jsonify({"message": "File type not allowed. Must be jpg, jpeg, or png."}), 400

    try:
        import requests
        import re

        file_bytes = file.read()
        
        # Call OCR.space completely free API
        response = requests.post(
            "https://api.ocr.space/parse/image",
            data={"apikey": "helloworld", "language": "eng", "isOverlayRequired": False},
            files={"image": (file.filename, file_bytes, "image/jpeg")}
        )
        
        if response.status_code != 200:
            return jsonify({"message": "Failed to connect to free OCR service"}), 500
            
        result = response.json()
        if result.get("IsErroredOnProcessing"):
            return jsonify({"message": result.get("ErrorMessage", ["Image processing error"])[0]}), 500
            
        parsed_results = result.get("ParsedResults", [])
        if not parsed_results:
            return jsonify({"message": "No readable text found in image"}), 400
            
        text = parsed_results[0].get("ParsedText", "")
        text_upper = text.upper()
        
        data = {
            "guest_name": "",
            "id_number": "",
            "address": "",
            "id_type": "Aadhaar"
        }
        
        # ID Type Detection
        if "ELECTION COMMISSION" in text_upper or "ELECTOR" in text_upper:
            data["id_type"] = "Voter ID"
        elif "DRIVING LICENCE" in text_upper or "TRANSPORT" in text_upper:
            data["id_type"] = "Driving License"
        elif "PASSPORT" in text_upper or "REPUBLIC OF INDIA" in text_upper:
            data["id_type"] = "Passport"
        else:
            data["id_type"] = "Aadhaar"
            
        # ID Number Extraction
        if data["id_type"] == "Aadhaar":
            match = re.search(r'\b\d{4}\s?\d{4}\s?\d{4}\b', text)
            if match:
                raw_num = match.group(0).replace(" ", "")
                data["id_number"] = f"{raw_num[:4]} {raw_num[4:8]} {raw_num[8:]}"
        elif data["id_type"] == "Voter ID":
            match = re.search(r'\b[A-Z]{3}[0-9]{7}\b', text_upper)
            if match: data["id_number"] = match.group(0)
        elif data["id_type"] == "Driving License":
            match = re.search(r'\b[A-Z]{2}[0-9]{2}[A-Z0-9\s-]{11,14}\b', text_upper)
            if match: data["id_number"] = match.group(0)
        elif data["id_type"] == "Passport":
            match = re.search(r'\b[A-Z][0-9]{7}\b', text_upper)
            if match: data["id_number"] = match.group(0)
            
        # Address Extraction
        addr_match = re.search(r'(?:ADDRESS|ADD|Add\.|Address:)\s*(.*?)(?:\n\n|\r\n\r\n|$)', text, re.IGNORECASE | re.DOTALL)
        if addr_match:
            addr = addr_match.group(1).replace('\r', '').replace('\n', ' ').strip()
            data["address"] = re.sub(r'\s+', ' ', addr)
            
        # Name Extraction Heuristics
        name_match = None
        if data["id_type"] == "Voter ID":
            name_match = re.search(r"Name[:\-\s]+([A-Za-z\s]{3,40})(?:\n|\r|Father|Husband)", text, re.IGNORECASE)
        elif data["id_type"] == "Driving License":
            name_match = re.search(r"Name[:\-\s]+([A-Za-z\s]{3,40})(?:\n|\r|S/D/W)", text, re.IGNORECASE)
        elif data["id_type"] == "Passport":
            surname_match = re.search(r"Surname[\s\n\r:]+([A-Za-z\s]+)", text, re.IGNORECASE)
            given_match = re.search(r"Given Name\(s\)[\s\n\r:]+([A-Za-z\s]+)", text, re.IGNORECASE)
            if surname_match and given_match:
                data["guest_name"] = f"{given_match.group(1).strip()} {surname_match.group(1).strip()}"
        
        # Fallback for Aadhaar or if above failed
        if not data["guest_name"]:
            if name_match:
                data["guest_name"] = name_match.group(1).strip()
            else:
                lines = [line.strip() for line in text.split('\n') if len(line.strip()) > 2]
                for i, line in enumerate(lines):
                    if "DOB" in line.upper() or "YOB" in line.upper() or "YEAR OF BIRTH" in line.upper():
                        if i > 0:
                            potential_name = lines[i-1]
                            clean_name = re.sub(r'[^A-Za-z\s]', '', potential_name).strip()
                            if len(clean_name) > 2 and clean_name.upper() not in ["INDIA", "GOVERNMENT OF INDIA", "MERA AADHAAR"]:
                                data["guest_name"] = clean_name
                                break

        # Name is hard to extract with just Regex reliably, so we provide best-effort for ID and Address.

        print("===== OCR TEXT =====")
        print(text)
        print("===== EXTRACTED DATA =====")
        print(data)

        return jsonify(data), 200

    except Exception as e:
        current_app.logger.error(f"Error in extract_id: {str(e)}")
        return jsonify({"message": f"Failed to extract details: {str(e)}"}), 500

