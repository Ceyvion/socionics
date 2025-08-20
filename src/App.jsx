import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Search,
  ArrowRight,
  BookOpen,
  Network,
  Type as TypeIcon,
  Info,
  ListFilter,
  Grid as GridIcon,
  Rows,
  ExternalLink,
  Home as HomeIcon,
  Moon,
  Sun,
} from "lucide-react";

/**
 * Wikisocion — Swiss-inspired MVP (single-file React)
 * --------------------------------------------------
 * Visual language: Swiss/International Typographic Style —
 *   grid discipline, strong type hierarchy, black/white with red accent,
 *   minimal ornament. Mobile-first.
 * Libraries assumed available: Tailwind, lucide-react.
 * No router dependency — tiny state machine for navigation.
 */

// --- Data loading hook ---
function useData() {
  const [data, setData] = useState({ types: null, glossary: null, relations: null, meta: null, search: null, error: null });
  useEffect(() => {
    // Load core data
    Promise.all([
      fetch("data/types.json").then(r=>r.json()),
      fetch("data/glossary.json").then(r=>r.json()),
      fetch("data/relations.json").then(r=>r.json()),
    ]).then(([types, glossary, relations]) => {
      setData((d) => ({ ...d, types, glossary, relations, error: null }));
    }).catch(err => setData({ types: null, glossary: null, relations: null, meta: null, search: null, error: err.message }));

    // Load optional metadata (non-blocking)
    fetch("data/meta.json").then(r => r.ok ? r.json() : null)
      .then(meta => { if (meta) setData(d => ({ ...d, meta })); })
      .catch(() => {});

    fetch("data/search.json").then(r => r.ok ? r.json() : null)
      .then(idx => { if (idx && Array.isArray(idx.entries)) setData(d => ({ ...d, search: idx.entries })); })
      .catch(() => {});
  }, []);
  return data;
}

// Utility
const cls = (...s) => s.filter(Boolean).join(" ");

// --- Dev smoke tests (console only) ---
function runDevTests(types, glossary, relations) {
  try {
    console.assert(types.length === 16, "Expected 16 types");
    
    // All dual keys are valid, sorted pairs
    const DUALS = new Set(relations.filter(r=>r.name==="Duality").map(r => [r.a, r.b].sort().join("-")));
    DUALS.forEach((k) => {
      const parts = k.split("-");
      console.assert(parts.length === 2, `Malformed dual key: ${k}`);
      console.assert(parts.slice().sort().join("-") === k, `Dual key not sorted: ${k}`);
    });
    
    // Round-trip dual pairs (order agnostic)
    const key = (a, b) => [a, b].sort().join("-");
    const pairs = [
      ["ILE", "SEI"],
      ["LII", "ESE"],
      ["SLE", "IEI"],
      ["LSI", "EIE"],
      ["SEE", "ILI"],
      ["ESI", "LIE"],
      ["LSE", "EII"],
      ["SLI", "IEE"],
    ];
    pairs.forEach(([a, b]) => {
      console.assert(DUALS.has(key(a, b)), `Expected dual mapping for ${a}-${b}`);
    });
    
    // byCode integrity
    const byCode = Object.fromEntries(types.map((t) => [t.code, t]));
    console.assert(Object.keys(byCode).length === 16, "byCode should index 16 types");
    console.assert(byCode.LII.leading === "Ti", "LII leading should be Ti");
    
    // Search sanity checks
    const q = "lii";
    const match = types.filter((t) =>
      [t.code, t.fullName, t.alias, t.quadra, t.leading, t.creative].some((v) =>
        v.toLowerCase().includes(q)
      )
    );
    console.assert(match.some((t) => t.code === "LII"), "Search should find LII");
    
    const glossaryMatches = glossary.filter((g) =>
      [g.term, g.shortDef].some((v) => v.toLowerCase().includes("extroverted logic"))
    );
    console.assert(glossaryMatches.some((g) => g.term === "Te"), "Glossary search should find Te");
  } catch (err) {
    console.error("Dev tests threw:", err);
  }
}

