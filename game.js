// Soda images ordered smallest to largest
const sodaImages = [
  'https://upload.wikimedia.org/wikipedia/commons/4/4e/Coca-Cola_Bottle.png',      // Coke bottle (small)
  'https://upload.wikimedia.org/wikipedia/commons/2/26/Pepsi_can.png',              // Pepsi can
  'https://upload.wikimedia.org/wikipedia/commons/e/e3/SpriteBottle.png',           // Sprite bottle
  'https://upload.wikimedia.org/wikipedia/commons/5/53/Fanta-can.png',              // Fanta can
  'https://upload.wikimedia.org/wikipedia/commons/6/6b/Dr_Pepper_can.png',          // Dr Pepper can
  'https://upload.wikimedia.org/wikipedia/commons/f/f6/Mountain_Dew_Can.png',       // Mountain Dew can
  'https://upload.wikimedia.org/wikipedia/commons/3/3e/RC_Cola_can.png',            // RC Cola can
  'https://upload.wikimedia.org/wikipedia/commons/e/e1/Schweppes_can.png',          // Schweppes can (largest)
];

// Soda sizes matching image order, radii in px
const sodaRadius = [26, 33, 38, 46, 56, 66, 78, 94];

// Suika bin
const WIDTH = 400, HEIGHT = 600;
const BIN_RADIUS = WIDTH / 2 - 10;
const BIN_X = WIDTH / 2, BIN_Y = HEIGHT - 12;

// Physics
const GRAVITY = 0.58;
const FRICTION = 0.98;

// Game state
let sodas = [];
let score = 0;
let dropping = false;
let dropX = WIDTH / 2;
let gameOver = false;
let nextType = 0;

// UI
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const dropBtn = document.getElementById('drop-btn');
const restartBtn = document.getElementById('restart-btn');
const gameOverEl = document.getElementById('game-over');
const nextImg = document.getElementById('next-img');

// Load images
let loadedImgs = [];
let loadedCount = 0;
for (let src of sodaImages) {
  let img = new Image();
  img.src = src;
  img.onload = () => {
    loadedCount++;
    if (loadedCount === sodaImages.length) startGame();
  };
  loadedImgs.push(img);
}

function startGame() {
  sodas = [];
  score = 0;
  dropX = WIDTH / 2;
  dropping = false;
  gameOver = false;
  nextType = Math.floor(Math.random() * 4);
  scoreEl.textContent = "Score: 0";
  dropBtn.disabled = false;
  restartBtn.style.display = "none";
  gameOverEl.style.display = "none";
  nextImg.src = sodaImages[nextType];
  draw();
}

function drawBin() {
  ctx.save();
  ctx.beginPath();
  ctx.arc(BIN_X, BIN_Y, BIN_RADIUS, Math.PI, 2 * Math.PI);
  ctx.lineTo(WIDTH - 10, HEIGHT);
  ctx.lineTo(10, HEIGHT);
  ctx.closePath();
  ctx.fillStyle = "#222";
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0, 0, WIDTH, HEIGHT);
  drawBin();

  for (let soda of sodas) {
    ctx.save();
    ctx.globalAlpha = soda.merging ? 0.6 : 1;
    ctx.drawImage(
      loadedImgs[soda.type],
      soda.x - sodaRadius[soda.type],
      soda.y - sodaRadius[soda.type],
      sodaRadius[soda.type] * 2,
      sodaRadius[soda.type] * 2
    );
    ctx.restore();
  }

  // Show drop preview
  if (!dropping && !gameOver) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    ctx.drawImage(
      loadedImgs[nextType],
      dropX - sodaRadius[nextType], 30,
      sodaRadius[nextType] * 2, sodaRadius[nextType] * 2
    );
    ctx.restore();
  }
}

