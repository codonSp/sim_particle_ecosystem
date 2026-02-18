# Particle Ecosystem

A static HTML/Canvas simulation where colored particles attract or repel each other based on an editable interaction matrix.

## Unique simulation parameters

Use the **Unique Simulation Parameters** section in the UI to type:

- `Seed` (text)
- `Same-Color Cohesion`
- `Cross-Color Rivalry`
- `Chaos Field`
- `Swirl`
- `Cluster Bias`

Then click **Generate from Parameters**.  
The same parameter set recreates the same matrix + starting particle layout.

## Run locally

Open `index.html` directly in a browser, or serve the folder with any static server.

## Host on GitHub Pages

1. Create a GitHub repository and push these files to the default branch (commonly `main`).
2. In repository settings, open **Pages**.
3. Set source to **Deploy from a branch**.
4. Select your default branch and `/ (root)` folder.
5. Save. GitHub will publish your site on a `github.io` URL.

## Files

- `index.html` UI structure
- `styles.css` visual design and layout
- `app.js` simulation engine + controls
