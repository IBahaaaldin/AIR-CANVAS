// js/mediapipe.js — MediaPipe Hands + Camera setup
// Uses browser globals: Hands, Camera (loaded from CDN in index.html)

import { state, videoElement } from './main.js';

let cameraInstance = null;
let handsInstance  = null;

export function initMediaPipe() {
  // Stop existing camera/hands before restarting (e.g. facing-mode change)
  if (cameraInstance) { cameraInstance.stop(); cameraInstance = null; }
  if (handsInstance)  { handsInstance.close(); handsInstance  = null; }

  // eslint-disable-next-line no-undef
  handsInstance = new Hands({
    locateFile: file => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`,
  });

  const isMobile = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);

  handsInstance.setOptions({
    maxNumHands:            2,
    modelComplexity:        isMobile ? 0 : 1,  // 0 = lite model, faster on mobile
    minDetectionConfidence: 0.5,
    minTrackingConfidence:  0.5,
  });

  const uiStatus = document.getElementById('ui-hands');
  if (uiStatus) uiStatus.textContent = 'Loading…';

  let modelReady = false;
  handsInstance.onResults(results => {
    if (!modelReady) {
      modelReady = true;
      if (uiStatus) uiStatus.textContent = '0';
    }
    state.hands = results.multiHandLandmarks || [];
  });

  // eslint-disable-next-line no-undef
  cameraInstance = new Camera(videoElement, {
    onFrame: async () => { await handsInstance.send({ image: videoElement }); },
    width:      isMobile ? 640  : 1280,
    height:     isMobile ? 480  : 720,
    facingMode: state.facingMode || 'user',
  });

  cameraInstance.start().catch(err => {
    console.error('Camera failed to start:', err);
    if (uiStatus) uiStatus.textContent = 'Cam error';
  });
}
