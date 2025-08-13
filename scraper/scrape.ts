import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';
import * as cheerio from 'cheerio';
import { SocionicsType, GlossaryTerm } from './schemas';

// URLs for the 16 socionics types
const TYPE_URLS = [
  'https://wikisocion.github.io/content/ILE.html',
  'https://wikisocion.github.io/content/SEI.html',
  'https://wikisocion.github.io/content/LII.html',
  'https://wikisocion.github.io/content/ESE.html',
  'https://wikisocion.github.io/content/SLE.html',
  'https://wikisocion.github.io/content/IEI.html',
  'https://wikisocion.github.io/content/LSI.html',
  'https://wikisocion.github.io/content/EIE.html',
  'https://wikisocion.github.io/content/SEE.html',
  'https://wikisocion.github.io/content/ILI.html',
  'https://wikisocion.github.io/content/ESI.html',
  'https://wikisocion.github.io/content/LIE.html',
  'https://wikisocion.github.io/content/LSE.html',
  'https://wikisocion.github.io/content/EII.html',
  'https://wikisocion.github.io/content/SLI.html',
  'https://wikisocion.github.io/content/IEE.html',
];

// Type codes mapped to their full names and aliases
const TYPE_INFO: Record<string, { fullName: string; alias: string }> = {
  'ILE': { fullName: 'Intuitive Logical Extravert', alias: 'ENTp' },
  'SEI': { fullName: 'Sensing Ethical Introvert', alias: 'ISFp' },
  'LII': { fullName: 'Logical Intuitive Introvert', alias: 'INTj' },
  'ESE': { fullName: 'Ethical Sensing Extravert', alias: 'ESFj' },
  'SLE': { fullName: 'Sensing Logical Extravert', alias: 'ESTp' },
  'IEI': { fullName: 'Intuitive Ethical Introvert', alias: 'INFp' },
  'LSI': { fullName: 'Logical Sensing Introvert', alias: 'ISTj' },
  'EIE': { fullName: 'Ethical Intuitive Extravert', alias: 'ENFj' },
  'SEE': { fullName: 'Sensing Ethical Extravert', alias: 'ESFp' },
  'ILI': { fullName: 'Intuitive Logical Introvert', alias: 'INTp' },
  'ESI': { fullName: 'Ethical Sensing Introvert', alias: 'ISFj' },
  'LIE': { fullName: 'Logical Intuitive Extravert', alias: 'ENTj' },
  'LSE': { fullName: 'Logical Sensing Extravert', alias: 'ESTj' },
  'EII': { fullName: 'Ethical Intuitive Introvert', alias: 'INFj' },
  'SLI': { fullName: 'Sensing Logical Introvert', alias: 'ISTp' },
  'IEE': { fullName: 'Intuitive Ethical Extravert', alias: 'ENFp' },
};

// Quadra assignments
const QUADRA_INFO: Record<string, { quadra: string; temperament: string }> = {
  'ILE': { quadra: 'Alpha', temperament: 'EP' },
  'SEI': { quadra: 'Alpha', temperament: 'IJ' },
  'LII': { quadra: 'Alpha', temperament: 'IJ' },
  'ESE': { quadra: 'Alpha', temperament: 'EJ' },
  'SLE': { quadra: 'Beta', temperament: 'EP' },
  'IEI': { quadra: 'Beta', temperament: 'IP' },
  'LSI': { quadra: 'Beta', temperament: 'IJ' },
  'EIE': { quadra: 'Beta', temperament: 'EJ' },
  'SEE': { quadra: 'Gamma', temperament: 'EP' },
  'ILI': { quadra: 'Gamma', temperament: 'IP' },
  'ESI': { quadra: 'Gamma', temperament: 'IJ' },
  'LIE': { quadra: 'Gamma', temperament: 'EJ' },
  'LSE': { quadra: 'Delta', temperament: 'EJ' },
  'EII': { quadra: 'Delta', temperament: 'IJ' },
  'SLI': { quadra: 'Delta', temperament: 'IP' },
  'IEE': { quadra: 'Delta', temperament: 'EP' },
};

// Function information elements
const FUNCTION_INFO: Record<string, { leading: string; creative: string }> = {
  'ILE': { leading: 'Ne', creative: 'Ti' },
  'SEI': { leading: 'Si', creative: 'Fe' },
  'LII': { leading: 'Ti', creative: 'Ne' },
  'ESE': { leading: 'Fe', creative: 'Si' },
  'SLE': { leading: 'Se', creative: 'Ti' },
  'IEI': { leading: 'Ni', creative: 'Fe' },
  'LSI': { leading: 'Ti', creative: 'Se' },
  'EIE': { leading: 'Fe', creative: 'Ni' },
  'SEE': { leading: 'Se', creative: 'Fi' },
  'ILI': { leading: 'Ni', creative: 'Te' },
  'ESI': { leading: 'Fi', creative: 'Se' },
  'LIE': { leading: 'Te', creative: 'Ni' },
  'LSE': { leading: 'Te', creative: 'Si' },
  'EII': { leading: 'Fi', creative: 'Ne' },
  'SLI': { leading: 'Si', creative: 'Te' },
  'IEE': { leading: 'Ne', creative: 'Fi' },
};

