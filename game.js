const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const tileSize = 20;
const gridWidth = 28;
const gridHeight = 31;
let gameBoard = [];
let bonkman = { x: 1, y: 1, width: tileSize, height: tileSize };
let hammers = [
    { x: 26, y: 1, color: 'red', width: tileSize, height: tileSize },
    { x: 26, y: 2, color: 'blue', width: tileSize, height: tileSize },
    { x: 26, y: 3, color: 'green', width: tileSize, height: tileSize }
];
let coins = [];
let score = 0;
let lives = 3;
let currentLevel = 0;
let gameActive = true;

const levels = [
    // Level 1: Simple layout
    { layout: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,1,1,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,0,1,1,1,0,1,1,0,1,1,0,1,1,1,0,1,1,1,0,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ].concat(Array(gridHeight-5).fill().map(() => Array(gridWidth).fill(1))), coinCount: 50 },
    // Level 2: Added inner walls
    { layout: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,1,0,0,0,0,0,1,1,0,0,0,0,0,0,1,0,0,0,0,0,1],
        [1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1,1,0,1,1,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1]
    ].concat(Array(gridHeight-5).fill().map(() => Array(gridWidth).fill(1))), coinCount: 60 },
    // Levels 3-25: Randomized layouts with dead ends, tunnels, and hammer traps
    ...Array(23).fill().map((_, i) => {
        const levelNum = i + 3;
        let layout = Array(gridHeight).fill().map(() => Array(gridWidth).fill(0));
        // Outer walls
        for (let y = 0; y < gridHeight; y++) {
            layout[y][0] = layout[y][gridWidth - 1] = 1;
        }
        for (let x = 0; x < gridWidth; x++) {
            layout[0][x] = layout[gridHeight - 1][x] = 1;
        }
        // Random walls and features
        for (let y = 1; y < gridHeight - 1; y++) {
            for (let x = 1; x < gridWidth - 1; x++) {
                if (Math.random() < 0.3 + (levelNum - 3) * 0.01) {
                    layout[y][x] = 1; // Increasing wall density
                }
            }
        }
        // Tunnels (horizontal paths)
        if (levelNum % 3 === 0) {
            const tunnelY = Math.floor(gridHeight / 2) + (levelNum % 5 - 2);
            for (let x = 2; x < gridWidth - 2; x++) {
                layout[tunnelY][x] = 0;
                if (Math.random() < 0.2) layout[tunnelY][x] = 1; // Occasional breaks
            }
        }
        // Dead ends (vertical stubs)
        if (levelNum % 4 === 0) {
            const deadEndX = Math.floor(gridWidth / 4) * (levelNum % 4);
            for (let y = 2; y < gridHeight - 2; y++) {
                if (Math.random() < 0.5) layout[y][deadEndX] = 1;
            }
        }
        // Hammer traps (small enclosed areas)
        if (levelNum % 5 === 0) {
            const trapX = Math.floor(gridWidth * 0.75);
            const trapY = Math.floor(gridHeight / 3);
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (dx === 0 || dy === 0) layout[trapY + dy][trapX + dx] = 1;
                }
            }
            layout[trapY][trapX] = 0; // Trap center open
        }
        // Ensure path to bonkman start
        layout[1][1] = 0;
        return { layout: layout, coinCount: 70 + (levelNum - 3) * 10 };
    })
];

function initLevel() {
    const level = levels[currentLevel];
    gameBoard = level.layout.map(row => [...row]);
    coins = gameBoard.flatMap((row, y) => row.map((cell, x) => cell === 2 ? { x, y } : null)).filter(c => c);
    if (coins.length < level.coinCount) {
        for (let i = coins.length; i < level.coinCount; i++) {
            let x, y;
            do {
                x = Math.floor(Math.random() * (gridWidth - 2)) + 1;
                y = Math.floor(Math.random() * (gridHeight - 2)) + 1;
            } while (gameBoard[y][x] !== 0 || (x === bonkman.x && y === bonkman.y));
            coins.push({ x, y });
            gameBoard[y][x] = 2;
        }
    }
    hammers = [
        { x: 26, y: 1 + currentLevel % 3, color: 'red' },
        { x: 26, y: 2 + currentLevel % 3, color: 'blue' },
        { x: 26, y: 3 + currentLevel % 3, color: 'green' }
    ].map(h => ({ ...h, width: tileSize, height: tileSize }));
    bonkman.x = 1;
    bonkman.y = 1;
}

