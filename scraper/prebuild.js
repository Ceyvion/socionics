#!/usr/bin/env node

// Prebuild hook to refresh data before building
import { execSync } from 'child_process';
import { existsSync } from 'fs';

console.log('Running prebuild data refresh...');

try {
  // Check if scraper dependencies are installed
  if (!existsSync('node_modules/cheerio') || !existsSync('node_modules/axios')) {
    console.log('Installing scraper dependencies...');
    execSync('npm install cheerio axios', { stdio: 'inherit' });
  }
  
  // Run the scraper
  console.log('Scraping Wikisocion data...');
  execSync('npm run scrape', { stdio: 'inherit' });
  
  console.log('Data refresh completed successfully!');
} catch (error) {
  console.error('Error during prebuild data refresh:', error);
  process.exit(1);
}