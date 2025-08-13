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
  const [data, setData] = useState({ types: null, glossary: null, relations: null, error: null });
  useEffect(() => {
    Promise.all([
      fetch("/data/types.json").then(r=>r.json()),
      fetch("/data/glossary.json").then(r=>r.json()),
      fetch("/data/relations.json").then(r=>r.json()),
    ]).then(([types, glossary, relations]) => {
      setData({ types, glossary, relations, error: null });
    }).catch(err => setData({ types: null, glossary: null, relations: null, error: err.message }));
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
export default function WikisocionMVP() {
  const [route, setRoute] = useState({ name: "home" });
  const [query, setQuery] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const searchRef = useRef(null);
  
  const { types, glossary, relations, error } = useData();
  
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
  
  const navigate = (name, params = {}) => setRoute({ name, ...params });
  
  // Build results with useMemo (always called)
  const results = useMemo(() => {
    // Handle loading/error states in the useMemo itself
    if (error || !types || !glossary || !relations) {
      return [];
    }
    
    const q = query.trim().toLowerCase();
    if (!q) return [];
    
    const fromTypes = types.filter((t) =>
      [t.code, t.fullName, t.alias, t.quadra, t.leading, t.creative].some((v) =>
        v.toLowerCase().includes(q)
      )
    ).map((t) => ({ kind: "type", id: t.code }));
    
    const fromGloss = glossary.filter((g) =>
      [g.term, g.shortDef].some((v) => v.toLowerCase().includes(q))
    ).map((g) => ({ kind: "gloss", id: g.term }));
    
    return [...fromTypes, ...fromGloss].slice(0, 10);
  }, [query, types, glossary, relations, error]);
  
  // Show error state
  if (error) {
    return <div className={cls("min-h-screen flex items-center justify-center", darkMode ? "bg-gray-900" : "bg-white")}><div className="p-6 text-red-700">Data load failed: {error}</div></div>;
  }
  
  // Show loading state
  if (!types || !glossary || !relations) {
    return <div className={cls("min-h-screen flex items-center justify-center", darkMode ? "bg-gray-900" : "bg-white")}><div className="p-6 dark:text-gray-300">Loading…</div></div>;
  }
  
  // build helpers the old constants provided
  const byCode = Object.fromEntries(types.map(t => [t.code, t]));
  const DUALS = new Set(relations.filter(r=>r.name==="Duality").map(r => [r.a, r.b].sort().join("-")));
  
  return (
    <div className={cls("min-h-screen", darkMode ? "bg-gray-900 text-gray-100" : "bg-white text-neutral-900")}>
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
        {route.name === "home" && <Home onNav={navigate} types={types} />}
        {route.name === "start" && <StartHere onNav={navigate} />}
        {route.name === "types" && <TypesIndex types={types} onOpen={(code) => navigate("type", { code })} />}
        {route.name === "type" && <TypeDetail types={types} duals={DUALS} code={route.code} onBack={() => navigate("types")} />}
        {route.name === "relations" && <Relations types={types} duals={DUALS} relations={relations} onNav={navigate} />}
        {route.name === "theory" && <Theory onNav={navigate} />}
        {route.name === "glossary" && <Glossary glossary={glossary} focus={route.focus} />}
        {route.name === "library" && <Library />}
        {route.name === "about" && <About />}
      </main>
      <SiteFooter />
    </div>
  );
}

// --- Top bar ---
function TopBar({ onNav, query, setQuery, searchRef, onResult, results, darkMode, setDarkMode }) {
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
            ["Relations", "relations"],
            ["Theory", "theory"],
            ["Glossary", "glossary"],
            ["Library", "library"],
            ["About", "about"],
          ].map(([label, route]) => (
            <button
              key={route}
              onClick={() => onNav(route)}
              className={cls("hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-600 rounded-sm", darkMode ? "text-gray-300 hover:text-red-500" : "text-neutral-900")}
            >
              {label}
            </button>
          ))}
        </nav>
        <div className="ml-auto relative flex-1 max-w-md">
          <div className={cls("flex items-center rounded-sm focus-within:ring-2 focus-within:ring-red-600", darkMode ? "bg-gray-800 border border-gray-700" : "border border-neutral-300")}>
            <Search className={cls("ml-2 h-4 w-4", darkMode ? "text-gray-400" : "text-neutral-500")} />
            <input
              ref={searchRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={'Search: LII, "Model A", Fe... (/ to focus)'}
              className={cls("w-full px-3 py-2 text-sm outline-none bg-transparent", darkMode ? "text-white placeholder-gray-500" : "text-neutral-900 placeholder-neutral-500")}
            />
          </div>
          {!!results.length && (
            <div className={cls("absolute mt-1 w-full shadow-sm", darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-neutral-200")}>
              {results.map((r, i) => (
                <button
                  key={i}
                  onClick={() => onResult(r)}
                  className={cls("w-full text-left px-3 py-2 text-sm focus:outline-none", darkMode ? "hover:bg-gray-700 focus:bg-gray-700 text-gray-200" : "hover:bg-neutral-50 focus:bg-neutral-50 text-neutral-900")}
                >
                  {r.kind === "type" ? (
                    <span className="font-mono mr-2">{r.id}</span>
                  ) : (
                    <span className="mr-2">Glossary</span>
                  )}
                  <ArrowRight className="inline h-3 w-3 ml-1" />
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
function Home({ onNav, types }) {
  return (
    <section className="pt-12">
      <div className="grid md:grid-cols-12 gap-8 items-center">
        <div className="md:col-span-7">
          <h1 className="text-5xl md:text-6xl font-semibold tracking-tight leading-[1.05]">
            Socionics, organized.
          </h1>
          <p className="mt-4 text-lg max-w-xl dark:text-gray-300 text-neutral-700">
            Clear explanations of types, functions, and relations. Minimal jargon. Mobile-friendly. Open source.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => onNav("start")}
              className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white text-sm tracking-wide hover:bg-red-700"
            >
              Start here <ArrowRight className="h-4 w-4" />
            </button>
            <button
              onClick={() => onNav("types")}
              className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 text-sm dark:border-gray-600 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-gray-800"
            >
              <TypeIcon className="h-4 w-4" /> Types
            </button>
            <button
              onClick={() => onNav("relations")}
              className="inline-flex items-center gap-2 px-4 py-2 border border-neutral-300 text-sm dark:border-gray-600 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-gray-800"
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

      <div className="mt-16 border-t border-neutral-200 dark:border-gray-700 pt-8">
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
    <button
      onClick={onClick}
      className="h-28 border border-neutral-300 text-left px-4 py-3 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-600 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300"
    >
      <div className="flex items-center gap-2 text-sm text-neutral-600 dark:text-gray-400">
        {icon}
        <span>{subtitle}</span>
      </div>
      <div className="mt-2 text-xl font-semibold">{title}</div>
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
          <span className="inline-flex items-center gap-1 px-2 py-1 border border-neutral-300 dark:border-gray-600 dark:text-gray-300">
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
              className="border border-neutral-300 text-left px-4 py-3 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-600 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300"
            >
              <div className="flex items-baseline justify-between">
                <div className="font-mono text-2xl">{t.code}</div>
                <span className="text-xs px-1.5 py-0.5 border border-neutral-300 dark:border-gray-600">{t.alias}</span>
              </div>
              <div className="mt-1 text-sm dark:text-gray-400 text-neutral-700">{t.fullName}</div>
              <div className="mt-2 flex gap-2 text-xs dark:text-gray-500 text-neutral-600">
                <span className="px-1 border border-neutral-300 dark:border-gray-600">{t.quadra}</span>
                <span className="px-1 border border-neutral-300 dark:border-gray-600">{t.temperament}</span>
                <span className="px-1 border border-neutral-300 dark:border-gray-600">{t.leading}/{t.creative}</span>
              </div>
            </button>
          ))}
        </div>
      ) : (
        <div className="mt-6 divide-y divide-neutral-200 dark:divide-gray-700">
          {filtered.map((t) => (
            <button
              key={t.code}
              onClick={() => onOpen(t.code)}
              className="w-full text-left py-3 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-600 dark:hover:bg-gray-800"
            >
              <div className="flex items-center gap-4 px-2">
                <span className="font-mono text-lg w-16 dark:text-gray-300">{t.code}</span>
                <span className="flex-1 dark:text-gray-300">
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
      className="border border-neutral-300 px-4 py-3 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-red-600 dark:border-gray-600 dark:hover:bg-gray-800 dark:text-gray-300"
    >
      <div className="flex items-baseline justify-between">
        <div className="font-mono text-2xl">{type.code}</div>
        <span className="text-xs px-1.5 py-0.5 border border-neutral-300 dark:border-gray-600">{type.alias}</span>
      </div>
      <div className="mt-1 text-sm dark:text-gray-400 text-neutral-700">{type.fullName}</div>
      <div className="mt-2 flex gap-2 text-xs dark:text-gray-500 text-neutral-600">
        <span className="px-1 border border-neutral-300 dark:border-gray-600">{type.quadra}</span>
        <span className="px-1 border border-neutral-300 dark:border-gray-600">{type.leading}/{type.creative}</span>
      </div>
      <div className="mt-2 inline-flex items-center gap-1 text-xs dark:text-gray-500 text-neutral-700">
        Open wiki <ExternalLink className="h-3 w-3" />
      </div>
    </a>
  );
}

function TypeDetail({ types, duals, code, onBack }) {
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
  
  return (
    <section className="pt-10">
      <button
        onClick={onBack}
        className="text-sm text-neutral-600 hover:text-neutral-900 inline-flex items-center gap-1 dark:text-gray-400 dark:hover:text-gray-300"
      >
        <HomeIcon className="h-4 w-4" /> Back to Types
      </button>
      <div className="mt-4 grid lg:grid-cols-12 gap-8">
        <div className="lg:col-span-8">
          <div className="border border-neutral-300 p-6 dark:border-gray-700">
            <div className="flex items-baseline justify-between">
              <h1 className="text-4xl font-semibold tracking-tight dark:text-gray-200">
                <span className="font-mono mr-2">{t.code}</span>
                {t.fullName}
              </h1>
              <span className="text-xs px-1.5 py-0.5 border border-neutral-300 dark:border-gray-600 dark:text-gray-400">{t.alias}</span>
            </div>
            <p className="mt-4 dark:text-gray-300 text-neutral-700 max-w-prose">
              {content.summary}
            </p>
            
            <div className="mt-8">
              <h2 className="text-2xl font-semibold dark:text-gray-200">Core Characteristics</h2>
              <div className="mt-4 grid sm:grid-cols-2 gap-4">
                <div className="border border-neutral-300 p-4 dark:border-gray-700">
                  <h3 className="font-semibold dark:text-gray-300 text-neutral-800">Typical Strengths</h3>
                  <p className="mt-2 text-sm dark:text-gray-400 text-neutral-700">
                    {content.characteristics.strengths}
                  </p>
                </div>
                <div className="border border-neutral-300 p-4 dark:border-gray-700">
                  <h3 className="font-semibold dark:text-gray-300 text-neutral-800">Common Challenges</h3>
                  <p className="mt-2 text-sm dark:text-gray-400 text-neutral-700">
                    {content.characteristics.challenges}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <h2 className="text-2xl font-semibold dark:text-gray-200">Interaction & Context</h2>
              <div className="mt-4 grid sm:grid-cols-3 gap-4">
                <div className="border border-neutral-300 p-4 dark:border-gray-700">
                  <h3 className="font-semibold dark:text-gray-300 text-neutral-800">Communication</h3>
                  <p className="mt-2 text-sm dark:text-gray-400 text-neutral-700">
                    {content.interaction.communication}
                  </p>
                </div>
                <div className="border border-neutral-300 p-4 dark:border-gray-700">
                  <h3 className="font-semibold dark:text-gray-300 text-neutral-800">Work/Learning</h3>
                  <p className="mt-2 text-sm dark:text-gray-400 text-neutral-700">
                    {content.interaction.work}
                  </p>
                </div>
                <div className="border border-neutral-300 p-4 dark:border-gray-700">
                  <h3 className="font-semibold dark:text-gray-300 text-neutral-800">Decision-making</h3>
                  <p className="mt-2 text-sm dark:text-gray-400 text-neutral-700">
                    {content.interaction.decision}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="mt-8">
              <h2 className="text-2xl font-semibold dark:text-gray-200">Model A (schematic)</h2>
              <ModelA leading={t.leading} creative={t.creative} modelA={content.modelA} darkMode={true} />
            </div>
            
            <div className="mt-8">
              <h2 className="text-2xl font-semibold dark:text-gray-200">On-site Nuances</h2>
              <p className="mt-4 dark:text-gray-300 text-neutral-700 max-w-prose">
                {content.nuances}
              </p>
            </div>
          </div>
        </div>
        <aside className="lg:col-span-4">
          <div className="border border-neutral-300 p-4 dark:border-gray-700">
            <h3 className="font-semibold dark:text-gray-300">Type Info</h3>
            <div className="mt-3 space-y-3">
              <div>
                <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-gray-500">Quadra</span>
                <div className="text-lg dark:text-gray-300">{t.quadra}</div>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-gray-500">Temperament</span>
                <div className="text-lg dark:text-gray-300">{t.temperament}</div>
              </div>
              <div>
                <span className="text-xs uppercase tracking-wide text-neutral-500 dark:text-gray-500">Leading / Creative</span>
                <div className="text-lg dark:text-gray-300">
                  {t.leading} / {t.creative}
                </div>
              </div>
            </div>
            <a
              href={t.href}
              target="_blank"
              rel="noopener"
              className="mt-4 block w-full bg-neutral-100 hover:bg-neutral-200 text-center py-2 text-sm dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-gray-300"
            >
              Canonical page
            </a>
          </div>
          
          <div className="mt-4 border border-neutral-300 p-4 dark:border-gray-700">
            <h3 className="font-semibold dark:text-gray-300">Intertype Relations</h3>
            <p className="text-sm dark:text-gray-400 text-neutral-700 mt-1">
              Key relations for {t.code}
            </p>
            <DualityList types={types} duals={duals} self={t.code} />
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
        <div key={i} className="border border-neutral-300 p-3 dark:border-gray-700">
          <div className="flex justify-between">
            <div className="text-xs text-neutral-500 dark:text-gray-500">{b.position}</div>
            <div className={cls("font-mono", (i === 0 || i === 1) && "text-red-700 font-semibold", darkMode && (i === 0 || i === 1) && "text-red-500")}>
              {b.element}
            </div>
          </div>
          <div className="mt-1 text-sm dark:text-gray-400 text-neutral-700">
            {b.description}
          </div>
        </div>
      ))}
    </div>
  );
}

function DualityList({ types, duals, self }) {
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
      <div className="flex items-center justify-between border border-neutral-300 p-3 dark:border-gray-700">
        <div>
          <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-gray-500">Dual type</div>
          <div className="text-lg font-mono dark:text-gray-300">{t.code}</div>
          <div className="text-neutral-700 dark:text-gray-400">
            {t.fullName} ({t.alias})
          </div>
        </div>
        <a href={t.href} target="_blank" rel="noopener" className="text-red-600 text-sm dark:text-red-500">
          Open <ExternalLink className="inline h-4 w-4" />
        </a>
      </div>
    </div>
  );
}

function Relations({ types, duals, relations, onNav }) {
  const [a, setA] = useState("ILE");
  const [b, setB] = useState("SEI");

  const pairKey = [a, b].sort().join("-");
  const isDual = duals.has(pairKey);
  const relation = relations.find(r => r.name === "Duality" && [r.a, r.b].sort().join("-") === pairKey);

  return (
    <section className="pt-10 max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight dark:text-gray-200">Relations</h1>
      <p className="mt-2 dark:text-gray-400 text-neutral-700">
        Pick two types to see the relation name. MVP recognizes duality pairs; full 16x16 matrix is planned for v1.1.
      </p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select types={types} label="Type A" value={a} setValue={setA} />
        <Select types={types} label="Type B" value={b} setValue={setB} />
      </div>

      <div className="mt-6 border border-neutral-300 p-6 dark:border-gray-700">
        <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-gray-500">Relation</div>
        <div className="mt-1 text-2xl font-semibold dark:text-gray-300">
          {isDual ? "Duality" : "(More relations coming soon)"}
        </div>
        <div className="mt-2 dark:text-gray-400 text-neutral-700 max-w-prose">
          {isDual && relation ? (
            <p>
              {relation.summary}
            </p>
          ) : (
            <p>
              We will surface Activity, Supervision, Conflict, and more in the next release with a full, auditable mapping.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

function Select({ types, label, value, setValue }) {
  return (
    <label className="text-sm">
      <div className="text-neutral-600 mb-1 dark:text-gray-400">{label}</div>
      <select
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="w-full border border-neutral-300 px-2 py-2 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"
      >
        {types.map((t) => (
          <option key={t.code} value={t.code} className="dark:bg-gray-800">
            {t.code} — {t.fullName} ({t.alias})
          </option>
        ))}
      </select>
    </label>
  );
}

function Theory() {
  return (
    <section className="pt-10">
      <h1 className="text-3xl font-semibold tracking-tight dark:text-gray-200">Theory</h1>
      <div className="mt-6 grid md:grid-cols-3 gap-3">
        <TheoryCard title="Model A" summary="Eight function positions; leading and creative guide the stack." />
        <TheoryCard title="Information Elements" summary="Ne, Ni, Se, Si, Te, Ti, Fe, Fi as channels of information." />
        <TheoryCard title="Quadras" summary="Four cultures of values: Alpha, Beta, Gamma, Delta." />
      </div>
      <p className="mt-6 text-sm dark:text-gray-400 text-neutral-700">
        These articles are concise primers with diagrams. For depth, use the Library to reach canonical materials.
      </p>
    </section>
  );
}

function TheoryCard({ title, summary }) {
  return (
    <div className="border border-neutral-300 p-4 hover:bg-neutral-50 dark:border-gray-700 dark:hover:bg-gray-800">
      <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-gray-500">Primer</div>
      <div className="text-xl font-semibold dark:text-gray-300">{title}</div>
      <p className="mt-1 text-neutral-700 text-sm dark:text-gray-400">{summary}</p>
    </div>
  );
}

function Glossary({ glossary, focus }) {
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
      <h1 className="text-3xl font-semibold tracking-tight dark:text-gray-200">Glossary</h1>
      <p className="mt-2 dark:text-gray-400 text-neutral-700">
        Short, first-pass definitions. Click a term to expand in place in a future version.
      </p>
      <div className="mt-6 grid sm:grid-cols-2 gap-3">
        {glossary.map((g) => (
          <div key={g.term} id={`gloss-${g.term}`} className="border border-neutral-300 p-3 dark:border-gray-700">
            <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-gray-500">Term</div>
            <div className="text-lg font-mono dark:text-gray-300">{g.term}</div>
            <div className="mt-1 text-sm dark:text-gray-400 text-neutral-700">{g.shortDef}</div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Library() {
  return (
    <section className="pt-10">
      <h1 className="text-3xl font-semibold tracking-tight dark:text-gray-200">Library</h1>
      <p className="mt-2 dark:text-gray-400 text-neutral-700">Curated entry points. Each item explains why it matters.</p>
      <div className="mt-6 grid md:grid-cols-3 gap-3">
        <a
          className="border border-neutral-300 p-4 hover:bg-neutral-50 dark:border-gray-700 dark:hover:bg-gray-800"
          href="https://wikisocion.github.io/"
          target="_blank"
          rel="noopener"
        >
          <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-gray-500">External</div>
          <div className="text-lg font-semibold inline-flex items-center gap-2 dark:text-gray-300">
            Wikisocion archive <ExternalLink className="h-4 w-4" />
          </div>
          <p className="mt-1 text-sm dark:text-gray-400 text-neutral-700">
            The canonical collection - deep dives, history, alternative models.
          </p>
        </a>
        <a
          className="border border-neutral-300 p-4 hover:bg-neutral-50 dark:border-gray-700 dark:hover:bg-gray-800"
          href="https://wikisocion.github.io/content/Model_A.html"
          target="_blank"
          rel="noopener"
        >
          <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-gray-500">Primer</div>
          <div className="text-lg font-semibold inline-flex items-center gap-2 dark:text-gray-300">
            Model A <ExternalLink className="h-4 w-4" />
          </div>
          <p className="mt-1 text-sm dark:text-gray-400 text-neutral-700">
            Structure of function positions; basis for many relation mappings.
          </p>
        </a>
        <a
          className="border border-neutral-300 p-4 hover:bg-neutral-50 dark:border-gray-700 dark:hover:bg-gray-800"
          href="https://wikisocion.github.io/content/Intertype_relations.html"
          target="_blank"
          rel="noopener"
        >
          <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-gray-500">Reference</div>
          <div className="text-lg font-semibold inline-flex items-center gap-2 dark:text-gray-300">
            Intertype relations <ExternalLink className="h-4 w-4" />
          </div>
          <p className="mt-1 text-sm dark:text-gray-400 text-neutral-700">
            Overview of relation names and general descriptions.
          </p>
        </a>
      </div>
    </section>
  );
}

function About() {
  return (
    <section className="pt-10 max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight dark:text-gray-200">About</h1>
      <p className="mt-2 dark:text-gray-400 text-neutral-700">
        This is a community MVP that reorganizes Wikisocion content for clarity and mobile use while linking back to canonical pages. It follows accessibility best practices (keyboard navigation, high contrast, reduced motion respect) and a Swiss typographic aesthetic.
      </p>
      <ul className="mt-4 list-disc pl-6 text-neutral-700 text-sm dark:text-gray-400">
        <li>Open source, non-commercial.</li>
        <li>Typography: Inter/Helvetica-like sans; minimal color with a single red accent.</li>
        <li>Privacy-friendly analytics suggested: simple counts for search success, time-to-type page, relation lookups.</li>
      </ul>
    </section>
  );
}

function StartHere({ onNav }) {
  const [step, setStep] = useState(1);
  const next = () => setStep((s) => Math.min(4, s + 1));
  const prev = () => setStep((s) => Math.max(1, s - 1));

  return (
    <section className="pt-10 max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight dark:text-gray-200">Start here</h1>
      <ol className="mt-6 space-y-4 text-neutral-800 dark:text-gray-300">
        <li className={cls("border p-4", step === 1 ? "border-red-600 dark:border-red-500" : "border-neutral-300 dark:border-gray-700")}>
          <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-gray-500">Step 1</div>
          <div className="text-lg font-semibold">Model A in one minute</div>
          <p className="mt-1 text-sm dark:text-gray-400">
            Eight function positions. Two do the heavy lifting: <b>Leading</b> (your default lens) and <b>Creative</b> (your flexible tool).
          </p>
        </li>
        <li className={cls("border p-4", step === 2 ? "border-red-600 dark:border-red-500" : "border-neutral-300 dark:border-gray-700")}>
          <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-gray-500">Step 2</div>
          <div className="text-lg font-semibold">Information elements (the "alphabet")</div>
          <p className="mt-1 text-sm dark:text-gray-400">
            Ne/Ni (intuition), Se/Si (sensing), Te/Ti (logic), Fe/Fi (ethics). Each type values some over others.
          </p>
        </li>
        <li className={cls("border p-4", step === 3 ? "border-red-600 dark:border-red-500" : "border-neutral-300 dark:border-gray-700")}>
          <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-gray-500">Step 3</div>
          <div className="text-lg font-semibold">Skim types - spot your pattern</div>
          <p className="mt-1 text-sm dark:text-gray-400">
            Browse the 16 cards. Which overview sounds like how you work by default? Open 2-3 candidates.
          </p>
        </li>
        <li className={cls("border p-4", step === 4 ? "border-red-600 dark:border-red-500" : "border-neutral-300 dark:border-gray-700")}>
          <div className="text-xs uppercase tracking-wide text-neutral-500 dark:text-gray-500">Step 4</div>
          <div className="text-lg font-semibold">Relations are about fit of values</div>
          <p className="mt-1 text-sm dark:text-gray-400">
            Some pairs feel effortless (duality); others are energizing or challenging. Use relations as a lens, not a verdict.
          </p>
        </li>
      </ol>

      <div className="mt-6 flex items-center gap-3">
        <button onClick={prev} className="px-3 py-1 border border-neutral-300 text-sm dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800" disabled={step === 1}>
          Back
        </button>
        <button onClick={next} className="px-3 py-1 bg-red-600 text-white text-sm hover:bg-red-700 dark:bg-red-700 dark:hover:bg-red-800" disabled={step === 4}>
          Next
        </button>
        <button onClick={() => onNav("types")} className="ml-auto px-3 py-1 border border-neutral-300 text-sm dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800">
          Go to Types
        </button>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-neutral-200 py-10 mt-16 dark:border-gray-700">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 text-sm text-neutral-600 dark:text-gray-400">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <div className="font-semibold tracking-tight dark:text-gray-300">Wikisocion — MVP</div>
            <div>Swiss-inspired layout. Community prototype.</div>
          </div>
          <div className="flex gap-4">
            <a className="hover:text-neutral-900 dark:hover:text-gray-300" href="https://wikisocion.github.io/" target="_blank" rel="noopener">
              Archive
            </a>
            <a className="hover:text-neutral-900 dark:hover:text-gray-300" href="#">
              Changelog
            </a>
            <a className="hover:text-neutral-900 dark:hover:text-gray-300" href="#">
              Contribute
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
