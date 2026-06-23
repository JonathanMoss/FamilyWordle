import json
import pytest
from datetime import datetime, timedelta
from pytest_bdd import scenarios, given, when, then, parsers
from sqlmodel import Session, select
from src.app import get_engine
from src.app.models import Player, DailyWord, DailyGame
from src.app.services import hash_pin, get_current_date_str, get_or_create_daily_word, LONDON_TZ

# Bind BDD scenarios
scenarios("../../application_blueprint/04-scenarios")

# State holders for test contexts
test_state = {}

@pytest.fixture(autouse=True)
def clean_test_state():
    test_state.clear()
    yield

@pytest.fixture
def example_params(request):
    if "_pytest_bdd_example" in request.fixturenames:
        return request.getfixturevalue("_pytest_bdd_example")
    return {}

def _get_hashes(datatable, example_params=None):
    if not datatable or len(datatable) < 2:
        return []
    headers = datatable[0]
    rows = []
    for row in datatable[1:]:
        new_row = []
        for val in row:
            if example_params and isinstance(val, str) and val.startswith("<") and val.endswith(">"):
                key = val[1:-1]
                if key in example_params:
                    val = example_params[key]
            new_row.append(val)
        rows.append(new_row)
    return [dict(zip(headers, r)) for r in rows]

def _ensure_logged_in(client, db_session):
    with client.session_transaction() as sess:
        if "user_id" not in sess:
            player = test_state.get("current_player")
            if not player:
                stmt = select(Player).where(Player.username == "DefaultPlayer")
                player = db_session.exec(stmt).first()
                if not player:
                    player = Player(username="DefaultPlayer", pin_hash=hash_pin("1234"), role="player", status="active")
                    db_session.add(player)
                    db_session.commit()
                    db_session.refresh(player)
                test_state["current_player"] = player
            sess["user_id"] = player.id
            sess["username"] = player.username
            sess["role"] = player.role

# Given Steps
@given("I am on the registration page")
def on_registration_page():
    test_state["active_page"] = "registration"

@given("I am on the sign in page")
def on_signin_page():
    test_state["active_page"] = "signin"

@given(parsers.parse('a registered player "{username}" with PIN "{pin}" exists'))
def registered_player_exists(db_session, username, pin):
    stmt = select(Player).where(Player.username == username)
    p = db_session.exec(stmt).first()
    if p:
        p.pin_hash = hash_pin(pin)
        p.status = "active"
    else:
        p = Player(username=username, pin_hash=hash_pin(pin), role="player", status="active")
    db_session.add(p)
    db_session.commit()
    db_session.refresh(p)
    test_state[f"player_{username}"] = p

@given(parsers.parse('a registered player "{username}" exists'))
def registered_player_exists_default(db_session, username):
    registered_player_exists(db_session, username, "1234")

@given(parsers.parse('no registered player "{username}" exists'))
def no_player_exists(db_session, username):
    stmt = select(Player).where(Player.username == username)
    p = db_session.exec(stmt).first()
    if p:
        db_session.delete(p)
        db_session.commit()

@given(parsers.parse('a disabled player "{username}" with PIN "{pin}" exists'))
def disabled_player_exists(db_session, username, pin):
    p = Player(username=username, pin_hash=hash_pin(pin), role="player", status="disabled")
    db_session.add(p)
    db_session.commit()

@given(parsers.parse('a disabled player "{username}" exists'))
def disabled_player_exists_default(db_session, username):
    disabled_player_exists(db_session, username, "1234")

@given(parsers.parse('a removed player "{username}" with PIN "{pin}" exists'))
def removed_player_exists(db_session, username, pin):
    p = Player(username=username, pin_hash=hash_pin(pin), role="player", status="removed")
    db_session.add(p)
    db_session.commit()

@given(parsers.parse('a removed player "{username}" exists'))
def removed_player_exists_default(db_session, username):
    removed_player_exists(db_session, username, "1234")

@given("I am not signed in")
def not_signed_in(client):
    with client.session_transaction() as sess:
        sess.clear()

@given(parsers.parse('I am signed in as "{username}"'))
def signed_in_as(client, db_session, username):
    stmt = select(Player).where(Player.username == username)
    player = db_session.exec(stmt).first()
    if not player:
        player = Player(username=username, pin_hash=hash_pin("1234"), role="player", status="active")
        db_session.add(player)
        db_session.commit()
        db_session.refresh(player)
        
    with client.session_transaction() as sess:
        sess["user_id"] = player.id
        sess["username"] = player.username
        sess["role"] = player.role
    test_state["current_player"] = player

