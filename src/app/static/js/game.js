// FamilyWordle SPA Client Logic

let activeView = "auth-view";
let authMode = "login"; // 'login' or 'register'

// Game state
let isDemoMode = false;
let gameState = "not_started"; // 'not_started', 'playing', 'won', 'lost', 'expired'
let currentRow = 0;
let currentTile = 0;
let boardState = ["", "", "", "", "", ""]; // letters entered in rows
let guessesHistory = []; // [{word: '...', feedback: [...]}]
let timerInterval = null;

// Virtual Keyboard layout
const KEYBOARD_LAYOUT = [
    ["q", "w", "e", "r", "t", "y", "u", "i", "o", "p"],
    ["a", "s", "d", "f", "g", "h", "j", "k", "l"],
    ["enter", "z", "x", "c", "v", "b", "n", "m", "backspace"]
];

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
        activeView = viewId;
    }
}

// Authentication Handlers
function toggleAuthMode(e) {
    if (e) e.preventDefault();
    if (authMode === "login") {
        authMode = "register";
        document.getElementById("auth-title").innerText = "Register Player";
        document.getElementById("auth-subtitle").innerText = "Create a nickname and 4-digit PIN";
        document.getElementById("btn-toggle-auth").innerText = "Have an account? Sign in here";
        document.getElementById("btn-auth-submit").innerText = "Register";
    } else {
        authMode = "login";
        document.getElementById("auth-title").innerText = "Sign In";
        document.getElementById("auth-subtitle").innerText = "Enter your name and PIN to play";
        document.getElementById("btn-toggle-auth").innerText = "Need an account? Register here";
        document.getElementById("btn-auth-submit").innerText = "Sign In";
    }
}

async function handleAuthSubmit() {
    const usernameInput = document.getElementById("auth-username");
    const pinInput = document.getElementById("auth-pin");
    const username = usernameInput.value.trim();
    const pin = pinInput.value.trim();
    
    if (!username || !pin) {
        showToast("Please fill in all fields.");
        return;
    }
    
    const url = authMode === "login" ? "/api/auth/login" : "/api/auth/register";
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username, pin })
        });
        
        const data = await response.json();
        if (!response.ok) {
            showToast(data.error || data.details || "Authentication failed");
            return;
        }
        
        showToast(data.message);
        usernameInput.value = "";
        pinInput.value = "";
        
        if (authMode === "register") {
            // Switch to login mode
            toggleAuthMode();
        } else {
            // Signed in! Setup views and game
            isDemoMode = false;
            updateNavActions(data.username, data.role);
            loadActiveGame();
        }
    } catch (err) {
        showToast("Server connection error.");
    }
}

async function checkActiveSession() {
    try {
        const response = await fetch("/api/game/state");
        if (response.ok) {
            const data = await response.json();
            // User is signed in!
            // Expose the username using navbar details (expose Stats/League button)
            // But we don't have username in `/api/game/state`, so we check current details
            // We can fetch user stats or just load active game to query
            updateNavActions("Player", "player"); // default fallback, will correct on stats call
            loadActiveGame();
        }
    } catch (err) {}
}

function updateNavActions(username, role) {
    document.getElementById("btn-show-login").style.display = "none";
    document.getElementById("btn-show-stats").style.display = "inline-flex";
    document.getElementById("btn-show-league").style.display = "inline-flex";
    document.getElementById("btn-show-archive").style.display = "inline-flex";
    document.getElementById("btn-logout").style.display = "inline-flex";
    
    if (role === "admin") {
        document.getElementById("btn-show-admin").style.display = "inline-flex";
    } else {
        document.getElementById("btn-show-admin").style.display = "none";
    }
}

async function handleLogout() {
    try {
        await fetch("/api/auth/logout", { method: "POST" });
        sessionClearUI();
        showToast("Signed out successfully");
    } catch (err) {}
}

function sessionClearUI() {
    document.getElementById("btn-show-login").style.display = "inline-flex";
    document.getElementById("btn-show-stats").style.display = "none";
    document.getElementById("btn-show-league").style.display = "none";
    document.getElementById("btn-show-archive").style.display = "none";
    document.getElementById("btn-show-admin").style.display = "none";
    document.getElementById("btn-logout").style.display = "none";
    
    clearInterval(timerInterval);
    document.getElementById("game-timer").innerText = "";
    
    isDemoMode = false;
    resetGridUI();
    showView("auth-view");
}

