// js/drawing.js — stroke accumulation + brush dispatch
// Supports symmetry mode: mirrors each stroke around the vertical center axis.

import { state, drawCtx } from './main.js';
import { drawPencil, drawMarker, drawNeon, drawSpray, drawEraser } from './brushes.js';
import { pushSnapshot } from './history.js';

const MIN_MOVE = 2;   // px — min movement before drawing a segment

let lastPt = null;    // {x, y} canvas coords of previous draw point

const BRUSHES = {
  pencil: { fn: drawPencil,  requiresMove: true  },
  marker: { fn: drawMarker,  requiresMove: true  },
  neon:   { fn: drawNeon,    requiresMove: true  },
  spray:  { fn: drawSpray,   requiresMove: false }, // spray works when stationary
  eraser: { fn: drawEraser,  requiresMove: true  },
};

export function beginStroke(pt) {
  lastPt = pt;
}

export function continueStroke(pt) {
  if (!lastPt) { beginStroke(pt); return; }

  const brush = BRUSHES[state.tool] || BRUSHES.pencil;
  const dx    = pt.x - lastPt.x;
  const dy    = pt.y - lastPt.y;

  if (brush.requiresMove && Math.hypot(dx, dy) < MIN_MOVE) return;

  // Slight pressure simulation: slow = thicker, fast = thinner
  const speedFactor = Math.max(0.6, 1.1 - Math.min(state.handVelocity * 0.012, 0.5));
  const size = state.brushSize * (state.width / 1280) * speedFactor;

  brush.fn(drawCtx, lastPt, pt, state.color, size);

  // Symmetry mode: mirror stroke around the vertical center line
  if (state.symmetry) {
    const mFrom = { x: state.width - lastPt.x, y: lastPt.y };
    const mTo   = { x: state.width - pt.x,     y: pt.y     };
    brush.fn(drawCtx, mFrom, mTo, state.color, size);
  }

  lastPt = pt;
}

export function endStroke() {
  if (lastPt !== null) {
    pushSnapshot();
    lastPt = null;
  }
}

export function clearCanvas() {
  drawCtx.clearRect(0, 0, state.width, state.height);
  pushSnapshot();
}