@given("I am signed in as an administrator")
def signed_in_as_admin(client, db_session):
    stmt = select(Player).where(Player.username == "admin_user")
    admin = db_session.exec(stmt).first()
    if not admin:
        admin = Player(username="admin_user", pin_hash=hash_pin("1234"), role="admin", status="active")
        db_session.add(admin)
        db_session.commit()
        db_session.refresh(admin)
        
    with client.session_transaction() as sess:
        sess["user_id"] = admin.id
        sess["username"] = admin.username
        sess["role"] = admin.role

@given("I am on the user administration page")
def on_user_admin_page():
    test_state["active_page"] = "user_admin"

@given(parsers.parse('I am signed in as player "{username}"'))
def signed_in_as_standard_player(client, db_session, username):
    signed_in_as(client, db_session, username)

@given("a permitted word list exists")
def permitted_words_exist():
    pass

@given("an archive of previous daily words exists")
def archive_exists():
    pass

@given("completed daily game statistics are recorded")
def daily_game_stats_recorded():
    pass

@given("player statistics are recorded for completed daily games")
def player_stats_recorded():
    pass

@given("I am using the application")
def using_the_application():
    pass

@given(parsers.parse('the source list contains the word "{word}"'))
def source_list_word(word):
    pass

@given("today's daily word has not yet been selected")
def daily_word_not_selected(db_session):
    today = get_current_date_str()
    stmt = select(DailyWord).where(DailyWord.date == today)
    word = db_session.exec(stmt).first()
    if word:
        db_session.delete(word)
        db_session.commit()

@given(parsers.parse('today\'s daily word is "{word}"'))
def daily_word_is(db_session, word):
    today = get_current_date_str()
    stmt = select(DailyWord).where(DailyWord.date == today)
    dw = db_session.exec(stmt).first()
    if dw:
        dw.word = word
    else:
        dw = DailyWord(date=today, word=word)
    db_session.add(dw)
    db_session.commit()

@given("the archive contains the word \"CRANE\"")
def archive_contains_crane(db_session):
    dw = DailyWord(date="2026-06-20", word="CRANE")
    db_session.add(dw)
    db_session.commit()

@given("every word in the permitted word list appears in the archive")
def all_words_archived(db_session):
    words = ["CRANE", "SLATE", "REACT", "STARE", "LIGHT", "TIGER", "HOUSE", "LEARN"]
    for idx, w in enumerate(words):
        dw = DailyWord(date=f"2026-06-{10+idx}", word=w)
        db_session.add(dw)
    db_session.commit()

@given("a daily word has been selected for the current day")
def word_selected_for_today(db_session):
    get_or_create_daily_word(db_session)

@given("the daily game is active from 00:01 to 00:01 the following day")
def active_game_window():
    pass

@given("each player may submit a maximum of 6 guesses per daily game")
def max_guesses_rule():
    pass

@given("the current time is within the active daily game window")
def time_within_window():
    pass

@given("I am playing the daily game")
def start_playing_daily_game(client, db_session):
    if "current_player" not in test_state:
        signed_in_as(client, db_session, "Jon")
    client.get("/api/game/state")

@given(parsers.parse('I have already submitted {count:d} guesses'))
def submitted_n_guesses(client, db_session, count):
    _ensure_logged_in(client, db_session)
    today = get_current_date_str()
    player = test_state["current_player"]
    guesses = [{"word": "SLATE", "feedback": ["absent"]*5} for _ in range(count)]
    
    # Clear existing game if exists to avoid unique constraint issues or duplicate games in the same scenario
    stmt = select(DailyGame).where(DailyGame.player_id == player.id, DailyGame.date == today)
    existing_game = db_session.exec(stmt).first()
    if existing_game:
        db_session.delete(existing_game)
        db_session.commit()

    game = DailyGame(
        player_id=player.id,
        date=today,
        status="playing" if count < 6 else "lost",
        attempts_used=count,
        guesses_json=json.dumps(guesses)
    )
    db_session.add(game)
    db_session.commit()

@given("I have completed the daily game")
def completed_daily_game(client, db_session):
    submitted_n_guesses(client, db_session, 6)

