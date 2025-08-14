// Soda images (transparent PNGs, you can change these to any image URLs you want)
const sodaImages = [
  'https://upload.wikimedia.org/wikipedia/commons/4/4e/Coca-Cola_Bottle.png', // Coke
  'https://upload.wikimedia.org/wikipedia/commons/2/26/Pepsi_can.png', // Pepsi
  'https://upload.wikimedia.org/wikipedia/commons/e/e3/SpriteBottle.png', // Sprite
  'https://upload.wikimedia.org/wikipedia/commons/5/53/Fanta-can.png', // Fanta
  'https://upload.wikimedia.org/wikipedia/commons/6/6b/Dr_Pepper_can.png', // Dr Pepper
  'https://upload.wikimedia.org/wikipedia/commons/f/f6/Mountain_Dew_Can.png', // Mountain Dew
  'https://upload.wikimedia.org/wikipedia/commons/3/3e/RC_Cola_can.png', // RC Cola
  'https://upload.wikimedia.org/wikipedia/commons/e/e1/Schweppes_can.png', // Schweppes
];

// Game variables
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const dropButton = document.getElementById('dropButton');
const restartButton = document.getElementById('restartButton');
const gameOverEl = document.getElementById('gameOver');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const CONTAINER_RADIUS = WIDTH/2 - 10;
const SODA_RADIUS = [26,32,38,46,56,64,78,94]; // Size increases per soda type

// Physics
const GRAVITY = 0.6;
const FRICTION = 0.98;

// Soda objects
let sodas = [];
let score = 0;
let dropping = false;
let dropX = WIDTH / 2;
let gameOver = false;

// Preload images
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
  // Reset everything
  sodas = [];
  score = 0;
  dropX = WIDTH/2;
  dropping = false;
  gameOver = false;
  scoreEl.textContent = "Score: 0";
  dropButton.disabled = false;
  restartButton.style.display = "none";
  gameOverEl.style.display = "none";
  draw();
}

function drawContainer() {
  ctx.save();
  ctx.beginPath();
  ctx.arc(WIDTH/2, HEIGHT-12, CONTAINER_RADIUS, Math.PI, 2*Math.PI);
  ctx.lineTo(WIDTH-10, HEIGHT);
  ctx.lineTo(10, HEIGHT);
  ctx.closePath();
  ctx.fillStyle = "#222";
  ctx.fill();
  ctx.restore();
}

function draw() {
  ctx.clearRect(0,0,WIDTH,HEIGHT);
  drawContainer();

  for (let soda of sodas) {
    ctx.save();
    ctx.globalAlpha = soda.merging ? 0.6 : 1;
    ctx.drawImage(loadedImgs[soda.type], soda.x-SODA_RADIUS[soda.type], soda.y-SODA_RADIUS[soda.type], SODA_RADIUS[soda.type]*2, SODA_RADIUS[soda.type]*2);
    ctx.restore();
  }

  // If dropping, show preview
  if (!dropping && !gameOver) {
    ctx.save();
    ctx.globalAlpha = 0.7;
    let nextType = nextSodaType();
    ctx.drawImage(loadedImgs[nextType], dropX-SODA_RADIUS[nextType], 30, SODA_RADIUS[nextType]*2, SODA_RADIUS[nextType]*2);
    ctx.restore();
  }
}

