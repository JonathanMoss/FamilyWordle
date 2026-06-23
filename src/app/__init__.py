import os
from typing import Optional
import click
from flask import Flask, render_template, session
from sqlmodel import SQLModel, create_engine, Session, select
from src.app.models import Player
from src.app.services import hash_pin

# SQLModel DB engine
db_engine = None

def get_engine(db_uri: Optional[str] = None):
    global db_engine
    if db_engine is None:
        if db_uri is None:
            db_dir = os.path.abspath("data")
            os.makedirs(db_dir, exist_ok=True)
            db_uri = f"sqlite:///{os.path.join(db_dir, 'database.sqlite')}"
            
        # SQLite needs check_same_thread=False for multithreading in Flask
        connect_args = {}
        poolclass = None
        if db_uri.startswith("sqlite"):
            connect_args = {"check_same_thread": False}
            if ":memory:" in db_uri:
                from sqlalchemy.pool import StaticPool
                poolclass = StaticPool
            
        db_engine = create_engine(db_uri, connect_args=connect_args, poolclass=poolclass)
    return db_engine

def create_app(db_uri: Optional[str] = None) -> Flask:
    app = Flask(__name__, template_folder="templates", static_folder="static")
    
    # Configure secrets
    app.config["SECRET_KEY"] = os.getenv("SECRET_KEY", "dev-secret-key-12345")
    
    # Configure database engine
    engine = get_engine(db_uri)
    
    # Create database tables
    SQLModel.metadata.create_all(engine)
    
    # Auto-seed default admin if configured in environment
    admin_username = os.getenv("ADMIN_USERNAME")
    admin_pin = os.getenv("ADMIN_PIN")
    if admin_username and admin_pin:
        if admin_pin.isdigit() and len(admin_pin) == 4:
            with Session(engine) as db_session:
                stmt = select(Player).where(Player.username == admin_username)
                existing = db_session.exec(stmt).first()
                if not existing:
                    hashed = hash_pin(admin_pin)
                    admin_user = Player(
                        username=admin_username,
                        pin_hash=hashed,
                        role="admin",
                        status="active"
                    )
                    db_session.add(admin_user)
                    db_session.commit()
                    app.logger.info("Auto-seeded admin user '%s'", admin_username)
        else:
            app.logger.warning("ADMIN_PIN must be exactly 4 digits; admin auto-seeding skipped.")

    
    # Register blueprints
    from src.app.routes.auth import auth_bp
    from src.app.routes.game import game_bp
    from src.app.routes.admin import admin_bp
    
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(game_bp, url_prefix="/api")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    
    # Root route - renders frontend SPA index
    @app.route("/")
    def index():
        return render_template("index.html")
        
    # Context processor to expose logged-in player
    @app.context_processor
    def inject_user():
        return dict(
            current_username=session.get("username"),
            current_role=session.get("role")
        )

    # CLI command: bootstrapping admin users
    @app.cli.command("create-admin")
    @click.argument("username")
    @click.argument("pin")
    def create_admin_command(username, pin):
        """Bootstrap an administrative user account via the CLI."""
        if not pin.isdigit() or len(pin) != 4:
            click.echo("❌ Error: PIN must be exactly 4 digits.")
            return
            
        with Session(engine) as db_session:
            # Check if player exists
            stmt = select(Player).where(Player.username == username)
            existing = db_session.exec(stmt).first()
            if existing:
                click.echo(f"❌ Error: Player '{username}' already exists.")
                return
                
            hashed = hash_pin(pin)
            admin_user = Player(
                username=username,
                pin_hash=hashed,
                role="admin",
                status="active"
            )
            db_session.add(admin_user)
            db_session.commit()
            click.echo(f"👑 Admin user '{username}' successfully bootstrapped!")
            
    return app
