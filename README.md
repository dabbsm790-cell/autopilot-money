# AutoPilot Money — Netlify Deployment Guide

## Project Structure
```
autopilot-deploy/
├── index.html          ← Vite entry point
├── package.json        ← Dependencies (React + Vite)
├── vite.config.js      ← Build config
├── netlify.toml        ← Netlify build + redirect settings
├── public/
│   ├── favicon.svg
│   └── _redirects      ← SPA fallback (backup)
└── src/
    ├── main.jsx        ← React root mount
    └── App.jsx         ← Full AutoPilot Money app
```

---

## Deploy to Netlify (No Code Required)

### Option A — Drag & Drop (Fastest, ~5 minutes)

1. On your machine, open Terminal (Mac) or Command Prompt (Windows)
2. Navigate to this folder: `cd autopilot-deploy`
3. Run the build:
   ```
   npm install
   npm run build
   ```
4. This creates a `dist/` folder
5. Go to **https://app.netlify.com**
6. Sign up or log in (free)
7. On the dashboard, drag the `dist/` folder into the deploy zone
8. Your app is live instantly at a `.netlify.app` URL

### Option B — GitHub + Netlify (Auto-deploys on every save)

1. Create a free account at **https://github.com**
2. Create a new repository called `autopilot-money`
3. Upload all files in this folder to the repo
4. Go to **https://app.netlify.com** → "Add new site" → "Import an existing project"
5. Connect GitHub and select your repo
6. Netlify auto-detects Vite. Confirm these settings:
   - **Build command:** `npm run build`
   - **Publish directory:** `dist`
7. Click **Deploy site**
8. Every future change you push to GitHub auto-deploys — no manual steps

---

## Custom Domain (Optional)

1. In Netlify dashboard → Site settings → Domain management
2. Add your custom domain (e.g. `autopilotmoney.com`)
3. Netlify provides free SSL automatically

---

## Local Development

```bash
npm install
npm run dev
```

Opens at `http://localhost:5173`

---

## Netlify Free Tier Limits (as of 2026)
- 100GB bandwidth/month
- 300 build minutes/month
- Unlimited sites
- No commercial use restrictions ✓

---

## Troubleshooting

**White screen after deploy?**
→ Check that publish directory is set to `dist` (not `build`)

**404 on page refresh?**
→ The `netlify.toml` and `public/_redirects` files handle this automatically

**Build fails?**
→ Make sure Node.js 18+ is installed locally before running `npm install`