// Wordle Grid Construction
function initializeGrid() {
    const grid = document.getElementById("game-grid");
    grid.innerHTML = "";
    for (let r = 0; r < 6; r++) {
        const rowDiv = document.createElement("div");
        rowDiv.className = "grid-row";
        rowDiv.id = `row-${r}`;
        for (let c = 0; c < 5; c++) {
            const tileDiv = document.createElement("div");
            tileDiv.className = "tile";
            tileDiv.id = `tile-${r}-${c}`;
            rowDiv.appendChild(tileDiv);
        }
        grid.appendChild(rowDiv);
    }
}

function resetGridUI() {
    currentRow = 0;
    currentTile = 0;
    boardState = ["", "", "", "", "", ""];
    guessesHistory = [];
    initializeGrid();
    resetKeyboardColors();
}

// Keyboard rendering
function initializeKeyboard() {
    const kb = document.getElementById("keyboard");
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
    toast.innerText = message;
    toast.classList.add("show");
    setTimeout(() => {
        toast.classList.remove("show");
    }, duration);
}

// Gameplay Loop
async function loadActiveGame() {
    try {
        const response = await fetch("/api/game/state");
        if (!response.ok) {
            sessionClearUI();
            return;
        }
        const data = await response.json();
        
        resetGridUI();
        isDemoMode = false;
        gameState = data.status;
        currentRow = data.attempts_used;
        guessesHistory = data.guesses;
        
        document.getElementById("game-mode-banner").innerText = "DAILY GAME";
        document.getElementById("game-mode-banner").style.background = "#1e293b";
        document.getElementById("demo-exit-container").style.display = "none";
        
        // Fill in previous guesses
        guessesHistory.forEach((g, idx) => {
            renderRowWithFeedback(idx, g.word, g.feedback);
            updateKeyboardColors(g.word, g.feedback);
        });
        
        showView("game-view");
        
        // Setup rollover countdown clock
        startCountdown(data.remaining_seconds);
        
        if (gameState === "won") {
            showToast("Congratulations, you won!");
        } else if (gameState === "lost") {
            showToast(`Daily word was: ${data.target_word}`);
        } else if (gameState === "expired") {
            showToast("Today's game has expired!");
        }
    } catch (err) {
        showToast("Error loading daily game.");
    }
}

function renderRowWithFeedback(rIdx, word, feedback) {
    for (let c = 0; c < 5; c++) {
        const tile = document.getElementById(`tile-${rIdx}-${c}`);
        tile.innerText = word[c];
        tile.classList.add(feedback[c]);
    }
}

