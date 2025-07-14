const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const tileSize = 20;
const gridWidth = 28;
const gridHeight = 31;
let gameBoard = [];
let bonkman = { x: 1 * tileSize, y: 1 * tileSize, dx: 0, dy: 0, speed: tileSize, width: tileSize, height: tileSize };
let hammers = [
    { x: 26 * tileSize, y: 1 * tileSize, color: 'red', width: tileSize, height: tileSize, chase: true },
    { x: 26 * tileSize, y: 2 * tileSize, color: 'blue', width: tileSize, height: tileSize, chase: true },
    { x: 26 * tileSize, y: 3 * tileSize, color: 'green', width: tileSize, height: tileSize, chase: true }
];
let coins = [];
let score = 0;
let lives = 3;
let currentLevel = 0;
let gameActive = true;

const levels = [
    // Level 1: Classic Pacman-style maze
    { layout: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,0,1,1,0,1,1,1,1,1,1,1,1,0,1,1,0,1,1,1,0,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,0,1,0,0,1,1,1,0,0,0,0,0,1,1,1,0,0,1,0,0,1,1,1,1]
    ].concat(Array(gridHeight-5).fill().map(() => Array(gridWidth).fill(1))), coinCount: 50 },
    // Level 2: Added complexity
    { layout: [
        [1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,0,1,1,1,0,1,1,1,1,1,1,1,1,1,1,1,1,1,0,1,1,1,1,0,1,0,1],
        [1,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        [1,1,1,1,0,1,0,0,1,0,0,0,0,0,0,0,1,0,0,1,0,0,1,0,0,1,1,1]
    ].concat(Array(gridHeight-5).fill().map(() => Array(gridWidth).fill(1))), coinCount: 60 },
    // Levels 3-25: Unique boards with features
    ...Array(23).fill().map((_, i) => {
        const levelNum = i + 3;
        let layout = levels[0].layout.map(row => [...row]); // Start with Level 1 base
        // Random wall additions
        for (let y = 1; y < gridHeight - 1; y++) {
            for (let x = 1; x < gridWidth - 1; x++) {
                if (layout[y][x] === 0 && Math.random() < 0.3 + (levelNum - 3) * 0.01) {
                    layout[y][x] = 1;
                }
            }
        }
        // Tunnels (every 3 levels)
        if (levelNum % 3 === 0) {
            const tunnelY = Math.floor(gridHeight / 2) + (levelNum % 5 - 2);
            for (let x = 2; x < gridWidth - 2; x++) layout[tunnelY][x] = 0;
        }
        // Dead ends (every 4 levels)
        if (levelNum % 4 === 0) {
            const deadEndX = Math.floor(gridWidth / 4) * (levelNum % 4 + 1);
            for (let y = 2; y < gridHeight - 2; y++) if (Math.random() < 0.6) layout[y][deadEndX] = 1;
        }
        // Hammer traps (every 5 levels)
        if (levelNum % 5 === 0) {
            const trapX = Math.floor(gridWidth * 0.75);
            const trapY = Math.floor(gridHeight / 3);
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (dx === 0 || dy === 0) layout[trapY + dy][trapX + dx] = 1;
            layout[trapY][trapX] = 0;
        }
        layout[1][1] = 0; // Ensure start is open
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
                y = Math.floor(Math.random * (gridHeight - 2)) + 1;
            } while (gameBoard[y][x] !== 0 || (x === bonkman.x / tileSize && y === bonkman.y / tileSize));
            coins.push({ x, y });
            gameBoard[y][x] = 2;
        }
    }
    hammers.forEach(h => { h.chase = Math.random() > 0.3; }); // 70% chase, 30% idle
    bonkman.x = 1 * tileSize;
    bonkman.y = 1 * tileSize;
    bonkman.dx = 0;
    bonkman.dy = 0;
}

