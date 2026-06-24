// FamilyWordle SPA Client Logic

// Configuration Constants
const GAME_CONFIG = {
    MAX_ROWS: 6,
    WORD_LENGTH: 5,
    FLIP_STEP_MS: 100,
    FLIP_DURATION_MS: 500
};

// Encapsulated Application State
const appState = {
    activeView: "auth-view",
    authMode: "login", // 'login' or 'register'
    isDemoMode: false,
    gameState: "not_started", // 'not_started', 'playing', 'won', 'lost', 'expired'
    currentRow: 0,
    currentTile: 0,
    boardState: Array(GAME_CONFIG.MAX_ROWS).fill(""), // letters entered in rows
    guessesHistory: [], // [{word: '...', feedback: [...]}]
    timerInterval: null
};

// Helper to reset appState
function resetAppState() {
    appState.currentRow = 0;
    appState.currentTile = 0;
    appState.boardState = Array(GAME_CONFIG.MAX_ROWS).fill("");
    appState.guessesHistory = [];
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
    }
}

// Virtual Keyboard layout
const KEYBOARD_LAYOUT = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["enter", "z", "x", "c", "v", "b", "n", "m", "backspace"]
];

// Safe unified API Fetch Handler
async function apiRequest(url, options = {}) {
    try {
        const response = await fetch(url, options);
        let data = {};
        try {
            data = await response.json();
        } catch (jsonErr) {
            // response might not have json body (e.g. empty or text error)
        }
        
        if (!response.ok) {
            const errorMsg = data.error || data.details || `Request failed with status ${response.status}`;
            console.error(`API request failed [${url}]:`, errorMsg);
            return { ok: false, error: errorMsg, status: response.status };
        }
        
        return { ok: true, data, status: response.status };
    } catch (err) {
        console.error(`Network or system error requesting [${url}]:`, err);
        return { ok: false, error: "Server connection error." };
    }
}

document.addEventListener("DOMContentLoaded", () => {
    // Render initial grid structure
    initializeGrid();
    initializeKeyboard();
    
    // Register physical keyboard listeners
    document.addEventListener("keydown", handlePhysicalKeyDown);
    
    // Check if session is already logged in (retrieve game state)
    checkActiveSession();
});

function showView(viewId) {
    document.querySelectorAll(".view-section").forEach(view => {
        view.classList.remove("active");
    });
    const activeSection = document.getElementById(viewId);
    if (activeSection) {
        activeSection.classList.add("active");
        appState.activeView = viewId;
    }
}

// Authentication Handlers
function toggleAuthMode(e) {
    if (e) e.preventDefault();
    const title = document.getElementById("auth-title");
    const subtitle = document.getElementById("auth-subtitle");
    const toggleBtn = document.getElementById("btn-toggle-auth");
    const submitBtn = document.getElementById("btn-auth-submit");
    
    if (appState.authMode === "login") {
        appState.authMode = "register";
        if (title) title.innerText = "Register Player";
        if (subtitle) subtitle.innerText = "Create a nickname and 4-digit PIN";
        if (toggleBtn) toggleBtn.innerText = "Have an account? Sign in here";
        if (submitBtn) submitBtn.innerText = "Register";
    } else {
        appState.authMode = "login";
        if (title) title.innerText = "Sign In";
        if (subtitle) subtitle.innerText = "Enter your name and PIN to play";
        if (toggleBtn) toggleBtn.innerText = "Need an account? Register here";
        if (submitBtn) submitBtn.innerText = "Sign In";
    }
}

