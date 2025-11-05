// Runtime data loaders for the app. Provides live Wikisocion fetch with a local JSON fallback.
const TYPE_CODES = [
  "ILE",
  "SEI",
  "LII",
  "ESE",
  "SLE",
  "IEI",
  "LSI",
  "EIE",
  "SEE",
  "ILI",
  "ESI",
  "LIE",
  "LSE",
  "EII",
  "SLI",
  "IEE",
];

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

const TYPE_INFO = {
  ILE: { fullName: "Intuitive Logical Extravert", alias: "ENTp", quadra: "Alpha", temperament: "EP", leading: "Ne", creative: "Ti" },
  SEI: { fullName: "Sensing Ethical Introvert", alias: "ISFp", quadra: "Alpha", temperament: "IJ", leading: "Si", creative: "Fe" },
  LII: { fullName: "Logical Intuitive Introvert", alias: "INTj", quadra: "Alpha", temperament: "IJ", leading: "Ti", creative: "Ne" },
  ESE: { fullName: "Ethical Sensing Extravert", alias: "ESFj", quadra: "Alpha", temperament: "EJ", leading: "Fe", creative: "Si" },
  SLE: { fullName: "Sensing Logical Extravert", alias: "ESTp", quadra: "Beta", temperament: "EP", leading: "Se", creative: "Ti" },
  IEI: { fullName: "Intuitive Ethical Introvert", alias: "INFp", quadra: "Beta", temperament: "IP", leading: "Ni", creative: "Fe" },
  LSI: { fullName: "Logical Sensing Introvert", alias: "ISTj", quadra: "Beta", temperament: "IJ", leading: "Ti", creative: "Se" },
  EIE: { fullName: "Ethical Intuitive Extravert", alias: "ENFj", quadra: "Beta", temperament: "EJ", leading: "Fe", creative: "Ni" },
  SEE: { fullName: "Sensing Ethical Extravert", alias: "ESFp", quadra: "Gamma", temperament: "EP", leading: "Se", creative: "Fi" },
  ILI: { fullName: "Intuitive Logical Introvert", alias: "INTp", quadra: "Gamma", temperament: "IP", leading: "Ni", creative: "Te" },
  ESI: { fullName: "Ethical Sensing Introvert", alias: "ISFj", quadra: "Gamma", temperament: "IJ", leading: "Fi", creative: "Se" },
  LIE: { fullName: "Logical Intuitive Extravert", alias: "ENTj", quadra: "Gamma", temperament: "EJ", leading: "Te", creative: "Ni" },
  LSE: { fullName: "Logical Sensing Extravert", alias: "ESTj", quadra: "Delta", temperament: "EJ", leading: "Te", creative: "Si" },
  EII: { fullName: "Ethical Intuitive Introvert", alias: "INFj", quadra: "Delta", temperament: "IJ", leading: "Fi", creative: "Ne" },
  SLI: { fullName: "Sensing Logical Introvert", alias: "ISTp", quadra: "Delta", temperament: "IP", leading: "Si", creative: "Te" },
  IEE: { fullName: "Intuitive Ethical Extravert", alias: "ENFp", quadra: "Delta", temperament: "EP", leading: "Ne", creative: "Fi" },
};

const DUAL_PAIRS = [
  ["ILE", "SEI"],
  ["LII", "ESE"],
  ["SLE", "IEI"],
  ["LSI", "EIE"],
  ["SEE", "ILI"],
  ["ESI", "LIE"],
  ["LSE", "EII"],
  ["SLI", "IEE"],
];

const DEFAULT_API = "https://wikisocion.net/w/api.php";
const DEFAULT_PAGE_BASE = "https://wikisocion.net/en/index.php?title=";

