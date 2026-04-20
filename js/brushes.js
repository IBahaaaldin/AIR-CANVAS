// js/brushes.js — pure brush functions
// All functions: (ctx, from, to, color, size) → draws on ctx, no other side effects.
// `from` and `to` are {x, y} in canvas pixel coordinates.

// ─── Helpers ──────────────────────────────────────────────────────────────────
function linePath(ctx, from, to) {
  ctx.beginPath();
  ctx.moveTo(from.x, from.y);
  ctx.lineTo(to.x, to.y);
  ctx.stroke();
}

// Blend a hex color toward white by `amount` (0–1).
function lightenHex(hex, amount) {
  if (!hex || !hex.startsWith('#') || hex.length !== 7) return hex;
  const r  = parseInt(hex.slice(1, 3), 16);
  const g  = parseInt(hex.slice(3, 5), 16);
  const b  = parseInt(hex.slice(5, 7), 16);
  const lr = Math.min(255, Math.round(r + (255 - r) * amount));
  const lg = Math.min(255, Math.round(g + (255 - g) * amount));
  const lb = Math.min(255, Math.round(b + (255 - b) * amount));
  return `rgb(${lr},${lg},${lb})`;
}

// ─── Pencil ───────────────────────────────────────────────────────────────────
export function drawPencil(ctx, from, to, color, size) {
  ctx.save();
  ctx.lineCap    = 'round';
  ctx.lineJoin   = 'round';
  ctx.lineWidth  = Math.max(1, size * 0.5);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 1;
  linePath(ctx, from, to);
  ctx.restore();
}

// ─── Marker ───────────────────────────────────────────────────────────────────
// Thick, semi-opaque felt-tip look. Natural overlap stacking via lower alpha.
export function drawMarker(ctx, from, to, color, size) {
  ctx.save();
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  ctx.lineWidth   = Math.max(2, size * 2.5);
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.85;
  linePath(ctx, from, to);
  ctx.restore();
}

// ─── Neon Glow ────────────────────────────────────────────────────────────────
// Three draw passes: wide outer glow → mid bloom → bright core.
export function drawNeon(ctx, from, to, color, size) {
  ctx.save();
  ctx.lineCap  = 'round';
  ctx.lineJoin = 'round';

  // Pass 1 — outer glow (wide, transparent)
  ctx.globalAlpha  = 0.22;
  ctx.lineWidth    = size * 4;
  ctx.shadowBlur   = 24;
  ctx.shadowColor  = color;
  ctx.strokeStyle  = color;
  linePath(ctx, from, to);

  // Pass 2 — mid bloom
  ctx.globalAlpha  = 0.5;
  ctx.lineWidth    = size * 1.5;
  ctx.shadowBlur   = 12;
  linePath(ctx, from, to);

  // Pass 3 — bright core
  ctx.globalAlpha  = 1.0;
  ctx.lineWidth    = Math.max(1, size * 0.4);
  ctx.shadowBlur   = 6;
  ctx.strokeStyle  = lightenHex(color, 0.35);
  linePath(ctx, from, to);

  ctx.restore();
}

// ─── Spray ────────────────────────────────────────────────────────────────────
// Gaussian scatter of dots around `to`. Bypasses MIN_MOVE guard in drawing.js
// (spray intentionally works when the hand is stationary — more dots = denser).
export function drawSpray(ctx, _from, to, color, size) {
  ctx.save();
  ctx.fillStyle = color;
  const count  = Math.floor(size * 2.5);
  const radius = size * 3;

  for (let i = 0; i < count; i++) {
    // Box-Muller transform for Gaussian scatter
    const u1    = Math.random() || 1e-10;
    const u2    = Math.random();
    const mag   = radius * Math.sqrt(-2 * Math.log(u1));
    const theta = 2 * Math.PI * u2;
    const x     = to.x + mag * Math.cos(theta);
    const y     = to.y + mag * Math.sin(theta);

    ctx.globalAlpha = 0.5 + Math.random() * 0.5;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + Math.random() * 1.2, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// ─── Eraser ───────────────────────────────────────────────────────────────────
// Uses destination-out to punch through drawCanvas → reveals bgCanvas below.
// color param unused (composite op removes regardless of paint color).
export function drawEraser(ctx, from, to, _color, size) {
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  ctx.lineCap     = 'round';
  ctx.lineJoin    = 'round';
  // Much larger than other brushes — fast coverage for quick deletion
  ctx.lineWidth   = Math.max(20, size * 8);
  ctx.strokeStyle = 'rgba(0,0,0,1)';
  ctx.globalAlpha = 1;
  linePath(ctx, from, to);
  ctx.restore();
}
