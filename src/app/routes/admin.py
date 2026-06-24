"""
Admin routes blueprint.
Handles managing player lists, status updates, and soft removal.
"""
# pylint: disable=too-many-return-statements
from flask import Blueprint, request, jsonify, session
from sqlmodel import Session, select
from src.app import get_engine
from src.app.models import Player, PlayerRole, PlayerStatus

admin_bp = Blueprint("admin", __name__)

def require_admin():
    """Verify the signed-in user is an administrator."""
    if session.get("role") != PlayerRole.ADMIN.value:
        return False
    return True

@admin_bp.route("/players", methods=["GET"])
def list_players():
    """List all registered and active/disabled players (excluding removed)."""

    if not require_admin():
        return jsonify({"error": "Access denied", "details": "Administrator access required"}), 403

    engine = get_engine()
    with Session(engine) as db_session:
        # Fetch active and disabled players (exclude removed status)

        stmt = select(Player).where(Player.status != PlayerStatus.REMOVED.value)
        players = db_session.exec(stmt).all()

        result = [
            {
                "id": p.id,
                "username": p.username,
                "role": p.role,
                "status": p.status
            }
            for p in players
        ]
        return jsonify({"players": result}), 200

@admin_bp.route("/players/<username>", methods=["PUT"])
def update_player(username):
    """Update a player's username, status, or role."""
    if not require_admin():
        return jsonify({"error": "Access denied"}), 403

    data = request.get_json() or {}
    new_status = data.get("status")
    new_role = data.get("role")
    new_username = data.get("username")

    engine = get_engine()
    with Session(engine) as db_session:
        stmt = select(Player).where(Player.username == username)
        player = db_session.exec(stmt).first()

        if not player or player.status == PlayerStatus.REMOVED.value:
            return jsonify({"error": "Player not found"}), 404

        if new_username is not None:
            new_username = new_username.strip()
            if not new_username or len(new_username) > 10:
                return jsonify({"error": "Invalid username"}), 400
            # Check duplicate
            stmt_dup = select(Player).where(Player.username == new_username)
            if db_session.exec(stmt_dup).first():
                return jsonify({"error": "Username already exists"}), 409
            player.username = new_username

        if new_status:
            if new_status not in [
                PlayerStatus.ACTIVE.value,
                PlayerStatus.DISABLED.value,
                PlayerStatus.REMOVED.value,
            ]:
                return jsonify({"error": "Invalid status"}), 400
            player.status = new_status

        if new_role:
            if new_role not in [PlayerRole.PLAYER.value, PlayerRole.ADMIN.value]:
                return jsonify({"error": "Invalid role"}), 400
            player.role = new_role

        db_session.add(player)
        db_session.commit()

        return jsonify({"message": "Player updated successfully"}), 200

@admin_bp.route("/players/<username>", methods=["DELETE"])
def remove_player(username):
    """Soft remove a player by setting status to removed."""
    if not require_admin():
        return jsonify({"error": "Access denied"}), 403

    engine = get_engine()
    with Session(engine) as db_session:
        stmt = select(Player).where(Player.username == username)
        player = db_session.exec(stmt).first()

        if not player or player.status == PlayerStatus.REMOVED.value:
            return jsonify({"error": "Player not found"}), 404

        player.status = PlayerStatus.REMOVED.value
        db_session.add(player)
        db_session.commit()

        return jsonify({"message": "Player removed successfully"}), 200
