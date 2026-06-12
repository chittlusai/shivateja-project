from datetime import datetime

from models import db


class Guest(db.Model):
    __tablename__ = "guests"

    id = db.Column(db.Integer, primary_key=True)
    guest_name = db.Column(db.String(150), nullable=False, index=True)
    mobile = db.Column(db.String(30), nullable=False, index=True)
    address = db.Column(db.Text, nullable=False)
    room_number = db.Column(db.String(30), nullable=False, index=True)
    id_type = db.Column(db.String(50), nullable=False)
    id_number = db.Column(db.String(80), nullable=False)
    front_image = db.Column(db.String(255), nullable=False)
    back_image = db.Column(db.String(255), nullable=True)
    guest_photo = db.Column(db.String(255), nullable=True)
    checkin_date = db.Column(db.Date, nullable=False, index=True)
    status = db.Column(db.String(30), nullable=False, default="CHECKED_IN")
    created_by = db.Column(db.Integer, db.ForeignKey("users.id"), nullable=False)
    property_id = db.Column(db.Integer, db.ForeignKey("properties.id"), nullable=False, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    creator = db.relationship("User", backref="guests")
    property = db.relationship("Property", backref="guests")

    def to_dict(self):
        return {
            "id": self.id,
            "guest_name": self.guest_name,
            "mobile": self.mobile,
            "address": self.address,
            "room_number": self.room_number,
            "id_type": self.id_type,
            "id_number": self.id_number,
            "front_image": self.front_image,
            "back_image": self.back_image,
            "guest_photo": self.guest_photo,
            "checkin_date": self.checkin_date.isoformat(),
            "status": self.status,
            "created_by": self.created_by,
            "property_id": self.property_id,
            "property": self.property.to_dict() if self.property else None,
            "created_at": self.created_at.isoformat(),
        }
