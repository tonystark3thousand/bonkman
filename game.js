// Game Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');

// NEW: Get pop-up elements
const levelPopup = document.getElementById('level-popup');
const popupLevelNumberEl = document.getElementById('popup-level-number');

// NEW: Get audio elements
const eatCoinSound = document.getElementById('eat-coin-sound');
const deathSound = document.getElementById('death-sound');
const powerupSound = document.getElementById('powerup-sound');
const gameOverSound = document.getElementById('game-over-sound');
const levelUpSound = document.getElementById('level-up-sound');

const TILE_SIZE = 20;
let currentLevel = 1;
let score = 0;
let isGamePaused = false; // NEW: To pause game during pop-up

// Game Assets
// ... (Image loading remains the same)
const bonkmanImg = new Image();
bonkmanImg.src = 'assets/bonkman.png';

const malletImages = {
    red: new Image(),
    blue: new Image(),
    green: new Image(),
};
malletImages.red.src = 'assets/mallet_red.png';
malletImages.blue.src = 'assets/mallet_blue.png';
malletImages.green.src = 'assets/mallet_green.png';

const coinImg = new Image();
coinImg.src = 'assets/coin.png';

const powerUpImg = new Image();
powerUpImg.src = 'assets/powerup.png';

// Level Data (You can expand this to 25 levels)
const levels = [
    // Level 1
    [
        "####################",
        "#P C  C  #  C  C U#", // U is now PowerUp
        "# C ## C # C ## C #",
        "#  C  C  C  C  C  #",
        "####################",
        "#  C ## C # C ## C  #",
        "# C  C  C C C  C C #",
        "#  C  C  #  C  C  #",
        "# C  C  C C C  C C #",
        "#  C ## C # C ## C  #",
        "####################",
        "#  C  C  C  C  C  #",
        "# C ## C # C ## C #",
        "#U C  C  #  C  C P#",
        "####################",
    ],
    // Level 2 (with dead ends)
    [
        "####################",
        "#P C  C   C  C  C U#",
        "# C# # #C# # C# # # C#",
        "#  C  C  #  C  C   #",
        "##### ##   ## #####",
        "#   C  C# #C  C   #",
        "# C# #C  C  C# # C#",
        "#U C# #     # #C  #",
        "# C# #C  C  C# # C#",
        "#   C  C# #C  C   #",
        "##### ##   ## #####",
        "#  C  C  #  C  C   #",
        "# C# # #C# # C# # # C#",
        "#P C  C   C  C  C U#",
        "####################",
    ],
    // Add more levels here...
];

let map = [];
let bonkman;
let mallets = [];
let coins = [];
let powerUps = [];

// ... (Player, Mallet, Coin, PowerUp classes remain mostly the same)
class Player { /* ... no changes ... */ }
class Mallet { /* ... no changes ... */ }
class Coin { /* ... no changes ... */ }
class PowerUp { /* ... no changes ... */ }

// NEW: Helper function to play sound from the beginning
function playSound(sound) {
    sound.currentTime = 0;
    sound.play();
}

// Game Logic
function loadLevel(levelNumber) {
    const levelData = levels[levelNumber - 1];
    map = levelData.map(row => row.split(''));

    canvas.width = map[0].length * TILE_SIZE;
    canvas.height = map.length * TILE_SIZE;

    coins = [];
    powerUps = [];
    mallets = [];
    let playerSpawns = [];

    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            const char = map[y][x];
            if (char === 'P') {
                playerSpawns.push({ x, y });
            } else if (char === 'C') {
                coins.push(new Coin(x, y));
            } else if (char === 'U') { // Changed from T to U
                powerUps.push(new PowerUp(x, y));
            }
        }
    }
    bonkman = new Player(playerSpawns[0].x, playerSpawns[0].y);
    
    // Add mallets based on level
    if (levelNumber >= 1) mallets.push(new Mallet(9, 7, 'red'));
    if (levelNumber >= 2) mallets.push(new Mallet(10, 7, 'blue'));
    if (levelNumber >= 3) mallets.push(new Mallet(11, 7, 'green'));

    levelEl.textContent = currentLevel;
    scoreEl.textContent = score;
}

function update() {
    if (isGamePaused) return; // NEW: Stop game logic if paused

    bonkman.move();
    mallets.forEach(mallet => mallet.move());

    // Collision detection
    coins = coins.filter(coin => {
        if (coin.x === bonkman.x && coin.y === bonkman.y) {
            score += 10;
            playSound(eatCoinSound); // NEW: Play coin sound
            return false;
        }
        return true;
    });

    powerUps = powerUps.filter(powerUp => {
        if (powerUp.x === bonkman.x && powerUp.y === bonkman.y) {
            score += 50;
            playSound(powerupSound); // NEW: Play powerup sound
            // Add power-up effect (e.g., make mallets vulnerable)
            return false;
        }
        return true;
    });

    mallets.forEach(mallet => {
        if (mallet.x === bonkman.x && mallet.y === bonkman.y) {
            playSound(deathSound); // NEW: Play death sound
            handleGameOver();
        }
    });

    if (coins.length === 0) {
        currentLevel++;
        if (currentLevel > levels.length) {
            alert('You Win!');
            resetGame();
        } else {
            playSound(levelUpSound); // NEW: Play level up sound
            showLevelPopup(currentLevel);
        }
    }

    scoreEl.textContent = score;
    draw();
}

function draw() {
    // ... (Drawing logic remains the same)
}

function handleGameOver() {
    isGamePaused = true;
    playSound(gameOverSound);
    alert('Game Over!');
    resetGame();
}

function resetGame() {
    currentLevel = 1;
    score = 0;
    showLevelPopup(currentLevel); // NEW: Start game with popup
}

// NEW: Function to show the level up pop-up
function showLevelPopup(level) {
    isGamePaused = true;
    popupLevelNumberEl.textContent = level;
    levelPopup.classList.remove('hidden');

    setTimeout(() => {
        levelPopup.classList.add('hidden');
        loadLevel(level);
        isGamePaused = false;
    }, 2500); // Show popup for 2.5 seconds
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    if (isGamePaused) return;
    // ... (Key handling remains the same)
});

// Start Game
showLevelPopup(currentLevel); // NEW: Start with the popup instead of directly loading
setInterval(update, 100);