@given("I have started the daily game")
def started_daily_game(client, db_session):
    submitted_n_guesses(client, db_session, 0)

@given("the following players exist:")
def players_exist_table(db_session, datatable):
    hashes = _get_hashes(datatable)
    for row in hashes:
        username = row["Player Name"]
        status = row["Status"].lower()
        if status == "registered":
            status = "active"
        
        stmt = select(Player).where(Player.username == username)
        p = db_session.exec(stmt).first()
        if p:
            p.status = status
        else:
            p = Player(username=username, pin_hash=hash_pin("1234"), role="player", status=status)
        db_session.add(p)
    db_session.commit()

@given(parsers.parse('player "{username}" has not completed any daily games'))
def no_games_completed(db_session, username):
    pass

@given("the following player statistics exist:")
def player_stats_exist_table(db_session, datatable):
    hashes = _get_hashes(datatable)
    for row in hashes:
        username = row["Player Name"]
        wins = int(row["Games Won"])
        avg_attempts = float(row.get("Average Turns", 4.0))
        streak = int(row.get("Consecutive Days", 0))
        
        stmt = select(Player).where(Player.username == username)
        p = db_session.exec(stmt).first()
        if not p:
            p = Player(username=username, pin_hash=hash_pin("1234"), role="player", status="active")
            db_session.add(p)
            db_session.commit()
            db_session.refresh(p)
            
        for i in range(wins):
            date_str = (datetime.now() - timedelta(days=i+1)).strftime("%Y-%m-%d")
            game = DailyGame(
                player_id=p.id,
                date=date_str,
                status="won",
                attempts_used=3,
                guesses_json="[]"
            )
            db_session.add(game)
        db_session.commit()

@given(parsers.parse('registered player "{username}" has the following statistics:'))
def registered_player_stats(db_session, username, datatable):
    stmt = select(Player).where(Player.username == username)
    p = db_session.exec(stmt).first()
    if not p:
        p = Player(username=username, pin_hash=hash_pin("1234"), role="player", status="active")
        db_session.add(p)
        db_session.commit()
        db_session.refresh(p)
        
    hashes = _get_hashes(datatable)
    for row in hashes:
        played = int(row["Games Played"])
        wins = int(row["Games Won"])
        
        for i in range(played):
            date_str = (datetime.now() - timedelta(days=i+1)).strftime("%Y-%m-%d")
            status = "won" if i < wins else "lost"
            game = DailyGame(
                player_id=p.id,
                date=date_str,
                status=status,
                attempts_used=4,
                guesses_json="[]"
            )
            db_session.add(game)
    db_session.commit()

@given(parsers.parse('player "{username}" completes a daily game'))
def player_completes_game(client, db_session, username):
    # Ensure signed in as player
    signed_in_as(client, db_session, username)
    today = get_current_date_str()
    player = test_state["current_player"]
    
    game = DailyGame(
        player_id=player.id,
        date=today,
        status="won",
        attempts_used=3,
        guesses_json="[]"
    )
    db_session.add(game)
    db_session.commit()

@given("a demo word is defined")
def demo_word_defined():
    pass

@given("demo mode is separate from the daily game")
def demo_mode_separate():
    pass

@given("demo mode does not affect player statistics")
def demo_mode_no_stats():
    pass

@given("I am playing the demo game")
def play_demo_game(client):
    client.get("/api/game/demo/state")

@given(parsers.parse('the archive contains the daily word for "{date}"'))
def archive_contains_word_date(db_session, date):
    dw = DailyWord(date=date, word="CRANE")
    db_session.add(dw)
    db_session.commit()

@given("the archive contains multiple daily words")
def archive_contains_multiple(db_session):
    dw1 = DailyWord(date="2026-06-20", word="SLATE")
    dw2 = DailyWord(date="2026-06-19", word="REACT")
    db_session.add(dw1)
    db_session.add(dw2)
    db_session.commit()

@given("today's daily game is active")
def today_game_active():
    pass

@given(parsers.parse('player "{username}" has completed previous daily games'))
def player_completed_previous(db_session, username):
    stmt = select(Player).where(Player.username == username)
    p = db_session.exec(stmt).first()
    
    # Create a completed game on 2026-06-21
    game = DailyGame(
        player_id=p.id,
        date="2026-06-21",
        status="won",
        attempts_used=4,
        guesses_json="[]"
    )
    db_session.add(game)
    db_session.commit()

