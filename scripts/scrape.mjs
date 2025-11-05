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

// Map type codes to canonical page titles on MediaWiki (stable over time)
// Source: common naming on wikisocion.net; adjust if the wiki changes titles
const TYPE_PAGES = {
  ILE: "ILE (ENTp)",
  SEI: "SEI (ISFp)",
  LII: "LII (INTj)",
  ESE: "ESE (ESFj)",
  SLE: "SLE (ESTp)",
  IEI: "IEI (INFp)",
  LSI: "LSI (ISTj)",
  EIE: "EIE (ENFj)",
  SEE: "SEE (ESFp)",
  ILI: "ILI (INTp)",
  ESI: "ESI (ISFj)",
  LIE: "LIE (ENTj)",
  LSE: "LSE (ESTj)",
  EII: "EII (INFj)",
  SLI: "SLI (ISTp)",
  IEE: "IEE (ENFp)",
};

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

// ---- MediaWiki Action API helpers ----
const MW_API = process.env.WIKISOCION_API || "https://wikisocion.net/w/api.php";
const MW_PAGE_BASE = process.env.WIKISOCION_PAGE_BASE || "https://wikisocion.net/en/index.php?title=";
const TYPES_CATEGORY = process.env.WIKISOCION_TYPES_CATEGORY || "Socionics types"; // cmtitle=Category:Socionics types

async function mwGet(params) {
  const q = new URLSearchParams({ format: "json", origin: "*", ...params });
  const url = `${MW_API}?${q.toString()}`;
  const res = await fetchWithRetry(url);
  const json = await res.json();
  if (json && json.error) throw new Error(`MediaWiki API error: ${json.error.info || json.error.code}`);
  return json;
}

async function mwListTypePagesViaCategory() {
  const titles = [];
  let cmcontinue = undefined;
  const cmtitle = `Category:${TYPES_CATEGORY}`;
  do {
    const json = await mwGet({
      action: "query",
      list: "categorymembers",
      cmtitle,
      cmlimit: "max",
      cmtype: "page",
      ...(cmcontinue ? { cmcontinue } : {}),
    });
    const members = json?.query?.categorymembers || [];
    for (const m of members) titles.push(m.title);
    cmcontinue = json?.continue?.cmcontinue;
  } while (cmcontinue);
  return titles;
}

async function mwParsePage(title) {
  const json = await mwGet({
    action: "parse",
    page: title,
    prop: "text|sections|revid|displaytitle",
    formatversion: "2",
    redirects: "true",
    disableeditsection: "true",
  });
  return json?.parse;
}

function extractLeadParagraphFromHtml(html) {
  const $ = cheerioLoad(html);
  // Prefer first paragraph with some text; skip coordinates/infobox wrappers
  const p = $("p").filter((_, el) => $(el).text().trim().length > 60).first();
  const text = (p.text() || "").replace(/\s+/g, " ").trim();
  return text || null;
}

async function scrapeTypeViaMediaWiki(code) {
  const pageTitle = TYPE_PAGES[code] || code;
  const parsed = await mwParsePage(pageTitle);
  if (!parsed || !parsed.text) throw new Error(`No parse for ${pageTitle}`);
  const overview = extractLeadParagraphFromHtml(parsed.text) || "Socionics type description.";
  const info = TYPE_INFO[code];
  const href = MW_PAGE_BASE + encodeURIComponent(pageTitle);
  return {
    code,
    fullName: info.fullName,
    alias: info.alias,
    quadra: info.quadra,
    temperament: info.temperament,
    leading: info.leading,
    creative: info.creative,
    overview: overview.slice(0, 500),
    href,
    revId: parsed.revid,
    title: parsed.displaytitle || pageTitle,
  };
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
  const generatedAt = new Date().toISOString();

  // Choose source: mediawiki | github | auto (default)
  const arg = process.argv.find(a => a.startsWith("--source="));
  const source = arg ? arg.split("=")[1] : (process.env.WIKISOCION_SOURCE || "auto");

  let types = [];
  let usedSource = source;
  const typesFromGitHub = async () => {
    const acc = [];
    for (const code of TYPE_CODES) {
      const url = `${base}/${code}.html`;
      const $ = await load(url);
      acc.push(parseType($, code));
    }
    return acc;
  };

  if (source === "github") {
    types = await typesFromGitHub();
  } else if (source === "mediawiki") {
    try {
      const acc = [];
      for (const code of TYPE_CODES) {
        const t = await scrapeTypeViaMediaWiki(code);
        acc.push(t);
        // be gentle
        await delay(120);
      }
      types = acc;
    } catch (e) {
      console.warn(`MediaWiki scrape failed (${e.message}); falling back to GitHub content.`);
      usedSource = "github";
      types = await typesFromGitHub();
    }
  } else {
    // auto: try mediawiki, then fallback
    try {
      const acc = [];
      for (const code of TYPE_CODES) {
        const t = await scrapeTypeViaMediaWiki(code);
        acc.push(t);
        await delay(120);
      }
      types = acc;
      usedSource = "mediawiki";
    } catch (e) {
      console.warn(`Auto mode: MediaWiki unavailable (${e.message}). Using GitHub pages.`);
      usedSource = "github";
      types = await typesFromGitHub();
    }
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
      types: usedSource === "mediawiki" ? `${MW_API} (Action API: parse)` : `${base}/[TYPE].html`,
      relations: "DUAL_PAIRS hardcoded (script)",
      glossary: "Short definitions embedded in script",
    },
  };
  await fs.writeFile(path.join(OUT_DIR, "meta.json"), JSON.stringify(meta, null, 2));
  console.log(`Wrote ${OUT_DIR}/types.json, relations.json, glossary.json, search.json, meta.json`);
}

scrapeAll().catch(e => { console.error(e); process.exit(1); });
