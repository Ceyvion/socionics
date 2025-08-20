import fs from "node:fs/promises";
import * as path from "node:path";
import * as url from "node:url";
import { load as cheerioLoad } from "cheerio";
import { setTimeout as delay } from "node:timers/promises";

const __dirname = path.dirname(url.fileURLToPath(import.meta.url));
const OUT_DIR = path.join(__dirname, "..", "public", "data");
await fs.mkdir(OUT_DIR, { recursive: true });

// 16 type codes in Wikisocion
const TYPE_CODES = [
  "ILE","SEI","LII","ESE",
  "SLE","IEI","LSI","EIE",
  "SEE","ILI","ESI","LIE",
  "LSE","EII","SLI","IEE",
];

// Type information (hardcoded for accuracy since parsing is unreliable)
const TYPE_INFO = {
  "ILE": { fullName: "Intuitive Logical Extravert", alias: "ENTp", quadra: "Alpha", temperament: "EP", leading: "Ne", creative: "Ti" },
  "SEI": { fullName: "Sensing Ethical Introvert", alias: "ISFp", quadra: "Alpha", temperament: "IJ", leading: "Si", creative: "Fe" },
  "LII": { fullName: "Logical Intuitive Introvert", alias: "INTj", quadra: "Alpha", temperament: "IJ", leading: "Ti", creative: "Ne" },
  "ESE": { fullName: "Ethical Sensing Extravert", alias: "ESFj", quadra: "Alpha", temperament: "EJ", leading: "Fe", creative: "Si" },
  "SLE": { fullName: "Sensing Logical Extravert", alias: "ESTp", quadra: "Beta", temperament: "EP", leading: "Se", creative: "Ti" },
  "IEI": { fullName: "Intuitive Ethical Introvert", alias: "INFp", quadra: "Beta", temperament: "IP", leading: "Ni", creative: "Fe" },
  "LSI": { fullName: "Logical Sensing Introvert", alias: "ISTj", quadra: "Beta", temperament: "IJ", leading: "Ti", creative: "Se" },
  "EIE": { fullName: "Ethical Intuitive Extravert", alias: "ENFj", quadra: "Beta", temperament: "EJ", leading: "Fe", creative: "Ni" },
  "SEE": { fullName: "Sensing Ethical Extravert", alias: "ESFp", quadra: "Gamma", temperament: "EP", leading: "Se", creative: "Fi" },
  "ILI": { fullName: "Intuitive Logical Introvert", alias: "INTp", quadra: "Gamma", temperament: "IP", leading: "Ni", creative: "Te" },
  "ESI": { fullName: "Ethical Sensing Introvert", alias: "ISFj", quadra: "Gamma", temperament: "IJ", leading: "Fi", creative: "Se" },
  "LIE": { fullName: "Logical Intuitive Extravert", alias: "ENTj", quadra: "Gamma", temperament: "EJ", leading: "Te", creative: "Ni" },
  "LSE": { fullName: "Logical Sensing Extravert", alias: "ESTj", quadra: "Delta", temperament: "EJ", leading: "Te", creative: "Si" },
  "EII": { fullName: "Ethical Intuitive Introvert", alias: "INFj", quadra: "Delta", temperament: "IJ", leading: "Fi", creative: "Ne" },
  "SLI": { fullName: "Sensing Logical Introvert", alias: "ISTp", quadra: "Delta", temperament: "IP", leading: "Si", creative: "Te" },
  "IEE": { fullName: "Intuitive Ethical Extravert", alias: "ENFp", quadra: "Delta", temperament: "EP", leading: "Ne", creative: "Fi" },
};

// Helper: fetch with timeout + retries
async function fetchWithRetry(url, { timeoutMs = 8000, retries = 2 } = {}) {
  let attempt = 0;
  while (true) {
    attempt++;
    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const res = await fetch(url, {
        headers: { "User-Agent": "wikisocion-mvp-scraper/1.1" },
        signal: controller.signal,
      });
      clearTimeout(t);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return res;
    } catch (e) {
      clearTimeout(t);
      if (attempt > retries + 1) throw new Error(`Failed to fetch ${url}: ${e.message}`);
      await delay(400 * attempt); // simple backoff
    }
  }
}

// Helper: fetch and parse
async function load(url) {
  const res = await fetchWithRetry(url);
  const html = await res.text();
  return cheerioLoad(html);
}

