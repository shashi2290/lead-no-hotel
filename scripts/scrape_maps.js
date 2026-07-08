/**
 * scrape_maps.js — Reusable Google Maps photo scraper
 *
 * Usage:
 *   node scripts/scrape_maps.js <place_id> <slug>
 *
 * Example:
 *   node scripts/scrape_maps.js ChIJl4sSfmt0YzkRgOK1Yl6voSc mehta-mri
 *
 * Downloads up to 5 real photos from the Maps listing into:
 *   sites/<slug>/assets/maps_photos/photo_1.jpg, photo_2.jpg ...
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const [,, placeId, slug] = process.argv;
if (!placeId || !slug) {
  console.error('Usage: node scripts/scrape_maps.js <place_id> <slug>');
  process.exit(1);
}

const assetsDir = path.join(__dirname, '..', 'sites', slug, 'assets', 'maps_photos');
fs.mkdirSync(assetsDir, { recursive: true });

(async () => {
  const browser = await puppeteer.launch({
    headless: false,
    args: ['--no-sandbox', '--disable-blink-features=AutomationControlled'],
    defaultViewport: null
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

  const capturedImages = new Map(); // baseId -> { buf, url }

  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('googleusercontent.com/gps-cs-s') || url.includes('googleusercontent.com/grass-cs')) {
      try {
        const buf = await resp.buffer();
        if (buf.length < 5000) return;
        const id = url.split('/').pop().split('=')[0];
        const existing = capturedImages.get(id);
        if (!existing || buf.length > existing.buf.length) {
          capturedImages.set(id, { buf, url });
          console.log(`📷 [${capturedImages.size}] captured (${(buf.length/1024).toFixed(1)} KB)`);
        }
      } catch(e) {}
    }
  });

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query_place_id=${placeId}`;
  console.log(`Opening Maps for place_id: ${placeId}`);

  await page.goto(mapsUrl, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  console.log('Waiting 8s for sidebar...');
  await new Promise(r => setTimeout(r, 8000));

  // Click first photo thumbnail
  const clicked = await page.evaluate(() => {
    const imgs = Array.from(document.querySelectorAll('img'));
    const photo = imgs.find(i => i.src && (i.src.includes('gps-cs-s') || i.src.includes('grass-cs')));
    if (photo) {
      let el = photo;
      for (let i = 0; i < 6; i++) {
        if (!el.parentElement) break;
        el = el.parentElement;
        if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button') {
          el.click(); return 'Clicked button';
        }
      }
      photo.click(); return 'Clicked photo';
    }
    return 'No photo found';
  });
  console.log('Gallery:', clicked);

  await new Promise(r => setTimeout(r, 6000));

  // Navigate through gallery
  for (let i = 0; i < 20; i++) {
    await page.keyboard.press('ArrowRight');
    await new Promise(r => setTimeout(r, 1200));
  }

  await new Promise(r => setTimeout(r, 5000));

  // Save all captured
  let count = 0;
  for (const [, { buf }] of capturedImages) {
    count++;
    const fp = path.join(assetsDir, `photo_${count}.jpg`);
    fs.writeFileSync(fp, buf);
    console.log(`✓ Saved photo_${count}.jpg (${(buf.length/1024).toFixed(1)} KB)`);
    if (count >= 5) break;
  }

  console.log(`\n✅ Done. ${count} photos saved to sites/${slug}/assets/maps_photos/`);
  await browser.close();
})();
