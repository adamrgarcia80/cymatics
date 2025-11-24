# Cymatics Visualizer

A mobile-first web application that visualizes sound patterns in real-time using cymatic sand particle effects.

## Features

- **Real-time audio visualization** - Responds to microphone input
- **Cymatic sand particles** - Particles collect at wave nodes, creating geometric patterns
- **Full-screen support** - Patterns expand to fill the screen at higher volumes
- **Gradual dissolve** - Particles fade out slowly when sound stops
- **Mobile-first design** - Optimized for touch devices
- **Minimal interface** - Clean black and white aesthetic

## How to Use

1. Open the site in a modern browser (Chrome, Firefox, Safari, Edge)
2. Click the white circle button in the upper right corner
3. Allow microphone access when prompted
4. Make sounds (speak, sing, play music) to see patterns form

## Technical Requirements

- **HTTPS or localhost** - Required for microphone access
- **Modern browser** with Web Audio API support
- **Microphone permissions** - Must be granted to visualize audio

## Running Locally

Serve the files over HTTP/HTTPS:

```bash
# Using Python 3
python3 -m http.server 8000

# Using Node.js http-server
npx http-server

# Then open http://localhost:8000
```

## Deploy to GitHub Pages

This repository can be deployed to GitHub Pages:

1. Go to Settings → Pages
2. Select "Deploy from a branch"
3. Choose "main" branch and "/ (root)" folder
4. Click Save
5. Your site will be available at `https://adamrgarcia80.github.io/cymatics/`

## Browser Compatibility

- Chrome/Edge (recommended)
- Firefox
- Safari (iOS 11+)
- Mobile browsers with Web Audio API support

## License

MIT