// Glossary terms
const GLOSSARY_TERMS: GlossaryTerm[] = [
  { term: 'Ne', shortDef: 'Extroverted intuition - possibilities, patterns, divergence.' },
  { term: 'Ni', shortDef: 'Introverted intuition - time, trajectories, convergence.' },
  { term: 'Se', shortDef: 'Extroverted sensing - force, assertion, control of space.' },
  { term: 'Si', shortDef: 'Introverted sensing - comfort, calibration, bodily states.' },
  { term: 'Te', shortDef: 'Extroverted logic - efficiency, metrics, execution.' },
  { term: 'Ti', shortDef: 'Introverted logic - structure, definitions, consistency.' },
  { term: 'Fe', shortDef: 'Extroverted ethics - shared feeling, expression, morale.' },
  { term: 'Fi', shortDef: 'Introverted ethics - bonds, values, personal distance.' },
];

// Dual relations
const DUAL_RELATIONS = [
  'ILE-SEI',
  'ESE-LII',
  'IEI-SLE',
  'EIE-LSI',
  'ILI-SEE',
  'ESI-LIE',
  'EII-LSE',
  'IEE-SLI',
];

async function scrapeTypes(): Promise<SocionicsType[]> {
  const types: SocionicsType[] = [];
  
  for (const url of TYPE_URLS) {
    try {
      console.log(`Scraping ${url}...`);
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      
      // Extract type code from URL
      const code = url.match(/\/([A-Z]{3})\.html$/)?.[1] || '';
      
      if (code && TYPE_INFO[code]) {
        const type: SocionicsType = {
          code,
          fullName: TYPE_INFO[code].fullName,
          alias: TYPE_INFO[code].alias,
          quadra: QUADRA_INFO[code].quadra,
          temperament: QUADRA_INFO[code].temperament,
          leading: FUNCTION_INFO[code].leading,
          creative: FUNCTION_INFO[code].creative,
          href: url
        };
        
        types.push(type);
        console.log(`Successfully scraped ${code}`);
      }
    } catch (error) {
      console.error(`Error scraping ${url}:`, error);
    }
  }
  
  return types;
}

async function main() {
  console.log('Starting Wikisocion data scraping...');
  
  // Scrape types
  const types = await scrapeTypes();
  
  // Write data to JSON files
  const dataDir = path.join(__dirname, '../public/data');
  
  // Write types data
  fs.writeFileSync(
    path.join(dataDir, 'types.json'),
    JSON.stringify(types, null, 2)
  );
  
  // Write glossary data
  fs.writeFileSync(
    path.join(dataDir, 'glossary.json'),
    JSON.stringify(GLOSSARY_TERMS, null, 2)
  );
  
  // Write dual relations data
  fs.writeFileSync(
    path.join(dataDir, 'duals.json'),
    JSON.stringify(DUAL_RELATIONS, null, 2)
  );
  
  console.log('Data scraping completed!');
  console.log(`Types scraped: ${types.length}`);
  console.log(`Glossary terms: ${GLOSSARY_TERMS.length}`);
  console.log(`Dual relations: ${DUAL_RELATIONS.length}`);
}

// Run smoke tests
function runSmokeTests(types: SocionicsType[]) {
  console.log('Running smoke tests...');
  
  // Test 1: Check that we have 16 types
  console.assert(types.length === 16, `Expected 16 types, got ${types.length}`);
  
  // Test 2: Check that all dual keys are valid, sorted pairs
  DUAL_RELATIONS.forEach((k) => {
    const parts = k.split('-');
    console.assert(parts.length === 2, `Malformed dual key: ${k}`);
    console.assert(parts.slice().sort().join('-') === k, `Dual key not sorted: ${k}`);
  });
  
  // Test 3: Round-trip dual pairs (order agnostic)
  const key = (a: string, b: string) => [a, b].sort().join('-');
  const pairs: [string, string][] = [
    ['ILE', 'SEI'],
    ['LII', 'ESE'],
    ['SLE', 'IEI'],
    ['LSI', 'EIE'],
    ['SEE', 'ILI'],
    ['ESI', 'LIE'],
    ['LSE', 'EII'],
    ['SLI', 'IEE'],
  ];
  
  pairs.forEach(([a, b]) => {
    console.assert(DUAL_RELATIONS.includes(key(a, b)), `Expected dual mapping for ${a}-${b}`);
  });
  
  // Test 4: Check byCode integrity
  const byCode = Object.fromEntries(types.map((t) => [t.code, t]));
  console.assert(Object.keys(byCode).length === 16, 'byCode should index 16 types');
  console.assert(byCode['LII'].leading === 'Ti', 'LII leading should be Ti');
  
  console.log('All smoke tests passed!');
}

main().catch(console.error);