async function handleAuthSubmit() {
    const usernameInput = document.getElementById("auth-username");
    const pinInput = document.getElementById("auth-pin");
    if (!usernameInput || !pinInput) return;
    
    const username = usernameInput.value.trim();
    const pin = pinInput.value.trim();
    
    if (!username || !pin) {
        showToast("Please fill in all fields.");
        return;
    }
    
    const url = appState.authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    const result = await apiRequest(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, pin })
    });
    
    if (!result.ok) {
        showToast(result.error);
        return;
    }
    
    const data = result.data;
    showToast(data.message);
    usernameInput.value = "";
    pinInput.value = "";
    
    if (appState.authMode === "register") {
        // Switch to login mode
        toggleAuthMode();
    } else {
        // Signed in! Setup views and game
        appState.isDemoMode = false;
        updateNavActions(data.username, data.role);
        loadActiveGame();
    }
}

async function checkActiveSession() {
    const result = await apiRequest("/api/game/state");
    if (result.ok) {
        // User is signed in!
        updateNavActions("Player", "player"); // default fallback, will correct on stats call
        loadActiveGame();
    }
}

function updateNavActions(username, role) {
    const btnShowLogin = document.getElementById("btn-show-login");
    const btnShowStats = document.getElementById("btn-show-stats");
    const btnShowLeague = document.getElementById("btn-show-league");
    const btnShowArchive = document.getElementById("btn-show-archive");
    const btnLogout = document.getElementById("btn-logout");
    const btnShowAdmin = document.getElementById("btn-show-admin");
    
    if (btnShowLogin) btnShowLogin.style.display = "none";
    if (btnShowStats) btnShowStats.style.display = "inline-flex";
    if (btnShowLeague) btnShowLeague.style.display = "inline-flex";
    if (btnShowArchive) btnShowArchive.style.display = "inline-flex";
    if (btnLogout) btnLogout.style.display = "inline-flex";
    
    if (role === "admin") {
        if (btnShowAdmin) btnShowAdmin.style.display = "inline-flex";
    } else {
        if (btnShowAdmin) btnShowAdmin.style.display = "none";
    }
}

async function handleLogout() {
    const result = await apiRequest("/api/auth/logout", { method: "POST" });
    sessionClearUI();
    if (result.ok) {
        showToast("Signed out successfully");
    } else {
        showToast(result.error);
    }
}

function sessionClearUI() {
    const btnShowLogin = document.getElementById("btn-show-login");
    const btnShowStats = document.getElementById("btn-show-stats");
    const btnShowLeague = document.getElementById("btn-show-league");
    const btnShowArchive = document.getElementById("btn-show-archive");
    const btnShowAdmin = document.getElementById("btn-show-admin");
    const btnLogout = document.getElementById("btn-logout");
    const gameTimer = document.getElementById("game-timer");
    
    if (btnShowLogin) btnShowLogin.style.display = "inline-flex";
    if (btnShowStats) btnShowStats.style.display = "none";
    if (btnShowLeague) btnShowLeague.style.display = "none";
    if (btnShowArchive) btnShowArchive.style.display = "none";
    if (btnShowAdmin) btnShowAdmin.style.display = "none";
    if (btnLogout) btnLogout.style.display = "none";
    
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
    }
    if (gameTimer) gameTimer.innerText = "";
    
    appState.isDemoMode = false;
    resetGridUI();
    showView("auth-view");
}

// Wordle Grid Construction
function initializeGrid() {
    const grid = document.getElementById("game-grid");
    if (!grid) return;
    grid.innerHTML = "";
    for (let r = 0; r < GAME_CONFIG.MAX_ROWS; r++) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "grid-row";
        rowDiv.id = `row-${r}`;
        for (let c = 0; c < GAME_CONFIG.WORD_LENGTH; c++) {
            const tileDiv = document.createElement("div");
            tileDiv.className = "tile";
            tileDiv.id = `tile-${r}-${c}`;
            rowDiv.appendChild(tileDiv);
        }
        grid.appendChild(rowDiv);
    }
}

function resetGridUI() {
    resetAppState();
    initializeGrid();
    resetKeyboardColors();
    const shareContainer = document.getElementById("game-over-container");
    if (shareContainer) {
        shareContainer.style.display = "none";
    }
}