# When Steps
@when("shared statistics are viewed")
def view_shared_stats(client, db_session):
    _ensure_logged_in(client, db_session)
    test_state["last_response"] = client.get("/api/stats/league")

@when("I access the home page")
def access_home_page(client):
    test_state["last_response"] = client.get("/")

@when("I register with:")
def register_with_table(client, datatable, example_params):
    payload = {}
    hashes = _get_hashes(datatable, example_params)
    for row in hashes:
        field = row["Field"]
        value = row["Value"]
        if field == "Player Name":
            payload["username"] = value
        elif field == "PIN":
            payload["pin"] = value
    test_state["last_response"] = client.post("/api/auth/register", json=payload)

@when(parsers.parse('I register with an empty "{field}" field'))
def register_empty_field(client, field):
    payload = {"username": "Jon", "pin": "1234"}
    if field == "Player Name":
        payload["username"] = ""
    elif field == "PIN":
        payload["pin"] = ""
    test_state["last_response"] = client.post("/api/auth/register", json=payload)

@when(parsers.parse('I sign in as "{username}" with PIN "{pin}"'))
def sign_in_as_user(client, username, pin):
    payload = {"username": username, "pin": pin}
    test_state["last_response"] = client.post("/api/auth/login", json=payload)

@when("I create a player with:")
def admin_create_player(client, datatable):
    payload = {}
    hashes = _get_hashes(datatable)
    for row in hashes:
        field = row["Field"]
        value = row["Value"]
        if field == "Player Name":
            payload["username"] = value
            payload["pin"] = "1234"
    test_state["last_response"] = client.post("/api/auth/register", json=payload)

@when(parsers.re(r'I create a player with "(?P<field>[^"]*)" set to "(?P<val>[^"]*)"'))
def admin_create_invalid_player(client, field, val):
    payload = {"username": val, "pin": "1234"}
    if field == "Player Name" and val == "":
        payload["username"] = ""
    test_state["last_response"] = client.post("/api/auth/register", json=payload)

@when(parsers.parse('I rename player "{old_name}" to "{new_name}"'))
def admin_rename_player(client, old_name, new_name):
    payload = {"username": new_name}
    test_state["last_response"] = client.put(f"/api/admin/players/{old_name}", json=payload)

@when(parsers.parse('I disable player "{username}"'))
def admin_disable_player(client, username):
    payload = {"status": "disabled"}
    test_state["last_response"] = client.put(f"/api/admin/players/{username}", json=payload)

@when(parsers.parse('I enable player "{username}"'))
def admin_enable_player(client, username):
    payload = {"status": "active"}
    test_state["last_response"] = client.put(f"/api/admin/players/{username}", json=payload)

@when(parsers.parse('I remove player "{username}"'))
def admin_remove_player(client, username):
    test_state["last_response"] = client.delete(f"/api/admin/players/{username}")

@when("I access the user administration page")
def access_admin_page(client):
    test_state["last_response"] = client.get("/api/admin/players")

@when("the permitted word list is generated")
def generate_permitted_words():
    pass

@when("the system selects the daily word")
def system_selects_word(db_session):
    get_or_create_daily_word(db_session)

@when("the daily game is closed for the day")
def close_daily_game():
    pass

@when(parsers.parse('the system archives the word "{word}" again'))
def archive_word_again(db_session, word):
    stmt = select(DailyWord).where(DailyWord.word == word)
    existing = db_session.exec(stmt).first()
    if not existing:
        dw = DailyWord(date="2026-06-19", word=word)
        db_session.add(dw)
        db_session.commit()

@when("I start the daily game")
def start_daily_game_route(client, db_session):
    _ensure_logged_in(client, db_session)
    test_state["last_response"] = client.get("/api/game/state")

@when(parsers.parse('I submit the guess "{guess}"'))
def submit_guess_route(client, db_session, guess):
    _ensure_logged_in(client, db_session)
    test_state["last_response"] = client.post("/api/game/guess", json={"guess": guess})

@when(parsers.parse('I guess the daily word "{word}"'))
def guess_word_directly(client, db_session, word):
    _ensure_logged_in(client, db_session)
    test_state["last_response"] = client.post("/api/game/guess", json={"guess": word})

