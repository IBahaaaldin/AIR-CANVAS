# AIR CANVAS

Browser-based hand-tracking drawing app. Draw in the air with your hand using the webcam — no stylus, no touch needed.

## Live Demo

[ibahaaaldin.github.io/AIR-CANVAS](https://ibahaaaldin.github.io/AIR-CANVAS/)

## Features

- Real-time hand tracking via MediaPipe Hands
- Pinch gesture to draw, release to lift pen
- 4 brush types: Pencil, Marker, Neon Glow, Spray
- Eraser, undo/redo (Ctrl+Z / Ctrl+Y), clear canvas
- Symmetry/mirror mode — draws reflected strokes simultaneously
- 5 hand gestures: pinch draw, peace sign eraser, thumbs up cycle brush, fist undo, rock on symmetry
- Color picker + 4 preset palettes (Neon, Cyber, Pastel, Gray)
- Recently used colors tracked automatically
- Dark/Light canvas theme toggle
- Screenshot (PNG) and screen recording (WebM)
- Pressure simulation based on hand speed
- Lucide icons, glassmorphism UI
- Mobile support with front/rear camera toggle

## Gestures

| Gesture | Action |
|---|---|
| Pinch (thumb + index) | Draw |
| Peace sign (hold) | Toggle eraser |
| Thumbs up (hold) | Cycle brush type |
| Fist (hold) | Undo |
| Rock on (hold) | Toggle symmetry |

## Run Locally

Requires a local server (ES modules need CORS headers):

```bash
npx serve .
```

Then open `http://localhost:3000`.

## Stack

Vanilla HTML/CSS/JS — no build step, no dependencies.

## Author

**Bahaa Mohammed** — Full-Stack Developer & AI-Augmented Engineer, Dubai UAE

- Portfolio: [ibahaaaldin.github.io](https://ibahaaaldin.github.io)
- GitHub: [@IBahaaaldin](https://github.com/IBahaaaldin)
- LinkedIn: [ibahaaaldin](https://www.linkedin.com/in/ibahaaaldin)
- Instagram: [@ibahaaaldincoding](https://www.instagram.com/ibahaaaldincoding)
