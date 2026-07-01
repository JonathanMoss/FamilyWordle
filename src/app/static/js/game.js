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
    isBotPlaying: false,
    gameState: "not_started", // 'not_started', 'playing', 'won', 'lost', 'expired'
    currentRow: 0,
    currentTile: 0,
    boardState: Array(GAME_CONFIG.MAX_ROWS).fill(""), // letters entered in rows
    guessesHistory: [], // [{word: '...', feedback: [...]}]
    timerInterval: null
};

// Helper to reset appState
function resetAppState() {
    stopBotSolve();
    appState.currentRow = 0;
    appState.currentTile = 0;
    appState.boardState = Array(GAME_CONFIG.MAX_ROWS).fill("");
    appState.guessesHistory = [];
    if (appState.timerInterval) {
        clearInterval(appState.timerInterval);
        appState.timerInterval = null;
    }
}

// Sound Effects State & Synthesis
let audioCtx = null;
let isMuted = localStorage.getItem("sound_muted") === "true";

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

function playSound(type) {
    if (isMuted) return;
    try {
        const ctx = getAudioContext();
        const now = ctx.currentTime;
        
        switch (type) {
            case "keypress": {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(180, now);
                osc.frequency.exponentialRampToValueAtTime(80, now + 0.05);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.05);
                break;
            }
            case "delete": {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(140, now);
                osc.frequency.exponentialRampToValueAtTime(60, now + 0.05);
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.05);
                break;
            }
            case "shake": {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                const filter = ctx.createBiquadFilter();
                osc.type = "sawtooth";
                osc.frequency.setValueAtTime(90, now);
                osc.frequency.linearRampToValueAtTime(80, now + 0.15);
                filter.type = "lowpass";
                filter.frequency.setValueAtTime(300, now);
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.linearRampToValueAtTime(0.001, now + 0.15);
                osc.connect(filter);
                filter.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            }
            case "correct": {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(659.25, now); // E5
                gain.gain.setValueAtTime(0.07, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.2);
                break;
            }
            case "present": {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(440.00, now); // A4
                gain.gain.setValueAtTime(0.06, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.18);
                break;
            }
            case "absent": {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(174.61, now); // F3
                gain.gain.setValueAtTime(0.05, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.15);
                break;
            }
            case "win": {
                const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
                notes.forEach((freq, idx) => {
                    const time = now + idx * 0.1;
                    const osc = ctx.createOscillator();
                    const gain = ctx.createGain();
                    osc.type = "sine";
                    osc.frequency.setValueAtTime(freq, time);
                    gain.gain.setValueAtTime(0.06, time);
                    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);
                    osc.connect(gain);
                    gain.connect(ctx.destination);
                    osc.start(time);
                    osc.stop(time + 0.35);
                });
                break;
            }
            case "lost": {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "triangle";
                osc.frequency.setValueAtTime(220, now);
                osc.frequency.linearRampToValueAtTime(110, now + 0.6);
                gain.gain.setValueAtTime(0.08, now);
                gain.gain.exponentialRampToValueAtTime(0.001, now + 0.6);
                osc.connect(gain);
                gain.connect(ctx.destination);
                osc.start(now);
                osc.stop(now + 0.6);
                break;
            }
        }
    } catch (e) {
        console.warn("Audio playback failed:", e);
    }
}

function updateSoundUI() {
    const btn = document.getElementById("btn-toggle-sound");
    if (btn) {
        btn.innerHTML = isMuted ? "🔇 Muted" : "🔊 Sound";
    }
}

