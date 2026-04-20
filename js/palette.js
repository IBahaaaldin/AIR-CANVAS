// js/palette.js — DOM wiring for all controls
// Manages: color picker, brush size, tool buttons, palette presets,
//           canvas theme toggle, recently used colors.

import { state, setTool, fillBackground } from './main.js';

const PALETTES = {
  Neon:   ['#00ffcc', '#ff003c', '#00f0ff', '#ff00cc', '#aaff00', '#ff9900', '#6600ff', '#ffffff'],
  Cyber:  ['#ff003c', '#00f0ff', '#7b2fff', '#ffe700', '#ff6b35', '#00ff66', '#ff00aa', '#ff5500'],
  Pastel: ['#ffb3ba', '#ffdfba', '#ffffba', '#baffc9', '#bae1ff', '#e8baff', '#ffbae8', '#ffc8dd'],
  Gray:   ['#ffffff', '#cccccc', '#aaaaaa', '#777777', '#555555', '#333333', '#111111', '#000000'],
};

const recentColors = [];
const MAX_RECENT   = 6;

export function initPalette() {
  renderSwatches(PALETTES.Neon);

  // ── Color picker ──────────────────────────────────────────────────────────
  document.getElementById('colorPicker').addEventListener('input', e => applyColor(e.target.value));

  // ── Brush size ────────────────────────────────────────────────────────────
  const slider  = document.getElementById('brushSize');
  const sizeVal = document.getElementById('brushSizeVal');
  slider.addEventListener('input', e => {
    state.brushSize     = parseInt(e.target.value, 10);
    sizeVal.textContent = state.brushSize;
  });

  // ── Tool buttons ──────────────────────────────────────────────────────────
  document.querySelectorAll('.tool-btn').forEach(btn => {
    btn.addEventListener('click', () => setTool(btn.dataset.tool));
  });

  // ── Palette presets ───────────────────────────────────────────────────────
  document.querySelectorAll('.palette-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.palette-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSwatches(PALETTES[btn.dataset.palette] || PALETTES.Neon);
    });
  });

  // ── Canvas theme toggle (controls video brightness) ──────────────────────
  document.getElementById('canvasThemeBtn').addEventListener('click', () => {
    state.canvasTheme = state.canvasTheme === 'dark' ? 'light' : 'dark';
    const icon  = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    const isDark = state.canvasTheme === 'dark';
    if (icon)  icon.setAttribute('data-lucide', isDark ? 'moon' : 'sun');
    if (label) label.textContent = isDark ? 'Dark' : 'Light';
    if (typeof lucide !== 'undefined' && icon) lucide.createIcons({ nodes: [icon] });
    fillBackground();   // updates video CSS filter
  });

  // Set initial accent CSS var
  document.documentElement.style.setProperty('--accent', state.color);
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
export function applyColor(color) {
  state.color = color;
  const picker = document.getElementById('colorPicker');
  // Only update picker if it's a valid hex (avoids exceptions with rgb() values)
  if (picker && /^#[0-9a-fA-F]{6}$/.test(color)) picker.value = color;
  document.documentElement.style.setProperty('--accent', color);
  trackRecentColor(color);
}

function trackRecentColor(color) {
  const idx = recentColors.indexOf(color);
  if (idx !== -1) recentColors.splice(idx, 1);
  recentColors.unshift(color);
  if (recentColors.length > MAX_RECENT) recentColors.pop();
  renderRecentColors();
}

function renderRecentColors() {
  const container = document.getElementById('recentColors');
  if (!container) return;
  container.innerHTML = '';
  recentColors.forEach(color => {
    const btn = document.createElement('button');
    btn.className        = 'recent-swatch';
    btn.style.background = color;
    btn.title            = color;
    btn.addEventListener('click', () => applyColor(color));
    container.appendChild(btn);
  });
}

function renderSwatches(colors) {
  const container = document.getElementById('swatches');
  if (!container) return;
  container.innerHTML = '';
  colors.forEach(color => {
    const btn = document.createElement('button');
    btn.className        = 'swatch-btn';
    btn.style.background = color;
    btn.title            = color;
    btn.setAttribute('aria-label', `Color ${color}`);
    btn.addEventListener('click', () => applyColor(color));
    container.appendChild(btn);
  });
}
