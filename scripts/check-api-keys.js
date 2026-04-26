/**
 * Security Check Script - Prevents API Key Leaks
 * Run this before committing code to ensure no API keys are exposed
 */

const fs = require('fs');
const path = require('path');

// API key patterns to detect
const API_KEY_PATTERNS = [
  /AIzaSy[A-Za-z0-9_-]{33}/g,           // Google API keys
  /sk-[A-Za-z0-9]{48}/g,                 // OpenAI API keys
  /gsk_[A-Za-z0-9]{52}/g,                // Groq API keys
  /csk-[A-Za-z0-9_-]+/g,                 // Cerebras API keys
  /AKIA[0-9A-Z]{16}/g,                   // AWS Access Keys
  /key=[A-Za-z0-9_-]{20,}/g,             // Generic API keys in URLs
  /apikey=[A-Za-z0-9_-]{20,}/g,          // Generic API keys
  /api_key=[A-Za-z0-9_-]{20,}/g,         // Generic API keys
];

// Files and directories to skip
const SKIP_PATTERNS = [
  'node_modules',
  'dist',
  'dist-electron',
  'release',
  '.git',
  '_archive',
  'BLOB',
  '.env.example',
  'check-api-keys.js',
  'securityUtils.ts',  // This file contains masking patterns
];

// File extensions to check
const CHECK_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx', '.json', '.md', '.txt', '.log'];

let foundIssues = false;

function shouldSkip(filePath) {
  return SKIP_PATTERNS.some(pattern => filePath.includes(pattern));
}

function checkFile(filePath) {
  if (shouldSkip(filePath)) return;
  
  const ext = path.extname(filePath);
  if (!CHECK_EXTENSIONS.includes(ext)) return;
  
  try {
    const content = fs.readFileSync(filePath, 'utf8');
    
    API_KEY_PATTERNS.forEach(pattern => {
      const matches = content.match(pattern);
      if (matches) {
        console.error(`\n🚨 SECURITY ALERT: Potential API key found in ${filePath}`);
        matches.forEach(match => {
          console.error(`   Found: ${match.substring(0, 10)}...`);
        });
        foundIssues = true;
      }
    });
  } catch (err) {
    // Skip files that can't be read
  }
}

function scanDirectory(dir) {
  try {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const fullPath = path.join(dir, item);
      
      if (shouldSkip(fullPath)) return;
      
      const stat = fs.statSync(fullPath);
      
      if (stat.isDirectory()) {
        scanDirectory(fullPath);
      } else if (stat.isFile()) {
        checkFile(fullPath);
      }
    });
  } catch (err) {
    // Skip directories that can't be read
  }
}

console.log('🔍 Scanning for exposed API keys...\n');

// Scan the entire project
scanDirectory(process.cwd());

if (foundIssues) {
  console.error('\n❌ SECURITY CHECK FAILED!');
  console.error('API keys were found in your code. Please remove them before committing.');
  console.error('\nRecommendations:');
  console.error('1. Store API keys in .env.local (already in .gitignore)');
  console.error('2. Use environment variables: process.env.VITE_GEMINI_API_KEY');
  console.error('3. Never hardcode API keys in source files');
  console.error('4. Use header-based authentication instead of URL parameters');
  process.exit(1);
} else {
  console.log('✅ No exposed API keys found. Safe to commit!');
  process.exit(0);
}