function toggleSound() {
    isMuted = !isMuted;
    localStorage.setItem("sound_muted", isMuted);
    updateSoundUI();
    if (!isMuted) {
        playSound("keypress");
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
    updateSoundUI();
    
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
    if (sessionStorage.getItem("is_demo_mode") === "true") {
        loadDemoGame();
    } else {
        const result = await apiRequest("/api/game/state");
        if (result.ok) {
            // User is signed in!
            updateNavActions("Player", "player"); // default fallback, will correct on stats call
            loadActiveGame();
        }
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
    
    
    // Render Clues
    const clueContainer = document.getElementById("clue-container");
    const clueText = document.getElementById("clue-text");
    if (clueContainer && clueText) {
        if (data.clue) {
            clueText.innerText = data.clue;
            clueContainer.style.display = "block";
        } else {
            clueContainer.style.display = "none";
        }
    }

    const clueSubmitContainer = document.getElementById("clue-submit-container");
    if (clueSubmitContainer) {
        if (data.status === "won" && data.is_first_solver && !data.clue) {
            clueSubmitContainer.style.display = "block";
            const inputClue = document.getElementById("input-clue");
            if (inputClue) inputClue.value = "";
        } else {
            clueSubmitContainer.style.display = "none";
        }
    }

    // Render Definition
    const defContainer = document.getElementById("definition-container");
    const defText = document.getElementById("definition-text");
    const defContent = document.getElementById("definition-content");
    const defBtn = document.getElementById("btn-toggle-definition");
    if (defContainer && defText) {
        if (data.definition) {
            defText.innerText = data.definition;
            defContainer.style.display = "block";
            if (defContent) defContent.style.display = "none";
            if (defBtn) defBtn.innerText = "📖 See Word Definition";
        } else {
            defContainer.style.display = "none";
        }
    }

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
    if (appState.isBotPlaying) return;
    
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
    if (appState.isBotPlaying) return;
    
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
    
    playSound("keypress");
    
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
    
    playSound("delete");
    
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
        playSound("win");
        const clueSubmitContainer = document.getElementById("clue-submit-container");
        if (clueSubmitContainer && data.is_first_solver) {
            clueSubmitContainer.style.display = "block";
            const inputClue = document.getElementById("input-clue");
            if (inputClue) inputClue.value = "";
        }
    } else if (data.status === "lost") {
        showToast(`Game Over. Word was: ${data.target_word}`);
        playSound("lost");
    }

    const shareContainer = document.getElementById("game-over-container");
    if (shareContainer && (data.status === "won" || data.status === "lost")) {
        shareContainer.style.display = "block";
    }

    // Reveal Definition if available
    const defContainer = document.getElementById("definition-container");
    const defText = document.getElementById("definition-text");
    const defContent = document.getElementById("definition-content");
    const defBtn = document.getElementById("btn-toggle-definition");
    if (defContainer && defText) {
        if (data.definition) {
            defText.innerText = data.definition;
            defContainer.style.display = "block";
            if (defContent) defContent.style.display = "none";
            if (defBtn) defBtn.innerText = "📖 See Word Definition";
        } else {
            defContainer.style.display = "none";
        }
    }
}

function shakeRow(rowIdx) {
    playSound("shake");
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
                tile.classList.remove("pop");
                tile.classList.add(feedbackClass);
                updateKeyboardColors(char, [feedbackClass]);
                playSound(feedbackClass);
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
async function startDemoMode() {
    sessionStorage.setItem("is_demo_mode", "true");
    // Explicitly reset standard demo mode to a random word
    await apiRequest("/api/game/demo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: "RANDOM", date: null })
    });
    loadDemoGame();
}

async function startReplayGame(word, date) {
    sessionStorage.setItem("is_demo_mode", "true");
    const result = await apiRequest("/api/game/demo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word, date })
    });
    if (result.ok) {
        closeModal("modal-archive");
        loadDemoGame();
    } else {
        showToast(result.error);
    }
}

