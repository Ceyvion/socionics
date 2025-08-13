// Type schema
export interface SocionicsType {
  code: string;          // e.g., "ILE"
  fullName: string;      // e.g., "Intuitive Logical Extravert"
  alias: string;         // e.g., "ENTp"
  quadra: string;        // e.g., "Alpha"
  temperament: string;   // e.g., "EP"
  leading: string;       // e.g., "Ne"
  creative: string;      // e.g., "Ti"
  href: string;          // e.g., "https://wikisocion.github.io/content/ILE.html"
}

// Glossary term schema
export interface GlossaryTerm {
  term: string;          // e.g., "Ne"
  shortDef: string;      // e.g., "Extroverted intuition - possibilities, patterns, divergence."
}

// Relation schema (duals for MVP)
export type DualRelation = string; // e.g., "ILE-SEI"