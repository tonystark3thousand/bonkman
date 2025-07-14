// ==================================================================
// GAME SETUP
// ==================================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const levelPopup = document.getElementById('level-popup');
const popupLevelNumberEl = document.getElementById('popup-level-number');

// Audio elements
const sounds = {
    eatCoin: document.getElementById('eat-coin-sound'),
    death: document.getElementById('death-sound'),
    powerup: document.getElementById('powerup-sound'),
    gameOver: document.getElementById('game-over-sound'),
    levelUp: document.getElementById('level-up-sound')
};

const TILE_SIZE = 20;
let currentLevel = 1;
let score = 0;
let isGamePaused = true;

// ==================================================================
// ASSET LOADING (Images)
// ==================================================================
const bonkmanImg = new Image();
const malletRedImg = new Image();
const malletBlueImg = new Image();
const malletGreenImg = new Image();
const coinImg = new Image();
const powerUpImg = new Image();

const malletImages = {
    red: malletRedImg,
    blue: malletBlueImg,
    green: malletGreenImg,
};

// ==================================================================
// LEVEL DATA
// ==================================================================
const levels = [
    // Level 1
    [
        "####################",
        "#P C  C  #  C  C U#",
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
    // Level 2
    [
        "####################",
        "#PUC  C   C  C  C U#",
        "# C# # #C# # C# # #C#",
        "#  C  C  #  C  C   #",
        "##### ##   ## #####",
        "#   C  C# #C  C   #",
        "# C# #C  C  C# # C#",
        "#U C# #     # #C  #",
        "# C# #C  C  C# # C#",
        "#   C  C# #C  C   #",
        "##### ##   ## #####",
        "#  C  C  #  C  C   #",
        "# C# # #C# # C# # #C#",
        "#PUC  C   C  C  C U#",
        "####################",
    ],
];

let map = [];
let bonkman;
let mallets = [];
let coins = [];
let powerUps = [];

// ==================================================================
// GAME CLASSES
// ==================================================================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.direction = { x: 0, y: 0 };
    }
    draw() {
        ctx.drawImage(bonkmanImg, this.x * TILE_SIZE, this.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    move() {
        const nextX = this.x + this.direction.x;
        const nextY = this.y + this.direction.y;
        if (map[nextY] && map[nextY][nextX] !== '#') {
            this.x = nextX;
            this.y = nextY;
        }
    }
}

class Mallet {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
    }
    draw() {
        ctx.drawImage(malletImages[this.color], this.x * TILE_SIZE, this.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    move() {
        const dx = bonkman.x - this.x;
        const dy = bonkman.y - this.y;
        let moveX = 0;
        let moveY = 0;
        if (Math.abs(dx) > Math.abs(dy)) {
            moveX = Math.sign(dx);
        } else {
            moveY = Math.sign(dy);
        }
        const nextX = this.x + moveX;
        const nextY = this.y + moveY;
        if (map[nextY] && map[nextY][nextX] !== '#') {
            this.x = nextX;
            this.y = nextY;
        }
    }
}

class Coin {
    constructor(x, y) { this.x = x; this.y = y; }
    draw() { ctx.drawImage(coinImg, this.x * TILE_SIZE, this.y * TILE_SIZE, TILE_SIZE, TILE_SIZE); }
}

class PowerUp {
    constructor(x, y) { this.x = x; this.y = y; }
    draw() { ctx.drawImage(powerUpImg, this.x * TILE_SIZE, this.y * TILE_SIZE, TILE_SIZE, TILE_SIZE); }
}

// ==================================================================
// GAME LOGIC
// ==================================================================
function playSound(sound) {
    sound.currentTime = 0;
    sound.play().catch(e => console.error("Audio play failed:", e));
}

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
            if (char === 'P') playerSpawns.push({ x, y });
            else if (char === 'C') coins.push(new Coin(x, y));
            else if (char === 'U') powerUps.push(new PowerUp(x, y));
        }
    }
    bonkman = new Player(playerSpawns[0].x, playerSpawns[0].y);
    bonkman.direction = {x: 0, y: 0};

    if (levelNumber >= 1) mallets.push(new Mallet(9, 7, 'red'));
    if (levelNumber >= 2) mallets.push(new Mallet(10, 7, 'blue'));
    if (levelNumber >= 3) mallets.push(new Mallet(11, 7, 'green'));

    levelEl.textContent = currentLevel;
    scoreEl.textContent = score;
}

