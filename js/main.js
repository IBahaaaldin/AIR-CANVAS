// js/main.js — global state, render loop, init wiring

import { initMediaPipe } from './mediapipe.js';
import { processGestures } from './gestures.js';
import { initPalette } from './palette.js';
import { takeScreenshot, startRecording, stopRecording } from './capture.js';
import { undo, redo } from './history.js';
import { clearCanvas, endStroke } from './drawing.js';
import { drawCursor } from './cursor.js';

// ─── Canvas refs ─────────────────────────────────────────────────────────────
export const bgCanvas       = document.getElementById('bgCanvas');
export const drawCanvas     = document.getElementById('drawCanvas');
export const skeletonCanvas = document.getElementById('skeletonCanvas');
export const cursorCanvas   = document.getElementById('cursorCanvas');

export const bgCtx       = bgCanvas.getContext('2d');
export const drawCtx     = drawCanvas.getContext('2d');
export const skeletonCtx = skeletonCanvas.getContext('2d');
export const cursorCtx   = cursorCanvas.getContext('2d');

export const videoElement = document.querySelector('.input_video');

// ─── UI refs ─────────────────────────────────────────────────────────────────
export const uiHands   = document.getElementById('ui-hands');
export const uiFps     = document.getElementById('ui-fps');
export const uiTool    = document.getElementById('ui-tool');
export const uiGesture = document.getElementById('ui-gesture');
export const uiPen     = document.getElementById('ui-pen');

// ─── Shared state ────────────────────────────────────────────────────────────
export const state = {
  width:         0,
  height:        0,
  hands:         [],
  tool:          'pencil',   // 'pencil' | 'marker' | 'neon' | 'spray' | 'eraser'
  color:         '#00ffcc',
  brushSize:     8,
  isPenDown:     false,
  symmetry:      false,      // mirror drawing on vertical axis
  handVelocity:  0,          // index-finger speed between frames (canvas pixels)
  canvasTheme:   'dark',
  recording:     false,
  facingMode:    'user',
};

export const FINGER_TIPS = [4, 8, 12, 16, 20];

export function mapToCanvas(pt) {
  return { x: pt.x * state.width, y: pt.y * state.height };
}

// ─── Background fill ─────────────────────────────────────────────────────────
// bgCanvas is intentionally left transparent so the live video shows through.
// "Canvas theme" controls the video filter (dark = dimmed, light = brighter).
export function fillBackground() {
  const video = document.querySelector('.input_video');
  if (!video) return;
  video.style.filter = state.canvasTheme === 'dark'
    ? 'brightness(0.6) contrast(1.1)'
    : 'brightness(0.85) contrast(1.0) saturate(1.1)';
}

// ─── Symmetry toggle ─────────────────────────────────────────────────────────
export function toggleSymmetry() {
  state.symmetry = !state.symmetry;
  const btn = document.getElementById('symmetryBtn');
  if (btn) btn.classList.toggle('active', state.symmetry);
}

// ─── Toast notification ──────────────────────────────────────────────────────
const toastEl    = document.getElementById('toast');
let   toastTimer = null;

export function showToast(msg) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toastEl.classList.remove('visible'), 1600);
}

// ─── Resize ──────────────────────────────────────────────────────────────────
function resize() {
  window.dispatchEvent(new Event('canvasresize'));
  state.width  = window.innerWidth;
  state.height = window.innerHeight;
  for (const c of [bgCanvas, drawCanvas, skeletonCanvas, cursorCanvas]) {
    c.width  = state.width;
    c.height = state.height;
  }
  // bgCanvas intentionally NOT filled — transparent so live video shows through.
}
window.addEventListener('resize', resize);
resize();

// ─── Timing ──────────────────────────────────────────────────────────────────
let lastTime         = 0;
let framesThisSecond = 0;
let lastFpsTime      = performance.now();
let loopRunning      = false;

// ─── Render loop ─────────────────────────────────────────────────────────────
function renderLoop(timestamp) {
  requestAnimationFrame(renderLoop);
  if (lastTime === 0) lastTime = timestamp;
  lastTime = timestamp;

  framesThisSecond++;
  if (timestamp > lastFpsTime + 1000) {
    uiFps.textContent  = framesThisSecond;
    framesThisSecond   = 0;
    lastFpsTime        = timestamp;
  }

  skeletonCtx.clearRect(0, 0, state.width, state.height);
  cursorCtx.clearRect(0, 0, state.width, state.height);

  if (state.hands.length > 0) {
    processGestures();
    drawSkeleton();
    drawCursor(state.hands[0]);
  } else {
    if (state.isPenDown) {
      endStroke();
      state.isPenDown = false;
    }
    uiGesture.textContent = 'None';
  }

  drawWatermark();
  if (state.symmetry) drawSymmetryLine();

  uiHands.textContent = state.hands.length;
  uiPen.textContent   = state.isPenDown ? 'DOWN ●' : 'UP';
}

// ─── Skeleton overlay ────────────────────────────────────────────────────────
function drawSkeleton() {
  if (typeof drawConnectors === 'undefined' || typeof HAND_CONNECTIONS === 'undefined') return;
  skeletonCtx.save();
  state.hands.forEach(hand => {
    // eslint-disable-next-line no-undef
    drawConnectors(skeletonCtx, hand, HAND_CONNECTIONS, {
      color: 'rgba(255,255,255,0.15)',
      lineWidth: 1,
    });
  });
  skeletonCtx.restore();
}

