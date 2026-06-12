from datetime import datetime

from werkzeug.security import check_password_hash, generate_password_hash

from models import db


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    password_hash = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(30), nullable=False, default="MANAGER")
    property_id = db.Column(db.Integer, db.ForeignKey("properties.id"), nullable=True, index=True)
    created_at = db.Column(db.DateTime, nullable=False, default=datetime.utcnow)

    property = db.relationship("Property", backref="users")

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_dict(self):
        return {
            "id": self.id,
            "username": self.username,
            "role": self.role,
            "property_id": self.property_id,
            "property": self.property.to_dict() if self.property else None,
            "created_at": self.created_at.isoformat(),
        }
