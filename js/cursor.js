// js/cursor.js — animated fingertip cursor + brush preview
// Drawn on cursorCanvas each frame (cleared at start of frame in main.js).
//
// Pen-up:   spinning dashed ring showing approximate brush footprint
// Pen-down: solid colored glowing ring + center dot
// Eraser:   large hollow circle showing actual erase area + crosshair

import { state, cursorCtx } from './main.js';

let ringPhase = 0;

export function drawCursor(hand) {
  if (!hand || !hand[8]) return;

  const index = hand[8];
  const x = index.x * state.width;
  const y = index.y * state.height;

  ringPhase = (ringPhase + 0.13) % (Math.PI * 2);
  const pulse = Math.sin(ringPhase);

  // Effective brush radius on screen (matches drawing.js size calculation)
  const brushRadius = (state.brushSize * (state.width / 1280)) * 0.5;

  cursorCtx.save();

  if (state.tool === 'eraser' && !state.isPenDown) {
    // ── Eraser preview: large hollow circle ─────────────────────────────────
    const eraserR = (state.brushSize * (state.width / 1280)) * 3 + pulse * 2;

    cursorCtx.beginPath();
    cursorCtx.arc(x, y, eraserR, 0, Math.PI * 2);
    cursorCtx.strokeStyle  = 'rgba(255,100,100,0.75)';
    cursorCtx.lineWidth    = 2;
    cursorCtx.setLineDash([4, 4]);
    cursorCtx.shadowBlur   = 8;
    cursorCtx.shadowColor  = 'rgba(255,100,100,0.4)';
    cursorCtx.globalAlpha  = 0.8;
    cursorCtx.stroke();

    // Crosshair inside eraser circle
    cursorCtx.setLineDash([]);
    cursorCtx.lineWidth   = 1;
    cursorCtx.globalAlpha = 0.4;
    cursorCtx.strokeStyle = 'rgba(255,100,100,0.6)';
    cursorCtx.beginPath(); cursorCtx.moveTo(x - 6, y); cursorCtx.lineTo(x + 6, y); cursorCtx.stroke();
    cursorCtx.beginPath(); cursorCtx.moveTo(x, y - 6); cursorCtx.lineTo(x, y + 6); cursorCtx.stroke();

  } else if (state.isPenDown) {
    // ── Pen-down: compact colored glowing ring + dot ─────────────────────────
    const innerR = Math.max(3, brushRadius * 0.8 + pulse * 0.5);

    // Glow ring
    cursorCtx.beginPath();
    cursorCtx.arc(x, y, innerR + 4, 0, Math.PI * 2);
    cursorCtx.strokeStyle = state.color;
    cursorCtx.lineWidth   = 2;
    cursorCtx.shadowBlur  = 16;
    cursorCtx.shadowColor = state.color;
    cursorCtx.globalAlpha = 0.85;
    cursorCtx.stroke();

    // Center dot
    cursorCtx.beginPath();
    cursorCtx.arc(x, y, 2.5, 0, Math.PI * 2);
    cursorCtx.fillStyle   = '#ffffff';
    cursorCtx.shadowBlur  = 6;
    cursorCtx.shadowColor = state.color;
    cursorCtx.globalAlpha = 1;
    cursorCtx.fill();

  } else {
    // ── Pen-up: spinning dashed ring showing brush footprint ─────────────────
    const outerR = Math.max(10, brushRadius + 8 + pulse * 1.5);

    cursorCtx.beginPath();
    cursorCtx.arc(x, y, outerR, 0, Math.PI * 2);
    cursorCtx.setLineDash([5, 6]);
    cursorCtx.lineDashOffset = -ringPhase * 8;
    cursorCtx.strokeStyle    = 'rgba(255,255,255,0.65)';
    cursorCtx.lineWidth      = 1.5;
    cursorCtx.shadowBlur     = 5;
    cursorCtx.shadowColor    = 'rgba(255,255,255,0.3)';
    cursorCtx.globalAlpha    = 0.7;
    cursorCtx.stroke();

    // Tiny center dot so user can see exact index tip position
    cursorCtx.setLineDash([]);
    cursorCtx.beginPath();
    cursorCtx.arc(x, y, 2, 0, Math.PI * 2);
    cursorCtx.fillStyle   = state.color;
    cursorCtx.shadowBlur  = 4;
    cursorCtx.shadowColor = state.color;
    cursorCtx.globalAlpha = 0.9;
    cursorCtx.fill();

    // If symmetry active, show mirror-cursor too
    if (state.symmetry) {
      const mx = state.width - x;
      cursorCtx.beginPath();
      cursorCtx.arc(mx, y, outerR * 0.65, 0, Math.PI * 2);
      cursorCtx.setLineDash([3, 5]);
      cursorCtx.strokeStyle = 'rgba(0,255,204,0.4)';
      cursorCtx.lineWidth   = 1;
      cursorCtx.globalAlpha = 0.5;
      cursorCtx.stroke();
    }
  }

  cursorCtx.restore();
}
