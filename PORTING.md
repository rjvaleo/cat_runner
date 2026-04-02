# Porting from Google AI Studio to Local / GitHub Pages

Google AI Studio exports projects configured to run directly in the browser via CDN imports and ES module maps. This works in the Studio sandbox but breaks when hosted anywhere else. This document records every change required to make a Studio export run locally and deploy cleanly to GitHub Pages.

---

## What AI Studio Exports

| File                    | Studio behaviour                                                                                                                              |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `index.html`            | Loads Tailwind via CDN script, loads React/dependencies via `<script type="importmap">` from `esm.sh`, references `.tsx` source file directly |
| `*.tsx / *.ts`          | Raw TypeScript — no build step                                                                                                                |
| No `package-lock.json`  | Dependencies resolved at runtime from CDN                                                                                                     |
| No `.github/` directory | No deployment pipeline                                                                                                                        |

---

## Problems and Fixes

### 1. Raw `.tsx` served directly

**Error:**

```
Failed to load module script: Expected a JavaScript-or-Wasm module script
but the server responded with a MIME type of "application/octet-stream".
```

**Cause:** `index.html` had `<script type="module" src="./index.tsx">`. Browsers cannot execute TypeScript. Vite's dev server masks this locally by transpiling on the fly, but any static host (GitHub Pages, S3, Netlify without a build step) serves the raw file with the wrong MIME type.

**Fix:** Run `vite build` to compile TypeScript to JavaScript. Deploy the `dist/` output, not the source files.

---

### 2. Tailwind CSS loaded via CDN

**Error / Warning:**

```
cdn.tailwindcss.com should not be used in production.
```

**Cause:** `index.html` had `<script src="https://cdn.tailwindcss.com">`. The CDN version includes a runtime JIT compiler, is slow, logs warnings in production, and produces inconsistent results with arbitrary value classes.

**Fix:**

1. Remove the CDN `<script>` from `index.html`
2. Install Tailwind as a proper PostCSS plugin:
   ```
   npm install -D tailwindcss @tailwindcss/postcss autoprefixer
   ```
3. Create `postcss.config.js`:
   ```js
   export default {
     plugins: {
       "@tailwindcss/postcss": {},
       autoprefixer: {},
     },
   };
   ```
4. Create `tailwind.config.js` — set `content` to cover all source files:
   ```js
   export default {
     content: ["./index.html", "./*.{ts,tsx}", "./services/**/*.{ts,tsx}"],
     theme: { extend: {} },
     plugins: [],
   };
   ```
5. Create `index.css` with the Tailwind import and any global styles:

   ```css
   @import "tailwindcss";

   /* global styles here */
   ```

6. Import `index.css` at the top of `index.tsx`:
   ```ts
   import "./index.css";
   ```

> **Note:** Tailwind v4 uses `@import "tailwindcss"` instead of the three legacy `@tailwind` directives. The PostCSS plugin is `@tailwindcss/postcss`, not `tailwindcss` directly.

---

### 3. `importmap` loading dependencies from esm.sh

**Cause:** Studio exports contain a `<script type="importmap">` in `index.html` that resolves bare imports (`react`, `@google/genai`, etc.) from `esm.sh` at runtime. This is unnecessary and unreliable when Vite is handling the build — Vite resolves everything from `node_modules`.

**Fix:** Remove the `<script type="importmap">` block from `index.html` entirely. Vite bundles all dependencies at build time.

---

### 4. Google AI SDK initialised at module load time

**Error:**

```
Uncaught Error: An API Key must be set when running in a browser
```

**Cause:** Studio exports typically initialise the SDK at the top level of a service file:

```ts
// runs immediately when the module is imported
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
```

If `API_KEY` is `undefined` (not set in the build environment), the SDK constructor throws and crashes the entire app before React mounts.

**Fix:** Move the SDK instantiation inside the function that uses it (lazy init):

```ts
export const generateAiLevel = async (theme: string) => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY }); // only runs when called
  // ...
};
```

The app now loads normally without an API key. AI features fail gracefully only if and when they are invoked.

---

### 5. Font family name URL-encoded in CSS

**Cause:** The Studio-exported inline `<style>` block used the URL-encoded form of the font name:

```css
font-family:
  "Press+Start+2P", cursive; /* wrong — plus signs are URL encoding */
```

**Fix:**

```css
font-family: "Press Start 2P", cursive; /* correct — spaces, not plus signs */
```

This was moved into `index.css` as part of fix #2 above, corrected at the same time.

---

### 6. No GitHub Actions deployment workflow

**Cause:** Studio exports have no CI/CD pipeline. GitHub Pages defaults to serving files directly from a branch, which exposes raw source files (causing errors #1 and #2 above).

**Fix:** Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: npm
      - run: npm ci
      - run: npm run build
        env:
          GEMINI_API_KEY: ${{ secrets.GEMINI_API_KEY }}
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/deploy-pages@v4
```

Then in the repo: **Settings → Pages → Source → GitHub Actions**.

---

### 7. Missing `base` path for GitHub Pages sub-path hosting

**Cause:** Unless the repo is `<username>.github.io`, GitHub Pages serves the site from `/<repo-name>/`. Vite defaults `base` to `/`, so all asset URLs are wrong (404s for JS, CSS, fonts).

**Fix:** Set `base` in `vite.config.ts` for production builds:

```ts
base: mode === 'production' ? '/<repo-name>/' : '/',
```

---

### 8. API key for the Gemini SDK

**Cause:** The build-time `define` in `vite.config.ts` replaces `process.env.GEMINI_API_KEY` with the literal value at compile time. In CI there is no `.env` file, so the key must be provided via a repository secret.

**Fix:**

1. Add the key: repo → **Settings → Secrets and variables → Actions → New repository secret** → name `GEMINI_API_KEY`
2. Pass it to the build step in the workflow (already shown in fix #6 above)

> **Security note:** Because Vite bakes the key into the JavaScript bundle at build time, it is visible to anyone who inspects the source. For public repos, use a backend proxy or restrict the key to specific referrers in the Google Cloud console.

---

## Summary Checklist

- [ ] Remove `<script src="https://cdn.tailwindcss.com">` from `index.html`
- [ ] Remove `<script type="importmap">` from `index.html`
- [ ] Install `tailwindcss`, `@tailwindcss/postcss`, `autoprefixer` as devDependencies
- [ ] Create `postcss.config.js` using `@tailwindcss/postcss`
- [ ] Create `tailwind.config.js` with correct `content` paths
- [ ] Create `index.css` with `@import "tailwindcss"` and global styles
- [ ] Import `index.css` in `index.tsx`
- [ ] Fix any URL-encoded font names in CSS (`Press+Start+2P` → `Press Start 2P`)
- [ ] Move any top-level SDK initialisations inside the functions that use them
- [ ] Add `base: '/<repo-name>/'` to `vite.config.ts` for production
- [ ] Create `.github/workflows/deploy.yml`
- [ ] Set `GEMINI_API_KEY` repository secret
- [ ] Set GitHub Pages source to **GitHub Actions** (not "Deploy from a branch")
