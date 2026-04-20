// js/capture.js — PNG screenshot + WebM screen recording
// bgCanvas is transparent (video shows through), so screenshots fill a solid
// background color in the temp canvas before compositing the drawing.

import { state, drawCanvas } from './main.js';

let mediaRecorder  = null;
let recordedChunks = [];

// ─── Screenshot ───────────────────────────────────────────────────────────────
export function takeScreenshot() {
  const temp  = document.createElement('canvas');
  temp.width  = state.width;
  temp.height = state.height;
  const tCtx  = temp.getContext('2d');

  // Undo CSS mirror so the exported image reads correctly
  tCtx.translate(state.width, 0);
  tCtx.scale(-1, 1);

  // Fill with theme background so drawing is visible on export
  tCtx.fillStyle = state.canvasTheme === 'dark' ? '#050510' : '#f5f5fa';
  tCtx.fillRect(0, 0, state.width, state.height);

  tCtx.drawImage(drawCanvas, 0, 0);

  const a    = document.createElement('a');
  a.href     = temp.toDataURL('image/png');
  a.download = `air-canvas-${Date.now()}.png`;
  a.click();
}

// ─── Recording ────────────────────────────────────────────────────────────────
export function startRecording() {
  if (!window.MediaRecorder) {
    console.warn('MediaRecorder not supported in this browser');
    return;
  }

  recordedChunks = [];
  const stream   = drawCanvas.captureStream(30);

  const mimeType = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find(t => MediaRecorder.isTypeSupported(t)) || '';

  mediaRecorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});

  mediaRecorder.ondataavailable = e => {
    if (e.data.size > 0) recordedChunks.push(e.data);
  };

  mediaRecorder.onstop = () => {
    const blob = new Blob(recordedChunks, { type: 'video/webm' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `air-canvas-${Date.now()}.webm`;
    a.click();
    URL.revokeObjectURL(url);
  };

  mediaRecorder.start();
  state.recording = true;
}

export function stopRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  state.recording = false;
}