// ─── Symmetry center line ────────────────────────────────────────────────────
function drawSymmetryLine() {
  cursorCtx.save();
  // Undo CSS mirror so coordinates map to screen correctly
  cursorCtx.translate(state.width, 0);
  cursorCtx.scale(-1, 1);
  const cx = state.width / 2;
  cursorCtx.setLineDash([6, 10]);
  cursorCtx.strokeStyle = 'rgba(0,255,204,0.3)';
  cursorCtx.lineWidth   = 1;
  cursorCtx.shadowBlur  = 6;
  cursorCtx.shadowColor = 'rgba(0,255,204,0.3)';
  cursorCtx.beginPath();
  cursorCtx.moveTo(cx, 0);
  cursorCtx.lineTo(cx, state.height);
  cursorCtx.stroke();
  cursorCtx.restore();
}

// ─── Watermark (drawn on cursorCanvas so it never pollutes the drawing) ──────
function drawWatermark() {
  cursorCtx.save();
  // Undo CSS mirror so text reads correctly at screen bottom-right
  cursorCtx.translate(state.width, 0);
  cursorCtx.scale(-1, 1);

  const x = state.width - 16;
  const y = state.height - 10;

  // Name line
  cursorCtx.font          = 'bold 12px "Inter", sans-serif';
  cursorCtx.textAlign     = 'right';
  cursorCtx.textBaseline  = 'bottom';
  cursorCtx.shadowBlur    = 8;
  cursorCtx.shadowColor   = 'rgba(0,255,204,0.6)';
  cursorCtx.fillStyle     = 'rgba(0,255,204,0.55)';
  cursorCtx.globalAlpha   = 0.55;
  cursorCtx.fillText('Bahaa Mohammed', x, y);

  // Role line
  cursorCtx.shadowBlur  = 0;
  cursorCtx.font        = '10px "Inter", sans-serif';
  cursorCtx.fillStyle   = 'rgba(255,255,255,0.3)';
  cursorCtx.globalAlpha = 0.5;
  cursorCtx.fillText('Full-Stack Product Engineer · AI-Augmented Developer', x, y - 15);

  cursorCtx.restore();
}

// ─── Tool setter ─────────────────────────────────────────────────────────────
export function setTool(tool) {
  state.tool = tool;
  if (uiTool) uiTool.textContent = tool;
  document.querySelectorAll('.tool-btn').forEach(b =>
    b.classList.toggle('active', b.dataset.tool === tool)
  );
}

// ─── Action bar ──────────────────────────────────────────────────────────────
document.getElementById('screenshotBtn').addEventListener('click', takeScreenshot);

document.getElementById('recordBtn').addEventListener('click', () => {
  const btn  = document.getElementById('recordBtn');
  const icon = document.getElementById('recordIcon');
  if (state.recording) {
    stopRecording();
    btn.classList.remove('active');
    icon.setAttribute('data-lucide', 'circle');
  } else {
    startRecording();
    btn.classList.add('active');
    icon.setAttribute('data-lucide', 'square');
  }
  if (typeof lucide !== 'undefined') lucide.createIcons({ nodes: [icon] });
});

document.getElementById('undoBtn').addEventListener('click', () => { undo(); showToast('↩ Undo'); });
document.getElementById('redoBtn').addEventListener('click', () => { redo(); showToast('↪ Redo'); });
document.getElementById('clearBtn').addEventListener('click', () => { clearCanvas(); showToast('🗑 Cleared'); });

if (!window.MediaRecorder) document.getElementById('recordBtn').style.display = 'none';

// ─── Camera toggle ───────────────────────────────────────────────────────────
document.getElementById('cameraToggle').addEventListener('click', () => {
  state.facingMode = state.facingMode === 'user' ? 'environment' : 'user';
  initMediaPipe();
});

// ─── Symmetry button ─────────────────────────────────────────────────────────
document.getElementById('symmetryBtn').addEventListener('click', () => {
  toggleSymmetry();
  showToast(state.symmetry ? '⇔ Symmetry ON' : '⇔ Symmetry OFF');
});

// ─── Canvas theme button ─────────────────────────────────────────────────────
// (wired in palette.js via initPalette, but button also needs direct wire for label)

// ─── Keyboard shortcuts ──────────────────────────────────────────────────────
document.addEventListener('keydown', e => {
  if (!loopRunning) return;
  if (e.ctrlKey || e.metaKey) {
    if (e.key === 'z') { e.preventDefault(); undo(); showToast('↩ Undo'); }
    if (e.key === 'y') { e.preventDefault(); redo(); showToast('↪ Redo'); }
    return;
  }
  switch (e.key) {
    case '1': setTool('pencil'); showToast('✏️ Pencil'); break;
    case '2': setTool('marker'); showToast('🖊️ Marker'); break;
    case '3': setTool('neon');   showToast('✨ Neon');   break;
    case '4': setTool('spray');  showToast('💨 Spray');  break;
    case 'e': case 'E': setTool('eraser'); showToast('🗑️ Eraser'); break;
    case 's': case 'S': toggleSymmetry(); showToast(state.symmetry ? '⇔ Symmetry ON' : '⇔ Symmetry OFF'); break;
    case 'Delete': case 'Backspace': clearCanvas(); showToast('🗑 Cleared'); break;
  }
});

// ─── Start button ────────────────────────────────────────────────────────────
document.getElementById('startBtn').addEventListener('click', () => {
  document.getElementById('startOverlay').classList.add('hidden');
  document.getElementById('leftPanel').classList.remove('hidden');
  document.getElementById('swatchBar').classList.remove('hidden');
  document.getElementById('actionBar').classList.remove('hidden');

  initPalette();
  initMediaPipe();

  if (!loopRunning) {
    loopRunning = true;
    requestAnimationFrame(renderLoop);
  }
});
