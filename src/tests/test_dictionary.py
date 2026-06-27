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
