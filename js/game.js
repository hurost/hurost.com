import { getActivePalette, getIsDarkMode, brandPalette } from './theme.js';

let canvas, ctx;
let heroLogo, svgSymbol, svgLogotype;
let gameUI, btnStart, gameStats, activeBallCount, gameResults, resScore, resTime, congratsText;

let width, height;
let isPlaying = false;
let paddleHits = 0;
let maxSimultaneousBalls = 0;
let startTime = 0;
let logoScale = 1;
let logoHitStreakTimeout;
let globalTime = 0;

const paddle = { width: 120, height: 10, x: 0, y: 0, shakeY: 0 };
const cloudPixels = [
    [0, 0, 1, 1, 1, 1, 0, 0],
    [0, 1, 1, 1, 1, 1, 1, 0],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [1, 1, 1, 1, 1, 1, 1, 1],
    [0, 1, 1, 1, 1, 1, 1, 0]
];
const CLOUD_PIXEL_SIZE = 8;

let particles = [];
let clouds = [];
let fallingBlocks = [];
let balls = [];

// --- CLASSES ---
class PixelParticle {
    constructor(x, y, color, vx, vy, type = 'burst') {
        this.x = x;
        this.y = y;
        this.size = type === 'rain' ? (Math.random() > 0.5 ? 2 : 4) : (Math.random() > 0.5 ? 4 : 6);
        this.vx = vx;
        this.vy = vy;
        this.life = 1.0;
        this.color = color;
        this.type = type;
        this.gravity = type === 'burst' ? 0 : 0.15;
    }

    update() {
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        if (this.type === 'burst') {
            this.life -= 0.04;
        } else if (this.y > height) {
            this.life = 0;
        }
    }

    draw() {
        ctx.fillStyle = this.color;
        ctx.globalAlpha = this.type === 'burst' ? Math.max(0, this.life) : 1.0;
        ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size);
        ctx.globalAlpha = 1.0;
    }
}

class PixelCloud {
    constructor(x, y, speed, wiggleOffset) {
        this.x = x;
        this.y = y;
        this.speed = speed;
        this.wiggleOffset = wiggleOffset;
        this.currentWiggleY = 0;
        this.shakeTime = 0;
        this.pixels = cloudPixels.map(row => [...row]);
        this.rows = this.pixels.length;
        this.cols = this.pixels[0].length;
        this.width = this.cols * CLOUD_PIXEL_SIZE;
        this.height = this.rows * CLOUD_PIXEL_SIZE;
        this.isDestroyed = false;
    }

    update(dt, time) {
        let wiggle = Math.sin(time * 2 + this.wiggleOffset) * 4;
        let shake = 0;
        if (this.shakeTime > 0) {
            shake = (Math.random() - 0.5) * 6;
            this.shakeTime -= dt;
        }
        this.currentWiggleY = wiggle + shake;

        if (isPlaying) {
            this.x -= this.speed * dt;
        }
        if (this.x + this.width < -50) {
            this.respawn();
        }
    }