function draw() {
    ctx.fillStyle = '#000000'; // Black background
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0000FF'; // Blue walls
    for (let y = 0; y < gridHeight; y++) {
        for (let x = 0; x < gridWidth; x++) {
            if (gameBoard[y][x] === 1) {
                ctx.fillRect(x * tileSize, y * tileSize, tileSize, tileSize);
            }
        }
    }
    ctx.fillStyle = '#FFD700'; // Gold coins
    coins.forEach(coin => {
        ctx.beginPath();
        ctx.arc((coin.x + 0.5) * tileSize, (coin.y + 0.5) * tileSize, tileSize / 4, 0, Math.PI * 2);
        ctx.fill();
    });
    const bonkdogImg = new Image();
    bonkdogImg.src = 'bonkdog.png';
    bonkdogImg.onload = () => {
        ctx.drawImage(bonkdogImg, bonkman.x, bonkman.y, tileSize, tileSize);
    };
    bonkdogImg.onerror = () => {
        console.error("Failed to load bonkdog.png, using default");
        ctx.fillStyle = '#FFFF00'; // Yellow fallback
        ctx.beginPath();
        ctx.arc(bonkman.x / tileSize + 0.5, bonkman.y / tileSize + 0.5, tileSize / 2, 0, Math.PI * 2);
        ctx.fill();
    };
    hammers.forEach(hammer => {
        ctx.fillStyle = hammer.color;
        ctx.fillRect(hammer.x, hammer.y, tileSize, tileSize);
    });
}

function moveBonkman() {
    let newX = bonkman.x + bonkman.dx;
    let newY = bonkman.y + bonkman.dy;
    const gridX = Math.floor(newX / tileSize);
    const gridY = Math.floor(newY / tileSize);
    if (newX >= 0 && newX < canvas.width - tileSize && newY >= 0 && newY < canvas.height - tileSize && gameBoard[gridY][gridX] !== 1) {
        bonkman.x = newX;
        bonkman.y = newY;
        if (Math.abs(bonkman.x % tileSize) < 1 && Math.abs(bonkman.y % tileSize) < 1) {
            bonkman.dx = 0;
            bonkman.dy = 0;
            const coinIndex = coins.findIndex(coin => Math.floor(coin.x) === gridX && Math.floor(coin.y) === gridY);
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
}

function moveHammers() {
    hammers.forEach(hammer => {
        if (hammer.chase) {
            let dx = 0, dy = 0;
            const targetX = bonkman.x / tileSize;
            const targetY = bonkman.y / tileSize;
            const hammerX = hammer.x / tileSize;
            const hammerY = hammer.y / tileSize;
            if (Math.abs(targetX - hammerX) > Math.abs(targetY - hammerY)) {
                dx = targetX > hammerX ? 1 : -1;
            } else {
                dy = targetY > hammerY ? 1 : -1;
            }
            const newX = hammer.x + dx * tileSize;
            const newY = hammer.y + dy * tileSize;
            const gridX = Math.floor(newX / tileSize);
            const gridY = Math.floor(newY / tileSize);
            if (newX >= 0 && newX < canvas.width - tileSize && newY >= 0 && newY < canvas.height - tileSize && gameBoard[gridY][gridX] !== 1) {
                hammer.x = newX;
                hammer.y = newY;
            }
        }
        if (Math.floor(hammer.x / tileSize) === Math.floor(bonkman.x / tileSize) && Math.floor(hammer.y / tileSize) === Math.floor(bonkman.y / tileSize)) {
            lives--;
            bonkman.x = 1 * tileSize;
            bonkman.y = 1 * tileSize;
            if (lives <= 0) {
                gameActive = false;
                alert('Game Over! Score: ' + score);
            }
        }
    });
}

document.addEventListener('keydown', e => {
    if (!gameActive) return;
    if (e.key === 'ArrowUp' && bonkman.dy === 0) { bonkman.dx = 0; bonkman.dy = -bonkman.speed; }
    else if (e.key === 'ArrowDown' && bonkman.dy === 0) { bonkman.dx = 0; bonkman.dy = bonkman.speed; }
    else if (e.key === 'ArrowLeft' && bonkman.dx === 0) { bonkman.dx = -bonkman.speed; bonkman.dy = 0; }
    else if (e.key === 'ArrowRight' && bonkman.dx === 0) { bonkman.dx = bonkman.speed; bonkman.dy = 0; }
});

function gameLoop() {
    if (!gameActive) return;
    moveBonkman();
    moveHammers();
    draw();
    requestAnimationFrame(gameLoop);
}

initLevel();
gameLoop();