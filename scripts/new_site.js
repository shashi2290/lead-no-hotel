#!/usr/bin/env node
/**
 * new_site.js — Scaffold a pitch website for a specific business type
 *
 * Usage:
 *   node scripts/new_site.js <slug> "<Business Name>" <type> [place_id]
 *
 * Types: diagnostic | restaurant | coaching | retail | salon | hotel
 *
 * Examples:
 *   node scripts/new_site.js mehta-mri "Mehta MRI" diagnostic ChIJl4sSfmt0YzkRgOK1Yl6voSc
 *   node scripts/new_site.js sai-dhaba "Sai Dhaba" restaurant ChIJxxxxxxxx
 *   node scripts/new_site.js sharma-classes "Sharma Classes" coaching
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const VALID_TYPES = ['diagnostic', 'restaurant', 'coaching', 'retail', 'salon', 'hotel'];

const [,, slug, businessName, type, placeId] = process.argv;

if (!slug || !businessName || !type) {
  console.error('Usage: node scripts/new_site.js <slug> "<Business Name>" <type> [place_id]');
  console.error(`Types: ${VALID_TYPES.join(' | ')}`);
  process.exit(1);
}

if (!VALID_TYPES.includes(type)) {
  console.error(`❌ Unknown type: "${type}". Valid: ${VALID_TYPES.join(', ')}`);
  process.exit(1);
}

// Validate slug to prevent path traversal and command injection
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`❌ Invalid slug: "${slug}". Use only lowercase letters, numbers, and hyphens.`);
  process.exit(1);
}

// Validate placeId if provided
if (placeId && !/^[a-zA-Z0-9_-]+$/.test(placeId)) {
  console.error(`❌ Invalid place_id: "${placeId}". Use only alphanumeric characters, underscores, and hyphens.`);
  process.exit(1);
}

const siteDir   = path.join(__dirname, '..', 'sites', slug);
const tmplDir   = path.join(__dirname, '..', 'templates', type);

if (fs.existsSync(siteDir)) {
  console.error(`❌ Site already exists: sites/${slug}`);
  process.exit(1);
}

if (!fs.existsSync(tmplDir)) {
  console.error(`❌ Template not found: templates/${type}/`);
  console.error(`   Run: node scripts/init_template.js ${type}`);
  process.exit(1);
}

// Copy template → sites/<slug>
fs.mkdirSync(path.join(siteDir, 'assets', 'maps_photos'), { recursive: true });

const files = fs.readdirSync(tmplDir);
files.forEach(file => {
  const src = path.join(tmplDir, file);
  if (!fs.statSync(src).isFile()) return;
  let content = fs.readFileSync(src, 'utf8');
  content = content
    .replace(/\{\{BUSINESS_NAME\}\}/g, businessName)
    .replace(/\{\{SLUG\}\}/g, slug)
    .replace(/\{\{TYPE\}\}/g, type);
  fs.writeFileSync(path.join(siteDir, file), content);
});

console.log(`✅ Scaffolded: sites/${slug}/`);
console.log(`   Business : ${businessName}`);
console.log(`   Type     : ${type}`);

if (placeId) {
  console.log(`\n🗺  Scraping Maps photos (place_id: ${placeId})...`);
  try {
    execSync('node', [path.join(__dirname, 'scrape_maps.js'), placeId, slug], { stdio: 'inherit' });
  } catch(e) {
    console.log('⚠️  Maps scrape failed — add photos manually to sites/' + slug + '/assets/maps_photos/');
  }
} else {
  console.log('\nℹ️  No place_id. Add photos manually or run:');
  console.log(`   node scripts/scrape_maps.js <place_id> ${slug}`);
}

console.log(`\n📝 Next: edit sites/${slug}/index.html and fill in business details.`);