// Heuristic parsers (selectors vary across pages; keep robust & conservative)
function parseType($, code) {
  const info = TYPE_INFO[code];
  
  // Try to get overview from first paragraph
  const firstParagraph = $("p").first().text().trim();
  const overview = firstParagraph ? firstParagraph.replace(/\s+/g, " ").slice(0, 280) : "Socionics type description.";

  return {
    code,
    fullName: info.fullName,
    alias: info.alias,
    quadra: info.quadra,
    temperament: info.temperament,
    leading: info.leading,
    creative: info.creative,
    overview,
    href: `https://wikisocion.github.io/content/${code}.html`,
  };
}

// Duality (sorted keys!)
const DUAL_PAIRS = [
  ["ILE","SEI"],["LII","ESE"],["SLE","IEI"],["LSI","EIE"],
  ["SEE","ILI"],["ESI","LIE"],["LSE","EII"],["SLI","IEE"],
];

function dualKey(a,b){ return [a,b].sort().join("-"); }

async function scrapeAll() {
  const base = "https://wikisocion.github.io/content";
  const types = [];
  const generatedAt = new Date().toISOString();
  for (const code of TYPE_CODES) {
    const url = `${base}/${code}.html`;
    const $ = await load(url);
    types.push(parseType($, code));
  }

  // Minimal glossary (from Information Elements page)
  const glossaryDefinitions = {
    "Ne": "Extroverted intuition - possibilities, patterns, divergence.",
    "Ni": "Introverted intuition - time, trajectories, convergence.",
    "Se": "Extroverted sensing - force, assertion, control of space.",
    "Si": "Introverted sensing - comfort, calibration, bodily states.",
    "Te": "Extroverted logic - efficiency, metrics, execution.",
    "Ti": "Introverted logic - structure, definitions, consistency.",
    "Fe": "Extroverted ethics - shared feeling, expression, morale.",
    "Fi": "Introverted ethics - bonds, values, personal distance.",
  };
  
  const glossary = Object.entries(glossaryDefinitions).map(([term, shortDef]) => ({
    term,
    shortDef
  }));

  const relations = DUAL_PAIRS.map(([a,b]) => ({
    a, b, name: "Duality",
    summary: "Complementary strengths; easy role division; watch for over-reliance on partner's valued elements.",
  }));

  // --- Smoke tests (don't change without reason) ---
  console.assert(types.length === 16, "Expected 16 type pages");
  console.assert(new Set(types.map(t=>t.code)).size === 16, "Type codes unique");
  console.assert(relations.length === 8, "Expected 8 dual pairs");
  for (const [a,b] of DUAL_PAIRS) {
    console.assert(TYPE_CODES.includes(a) && TYPE_CODES.includes(b), `Unknown type in dual: ${a}-${b}`);
  }

  await fs.writeFile(path.join(OUT_DIR, "types.json"), JSON.stringify(types, null, 2));
  await fs.writeFile(path.join(OUT_DIR, "relations.json"), JSON.stringify(relations, null, 2));
  await fs.writeFile(path.join(OUT_DIR, "glossary.json"), JSON.stringify(glossary, null, 2));

  // Precomputed search index (simple, compact)
  const entries = [];
  for (const t of types) {
    const hay = [t.code, t.fullName, t.alias, t.quadra, t.temperament, t.leading, t.creative].join(" ").toLowerCase();
    entries.push({ kind: "type", id: t.code, code: t.code, fullName: t.fullName, alias: t.alias, haystack: hay });
  }
  for (const g of glossary) {
    const hay = [g.term, g.shortDef].join(" ").toLowerCase();
    entries.push({ kind: "gloss", id: g.term, term: g.term, shortDef: g.shortDef, haystack: hay });
  }
  await fs.writeFile(path.join(OUT_DIR, "search.json"), JSON.stringify({ entries }, null, 2));

  const meta = {
    generatedAt,
    sources: {
      types: `${base}/[TYPE].html`,
      relations: "DUAL_PAIRS hardcoded (script)",
      glossary: "Short definitions embedded in script",
    },
  };
  await fs.writeFile(path.join(OUT_DIR, "meta.json"), JSON.stringify(meta, null, 2));
  console.log(`Wrote ${OUT_DIR}/types.json, relations.json, glossary.json, search.json, meta.json`);
}

scrapeAll().catch(e => { console.error(e); process.exit(1); });
