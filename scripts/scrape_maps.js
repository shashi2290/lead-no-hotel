/**
 * scrape_maps.js — Reusable Google Maps photo scraper
 *
 * Usage:
 *   node scripts/scrape_maps.js <place_id> <slug>
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
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
    ],
    defaultViewport: null
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

  const capturedImages = new Map();

  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('googleusercontent.com/')) {
      try {
        const buf = await resp.buffer();
        if (buf.length < 5000) return;
        const id = url.split('/').pop().split('=')[0];
        const existing = capturedImages.get(id);
        if (!existing || buf.length > existing.buf.length) {
          capturedImages.set(id, { buf, url });
          console.log(`  captured (${capturedImages.size}) — ${(buf.length/1024).toFixed(1)} KB`);
        }
      } catch(e) {}
    }
  });

  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
  console.log(`\nOpening Maps: ${mapsUrl}`);
  await page.goto(mapsUrl, { waitUntil: 'networkidle2', timeout: 45000 }).catch(() => {});
  console.log('Page loaded, waiting...');
  await new Promise(r => setTimeout(r, 8000));

  // Try to open photo lightbox by clicking a photo from the overview strip
  const lightboxResult = await page.evaluate(() => {
    // Method 1: Find images in the sidebar photo strip (horizontal scroll)
    const allImgs = document.querySelectorAll('img[src*="googleusercontent"]');
    for (const img of allImgs) {
      let el = img;
      for (let i = 0; i < 8; i++) {
        if (!el.parentElement) break;
        el = el.parentElement;
        if (el.tagName === 'A' && el.href) {
          el.click(); return 'Clicked anchor wrapping img';
        }
        if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.getAttribute('jsaction')?.includes('click')) {
          el.click(); return 'Clicked button/jsaction parent of img';
        }
        if (el.tagName === 'DIV' && (el.onclick || el.getAttribute('jsaction'))) {
          el.click(); return 'Clicked div with handler containing img';
        }
      }
    }
    // Method 2: Try clicking any img directly
    if (allImgs.length > 0) {
      allImgs[0].click();
      return 'Clicked img directly';
    }
    return 'No images found';
  });
  console.log('Lightbox attempt:', lightboxResult);
  await new Promise(r => setTimeout(r, 8000));

  // Navigate gallery with arrows
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('ArrowRight');
    await new Promise(r => setTimeout(r, 1000));
  }

  await new Promise(r => setTimeout(r, 5000));

  // Filter: keep only larger images (over 50 KB = likely higher res)
  const sorted = [...capturedImages.entries()]
    .filter(([, { buf }]) => buf.length > 40000)
    .sort((a, b) => b[1].buf.length - a[1].buf.length);

  console.log(`\nFound ${sorted.length} high-res images out of ${capturedImages.size} total captures`);

  let count = 0;
  for (const [, { buf }] of sorted) {
    count++;
    const fp = path.join(assetsDir, `photo_${count}.jpg`);
    fs.writeFileSync(fp, buf);
    console.log(`Saved photo_${count}.jpg (${(buf.length/1024).toFixed(1)} KB)`);
    if (count >= 5) break;
  }

  // Fallback: if no high-res, save the largest from all captures
  if (count === 0) {
    console.log('No high-res found, saving largest captures...');
    const allSorted = [...capturedImages.entries()]
      .sort((a, b) => b[1].buf.length - a[1].buf.length);
    for (const [, { buf }] of allSorted) {
      count++;
      const fp = path.join(assetsDir, `photo_${count}.jpg`);
      fs.writeFileSync(fp, buf);
      console.log(`Saved photo_${count}.jpg (${(buf.length/1024).toFixed(1)} KB)`);
      if (count >= 5) break;
    }
  }

  console.log(`\nDone. ${count} photos saved.`);
  await browser.close();
})();
