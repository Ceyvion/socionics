# Repository Guidelines

## Project Structure & Module Organization
- `src/`: React app (single-file focus in `App.jsx`, entry `main.jsx`, styles `index.css`). No router; simple state machine for navigation.
- `public/`: Static assets and generated data (`public/data/types.json`, `relations.json`, `glossary.json`).
- `scripts/`: ESM utilities; `scripts/scrape.mjs` fetches Wikisocion pages and writes `public/data`.
- `scraper/`: Original TypeScript prototypes (not used by the build).
- `dist/`: Vite build output; do not edit manually.

## Build, Test, and Development Commands
- `npm run dev`: Start Vite dev server at localhost with hot reload.
- `npm run dev:refresh`: Re-scrape data, then start dev.
- `npm run scrape`: Regenerate `public/data/*.json` via network fetches.
- `npm run build`: Production build (runs `prebuild` → `scrape`).
- `npm run preview`: Serve the built app from `dist/` for local QA.

## Coding Style & Naming Conventions
- Language: JavaScript + React (`.jsx`), functional components and hooks; 2-space indentation; use semicolons.
- Files: Components in PascalCase (e.g., `TypeDetail.jsx`); variables/functions in `camelCase`.
- Styling: Tailwind CSS utility classes; keep class lists readable and cohesive.
- Lint/format: No repo linter configured—match existing patterns in `src/App.jsx` and related files.

## Testing Guidelines
- No formal test suite yet. Smoke checks run via:
  - Browser console assertions in `src/App.jsx` (data shape, search, relations).
  - `console.assert(...)` in `scripts/scrape.mjs` during data generation.
- Validate changes by: `npm run dev` (watch console), `npm run scrape` (ensure no errors), and `npm run preview` after `npm run build`.
- If adding tests, prefer Vitest and colocate under `src/__tests__/*.test.jsx`.

## Commit & Pull Request Guidelines
- Commits: imperative, concise subjects (e.g., “Add dark mode toggle”); group related changes.
- PRs must include: clear description, linked issues (`Fixes #123`), screenshots/GIFs for UI changes, and note if data was re-scraped.
- Before opening a PR: run `npm run scrape`, `npm run build`, and verify with `npm run preview`. Avoid editing `dist/` by hand.

## Security & Configuration Tips
- Scraper requires internet; no secrets used. Regenerate JSON via `npm run scrape` when sources change and commit the updated files as needed.