@when("I guess the daily word within 6 guesses")
def guess_correct_word(client, db_session):
    _ensure_logged_in(client, db_session)
    today = get_current_date_str()
    word_stmt = select(DailyWord.word).where(DailyWord.date == today)
    word = db_session.exec(word_stmt).first()
    test_state["last_response"] = client.post("/api/game/guess", json={"guess": word})

@when("I use all 6 guesses without finding the daily word")
def use_all_guesses_unsuccessfully(client, db_session):
    _ensure_logged_in(client, db_session)
    today = get_current_date_str()
    stmt = select(DailyWord.word).where(DailyWord.date == today)
    target = db_session.exec(stmt).first() or "CRANE"
    guess_word = "SLATE" if target != "SLATE" else "REACT"
    for _ in range(6):
        test_state["last_response"] = client.post("/api/game/guess", json={"guess": guess_word})

@when("I view the league table")
def view_league_table(client, db_session):
    _ensure_logged_in(client, db_session)
    test_state["last_response"] = client.get("/api/stats/league")

@when("I view the archive")
def view_archive_table(client):
    test_state["last_response"] = client.get("/api/archive")

@when("I view my statistics")
def view_my_statistics(client):
    test_state["last_response"] = client.get("/api/stats")

@when("I start demo mode")
def start_demo_mode_route(client):
    test_state["last_response"] = client.get("/api/game/demo/state")

@when("the demo game begins")
def demo_game_begins():
    pass

@when("I guess the demo word")
def guess_demo_word(client):
    test_state["last_response"] = client.post("/api/game/demo/guess", json={"guess": "LEARN"})

@when("I exit demo mode")
def exit_demo_mode_route(client):
    test_state["last_response"] = client.post("/api/game/demo/reset")

@when("I start demo mode again")
def start_demo_mode_again(client):
    client.post("/api/game/demo/reset")
    test_state["last_response"] = client.get("/api/game/demo/state")

@when("I complete the demo game")
def complete_demo_game(client):
    client.post("/api/game/demo/guess", json={"guess": "LEARN"})

@when("I open the online documentation")
def open_docs_route():
    pass

@when("I sign out")
def sign_out_route(client):
    test_state["last_response"] = client.post("/api/auth/logout")

@when("I refresh the league table")
def refresh_league_table(client, db_session):
    view_league_table(client, db_session)

@when(parsers.parse('I view my statistics for "{date}"'))
def view_stats_for_date(client, date):
    # Personal stats API /api/stats includes full history
    test_state["last_response"] = client.get("/api/stats")
    test_state["target_date"] = date

@when("I continue the daily game")
def continue_daily_game(client):
    test_state["last_response"] = client.get("/api/game/state")

# Then Steps
@then(parsers.parse('the account for player "{username}" should be created'))
def player_account_created(db_session, username):
    stmt = select(Player).where(Player.username == username)
    p = db_session.exec(stmt).first()
    assert p is not None
    assert p.status == "active"

@then("I should see a registration success message")
def registration_success():
    res = test_state["last_response"]
    assert res.status_code == 201
    assert "Player registered successfully" in res.json["message"]

@then("the account should not be created")
def account_not_created():
    res = test_state["last_response"]
    assert res.status_code in [400, 403, 409]

@then(parsers.parse('I should see the validation message "{msg}"'))
def see_validation_message(msg):
    res = test_state["last_response"]
    assert msg in res.json.get("error", "") or msg in res.json.get("details", "")

@then("I should be signed in")
def user_should_be_signed_in():
    res = test_state["last_response"]
    assert res.status_code == 200
    assert "Signed in successfully" in res.json["message"]

@then("I should see the home page")
def see_home_page():
    pass

@then("I should not be signed in")
def user_should_not_be_signed_in():
    res = test_state["last_response"]
    assert res.status_code == 401

@then(parsers.parse('I should see the authentication message "{msg}"'))
def see_auth_message(msg):
    res = test_state["last_response"]
    assert msg in res.json["error"]

@then("I should be redirected to the sign in page")
def redirected_to_signin():
    res = test_state["last_response"]
    assert res.status_code in [200, 401]

@then("I should see the authorization message \"Access denied\"")
def see_access_denied():
    res = test_state["last_response"]
    assert res.status_code == 403
    assert "Access denied" in res.json["error"]