async function loadDemoGame() {
    const result = await apiRequest("/api/game/demo/state");
    if (!result.ok) {
        sessionClearUI();
        return;
    }
    const data = result.data;
    
    resetGridUI();
    appState.isDemoMode = true;
    appState.gameState = data.status;
    appState.currentRow = data.attempts_used;
    appState.guessesHistory = data.guesses;
    
    const banner = document.getElementById("game-mode-banner");
    if (banner) {
        if (data.date) {
            const dateParts = data.date.split('-');
            const formattedDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : data.date;
            banner.innerText = `REPLAY: ${formattedDate}`;
            banner.className = "banner-demo";
        } else {
            banner.innerText = "DEMO MODE";
            banner.className = "banner-demo";
        }
        banner.style.background = ""; // Clear inline background style to fallback on CSS classes
    }
    const exitContainer = document.getElementById("demo-exit-container");
    if (exitContainer) {
        exitContainer.style.display = "block";
    }
    const timerElement = document.getElementById("game-timer");
    if (timerElement) {
        timerElement.innerText = "Practice Mode";
    }
    
    // Populate previous guesses
    appState.guessesHistory.forEach((g, idx) => {
        renderRowWithFeedback(idx, g.word, g.feedback);
        updateKeyboardColors(g.word, g.feedback);
    });
    
    
    // Hide daily clue/definition containers in demo mode
    const clueContainer = document.getElementById("clue-container");
    const clueSubmitContainer = document.getElementById("clue-submit-container");
    const defContainer = document.getElementById("definition-container");
    if (clueContainer) clueContainer.style.display = "none";
    if (clueSubmitContainer) clueSubmitContainer.style.display = "none";
    if (defContainer) defContainer.style.display = "none";

    showView("game-view");
}

async function exitDemoMode() {
    stopBotSolve();
    sessionStorage.removeItem("is_demo_mode");
    const result = await apiRequest("/api/game/state");
    if (result.ok) {
        loadActiveGame();
    } else {
        sessionClearUI();
    }
}

async function resetDemoMode() {
    stopBotSolve();
    const result = await apiRequest("/api/game/demo/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: "RANDOM", date: null })
    });
    if (result.ok) {
        loadDemoGame();
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
                
                // Format YYYY-MM-DD to DD-MM-YYYY
                const dateParts = w.date.split('-');
                const formattedDate = dateParts.length === 3 ? `${dateParts[2]}-${dateParts[1]}-${dateParts[0]}` : w.date;
                
                const dateSpan = document.createElement("span");
                dateSpan.textContent = `📅 ${formattedDate}`;
                
                const rightContainer = document.createElement("div");
                rightContainer.style.display = "flex";
                rightContainer.style.alignItems = "center";
                rightContainer.style.gap = "12px";
                
                const wordSpan = document.createElement("span");
                wordSpan.className = "archive-word blurred";
                wordSpan.title = "Hover or tap to reveal";
                const wordStrong = document.createElement("strong");
                wordStrong.textContent = w.word;
                wordSpan.appendChild(wordStrong);
                
                // Clicking manually toggles blur on mobile
                wordSpan.addEventListener("click", () => {
                    wordSpan.classList.toggle("blurred");
                });
                
                const playBtn = document.createElement("button");
                playBtn.className = "btn-premium";
                playBtn.style.padding = "4px 8px";
                playBtn.style.fontSize = "0.8rem";
                playBtn.textContent = "Play";
                playBtn.addEventListener("click", () => startReplayGame(w.word, w.date));
                
                rightContainer.appendChild(wordSpan);
                rightContainer.appendChild(playBtn);
                
                div.appendChild(dateSpan);
                div.appendChild(rightContainer);
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
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(() => {
            showToast("Result copied to clipboard! 🟩🟨⬛");
        }).catch(err => {
            showToast("Failed to copy results.");
            console.error(err);
        });
    } else {
        // Fallback for non-secure contexts (HTTP)
        const textarea = document.createElement("textarea");
        textarea.value = text;
        textarea.style.position = "fixed";
        textarea.style.top = "-9999px";
        document.body.appendChild(textarea);
        textarea.select();
        try {
            document.execCommand("copy");
            showToast("Result copied to clipboard! 🟩🟨⬛");
        } catch (err) {
            showToast("Failed to copy results.");
            console.error(err);
        }
        document.body.removeChild(textarea);
    }
}

