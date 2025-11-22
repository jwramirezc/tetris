const canvas = document.getElementById('tetris');
const context = canvas.getContext('2d');
const scoreElement = document.getElementById('score');
const levelElement = document.getElementById('level');
const startBtn = document.getElementById('start-btn');
const restartBtn = document.getElementById('restart-btn');
const gameOverScreen = document.getElementById('game-over');
const finalScoreElement = document.getElementById('final-score');
const pauseScreen = document.getElementById('pause-screen');

// Game constants
const COLS = 12;
const ROWS = 20;
const BLOCK_SIZE = 20; // Scaled by context.scale

// Función para ajustar el tamaño del canvas de forma responsive
function resizeCanvas() {
  const container = canvas.parentElement;
  const gameContainer = document.querySelector('.game-container');

  // Calcular espacio disponible considerando padding y gaps
  const containerPadding = 40; // padding del game-container
  const gap = 32; // gap entre elementos
  const sidePanelsWidth = 300; // ancho aproximado de paneles laterales

  // Calcular espacio disponible en viewport
  const viewportWidth = window.innerWidth - containerPadding * 2;
  const viewportHeight = window.innerHeight - containerPadding * 2;

  // En pantallas grandes, considerar paneles laterales
  let availableWidth = viewportWidth;
  let availableHeight = viewportHeight;

  if (window.innerWidth > 1024) {
    // Layout horizontal: restar espacio de paneles laterales
    availableWidth = viewportWidth - sidePanelsWidth * 2 - gap * 2;
  } else {
    // Layout vertical: más espacio horizontal pero menos vertical
    availableHeight = viewportHeight - 400; // espacio para paneles arriba/abajo
  }

  // Calcular tamaño máximo basado en proporción del juego (12:20 = 0.6)
  const maxWidthByHeight = availableHeight * (COLS / ROWS);
  const maxHeightByWidth = availableWidth * (ROWS / COLS);

  // Elegir el tamaño que quepa en ambos sentidos
  let canvasWidth = Math.min(availableWidth, maxWidthByHeight);
  let canvasHeight = canvasWidth * (ROWS / COLS);

  // Si la altura calculada es mayor que la disponible, ajustar por altura
  if (canvasHeight > availableHeight) {
    canvasHeight = availableHeight;
    canvasWidth = canvasHeight * (COLS / ROWS);
  }

  // Asegurar un tamaño mínimo pero que no exceda el disponible
  const minSize = Math.min(200, availableWidth * 0.8);
  if (canvasWidth < minSize) {
    canvasWidth = minSize;
    canvasHeight = canvasWidth * (ROWS / COLS);
    // Si aún no cabe, reducir más
    if (canvasHeight > availableHeight) {
      canvasHeight = availableHeight * 0.9;
      canvasWidth = canvasHeight * (COLS / ROWS);
    }
  }

  // Asegurar que no exceda los límites
  canvasWidth = Math.min(canvasWidth, availableWidth);
  canvasHeight = Math.min(canvasHeight, availableHeight);

  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  // Calcular la escala basada en el nuevo tamaño
  const scaleX = canvasWidth / COLS;
  const scaleY = canvasHeight / ROWS;

  // Resetear transformaciones y aplicar nueva escala
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(scaleX, scaleY);

  // Redibujar si el juego ya está iniciado
  if (player.matrix || arena.some(row => row.some(cell => cell !== 0))) {
    draw();
  }
}

// Ajustar el canvas al cargar y al redimensionar la ventana
resizeCanvas();
window.addEventListener('resize', resizeCanvas);

// Game state
let dropCounter = 0;
let dropInterval = 1000;
let lastTime = 0;
let score = 0;
let level = 1;
let isPaused = false;
let isGameOver = false;
let animationId = null;

// The arena (game board)
const arena = createMatrix(COLS, ROWS);

// The player (current piece)
const player = {
  pos: { x: 0, y: 0 },
  matrix: null,
  score: 0,
};

