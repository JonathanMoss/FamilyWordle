# pylint: disable=missing-docstring,redefined-outer-name,unused-argument,import-outside-toplevel,consider-using-from-import
import pytest
from sqlmodel import Session
from src.app import create_app, get_engine

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

    # Reset DB_ENGINE and dispose engine to avoid caching and unclosed connection warnings
    import src.app as app_module
    if app_module.DB_ENGINE:
        app_module.DB_ENGINE.dispose()
    app_module.DB_ENGINE = None

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
    services._permitted_words_set = None  # pylint: disable=protected-access
    monkeypatch.setattr(services, "load_permitted_words", lambda *args: [
        "CRANE", "SLATE", "REACT", "STARE", "LIGHT", "TIGER", "HOUSE", "LEARN"
    ])