// Keyboard rendering
function initializeKeyboard() {
    const kb = document.getElementById("keyboard");
    if (!kb) return;
    kb.innerHTML = "";
    KEYBOARD_LAYOUT.forEach(row => {
        const rowDiv = document.createElement("div");
        rowDiv.className = "keyboard-row";
        row.forEach(key => {
            const keyBtn = document.createElement("button");
            keyBtn.className = "key";
            keyBtn.id = `key-${key}`;
            if (key === "enter" || key === "backspace") {
                keyBtn.classList.add("wide");
            }
            keyBtn.innerText = key;
            keyBtn.addEventListener("click", () => handleVirtualKeyPress(key));
            rowDiv.appendChild(keyBtn);
        });
        kb.appendChild(rowDiv);
    });
}

function resetKeyboardColors() {
    document.querySelectorAll(".key").forEach(k => {
        k.className = "key";
        if (k.id === "key-enter" || k.id === "key-backspace") {
            k.classList.add("wide");
        }
    });
}

// Toast Notification
function showToast(message, duration = 2500) {
    const toast = document.getElementById("toast");
    if (!toast) return;
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, duration);
}

// Gameplay Loop
async function loadActiveGame() {
    const result = await apiRequest("/api/game/state");
    if (!result.ok) {
        sessionClearUI();
        return;
    }
    const data = result.data;
    
    resetGridUI();
    appState.isDemoMode = false;
    appState.gameState = data.status;
    appState.currentRow = data.attempts_used;
    appState.guessesHistory = data.guesses;
    
    const banner = document.getElementById("game-mode-banner");
    if (banner) {
        banner.innerText = "DAILY GAME";
        banner.style.background = ""; // Clear inline background style to fallback on CSS classes
        banner.className = "banner-daily";
    }
    const demoExit = document.getElementById("demo-exit-container");
    if (demoExit) {
        demoExit.style.display = "none";
    }
    
    // Fill in previous guesses
    appState.guessesHistory.forEach((g, idx) => {
        renderRowWithFeedback(idx, g.word, g.feedback);
        updateKeyboardColors(g.word, g.feedback);
    });
    
    showView("game-view");
    
    // Setup rollover countdown clock
    startCountdown(data.remaining_seconds);
    
    if (appState.gameState === "won") {
        showToast("Congratulations, you won!");
    } else if (appState.gameState === "lost") {
        showToast(`Daily word was: ${data.target_word}`);
    } else if (appState.gameState === "expired") {
        showToast("Today's game has expired!");
    }

    const shareContainer = document.getElementById("game-over-container");
    if (shareContainer && (appState.gameState === "won" || appState.gameState === "lost")) {
        shareContainer.style.display = "block";
    }
}

function renderRowWithFeedback(rIdx, word, feedback) {
    for (let c = 0; c < GAME_CONFIG.WORD_LENGTH; c++) {
        const tile = document.getElementById(`tile-${rIdx}-${c}`);
        if (tile) {
            tile.innerText = word[c];
            tile.classList.add(feedback[c]);
        }
    }
}

function updateKeyboardColors(word, feedback) {
    for (let i = 0; i < word.length; i++) {
        const char = word[i].toLowerCase();
        const feedbackClass = feedback[i];
        const keyBtn = document.getElementById(`key-${char}`);
        if (!keyBtn) continue;
        
        if (feedbackClass === "correct") {
            keyBtn.classList.remove("present", "absent");
            keyBtn.classList.add("correct");
        } else if (feedbackClass === "present") {
            if (!keyBtn.classList.contains("correct")) {
                keyBtn.classList.remove("absent");
                keyBtn.classList.add("present");
            }
        } else if (feedbackClass === "absent") {
            if (!keyBtn.classList.contains("correct") && !keyBtn.classList.contains("present")) {
                keyBtn.classList.add("absent");
            }
        }
    }
}

