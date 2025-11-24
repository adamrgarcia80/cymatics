# How to Deploy Your Cymatics Visualizer

## Option 1: GitHub Pages (Recommended - Free HTTPS)

1. Go to your repository: https://github.com/adamrgarcia80/cymatics
2. Click **Settings** (top right of the repository)
3. Scroll down to **Pages** in the left sidebar
4. Under **Source**, select:
   - Branch: **main**
   - Folder: **/ (root)**
5. Click **Save**
6. Wait 1-2 minutes for GitHub to deploy
7. Your site will be live at: **https://adamrgarcia80.github.io/cymatics/**

✅ **Benefits**: Free HTTPS (required for microphone), automatically updates when you push changes

---

## Option 2: Local Network Server (Access from other devices)

Run a local server that others on your network can access:

### Using Python 3:
```bash
# From your project directory
python3 -m http.server 8000 --bind 0.0.0.0
```

Then access from:
- Your computer: http://localhost:8000
- Other devices on same network: http://[YOUR-IP]:8000
  - Find your IP: `ipconfig getifaddr en0` (Mac) or `ipconfig` (Windows)

### Using Node.js (http-server):
```bash
# Install globally (one time)
npm install -g http-server

# Run from project directory
http-server -p 8000 -a 0.0.0.0
```

⚠️ **Note**: Local HTTP won't work for microphone access on most browsers - you need HTTPS (GitHub Pages) or localhost

---

## Option 3: Other Free Hosting Services

- **Netlify**: Drag and drop your folder at netlify.com
- **Vercel**: Connect your GitHub repo at vercel.com
- **Glitch**: Import from GitHub at glitch.com

All of these provide free HTTPS automatically!



