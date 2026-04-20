// js/gestures.js — hand gesture classifier
//
// DETECTION METHOD
// ─────────────────
// tip.y < pip.y breaks when hand tilts sideways.
// Use distance-from-wrist instead:
//   fingerExtended = dist(tip, wrist) > dist(mcp, wrist) × 1.2
// Works at any hand orientation. Thumb-up uses Y axis (only valid use of Y).
// Holds are time-based (ms) not frame-based.

import { state, mapToCanvas, uiGesture, setTool, toggleSymmetry, showToast } from './main.js';
import { beginStroke, continueStroke, endStroke } from './drawing.js';
import { undo } from './history.js';

export function getDist(p1, p2) {
  return Math.hypot(p1.x - p2.x, p1.y - p2.y);
}

// Finger extended: tip farther from wrist than its MCP knuckle (× margin)
function ext(hand, tipIdx, mcpIdx) {
  return getDist(hand[tipIdx], hand[0]) > getDist(hand[mcpIdx], hand[0]) * 1.2;
}

const TOOLS = ['pencil', 'marker', 'neon', 'spray'];

// Pinch
let penDown = false;
const PINCH_ENTER = 0.055;
const PINCH_EXIT  = 0.08;

// Hold state — each gesture tracks its own start time + fired flag
const G = {
  peace: { start: null, done: false, ms: 700 },
  thumb: { start: null, done: false, ms: 700 },
  fist:  { start: null, done: false, ms: 800 },
  rock:  { start: null, done: false, ms: 700 },
};

function resetAll(...except) {
  for (const key of Object.keys(G)) {
    if (!except.includes(key)) { G[key].start = null; G[key].done = false; }
  }
}

// Advance a hold gesture. Returns progress 0–100. Calls cb once when complete.
function hold(key, now, cb) {
  const g = G[key];
  if (!g.start) g.start = now;
  const pct = Math.round(Math.min((now - g.start) / g.ms * 100, 100));
  if (pct >= 100 && !g.done) {
    g.done = true;
    cb();
  }
  return pct;
}

let prevIndexPt = null;

export function processGestures() {
  const now  = performance.now();
  const hand = state.hands[0];
  const wrist = hand[0];

  const indexPt = mapToCanvas(hand[8]);

  // Velocity for pressure simulation in drawing.js
  if (prevIndexPt) {
    state.handVelocity = Math.hypot(indexPt.x - prevIndexPt.x, indexPt.y - prevIndexPt.y);
  }
  prevIndexPt = indexPt;

  // ── Finger extension (MCP landmarks: index=5 middle=9 ring=13 pinky=17) ───
  const iE = ext(hand, 8,  5);   // index extended
  const mE = ext(hand, 12, 9);   // middle extended
  const rE = ext(hand, 16, 13);  // ring extended
  const pE = ext(hand, 20, 17);  // pinky extended

  // Thumb up: tip clearly above wrist on Y axis (pointing skyward)
  const thumbUp = hand[4].y < wrist.y - 0.08;

  // ── 👌 Pinch → draw ───────────────────────────────────────────────────────
  const pinchDist = getDist(hand[4], hand[8]);

  if (!penDown && pinchDist < PINCH_ENTER) {
    penDown = true; state.isPenDown = true;
    resetAll();
    beginStroke(indexPt);
    uiGesture.textContent = 'DRAWING ●';
    return;
  }
  if (penDown && pinchDist > PINCH_EXIT) {
    penDown = false; state.isPenDown = false;
    endStroke();
    uiGesture.textContent = 'Open';
    return;
  }
  if (penDown) { continueStroke(indexPt); return; }

  // ── Classify pose ─────────────────────────────────────────────────────────
  const isPeace = iE && mE && !rE && !pE;
  const isThumb = thumbUp && !iE && !mE && !rE && !pE;
  const isRock  = iE && !mE && !rE && pE;
  const isFist  = !iE && !mE && !rE && !pE && !thumbUp;

  // ── ✌️ Peace → toggle eraser ──────────────────────────────────────────────
  if (isPeace) {
    resetAll('peace');
    const pct = hold('peace', now, () => {
      const next = state.tool === 'eraser' ? 'pencil' : 'eraser';
      setTool(next);
      showToast(next === 'eraser' ? '🗑️ Eraser ON' : '✏️ Eraser OFF');
    });
    uiGesture.textContent = `✌️ ${pct}%`;
    return;
  }
  G.peace.start = null; G.peace.done = false;

  // ── 👍 Thumb up → cycle brush ─────────────────────────────────────────────
  if (isThumb) {
    resetAll('thumb');
    const pct = hold('thumb', now, () => {
      const base = state.tool === 'eraser' ? 'pencil' : state.tool;
      const next = TOOLS[(TOOLS.indexOf(base) + 1) % TOOLS.length];
      setTool(next);
      const labels = { pencil:'✏️ Pencil', marker:'🖊️ Marker', neon:'✨ Neon', spray:'💨 Spray' };
      showToast(labels[next]);
      G.thumb.start = null; G.thumb.done = false;  // re-arm: must re-raise thumb
    });
    uiGesture.textContent = `👍 ${pct}%`;
    return;
  }
  G.thumb.start = null; G.thumb.done = false;

  // ── 🤘 Rock on → toggle symmetry ─────────────────────────────────────────
  if (isRock) {
    resetAll('rock');
    const pct = hold('rock', now, () => {
      toggleSymmetry();
      showToast(state.symmetry ? '⇔ Symmetry ON' : '⇔ Symmetry OFF');
      G.rock.start = null; G.rock.done = false;
    });
    uiGesture.textContent = `🤘 ${pct}%`;
    return;
  }
  G.rock.start = null; G.rock.done = false;

  // ── ✊ Fist → undo (re-arms for continuous undo) ──────────────────────────
  if (isFist) {
    resetAll('fist');
    const pct = hold('fist', now, () => {
      undo();
      showToast('↩ Undo');
      G.fist.start = null; G.fist.done = false;  // re-arm for held-fist continuous undo
    });
    uiGesture.textContent = `✊ ${pct}%`;
    return;
  }
  G.fist.start = null; G.fist.done = false;

  uiGesture.textContent = (iE && mE && rE && pE) ? 'Open 🖐️' : 'Open';
}
