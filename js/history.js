// js/history.js — undo/redo with imageData ring buffer
// Snapshot granularity: one per completed stroke (endStroke) or clear action.
// MAX_STATES × ~8MB (1080p) ≈ 160MB worst case; reduced to 10 on mobile.

import { drawCtx, state } from './main.js';

const isMobile   = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
const MAX_STATES = isMobile ? 10 : 20;

const stack  = [];   // ImageData[]
let   cursor = -1;   // index of the currently visible state (-1 = blank canvas)

// When the canvas is resized, all snapshots become dimension-invalid → clear.
window.addEventListener('canvasresize', clearHistory);

// Push the current drawCanvas pixel state onto the undo stack.
export function pushSnapshot() {
  // Drop any redo tail that exists beyond the current cursor position.
  if (cursor < stack.length - 1) {
    stack.splice(cursor + 1);
  }

  stack.push(drawCtx.getImageData(0, 0, state.width, state.height));

  // FIFO eviction: if over the limit, remove the oldest entry.
  if (stack.length > MAX_STATES) stack.shift();

  cursor = stack.length - 1;
}

export function undo() {
  if (cursor > 0) {
    cursor--;
    drawCtx.putImageData(stack[cursor], 0, 0);
  } else if (cursor === 0) {
    // Undo past the first saved state → blank canvas
    cursor = -1;
    drawCtx.clearRect(0, 0, state.width, state.height);
  }
  // cursor === -1 → nothing further to undo
}

export function redo() {
  if (cursor < stack.length - 1) {
    cursor++;
    drawCtx.putImageData(stack[cursor], 0, 0);
  }
}

export function clearHistory() {
  stack.length = 0;
  cursor       = -1;
}