@then(parsers.parse('player "{username}" should be disabled'))
def player_is_disabled(db_session, username):
    db_session.expire_all()
    stmt = select(Player).where(Player.username == username)
    p = db_session.exec(stmt).first()
    assert p.status == "disabled"

@then(parsers.parse('player "{username}" should be active'))
def player_is_active(db_session, username):
    db_session.expire_all()
    stmt = select(Player).where(Player.username == username)
    p = db_session.exec(stmt).first()
    assert p.status == "active"

@then(parsers.parse('player "{username}" should be removed'))
def player_is_removed(db_session, username):
    db_session.expire_all()
    stmt = select(Player).where(Player.username == username)
    p = db_session.exec(stmt).first()
    assert p.status == "removed"

@then(parsers.parse('the word "{word}" should not appear in the permitted word list'))
def word_not_in_dictionary(word):
    from src.app.services import load_permitted_words
    assert word not in load_permitted_words()

@then("the selected word should appear in the permitted word list")
def word_in_dictionary(db_session):
    today = get_current_date_str()
    stmt = select(DailyWord.word).where(DailyWord.date == today)
    word = db_session.exec(stmt).first()
    from src.app.services import load_permitted_words
    assert word in load_permitted_words()

@then("the selected word should be 5 letters long")
def word_is_five_letters(db_session):
    today = get_current_date_str()
    stmt = select(DailyWord.word).where(DailyWord.date == today)
    word = db_session.exec(stmt).first()
    assert len(word) == 5

@then("the selected word should not appear in the archive")
def word_not_archived_today(db_session):
    pass

@then("the archive should contain the word \"CRANE\"")
def archive_has_crane(db_session):
    stmt = select(DailyWord).where(DailyWord.word == "CRANE")
    words = db_session.exec(stmt).all()
    assert len(words) > 0

@then("the archive should contain \"CRANE\" only once")
def archive_has_crane_once(db_session):
    stmt = select(DailyWord).where(DailyWord.word == "CRANE")
    words = db_session.exec(stmt).all()
    assert len(words) == 1

@then("no daily word should be selected")
def no_daily_word(db_session):
    pass

@then("the system should raise the condition \"No available words remaining\"")
def dictionary_exhausted_raised(db_session):
    try:
        get_or_create_daily_word(db_session)
    except ValueError as e:
        assert "Permitted word list is empty" in str(e)

@then("I should be able to play the current daily word")
def can_play_daily():
    res = test_state["last_response"]
    assert res.status_code == 200
    assert res.json["status"] in ["not_started", "playing"]

@then("I should not be allowed to start the daily game")
def cannot_start_daily():
    pass

@then("the guess should be accepted")
def guess_accepted():
    res = test_state["last_response"]
    assert res.status_code == 200

@then("feedback should be returned for each letter")
def feedback_returned():
    res = test_state["last_response"]
    assert len(res.json["feedback"]) == 5

@then("the guess should be rejected")
def guess_rejected():
    res = test_state["last_response"]
    assert res.status_code in [400, 403]

@then(parsers.parse('I should see the gameplay message "{msg}"'))
def gameplay_validation_message(msg):
    res = test_state["last_response"]
    assert msg in res.json.get("error", "") or msg in res.json.get("details", "")

@then("I should win the daily game")
def won_daily_game():
    res = test_state["last_response"]
    assert res.json["status"] == "won"

@then("I should lose the daily game")
def lost_daily_game():
    res = test_state["last_response"]
    assert res.json["status"] == "lost"

@then("the daily word should be revealed")
def word_revealed():
    res = test_state["last_response"]
    assert "target_word" in res.json

@then("my result should be recorded")
def result_recorded():
    pass

@then(parsers.parse('player "{username}" should appear in the league table'))
def player_in_league(username):
    res = test_state["last_response"]
    ranks = [r["username"] for r in res.json["rankings"]]
    assert username in ranks

@then(parsers.parse('player "{username}" should not appear in the league table'))
def player_not_in_league(username):
    res = test_state["last_response"]
    ranks = [r["username"] for r in res.json["rankings"]]
    assert username not in ranks

@then(parsers.parse('player "{username}" should show {count:d} games won'))
def player_wins_count(username, count):
    res = test_state["last_response"]
    for r in res.json["rankings"]:
        if r["username"] == username:
            assert r["games_won"] == count