    draw() {
        if (this.isDestroyed) return;
        const drawX = Math.round(this.x);
        const drawY = Math.round(this.y + this.currentWiggleY);
        ctx.fillStyle = getIsDarkMode() ? '#f8f7f2' : '#111111';

        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.pixels[r][c] === 1) {
                    ctx.fillRect(drawX + c * CLOUD_PIXEL_SIZE, drawY + r * CLOUD_PIXEL_SIZE, CLOUD_PIXEL_SIZE - 0.5, CLOUD_PIXEL_SIZE - 0.5);
                }
            }
        }
    }

    checkCollision(ball) {
        if (this.isDestroyed) return false;
        const drawY = this.y + this.currentWiggleY;
        if (ball.x + ball.radius > this.x && ball.x - ball.radius < this.x + this.width &&
            ball.y + ball.radius > drawY && ball.y - ball.radius < drawY + this.height) {
            for (let r = 0; r < this.rows; r++) {
                for (let c = 0; c < this.cols; c++) {
                    if (this.pixels[r][c] === 1) {
                        const pxX = this.x + c * CLOUD_PIXEL_SIZE;
                        const pxY = drawY + r * CLOUD_PIXEL_SIZE;
                        if (ball.x + ball.radius > pxX && ball.x - ball.radius < pxX + CLOUD_PIXEL_SIZE &&
                            ball.y + ball.radius > pxY && ball.y - ball.radius < pxY + CLOUD_PIXEL_SIZE) {
                            this.pixels[r][c] = 0;
                            this.shakeTime = 0.15;
                            createRainParticle(pxX + CLOUD_PIXEL_SIZE / 2, pxY + CLOUD_PIXEL_SIZE / 2);
                            onCloudHitEffect(pxX + CLOUD_PIXEL_SIZE / 2, pxY + CLOUD_PIXEL_SIZE / 2);
                            this.checkEmpty();
                            return true;
                        }
                    }
                }
            }
        }
        return false;
    }

    checkEmpty() {
        for (let r = 0; r < this.rows; r++) {
            for (let c = 0; c < this.cols; c++) {
                if (this.pixels[r][c] === 1) return;
            }
        }
        this.isDestroyed = true;
    }

    respawn() {
        this.x = width + Math.random() * 200 + 50;
        this.y = Math.random() * (height * 0.25) + 50;
        this.speed = Math.random() * 30 + 40;
        this.pixels = cloudPixels.map(row => [...row]);
        this.isDestroyed = false;
    }
}

class FallingBlock {
    constructor() { this.respawn(); }
    update(dt) {
        this.y += this.speed * dt;
        if (this.y > height) this.respawn();
    }
    draw() {
        ctx.fillStyle = getIsDarkMode() ? '#f8f7f2' : '#111111';
        ctx.fillRect(Math.round(this.x), Math.round(this.y), this.size, this.size);
    }
    respawn() {
        this.size = Math.random() > 0.5 ? 4 : 8;
        this.x = (width * 0.2) + Math.random() * (width * 0.6);
        this.y = -Math.random() * 500 - this.size;
        this.speed = Math.random() * 50 + 80;
    }
    checkCollision(ball) {
        if (ball.x + ball.radius > this.x && ball.x - ball.radius < this.x + this.size &&
            ball.y + ball.radius > this.y && ball.y - ball.radius < this.y + this.size) {
            createPixelBurst(this.x + this.size / 2, this.y + this.size / 2, (getIsDarkMode() ? '#f1f5f9' : '#111111'));
            ball.speedMultiplier += 0.005;
            this.respawn();
            return true;
        }
        return false;
    }
}

class Ball {
    constructor(x, y, vx, vy, color) {
        this.x = x;
        this.y = y;
        this.radius = 6;
        this.vx = vx;
        this.vy = vy;
        this.speedMultiplier = 1;
        this.color = color || brandPalette.gold;
    }

    update(dt) {
        this.x += this.vx * this.speedMultiplier * dt * 60;
        this.y += this.vy * this.speedMultiplier * dt * 60;

        if (this.x - this.radius < 0) { this.x = this.radius; this.vx *= -1; createPixelBurst(0, this.y, this.color); }
        if (this.x + this.radius > width) { this.x = width - this.radius; this.vx *= -1; createPixelBurst(width, this.y, this.color); }
        if (this.y - this.radius < 0) { this.y = this.radius; this.vy *= -1; createPixelBurst(this.x, 0, this.color); }

        if (this.y + this.radius >= paddle.y + paddle.shakeY &&
            this.y - this.radius <= paddle.y + paddle.height + paddle.shakeY &&
            this.x >= paddle.x && this.x <= paddle.x + paddle.width && this.vy > 0) {
            this.vy = -Math.abs(this.vy);
            let hitOffset = (this.x - (paddle.x + paddle.width / 2)) / (paddle.width / 2);
            this.vx = hitOffset * 7;
            paddleHits++;
            this.speedMultiplier += 0.015;
            paddle.shakeY = 3;
            setTimeout(() => paddle.shakeY = 0, 70);
            createPixelBurst(this.x, paddle.y, this.color);
            if (paddleHits % 5 === 0) spawnExtraBall(this.x, paddle.y - 12);
        }

        for (let cloud of clouds) { if (cloud.checkCollision(this)) { this.vy *= -1; break; } }
        for (let block of fallingBlocks) { if (block.checkCollision(this)) { this.vy *= -1; break; } }

        this.checkSVGElementCollision(svgSymbol);
        this.checkSVGElementCollision(svgLogotype);
    }