function update() {
    if (isGamePaused) return;

    bonkman.move();
    mallets.forEach(mallet => mallet.move());

    coins = coins.filter(coin => {
        if (coin.x === bonkman.x && coin.y === bonkman.y) {
            score += 10;
            playSound(sounds.eatCoin);
            return false;
        }
        return true;
    });

    powerUps = powerUps.filter(powerUp => {
        if (powerUp.x === bonkman.x && powerUp.y === bonkman.y) {
            score += 50;
            playSound(sounds.powerup);
            return false;
        }
        return true;
    });

    mallets.forEach(mallet => {
        if (mallet.x === bonkman.x && mallet.y === bonkman.y) {
            playSound(sounds.death);
            handleGameOver();
        }
    });

    if (coins.length === 0) {
        currentLevel++;
        if (currentLevel > levels.length) {
            alert('You Win!');
            resetGame();
        } else {
            playSound(sounds.levelUp);
            // FIX: Load the new level data FIRST, then show the pop-up
            loadLevel(currentLevel);
            showLevelPopup();
        }
    }

    scoreEl.textContent = score;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            if (map[y][x] === '#') {
                ctx.fillStyle = 'blue';
                ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
            }
        }
    }
    coins.forEach(coin => coin.draw());
    powerUps.forEach(powerUp => powerUp.draw());
    bonkman.draw();
    mallets.forEach(mallet => mallet.draw());
}

function gameLoop() {
    update();
    draw();
    requestAnimationFrame(gameLoop);
}

function handleGameOver() {
    isGamePaused = true;
    playSound(sounds.gameOver);
    alert('Game Over!');
    resetGame();
}

function resetGame() {
    currentLevel = 1;
    score = 0;
    loadLevel(currentLevel); // Load the level
    showLevelPopup();        // Then show the popup
}

// FIX: This function no longer loads the level, just manages the UI
function showLevelPopup() {
    isGamePaused = true;
    popupLevelNumberEl.textContent = currentLevel;
    levelPopup.classList.remove('hidden');
    setTimeout(() => {
        levelPopup.classList.add('hidden');
        isGamePaused = false;
    }, 2500);
}

window.addEventListener('keydown', (e) => {
    if (isGamePaused) return;
    if (e.key === 'ArrowUp') bonkman.direction = { x: 0, y: -1 };
    else if (e.key === 'ArrowDown') bonkman.direction = { x: 0, y: 1 };
    else if (e.key === 'ArrowLeft') bonkman.direction = { x: -1, y: 0 };
    else if (e.key === 'ArrowRight') bonkman.direction = { x: 1, y: 0 };
});

// ==================================================================
// INITIALIZATION AND PRELOADER
// ==================================================================
function preloadAssets() {
    const assetPromises = [];
    const imagesToLoad = [
        { img: bonkmanImg, src: 'assets/bonkman.png' }, { img: malletRedImg, src: 'assets/mallet_red.png' },
        { img: malletBlueImg, src: 'assets/mallet_blue.png' }, { img: malletGreenImg, src: 'assets/mallet_green.png' },
        { img: coinImg, src: 'assets/coin.png' }, { img: powerUpImg, src: 'assets/powerup.png' }
    ];
    imagesToLoad.forEach(item => {
        assetPromises.push(new Promise((resolve, reject) => {
            item.img.src = item.src;
            item.img.onload = resolve;
            item.img.onerror = () => reject(`${item.src} failed to load.`);
        }));
    });
    return Promise.all(assetPromises);
}

// ---- Main entry point ----
async function main() {
    // Show a "Loading" message first
    ctx.fillStyle = 'white';
    ctx.font = '20px "Press Start 2P"';
    ctx.textAlign = 'center';
    ctx.fillText('Loading...', 200, 150);

    try {
        await preloadAssets();
        // FIX: THE CORRECT STARTUP SEQUENCE
        // 1. Load level 1 data first to create bonkman and other objects
        loadLevel(currentLevel);
        // 2. Show the pop-up (game is paused by default)
        showLevelPopup();
        // 3. Start the game loop. It will wait until the popup is done.
        requestAnimationFrame(gameLoop);
    } catch (error) {
        console.error(error);
        alert(`Error loading assets: ${error}. Please check the console.`);
    }
}

main(); // Run the main function to start the game