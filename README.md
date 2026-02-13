# 💕 Will You Be My Valentine, Ally?

A cute, extravagant single-page website to ask Ally to be your Valentine.

## Features

- **Dreamy animated gradient** background with floating heart particles
- **Kawaii glass hero card** with shimmer effect and glowing border
- **Runaway "No" button** — dodges the cursor on desktop and teleports on mobile
- **Growing "Yes" button** that gets bigger with each "No" attempt
- **Heart confetti celebration** when she clicks Yes
- **Custom chibi couple** (you + Ally) that switch to a holding-hands pose on Yes
- **Cursor sparkle trail** (desktop) and tap sparkles (mobile)
- Respects `prefers-reduced-motion` for accessibility

## Run Locally

No build step needed — just open the HTML file:

```bash
# Option 1: double-click index.html in Finder / Explorer

# Option 2: use a simple local server (recommended for best results)
npx serve .
# then open http://localhost:3000
```

## Deploy to GitHub Pages

1. Push all files to a GitHub repository.
2. Go to **Settings → Pages**.
3. Under **Source**, select **Deploy from a branch**.
4. Choose `main` branch, `/ (root)` folder, and click **Save**.
5. Your site will be live at `https://<username>.github.io/<repo-name>/`.
6. Share the link with Ally! 💖

## Customize

- **Text**: Edit the prompt and success messages in `index.html`.
- **Colors**: Tweak CSS custom properties in `styles.css` (`:root { ... }`).
- **"No" button messages**: Edit the `noTexts` array in `main.js`.
- **Chibi appearance**: Edit the inline SVGs in `index.html`.
- **Particles**: Adjust the tsParticles config in `main.js` → `initParticles()`.

## Credits

See [LICENSES.md](LICENSES.md) for full third-party attributions.