// Tetromino colors
const colors = [
  null,
  '#FF0D72', // T
  '#0DC2FF', // O
  '#0DFF72', // L
  '#F538FF', // J
  '#FF8E0D', // I
  '#FFE138', // S
  '#3877FF', // Z
];

// Crea una matriz bidimensional (tablero) de ancho w y alto h, inicializada con ceros
function createMatrix(w, h) {
  const matrix = [];
  while (h--) {
    matrix.push(new Array(w).fill(0));
  }
  return matrix;
}

// Crea y retorna la matriz que representa una pieza de Tetris según su tipo (I, L, J, O, Z, S, T)
function createPiece(type) {
  if (type === 'I') {
    return [
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
      [0, 1, 0, 0],
    ];
  } else if (type === 'L') {
    return [
      [0, 2, 0],
      [0, 2, 0],
      [0, 2, 2],
    ];
  } else if (type === 'J') {
    return [
      [0, 3, 0],
      [0, 3, 0],
      [3, 3, 0],
    ];
  } else if (type === 'O') {
    return [
      [4, 4],
      [4, 4],
    ];
  } else if (type === 'Z') {
    return [
      [5, 5, 0],
      [0, 5, 5],
      [0, 0, 0],
    ];
  } else if (type === 'S') {
    return [
      [0, 6, 6],
      [6, 6, 0],
      [0, 0, 0],
    ];
  } else if (type === 'T') {
    return [
      [0, 7, 0],
      [7, 7, 7],
      [0, 0, 0],
    ];
  }
}

// Dibuja una matriz en el canvas en la posición especificada por offset, usando los colores definidos
function drawMatrix(matrix, offset) {
  matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        context.fillStyle = colors[value];
        context.fillRect(x + offset.x, y + offset.y, 1, 1);

        // Add a slight bevel effect
        context.lineWidth = 0.05;
        context.strokeStyle = 'rgba(255, 255, 255, 0.5)';
        context.strokeRect(x + offset.x, y + offset.y, 1, 1);
      }
    });
  });
}

// Dibuja el estado completo del juego: limpia el canvas, dibuja la arena y la pieza actual del jugador
function draw() {
  context.fillStyle = '#0f0f1a';
  context.fillRect(0, 0, COLS, ROWS);

  drawMatrix(arena, { x: 0, y: 0 });
  if (player.matrix) {
    drawMatrix(player.matrix, player.pos);
  }
}

// Fusiona la pieza del jugador en la arena cuando se coloca en su posición final
function merge(arena, player) {
  player.matrix.forEach((row, y) => {
    row.forEach((value, x) => {
      if (value !== 0) {
        arena[y + player.pos.y][x + player.pos.x] = value;
      }
    });
  });
}

// Rota una matriz 90 grados en la dirección especificada (1 = sentido horario, -1 = sentido antihorario)
function rotate(matrix, dir) {
  for (let y = 0; y < matrix.length; ++y) {
    for (let x = 0; x < y; ++x) {
      [matrix[x][y], matrix[y][x]] = [matrix[y][x], matrix[x][y]];
    }
  }

  if (dir > 0) {
    matrix.forEach(row => row.reverse());
  } else {
    matrix.reverse();
  }
}

// Hace caer la pieza del jugador una posición hacia abajo. Si colisiona, la coloca y genera una nueva pieza
function playerDrop() {
  player.pos.y++;
  if (collide(arena, player)) {
    player.pos.y--;
    merge(arena, player);
    playerReset();
    arenaSweep();
    updateScore();
  }
  dropCounter = 0;
}

// Mueve la pieza del jugador horizontalmente (offset positivo = derecha, negativo = izquierda) si no hay colisión
function playerMove(offset) {
  player.pos.x += offset;
  if (collide(arena, player)) {
    player.pos.x -= offset;
  }
}

// Genera una nueva pieza aleatoria y la coloca en la parte superior central del tablero. Si colisiona, termina el juego
function playerReset() {
  const pieces = 'ILJOTSZ';
  player.matrix = createPiece(pieces[(pieces.length * Math.random()) | 0]);
  player.pos.y = 0;
  player.pos.x =
    ((arena[0].length / 2) | 0) - ((player.matrix[0].length / 2) | 0);

  if (collide(arena, player)) {
    gameOver();
  }
}

