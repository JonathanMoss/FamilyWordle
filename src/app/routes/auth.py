"""
Authentication routes blueprint.
Handles player registration, login, and logout.
"""
# pylint: disable=too-many-return-statements
from flask import Blueprint, request, jsonify, session
from sqlmodel import Session, select
from src.app import get_engine
from src.app.models import Player, PlayerRole, PlayerStatus
from src.app.services import hash_pin, verify_pin

auth_bp = Blueprint("auth", __name__)

@auth_bp.route("/register", methods=["POST"])
def register():
    """Register a new player account."""
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    pin = data.get("pin", "")

    # Input validation
    if not username:
        return jsonify({
            "error": "Validation failed",
            "details": "Player Name is required"
        }), 400

    if not pin:
        return jsonify({
            "error": "Validation failed",
            "details": "PIN is required"
        }), 400

    if len(pin) != 4:
        return jsonify({
            "error": "Validation failed",
            "details": "PIN must be exactly 4 digits"
        }), 400

    if not pin.isdigit():
        return jsonify({
            "error": "Validation failed",
            "details": "PIN must contain only numeric digits"
        }), 400

    if not username.isalnum() and not all(c in "_-" for c in username if not c.isalnum()):
        return jsonify({
            "error": "Validation failed",
            "details": "Player Name must be alphanumeric"
        }), 400

    engine = get_engine()
    with Session(engine) as db_session:
        # Check if username exists
        stmt = select(Player).where(Player.username == username)
        existing = db_session.exec(stmt).first()
        if existing:
            # Check status of existing player
            if existing.status == PlayerStatus.REMOVED.value:
                # If removed, we can recycle or restore, but we just raise Conflict.
                pass
            return jsonify({"error": "Player Name already registered (User already exists)"}), 409

        hashed = hash_pin(pin)
        player = Player(
            username=username,
            pin_hash=hashed,
            role=PlayerRole.PLAYER.value,
            status=PlayerStatus.ACTIVE.value
        )
        db_session.add(player)
        db_session.commit()

        return jsonify({
            "message": "Player registered successfully",
            "username": player.username
        }), 201

@auth_bp.route("/login", methods=["POST"])
def login():
    """Sign in an existing player using username and PIN."""
    data = request.get_json() or {}
    username = data.get("username", "").strip()
    pin = data.get("pin", "")

    if not username or not pin:
        return jsonify({"error": "Missing credentials"}), 400

    engine = get_engine()
    with Session(engine) as db_session:
        stmt = select(Player).where(Player.username == username)
        player = db_session.exec(stmt).first()

        if not player or player.status == PlayerStatus.REMOVED.value:
            return jsonify({"error": "User does not exist"}), 401

        if player.status == PlayerStatus.DISABLED.value:
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
    """Clear player session to log out."""
    session.clear()
    return jsonify({"message": "Signed out successfully"}), 200