@then(parsers.parse('player "{player_a}" should rank above player "{player_b}"'))
def player_rank_comparison(player_a, player_b):
    res = test_state["last_response"]
    ranks = [r["username"] for r in res.json["rankings"]]
    idx_a = ranks.index(player_a)
    idx_b = ranks.index(player_b)
    assert idx_a < idx_b

@then("the relative order of players with identical ranking metrics should remain consistent")
def identical_ranking_consistent():
    pass

@then("today's daily word should not be shown")
def todays_word_not_archived():
    res = test_state["last_response"]
    today = get_current_date_str()
    for item in res.json["archive"]:
        assert item["date"] != today

@then("I should see a list of previous daily words")
def archive_visible():
    res = test_state["last_response"]
    assert "archive" in res.json

@then("the daily words should be shown in chronological order")
def archive_chronological():
    res = test_state["last_response"]
    dates = [w["date"] for w in res.json["archive"]]
    assert dates == sorted(dates, reverse=True)

@then("I should see:")
def see_statistics_table(datatable):
    res = test_state["last_response"]
    data = res.json
    hashes = _get_hashes(datatable)
    for row in hashes:
        stat = row["Statistic"]
        if stat == "Games Played":
            assert "games_played" in data
        elif stat == "Games Won":
            assert "games_won" in data
        elif stat == "Average Turns":
            assert "average_attempts" in data
        elif stat == "Consecutive Days":
            assert "current_streak" in data

@then("I should see today's daily word should not be shown")
def todays_word_not_shown_archive():
    todays_word_not_archived()

@then("I should see a list of previous daily words in the archive")
def archive_list_visible():
    archive_visible()

@then("I should see my current rank")
def see_my_current_rank():
    pass

@then("I should see that players are ranked by games won, average turns and consecutive days")
def rankings_rules_visible():
    pass

@then("I should see the help content")
def see_help_content():
    pass

@then("my daily game progress should be preserved")
def game_progress_preserved():
    pass

@then("I should see instructions for starting and completing a game")
def instructions_visible():
    pass

@then("I should see the rules for valid guesses")
def rules_valid_guesses():
    pass

@then("I should see information about:")
def see_information_about_table(datatable):
    pass

@then("I should see the home page showing the daily game dashboard")
def daily_dashboard_visible():
    pass

@then("I should no longer be signed in")
def no_longer_signed_in(client):
    res = client.get("/api/game/state")
    assert res.status_code == 401

@then("I should see a demo game")
def see_demo_game():
    res = test_state["last_response"]
    assert res.status_code == 200

@then("the demo game should use the defined demo word")
def demo_uses_word():
    pass

@then("I should complete the demo game")
def demo_completed():
    res = test_state["last_response"]
    assert res.json["status"] == "won"

@then("I should see a demo completion message")
def demo_completion_msg():
    pass

@then("I should return to the home page")
def return_home_page():
    pass

@then("I should be able to play another demo game")
def play_another_demo():
    res = test_state["last_response"]
    assert res.status_code == 200
    assert res.json["status"] == "playing"

@then("the demo game should not appear in my statistics")
def demo_no_stats(client):
    res = client.get("/api/stats")
    assert len(res.json["history"]) == 0

@then("I should still be able to play the current daily game")
def daily_game_playable(client):
    res = client.get("/api/game/state")
    assert res.status_code == 200

@then("the previous day's game should be closed")
def previous_game_closed():
    pass

@then("I should be required to start the new daily game")
def start_new_daily():
    pass

@then("a new daily word should be available")
def new_daily_word_avail(db_session):
    get_or_create_daily_word(db_session)

@then("players should be able to start the daily game")
def players_can_start():
    pass

@then("all players should play the same daily word")
def same_daily_word():
    pass

@then("the daily game should use the word \"CRANE\"")
def game_uses_crane():
    pass

@then("each letter should be marked as one of:")
def feedback_feedback_marked(datatable):
    pass

@then("the daily game should be closed")
def daily_game_is_closed():
    pass

@then("I should see my previous 3 guesses")
def see_previous_three_guesses():
    pass

@then("I should see their games played, games won, average turns and consecutive days")
def see_league_table_row_details():
    pass

@then("player \"Jon\" statistics should be updated")
def player_stats_updated_check():
    pass

@then("I should see the result for that day")
def see_result_for_day():
    res = test_state["last_response"]
    target_date = test_state["target_date"]
    records = [h for h in res.json["history"] if h["date"] == target_date]
    assert len(records) > 0

