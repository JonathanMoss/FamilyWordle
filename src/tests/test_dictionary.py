# pylint: disable=missing-docstring
import pytest

def test_get_dictionary(client):
    """Verify that /api/game/dictionary returns the permitted words list."""
    response = client.get("/api/game/dictionary")
    assert response.status_code == 200
    
    data = response.get_json()
    assert "words" in data
    assert isinstance(data["words"], list)
    
    # In testing, conftest.py mocks load_permitted_words to return 8 specific words
    expected_words = ["CRANE", "SLATE", "REACT", "STARE", "LIGHT", "TIGER", "HOUSE", "LEARN"]
    assert data["words"] == expected_words

def test_demo_reset_invalid_date_format(client):
    """Verify that resetting the demo with an invalid date format returns 400 Bad Request."""
    response = client.post("/api/game/demo/reset", json={
        "word": "CRANE",
        "date": "2026/06/27"  # Invalid format (slashes instead of hyphens)
    })
    assert response.status_code == 400
    data = response.get_json()
    assert data["error"] == "Invalid date format"
    assert "Date must be in YYYY-MM-DD format" in data["details"]

    response = client.post("/api/game/demo/reset", json={
        "word": "CRANE",
        "date": "not-a-date"  # Malicious/invalid text
    })
    assert response.status_code == 400

def test_demo_reset_valid_date_format(client):
    """Verify that resetting the demo with a valid YYYY-MM-DD date returns 200 OK."""
    response = client.post("/api/game/demo/reset", json={
        "word": "CRANE",
        "date": "2026-06-27"
    })
    assert response.status_code == 200

