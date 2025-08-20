# Iteration Roadmap

This document tracks the next two-week iteration. Items are prioritized and written as small, testable deliverables with acceptance criteria.

## Week 1: UX, Routing, Modularization (P0)
- [P0] Keyboard-first Search UX
  - Acceptance: Up/down to navigate results; Enter opens item; results show code + full name + alias; matched text highlighted.
  - Test: Type "lii", navigate with arrows, press Enter to open detail.
- [P0] Hash-based Routing for Shareable URLs
  - Acceptance: `#/types/LII`, `#/glossary/Te`, and `#/compare/LII/SEI` open correct views; back/forward works.
  - Test: Copy/paste URLs into new tab; state restores.
- [P1] Modularize `src/App.jsx`
  - Acceptance: Components moved to `src/components/*`, pages to `src/pages/*`; main file ≤ 300 LOC; no behavior change.
  - Test: `npm run dev`, all routes function as before.
- [P1] SEO/Metadata
  - Acceptance: Dynamic `<title>` and description per route; favicon added; Open Graph image placeholder.
  - Test: Share preview renders correct title/description (manual check).

## Week 2: Data, Performance, CI (P0/P1)
- [P0] Scraper Hardening
  - Acceptance: Retries + timeouts; schema validation; `generatedAt` and `source` fields added; clear errors on failure.
  - Test: Run `npm run scrape` offline → fails fast with actionable message.
- [P0] Precomputed Search Index
  - Acceptance: Build step generates a compact index; first-keystroke search < 10ms on mid-tier laptop.
  - Test: Profile in dev tools; verify index size and latency.
- [P1] Lightweight Caching
  - Acceptance: Cache `/data/*.json` for repeat visits; app works offline for visited routes.
  - Test: Throttle/Offline mode → previously visited views render.
- [P1] Minimal Tests + CI
  - Acceptance: Vitest for search utilities and data guards; GitHub Actions runs build + tests on PR.
  - Test: Green CI on PR; failing tests block merge.

## Labels & Tracking
Use: `P0`, `P1`, `bug`, `enhancement`, `chore`, `ux`, `performance`, `data`, `ci`.

> Tip: When opening issues, copy relevant blocks from this roadmap so each ticket includes concrete acceptance and a test plan.