    checkSVGElementCollision(svgEl) {
        if (!svgEl) return;
        const rect = svgEl.getBoundingClientRect();
        if (this.x + this.radius > rect.left && this.x - this.radius < rect.right &&
            this.y + this.radius > rect.top && this.y - this.radius < rect.bottom) {
            const paths = svgEl.querySelectorAll('path, ellipse');
            for (let p of paths) {
                const pRect = p.getBoundingClientRect();
                if (this.x + this.radius > pRect.left && this.x - this.radius < pRect.right &&
                    this.y + this.radius > pRect.top && this.y - this.radius < pRect.bottom) {
                    const centerX = pRect.left + pRect.width / 2;
                    const centerY = pRect.top + pRect.height / 2;
                    if (Math.abs(this.x - centerX) > Math.abs(this.y - centerY)) this.vx *= -1;
                    else this.vy *= -1;
                    onLogoHit(this.x, this.y);
                    break;
                }
            }
        }
    }

    draw() {
        ctx.save();
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(Math.round(this.x), Math.round(this.y), this.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
    }
}

// --- HELPER FUNCTIONS ---
function createPixelBurst(x, y, color) {
    let burstColor = color || (getIsDarkMode() ? '#f1f5f9' : '#111111');
    for (let i = 0; i < 8; i++) {
        particles.push(new PixelParticle(x, y, burstColor, (Math.random() - 0.5) * 6, (Math.random() - 0.5) * 6, 'burst'));
    }
}

function createRainParticle(x, y) {
    const rainColor = getIsDarkMode() ? '#f8f7f2' : '#111111';
    particles.push(new PixelParticle(x, y, rainColor, (Math.random() - 0.5) * 1.5, Math.random() * 2 + 1, 'rain'));
}

function onCloudHitEffect(hitX, hitY) {
    const palette = getActivePalette();
    const randomColor = palette[Math.floor(Math.random() * palette.length)];
    for (let i = 0; i < 4; i++) {
        particles.push(new PixelParticle(hitX, hitY, randomColor, (Math.random() - 0.5) * 4, (Math.random() - 0.5) * 4, 'burst'));
    }
}

function initGameScene() {
    clouds = [];
    clouds.push(new PixelCloud(width * 0.2, height * 0.08, 50, 0));
    clouds.push(new PixelCloud(width * 0.7, height * 0.15, 65, Math.PI));
    fallingBlocks = [];
    for (let i = 0; i < 5; i++) fallingBlocks.push(new FallingBlock());
}

function onLogoHit(hitX, hitY) {
    const palette = getActivePalette();
    const randomColor = palette[Math.floor(Math.random() * palette.length)];
    heroLogo.style.filter = `drop-shadow(0 0 14px ${randomColor})`;
    setTimeout(() => { heroLogo.style.filter = 'none'; }, 140);

    logoScale = Math.min(logoScale + 0.03, 1.18);
    let softAngle = (Math.random() - 0.5) * 2;
    heroLogo.style.transform = `scale(${logoScale}) rotate(${softAngle}deg)`;

    clearTimeout(logoHitStreakTimeout);
    logoHitStreakTimeout = setTimeout(() => {
        logoScale = 1;
        heroLogo.style.transform = `scale(1) rotate(0deg)`;
    }, 250);

    createPixelBurst(hitX, hitY, randomColor);
}

function spawnExtraBall(x, y) {
    let angle = (Math.random() * Math.PI / 3) + Math.PI / 3;
    let speed = 6.5;
    let vx = speed * Math.cos(angle) * (Math.random() > 0.5 ? 1 : -1);
    let vy = -speed * Math.sin(angle);
    const palette = getActivePalette();
    const nextColor = palette[(balls.length) % palette.length];
    balls.push(new Ball(x, y, vx, vy, nextColor));
    if (balls.length > maxSimultaneousBalls) maxSimultaneousBalls = balls.length;
}

function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
    if (isPlaying) {
        initGameScene();
    }
}

