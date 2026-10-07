# Graph Explorer

A desktop graphing tool for lines and parabolas. Plot several graphs at once, reshape them with sliders or by dragging them on the graph, and read step-by-step working that explains every feature.

Built with Vue 3 and Vite. Maths is typeset with KaTeX.

## Features

**Graphs**
- Parabolas in standard $ax^2 + bx + c$, vertex $a(x - h)^2 + k$ and factorised $a(x - p)(x - q)$ form.
- Lines in gradient $y = mx + c$, point-gradient $y - y_1 = m(x - x_1)$, two-point and general $ax + by = c$ form, including vertical lines.
- Point sets with a fitted line or parabola: exact through 2 or 3 points, least squares (with $R^2$) for more.
- Switching form keeps the same graph wherever that form can express it.

**Input**
- Type equations such as `y = 2(x - 1)^2 - 3`, `y = (x + 2)(x - 4)`, `3x + 2y = 6`, `y - 1 = 2(x + 1)` or `x = 4`. Vertex, factorised and point-gradient forms are recognised and open with matching sliders.
- Type coordinates such as `(0, 1), (2, 5), (4, 3)` to create a point set.
- Sliders for every value, a number box for exact values, and a play button that animates a value back and forth.
- Drag handles on the graph: the vertex, the roots, a line's points or its gradient, and individual data points.
- Place points tool: click the graph to add points.

**Learning aids**
- Working panel for the selected graph, with a "What changed" explanation and the previous graph shown dashed while you adjust it.
- Gradient triangle (rise over run) drawn on the selected line.
- Tangent tool: hover a graph to see its tangent and gradient at that point.
- Meeting points between every pair of visible graphs, marked on the graph and solved step by step.
- Table of values with first and second differences, showing why lines have constant first differences and parabolas constant second differences.
- Challenge mode: match a hidden graph using any graph and any form.

**Workspace**
- Scroll to zoom around the cursor, drag to pan, zoom to fit, reset.
- Light and dark themes (follows the system by default).
- Share link that encodes the whole graph in the URL, and PNG export.
- Your graphs are kept in the browser between visits.
- Press `?` in the app for the full list of shortcuts.

The layout is built for laptops and desktops (1280 px wide and up). Narrower screens see a notice asking for a bigger screen.

## Run it locally

Requires Node 20 or later.

```bash
npm install
npm run dev
```

Then open the address Vite prints (usually http://localhost:5173).

`npm run build` writes the static site to `dist/`, and `npm run preview` serves that build.

## Publish on GitHub Pages

The included workflow (`.github/workflows/deploy.yml`) builds the site and publishes it on every push to `main`.

1. Create a new repository on GitHub. Any name works, because asset paths are relative.
2. Push this project to it:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<repo-name>.git
   git push -u origin main
   ```
3. On GitHub, open **Settings → Pages** and set **Source** to **GitHub Actions**.
4. Open the **Actions** tab. Once the "Deploy to GitHub Pages" run finishes, the site is live at `https://<your-username>.github.io/<repo-name>/`.

If the first run happened before step 3, re-run it from the Actions tab or push any change.

## Project structure

```
src/
  App.vue                       layout, status bar, challenge banner, shortcuts
  lib/
    format.js                   number and LaTeX formatting
    parabola.js                 parabola analysis, working and change explanations
    line.js                     line analysis, working and change explanations
    fit.js                      fitting lines and parabolas to points
    intersect.js                where two graphs meet, with working
    parse.js                    equation and coordinate parser
    curves.js                   forms, sliders, handles, conversions, key features
    store.js                    app state, persistence, share links, animation, challenges
  components/
    ToolBar.vue                 tools, overlays, view controls, share, export
    CurveList.vue               equation entry and the list of graphs
    CurveCard.vue               one graph: form switcher and sliders
    PointsEditor.vue            point table and fit choice
    SliderControl.vue
    GraphCanvas.vue             SVG graph: grid, curves, handles, tangent, export
    InspectorPanel.vue          working, table and meeting points tabs
    StepList.vue
    ValueTable.vue
    HelpDialog.vue
    MathText.vue                text with inline $...$ maths via KaTeX
  style.css                     design tokens (light and dark) and layout
```

The explanation text lives in `src/lib/parabola.js`, `line.js`, `fit.js` and `intersect.js`.