function updateKeyboardColors(word, feedback) {
    for (let i = 0; i < 5; i++) {
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
    clearInterval(timerInterval);
    if (isDemoMode) {
        document.getElementById("game-timer").innerText = "Practice Mode";
        return;
    }
    
    let timer = seconds;
    const renderTime = () => {
        if (timer <= 0) {
            clearInterval(timerInterval);
            document.getElementById("game-timer").innerText = "Rollover active. Resetting...";
            // Reload active game for new word
            setTimeout(loadActiveGame, 1000);
            return;
        }
        const hrs = Math.floor(timer / 3600);
        const mins = Math.floor((timer % 3600) / 60);
        const secs = timer % 60;
        document.getElementById("game-timer").innerText = 
            `Next Daily Word in: ${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
        timer--;
    };
    
    renderTime();
    timerInterval = setInterval(renderTime, 1000);
}

// Key Presses Handlers
function handlePhysicalKeyDown(e) {
    if (activeView !== "game-view") return;
    
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
    if (activeView !== "game-view") return;
    
    if (key === "enter") {
        submitInputGuess();
    } else if (key === "backspace") {
        deleteInputChar();
    } else {
        addInputChar(key.toUpperCase());
    }
}

function addInputChar(char) {
    if (gameState !== "playing" && gameState !== "not_started") return;
    if (currentTile >= 5) return;
    
    const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
    tile.innerText = char;
    tile.classList.add("pop");
    
    boardState[currentRow] = boardState[currentRow] + char;
    currentTile++;
}

function deleteInputChar() {
    if (gameState !== "playing" && gameState !== "not_started") return;
    if (currentTile <= 0) return;
    
    currentTile--;
    const tile = document.getElementById(`tile-${currentRow}-${currentTile}`);
    tile.innerText = "";
    tile.className = "tile";
    
    boardState[currentRow] = boardState[currentRow].slice(0, -1);
}

async function submitInputGuess() {
    if (gameState !== "playing" && gameState !== "not_started") return;
    
    const guess = boardState[currentRow] || "";
    if (guess.length < 5) {
        showToast("Not enough letters");
        shakeRow(currentRow);
        return;
    }
    
    const url = isDemoMode ? "/api/game/demo/guess" : "/api/game/guess";
    
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ guess })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            showToast(data.error || data.details || "Invalid guess");
            shakeRow(currentRow);
            return;
        }
        
        // Success guess: execute flip animation
        animateRowFlip(currentRow, guess, data.feedback, () => {
            gameState = data.status;
            currentRow++;
            currentTile = 0;
            
            // Check end states
            if (data.status === "won") {
                showToast("Congratulations!");
            } else if (data.status === "lost") {
                showToast(`Game Over. Word was: ${data.target_word}`);
            }
        });
        
    } catch (err) {
        showToast("Server connection error.");
    }
}

function shakeRow(rowIdx) {
    const row = document.getElementById(`row-${rowIdx}`);
    row.classList.add("shake");
    setTimeout(() => {
        row.classList.remove("shake");
    }, 300);
}

function animateRowFlip(rowIdx, word, feedback, callback) {
    for (let c = 0; c < 5; c++) {
        const tile = document.getElementById(`tile-${rowIdx}-${c}`);
        
        // Stagger transitions slightly
        setTimeout(() => {
            tile.classList.add("flip");
            
            // Halfway through flip, change colors
            setTimeout(() => {
                tile.classList.add(feedback[c]);
                updateKeyboardColors(word, feedback);
            }, 250);
            
            // Complete animation removal
            setTimeout(() => {
                tile.classList.remove("flip");
                if (c === 4 && callback) callback();
            }, 500);
            
        }, c * 100);
    }
}

// Practice / Demo Mode
function startDemoMode() {
    isDemoMode = true;
    gameState = "playing";
    resetGridUI();
    
    document.getElementById("game-mode-banner").innerText = "DEMO MODE";
    document.getElementById("game-mode-banner").style.background = "#8b5cf6"; // demo purple
    document.getElementById("demo-exit-container").style.display = "block";
    document.getElementById("game-timer").innerText = "Practice Mode";
    
    showView("game-view");
}

function exitDemoMode() {
    sessionClearUI();
}

async function resetDemoMode() {
    try {
        await fetch("/api/game/demo/reset", { method: "POST" });
        startDemoMode();
    } catch (err) {}
}

// Modals control
function openModal(id) {
    document.getElementById(id).classList.add("active");
}

function closeModal(id) {
    document.getElementById(id).classList.remove("active");
}

function closeModalOnOuterClick(e, id) {
    if (e.target.id === id) {
        closeModal(id);
    }
}

// Fetch stats and fill modal
async function openStatsModal() {
    try {
        const response = await fetch("/api/stats");
        if (!response.ok) return;
        const data = await response.json();
        
        document.getElementById("stat-played").innerText = data.games_played;
        document.getElementById("stat-wins").innerText = data.games_won;
        document.getElementById("stat-win-pct").innerText = `${data.win_percentage}%`;
        document.getElementById("stat-streak").innerText = data.current_streak;
        
        // Fill history
        const list = document.getElementById("stats-history-list");
        list.innerHTML = "";
        if (data.history.length === 0) {
            list.innerHTML = `<div style="color:var(--text-muted); text-align:center;">No completed games yet.</div>`;
        } else {
            data.history.forEach(h => {
                const item = document.createElement("div");
                item.style.padding = "8px 0";
                item.style.borderBottom = "1px solid var(--border-glass)";
                item.style.display = "flex";
                item.style.justifyContent = "space-between";
                item.innerHTML = `
                    <span>📅 ${h.date}</span>
                    <span>🔤 <strong>${h.word}</strong></span>
                    <span style="color:${h.result === 'win' ? '#10b981' : '#ef4444'}">${h.result === 'win' ? `${h.attempts} attempts` : 'failed'}</span>
                `;
                list.appendChild(item);
            });
        }
        
        openModal("modal-stats");
    } catch (err) {
        showToast("Error retrieving statistics.");
    }
}

// Fetch league table
async function openLeagueModal() {
    try {
        const response = await fetch("/api/stats/league");
        if (!response.ok) return;
        const data = await response.json();
        
        const body = document.getElementById("league-table-body");
        body.innerHTML = "";
        data.rankings.forEach(row => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td><strong>${row.rank}</strong></td>
                <td>${row.username}</td>
                <td>${row.games_played}</td>
                <td>${row.games_won}</td>
                <td>${row.average_attempts}</td>
                <td>🔥 ${row.current_streak}</td>
            `;
            body.appendChild(tr);
        });
        
        openModal("modal-league");
    } catch (err) {
        showToast("Error retrieving rankings.");
    }
}

