// ==================================================================
// GAME SETUP
// ==================================================================
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');
const levelPopup = document.getElementById('level-popup');
const popupLevelNumberEl = document.getElementById('popup-level-number');

const sounds = { /* ... sounds setup ... */ }; // (Assuming sounds are set up as before)

const TILE_SIZE = 20;
let currentLevel = 1;
let score = 0;
let isGamePaused = true;

const images = { // Pre-declare for the preloader
    bonkman: new Image(),
    malletRed: new Image(),
    malletBlue: new Image(),
    malletGreen: new Image(),
    coin: new Image(),
    powerUp: new Image(),
    malletFrightened: new Image() // NEW: For frightened state
};

// ==================================================================
// LEVEL DATA & GAME STATE
// ==================================================================
const levels = [ /* ... your level data ... */ ]; // (Level data remains the same)
let map = [];
let bonkman;
let enemies = []; // Renamed from mallets for clarity
let coins = [];
let powerUps = [];

// NEW: AI State Management
let chaseScatterTimer = 0;
const chaseDuration = 20 * 1000; // 20 seconds
const scatterDuration = 7 * 1000; // 7 seconds

// ==================================================================
// GAME CLASSES
// ==================================================================
class Player {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.direction = { x: 0, y: 0 };
        this.lastDirection = { x: 1, y: 0 }; // For Pinky's AI
    }
    draw() {
        ctx.drawImage(images.bonkman, this.x * TILE_SIZE, this.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
    move() {
        const nextX = this.x + this.direction.x;
        const nextY = this.y + this.direction.y;
        if (map[nextY] && map[nextY][nextX] !== '#') {
            this.x = nextX;
            this.y = nextY;
            if (this.direction.x !== 0 || this.direction.y !== 0) {
                this.lastDirection = this.direction;
            }
        }
    }
}

class Enemy {
    constructor(x, y, color, scatterTarget) {
        this.x = x;
        this.y = y;
        this.startX = x;
        this.startY = y;
        this.color = color;
        this.state = 'scatter'; // 'chase', 'scatter', 'frightened', 'eaten'
        this.direction = { x: -1, y: 0 }; // Start moving left
        this.targetTile = { x: scatterTarget.x, y: scatterTarget.y };
        this.scatterTarget = scatterTarget;
        this.frightenedTimer = 0;
    }

    getImage() {
        if (this.state === 'frightened') {
             // Make it flash when time is low
            return this.frightenedTimer < 3000 && Math.floor(this.frightenedTimer / 250) % 2 === 0 ? images.malletFrightened : images.malletBlue;
        }
        if (this.state === 'eaten') return null; // Or an "eyes" image
        return images[`mallet${this.color.charAt(0).toUpperCase() + this.color.slice(1)}`];
    }

    draw() {
        const img = this.getImage();
        if (img) {
            ctx.drawImage(img, this.x * TILE_SIZE, this.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
        }
    }

    // NEW: Pathfinding Logic
    move() {
        const possibleMoves = [];
        const { x, y } = this;
        const directions = [{ x: 0, y: -1 }, { x: 0, y: 1 }, { x: -1, y: 0 }, { x: 1, y: 0 }];

        // Don't allow 180 degree turns
        directions.forEach(dir => {
            if (dir.x !== -this.direction.x || dir.y !== -this.direction.y) {
                 if (map[y + dir.y] && map[y + dir.y][x + dir.x] !== '#') {
                    possibleMoves.push(dir);
                 }
            }
        });

        if (possibleMoves.length === 0) { // If stuck, turn around
            this.direction = {x: -this.direction.x, y: -this.direction.y};
            return;
        }
        
        // Find the best move by calculating distance to target
        let bestMove = possibleMoves[0];
        let minDistance = Infinity;

        possibleMoves.forEach(move => {
            const newX = x + move.x;
            const newY = y + move.y;
            const distance = Math.hypot(newX - this.targetTile.x, newY - this.targetTile.y);
            if (distance < minDistance) {
                minDistance = distance;
                bestMove = move;
            }
        });

        this.direction = bestMove;
        this.x += this.direction.x;
        this.y += this.direction.y;
    }
}

// ... Coin and PowerUp classes are the same ...
class Coin { /* ... */ }
class PowerUp { /* ... */ }

// ==================================================================
// GAME LOGIC
// ==================================================================
function playSound(sound) { /* ... */ }

function loadLevel(levelNumber) {
    const levelData = levels[levelNumber - 1];
    map = levelData.map(row => row.split(''));

    canvas.width = map[0].length * TILE_SIZE;
    canvas.height = map.length * TILE_SIZE;

    coins = []; powerUps = []; enemies = [];
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

    // NEW: Create enemies with scatter targets
    const enemySpawns = [
        { x: 9, y: 7, color: 'red', scatter: { x: 18, y: 1 } },   // Top-right
        { x: 10, y: 7, color: 'blue', scatter: { x: 1, y: 1 } },  // Top-left
        { x: 11, y: 7, color: 'green', scatter: { x: 1, y: 13 } } // Bottom-left
    ];

    if (levelNumber >= 1) enemies.push(new Enemy(enemySpawns[0].x, enemySpawns[0].y, enemySpawns[0].color, enemySpawns[0].scatter));
    if (levelNumber >= 2) enemies.push(new Enemy(enemySpawns[1].x, enemySpawns[1].y, enemySpawns[1].color, enemySpawns[1].scatter));
    if (levelNumber >= 3) enemies.push(new Enemy(enemySpawns[2].x, enemySpawns[2].y, enemySpawns[2].color, enemySpawns[2].scatter));
    
    levelEl.textContent = currentLevel;
    scoreEl.textContent = score;
}

// NEW: Main AI Update Function
function updateEnemyAI(enemy) {
    if (enemy.state === 'eaten') {
        enemy.targetTile = { x: enemy.startX, y: enemy.startY };
        if (enemy.x === enemy.startX && enemy.y === enemy.startY) {
            enemy.state = 'chase'; // Respawned
        }
        return;
    }

    if (enemy.state === 'frightened') {
        enemy.targetTile = { x: Math.floor(Math.random() * map[0].length), y: Math.floor(Math.random() * map.length) };
        return;
    }
    
    if (enemy.state === 'scatter') {
        enemy.targetTile = enemy.scatterTarget;
        return;
    }

    // CHASE state logic
    switch (enemy.color) {
        case 'red': // Blinky - targets Bonkman directly
            enemy.targetTile = { x: bonkman.x, y: bonkman.y };
            break;
        case 'blue': // Pinky - targets 4 tiles ahead of Bonkman
            enemy.targetTile = {
                x: bonkman.x + (bonkman.lastDirection.x * 4),
                y: bonkman.y + (bonkman.lastDirection.y * 4)
            };
            break;
        case 'green': // Clyde - targets Bonkman if far, scatters if close
            const distance = Math.hypot(bonkman.x - enemy.x, bonkman.y - enemy.y);
            if (distance > 8) {
                enemy.targetTile = { x: bonkman.x, y: bonkman.y };
            } else {
                enemy.targetTile = enemy.scatterTarget;
            }
            break;
    }
}


function update() {
    if (isGamePaused) return;

    bonkman.move();

    // Update Timers for Chase/Scatter modes
    chaseScatterTimer += 16; // Approx ms per frame
    let currentMode = enemies[0] ? enemies[0].state : 'chase';
    if (currentMode === 'chase' && chaseScatterTimer >= chaseDuration) {
        chaseScatterTimer = 0;
        enemies.forEach(e => e.state = 'scatter');
    } else if (currentMode === 'scatter' && chaseScatterTimer >= scatterDuration) {
        chaseScatterTimer = 0;
        enemies.forEach(e => e.state = 'chase');
    }

    // Update Enemies
    enemies.forEach(enemy => {
        if (enemy.state === 'frightened') {
            enemy.frightenedTimer -= 16;
            if (enemy.frightenedTimer <= 0) {
                enemy.state = 'chase';
            }
        }
        updateEnemyAI(enemy);
        enemy.move();
    });

    // Collision Detection
    // ... coin collision logic is the same ...
    powerUps = powerUps.filter(powerUp => {
        if (powerUp.x === bonkman.x && powerUp.y === bonkman.y) {
            score += 50;
            // playSound(sounds.powerup);
            // NEW: Frighten all enemies
            enemies.forEach(enemy => {
                enemy.state = 'frightened';
                enemy.frightenedTimer = 8000; // 8 seconds
            });
            return false;
        }
        return true;
    });

    enemies.forEach(enemy => {
        if (enemy.x === bonkman.x && enemy.y === bonkman.y) {
            if (enemy.state === 'frightened') {
                score += 200;
                enemy.state = 'eaten';
            } else if (enemy.state !== 'eaten') {
                // playSound(sounds.death);
                handleGameOver();
            }
        }
    });

    if (coins.length === 0) { /* ... level up logic is the same ... */ }
    scoreEl.textContent = score;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // ... map drawing logic is the same ...
    coins.forEach(coin => coin.draw());
    powerUps.forEach(powerUp => powerUp.draw());
    bonkman.draw();
    enemies.forEach(enemy => enemy.draw()); // Now draws enemies
}

// ... The rest of the functions (gameLoop, handleGameOver, resetGame, showLevelPopup, event listeners, preloader)
// are mostly the same, but I'll include them for completeness. Make sure to replace everything.
function gameLoop() { /* ... */ }
function handleGameOver() { /* ... */ }
function resetGame() { /* ... */ }
function showLevelPopup() { /* ... */ }
window.addEventListener('keydown', (e) => { /* ... */ });
function preloadAssets() { /* ... Make sure to add malletFrightened.png to the list */ }
async function main() { /* ... */ }
main();