function getApiBase() {
  const value = import.meta.env?.VITE_WIKISOCION_API;
  if (value && typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return DEFAULT_API;
}

function getPageBase() {
  const value = import.meta.env?.VITE_WIKISOCION_PAGE_BASE;
  if (value && typeof value === "string" && value.trim()) {
    return value.trim();
  }
  return DEFAULT_PAGE_BASE;
}

function extractLeadParagraph(html) {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  const paragraphs = Array.from(doc.querySelectorAll("p"));
  for (const p of paragraphs) {
    const text = p.textContent ? p.textContent.replace(/\s+/g, " ").trim() : "";
    if (text.length >= 60) {
      return text;
    }
  }
  for (const p of paragraphs) {
    const text = p.textContent ? p.textContent.replace(/\s+/g, " ").trim() : "";
    if (text) {
      return text;
    }
  }
  return null;
}

async function fetchType(code) {
  const info = TYPE_INFO[code];
  if (!info) {
    throw new Error(`Unknown type code: ${code}`);
  }
  const pageTitle = TYPE_PAGES[code] || code;
  const api = getApiBase();
  const pageBase = getPageBase();
  const params = new URLSearchParams({
    action: "parse",
    page: pageTitle,
    prop: "text|displaytitle|revid",
    format: "json",
    formatversion: "2",
    redirects: "true",
    origin: "*",
  });
  const response = await fetch(`${api}?${params.toString()}`);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} while fetching ${pageTitle}`);
  }
  const json = await response.json();
  const parsed = json?.parse;
  if (!parsed || !parsed.text) {
    throw new Error(`No parse data returned for ${pageTitle}`);
  }
  const overview = extractLeadParagraph(parsed.text) || "Socionics type description.";
  const href = `${pageBase}${encodeURIComponent(pageTitle)}`;
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

function buildGlossary() {
  const glossaryDefinitions = {
    Ne: "Extroverted intuition - possibilities, patterns, divergence.",
    Ni: "Introverted intuition - time, trajectories, convergence.",
    Se: "Extroverted sensing - force, assertion, control of space.",
    Si: "Introverted sensing - comfort, calibration, bodily states.",
    Te: "Extroverted logic - efficiency, metrics, execution.",
    Ti: "Introverted logic - structure, definitions, consistency.",
    Fe: "Extroverted ethics - shared feeling, expression, morale.",
    Fi: "Introverted ethics - bonds, values, personal distance.",
  };
  return Object.entries(glossaryDefinitions).map(([term, shortDef]) => ({
    term,
    shortDef,
  }));
}

function buildRelations() {
  return DUAL_PAIRS.map(([a, b]) => ({
    a,
    b,
    name: "Duality",
    summary: "Complementary strengths; easy role division; watch for over-reliance on partner's valued elements.",
  }));
}

function buildSearchEntries(types, glossary) {
  const entries = [];
  if (Array.isArray(types)) {
    for (const t of types) {
      const hay = [
        t.code,
        t.fullName,
        t.alias,
        t.quadra,
        t.temperament,
        t.leading,
        t.creative,
      ]
        .join(" ")
        .toLowerCase();
      entries.push({
        kind: "type",
        id: t.code,
        code: t.code,
        fullName: t.fullName,
        alias: t.alias,
        haystack: hay,
      });
    }
  }
  if (Array.isArray(glossary)) {
    for (const g of glossary) {
      const hay = [g.term, g.shortDef].join(" ").toLowerCase();
      entries.push({
        kind: "gloss",
        id: g.term,
        term: g.term,
        shortDef: g.shortDef,
        haystack: hay,
      });
    }
  }
  return entries;
}

async function fetchJson(path) {
  const res = await fetch(path);
  if (!res.ok) {
    throw new Error(`Failed to fetch ${path} (${res.status})`);
  }
  return res.json();
}

async function fetchOptionalJson(path) {
  const res = await fetch(path);
  if (!res.ok) {
    return null;
  }
  try {
    return await res.json();
  } catch (err) {
    console.warn(`Failed to parse optional JSON at ${path}: ${err.message}`);
    return null;
  }
}

export async function fetchLiveWikisocionData() {
  const types = await Promise.all(TYPE_CODES.map((code) => fetchType(code)));
  const glossary = buildGlossary();
  const relations = buildRelations();
  const search = buildSearchEntries(types, glossary);
  const meta = {
    generatedAt: new Date().toISOString(),
    mode: "live",
    sources: {
      types: `${getApiBase()} (Action API: parse)`,
      relations: "DUAL_PAIRS hardcoded on client",
      glossary: "In-app IE definitions",
    },
  };
  return { types, glossary, relations, meta, search };
}

export async function fetchLocalData() {
  const [types, glossary, relations] = await Promise.all([
    fetchJson("data/types.json"),
    fetchJson("data/glossary.json"),
    fetchJson("data/relations.json"),
  ]);
  const metaJson = await fetchOptionalJson("data/meta.json");
  const searchJson = await fetchOptionalJson("data/search.json");
  const search = Array.isArray(searchJson?.entries)
    ? searchJson.entries
    : buildSearchEntries(types, glossary);
  const meta = metaJson
    ? { ...metaJson, mode: metaJson.mode || "local" }
    : { mode: "local" };
  return {
    types,
    glossary,
    relations,
    meta,
    search,
  };
}