function update() {
  if (gameOver) return;

  for (let soda of sodas) {
    soda.vy += GRAVITY;
    soda.y += soda.vy;
    soda.x += soda.vx;

    // Bin collision
    let dx = soda.x - BIN_X;
    let dy = soda.y - BIN_Y;
    let dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > BIN_RADIUS - sodaRadius[soda.type]) {
      // Push inside
      let angle = Math.atan2(dy, dx);
      soda.x = BIN_X + (BIN_RADIUS - sodaRadius[soda.type]) * Math.cos(angle);
      soda.y = BIN_Y + (BIN_RADIUS - sodaRadius[soda.type]) * Math.sin(angle);
      // Bounce
      let vn = soda.vx * Math.cos(angle) + soda.vy * Math.sin(angle);
      soda.vx -= 2 * vn * Math.cos(angle) * 0.8;
      soda.vy -= 2 * vn * Math.sin(angle) * 0.8;
      soda.vx *= FRICTION;
      soda.vy *= FRICTION;
    } else {
      // Floor collision
      if (soda.y + sodaRadius[soda.type] > HEIGHT) {
        soda.y = HEIGHT - sodaRadius[soda.type];
        soda.vy *= -0.5;
        soda.vx *= FRICTION;
      }
    }
  }

  // Soda collision
  for (let i = 0; i < sodas.length; i++) {
    for (let j = i + 1; j < sodas.length; j++) {
      let a = sodas[i], b = sodas[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      let dist = Math.sqrt(dx * dx + dy * dy);
      let minDist = sodaRadius[a.type] + sodaRadius[b.type];
      if (dist < minDist) {
        // Merge if same type and not merging already
        if (a.type === b.type && !a.merging && !b.merging && a.type < sodaImages.length - 1) {
          let mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
          sodas.push({
            x: mx, y: my,
            vx: (a.vx + b.vx) / 2,
            vy: (a.vy + b.vy) / 2,
            type: a.type + 1,
            merging: true,
            mergeTimer: 20
          });
          score += (a.type + 1) * 10;
          scoreEl.textContent = "Score: " + score;
          a.merging = b.merging = true;
          a.mergeTimer = b.mergeTimer = 20;
        } else {
          // Physics push
          let angle = Math.atan2(dy, dx);
          let overlap = minDist - dist;
          a.x -= overlap / 2 * Math.cos(angle);
          a.y -= overlap / 2 * Math.sin(angle);
          b.x += overlap / 2 * Math.cos(angle);
          b.y += overlap / 2 * Math.sin(angle);
        }
      }
    }
  }

  // Remove merged sodas
  sodas = sodas.filter(s => !(s.merging && (s.mergeTimer-- <= 0)));

  // Overflow detection
  for (let soda of sodas) {
    if (soda.y - sodaRadius[soda.type] < 0) {
      endGame();
      break;
    }
  }
}

// Mouse/touch for drop position
dropBtn.addEventListener('mousemove', e => {
  let rect = canvas.getBoundingClientRect();
  dropX = Math.min(WIDTH - 30, Math.max(30, e.clientX - rect.left));
});

dropBtn.addEventListener('touchmove', e => {
  let rect = canvas.getBoundingClientRect();
  let touch = e.touches[0];
  dropX = Math.min(WIDTH - 30, Math.max(30, touch.clientX - rect.left));
});

dropBtn.addEventListener('click', () => {
  if (dropping || gameOver) return;
  dropping = true;
  sodas.push({
    x: dropX,
    y: 30,
    vx: 0,
    vy: 0,
    type: nextType,
    merging: false
  });
  dropBtn.disabled = true;
  setTimeout(() => {
    dropping = false;
    dropBtn.disabled = false;
    nextType = Math.floor(Math.random() * 4);
    nextImg.src = sodaImages[nextType];
  }, 350);
});

restartBtn.addEventListener('click', () => {
  startGame();
});

function endGame() {
  gameOver = true;
  dropBtn.disabled = true;
  gameOverEl.style.display = "block";
  restartBtn.style.display = "inline-block";
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

if (loadedCount === sodaImages.length) startGame();
gameLoop();