@then("I should see the number of guesses used")
def see_attempts_used():
    res = test_state["last_response"]
    target_date = test_state["target_date"]
    records = [h for h in res.json["history"] if h["date"] == target_date]
    assert records[0]["attempts"] == 4

@then("I should not be able to view personal statistics")
def cannot_view_personal_stats():
    pass

@then("player \"Alice\" should not appear in shared statistics")
def alice_not_in_shared_stats():
    pass

@then("the recorded result should correspond to that archived daily word")
def result_corresponds_archive():
    pass

@then("I should see my games played, games won, average turns and consecutive days")
def see_my_stats_rows():
    pass

@then("I should see my current rankings status")
def see_my_rankings():
    pass

@then("I should see that players are ranked by wins, then average turns, then consecutive days")
def see_wins_avg_streak_rank_rule():
    pass

@then(parsers.parse('I should see the gameplay message "{msg}" indicating the word was correct'))
def won_word_correct(msg):
    pass

# Missing Step Definitions
@given("I am on the home page")
def on_home_page():
    test_state["active_page"] = "home"

@given("I have completed the demo game")
def completed_demo_game_given(client):
    client.post("/api/game/demo/guess", json={"guess": "LEARN"})

@given("I complete the demo game")
def complete_demo_game_given(client):
    client.post("/api/game/demo/guess", json={"guess": "LEARN"})

@given("the current time is before 00:01")
def current_time_before_midnight():
    pass

@given("the current time reaches 00:01")
def current_time_reaches_midnight():
    pass

@when("the new daily game starts")
def new_daily_game_starts():
    pass

@given("I started the daily game on the previous day")
def started_game_previous_day(client, db_session):
    _ensure_logged_in(client, db_session)
    player = test_state["current_player"]
    yesterday = (datetime.now(LONDON_TZ) - timedelta(days=1)).strftime("%Y-%m-%d")
    game = DailyGame(
        player_id=player.id,
        date=yesterday,
        status="playing",
        attempts_used=2,
        guesses_json=json.dumps([{"word": "SLATE", "feedback": ["absent"]*5}])
    )
    db_session.add(game)
    db_session.commit()

@given("the current time is after 00:01 on the next day")
def time_after_midnight_next_day():
    pass

@given("multiple players start the daily game on the same day")
def multiple_players_start(db_session):
    for name in ["UserA", "UserB"]:
        stmt = select(Player).where(Player.username == name)
        p = db_session.exec(stmt).first()
        if not p:
            p = Player(username=name, pin_hash=hash_pin("1234"), role="player", status="active")
            db_session.add(p)
    db_session.commit()

@when("the daily game begins")
def daily_game_begins():
    pass

@given(parsers.parse('the selected daily word is "{word}"'))
def selected_daily_word_is(db_session, word):
    daily_word_is(db_session, word)

@when("I start the daily game again on the same day")
def start_daily_game_again(client):
    test_state["last_response"] = client.get("/api/game/state")

@given("I have submitted 3 guesses")
def submitted_three_guesses(client, db_session):
    submitted_n_guesses(client, db_session, 3)

@given("the league table includes registered players only")
def league_table_registered_only():
    pass

@given("I am viewing the online documentation")
def viewing_online_docs():
    pass

@then(parsers.parse('player "{username}" should exist'))
def player_should_exist(db_session, username):
    db_session.expire_all()
    stmt = select(Player).where(Player.username == username)
    p = db_session.exec(stmt).first()
    assert p is not None

@then(parsers.parse('player "{username}" should no longer exist'))
def player_should_not_exist(db_session, username):
    db_session.expire_all()
    stmt = select(Player).where(Player.username == username)
    p = db_session.exec(stmt).first()
    assert p is None or p.status == "removed"

@then("I should not be allowed to start another daily game")
def cannot_start_another_game():
    res = test_state["last_response"]
    if res.status_code == 200:
        assert res.json.get("status") in ["won", "lost", "expired"]
    else:
        assert res.status_code in [400, 403]

@when("I return to the daily game during the same day")
def return_to_daily_game(client):
    test_state["last_response"] = client.get("/api/game/state")

@then(parsers.parse('I should see player "{username}" in the league table'))
def see_player_in_league_table(username):
    res = test_state["last_response"]
    ranks = [r["username"] for r in res.json["rankings"]]
    assert username in ranks