// Fetch archives
async function openArchiveModal() {
    try {
        const response = await fetch("/api/archive");
        if (!response.ok) return;
        const data = await response.json();
        
        const list = document.getElementById("archive-list");
        list.innerHTML = "";
        if (data.archive.length === 0) {
            list.innerHTML = `<div style="color:var(--text-muted); text-align:center; padding:16px;">Archive is empty. Check back tomorrow!</div>`;
        } else {
            data.archive.forEach(w => {
                const div = document.createElement("div");
                div.style.padding = "10px 0";
                div.style.borderBottom = "1px solid var(--border-glass)";
                div.style.display = "flex";
                div.style.justifyContent = "space-between";
                div.innerHTML = `
                    <span>📅 ${w.date}</span>
                    <span style="font-family:var(--font-mono); letter-spacing:1px;"><strong>${w.word}</strong></span>
                `;
                list.appendChild(div);
            });
        }
        
        openModal("modal-archive");
    } catch (err) {
        showToast("Error retrieving archive.");
    }
}

// Help Modal
function openHelpModal() {
    openModal("modal-help");
}

// Admin Panel operations (Admin Only)
async function openAdminModal() {
    try {
        const response = await fetch("/api/admin/players");
        if (!response.ok) {
            showToast("Access Denied");
            return;
        }
        const data = await response.json();
        renderAdminTable(data.players);
        openModal("modal-admin");
    } catch (err) {
        showToast("Error retrieving administrator list.");
    }
}

function renderAdminTable(players) {
    const body = document.getElementById("admin-table-body");
    body.innerHTML = "";
    players.forEach(p => {
        const tr = document.createElement("tr");
        
        // Status toggle button
        const toggleBtnText = p.status === "active" ? "Disable" : "Enable";
        const targetStatus = p.status === "active" ? "disabled" : "active";
        
        tr.innerHTML = `
            <td><strong>${p.username}</strong></td>
            <td>${p.role}</td>
            <td><span style="color:${p.status === 'active' ? '#10b981' : '#f59e0b'}">${p.status}</span></td>
            <td>
                <button class="btn-premium" onclick="renamePlayerAdmin('${p.username}')">Rename</button>
                <button class="btn-premium" onclick="updatePlayerAdmin('${p.username}', '${targetStatus}', null)" style="margin-left:6px;">${toggleBtnText}</button>
                <button class="btn-premium" onclick="removePlayerAdmin('${p.username}')" style="background:#ef4444; border-color:#ef4444; margin-left:6px;">Remove</button>
            </td>
        `;
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
    try {
        const response = await fetch(`/api/admin/players/${username}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ username: trimmed })
        });
        const data = await response.json();
        if (response.ok) {
            showToast("Player renamed successfully");
            const res = await fetch("/api/admin/players");
            const refreshData = await res.json();
            renderAdminTable(refreshData.players);
        } else {
            showToast(data.error || "Failed to rename player");
        }
    } catch (err) {
        showToast("Error renaming player");
    }
}

async function updatePlayerAdmin(username, status, role) {
    try {
        const payload = {};
        if (status) payload.status = status;
        if (role) payload.role = role;
        
        const response = await fetch(`/api/admin/players/${username}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        
        if (response.ok) {
            showToast("Player updated successfully");
            // Refresh table
            const res = await fetch("/api/admin/players");
            const data = await res.json();
            renderAdminTable(data.players);
        }
    } catch (err) {}
}

async function removePlayerAdmin(username) {
    if (!confirm(`Are you sure you want to remove player "${username}"?`)) return;
    try {
        const response = await fetch(`/api/admin/players/${username}`, {
            method: "DELETE"
        });
        if (response.ok) {
            showToast("Player removed successfully");
            const res = await fetch("/api/admin/players");
            const data = await res.json();
            renderAdminTable(data.players);
        }
    } catch (err) {}
}
