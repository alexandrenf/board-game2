#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const DIST_DIR = path.join(process.cwd(), 'dist', '_expo', 'static', 'js', 'web');
const MAX_WEB_BUNDLE_BYTES = 8 * 1024 * 1024; // 8MB budget

if (!fs.existsSync(DIST_DIR)) {
  console.error('Bundle size check failed: web export directory not found. Run `expo export --platform web` first.');
  process.exit(1);
}

const files = fs.readdirSync(DIST_DIR).filter((file) => file.endsWith('.js'));
if (files.length === 0) {
  console.error('Bundle size check failed: no web JS bundle found.');
  process.exit(1);
}

let hasError = false;
for (const file of files) {
  const fullPath = path.join(DIST_DIR, file);
  const size = fs.statSync(fullPath).size;
  const sizeMb = (size / (1024 * 1024)).toFixed(2);

  console.log(`${file}: ${sizeMb} MB`);

  if (size > MAX_WEB_BUNDLE_BYTES) {
    hasError = true;
    console.error(`Exceeded web bundle budget (${(MAX_WEB_BUNDLE_BYTES / (1024 * 1024)).toFixed(2)} MB): ${file}`);
  }
}

if (hasError) {
  process.exit(1);
}

console.log('Bundle size check passed.');