function draw() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0000FF';
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (gameBoard[y][x] === 1) {
                ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
        }
    }
    ctx.fillStyle = '#FFD700';
    coins.forEach(coin => {
        ctx.beginPath();
        ctx.arc((coin.x + 0.5) * tileSize, (coin.y + 0.5) * tileSize, tileSize / 4, 0, Math.PI * 2);
        ctx.fill();
    });
    // Use bonkdog.png for Bonkman
    const bonkdogImg = new Image();
    bonkdogImg.src = 'bonkdog.png';
    bonkdogImg.onload = () => {
        ctx.drawImage(bonkdogImg, bonkman.x * tileSize, bonkman.y * tileSize, tileSize, tileSize);
    };
    bonkdogImg.onerror = () => {
        console.error("Failed to load bonkdog.png, using default circle");
        ctx.fillStyle = '#FFFF00';
        ctx.beginPath();
        ctx.arc((bonkman.x + 0.5) * tileSize, (bonkman.y + 0.5) * tileSize, tileSize / 2, 0, Math.PI * 2);
        ctx.fill();
    };
    hammers.forEach(hammer => {
        ctx.fillStyle = hammer.color;
        ctx.fillRect(hammer.x * tileSize, hammer.y * tileSize, tileSize, tileSize);
    });
}

function moveBonkman(dx, dy) {
    const newX = bonkman.x + dx;
    const newY = bonkman.y + dy;
    if (newX >= 0 && newX < gridWidth && newY >= 0 && newY < gridHeight && gameBoard[newY][newX] !== 1) {
        bonkman.x = newX;
        bonkman.y = newY;
        const coinIndex = coins.findIndex(coin => coin.x === newX && coin.y === newY);
        if (coinIndex !== -1) {
            coins.splice(coinIndex, 1);
            score += 10;
            if (coins.length === 0 && currentLevel < 24) {
                currentLevel++;
                initLevel();
            } else if (coins.length === 0) {
                gameActive = false;
                alert('You won all 25 levels!');
            }
        }
    }
}

function moveHammers() {
    hammers.forEach(hammer => {
        let dx = 0, dy = 0;
        if (Math.abs(bonkman.x - hammer.x) > Math.abs(bonkman.y - hammer.y)) {
            dx = bonkman.x > hammer.x ? 1 : -1;
        } else {
            dy = bonkman.y > hammer.y ? 1 : -1;
        }
        const newX = hammer.x + dx;
        const newY = hammer.y + dy;
        if (newX >= 0 && newX < gridWidth && newY >= 0 && newY < gridHeight && gameBoard[newY][newX] !== 1) {
            hammer.x = newX;
            hammer.y = newY;
        }
        if (hammer.x === bonkman.x && hammer.y === bonkman.y) {
            lives--;
            bonkman.x = 1;
            bonkman.y = 1;
            if (lives <= 0) {
                gameActive = false;
                alert('Game Over! Score: ' + score);
            }
        }
    });
}

document.addEventListener('keydown', e => {
    if (!gameActive) return;
    switch (e.key) {
        case 'ArrowUp': moveBonkman(0, -1); break;
        case 'ArrowDown': moveBonkman(0, 1); break;
        case 'ArrowLeft': moveBonkman(-1, 0); break;
        case 'ArrowRight': moveBonkman(1, 0); break;
    }
});

function gameLoop() {
    if (!gameActive) return;
    moveHammers();
    draw();
    requestAnimationFrame(gameLoop);
}

initLevel();
gameLoop();