function startGame() {
    isPlaying = true;
    paddleHits = 0;
    maxSimultaneousBalls = 1;
    startTime = Date.now();
    particles = [];
    initGameScene();

    gameUI.style.display = 'none';
    gameStats.style.display = 'block';

    paddle.x = width / 2 - paddle.width / 2;
    paddle.y = height - 50;

    const palette = getActivePalette();
    const initialColor = palette[0];

    balls = [new Ball(width / 2, height - 80, (Math.random() > 0.5 ? 6 : -6), -7, initialColor)];
}

function endGame() {
    isPlaying = false;
    let totalSeconds = Math.floor((Date.now() - startTime) / 1000);
    let formattedTime = totalSeconds >= 60 ? `${Math.floor(totalSeconds / 60)}m ${totalSeconds % 60}s` : `${totalSeconds}s`;

    let previousRecord = parseInt(localStorage.getItem('hurost_max_balls') || '0', 10);
    let isNewRecord = false;
    if (maxSimultaneousBalls > previousRecord) {
        localStorage.setItem('hurost_max_balls', maxSimultaneousBalls);
        isNewRecord = true;
    }

    gameStats.style.display = 'none';
    gameUI.style.display = 'flex';
    gameResults.style.display = 'flex';

    if (isNewRecord) {
        const palette = getActivePalette();
        congratsText.style.color = palette[Math.floor(Math.random() * palette.length)];
        congratsText.style.display = 'block';
    } else {
        congratsText.style.display = 'none';
    }

    resScore.textContent = `MAX BALLS: ${maxSimultaneousBalls}`;
    resTime.textContent = `TIME: ${formattedTime}`;
    btnStart.textContent = 'CLICK TO PLAY AGAIN';
}

let lastTime = 0;
function gameLoop(time) {
    if (!lastTime) lastTime = time;
    const dt = (time - lastTime) / 1000;
    lastTime = time;
    globalTime += dt;

    ctx.clearRect(0, 0, width, height);

    for (let cloud of clouds) {
        cloud.update(dt, globalTime);
        cloud.draw();
    }

    if (isPlaying) {
        paddle.y = height - 50;

        for (let block of fallingBlocks) {
            block.update(dt);
            block.draw();
        }

        ctx.fillStyle = getIsDarkMode() ? '#f1f5f9' : '#111111';
        ctx.beginPath();
        ctx.roundRect(paddle.x, paddle.y + paddle.shakeY, paddle.width, paddle.height, 5);
        ctx.fill();

        for (let i = balls.length - 1; i >= 0; i--) {
            balls[i].update(dt);
            balls[i].draw();
            if (balls[i].y - balls[i].radius > height) balls.splice(i, 1);
        }

        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }

        activeBallCount.textContent = balls.length;
        if (balls.length === 0) endGame();
    } else {
        for (let i = particles.length - 1; i >= 0; i--) {
            particles[i].update();
            particles[i].draw();
            if (particles[i].life <= 0) particles.splice(i, 1);
        }
    }

    requestAnimationFrame(gameLoop);
}

// --- INIT GAME MODULE ---
export function initGame() {
    canvas = document.getElementById('gameCanvas');
    if (!canvas) return;
    ctx = canvas.getContext('2d');

    heroLogo = document.getElementById('heroLogo');
    svgSymbol = document.getElementById('svgSymbol');
    svgLogotype = document.getElementById('svgLogotype');
    gameUI = document.getElementById('gameUI');
    btnStart = document.getElementById('btnStart');
    gameStats = document.getElementById('gameStats');
    activeBallCount = document.getElementById('activeBallCount');
    gameResults = document.getElementById('gameResults');
    resScore = document.getElementById('resScore');
    resTime = document.getElementById('resTime');
    congratsText = document.getElementById('congratsText');

    window.addEventListener('resize', resize);
    window.addEventListener('mousemove', (e) => { paddle.x = e.clientX - paddle.width / 2; });
    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) paddle.x = e.touches[0].clientX - paddle.width / 2;
    }, { passive: true });

    btnStart.addEventListener('click', startGame);

    resize();
    initGameScene();
    requestAnimationFrame(gameLoop);
}