// Rota la pieza del jugador e intenta ajustar su posición si hay colisión (wall kick). Si no es posible, revierte la rotación
function playerRotate(dir) {
  const pos = player.pos.x;
  let offset = 1;
  rotate(player.matrix, dir);
  while (collide(arena, player)) {
    player.pos.x += offset;
    offset = -(offset + (offset > 0 ? 1 : -1));
    if (offset > player.matrix[0].length) {
      rotate(player.matrix, -dir);
      player.pos.x = pos;
      return;
    }
  }
}

// Verifica si la pieza del jugador colisiona con los bloques de la arena o con los bordes del tablero
function collide(arena, player) {
  const [m, o] = [player.matrix, player.pos];
  for (let y = 0; y < m.length; ++y) {
    for (let x = 0; x < m[y].length; ++x) {
      if (m[y][x] !== 0 && (arena[y + o.y] && arena[y + o.y][x + o.x]) !== 0) {
        return true;
      }
    }
  }
  return false;
}

// Elimina las filas completas de la arena, las mueve hacia arriba y calcula la puntuación (más filas = más puntos)
function arenaSweep() {
  let rowCount = 1;
  outer: for (let y = arena.length - 1; y > 0; --y) {
    for (let x = 0; x < arena[y].length; ++x) {
      if (arena[y][x] === 0) {
        continue outer;
      }
    }

    const row = arena.splice(y, 1)[0].fill(0);
    arena.unshift(row);
    ++y;

    player.score += rowCount * 10;
    rowCount *= 2;
  }
}

// Actualiza el elemento HTML que muestra la puntuación actual del jugador
function updateScore() {
  scoreElement.innerText = player.score;
}

// Finaliza el juego: detiene la animación y muestra la pantalla de game over con la puntuación final
function gameOver() {
  isGameOver = true;
  cancelAnimationFrame(animationId);
  gameOverScreen.classList.remove('hidden');
  finalScoreElement.innerText = player.score;
}

// Reinicia el juego: limpia la arena, resetea la puntuación, oculta la pantalla de game over y genera una nueva pieza
function resetGame() {
  arena.forEach(row => row.fill(0));
  player.score = 0;
  updateScore();
  dropInterval = 1000;
  isGameOver = false;
  isPaused = false;
  gameOverScreen.classList.add('hidden');
  playerReset();
  update();
}

// Función principal del bucle del juego: controla la caída automática de las piezas y redibuja el canvas en cada frame
function update(time = 0) {
  if (isPaused || isGameOver) return;

  const deltaTime = time - lastTime;
  lastTime = time;

  dropCounter += deltaTime;
  if (dropCounter > dropInterval) {
    playerDrop();
  }

  draw();
  animationId = requestAnimationFrame(update);
}

document.addEventListener('keydown', event => {
  if (isGameOver) return;

  if (event.keyCode === 37) {
    // Left
    playerMove(-1);
  } else if (event.keyCode === 39) {
    // Right
    playerMove(1);
  } else if (event.keyCode === 40) {
    // Down
    playerDrop();
  } else if (event.keyCode === 38) {
    // Up
    playerRotate(1);
  } else if (event.key === 'p' || event.key === 'P') {
    togglePause();
  }
});

// Alterna el estado de pausa del juego: muestra/oculta la pantalla de pausa y detiene/reanuda la animación
function togglePause() {
  if (isGameOver) return;
  isPaused = !isPaused;
  if (isPaused) {
    pauseScreen.classList.remove('hidden');
    cancelAnimationFrame(animationId);
  } else {
    pauseScreen.classList.add('hidden');
    lastTime = performance.now(); // Reset time to avoid jump
    update();
  }
}

startBtn.addEventListener('click', () => {
  if (animationId) cancelAnimationFrame(animationId);
  resetGame();
});

restartBtn.addEventListener('click', () => {
  resetGame();
});