// --- App ---
// --- Hash routing helpers ---
function hashToRoute(hash) {
  const raw = (hash || "").replace(/^#\/?/, "");
  const parts = raw.split("/").filter(Boolean);
  const [root, a, b] = parts;
  switch (root) {
    case undefined:
    case "":
      return { name: "home" };
    case "start":
    case "types":
    case "relations":
    case "theory":
    case "functions":
    case "library":
    case "about":
      return { name: root };
    case "type":
      return a ? { name: "type", code: a.toUpperCase() } : { name: "types" };
    case "glossary":
      return { name: "glossary", focus: a };
    case "compare":
      // Support optional pair: /compare/A/B
      return { name: "compare", a: a ? a.toUpperCase() : undefined, b: b ? b.toUpperCase() : undefined };
    default:
      return { name: "home" };
  }
}

function routeToHash(route) {
  switch (route.name) {
    case "home": return "#/";
    case "start": return "#/start";
    case "types": return "#/types";
    case "type": return route.code ? `#/type/${route.code}` : "#/types";
    case "relations": return "#/relations";
    case "theory": return "#/theory";
    case "functions": return "#/functions";
    case "glossary": return route.focus ? `#/glossary/${route.focus}` : "#/glossary";
    case "library": return "#/library";
    case "about": return "#/about";
    case "compare": return route.a && route.b ? `#/compare/${route.a}/${route.b}` : "#/compare";
    default: return "#/";
  }
}

export default function WikisocionMVP() {
  const [route, setRoute] = useState(() => (typeof window !== 'undefined' ? hashToRoute(window.location.hash) : { name: "home" }));
  const [query, setQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const searchRef = useRef(null);

  const { types, glossary, relations, meta, search, error } = useData();
  
  // Initialize dark mode based on system preference or localStorage
  useEffect(() => {
    const savedDarkMode = localStorage.getItem('darkMode');
    if (savedDarkMode !== null) {
      setDarkMode(savedDarkMode === 'true');
    } else {
      const systemPrefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      setDarkMode(systemPrefersDark);
    }
  }, []);
  
  // Apply dark mode class to document element
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);
  
  // Keyboard "/" focuses search
  useEffect(() => {
    const handler = (e) => {
      const active = document.activeElement && document.activeElement.tagName;
      if (e.key === "/" && !(active === "INPUT")) {
        e.preventDefault();
        if (searchRef.current) searchRef.current.focus();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  
  // Run smoke tests once in the browser when data is loaded
  useEffect(() => {
    if (typeof window !== "undefined" && types && glossary && relations) {
      console.log("Running smoke tests...");
      runDevTests(types, glossary, relations);
    }
  }, [types, glossary, relations]);
  
  // Hash routing
  useEffect(() => {
    const onHash = () => setRoute(hashToRoute(window.location.hash));
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (name, params = {}) => {
    const next = { name, ...params };
    setRoute(next);
    const nextHash = routeToHash(next);
    if (typeof window !== 'undefined' && window.location.hash !== nextHash) {
      window.location.hash = nextHash;
    }
  };

  // Dynamic titles
  useEffect(() => {
    if (!types) return; // wait until we can render type names where needed
    let title = "Wikisocion";
    if (route.name === 'home') title = 'Wikisocion — Socionics, organized';
    else if (route.name === 'types') title = 'Types — Wikisocion';
    else if (route.name === 'type') {
      const byCode = Object.fromEntries(types.map(t => [t.code, t]));
      const t = route.code && byCode[route.code];
      title = t ? `${t.code} — ${t.fullName} (${t.alias}) | Wikisocion` : 'Type — Wikisocion';
    }
    else if (route.name === 'relations') title = 'Relations — Wikisocion';
    else if (route.name === 'glossary') title = route.focus ? `Glossary: ${route.focus} — Wikisocion` : 'Glossary — Wikisocion';
    else if (route.name === 'compare') {
      if (route.a && route.b) title = `Compare: ${route.a} vs ${route.b} — Wikisocion`;
      else title = 'Compare — Wikisocion';
    }
    else if (route.name === 'functions') title = 'Functions — Wikisocion';
    else if (route.name === 'theory') title = 'Theory — Wikisocion';
    else if (route.name === 'library') title = 'Library — Wikisocion';
    else if (route.name === 'about') title = 'About — Wikisocion';
    document.title = title;
  }, [route, types]);
  
  // Build results with useMemo (always called)
  const results = useMemo(() => {
    // Handle loading/error states in the useMemo itself
    if (error || !types || !glossary || !relations) {
      return [];
    }
    
    const q = query.trim().toLowerCase();
    if (!q) return [];
    
    if (search && Array.isArray(search)) {
      const matched = search.filter((e) => e.haystack && e.haystack.includes(q)).slice(0, 10);
      return matched;
    } else {
      const fromTypes = types.filter((t) =>
        [t.code, t.fullName, t.alias, t.quadra, t.leading, t.creative].some((v) =>
          v.toLowerCase().includes(q)
        )
      ).map((t) => ({ kind: "type", id: t.code, code: t.code, fullName: t.fullName, alias: t.alias }));
      const fromGloss = glossary.filter((g) =>
        [g.term, g.shortDef].some((v) => v.toLowerCase().includes(q))
      ).map((g) => ({ kind: "gloss", id: g.term, term: g.term, shortDef: g.shortDef }));
      return [...fromTypes, ...fromGloss].slice(0, 10);
    }
  }, [query, types, glossary, relations, error, search]);
  
  // Show error state
  if (error) {
    return <div className={cls("min-h-screen flex items-center justify-center", darkMode ? "bg-gray-900" : "bg-white")}><div className="p-6 text-red-700">Data load failed: {error}</div></div>;
  }
  
  // Show loading state
  if (!types || !glossary || !relations) {
    return <div className={cls("min-h-screen flex items-center justify-center", darkMode ? "bg-gray-900" : "bg-white")}><div className={cls("p-6", darkMode ? "text-white" : "text-black")}>Loading…</div></div>;
  }
  
  // build helpers the old constants provided
  const byCode = Object.fromEntries(types.map(t => [t.code, t]));
  const DUALS = new Set(relations.filter(r=>r.name==="Duality").map(r => [r.a, r.b].sort().join("-")));
  
  const relInfo = classifyRelation(typeA, typeB, duals);
  return (
    <div className={cls("min-h-screen", darkMode ? "bg-gray-900 text-white" : "bg-white text-black")}>
      <a
        href="#content"
        className="sr-only focus:not-sr-only focus:absolute focus:m-4 focus:p-2 focus:bg-white focus:ring-2 focus:ring-red-600"
      >
        Skip to content
      </a>
      <TopBar
        onNav={navigate}
        query={query}
        setQuery={setQuery}
        searchRef={searchRef}
        onResult={(r) => {
          if (r.kind === "type") navigate("type", { code: r.id });
          if (r.kind === "gloss") navigate("glossary", { focus: r.id });
        }}
        results={results}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />
      <main id="content" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-24">
        {route.name === "home" && <Home onNav={navigate} types={types} darkMode={darkMode} />}
        {route.name === "start" && <StartHere onNav={navigate} darkMode={darkMode} types={types} glossary={glossary} />}
        {route.name === "types" && <TypesIndex types={types} onOpen={(code) => navigate("type", { code })} />}
        {route.name === "type" && <TypeDetail types={types} duals={DUALS} code={route.code} onBack={() => navigate("types")} darkMode={darkMode} />}
        {route.name === "relations" && <Relations types={types} duals={DUALS} relations={relations} onNav={navigate} darkMode={darkMode} />}
        {route.name === "theory" && <Theory onNav={navigate} darkMode={darkMode} />}
        {route.name === "functions" && <FunctionExplorer glossary={glossary} types={types} darkMode={darkMode} />}
        {route.name === "compare" && <TypeCompare types={types} duals={DUALS} darkMode={darkMode} initialA={route.a} initialB={route.b} onNav={navigate} />}
        {route.name === "glossary" && <Glossary glossary={glossary} focus={route.focus} darkMode={darkMode} />}
        {route.name === "library" && <Library darkMode={darkMode} />}
        {route.name === "about" && <About darkMode={darkMode} />}
      </main>
      <SiteFooter darkMode={darkMode} generatedAt={meta && meta.generatedAt} />
    </div>
  );
}

// --- Top bar ---
function TopBar({ onNav, query, setQuery, searchRef, onResult, results, darkMode, setDarkMode }) {
  const [selected, setSelected] = useState(0);

  useEffect(() => { setSelected(0); }, [query]);

  const onKeyDown = (e) => {
    if (!results.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelected((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelected((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = results[selected] || results[0];
      if (item) onResult(item);
    } else if (e.key === 'Escape') {
      setQuery('');
    }
  };

  const highlight = (text, q) => {
    if (!q) return text;
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    const before = text.slice(0, idx);
    const match = text.slice(idx, idx + q.length);
    const after = text.slice(idx + q.length);
    return (
      <>
        {before}
        <mark className={darkMode ? 'bg-yellow-900 text-yellow-100' : 'bg-yellow-200'}>{match}</mark>
        {after}
      </>
    );
  };

  return (
    <header className={cls("sticky top-0 z-40 backdrop-blur border-b", darkMode ? "bg-gray-900/85 border-gray-700" : "bg-white/85 border-neutral-200")}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-3 flex items-center gap-4">
        <button
          onClick={() => onNav("home")}
          className="flex items-center gap-2 group"
          aria-label="Home"
        >
          <div className="px-2 py-1 bg-red-600 text-white text-xs tracking-widest font-semibold">
            WIKI
          </div>
          <span className="font-semibold tracking-tight">socion</span>
        </button>
        <nav className="hidden md:flex items-center gap-6 text-sm">
          {[
            ["Start", "start"],
            ["Types", "types"],
            ["Compare", "compare"],
            ["Glossary", "glossary"],
          ].map(([label, route]) => (
            <button
              key={route}
              onClick={() => onNav(route)}
              className={cls("nav-link", darkMode ? "text-white hover:text-red-500" : "text-black")}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="ml-auto relative flex-1 max-w-md">
          <div className={cls("input-wrap") }>
            <Search className={cls("ml-2 h-4 w-4", darkMode ? "text-gray-400" : "text-neutral-500")} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={onKeyDown}
              placeholder={'Search: LII, "Model A", Fe... (/ to focus)'}
              className={cls("input", darkMode ? "text-white placeholder-gray-500" : "text-neutral-900 placeholder-neutral-500")}
            />
          </div>
          {!!results.length && (
            <div className={cls("absolute mt-1 w-full rounded-md shadow-sm border overflow-hidden", darkMode ? "bg-gray-800 border-gray-700" : "bg-white border-neutral-200")}
                 role="listbox" aria-label="Search results">
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => onResult(r)}
                  onMouseEnter={() => setSelected(i)}
                  className={cls("w-full text-left px-3 py-2 text-sm focus:outline-none flex items-center gap-2 border-b last:border-b-0", darkMode ? (i === selected ? "bg-gray-700 text-white border-gray-700" : "text-white border-gray-700") : (i === selected ? "bg-neutral-100 text-black border-neutral-200" : "text-black border-neutral-200"))}
                  role="option"
                  aria-selected={i === selected}
                >
                  {r.kind === 'type' ? (
                    <>
                      <span className="font-mono mr-2">{highlight(r.code, query)}</span>
                      <span className="flex-1">
                        {highlight(r.fullName, query)}
                        <span className={cls("ml-1 text-xs", darkMode ? "text-gray-300" : "text-neutral-600")}>({r.alias})</span>
                      </span>
                    </>
                  ) : (
                    <>
                      <span className="mr-2">Glossary</span>
                      <span className="font-semibold">{highlight(r.term, query)}</span>
                      <span className={cls("ml-2 text-xs", darkMode ? "text-gray-300" : "text-neutral-600")}>{highlight(r.shortDef, query)}</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={cls("p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-red-600", darkMode ? "text-gray-300 hover:bg-gray-800" : "text-neutral-700 hover:bg-neutral-200")}
          aria-label={darkMode ? "Switch to light mode" : "Switch to dark mode"}
        >
          {darkMode ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
        </button>
      </div>
    </header>
  );
}

// --- Pages ---
function Home({ onNav, types, darkMode }) {
  return (
    <section className="pt-12">
      <div className="grid md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-7">
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Socionics, organized.
          </h1>
          <p className={cls("mt-4 text-lg max-w-xl", darkMode ? "text-gray-300" : "text-neutral-900")}>
            Clear explanations of types, functions, and relations. Minimal jargon. Mobile-friendly. Open source.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => onNav("start")}
              className="btn btn-primary tracking-wide"
            >
              Start here <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNav("types")}
              className="btn btn-secondary"
            >
              <TypeIcon className="h-4 w-4" /> Types
            </button>
            <button
              onClick={() => onNav("relations")}
              className="btn btn-secondary"
            >
              <Network className="h-4 w-4" /> Relations
            </button>
          </div>
        </div>
        <div className="md:col-span-5">
          <div className="grid grid-cols-2 gap-3">
            <HomeTile
              title="Types"
              subtitle="16 profiles"
              icon={<TypeIcon className="h-5 w-5" />}
              onClick={() => onNav("types")}
            />
            <HomeTile
              title="Relations"
              subtitle="Lookup pairs"
              icon={<Network className="h-5 w-5" />}
              onClick={() => onNav("relations")}
            />
            <HomeTile
              title="Theory"
              subtitle="Model A, IE"
              icon={<BookOpen className="h-5 w-5" />}
              onClick={() => onNav("theory")}
            />
            <HomeTile
              title="Glossary"
              subtitle="A-Z"
              icon={<Info className="h-5 w-5" />}
              onClick={() => onNav("glossary")}
            />
          </div>
        </div>
      </div>

      <div className="mt-16 border-t divider pt-8">
        <h2 className="text-2xl font-semibold">Quick type grid</h2>
        <p className="text-sm dark:text-gray-400 text-neutral-600">
          Tap a tile to open the type page. Long labels are simplified for readability.
        </p>
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {types.map((t) => (
            <TypeCard key={t.code} type={t} />
          ))}
        </div>
      </div>
    </section>
  );
}

function HomeTile({ title, subtitle, icon, onClick }) {
  return (
    <button onClick={onClick} className="card h-28 text-left px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600">
      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-gray-400">
        {icon}
        <span>{subtitle}</span>
      </div>
      <div className="mt-2 text-xl font-semibold dark:text-white text-black">{title}</div>
    </button>
  );
}

function TypesIndex({ types, onOpen }) {
  const [view, setView] = useState("grid");
  const [filters, setFilters] = useState({ quadra: "All", temperament: "All", leading: "All" });
  
  const filtered = useMemo(() => {
    return types.filter(
      (t) =>
        (filters.quadra === "All" || t.quadra === filters.quadra) &&
        (filters.temperament === "All" || t.temperament === filters.temperament) &&
        (filters.leading === "All" || t.leading === filters.leading)
    );
  }, [filters, types]);
  
  return (
    <section className="pt-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-3xl font-semibold tracking-tight">Types</h1>
        <div className="flex items-center gap-2 text-sm">
          <span className="inline-flex items-center gap-1 px-2 py-1 border rounded-md border-neutral-300 dark:border-gray-600 dark:text-gray-300">
            <ListFilter className="h-4 w-4" /> Filters
          </span>
          <select
            className="border border-neutral-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            value={filters.quadra}
            onChange={(e) => setFilters((f) => ({ ...f, quadra: e.target.value }))}
          >
            {["All", "Alpha", "Beta", "Gamma", "Delta"].map((x) => (
              <option key={x} className="dark:bg-gray-800">{x}</option>
            ))}
          </select>
          <select
            className="border border-neutral-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            value={filters.temperament}
            onChange={(e) => setFilters((f) => ({ ...f, temperament: e.target.value }))}
          >
            {["All", "EP", "EJ", "IP", "IJ"].map((x) => (
              <option key={x} className="dark:bg-gray-800">{x}</option>
            ))}
          </select>
          <select
            className="border border-neutral-300 px-2 py-1 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300"
            value={filters.leading}
            onChange={(e) => setFilters((f) => ({ ...f, leading: e.target.value }))}
          >
            {["All", "Ne", "Ni", "Se", "Si", "Te", "Ti", "Fe", "Fi"].map((x) => (
              <option key={x} className="dark:bg-gray-800">{x}</option>
            ))}
          </select>
          <div className="ml-4 inline-flex border border-neutral-300 dark:border-gray-600">
            <button
              onClick={() => setView("grid")}
              className={cls("px-2 py-1", view === "grid" && "bg-neutral-100 dark:bg-gray-700")}
            >
              {<GridIcon className="h-4 w-4" />}
            </button>
            <button
              onClick={() => setView("list")}
              className={cls("px-2 py-1", view === "list" && "bg-neutral-100 dark:bg-gray-700")}
            >
              {<Rows className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>

      {view === "grid" ? (
        <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {filtered.map((t) => (
            <button
              key={t.code}
              onClick={() => onOpen(t.code)}
              className="card text-left px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600"
            >
              <div className="flex items-baseline justify-between">
                <div className="font-mono text-2xl dark:text-white text-black">{t.code}</div>
                <span className="chip">{t.alias}</span>
              </div>
              <div className="mt-1 text-sm dark:text-gray-300 text-neutral-900">{t.fullName}</div>
              <div className="mt-2 flex gap-2 text-xs dark:text-gray-500 text-neutral-600">
                <span className="chip">{t.quadra}</span>
                <span className="chip">{t.temperament}</span>
                <span className="chip">{t.leading}/{t.creative}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6 divide-y divide-neutral-200 dark:divide-gray-800">
          {filtered.map((t) => (
            <button
              key={t.code}
              onClick={() => onOpen(t.code)}
              className="w-full text-left py-3 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-600 dark:hover:bg-gray-800"
            >
              <div className="flex items-center gap-4 px-2">
                <span className="font-mono text-lg w-16 dark:text-white text-black">{t.code}</span>
                <span className="flex-1 dark:text-gray-300 text-black">
                  {t.fullName} <span className="text-neutral-500 dark:text-gray-500">({t.alias})</span>
                </span>
                <span className="text-xs text-neutral-600 dark:text-gray-500">
                  {t.quadra} · {t.temperament} · {t.leading}/{t.creative}
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </section>
  );
}

function TypeCard({ type }) {
  return (
    <a
      href={type.href}
      target="_blank"
      rel="noopener noreferrer"
      className="card px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-600"
    >
      <div className="flex items-baseline justify-between">
        <div className="font-mono text-2xl dark:text-white text-black">{type.code}</div>
        <span className="chip">{type.alias}</span>
      </div>
      <div className="mt-1 text-sm dark:text-gray-300 text-neutral-900">{type.fullName}</div>
      <div className="mt-2 flex gap-2 text-xs dark:text-gray-500 text-neutral-600">
        <span className="chip">{type.quadra}</span>
        <span className="chip">{type.leading}/{type.creative}</span>
      </div>
      <div className="mt-2 inline-flex items-center gap-1 text-xs dark:text-gray-500 text-neutral-800">
        Open wiki <ExternalLink className="h-3 w-3" />
      </div>
    </a>
  );
}

function TypeDetail({ types, duals, code, onBack, darkMode }) {
  const byCode = Object.fromEntries(types.map((t) => [t.code, t]));
  const t = byCode[code] ?? types[0];
  
  // Extended content for each type
  const typeContent = {
    "ESE": {
      summary: "The ESE (ESFj) thrives on emotional connection and creating a cheerful atmosphere. Their dominant extroverted feeling makes them natural hosts who quickly sense group mood and steer it with humor, stories and enthusiastic gestures. Creative introverted sensing enables them to arrange comfortable settings, meeting people's tastes and ensuring physical harmony. They generally avoid impersonal efficiency discussions and long-term planning, focusing instead on the present emotional climate. Because of their emphasis on harmony, they may overlook practical matters and can be late or disorganized when confronted with schedules and tasks.",
      characteristics: {
        strengths: "Engaging communicators who use humor, anecdotes and expressive energy to motivate others. Skilled at arranging events and attending to others' comfort and tastes.",
        challenges: "Dislike routine tasks and may neglect planning or punctuality; can misjudge efficiency and ignore facts if they conflict with emotional goals."
      },
      modelA: [
        { position: "1 (Base)", element: "Fe", description: "Generates enthusiasm and shapes emotional atmosphere" },
        { position: "2 (Creative)", element: "Si", description: "Creates comfortable settings and adjusts to others' tastes" },
        { position: "3 (Role)", element: "Te", description: "Tries to be efficient but often finds practical details tiresome" },
        { position: "4 (Vulnerable)", element: "Ni", description: "Dislikes long-term forecasts and may be late due to poor time estimation" },
        { position: "5 (Suggestive)", element: "Ti", description: "Looks to others for clear logic and structuring of information" },
        { position: "6 (Mobilizing)", element: "Ne", description: "Energized by novel ideas and possibilities when presented by others" },
        { position: "7 (Ignoring)", element: "Fi", description: "May overlook personal values when focused on group harmony" },
        { position: "8 (Demonstrative)", element: "Se", description: "Can assert themselves strongly when needed to maintain order but prefers warmth" }
      ],
      interaction: {
        communication: "Charismatic and lively; uses anecdotes, humor and expressive gestures to keep conversations engaging",
        work: "Prefers group activities and plans events around people's comfort; may disregard efficiency and procrastinate if tasks seem dull",
        decision: "Chooses actions based on the emotional effect on others rather than detached logic; avoids cold efficiency debates"
      },
      nuances: "ESEs often view the world through the lens of emotional atmosphere and may assume present circumstances will persist, leading to poor time management. They can become impatient with people who are overly technical or factual, preferring personal stories and emotions."
    },
    "EII": {
      summary: "EIIs are idealistic advisors who strive to live up to their ethical standards and help others do the same. Their dominant introverted feeling tunes them to the psychological atmosphere, valuing deep emotional bonds and treating people with respect. Creative extroverted intuition enables them to see potential in people's inner makeup and guide them towards ideals. They struggle with systems and abstract logic, believing that not everything can be classified neatly. Forgetful of their surroundings and sometimes oblivious to romantic hints, they rely on practical people to evaluate productivity and help them relax.",
      characteristics: {
        strengths: "Supportive and insightful; encourage others to realise their potential; maintain a respectful and harmonious atmosphere.",
        challenges: "Disorganised in physical surroundings; may miss obvious hints; need external evaluation of productivity; have poor time management and must be reminded to relax."
      },
      modelA: [
        { position: "1 (Base)", element: "Fi", description: "Embodies ideals and evaluates inner feelings" },
        { position: "2 (Creative)", element: "Ne", description: "Sees potential in people and pushes for self-improvement" },
        { position: "3 (Role)", element: "Ti", description: "Attempts to use logic but believes not everything fits into neat categories" },
        { position: "4 (Vulnerable)", element: "Se", description: "Often misses obvious cues and waits for things to happen" },
        { position: "5 (Suggestive)", element: "Te", description: "Looks to others to evaluate productivity and provide factual guidance" },
        { position: "6 (Mobilizing)", element: "Si", description: "Needs help relaxing and managing stress built up from striving to be exemplary" },
        { position: "7 (Ignoring)", element: "Fe", description: "Can be lively briefly but prefers deep conversation; cannot hide true feelings" },
        { position: "8 (Demonstrative)", element: "Ni", description: "Discusses trends and warns others but does not enforce decisions" }
      ],
      interaction: {
        communication: "Gentle and principled; focuses on people's feelings and potential; dislikes superficial chit-chat",
        work: "Encourages others to grow but may neglect practical arrangements; forgetful of objects and often disorganised",
        decision: "Guided by personal ethics and the potential they see in others; seeks factual advice and reminders to rest"
      },
      nuances: "EIIs may be oblivious to romantic hints and neglect basic needs because they are absorbed in internal idealism. They can discuss trends and warn others but often lack the willpower to enact their own advice."
    },
    "ILE": {
      summary: "The ILE (ENTp) is driven by extroverted intuition, constantly scanning for new possibilities and connections. They speak in generalizations and analogies and quickly jump from one idea to another. Their creative introverted logic structures these ideas into coherent systems and fuels a fascination with how things work. They may lose interest in routine tasks, question arbitrary rules and struggle to finish projects once the novelty wears off. Personal sentiments and direct orders feel alien to them, so they prefer to operate independently and on their own schedule.",
      characteristics: {
        strengths: "Explores connections between disparate topics, generates original analogies and hypotheses, questions assumptions and develops logical explanations.",
        challenges: "May start more projects than they finish, ignore practical details or emotional considerations, and have difficulty following routines or orders."
      },
      modelA: [
        { position: "1 (Base)", element: "Ne", description: "Constantly searches for new possibilities and connections" },
        { position: "2 (Creative)", element: "Ti", description: "Structures ideas logically and questions rules" },
        { position: "3 (Role)", element: "Fe", description: "Tries to use emotional expression in social situations but finds it tiring" },
        { position: "4 (Vulnerable)", element: "Si", description: "Neglects routine sensory matters and physical comfort" },
        { position: "5 (Suggestive)", element: "Te", description: "Seeks external facts and clear efficiency guidelines from others" },
        { position: "6 (Mobilizing)", element: "Ni", description: "Needs help foreseeing long-term implications and sticking with a plan" },
        { position: "7 (Ignoring)", element: "Fi", description: "Distrusts personal sentiments and may appear aloof" },
        { position: "8 (Demonstrative)", element: "Se", description: "Can assert willpower in short bursts but finds direct confrontation distasteful" }
      ],
      interaction: {
        communication: "Talks rapidly about abstract concepts, using analogies and generalizations; enjoys brainstorming and intellectual debates",
        work: "Initiates multiple projects, often jumping between them; focuses on novelty and innovation; may struggle to complete routine tasks or follow schedules",
        decision: "Bases decisions on logical analysis and potential outcomes rather than feelings; questions rules and procedures if they seem illogical"
      },
      nuances: "The site likens the ILE to an inventor or 'Don Quixote' archetype, emphasising their romantic idealism and pursuit of possibilities. Their disregard for practical details and emotional expression can lead others to perceive them as naive or insensitive."
    },
    "SEI": {
      summary: "SEIs are warm, aesthetic individuals attuned to the atmosphere around them. Their dominant introverted sensing makes them sensitive to comfort and discomfort, and they intuitively know how to create cozy environments. The creative extroverted feeling gives them a knack for uplifting moods and mirroring the emotions of the group. Although they enjoy pleasant experiences and recreation, they may rush tasks, leading to stress, and they dislike discussing abstract concepts or long-term plans. Facts and technical details feel cold to them, so they prefer hands-on experience and rely on others for efficiency and strategic foresight.",
      characteristics: {
        strengths: "Skilled at creating a harmonious atmosphere; understand subtle sensory cues; use humor to keep interactions light.",
        challenges: "Tend to avoid abstract theories; may rush tasks due to poor time estimation; distrust impersonal data and prefer personal experience over facts."
      },
      modelA: [
        { position: "1 (Base)", element: "Si", description: "Sensitive to physical states and seeks comfort" },
        { position: "2 (Creative)", element: "Fe", description: "Uplifts mood with humor and emotional expression" },
        { position: "3 (Role)", element: "Ni", description: "Attempts to see patterns but feels stressed by long-term planning" },
        { position: "4 (Vulnerable)", element: "Te", description: "Uncomfortable with efficiency and impersonal facts" },
        { position: "5 (Suggestive)", element: "Ne", description: "Looks to others for new ideas and inspiration" },
        { position: "6 (Mobilizing)", element: "Ti", description: "Seeks help structuring tasks logically" },
        { position: "7 (Ignoring)", element: "Se", description: "Dislikes forceful behaviour and avoids confrontation" },
        { position: "8 (Demonstrative)", element: "Fi", description: "Expresses personal feelings through art rather than words" }
      ],
      interaction: {
        communication: "Friendly and expressive; uses humor and personal anecdotes to maintain a pleasant mood",
        work: "Focuses on achieving a comfortable environment; may leave abstract planning to others; sometimes rushes tasks, which increases stress",
        decision: "Prefers to rely on how something feels rather than impersonal statistics; asks friends for advice on unfamiliar ideas or efficiency"
      },
      nuances: "SEIs often express their feelings through artistic creations rather than direct verbal statements. They may procrastinate until deadlines force them to act, causing unnecessary stress."
    },
    "IEI": {
      summary: "IEIs are dreamy visionaries who perceive subtle trends and patterns over time. Their dominant introverted intuition draws them to imagine future scenarios and contemplate the meaning of events. Creative extroverted feeling allows them to influence others' moods, blend seriousness with humor and energise groups with dramatic expressions. They may be messy and inconsistent in day-to-day tasks, struggling with practical efficiency and routine work. They admire strong willpower and clear systems, relying on others to provide structure and support when turning ideas into action.",
      characteristics: {
        strengths: "Adept at reading emotional undercurrents and inspiring others with imaginative stories; can mix melancholy and comedy to keep people engaged.",
        challenges: "Dislike rote facts and efficiency; may misplace objects or neglect chores. Need help taking decisive action and maintaining systems."
      },
      modelA: [
        { position: "1 (Base)", element: "Ni", description: "Perceives trends and contemplates meaning" },
        { position: "2 (Creative)", element: "Fe", description: "Dramatizes emotions and energises groups" },
        { position: "3 (Role)", element: "Si", description: "Attempts to manage physical needs but can be messy and inconsistent" },
        { position: "4 (Vulnerable)", element: "Te", description: "Frustrated by detailed work and efficiency discussions" },
        { position: "5 (Suggestive)", element: "Se", description: "Looks to others for willpower and decisive action" },
        { position: "6 (Mobilizing)", element: "Ti", description: "Gains confidence from clear systems and logical explanations" },
        { position: "7 (Ignoring)", element: "Ne", description: "Pays little attention to endless possibilities beyond the main storyline" },
        { position: "8 (Demonstrative)", element: "Fi", description: "Maintains deep bonds quietly and retreats when stressed" }
      ],
      interaction: {
        communication: "Speaks in metaphors and emotional narratives; mixes seriousness with playful humor",
        work: "Prefers imaginative exploration over routine; may neglect chores and need external motivation to act",
        decision: "Guided by intuition and group mood; seeks partners who offer practical structure and logical clarity"
      },
      nuances: "IEIs often appear dreamy or absent-minded because they prefer to live in their imaginations. They may blame themselves to ensure a good atmosphere and use melodrama to defuse tension."
    },
    "SLE": {
      summary: "SLEs are decisive leaders who perceive power dynamics and act in the moment. With dominant extroverted sensing they recognise opportunities, take initiative and improvise effectively. Creative introverted logic gives them a sense of competence and an ability to gather useful information to achieve goals. They thrive on action and challenge but may overlook hidden potentials and can misjudge people due to weak intuition. They dislike being controlled by others and may reject advice or orders that do not align with their own goals.",
      characteristics: {
        strengths: "Natural leaders who act decisively; perceive social hierarchies and power; improvise and adapt to changing circumstances. Respect competence and are willing to learn from experts.",
        challenges: "Overlook deeper meanings or future possibilities; misjudge others' motives; suspicious of broad questions and may hesitate when uncertain about the future."
      },
      modelA: [
        { position: "1 (Base)", element: "Se", description: "Recognises power dynamics, acts decisively and improvises" },
        { position: "2 (Creative)", element: "Ti", description: "Analyses situations and values competence" },
        { position: "3 (Role)", element: "Ne", description: "Tries to consider possibilities but may overlook hidden potentials" },
        { position: "4 (Vulnerable)", element: "Fi", description: "Uncomfortable with nuanced emotions; may misjudge sincerity" },
        { position: "5 (Suggestive)", element: "Ni", description: "Looks to others for foresight and strategic vision" },
        { position: "6 (Mobilizing)", element: "Fe", description: "Gains energy from enthusiastic encouragement and recognition" },
        { position: "7 (Ignoring)", element: "Si", description: "Pays little attention to personal comfort unless it impacts performance" },
        { position: "8 (Demonstrative)", element: "Te", description: "Can gather factual data and use it pragmatically, but sees it as secondary" }
      ],
      interaction: {
        communication: "Direct and assertive; quick to voice opinions and challenge others; values competence over niceties",
        work: "Learns through hands-on experience and immediate feedback; prefers action to theory; rejects unnecessary instructions",
        decision: "Bases decisions on present realities and power structures; may overlook long-term possibilities or subtle interpersonal cues"
      },
      nuances: "SLEs may believe that their own judgment is superior and reject advice that does not align with their goals. Their suspicion of hidden motives can lead to misunderstanding and tension with more intuitive partners."
    },
    "ESI": {
      summary: "ESIs are principled guardians who evaluate people by their loyalty and integrity. Their dominant introverted feeling compels them to uphold ethical standards and judge others accordingly. Creative extroverted sensing gives them the courage to act directly in defence of themselves and loved ones, though they may later regret impulsive actions. Abstract theories and speculative discussions feel irrelevant; they prefer concrete decisions and may become annoyed when inconsistencies in their logical justifications are pointed out. They appreciate knowledgeable people who provide practical guidance and admire foresight but worry about thinking too much.",
      characteristics: {
        strengths: "Strong moral compass; willingness to defend loved ones; expect honesty and responsibility from themselves and others.",
        challenges: "Skeptical of abstract possibilities; demand evidence for claims; may punish others harshly; feel insecure about their own potential."
      },
      modelA: [
        { position: "1 (Base)", element: "Fi", description: "Judges loyalty and integrity and upholds ethical principles" },
        { position: "2 (Creative)", element: "Se", description: "Acts directly to accomplish goals and protect loved ones" },
        { position: "3 (Role)", element: "Ti", description: "Tries to justify decisions logically but dislikes having inconsistencies pointed out" },
        { position: "4 (Vulnerable)", element: "Ne", description: "Skeptical of abstract ideas and speculative possibilities" },
        { position: "5 (Suggestive)", element: "Te", description: "Appreciates knowledgeable people and guidance on timing and efficiency" },
        { position: "6 (Mobilizing)", element: "Ni", description: "Values foresight and outside evaluation of developing situations" },
        { position: "7 (Ignoring)", element: "Fe", description: "Able to adopt a pleasant atmosphere when necessary but doesn't prioritise it" },
        { position: "8 (Demonstrative)", element: "Si", description: "Maintains comfort and notices when others spoil the atmosphere" }
      ],
      interaction: {
        communication: "Direct and principled; expresses approval or disapproval clearly and expects loyalty",
        work: "Prefers concrete tasks and real-world application; discards theoretical possibilities without evidence",
        decision: "Guided by personal ethics and the impact on loved ones; seeks practical guidance for timing and efficiency"
      },
      nuances: "ESIs may dismiss speculative questions and demand concrete evidence; they can appear self-righteous when defending ethical standards. They can integrate into a pleasant atmosphere but will not pretend to feel positive if they don't."
    },
    "SEE": {
      summary: "SEEs are dynamic social coordinators who understand the influence of people and status. Their dominant extroverted sensing gives them assertiveness, awareness of social power and a willingness to push toward goals. Creative introverted feeling lets them influence personal feelings: they praise, shame or switch loyalties to align people with their objectives. They are motivated by exclusivity and tangible achievements and often view relationships in terms of strategic value. Abstract ideas and structured thinking may bore them; they prefer immediate results and look to others for long-term planning.",
      characteristics: {
        strengths: "Confidently takes initiative and draws attention; understands social hierarchies and uses emotions to influence others.",
        challenges: "Suspicious of new ideas, cautious of unpredictability, and impatient with rules; may fear being judged for not following norms."
      },
      modelA: [
        { position: "1 (Base)", element: "Se", description: "Seizes opportunities, asserts will and recognises power" },
        { position: "2 (Creative)", element: "Fi", description: "Influences feelings; praises or shames to guide behaviour" },
        { position: "3 (Role)", element: "Ne", description: "Attempts to consider possibilities but feels uneasy with unpredictable people" },
        { position: "4 (Vulnerable)", element: "Ti", description: "Dislikes structured thinking and may struggle to justify decisions logically" },
        { position: "5 (Suggestive)", element: "Ni", description: "Looks to others for long-term foresight and guidance" },
        { position: "6 (Mobilizing)", element: "Te", description: "Gains motivation from efficient methods and clear procedures" },
        { position: "7 (Ignoring)", element: "Si", description: "Pays little attention to personal comfort unless it enhances status" },
        { position: "8 (Demonstrative)", element: "Fe", description: "Can liven up moods but becomes bored by excessive emotional display" }
      ],
      interaction: {
        communication: "Bold and charismatic; draws attention to themselves and uses emotional manipulation to influence others",
        work: "Thrives on tangible goals and competition; uninterested in abstract ideas unless they have immediate relevance",
        decision: "Bases decisions on social advantage and feasibility; values efficient suggestions and long-term vision from partners"
      },
      nuances: "SEEs are motivated by exclusivity and status; they may view relationships in terms of achieving goals rather than intrinsic sentiment. They often fear being judged for not following norms and may make impulsive decisions to avoid appearing weak."
    },
    "ILI": {
      summary: "ILIs are reflective analysts who seek to uncover hidden connections and foresee future consequences. Dominant introverted intuition makes them introspective, pattern-oriented and sometimes pessimistic to avoid disappointment. Creative extroverted thinking drives them to collect accurate information, correct mistakes and act with perfectionistic precision. They pay little attention to physical comforts, may misinterpret bodily sensations and often appear emotionally distant. Because they need help with decisive action and emotional closeness, they look to partners who provide willpower and ethical support.",
      characteristics: {
        strengths: "Keen insight into trends and consequences; ability to correct information and identify logical flaws.",
        challenges: "Indifferent to physical surroundings; difficulty expressing feelings; require external motivation to act and seek closeness."
      },
      modelA: [
        { position: "1 (Base)", element: "Ni", description: "Analyses hidden connections and foresees consequences" },
        { position: "2 (Creative)", element: "Te", description: "Collects accurate information and corrects errors" },
        { position: "3 (Role)", element: "Si", description: "Tries to care for bodily needs but often misreads sensations" },
        { position: "4 (Vulnerable)", element: "Fe", description: "Appears cold and finds socializing exhausting" },
        { position: "5 (Suggestive)", element: "Se", description: "Looks to others for willpower and external stimulation" },
        { position: "6 (Mobilizing)", element: "Fi", description: "Seeks deep ethical connections and reassurance" },
        { position: "7 (Ignoring)", element: "Ne", description: "Ignores endless possibilities, focusing on quality over quantity" },
        { position: "8 (Demonstrative)", element: "Ti", description: "Can apply logical structures when necessary but prefers concise efficiency" }
      ],
      interaction: {
        communication: "Analytical and detached; speaks about patterns and consequences; corrects misinformation and may employ sarcasm",
        work: "Spends time studying and contemplating; may hesitate to act until fully prepared; collects detailed information",
        decision: "Bases decisions on perceived outcomes and factual accuracy; relies on partners for moral guidance and motivation"
      },
      nuances: "ILIs may delay acting on their insights and appear indecisive, yet they are internally analysing multiple possible outcomes. Their sarcastic comments often stem from a desire to correct misinformation."
    },
    "LIE": {
      summary: "LIEs are pragmatic strategists who value efficiency and long-term outcomes. Their dominant extroverted thinking drives them to accumulate factual knowledge, correct errors and optimise systems. Creative introverted intuition helps them anticipate consequences and think ahead, often doing things 'just in case'. They focus on productivity and may act like know-it-alls, devaluing small talk and emotional comforts. Although they respect ethical consistency and rely on resolute partners for motivation, they may neglect immediate sensory needs and interpersonal warmth.",
      characteristics: {
        strengths: "Efficient, knowledgeable and forward-thinking; correct inaccuracies and anticipate future outcomes.",
        challenges: "May appear cold or pedantic; neglect immediate comforts and emotional rapport; need external encouragement to act on personal goals."
      },
      modelA: [
        { position: "1 (Base)", element: "Te", description: "Focuses on efficiency, gathering factual data and correcting errors" },
        { position: "2 (Creative)", element: "Ni", description: "Anticipates consequences and plans ahead" },
        { position: "3 (Role)", element: "Fe", description: "Attempts to display enthusiasm but often views emotions as tools" },
        { position: "4 (Vulnerable)", element: "Si", description: "Neglects physical comfort and aesthetics" },
        { position: "5 (Suggestive)", element: "Fi", description: "Needs reassurance about personal relationships and clear ethical guidance" },
        { position: "6 (Mobilizing)", element: "Se", description: "Gains motivation from resolute partners who push them to act" },
        { position: "7 (Ignoring)", element: "Ti", description: "May overlook pure logical consistency if it hinders efficiency" },
        { position: "8 (Demonstrative)", element: "Ne", description: "Generates possibilities and alternatives but keeps them secondary" }
      ],
      interaction: {
        communication: "Fact-oriented and directive; often corrects others and provides data to support arguments",
        work: "Constantly improves systems and forecasts outcomes; may do extra work to cover potential issues",
        decision: "Bases decisions on efficiency and long-term results; values pragmatic ethics and resolute action"
      },
      nuances: "LIEs often correct others even during casual conversation, leading to the perception that they are 'know-it-alls'. They admire resolute people and may fear the negative consequences of acting without sufficient planning."
    },
    "LSE": {
      summary: "LSEs are industrious organisers who judge everything by its practical usefulness. Their dominant extroverted thinking pushes them to focus on productivity, comment on uselessness and refine methods to achieve real results. Creative introverted sensing adds a concern for comfort and convenience; they rearrange environments and plan physical recreation to keep things orderly and pleasant. They speak factually and maintain reliability, judging people by their deeds rather than words. However, they may ignore emotions, appear monotone and become frustrated when others fail to follow instructions. They prefer stable, predictable futures and avoid speculative forecasts, believing hard work will pay off.",
      characteristics: {
        strengths: "Hard-working, reliable and factual; maintain order and judge by deeds. Provide comfort and practical support to others.",
        challenges: "Appear monotone and worry about being made to look foolish; may lose temper when instructions aren't followed. Prefer predictable paths and can resist change or speculative plans."
      },
      modelA: [
        { position: "1 (Base)", element: "Te", description: "Focuses on productivity and real needs, comments on uselessness" },
        { position: "2 (Creative)", element: "Si", description: "Reorganises living spaces and plans physical recreation for comfort" },
        { position: "3 (Role)", element: "Fe", description: "Tries to be emotionally expressive but feels awkward; monotone speech" },
        { position: "4 (Vulnerable)", element: "Ni", description: "Avoids speculative forecasts and prefers predictable outcomes" },
        { position: "5 (Suggestive)", element: "Fi", description: "Looks for emotional warmth and personal values from others to balance their pragmatism" },
        { position: "6 (Mobilizing)", element: "Ne", description: "Gains energy from new ideas and possibilities when presented in practical terms" },
        { position: "7 (Ignoring)", element: "Ti", description: "May neglect theoretical consistency if it conflicts with efficiency" },
        { position: "8 (Demonstrative)", element: "Se", description: "Can be forceful when enforcing order but sees it as a last resort" }
      ],
      interaction: {
        communication: "Factual and orderly; judges by deeds; may sound monotone and non-emotional",
        work: "Establishes efficient routines, reorganises environments for convenience and expects instructions to be followed",
        decision: "Bases decisions on practicality and reliability; avoids speculation and prefers stable, predictable plans"
      },
      nuances: "LSEs may appear stern and unfeeling, but this stems from a focus on productivity rather than indifference. They believe hard work will pay off and may underestimate the influence of external change or luck."
    },
    "EIE": {
      summary: "EIEs are passionate communicators who feel responsible for the emotional climate of their communities. Their dominant extroverted feeling drives them to generate liveliness, involve people and encourage shared values. Creative introverted intuition gives them a sense of significance, love of history and an ability to imagine future scenarios and 'paint pictures' of what could happen. They avoid discussions of efficiency and routine tasks, focusing instead on the meaning and mood of events. Although they may appear melodramatic and occasionally impose their opinions, they need others to help organise schedules and provide logical structure.",
      characteristics: {
        strengths: "Skilled at motivating and involving people; love discussing meaning and significance; plan ahead and warn others of potential problems.",
        challenges: "Dislike impersonal efficiency and may procrastinate; often misplace objects and struggle with practical maintenance. May be brash and impose views when challenged."
      },
      modelA: [
        { position: "1 (Base)", element: "Fe", description: "Generates liveliness, maintains emotional atmosphere and holds strong views" },
        { position: "2 (Creative)", element: "Ni", description: "Imagines future scenarios and imbues events with significance" },
        { position: "3 (Role)", element: "Te", description: "Attempts to be efficient but avoids discussions of productivity" },
        { position: "4 (Vulnerable)", element: "Si", description: "Often misplaces objects and neglects physical details" },
        { position: "5 (Suggestive)", element: "Ti", description: "Seeks clear logical structures and appreciates concise explanations" },
        { position: "6 (Mobilizing)", element: "Se", description: "Gains energy from resolute action and appreciates people who push them to act" },
        { position: "7 (Ignoring)", element: "Fi", description: "May overlook personal values when championing causes; expresses feelings publicly rather than privately" },
        { position: "8 (Demonstrative)", element: "Ne", description: "Generates random ideas and possibilities but uses them sparingly" }
      ],
      interaction: {
        communication: "Emotional and theatrical; uses stories, expressive gestures and moral statements to rally others",
        work: "Focuses on meaning and significance rather than efficiency; may procrastinate until emotionally motivated",
        decision: "Guided by ideals and future vision; seeks partners who provide practical structure and discipline"
      },
      nuances: "EIEs may become melodramatic and impose their opinions when they feel challenged. They often assume present circumstances will continue, leading to poor time estimation and lateness."
    },
    "IEE": {
      summary: "IEEs are enthusiastic explorers who thrive on spontaneity and human connection. Dominant extroverted intuition draws them to new ideas and possibilities; they quickly start projects and often juggle several at once. Creative introverted feeling makes them sensitive to mood, regulating emotional intimacy and coaxing others with kindness. They avoid long-term commitments and rigid rules, preferring to keep options open and resist binding relationships. Structured thinking and sustained willpower are challenging; they rely on others for efficiency and may drop tasks that require persistence.",
      characteristics: {
        strengths: "Highly perceptive of personality and potential; able to match people and ideas; maintain positive atmosphere.",
        challenges: "Resist rules and long-term commitments; may abandon tasks requiring sustained effort; struggle to describe systems concisely and can be inconsistent in applying logic."
      },
      modelA: [
        { position: "1 (Base)", element: "Ne", description: "Seeks new ideas and compatible people, starting projects impulsively" },
        { position: "2 (Creative)", element: "Fi", description: "Reads moods and regulates emotional intimacy" },
        { position: "3 (Role)", element: "Se", description: "Can be direct when challenged but worries about negative connotations" },
        { position: "4 (Vulnerable)", element: "Ti", description: "Struggles to describe systems concisely and may rely on feelings over logic" },
        { position: "5 (Suggestive)", element: "Si", description: "Looks for comfort and relaxation, often ignoring bodily needs until reminded" },
        { position: "6 (Mobilizing)", element: "Te", description: "Gains motivation from practical efficiency and structured advice" },
        { position: "7 (Ignoring)", element: "Ni", description: "Ignores long-range predictions, preferring to act on immediate possibilities" },
        { position: "8 (Demonstrative)", element: "Fe", description: "Can be lively and engaging but prefers deeper one-on-one communication" }
      ],
      interaction: {
        communication: "Enthusiastic and exploratory; comments on personalities and possibilities; avoids negativity",
        work: "Starts many projects based on inspiration; loses interest when routine sets in; resists binding commitments",
        decision: "Guided by personal feelings and compatibility; seeks efficient advice but may disregard it if it conflicts with freedom"
      },
      nuances: "IEEs are aware of social expectations and may hide their affiliations to avoid judgment. They ignore bodily signals until they are sick, yet may emphasize appearance with close partners rather than publicly."
    },
    "LII": {
      summary: "LIIs are conceptual thinkers who use introverted logic to refine ideas into coherent systems and to assess statements based on internal consistency. Extroverted intuition allows them to explore possibilities, but they remain focused on a central principle and become impatient with open-ended brainstorming. They may over-conform to social conventions yet defend their personal viewpoints strongly; they avoid direct confrontation and may struggle with physical demands or immediate realities.",
      characteristics: {
        strengths: "Analytical, systematic thinking; ability to formulate conceptual models and reduce arguments to essential principles.",
        challenges: "Avoidance of direct confrontation and orders; impatience with open-ended idea generation; discomfort with physical or sensory demands."
      },
      modelA: [
        { position: "1 (Base)", element: "Ti", description: "Program function: formulates internal logical structures" },
        { position: "2 (Creative)", element: "Ne", description: "Generates possibilities and explores connections" },
        { position: "3 (Role)", element: "Fe", description: "Conforms to social conventions and ethical expectations" },
        { position: "4 (Vulnerable)", element: "Se", description: "Sensitive to direct confrontation and orders" },
        { position: "5 (Suggestive)", element: "Fi", description: "Looks for emotional warmth and personal values from others to balance their pragmatism" },
        { position: "6 (Mobilizing)", element: "Si", description: "Needs help maintaining comfort and physical well-being" },
        { position: "7 (Ignoring)", element: "Te", description: "Disregards efficiency in favour of internal coherence" },
        { position: "8 (Demonstrative)", element: "Ni", description: "Quietly understands patterns over time but keeps them to oneself" }
      ],
      interaction: {
        communication: "Not stated on wikisocion.github.io",
        work: "Prefers analytical planning and reducing tasks to logical rules",
        decision: "Leans on logical principles and clarity; dislikes being rushed or ordered"
      },
      nuances: "Not stated on wikisocion.github.io"
    },
    "SLI": {
      summary: "SLIs are practical aesthetes who prioritise comfort and efficiency. Their dominant introverted sensing makes them sensitive to physical sensations and able to create simple, pleasant environments. Creative extroverted thinking values accurate information and fairness; they evaluate tasks by the return on effort and avoid unnecessary work. They resist being hurried and prefer to work at their own pace, oversimplifying future plans and appreciating optimistic companions. Emotional displays make them uncomfortable, and they prefer not to discuss feelings directly.",
      characteristics: {
        strengths: "Creates comfort quickly; makes practical, fair decisions; encourages hands-on experience and values quality over quantity.",
        challenges: "Dislikes being hurried; oversimplifies the future; uneasy with emotional expressions; may hold grudges against those who disrupt harmony."
      },
      modelA: [
        { position: "1 (Base)", element: "Si", description: "Sensitive to physical sensations and seeks comfort" },
        { position: "2 (Creative)", element: "Te", description: "Evaluates efficiency and fairness; gathers accurate information" },
        { position: "3 (Role)", element: "Ni", description: "Tries to envision the future but tends to oversimplify and prefers optimism" },
        { position: "4 (Vulnerable)", element: "Fe", description: "Uncomfortable with emotional displays; doesn't like assumptions about their feelings" },
        { position: "5 (Suggestive)", element: "Ne", description: "Enjoys novel ideas and inspiration from others" },
        { position: "6 (Mobilizing)", element: "Fi", description: "Seeks personal connections but needs time to open up" },
        { position: "7 (Ignoring)", element: "Se", description: "May overlook assertiveness unless necessary to protect comfort" },
        { position: "8 (Demonstrative)", element: "Ti", description: "Can apply logical structures when needed but prefers practical efficiency" }
      ],
      interaction: {
        communication: "Down-to-earth and reserved; may be blunt about practical matters; avoids emotional discussions",
        work: "Prefers hands-on tasks and efficient methods; resists being rushed; simplifies plans and appreciates optimistic perspectives",
        decision: "Guided by physical comfort, efficiency and fairness; asks others for inspiration and emotional support"
      },
      nuances: "SLIs may appear lazy because they avoid unnecessary effort, but they are simply conserving energy for what matters. They can hold grudges against those who create emotional chaos and may silently withdraw when uncomfortable."
    }
  };
  
  const content = typeContent[code] || {
    summary: t.overview || "Socionics type description.",
    characteristics: {
      strengths: "Type-specific strengths",
      challenges: "Type-specific challenges"
    },
    modelA: [
      { position: "1 (Base)", element: t.leading, description: "Leading function" },
      { position: "2 (Creative)", element: t.creative, description: "Creative function" },
      { position: "3 (Role)", element: "—", description: "Role function" },
      { position: "4 (Vulnerable)", element: "—", description: "Vulnerable function" },
      { position: "5 (Suggestive)", element: "—", description: "Suggestive function" },
      { position: "6 (Mobilizing)", element: "—", description: "Mobilizing function" },
      { position: "7 (Ignoring)", element: "—", description: "Ignoring function" },
      { position: "8 (Demonstrative)", element: "—", description: "Demonstrative function" }
    ],
    interaction: {
      communication: "Type-specific communication style",
      work: "Type-specific work/learning style",
      decision: "Type-specific decision-making approach"
    },
    nuances: "Type-specific nuances and caveats"
  };
  
  // Find related types (duals, same quadra, etc.)
  const dualPair = Array.from(duals).find(pair => pair.includes(code));
  const dualCode = dualPair ? dualPair.split("-").find(c => c !== code) : null;
  const dualType = dualCode ? byCode[dualCode] : null;
  
  const sameQuadra = types.filter(type => type.quadra === t.quadra && type.code !== code);
  const sameTemperament = types.filter(type => type.temperament === t.temperament && type.code !== code);
  
  // Find types with same leading function
  const sameLeading = types.filter(type => type.leading === t.leading && type.code !== code);
  
  return (
    <section className="pt-10">
      <button
        onClick={onBack}
        className={cls("text-sm inline-flex items-center gap-1", darkMode ? "text-gray-400 hover:text-gray-300" : "text-neutral-600 hover:text-neutral-900")}
      >
        <HomeIcon className="h-4 w-4" /> Back to Types
      </button>
      <div className="mt-4 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <div className="card p-6">
            <div className="flex items-baseline justify-between gap-3">
              <h1 className={cls("text-4xl font-semibold tracking-tight", darkMode ? "text-white" : "text-black")}>
                <span className="font-mono mr-2">{t.code}</span>
                {t.fullName}
              </h1>
              <div className="flex items-center gap-2">
                <span className="chip">{t.alias}</span>
                <button
                  onClick={() => { navigator.clipboard?.writeText(window.location.href); }}
                  className="btn btn-secondary text-xs"
                >
                  Copy link
                </button>
              </div>
            </div>
            <p className={cls("mt-4 max-w-prose", darkMode ? "text-gray-300" : "text-neutral-900")}>
              {content.summary}
            </p>
            
            <div className="mt-8">
              <h2 className="text-2xl font-semibold dark:text-gray-200">Core Characteristics</h2>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <div className="card p-4">
                  <h3 className={cls("font-semibold", darkMode ? "text-white" : "text-black")}>Typical Strengths</h3>
                  <p className={cls("mt-2 text-sm", darkMode ? "text-gray-300" : "text-neutral-900")}>
                    {content.characteristics.strengths}
                  </p>
                </div>
                <div className="card p-4">
                  <h3 className={cls("font-semibold", darkMode ? "text-white" : "text-black")}>Common Challenges</h3>
                  <p className={cls("mt-2 text-sm", darkMode ? "text-gray-300" : "text-neutral-900")}>
                    {content.characteristics.challenges}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <h2 className="text-2xl font-semibold dark:text-gray-200">Interaction & Context</h2>
              <div className="mt-4 grid sm:grid-cols-3 gap-4">
                <div className="card p-4">
                  <h3 className={cls("font-semibold", darkMode ? "text-white" : "text-black")}>Communication</h3>
                  <p className={cls("mt-2 text-sm", darkMode ? "text-gray-300" : "text-neutral-900")}>
                    {content.interaction.communication}
                  </p>
                </div>
                <div className="card p-4">
                  <h3 className={cls("font-semibold", darkMode ? "text-white" : "text-black")}>Work/Learning</h3>
                  <p className={cls("mt-2 text-sm", darkMode ? "text-gray-300" : "text-neutral-900")}>
                    {content.interaction.work}
                  </p>
                </div>
                <div className="card p-4">
                  <h3 className={cls("font-semibold", darkMode ? "text-white" : "text-black")}>Decision-making</h3>
                  <p className={cls("mt-2 text-sm", darkMode ? "text-gray-300" : "text-neutral-900")}>
                    {content.interaction.decision}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <h2 className={cls("text-2xl font-semibold", darkMode ? "text-white" : "text-black")}>Model A (schematic)</h2>
              <ModelA leading={t.leading} creative={t.creative} modelA={content.modelA} darkMode={darkMode} />
            </div>
            
            <div className="mt-8">
              <h2 className={cls("text-2xl font-semibold", darkMode ? "text-white" : "text-black")}>On-site Nuances</h2>
              <p className={cls("mt-4 max-w-prose", darkMode ? "text-gray-300" : "text-neutral-900")}>
                {content.nuances}
              </p>
            </div>
          </div>
        </div>
        <aside className="lg:col-span-4">
          <div className="card p-4">
            <h3 className={cls("font-semibold", darkMode ? "text-white" : "text-black")}>Type Info</h3>
            <div className="mt-3 space-y-3">
              <div>
                <span className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Quadra</span>
                <div className={cls("text-lg", darkMode ? "text-white" : "text-black")}>{t.quadra}</div>
              </div>
              <div>
                <span className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Temperament</span>
                <div className={cls("text-lg", darkMode ? "text-white" : "text-black")}>{t.temperament}</div>
              </div>
              <div>
                <span className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Leading / Creative</span>
                <div className={cls("text-lg", darkMode ? "text-white" : "text-black")}>
                  {t.leading} / {t.creative}
                </div>
              </div>
            </div>
            <a
              href={t.href}
              target="_blank"
              rel="noopener"
              className={cls("mt-4 block w-full text-center py-2 text-sm rounded-md", darkMode ? "bg-gray-800 hover:bg-gray-700 text-gray-300" : "bg-neutral-100 hover:bg-neutral-200 text-black")}
            >
              Canonical page
            </a>
          </div>
          
          <div className="mt-4 card p-4">
            <h3 className={cls("font-semibold", darkMode ? "text-white" : "text-black")}>Intertype Relations</h3>
            <p className={cls("text-sm mt-1", darkMode ? "text-gray-400" : "text-neutral-900")}>
              Key relations for {t.code}
            </p>
            <DualityList types={types} duals={duals} self={t.code} darkMode={darkMode} />
            
            {/* Additional relations */}
            <div className="mt-4">
              <h4 className={cls("font-medium", darkMode ? "text-white" : "text-black")}>Same Quadra</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {sameQuadra.map(type => (
                  <button
                    key={type.code}
                    onClick={() => {
                      onBack();
                      setTimeout(() => window.location.hash = `#/type/${type.code}`, 100);
                    }}
                    className={cls("text-xs px-2 py-1 rounded", darkMode ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-neutral-100 hover:bg-neutral-200 text-black")}
                  >
                    {type.code}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className={cls("font-medium", darkMode ? "text-white" : "text-black")}>Same Temperament</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {sameTemperament.map(type => (
                  <button
                    key={type.code}
                    onClick={() => {
                      onBack();
                      setTimeout(() => window.location.hash = `#/type/${type.code}`, 100);
                    }}
                    className={cls("text-xs px-2 py-1 rounded", darkMode ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-neutral-100 hover:bg-neutral-200 text-black")}
                  >
                    {type.code}
                  </button>
                ))}
              </div>
            </div>
            
            <div className="mt-4">
              <h4 className={cls("font-medium", darkMode ? "text-white" : "text-black")}>Same Leading Function</h4>
              <div className="mt-2 flex flex-wrap gap-2">
                {sameLeading.map(type => (
                  <button
                    key={type.code}
                    onClick={() => {
                      onBack();
                      setTimeout(() => window.location.hash = `#/type/${type.code}`, 100);
                    }}
                    className={cls("text-xs px-2 py-1 rounded", darkMode ? "bg-gray-800 hover:bg-gray-700 text-white" : "bg-neutral-100 hover:bg-neutral-200 text-black")}
                  >
                    {type.code}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </section>
  );
}

function ModelA({ leading, creative, modelA, darkMode }) {
  const boxes = modelA || [
    { position: "1. Leading", element: leading, description: "Leading function" },
    { position: "2. Creative", element: creative, description: "Creative function" },
    { position: "3. Role", element: "—", description: "Role function" },
    { position: "4. Vulnerable", element: "—", description: "Vulnerable function" },
    { position: "5. Suggestive", element: "—", description: "Suggestive function" },
    { position: "6. Mobilizing", element: "—", description: "Mobilizing function" },
    { position: "7. Ignoring", element: "—", description: "Ignoring function" },
    { position: "8. Demonstrative", element: "—", description: "Demonstrative function" },
  ];
  
  return (
    <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
      {boxes.map((b, i) => (
        <div key={i} className="card p-3">
          <div className="flex justify-between">
            <div className={cls("text-xs", darkMode ? "text-gray-500" : "text-neutral-500")}>{b.position}</div>
            <div className={cls("font-mono", (i === 0 || i === 1) && "text-red-700 font-semibold", darkMode && (i === 0 || i === 1) && "text-red-500")}>
              {b.element}
            </div>
          </div>
          <div className={cls("mt-1 text-sm", darkMode ? "text-gray-300" : "text-neutral-700")}>
            {b.description}
          </div>
        </div>
      ))}
    </div>
  );
}

function DualityList({ types, duals, self, darkMode }) {
  const byCode = Object.fromEntries(types.map((t) => [t.code, t]));
  const pairs = [
    ["ILE", "SEI"],
    ["LII", "ESE"],
    ["SLE", "IEI"],
    ["LSI", "EIE"],
    ["SEE", "ILI"],
    ["ESI", "LIE"],
    ["LSE", "EII"],
    ["SLI", "IEE"],
  ];
  const partner = pairs.find(([a, b]) => a === self || b === self);
  if (!partner) return null;
  const other = partner[0] === self ? partner[1] : partner[0];
  const t = byCode[other];
  return (
    <div className="mt-2 text-sm">
      <div className="flex items-center justify-between card p-3">
        <div>
          <div className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Dual type</div>
          <div className={cls("text-lg font-mono", darkMode ? "text-white" : "text-black")}>{t.code}</div>
          <div className={cls("", darkMode ? "text-gray-300" : "text-neutral-700")}>
            {t.fullName} ({t.alias})
          </div>
        </div>
        <a href={t.href} target="_blank" rel="noopener" className={cls("text-sm", darkMode ? "text-red-500 hover:text-red-400" : "text-red-600 hover:text-red-800")}>
          Open <ExternalLink className="inline h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function Relations({ types, duals, relations, onNav, darkMode }) {
  const [a, setA] = useState("ILE");
  const [b, setB] = useState("SEI");

  // Get relation data
  const pairKey = [a, b].sort().join("-");
  const isDual = duals.has(pairKey);
  const relation = relations.find(r => r.name === "Duality" && [r.a, r.b].sort().join("-") === pairKey);

  // Calculate additional relation types
  const byCode = Object.fromEntries(types.map((t) => [t.code, t]));
  const typeA = byCode[a];
  const typeB = byCode[b];
  
  // Determine relation types
  const isIdentity = a === b;
  const isDualSame = isDual;
  
  // Same quadra relation
  const isSameQuadra = typeA.quadra === typeB.quadra;
  
  // Temperament relations
  const isSameTemperament = typeA.temperament === typeB.temperament;
  
  // Function relations
  const isSameLeading = typeA.leading === typeB.leading;
  const isSameCreative = typeA.creative === typeB.creative;
  
  // Activator relation (leading/creative reversed)
  const isActivator = typeA.leading === typeB.creative && typeA.creative === typeB.leading;
  
  // Mirror relation (same leading/creative but different type)
  const isMirror = isSameLeading && isSameCreative && !isIdentity;
  
  // Semi-dual relation (leading of one is creative of other)
  const isSemiDual = (typeA.leading === typeB.creative && !isActivator) || 
                    (typeB.leading === typeA.creative && !isActivator);
  
  // Extinguishment relation (conflict with functions)
  const isExtinguishment = (typeA.leading === typeB.leading && !isIdentity) ||
                          (typeA.creative === typeB.creative && !isMirror);
  
  // Business relation (quadra neighbors)
  const quadraOrder = ["Alpha", "Beta", "Gamma", "Delta"];
  const aQuadraIndex = quadraOrder.indexOf(typeA.quadra);
  const bQuadraIndex = quadraOrder.indexOf(typeB.quadra);
  const quadraDiff = Math.abs(aQuadraIndex - bQuadraIndex);
  const isBusiness = (quadraDiff === 1 || quadraDiff === 3) && 
                    !isDual && !isSemiDual && !isExtinguishment;
  
  // Super-ego relation (remaining types)
  const isSuperEgo = !isIdentity && !isDualSame && !isSameQuadra && !isActivator && 
                    !isMirror && !isSemiDual && !isExtinguishment && !isBusiness;
  
  // Conflict relation (quadra opposites)
  const isConflict = (quadraDiff === 2) && !isSameQuadra && !isDualSame;

  return (
    <section className="pt-10">
      <h1 className={cls("text-3xl font-semibold tracking-tight", darkMode ? "text-white" : "text-black")}>Relations</h1>
      <p className={cls("mt-2", darkMode ? "text-gray-400" : "text-neutral-700")}>
        Explore the relationships between socionics types. Select two types to see their connection.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select types={types} label="Type A" value={a} setValue={setA} darkMode={darkMode} />
        <Select types={types} label="Type B" value={b} setValue={setB} darkMode={darkMode} />
      </div>

      {/* Hero summary */}
      <div className="mt-6 card p-6">
        <div className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Relation</div>
        <div className={cls("mt-1 text-2xl font-semibold", darkMode ? "text-white" : "text-black")}>
          {a} ↔ {b}
        </div>
        <div className="mt-2 flex flex-wrap gap-2 items-center">
          <span className="chip" style={{borderColor: relInfo.color, color: relInfo.color}}>{relInfo.key}</span>
          <RelationChips a={typeA} b={typeB} darkMode={darkMode} />
        </div>
      </div>

      {/* Visuals */}
      <div className="mt-6 grid lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 card p-4">
          <h2 className={cls("text-lg font-semibold", darkMode ? "text-white" : "text-black")}>Radial Map</h2>
          <RadialRelations
            types={types}
            activeA={a}
            activeB={b}
            onSelectB={setB}
            darkMode={darkMode}
            duals={duals}
          />
        </div>
        <div className="lg:col-span-4 card p-4">
          <h2 className={cls("text-lg font-semibold", darkMode ? "text-white" : "text-black")}>Function Rings</h2>
          <FunctionRings a={typeA} b={typeB} darkMode={darkMode} />
        </div>
      </div>
    </section>
  );
}

// --- Visual helpers ---
const IE_COLORS = {
  Ne: '#0891b2', Ni: '#7c3aed',
  Se: '#ea580c', Si: '#16a34a',
  Te: '#0ea5e9', Ti: '#1e293b',
  Fe: '#ef4444', Fi: '#f59e0b',
};

const RELATION_COLORS = {
  Identity: '#475569',
  Duality: '#16a34a',
  Activation: '#06b6d4',
  Mirror: '#6366f1',
  'Semi-duality': '#14b8a6',
  Extinguishment: '#94a3b8',
  Conflict: '#ef4444',
  Business: '#f97316',
  'Super-ego': '#eab308',
  Other: '#64748b',
};

function classifyRelation(aType, bType, duals) {
  if (!aType || !bType) return { key: 'Other', color: RELATION_COLORS.Other };
  const key = [aType.code, bType.code].sort().join('-');
  const isIdentity = aType.code === bType.code;
  const isDual = !!duals && typeof duals.has === 'function' ? duals.has(key) : false;
  const sameQuadra = aType.quadra === bType.quadra;
  const sameTemp = aType.temperament === bType.temperament;
  const sameLead = aType.leading === bType.leading;
  const sameCreative = aType.creative === bType.creative;
  const activator = aType.leading === bType.creative && aType.creative === bType.leading;
  const mirror = sameLead && sameCreative && !isIdentity;
  const semiDual = (aType.leading === bType.creative && !activator) || (bType.leading === aType.creative && !activator);
  const quadraOrder = ['Alpha','Beta','Gamma','Delta'];
  const qd = Math.abs(quadraOrder.indexOf(aType.quadra) - quadraOrder.indexOf(bType.quadra));
  const business = (qd === 1 || qd === 3) && !isDual && !semiDual;
  const conflict = (qd === 2) && !sameQuadra && !isDual;
  const extinguishment = (sameLead && !isIdentity) || (sameCreative && !mirror);
  const superEgo = !isIdentity && !isDual && !sameQuadra && !activator && !mirror && !semiDual && !extinguishment && !business;
  const label = isIdentity ? 'Identity' :
    isDual ? 'Duality' :
    activator ? 'Activation' :
    mirror ? 'Mirror' :
    semiDual ? 'Semi-duality' :
    extinguishment ? 'Extinguishment' :
    conflict ? 'Conflict' :
    business ? 'Business' :
    superEgo ? 'Super-ego' : 'Other';
  return { key: label, color: RELATION_COLORS[label] || RELATION_COLORS.Other };
}

function RelationChips({ a, b, darkMode }) {
  const sameQuadra = a.quadra === b.quadra;
  const sameTemp = a.temperament === b.temperament;
  const sameLead = a.leading === b.leading;
  const sameCreative = a.creative === b.creative;
  return (
    <div className="mt-3 flex flex-wrap gap-2 text-xs">
      {sameQuadra && <span className="chip">Same quadra: {a.quadra}</span>}
      {sameTemp && <span className="chip">Same temperament: {a.temperament}</span>}
      {sameLead && <span className="chip">Leading: {a.leading}</span>}
      {sameCreative && <span className="chip">Creative: {a.creative}</span>}
      {!sameQuadra && <span className="chip">Quadra: {a.quadra} vs {b.quadra}</span>}
      {!sameTemp && <span className="chip">Temperament: {a.temperament} vs {b.temperament}</span>}
    </div>
  );
}

function RadialRelations({ types, activeA, activeB, onSelectB, darkMode, duals }) {
  if (!types || !types.length) return null;
  const size = 420;
  const cx = size/2, cy = size/2;
  const R = 160; // node radius from center
  const aIndexRaw = types.findIndex(t => t.code === activeA);
  const aIndex = aIndexRaw < 0 ? 0 : aIndexRaw;
  const ordered = [...types.slice(aIndex), ...types.slice(0, aIndex)];
  // layout: activeA at top (-90deg), others clockwise
  const nodes = ordered.map((t, i) => {
    const angle = -Math.PI/2 + (2*Math.PI * i)/types.length;
    const x = cx + R * Math.cos(angle);
    const y = cy + R * Math.sin(angle);
    return { t, i, angle, x, y };
  });
  const aNode = nodes[0];
  const bNode = nodes.find(n => n.t.code === activeB) || nodes[0];

  const pathFor = (x1,y1,x2,y2) => {
    const dx = (x2 - x1) * 0.25;
    const dy = (y2 - y1) * 0.25;
    const c1x = x1 + dx, c1y = y1 + dy;
    const c2x = x2 - dx, c2y = y2 - dy;
    return `M ${x1},${y1} C ${c1x},${c1y} ${c2x},${c2y} ${x2},${y2}`;
  };

  return (
    <div className="w-full overflow-x-auto">
      <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Radial relations map">
        <defs>
          <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur in="SourceGraphic" stdDeviation="1.5" result="blur" />
            <feMerge>
              <feMergeNode in="blur" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
        </defs>
        {/* center label */}
        <text x={cx} y={cy-6} textAnchor="middle" className={darkMode? 'fill-white' : 'fill-black'} style={{fontSize: 14, fontWeight: 600}}>{aNode.t.code}</text>
        <text x={cx} y={cy+12} textAnchor="middle" className={darkMode? 'fill-gray-400' : 'fill-neutral-600'} style={{fontSize: 11}}>{aNode.t.fullName}</text>

        {/* ribbons from A to others */}
        {nodes.slice(1).map((n, idx) => {
          const rel = classifyRelation(aNode.t, n.t, duals);
          const color = n.t.code === activeB ? '#ef4444' : (rel.color || '#94a3b8');
          const d = pathFor(aNode.x, aNode.y, n.x, n.y);
          const emphasis = n.t.code === activeB ? 2.5 : 1.25;
          return (
            <path key={n.t.code} d={d} stroke={color} strokeWidth={emphasis} fill="none" opacity={n.t.code === activeB ? 0.95 : 0.5} filter="url(#softGlow)" />
          );
        })}

        {/* nodes */}
        {nodes.map((n) => {
          const isA = n.t.code === activeA;
          const isB = n.t.code === activeB;
          const r = isA ? 8 : 6;
          const fill = isA ? '#ef4444' : (isB ? '#0ea5e9' : (darkMode ? '#334155' : '#e5e7eb'));
          const stroke = darkMode ? '#64748b' : '#94a3b8';
          return (
            <g key={n.t.code} onClick={() => !isA && onSelectB(n.t.code)} style={{cursor: isA ? 'default' : 'pointer'}}>
              <circle cx={n.x} cy={n.y} r={r} fill={fill} stroke={stroke} />
              {/* labels */}
              {!isA && (
                <text x={n.x + (Math.cos(n.angle)*12)} y={n.y + (Math.sin(n.angle)*12)} className={darkMode? 'fill-gray-300' : 'fill-neutral-700'} style={{fontSize: 11}} textAnchor={Math.cos(n.angle)>0? 'start':'end'} dy={3}>
                  {n.t.code}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className={cls('mt-2 text-xs', darkMode? 'text-gray-400':'text-neutral-600')}>Tip: click a node to set Type B.</div>
    </div>
  );
}

function FunctionRings({ a, b, darkMode }) {
  if (!a || !b) return null;
  const size = 240, cx = size/2, cy = size/2;
  const innerR = 56, outerR = 84; // ring radii
  const full = 2*Math.PI;
  // We only render Leading (pos1) and Creative (pos2) slices for both
  const slices = [
    { label: 'Leading', pos: 0, a: a.leading, b: b.leading },
    { label: 'Creative', pos: 1, a: a.creative, b: b.creative },
  ];
  const arc = (r, start, end) => {
    const sx = cx + r*Math.cos(start), sy = cy + r*Math.sin(start);
    const ex = cx + r*Math.cos(end), ey = cy + r*Math.sin(end);
    const large = end - start > Math.PI ? 1 : 0;
    return `M ${sx} ${sy} A ${r} ${r} 0 ${large} 1 ${ex} ${ey}`;
  };
  const band = (r1, r2, start, end) => {
    // outer arc -> inner arc back
    const o = arc(r2, start, end);
    const irev = arc(r1, end, start);
    return `${o} ${irev} Z`;
  };
  const segAngle = full/8;
  return (
    <svg width="100%" height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Function rings">
      {/* base rings */}
      <circle cx={cx} cy={cy} r={outerR+10} fill="none" stroke={darkMode? '#1f2937' : '#e5e7eb'} />
      <circle cx={cx} cy={cy} r={innerR-10} fill="none" stroke={darkMode? '#1f2937' : '#e5e7eb'} />
      {slices.map((s, i) => {
        const start = -Math.PI/2 + s.pos*segAngle;
        const end = start + segAngle;
        const aColor = IE_COLORS[s.a] || '#64748b';
        const bColor = IE_COLORS[s.b] || '#94a3b8';
        const match = s.a === s.b;
        return (
          <g key={s.label}>
            <path d={band(innerR, innerR+20, start, end)} fill={aColor} opacity={0.9} />
            <path d={band(outerR, outerR+20, start, end)} fill={bColor} opacity={0.7} />
            {match && (
              <path d={arc(outerR+22, start, end)} stroke={darkMode? '#fca5a5':'#ef4444'} strokeWidth="2" fill="none" />
            )}
            {/* labels */}
            <text x={cx} y={cy - (innerR+outerR)/2} textAnchor="middle" className={darkMode? 'fill-gray-300' : 'fill-neutral-700'} style={{fontSize: 11}}>
              {s.label}
            </text>
          </g>
        );
      })}
      {/* legends */}
      <g>
        <rect x={16} y={size-42} width={10} height={10} fill="#334155" />
        <text x={30} y={size-34} className={darkMode? 'fill-gray-300':'fill-neutral-700'} style={{fontSize: 11}}>A: {a.code}</text>
        <rect x={96} y={size-42} width={10} height={10} fill="#9ca3af" />
        <text x={110} y={size-34} className={darkMode? 'fill-gray-300':'fill-neutral-700'} style={{fontSize: 11}}>B: {b.code}</text>
      </g>
    </svg>
  );
}
function Select({ types, label, value, setValue, darkMode }) {
  return (
    <label className="text-sm">
      <div className={cls("mb-1", darkMode ? "text-gray-400" : "text-neutral-600")}>{label}</div>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className={cls("w-full border px-2 py-2", darkMode ? "border-gray-700 bg-gray-800 text-white" : "border-neutral-300 text-black")}
      >
        {types.map((t) => (
          <option key={t.code} value={t.code} className={darkMode ? "bg-gray-800" : ""}>
            {t.code} — {t.fullName} ({t.alias})
          </option>
        ))}
      </select>
    </label>
  );
}

function Theory({ onNav, darkMode }) {
  return (
    <section className="pt-10">
      <h1 className={cls("text-3xl font-semibold tracking-tight", darkMode ? "text-white" : "text-black")}>Theory</h1>
      <div className="mt-6 grid md:grid-cols-3 gap-3">
        <TheoryCard title="Model A" summary="Eight function positions; leading and creative guide the stack." darkMode={darkMode} />
        <TheoryCard title="Information Elements" summary="Ne, Ni, Se, Si, Te, Ti, Fe, Fi as channels of information." onCTAClick={() => onNav("functions")} ctaLabel="Explore Functions" darkMode={darkMode} />
        <TheoryCard title="Quadras" summary="Four cultures of values: Alpha, Beta, Gamma, Delta." darkMode={darkMode} />
      </div>
      <p className={cls("mt-6 text-sm", darkMode ? "text-gray-400" : "text-neutral-700")}>
        These articles are concise primers with diagrams. For depth, use the Library to reach canonical materials.
      </p>
    </section>
  );
}

function FunctionExplorer({ glossary, types, darkMode }) {
  const [selectedFunction, setSelectedFunction] = useState("Ne");
  
  // Group types by their leading function
  const typesByLeadingFunction = types.reduce((acc, type) => {
    if (!acc[type.leading]) {
      acc[type.leading] = [];
    }
    acc[type.leading].push(type);
    return acc;
  }, {});
  
  // Group types by their creative function
  const typesByCreativeFunction = types.reduce((acc, type) => {
    if (!acc[type.creative]) {
      acc[type.creative] = [];
    }
    acc[type.creative].push(type);
    return acc;
  }, {});
  
  const functionDetails = glossary.find(g => g.term === selectedFunction);
  
  return (
    <section className="pt-10">
      <h1 className={cls("text-3xl font-semibold tracking-tight", darkMode ? "text-white" : "text-black")}>Function Explorer</h1>
      <p className={cls("mt-2", darkMode ? "text-gray-400" : "text-neutral-700")}>
        Explore the eight information elements and see which types value them most.
      </p>
      
      <div className="mt-6">
        <div className="flex flex-wrap gap-2">
          {glossary.map(func => (
            <button
              key={func.term}
              onClick={() => setSelectedFunction(func.term)}
              className={cls(
                "px-3 py-1 text-sm rounded",
                selectedFunction === func.term 
                  ? "bg-red-600 text-white" 
                  : darkMode 
                    ? "bg-gray-800 text-white hover:bg-gray-700" 
                    : "bg-neutral-100 text-black hover:bg-neutral-200"
              )}
            >
              {func.term}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mt-6 card p-6">
        <h2 className={cls("text-2xl font-semibold", darkMode ? "text-white" : "text-black")}>
          {selectedFunction}: {functionDetails?.shortDef.split(" - ")[1] || ""}
        </h2>
        <p className={cls("mt-2", darkMode ? "text-gray-400" : "text-neutral-700")}>
          {functionDetails?.shortDef}
        </p>
        
        <div className="mt-6 grid md:grid-cols-2 gap-6">
          <div>
            <h3 className={cls("text-lg font-semibold", darkMode ? "text-white" : "text-black")}>Types with {selectedFunction} as Leading Function</h3>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(typesByLeadingFunction[selectedFunction] || []).map(type => (
                <a
                  key={type.code}
                  href={`#/type/${type.code}`}
                  className={cls("card p-3 text-center")}
                >
                  <div className={cls("font-mono text-lg", darkMode ? "text-white" : "text-black")}>{type.code}</div>
                  <div className={cls("text-xs mt-1", darkMode ? "text-gray-400" : "text-neutral-700")}>{type.alias}</div>
                </a>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className={cls("text-lg font-semibold", darkMode ? "text-white" : "text-black")}>Types with {selectedFunction} as Creative Function</h3>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-3">
              {(typesByCreativeFunction[selectedFunction] || []).map(type => (
                <a
                  key={type.code}
                  href={`#/type/${type.code}`}
                  className={cls("card p-3 text-center")}
                >
                  <div className={cls("font-mono text-lg", darkMode ? "text-white" : "text-black")}>{type.code}</div>
                  <div className={cls("text-xs mt-1", darkMode ? "text-gray-400" : "text-neutral-700")}>{type.alias}</div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TheoryCard({ title, summary, onCTAClick, ctaLabel, darkMode }) {
  return (
    <div className={cls("card p-4 flex flex-col h-full") }>
      <div className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Primer</div>
      <div className={cls("text-xl font-semibold", darkMode ? "text-white" : "text-black")}>{title}</div>
      <p className={cls("mt-1 flex-grow text-sm", darkMode ? "text-gray-400" : "text-neutral-700")}>{summary}</p>
      {onCTAClick && (
        <button 
          onClick={onCTAClick}
          className={cls("mt-3 text-sm", darkMode ? "text-red-500 hover:text-red-400" : "text-red-600 hover:text-red-800")}
        >
          {ctaLabel || "Learn more"}
        </button>
      )}
    </div>
  );
}

function Glossary({ glossary, focus, darkMode }) {
  const containerRef = useRef(null);
  useEffect(() => {
    if (!focus) return;
    const el = document.getElementById(`gloss-${focus}`);
    if (el && el.scrollIntoView) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [focus]);
  return (
    <section ref={containerRef} className="pt-10 max-w-3xl">
      <h1 className={cls("text-3xl font-semibold tracking-tight", darkMode ? "text-white" : "text-black")}>Glossary</h1>
      <p className={cls("mt-2", darkMode ? "text-gray-400" : "text-neutral-700")}>
        Short, first-pass definitions. Click a term to expand in place in a future version.
      </p>
      <div className="mt-6 grid sm:grid-cols-2 gap-3">
        {glossary.map((g) => (
          <div key={g.term} id={`gloss-${g.term}`} className="card p-3">
            <div className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Term</div>
            <div className={cls("text-lg font-mono", darkMode ? "text-white" : "text-black")}>{g.term}</div>
            <div className={cls("mt-1 text-sm", darkMode ? "text-gray-400" : "text-neutral-700")}>{g.shortDef}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Library({ darkMode }) {
  return (
    <section className="pt-10">
      <h1 className={cls("text-3xl font-semibold tracking-tight", darkMode ? "text-white" : "text-black")}>Library</h1>
      <p className={cls("mt-2", darkMode ? "text-gray-400" : "text-neutral-700")}>Curated entry points. Each item explains why it matters.</p>
      <div className="mt-6 grid md:grid-cols-3 gap-3">
        <a
          className={cls("card p-4")}
          href="https://wikisocion.github.io/"
          target="_blank"
          rel="noopener"
        >
          <div className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>External</div>
          <div className={cls("text-lg font-semibold inline-flex items-center gap-2", darkMode ? "text-white" : "text-black")}>
            Wikisocion archive <ExternalLink className="h-4 w-4" />
          </div>
          <p className={cls("mt-1 text-sm", darkMode ? "text-gray-400" : "text-neutral-700")}>
            The canonical collection - deep dives, history, alternative models.
          </p>
        </a>
        <a
          className={cls("card p-4")}
          href="https://wikisocion.github.io/content/Model_A.html"
          target="_blank"
          rel="noopener"
        >
          <div className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Primer</div>
          <div className={cls("text-lg font-semibold inline-flex items-center gap-2", darkMode ? "text-white" : "text-black")}>
            Model A <ExternalLink className="h-4 w-4" />
          </div>
          <p className={cls("mt-1 text-sm", darkMode ? "text-gray-400" : "text-neutral-700")}>
            Structure of function positions; basis for many relation mappings.
          </p>
        </a>
        <a
          className={cls("card p-4")}
          href="https://wikisocion.github.io/content/Intertype_relations.html"
          target="_blank"
          rel="noopener"
        >
          <div className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Reference</div>
          <div className={cls("text-lg font-semibold inline-flex items-center gap-2", darkMode ? "text-white" : "text-black")}>
            Intertype relations <ExternalLink className="h-4 w-4" />
          </div>
          <p className={cls("mt-1 text-sm", darkMode ? "text-gray-400" : "text-neutral-700")}>
            Overview of relation names and general descriptions.
          </p>
        </a>
      </div>
    </section>
  );
}

function About({ darkMode }) {
  return (
    <section className="pt-10 max-w-3xl">
      <h1 className={cls("text-3xl font-semibold tracking-tight", darkMode ? "text-white" : "text-black")}>About</h1>
      <p className={cls("mt-2", darkMode ? "text-gray-400" : "text-neutral-900")}>
        This is a community MVP that reorganizes Wikisocion content for clarity and mobile use while linking back to canonical pages. It follows accessibility best practices (keyboard navigation, high contrast, reduced motion respect) and a Swiss typographic aesthetic.
      </p>
      <ul className={cls("mt-4 list-disc pl-6 text-sm", darkMode ? "text-gray-400" : "text-neutral-900")}>
        <li>Open source, non-commercial.</li>
        <li>Typography: Inter/Helvetica-like sans; minimal color with a single red accent.</li>
        <li>Privacy-friendly analytics suggested: simple counts for search success, time-to-type page, relation lookups.</li>
      </ul>
    </section>
  );
}

function StartHere({ onNav, darkMode, types, glossary }) {
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const progress = (step / totalSteps) * 100;
  
  const next = () => setStep((s) => Math.min(totalSteps, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  // Step content with enhanced descriptions
  const steps = [
    { title: "Basics in 60 seconds", description: "Model A: Leading + Creative. 8 positions total.", details: "Strongest functions shape what you notice and how you solve problems." },
    { title: "Skim types", description: "Scan the 16 cards. Open the 2–3 that feel familiar.", details: "Look for default patterns, not interests or skills." },
    { title: "Compare & sense‑check", description: "Put close candidates side‑by‑side.", details: "Compatibility is about values fit, not destiny. Context matters." }
  ];

  // Guided explore filters
  const [guided, setGuided] = useState({ quadra: "Any", temperament: "Any", leading: "Any" });
  const guidedResults = useMemo(() => {
    if (!types) return [];
    return types.filter(t =>
      (guided.quadra === 'Any' || t.quadra === guided.quadra) &&
      (guided.temperament === 'Any' || t.temperament === guided.temperament) &&
      (guided.leading === 'Any' || t.leading === guided.leading)
    ).slice(0, 8);
  }, [guided, types]);

  // Cheat sheet for IEs
  const IE_ORDER = ["Ne","Ni","Se","Si","Te","Ti","Fe","Fi"];
  const cheat = useMemo(() => {
    if (!glossary) return [];
    const by = Object.fromEntries(glossary.map(g => [g.term, g.shortDef]));
    return IE_ORDER.map(k => ({ term: k, shortDef: by[k] }));
  }, [glossary]);

  return (
    <section className="pt-10 max-w-3xl">
      <h1 className={cls("text-3xl font-semibold tracking-tight", darkMode ? "text-white" : "text-black")}>Start here</h1>
      <p className={cls("mt-2", darkMode ? "text-gray-400" : "text-neutral-900")}>
        Three small steps. Learn just enough, then explore without getting overwhelmed.
      </p>

      {/* Quick actions (bite-sized) */}
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={() => onNav('theory')} className={cls("card p-3 text-left")}>
          <div className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>1. Learn</div>
          <div className={cls("mt-1 flex items-center gap-2 font-semibold", darkMode ? "text-white" : "text-black")}><BookOpen className="h-4 w-4"/> Basics (1 min)</div>
        </button>
        <button onClick={() => onNav('types')} className={cls("card p-3 text-left")}>
          <div className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>2. Explore</div>
          <div className={cls("mt-1 flex items-center gap-2 font-semibold", darkMode ? "text-white" : "text-black")}><TypeIcon className="h-4 w-4"/> Browse types</div>
        </button>
        <button onClick={() => onNav('compare')} className={cls("card p-3 text-left")}>
          <div className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>3. Decide</div>
          <div className={cls("mt-1 flex items-center gap-2 font-semibold", darkMode ? "text-white" : "text-black")}><Rows className="h-4 w-4"/> Compare two</div>
        </button>
      </div>

      {/* Progress bar */}
      <div className="mt-6 w-full bg-gray-200 rounded-full h-1.5 dark:bg-gray-700">
        <div 
          className="bg-red-600 h-1.5 rounded-full transition-all duration-500 ease-in-out" 
          style={{ width: `${progress}%` }}
        ></div>
      </div>
      <div className={cls("text-right text-xs mt-1", darkMode ? "text-gray-400" : "text-gray-500")}> 
        Step {step} of {totalSteps}
      </div>

      <ol className="mt-6 space-y-4">
        {steps.map((s, index) => (
          <li 
            key={index}
            className={cls(
              "border p-4 rounded transition-all duration-300",
              step === index + 1 
                ? darkMode 
                  ? "border-red-500 shadow-sm" 
                  : "border-red-600 shadow-sm"
                : darkMode 
                  ? "border-gray-700 opacity-80" 
                  : "border-neutral-300 opacity-80"
            )}
          >
            <div className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Step {index + 1}</div>
            <div className={cls("text-lg font-semibold", darkMode ? "text-white" : "text-black")}>{s.title}</div>
            <p className={cls("mt-1 text-sm", darkMode ? "text-gray-400" : "text-neutral-900")}> 
              {s.description}
            </p>
            {step === index + 1 && (
              <p className={cls("mt-2 text-sm italic", darkMode ? "text-gray-500" : "text-neutral-900")}> 
                {s.details}
              </p>
            )}
          </li>
        ))}
      </ol>

      <div className="mt-6 flex items-center gap-3">
        <button 
          onClick={prev} 
          className={cls("px-3 py-1 text-sm rounded transition-colors", darkMode ? "border-gray-700 text-white hover:bg-gray-800" : "border-neutral-300 text-black hover:bg-neutral-200")}
          disabled={step === 1}
        >
          Back
        </button>
        <button 
          onClick={next} 
          className={cls("px-3 py-1 text-white text-sm rounded transition-colors", darkMode ? "bg-red-700 hover:bg-red-800" : "bg-red-600 hover:bg-red-700")}
          disabled={step === totalSteps}
        >
          Next
        </button>
        {step === totalSteps && (
          <button 
            onClick={() => onNav("types")} 
            className={cls("ml-auto px-3 py-1 text-white text-sm rounded transition-all duration-300 transform hover:scale-105 flex items-center gap-1", darkMode ? "bg-red-700 hover:bg-red-800" : "bg-red-600 hover:bg-red-700")}
          >
            Explore Types <ArrowRight className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Advanced (collapsed by default) */}
      <details className="mt-10">
        <summary className={cls("cursor-pointer select-none text-sm", darkMode ? "text-gray-300 hover:text-white" : "text-neutral-700 hover:text-black")}>Advanced: filters and cheat sheet (optional)</summary>
        <div className="mt-4 text-sm">Choose any that apply to narrow results.</div>
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <label className="text-sm">
            <div className={cls("mb-1", darkMode ? "text-gray-400" : "text-neutral-600")}>Quadra</div>
            <select value={guided.quadra} onChange={(e)=>setGuided(g=>({ ...g, quadra: e.target.value }))} className={cls("w-full border px-2 py-2", darkMode ? "border-gray-700 bg-gray-800 text-white" : "border-neutral-300 text-black")}>
              {["Any","Alpha","Beta","Gamma","Delta"].map(x => <option key={x} className={darkMode ? 'bg-gray-800':''}>{x}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <div className={cls("mb-1", darkMode ? "text-gray-400" : "text-neutral-600")}>Temperament</div>
            <select value={guided.temperament} onChange={(e)=>setGuided(g=>({ ...g, temperament: e.target.value }))} className={cls("w-full border px-2 py-2", darkMode ? "border-gray-700 bg-gray-800 text-white" : "border-neutral-300 text-black")}> 
              {["Any","EP","EJ","IP","IJ"].map(x => <option key={x} className={darkMode ? 'bg-gray-800':''}>{x}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <div className={cls("mb-1", darkMode ? "text-gray-400" : "text-neutral-600")}>Leading function</div>
            <select value={guided.leading} onChange={(e)=>setGuided(g=>({ ...g, leading: e.target.value }))} className={cls("w-full border px-2 py-2", darkMode ? "border-gray-700 bg-gray-800 text-white" : "border-neutral-300 text-black")}> 
              {["Any","Ne","Ni","Se","Si","Te","Ti","Fe","Fi"].map(x => <option key={x} className={darkMode ? 'bg-gray-800':''}>{x}</option>)}
            </select>
          </label>
        </div>
        {!!guidedResults.length && (
          <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {guidedResults.map(t => (
              <button key={t.code} onClick={()=>onNav('type',{ code: t.code })} className={cls("card p-3 text-left") }>
                <div className="flex items-baseline justify-between">
                  <div className="font-mono text-xl">{t.code}</div>
                  <span className="chip">{t.alias}</span>
                </div>
                <div className={cls("mt-1 text-sm", darkMode ? "text-gray-300" : "text-neutral-900")}>{t.fullName}</div>
                <div className={cls("mt-2 text-xs", darkMode ? "text-gray-500" : "text-neutral-600")}>{t.quadra} · {t.temperament} · {t.leading}/{t.creative}</div>
              </button>
            ))}
          </div>
        )}
        {/* Cheat sheet */}
        <div className="mt-8">
          <h3 className={cls("text-lg font-semibold", darkMode ? "text-white" : "text-black")}>Info elements at a glance</h3>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
            {cheat.map(c => (
              <div key={c.term} className={cls("card p-3") }>
                <div className={cls("font-mono", darkMode ? "text-white" : "text-black")}>{c.term}</div>
                <div className={cls("mt-1 text-xs", darkMode ? "text-gray-400" : "text-neutral-900")}>{c.shortDef}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8">
          <h3 className={cls("text-lg font-semibold", darkMode ? "text-white" : "text-black")}>Tips</h3>
          <ul className={cls("mt-2 list-disc pl-6 text-sm", darkMode ? "text-gray-400" : "text-neutral-900")}> 
            <li>Use compare to disambiguate close candidates (e.g., LII vs ILI).</li>
            <li>Prefer patterns over traits; avoid mistyping from hobbies or jobs.</li>
            <li>Relations describe fit of values, not destiny. Context matters.</li>
          </ul>
        </div>
      </details>
    </section>
  );
}

function TypeCompare({ types, duals, darkMode, initialA, initialB, onNav }) {
  const [typeA, setTypeA] = useState(initialA || "ILE");
  const [typeB, setTypeB] = useState(initialB || "SEI");

  useEffect(() => {
    if (initialA) setTypeA(initialA);
  }, [initialA]);
  useEffect(() => {
    if (initialB) setTypeB(initialB);
  }, [initialB]);

  useEffect(() => {
    if (onNav) onNav('compare', { a: typeA, b: typeB });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typeA, typeB]);
  
  const byCode = Object.fromEntries(types.map((t) => [t.code, t]));
  const a = byCode[typeA];
  const b = byCode[typeB];
  
  // Check if they are duals
  const pairKey = [typeA, typeB].sort().join("-");
  const isDual = duals.has(pairKey);
  
  // Find shared traits
  const sharedQuadra = a.quadra === b.quadra;
  const sharedTemperament = a.temperament === b.temperament;
  const sharedLeading = a.leading === b.leading;
  const sharedCreative = a.creative === b.creative;
  
  // Function comparison
  const functionComparison = [
    { name: "Leading Function", a: a.leading, b: b.leading, same: a.leading === b.leading },
    { name: "Creative Function", a: a.creative, b: b.creative, same: a.creative === b.creative },
  ];
  
  const copyLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : '';
    try {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard');
    } catch {
      // Fallback
    }
  };

  return (
    <section className="pt-10">
      <div className="flex items-center justify-between gap-3">
        <h1 className={cls("text-3xl font-semibold tracking-tight", darkMode ? "text-white" : "text-black")}>Type Comparison</h1>
        <button onClick={copyLink} className={cls("text-sm px-3 py-1 border rounded", darkMode ? "border-gray-700 text-gray-300 hover:bg-gray-800" : "border-neutral-300 text-black hover:bg-neutral-100")}>Copy link</button>
      </div>
      <p className={cls("mt-2", darkMode ? "text-gray-400" : "text-neutral-900")}>
        Compare two socionics types side by side to see their similarities and differences.
      </p>
      
      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select types={types} label="Type A" value={typeA} setValue={setTypeA} darkMode={darkMode} />
        <Select types={types} label="Type B" value={typeB} setValue={setTypeB} darkMode={darkMode} />
      </div>
      
      <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Type A Card */}
        <div className="border border-neutral-300 p-6 dark:border-gray-700">
          <div className="flex items-baseline justify-between">
            <h2 className={cls("text-2xl font-semibold", darkMode ? "text-white" : "text-black")}>
              <span className="font-mono mr-2">{a.code}</span>
              {a.fullName}
            </h2>
            <span className={cls("text-xs px-1.5 py-0.5 border", darkMode ? "border-gray-600 text-gray-300" : "border-neutral-300 text-neutral-700")}>{a.alias}</span>
          </div>
          
          <div className="mt-4 space-y-3">
            <div>
              <span className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Quadra</span>
              <div className={cls("text-lg", darkMode ? "text-white" : "text-black")}>{a.quadra}</div>
            </div>
            <div>
              <span className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Temperament</span>
              <div className={cls("text-lg", darkMode ? "text-white" : "text-black")}>{a.temperament}</div>
            </div>
            <div>
              <span className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Functions</span>
              <div className="mt-1 flex gap-4">
                <div>
                  <span className={cls("text-sm", darkMode ? "text-gray-400" : "text-neutral-700")}>Leading:</span>
                  <div className={cls("font-mono text-lg", darkMode ? "text-white" : "text-black")}>{a.leading}</div>
                </div>
                <div>
                  <span className={cls("text-sm", darkMode ? "text-gray-400" : "text-neutral-700")}>Creative:</span>
                  <div className={cls("font-mono text-lg", darkMode ? "text-white" : "text-black")}>{a.creative}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Type B Card */}
        <div className="border border-neutral-300 p-6 dark:border-gray-700">
          <div className="flex items-baseline justify-between">
            <h2 className={cls("text-2xl font-semibold", darkMode ? "text-white" : "text-black")}>
              <span className="font-mono mr-2">{b.code}</span>
              {b.fullName}
            </h2>
            <span className={cls("text-xs px-1.5 py-0.5 border", darkMode ? "border-gray-600 text-gray-300" : "border-neutral-300 text-neutral-700")}>{b.alias}</span>
          </div>
          
          <div className="mt-4 space-y-3">
            <div>
              <span className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Quadra</span>
              <div className={cls("text-lg", darkMode ? "text-white" : "text-black")}>{b.quadra}</div>
            </div>
            <div>
              <span className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Temperament</span>
              <div className={cls("text-lg", darkMode ? "text-white" : "text-black")}>{b.temperament}</div>
            </div>
            <div>
              <span className={cls("text-xs uppercase tracking-wide", darkMode ? "text-gray-500" : "text-neutral-500")}>Functions</span>
              <div className="mt-1 flex gap-4">
                <div>
                  <span className={cls("text-sm", darkMode ? "text-gray-400" : "text-neutral-700")}>Leading:</span>
                  <div className={cls("font-mono text-lg", darkMode ? "text-white" : "text-black")}>{b.leading}</div>
                </div>
                <div>
                  <span className={cls("text-sm", darkMode ? "text-gray-400" : "text-neutral-700")}>Creative:</span>
                  <div className={cls("font-mono text-lg", darkMode ? "text-white" : "text-black")}>{b.creative}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Comparison Results */}
      <div className="mt-6 card p-6">
        <h2 className={cls("text-2xl font-semibold", darkMode ? "text-white" : "text-black")}>Comparison</h2>
        
        {isDual && (
          <div className={cls("mt-4 p-3 border rounded", darkMode ? "bg-red-900/30 border-red-800" : "bg-red-50 border-red-200")}>
            <div className={cls("font-semibold", darkMode ? "text-red-200" : "text-red-800")}>Duality Pair</div>
            <p className={cls("mt-1", darkMode ? "text-red-300" : "text-red-700")}>
              These types form a duality pair, which means they have complementary strengths and can provide what the other lacks.
            </p>
          </div>
        )}
        
        <div className="mt-4">
          <h3 className={cls("font-semibold", darkMode ? "text-white" : "text-black")}>Shared Traits</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {sharedQuadra && (
              <span className={cls("px-2 py-1 text-xs rounded", darkMode ? "bg-red-900 text-red-100" : "bg-red-100 text-red-800")}>
                Same Quadra ({a.quadra})
              </span>
            )}
            {sharedTemperament && (
              <span className={cls("px-2 py-1 text-xs rounded", darkMode ? "bg-blue-900 text-blue-100" : "bg-blue-100 text-blue-800")}>
                Same Temperament ({a.temperament})
              </span>
            )}
            {sharedLeading && (
              <span className={cls("px-2 py-1 text-xs rounded", darkMode ? "bg-green-900 text-green-100" : "bg-green-100 text-green-800")}>
                Same Leading Function ({a.leading})
              </span>
            )}
            {sharedCreative && (
              <span className={cls("px-2 py-1 text-xs rounded", darkMode ? "bg-yellow-900 text-yellow-100" : "bg-yellow-100 text-yellow-800")}>
                Same Creative Function ({a.creative})
              </span>
            )}
          </div>
        </div>
        
        <div className="mt-4">
          <h3 className={cls("font-semibold", darkMode ? "text-white" : "text-black")}>Function Comparison</h3>
          <div className="mt-2 overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Function</th>
                  <th>{a.code}</th>
                  <th>{b.code}</th>
                  <th>Match</th>
                </tr>
              </thead>
              <tbody>
                {functionComparison.map((func, index) => (
                  <tr key={index}>
                    <td className={cls("text-sm", darkMode ? "text-gray-300" : "text-black")}>{func.name}</td>
                    <td className={cls("font-mono text-sm", darkMode ? "text-white" : "text-black")}>{func.a}</td>
                    <td className={cls("font-mono text-sm", darkMode ? "text-white" : "text-black")}>{func.b}</td>
                    <td className="text-sm">
                      {func.same ? (
                        <span className={darkMode ? "text-green-400" : "text-green-600"}>✓ Match</span>
                      ) : (
                        <span className={darkMode ? "text-red-400" : "text-red-600"}>✗ Different</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}

function SiteFooter({ darkMode, generatedAt }) {
  return (
    <footer className={cls("border-t py-10 mt-16", darkMode ? "border-gray-700" : "border-neutral-200")}>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-sm">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className={cls("font-semibold tracking-tight", darkMode ? "text-gray-300" : "text-black")}>Wikisocion — MVP</div>
            <div className={cls("", darkMode ? "text-gray-400" : "text-neutral-600")}>Swiss-inspired layout. Community prototype.</div>
            {generatedAt && (
              <div className={cls("mt-1", darkMode ? "text-gray-500" : "text-neutral-500")}>Last updated: {new Date(generatedAt).toLocaleString()}</div>
            )}
          </div>
          <div className="flex gap-4">
            <a className={cls("hover:", darkMode ? "text-gray-300" : "text-neutral-900")} href="https://wikisocion.github.io/" target="_blank" rel="noopener">
              Archive
            </a>
            <a className={cls("hover:", darkMode ? "text-gray-300" : "text-neutral-900")} href="#">
              Changelog
            </a>
            <a className={cls("hover:", darkMode ? "text-gray-300" : "text-neutral-900")} href="#">
              Contribute
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
