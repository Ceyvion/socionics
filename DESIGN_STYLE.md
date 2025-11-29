# Swiss/Brutalist UI Notes

### Typography
- Display/Body: `Space Grotesk`, 400/500/600/700; tight tracking on headings, uppercase accents.
- Mono: `IBM Plex Mono` for codes, grid labels, and print sheet rows.

### Palette & Tokens
- Ink: `var(--ink)` #0c0c0c (light) / #f4f4f6 (dark)
- Paper: `var(--paper)` #f7f6f2 (light) / #0c0c10 (dark)
- Accent: `var(--accent)` red (#ff1b1b) or gold (#f5c518) when `alt-accent` is set.
- Accent-2: `var(--accent-2)` alternate highlight.
- Grid: `var(--grid)` subtle 26px grid; `grid-off` root class removes it.

### Components
- Buttons: 2px solid ink, square corners, uppercase, 6px shadow on primary/secondary. Ghost keeps transparent border.
- Cards: 2px ink border, 8–10px offset shadow; hover lifts by -2px with accent shadow; dark mode uses red glow.
- Chips/Label Pills: Uppercase microtype, 2px ink border, white/dark backgrounds.
- Search Dropdown: `.dropdown-panel` fade-up animation; 2px border; mono codes with highlight marks.

### Layout Patterns
- Ticker: Uppercase scrolling strip with dots; pauses on hover.
- Rail Headings: Left rail tag + uppercase H1; used for Types/Relations/Theory/Functions.
- Background: Grid-paper via dual linear gradients; toggle via “Grid On/Off”.
- Print Sheet (`#/sheet`): One-page grid of types + duality pairs, heavy borders, PDF/Print button; header/ticker hidden in print via `.no-print`.

### Interactions
- Accent Toggle: “Accent Red/Gold” flips root class `alt-accent`.
- Dark Mode: Root `.dark`.
- Grid Toggle: Root `.grid-off`.
- Search keyboard focus `/`; dropdown keyboard nav.

### Navigation Cues
- Nav links uppercase; hero CTA stack includes Print Sheet, Types, Relations, Start.
- Ticker items: “Swiss grid discipline · Brutalist blocks · NYC → ZRH …”

Use this file to keep visual language aligned when adding new views.***