// ==========================================
// Spectator Bot Autoplay (Option A)
// ==========================================

function evaluateFeedbackForBot(guess, target) {
    guess = guess.toUpperCase();
    target = target.toUpperCase();
    const feedback = Array(5).fill("absent");
    const targetMatched = Array(5).fill(false);
    const guessMatched = Array(5).fill(false);

    // Green pass
    for (let i = 0; i < 5; i++) {
        if (guess[i] === target[i]) {
            feedback[i] = "correct";
            targetMatched[i] = true;
            guessMatched[i] = true;
        }
    }

    // Yellow pass
    for (let i = 0; i < 5; i++) {
        if (guessMatched[i]) continue;
        for (let j = 0; j < 5; j++) {
            if (!targetMatched[j] && guess[i] === target[j]) {
                feedback[i] = "present";
                targetMatched[j] = true;
                break;
            }
        }
    }
    return feedback;
}

let botSolveTimeout = null;

async function startBotSolve() {
    appState.isBotPlaying = true;
    
    // Clear any half-entered characters in current row
    while (appState.currentTile > 0) {
        deleteInputChar();
    }
    
    // Add disabled class to keyboard for visual styling
    const keyboardEl = document.getElementById("keyboard");
    if (keyboardEl) {
        keyboardEl.classList.add("keyboard-disabled");
    }
    
    // Update button styling/text
    const btn = document.getElementById("btn-bot-play");
    if (btn) {
        btn.innerText = "Stop Bot";
        btn.classList.add("btn-danger");
    }

    // Show status panel
    const statusPanel = document.getElementById("bot-status-panel");
    const statusText = document.getElementById("bot-status-text");
    if (statusPanel) statusPanel.style.display = "block";
    if (statusText) statusText.innerText = "Bot is initializing...";

    // Fetch dictionary if not already cached
    if (!appState.cachedDictionary) {
        if (statusText) statusText.innerText = "Fetching word list...";
        const res = await apiRequest("/api/game/dictionary");
        if (!res.ok) {
            if (statusText) statusText.innerText = "Error loading word list: " + res.error;
            stopBotSolve();
            return;
        }
        appState.cachedDictionary = res.data.words;
    }

    // Initialize candidates
    appState.botCandidates = [...appState.cachedDictionary];
    
    botSolveStep();
}

function stopBotSolve() {
    appState.isBotPlaying = false;
    if (botSolveTimeout) {
        clearTimeout(botSolveTimeout);
        botSolveTimeout = null;
    }
    
    const keyboardEl = document.getElementById("keyboard");
    if (keyboardEl) {
        keyboardEl.classList.remove("keyboard-disabled");
    }
    
    const btn = document.getElementById("btn-bot-play");
    if (btn) {
        btn.innerText = "Watch Bot Solve";
        btn.classList.remove("btn-danger");
    }
    
    const statusPanel = document.getElementById("bot-status-panel");
    if (statusPanel) {
        statusPanel.style.display = "none";
    }
}

function toggleBotPlay() {
    if (appState.isBotPlaying) {
        stopBotSolve();
    } else {
        startBotSolve();
    }
}