function update() {
  if (gameOver) return;

  for (let soda of sodas) {
    // Gravity
    soda.vy += GRAVITY;
    soda.y += soda.vy;
    soda.x += soda.vx;

    // Container collision
    let dx = soda.x - WIDTH/2;
    let dy = soda.y - (HEIGHT-12);
    let dist = Math.sqrt(dx*dx + dy*dy);

    if (dist > CONTAINER_RADIUS - SODA_RADIUS[soda.type]) {
      // Push back in
      let angle = Math.atan2(dy, dx);
      soda.x = WIDTH/2 + (CONTAINER_RADIUS - SODA_RADIUS[soda.type]) * Math.cos(angle);
      soda.y = HEIGHT-12 + (CONTAINER_RADIUS - SODA_RADIUS[soda.type]) * Math.sin(angle);
      // Bounce
      let vn = soda.vx * Math.cos(angle) + soda.vy * Math.sin(angle);
      soda.vx -= 2 * vn * Math.cos(angle) * 0.8;
      soda.vy -= 2 * vn * Math.sin(angle) * 0.8;
      soda.vx *= FRICTION;
      soda.vy *= FRICTION;
    } else {
      // Floor collision
      if (soda.y + SODA_RADIUS[soda.type] > HEIGHT) {
        soda.y = HEIGHT - SODA_RADIUS[soda.type];
        soda.vy *= -0.5;
        soda.vx *= FRICTION;
      }
    }
  }

  // Soda-soda collision
  for (let i=0;i<sodas.length;i++) {
    for (let j=i+1;j<sodas.length;j++) {
      let a = sodas[i], b = sodas[j];
      let dx = b.x - a.x, dy = b.y - a.y;
      let dist = Math.sqrt(dx*dx + dy*dy);
      let minDist = SODA_RADIUS[a.type] + SODA_RADIUS[b.type];
      if (dist < minDist) {
        // Merge if same type and not merging already
        if (a.type === b.type && !a.merging && !b.merging) {
          if (a.type < sodaImages.length-1) {
            // Merge into next type
            let mx = (a.x + b.x)/2;
            let my = (a.y + b.y)/2;
            sodas.push({
              x: mx, y: my,
              vx: (a.vx+b.vx)/2,
              vy: (a.vy+b.vy)/2,
              type: a.type+1,
              merging: true,
              mergeTimer: 20
            });
            score += (a.type+1)*10;
            scoreEl.textContent = "Score: "+score;
          }
          // Remove merged sodas
          a.merging = b.merging = true;
          a.mergeTimer = b.mergeTimer = 20;
        } else {
          // Physics push
          let angle = Math.atan2(dy, dx);
          let overlap = minDist-dist;
          a.x -= overlap/2 * Math.cos(angle);
          a.y -= overlap/2 * Math.sin(angle);
          b.x += overlap/2 * Math.cos(angle);
          b.y += overlap/2 * Math.sin(angle);
        }
      }
    }
  }

  // Remove merged sodas
  sodas = sodas.filter(s=>!(s.merging&&(s.mergeTimer--<=0)));

  // Detect overflow
  for (let soda of sodas) {
    if (soda.y - SODA_RADIUS[soda.type] < 0) {
      endGame();
      break;
    }
  }
}

function nextSodaType() {
  return Math.floor(Math.random()*Math.min(4, sodaImages.length)); // Early-game: smaller types
}

dropButton.addEventListener('mousemove', e => {
  let rect = canvas.getBoundingClientRect();
  dropX = Math.min(WIDTH-30, Math.max(30, e.clientX - rect.left));
});

dropButton.addEventListener('touchmove', e => {
  let rect = canvas.getBoundingClientRect();
  let touch = e.touches[0];
  dropX = Math.min(WIDTH-30, Math.max(30, touch.clientX - rect.left));
});

dropButton.addEventListener('click', () => {
  if (dropping || gameOver) return;
  dropping = true;
  let type = nextSodaType();
  sodas.push({
    x: dropX,
    y: 30,
    vx: 0,
    vy: 0,
    type: type,
    merging: false
  });
  dropButton.disabled = true;
  setTimeout(()=>{
    dropping = false;
    dropButton.disabled = false;
  },350);
});

restartButton.addEventListener('click', () => {
  startGame();
});

function endGame() {
  gameOver = true;
  dropButton.disabled = true;
  gameOverEl.style.display = "block";
  restartButton.style.display = "inline-block";
}

function gameLoop() {
  update();
  draw();
  requestAnimationFrame(gameLoop);
}

startGame();
gameLoop();
