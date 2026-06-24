"""
Authentication and authorization decorators for Flask routes.
"""
from functools import wraps
from flask import session, jsonify
from sqlmodel import Session
from src.app import get_engine
from src.app.models import Player, PlayerStatus, PlayerRole

def login_required(f):
    """
    Decorator to ensure a user is logged in and their account is active.
    Clears session and returns 401 if account is disabled/removed.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get("user_id")
        if not user_id:
            return jsonify({"error": "Authentication required"}), 401

        engine = get_engine()
        with Session(engine) as db_session:
            player = db_session.get(Player, user_id)
            if not player or player.status != PlayerStatus.ACTIVE.value:
                session.clear()
                return jsonify({"error": "Account inactive"}), 401
        return f(*args, **kwargs)
    return decorated_function

def admin_required(f):
    """
    Decorator to ensure the logged-in user is an active administrator.
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        user_id = session.get("user_id")
        role = session.get("role")
        if not user_id or role != PlayerRole.ADMIN.value:
            return jsonify({
                "error": "Access denied",
                "details": "Administrator access required"
            }), 403

        engine = get_engine()
        with Session(engine) as db_session:
            player = db_session.get(Player, user_id)
            if not player or player.status != PlayerStatus.ACTIVE.value:
                session.clear()
                return jsonify({"error": "Account inactive"}), 401
        return f(*args, **kwargs)
    return decorated_function