async function botSolveStep() {
    if (!appState.isBotPlaying) return;
    
    const statusText = document.getElementById("bot-status-text");
    
    // Check if game is already complete
    if (appState.gameState === "won" || appState.gameState === "lost") {
        if (statusText) {
            statusText.innerText = appState.gameState === "won" 
                ? "Bot solved the puzzle successfully! 🎉" 
                : "Bot run complete.";
        }
        // Stop playing but keep status visible for feedback
        appState.isBotPlaying = false;
        const btn = document.getElementById("btn-bot-play");
        if (btn) {
            btn.innerText = "Watch Bot Solve";
            btn.classList.remove("btn-danger");
        }
        const keyboardEl = document.getElementById("keyboard");
        if (keyboardEl) {
            keyboardEl.classList.remove("keyboard-disabled");
        }
        return;
    }

    if (appState.currentRow >= GAME_CONFIG.MAX_ROWS) {
        if (statusText) statusText.innerText = "No attempts remaining.";
        stopBotSolve();
        return;
    }

    // Filter candidates based on guessesHistory
    let candidates = [...appState.cachedDictionary];
    appState.guessesHistory.forEach(g => {
        candidates = candidates.filter(cand => {
            const feed = evaluateFeedbackForBot(g.word, cand);
            return feed.every((val, idx) => val === g.feedback[idx]);
        });
    });

    if (candidates.length === 0) {
        if (statusText) statusText.innerText = "No matching words left in dictionary!";
        stopBotSolve();
        return;
    }

    // Pick best word
    let nextWord = "";
    if (candidates.length === appState.cachedDictionary.length) {
        // High quality starter words to speed up computation
        nextWord = candidates.includes("CRANE") ? "CRANE" : candidates[0];
    } else if (candidates.length === 1) {
        nextWord = candidates[0];
    } else {
        // Compute letter frequencies in remaining candidates
        const freq = {};
        candidates.forEach(cand => {
            const uniqueChars = new Set(cand);
            uniqueChars.forEach(char => {
                freq[char] = (freq[char] || 0) + 1;
            });
        });
        
        let bestScore = -1;
        candidates.forEach(cand => {
            const uniqueChars = new Set(cand);
            let score = 0;
            uniqueChars.forEach(char => {
                score += freq[char] || 0;
            });
            if (score > bestScore) {
                bestScore = score;
                nextWord = cand;
            }
        });
    }

    if (statusText) {
        statusText.innerText = `Bot is typing: ${nextWord} (Candidates remaining: ${candidates.length})`;
    }

    // Emulate typing
    await emulateTyping(nextWord);
    
    if (!appState.isBotPlaying) return;

    // Submit guess
    if (statusText) {
        statusText.innerText = `Bot submitting: ${nextWord}...`;
    }
    
    await submitInputGuess();
    
    if (!appState.isBotPlaying) return;

    // Schedule next guess after a short delay (e.g. 1.2 seconds) to let row animations finish
    botSolveTimeout = setTimeout(botSolveStep, 1200);
}

function emulateTyping(word) {
    return new Promise((resolve) => {
        let index = 0;
        function typeChar() {
            if (!appState.isBotPlaying) {
                resolve();
                return;
            }
            if (index < word.length) {
                addInputChar(word[index]);
                index++;
                setTimeout(typeChar, 150);
            } else {
                resolve();
            }
        }
        typeChar();
    });
}

async function submitClue() {
    const inputClue = document.getElementById("input-clue");
    if (!inputClue) return;
    const clueTextVal = inputClue.value.trim();

    if (!clueTextVal) {
        showToast("Clue cannot be empty");
        return;
    }

    if (clueTextVal.length > 100) {
        showToast("Clue must be 100 characters or less");
        return;
    }

    const result = await apiRequest("/api/game/clue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clue: clueTextVal })
    });

    if (!result.ok) {
        showToast(result.error);
        return;
    }

    showToast("Clue submitted successfully!");

    // Hide clue submit box
    const clueSubmitContainer = document.getElementById("clue-submit-container");
    if (clueSubmitContainer) {
        clueSubmitContainer.style.display = "none";
    }

    // Show clue banner with the submitted text
    const clueContainer = document.getElementById("clue-container");
    const clueText = document.getElementById("clue-text");
    if (clueContainer && clueText) {
        clueText.innerText = clueTextVal;
        clueContainer.style.display = "block";
    }
}

function toggleDefinition() {
    const content = document.getElementById("definition-content");
    const btn = document.getElementById("btn-toggle-definition");
    if (!content || !btn) return;
    if (content.style.display === "none") {
        content.style.display = "block";
        btn.innerText = "📕 Hide Definition";
    } else {
        content.style.display = "none";
        btn.innerText = "📖 See Word Definition";
    }
}
