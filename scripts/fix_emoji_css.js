const fs = require('fs');
const path = require('path');

const sites = [
  'abhinandan-garden',
  'punjabi-dhaba',
  'rajgharana-palace',
  'uma-adventure',
  'aarambh-family-restaurant',
  'hotel-grand-palace'
];

sites.forEach(site => {
  const cssPath = path.join(__dirname, '..', 'sites', site, 'style.css');
  if (!fs.existsSync(cssPath)) {
    console.log(`⚠️  CSS not found: ${site}`);
    return;
  }
  
  let css = fs.readFileSync(cssPath, 'utf8');
  
  // Fix .svc-num - remove font styling since it contains emojis
  css = css.replace(
    /\.svc-num\s*\{[^}]*font-family:\s*var\(--ff-display\);\s*font-size:\s*2\.2rem;\s*font-weight:\s*900;\s*color:\s*var\(--border\);\s*margin-bottom:\s*\.75rem;\s*line-height:\s*1;\s*letter-spacing:\s*-.02em;\s*\}/g,
    `.svc-num {
  font-size: 2.2rem;
  margin-bottom: .75rem;
  line-height: 1;
}`
  );
  
  // Also handle variant with different spacing
  css = css.replace(
    /\.svc-num\s*\{[^}]*font-family:\s*var\(--ff-display\)[^}]*\}/g,
    `.svc-num {
  font-size: 2.2rem;
  margin-bottom: .75rem;
  line-height: 1;
}`
  );
  
  // Fix .ci-icon - remove any font styling
  css = css.replace(
    /\.ci-icon\s*\{[^}]*font-family:[^}]*\}/g,
    `.ci-icon { font-size: 1.2rem; flex-shrink: 0; margin-top: .1rem; }`
  );
  
  // Fix .badge-hindi - this shouldn't have emojis, but keep as is
  
  // Fix .wl-icon - this contains emojis
  css = css.replace(
    /\.wl-icon\s*\{[^}]*color:\s*var\(--crimson\);[^}]*\}/g,
    `.wl-icon {
  font-size: 1.1rem;
  margin-top: .15rem;
  flex-shrink: 0;
}`
  );
  
  fs.writeFileSync(cssPath, css);
  console.log(`✅ Fixed emoji styling: ${site}/style.css`);
});

console.log('\n✅ All sites fixed!');