// Timer Countdown
function startCountdown(seconds) {
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
    }
    const timerElement = document.getElementById("game-timer");
    if (!timerElement) return;

    if (appState.isDemoMode) {
        timerElement.innerText = "Practice Mode";
        return;
    }
    
    let timer = seconds;
    const renderTime = () => {
        if (timer <= 0) {
            if (appState.timerInterval) {
                clearInterval(appState.timerInterval);
            }
            timerElement.innerText = "Rollover active. Resetting...";
            // Reload active game for new word
            setTimeout(loadActiveGame, 1000);
            return;
        }
        const hrs = Math.floor(timer / 3600);
        const mins = Math.floor((timer % 3600) / 60);
        const secs = timer % 60;
        timerElement.innerText = 
            `Next Daily Word in: ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        timer--;
    };
    
    renderTime();
    appState.timerInterval = setInterval(renderTime, 1000);
}

// Key Presses Handlers
function handlePhysicalKeyDown(e) {
    if (appState.activeView !== "game-view") return;
    
    // Ignore key presses during open modals
    if (document.querySelector(".modal-overlay.active")) return;
    
    if (e.key === "Enter") {
        submitInputGuess();
    } else if (e.key === "Backspace") {
        deleteInputChar();
    } else if (e.key.length === 1 && e.key.match(/[a-z]/i)) {
        addInputChar(e.key.toUpperCase());
    }
}

function handleVirtualKeyPress(key) {
    if (appState.activeView !== "game-view") return;
    
    if (key === "enter") {
        submitInputGuess();
    } else if (key === "backspace") {
        deleteInputChar();
    } else {
        addInputChar(key.toUpperCase());
    }
}

function addInputChar(char) {
    if (appState.gameState !== "playing" && appState.gameState !== "not_started") return;
    if (appState.currentTile >= GAME_CONFIG.WORD_LENGTH) return;
    
    const tile = document.getElementById(`tile-${appState.currentRow}-${appState.currentTile}`);
    if (!tile) return;
    tile.innerText = char;
    tile.classList.add("pop");
    
    appState.boardState[appState.currentRow] = appState.boardState[appState.currentRow] + char;
    appState.currentTile++;
}

function deleteInputChar() {
    if (appState.gameState !== "playing" && appState.gameState !== "not_started") return;
    if (appState.currentTile <= 0) return;
    
    appState.currentTile--;
    const tile = document.getElementById(`tile-${appState.currentRow}-${appState.currentTile}`);
    if (!tile) return;
    tile.innerText = "";
    tile.className = "tile";
    
    appState.boardState[appState.currentRow] = appState.boardState[appState.currentRow].slice(0, -1);
}

async function submitInputGuess() {
    if (appState.gameState !== "playing" && appState.gameState !== "not_started") return;
    
    const guess = appState.boardState[appState.currentRow] || "";
    if (guess.length < GAME_CONFIG.WORD_LENGTH) {
        showToast("Not enough letters");
        shakeRow(appState.currentRow);
        return;
    }
    
    const url = appState.isDemoMode ? "/api/game/demo/guess" : "/api/game/guess";
    
    const previousState = appState.gameState;
    appState.gameState = "processing";
    
    const result = await apiRequest(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess })
    });
    
    if (!result.ok) {
        appState.gameState = previousState;
        showToast(result.error);
        shakeRow(appState.currentRow);
        return;
    }
    
    const data = result.data;
    
    // Execute flip animation
    await animateRowFlip(appState.currentRow, guess, data.feedback);
    
    appState.guessesHistory.push({ word: guess, feedback: data.feedback });
    
    appState.gameState = data.status;
    appState.currentRow++;
    appState.currentTile = 0;
    
    // Check end states
    if (data.status === "won") {
        showToast("Congratulations!");
    } else if (data.status === "lost") {
        showToast(`Game Over. Word was: ${data.target_word}`);
    }

    const shareContainer = document.getElementById("game-over-container");
    if (shareContainer && (data.status === "won" || data.status === "lost")) {
        shareContainer.style.display = "block";
    }
}

function shakeRow(rowIdx) {
    const row = document.getElementById(`row-${rowIdx}`);
    if (!row) return;
    row.classList.add("shake");
    setTimeout(() => {
        row.classList.remove("shake");
    }, 300);
}

function animateTileFlip(tile, feedbackClass, char, index) {
    return new Promise((resolve) => {
        setTimeout(() => {
            tile.classList.add("flip");
            
            // Halfway through flip (250ms), change colors
            setTimeout(() => {
                tile.classList.add(feedbackClass);
                updateKeyboardColors(char, [feedbackClass]);
            }, 250);
            
            // Complete animation removal
            setTimeout(() => {
                tile.classList.remove("flip");
                resolve();
            }, 500);
            
        }, index * GAME_CONFIG.FLIP_STEP_MS);
    });
}

async function animateRowFlip(rowIdx, word, feedback) {
    const promises = [];
    for (let c = 0; c < GAME_CONFIG.WORD_LENGTH; c++) {
        const tile = document.getElementById(`tile-${rowIdx}-${c}`);
        if (tile) {
            promises.push(animateTileFlip(tile, feedback[c], word[c], c));
        }
    }
    await Promise.all(promises);
    // Add brief extra padding delay to align completely with transition finishes
    await new Promise((resolve) => setTimeout(resolve, GAME_CONFIG.FLIP_DURATION_MS));
}

// Practice / Demo Mode
function startDemoMode() {
    appState.isDemoMode = true;
    appState.gameState = "playing";
    resetGridUI();
    
    const banner = document.getElementById("game-mode-banner");
    if (banner) {
        banner.innerText = "DEMO MODE";
        banner.style.background = ""; // Clear inline background style to fallback on CSS classes
        banner.className = "banner-demo";
    }
    const exitContainer = document.getElementById("demo-exit-container");
    if (exitContainer) {
        exitContainer.style.display = "block";
    }
    const timerElement = document.getElementById("game-timer");
    if (timerElement) {
        timerElement.innerText = "Practice Mode";
    }
    
    showView("game-view");
}

function exitDemoMode() {
    sessionClearUI();
}

async function resetDemoMode() {
    const result = await apiRequest("/api/game/demo/reset", { method: "POST" });
    if (result.ok) {
        startDemoMode();
    } else {
        showToast(result.error);
    }
}

// Modals control
function openModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.add("active");
    }
}

function closeModal(id) {
    const modal = document.getElementById(id);
    if (modal) {
        modal.classList.remove("active");
    }
}

function closeModalOnOuterClick(e, id) {
    if (e.target.id === id) {
        closeModal(id);
    }
}

// Fetch stats and fill modal
async function openStatsModal() {
    const result = await apiRequest("/api/stats");
    if (!result.ok) {
        showToast("Error retrieving statistics.");
        return;
    }
    const data = result.data;
    
    const playedEl = document.getElementById("stat-played");
    const winsEl = document.getElementById("stat-wins");
    const winPctEl = document.getElementById("stat-win-pct");
    const streakEl = document.getElementById("stat-streak");
    
    if (playedEl) playedEl.textContent = data.games_played;
    if (winsEl) winsEl.textContent = data.games_won;
    if (winPctEl) winPctEl.textContent = `${data.win_percentage}%`;
    if (streakEl) streakEl.textContent = data.current_streak;
    
    // Fill history
    const list = document.getElementById("stats-history-list");
    if (list) {
        list.innerHTML = "";
        if (data.history.length === 0) {
            const noGamesDiv = document.createElement("div");
            noGamesDiv.className = "text-muted";
            noGamesDiv.style.textAlign = "center";
            noGamesDiv.textContent = "No completed games yet.";
            list.appendChild(noGamesDiv);
        } else {
            data.history.forEach(h => {
                const item = document.createElement("div");
                item.className = "history-item";
                
                const dateSpan = document.createElement("span");
                dateSpan.textContent = `📅 ${h.date}`;
                
                const wordSpan = document.createElement("span");
                wordSpan.textContent = "🔤 ";
                const wordStrong = document.createElement("strong");
                wordStrong.textContent = h.word;
                wordSpan.appendChild(wordStrong);
                
                const resultSpan = document.createElement("span");
                resultSpan.className = h.result === 'win' ? "text-success" : "text-danger";
                resultSpan.textContent = h.result === 'win' ? `${h.attempts} attempts` : 'failed';
                
                item.appendChild(dateSpan);
                item.appendChild(wordSpan);
                item.appendChild(resultSpan);
                list.appendChild(item);
            });
        }
    }
    
    openModal("modal-stats");
}

// Fetch league table
async function openLeagueModal() {
    const result = await apiRequest("/api/stats/league");
    if (!result.ok) {
        showToast("Error retrieving rankings.");
        return;
    }
    const data = result.data;
    
    const body = document.getElementById("league-table-body");
    if (body) {
        body.innerHTML = "";
        data.rankings.forEach(row => {
            const tr = document.createElement("tr");
            
            const tdRank = document.createElement("td");
            const strongRank = document.createElement("strong");
            strongRank.textContent = row.rank;
            tdRank.appendChild(strongRank);
            
            const tdPlayer = document.createElement("td");
            tdPlayer.textContent = row.username;
            
            const tdPlayed = document.createElement("td");
            tdPlayed.textContent = row.games_played;
            
            const tdWins = document.createElement("td");
            tdWins.textContent = row.games_won;
            
            const tdAvg = document.createElement("td");
            tdAvg.textContent = row.average_attempts;
            
            const tdStreak = document.createElement("td");
            tdStreak.textContent = `🔥 ${row.current_streak}`;
            
            tr.appendChild(tdRank);
            tr.appendChild(tdPlayer);
            tr.appendChild(tdPlayed);
            tr.appendChild(tdWins);
            tr.appendChild(tdAvg);
            tr.appendChild(tdStreak);
            body.appendChild(tr);
        });
    }
    
    openModal("modal-league");
}

// Fetch archives
async function openArchiveModal() {
    const result = await apiRequest("/api/archive");
    if (!result.ok) {
        showToast("Error retrieving archive.");
        return;
    }
    const data = result.data;
    
    const list = document.getElementById("archive-list");
    if (list) {
        list.innerHTML = "";
        if (data.archive.length === 0) {
            const emptyDiv = document.createElement("div");
            emptyDiv.className = "text-muted";
            emptyDiv.style.textAlign = "center";
            emptyDiv.style.padding = "16px";
            emptyDiv.textContent = "Archive is empty. Check back tomorrow!";
            list.appendChild(emptyDiv);
        } else {
            data.archive.forEach(w => {
                const div = document.createElement("div");
                div.className = "archive-item";
                
                const dateSpan = document.createElement("span");
                dateSpan.textContent = `📅 ${w.date}`;
                
                const wordSpan = document.createElement("span");
                wordSpan.className = "archive-word";
                const wordStrong = document.createElement("strong");
                wordStrong.textContent = w.word;
                wordSpan.appendChild(wordStrong);
                
                div.appendChild(dateSpan);
                div.appendChild(wordSpan);
                list.appendChild(div);
            });
        }
    }
    
    openModal("modal-archive");
}

// Help Modal
function openHelpModal() {
    openModal("modal-help");
}

// Admin Panel operations (Admin Only)
async function openAdminModal() {
    const result = await apiRequest("/api/admin/players");
    if (!result.ok) {
        showToast("Access Denied");
        return;
    }
    renderAdminTable(result.data.players);
    openModal("modal-admin");
}

function renderAdminTable(players) {
    const body = document.getElementById("admin-table-body");
    if (!body) return;
    body.innerHTML = "";
    players.forEach(p => {
        const tr = document.createElement("tr");
        
        const tdName = document.createElement("td");
        const strongName = document.createElement("strong");
        strongName.textContent = p.username;
        tdName.appendChild(strongName);
        
        const tdRole = document.createElement("td");
        tdRole.textContent = p.role;
        
        const tdStatus = document.createElement("td");
        const statusSpan = document.createElement("span");
        statusSpan.className = p.status === "active" ? "text-success" : "text-warning";
        statusSpan.textContent = p.status;
        tdStatus.appendChild(statusSpan);
        
        const tdActions = document.createElement("td");
        
        // Rename button
        const renameBtn = document.createElement("button");
        renameBtn.className = "btn-premium";
        renameBtn.textContent = "Rename";
        renameBtn.addEventListener("click", () => renamePlayerAdmin(p.username));
        tdActions.appendChild(renameBtn);
        
        // Status toggle button
        const toggleBtnText = p.status === "active" ? "Disable" : "Enable";
        const targetStatus = p.status === "active" ? "disabled" : "active";
        const toggleBtn = document.createElement("button");
        toggleBtn.className = "btn-premium ml-2";
        toggleBtn.textContent = toggleBtnText;
        toggleBtn.addEventListener("click", () => updatePlayerAdmin(p.username, targetStatus, null));
        tdActions.appendChild(toggleBtn);
        
        // Remove button
        const removeBtn = document.createElement("button");
        removeBtn.className = "btn-premium btn-danger ml-2";
        removeBtn.textContent = "Remove";
        removeBtn.addEventListener("click", () => removePlayerAdmin(p.username));
        tdActions.appendChild(removeBtn);
        
        tr.appendChild(tdName);
        tr.appendChild(tdRole);
        tr.appendChild(tdStatus);
        tr.appendChild(tdActions);
        body.appendChild(tr);
    });
}

async function renamePlayerAdmin(username) {
    const newName = prompt(`Enter new name for player "${username}":`, username);
    if (newName === null) return;
    const trimmed = newName.trim();
    if (!trimmed) {
        showToast("Invalid username");
        return;
    }
    
    const result = await apiRequest(`/api/admin/players/${username}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: trimmed })
    });
    
    if (result.ok) {
        showToast("Player renamed successfully");
        const listResult = await apiRequest("/api/admin/players");
        if (listResult.ok) {
            renderAdminTable(listResult.data.players);
        }
    } else {
        showToast(result.error);
    }
}

