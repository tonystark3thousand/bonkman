// Game Setup
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const levelEl = document.getElementById('level');

const TILE_SIZE = 20;
let currentLevel = 1;
let score = 0;

// Game Assets
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
        "#P C  C  #  C  C  #",
        "# C ## C # C ## C #",
        "#  C  C  C  C  C  #",
        "####################",
        "#  C ## C # C ## C  #",
        "# C  C  C C C  C C #",
        "T  C  C  #  C  C  T",
        "# C  C  C C C  C C #",
        "#  C ## C # C ## C  #",
        "####################",
        "#  C  C  C  C  C  #",
        "# C ## C # C ## C #",
        "#P C  C  #  C  C  #",
        "####################",
    ],
    // Level 2 (with dead ends)
    [
        "####################",
        "#P C  C   C  C  C  #",
        "# C# # #C# # C# # # C#",
        "#  C  C  #  C  C   #",
        "##### ##   ## #####",
        "#   C  C# #C  C   #",
        "# C# #C  C  C# # C#",
        "T  C# #     # #C  T",
        "# C# #C  C  C# # C#",
        "#   C  C# #C  C   #",
        "##### ##   ## #####",
        "#  C  C  #  C  C   #",
        "# C# # #C# # C# # # C#",
        "#P C  C   C  C  C  #",
        "####################",
    ],
    // Add more levels here...
];

let map = [];
let bonkman;
let mallets = [];
let coins = [];
let powerUps = [];

// Classes
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

        if (map[nextY][nextX] !== '#') {
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
        this.isScared = false;
    }

    draw() {
        ctx.drawImage(malletImages[this.color], this.x * TILE_SIZE, this.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }

    move() {
        // Simple AI: Move towards Bonkman
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

        if (map[nextY][nextX] !== '#') {
            this.x = nextX;
            this.y = nextY;
        }
    }
}

class Coin {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    draw() {
        ctx.drawImage(coinImg, this.x * TILE_SIZE, this.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
}

class PowerUp {
    constructor(x, y) {
        this.x = x;
        this.y = y;
    }

    draw() {
        ctx.drawImage(powerUpImg, this.x * TILE_SIZE, this.y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
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

    for (let y = 0; y < map.length; y++) {
        for (let x = 0; x < map[y].length; x++) {
            const char = map[y][x];
            if (char === 'P') {
                bonkman = new Player(x, y);
            } else if (char === 'C') {
                coins.push(new Coin(x, y));
            } else if (char === 'T') {
                powerUps.push(new PowerUp(x, y));
            }
        }
    }
    
    // Add mallets based on level
    if (levelNumber >= 1) {
        mallets.push(new Mallet(9, 7, 'red'));
    }
    if (levelNumber >= 2) {
        mallets.push(new Mallet(10, 7, 'blue'));
    }
    if (levelNumber >= 3) {
        mallets.push(new Mallet(11, 7, 'green'));
    }
}

function update() {
    bonkman.move();
    mallets.forEach(mallet => mallet.move());

    // Collision detection
    coins = coins.filter(coin => {
        if (coin.x === bonkman.x && coin.y === bonkman.y) {
            score += 10;
            return false;
        }
        return true;
    });

    powerUps = powerUps.filter(powerUp => {
        if (powerUp.x === bonkman.x && powerUp.y === bonkman.y) {
            score += 50;
            // Add power-up effect (e.g., make mallets vulnerable)
            return false;
        }
        return true;
    });

    mallets.forEach(mallet => {
        if (mallet.x === bonkman.x && mallet.y === bonkman.y) {
            // Game over or handle power-up state
            alert('Game Over!');
            resetGame();
        }
    });

    if (coins.length === 0) {
        currentLevel++;
        if (currentLevel > levels.length) {
            alert('You Win!');
            resetGame();
        } else {
            loadLevel(currentLevel);
        }
    }

    draw();
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw map
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

    scoreEl.textContent = score;
    levelEl.textContent = currentLevel;
}

function resetGame() {
    currentLevel = 1;
    score = 0;
    loadLevel(currentLevel);
}

// Event Listeners
window.addEventListener('keydown', (e) => {
    switch (e.key) {
        case 'ArrowUp':
            bonkman.direction = { x: 0, y: -1 };
            break;
        case 'ArrowDown':
            bonkman.direction = { x: 0, y: 1 };
            break;
        case 'ArrowLeft':
            bonkman.direction = { x: -1, y: 0 };
            break;
        case 'ArrowRight':
            bonkman.direction = { x: 1, y: 0 };
            break;
    }
});

// Start Game
loadLevel(currentLevel);
setInterval(update, 100);