# Socionics Project Context

This is a React-based website for socionics information, built with Vite, Tailwind CSS, and React.

## Project Overview

The site is a Swiss-inspired MVP (Minimum Viable Product) for Wikisocion content, organized for clarity and mobile use while linking back to canonical pages. It follows accessibility best practices and a Swiss typographic aesthetic.

## Key Features

- Information on 16 socionics types with detailed descriptions
- Type relations explorer (currently focused on duality pairs)
- Glossary of socionics terms
- Theory section with primers on Model A, Information Elements, and Quadras
- Search functionality for types and terms
- Responsive design with mobile-first approach

## Technical Stack

- React (v19.1.1)
- Vite (v7.1.2)
- Tailwind CSS (v3.4.17)
- Lucide React icons (v0.539.0)

## Project Structure

- `src/App.jsx` - Main application component with all UI logic
- `src/main.jsx` - Entry point
- `index.html` - HTML template
- `data/` - JSON data files for types, relations, and glossary
- `public/data/` - Publicly accessible data files

## Development Commands

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run scrape` - Run scraper to update data files

## Design Principles

- Swiss/International Typographic Style
- Grid discipline
- Strong type hierarchy
- Minimal ornamentation
- Black/white with red accent color
- Mobile-first responsive design