async function updatePlayerAdmin(username, status, role) {
    const payload = {};
    if (status) payload.status = status;
    if (role) payload.role = role;
    
    const result = await apiRequest(`/api/admin/players/${username}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
    });
    
    if (result.ok) {
        showToast("Player updated successfully");
        const listResult = await apiRequest("/api/admin/players");
        if (listResult.ok) {
            renderAdminTable(listResult.data.players);
        }
    } else {
        showToast(result.error);
    }
}

async function removePlayerAdmin(username) {
    if (!confirm(`Are you sure you want to remove player "${username}"?`)) return;
    
    const result = await apiRequest(`/api/admin/players/${username}`, {
        method: "DELETE"
    });
    
    if (result.ok) {
        showToast("Player removed successfully");
        const listResult = await apiRequest("/api/admin/players");
        if (listResult.ok) {
            renderAdminTable(listResult.data.players);
        }
    } else {
        showToast(result.error);
    }
}

function shareResult() {
    const attempts = appState.gameState === "won" ? appState.guessesHistory.length : "X";
    const dateStr = new Date().toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
    let text = `FamilyWordle (${dateStr}) ${attempts}/6\n\n`;
    
    appState.guessesHistory.forEach(g => {
        const rowEmojis = g.feedback.map(f => {
            if (f === "correct") return "🟩";
            if (f === "present") return "🟨";
            return "⬛";
        }).join("");
        text += rowEmojis + "\n";
    });
    
    text += "\nPlay here: " + window.location.origin;
    
    navigator.clipboard.writeText(text).then(() => {
        showToast("Result copied to clipboard! 🟩🟨⬛");
    }).catch(err => {
        showToast("Failed to copy results.");
        console.error(err);
    });
}
