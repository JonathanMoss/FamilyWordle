import os
import pytest
from sqlmodel import SQLModel, Session, select
from src.app import create_app, get_engine
from src.app.models import Player
from src.app.services import hash_pin

@pytest.fixture(name="app")
def app_fixture():
    # Use an in-memory SQLite database for testing
    db_uri = "sqlite:///:memory:"
    app = create_app(db_uri)
    app.config.update({
        "TESTING": True,
        "DEBUG": False,
        # Flask needs a static secret key for testing session cookies
        "SECRET_KEY": "test-secret-key"
    })
    
    # Yield app context
    with app.app_context():
        yield app
        
    # Reset db_engine global to avoid database caching across tests
    import src.app as app_module
    app_module.db_engine = None

@pytest.fixture(name="client")
def client_fixture(app):
    return app.test_client()

@pytest.fixture(name="db_session")
def db_session_fixture(app):
    engine = get_engine()
    with Session(engine) as session:
        yield session

@pytest.fixture(autouse=True)
def mock_permitted_words(monkeypatch):
    """Mock the dictionary words to keep tests predictable."""
    import src.app.services as services
    monkeypatch.setattr(services, "load_permitted_words", lambda *args: [
        "CRANE", "SLATE", "REACT", "STARE", "LIGHT", "TIGER", "HOUSE", "LEARN"
    ])
