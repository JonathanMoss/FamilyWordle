from flask import Blueprint, request, jsonify, session
from sqlmodel import Session, select
from src.app import get_engine
from src.app.models import Player
from src.app.services import hash_pin, verify_pin

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    pin = data.get("pin", "")
    
    # Input validation
    if not username:
        return jsonify({"error": "Validation failed", "details": "Player Name is required"}), 400
        
    if not pin:
        return jsonify({"error": "Validation failed", "details": "PIN is required"}), 400
        
    if len(pin) != 4:
        return jsonify({"error": "Validation failed", "details": "PIN must be exactly 4 digits"}), 400
        
    if not pin.isdigit():
        return jsonify({"error": "Validation failed", "details": "PIN must contain only numeric digits"}), 400
        
    if not username.isalnum() and not all(c in "_-" for c in username if not c.isalnum()):
        return jsonify({"error": "Validation failed", "details": "Player Name must be alphanumeric"}), 400
        
    engine = get_engine()
    with Session(engine) as db_session:
        # Check if username exists
        stmt = select(Player).where(Player.username == username)
        existing = db_session.exec(stmt).first()
        if existing:
            # Check status of existing player
            if existing.status == "removed":
                # If removed, we can recycle the name by restoring or creating a new record
                # But to keep it simple, we just raise Conflict if name is actively registered.
                # However, the BDD features say: "Registration fails when player name is already registered"
                pass
            return jsonify({"error": "Player Name already registered (User already exists)"}), 409
            
        hashed = hash_pin(pin)
        player = Player(
            username=username,
            pin_hash=hashed,
            role="player",
            status="active"
        )
        db_session.add(player)
        db_session.commit()
        
        return jsonify({
            "message": "Player registered successfully",
            "username": player.username
        }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    pin = data.get("pin", "")
    
    if not username or not pin:
        return jsonify({"error": "Missing credentials"}), 400
        
    engine = get_engine()
    with Session(engine) as db_session:
        stmt = select(Player).where(Player.username == username)
        player = db_session.exec(stmt).first()
        
        if not player or player.status == "removed":
            return jsonify({"error": "User does not exist"}), 401
            
        if player.status == "disabled":
            return jsonify({"error": "Account disabled"}), 401
            
        if not verify_pin(pin, player.pin_hash):
            return jsonify({"error": "Incorrect PIN"}), 401
            
        # Store in session
        session["user_id"] = player.id
        session["username"] = player.username
        session["role"] = player.role
        
        return jsonify({
            "message": "Signed in successfully",
            "username": player.username,
            "role": player.role
        }), 200

@auth_bp.route("/logout", methods=["POST"])
def logout():
    session.clear()
    return jsonify({"message": "Signed out successfully"}), 200
