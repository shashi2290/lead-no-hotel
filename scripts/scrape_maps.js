/**
 * scrape_maps.js — Single-visit Google Maps data fetcher
 *
 * Usage:
 *   node scripts/scrape_maps.js <place_id> <slug>
 *
 * Fetches ALL data in ONE visit:
 *   - Business metadata (address, phone, hours, website, rating, review count)
 *   - Up to 5 high-res photos → sites/<slug>/assets/maps_photos/photo_N.jpg
 *   - Up to 5 real reviews
 *   - Saves metadata.json with all extracted data
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const [,, placeId, slug] = process.argv;
if (!placeId || !slug) {
  console.error('Usage: node scripts/scrape_maps.js <place_id> <slug>');
  process.exit(1);
}

const siteDir = path.join(__dirname, '..', 'sites', slug);
const assetsDir = path.join(siteDir, 'assets', 'maps_photos');
fs.mkdirSync(assetsDir, { recursive: true });

const metadata = {
  placeId,
  slug,
  address: '',
  phone: '',
  hours: '',
  website: '',
  rating: '',
  reviewCount: '',
  photos: [],
  reviews: [],
  scrapedAt: new Date().toISOString()
};

const capturedImages = new Map();

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function extractMetadata(page) {
  return page.evaluate(() => {
    const getText = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.textContent.trim() : '';
    };
    const getHref = (sel) => {
      const el = document.querySelector(sel);
      return el ? (el.href || el.getAttribute('href') || '') : '';
    };

    // Address
    const addrEl = document.querySelector('[data-item-id="address"]');
    const address = addrEl ? addrEl.textContent.trim() : '';

    // Phone
    const phoneEl = document.querySelector('[data-item-id*="phone"]') || document.querySelector('a[href^="tel:"]');
    const phone = phoneEl ? (phoneEl.textContent.trim() || phoneEl.href?.replace('tel:', '') || '') : '';

    // Website
    const websiteEl = document.querySelector('a[data-item-id*="authority"]');
    const website = websiteEl ? (websiteEl.href || websiteEl.textContent.trim()) : '';

    // Hours
    const hoursEl = document.querySelector('[data-item-id="oh"]') || document.querySelector('[aria-label*="hours"]') || document.querySelector('[aria-label*="Hours"]');
    const hours = hoursEl ? hoursEl.textContent.trim() : '';

    // Rating
    const ratingEl = document.querySelector('[role="img"][aria-label*="star"]') || document.querySelector('.fontDisplayLarge') || document.querySelector('[jsaction*="rating"]');
    const rating = ratingEl ? (ratingEl.getAttribute('aria-label') || ratingEl.textContent.trim()) : '';

    // Review count
    const reviewCountEl = document.querySelector('button[jsaction*="pane.rating"] span') || document.querySelector('[aria-label*="review"]');
    const reviewCount = reviewCountEl ? reviewCountEl.textContent.trim() : '';

    return { address, phone, website, hours, rating, reviewCount };
  });
}

async function clickPhotosTab(page) {
  return page.evaluate(() => {
    // Find and click the Photos tab/button
    const buttons = document.querySelectorAll('button[role="tab"], button[aria-label*="Photos"], button[aria-label*="photos"]');
    for (const btn of buttons) {
      if (btn.offsetParent !== null && (btn.textContent.toLowerCase().includes('photo') || btn.getAttribute('aria-label')?.toLowerCase().includes('photo'))) {
        btn.click();
        return 'clicked photos tab';
      }
    }
    // Fallback: try clicking an image in the photo strip
    const imgs = document.querySelectorAll('img[src*="googleusercontent"]');
    for (const img of imgs) {
      let el = img;
      for (let i = 0; i < 6; i++) {
        if (!el.parentElement) break;
        el = el.parentElement;
        if (el.tagName === 'A' && el.href) { el.click(); return 'clicked anchor wrapping img'; }
        if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.getAttribute('jsaction')?.includes('click')) { el.click(); return 'clicked button parent of img'; }
      }
    }
    return 'no photos tab found';
  });
}

async function clickReviewsTab(page) {
  return page.evaluate(() => {
    const buttons = document.querySelectorAll('button[role="tab"], button[aria-label*="Reviews"], button[aria-label*="reviews"]');
    for (const btn of buttons) {
      if (btn.offsetParent !== null && (btn.textContent.toLowerCase().includes('review') || btn.getAttribute('aria-label')?.toLowerCase().includes('review'))) {
        btn.click();
        return 'clicked reviews tab';
      }
    }
    return 'no reviews tab found';
  });
}

async function scrollReviews(page, iterations = 15) {
  for (let i = 0; i < iterations; i++) {
    await page.evaluate(() => {
      const divs = document.querySelectorAll('div[role="feed"]');
      if (divs.length > 0) divs[0].scrollBy(0, 800);
      const containers = document.querySelectorAll('.m6QErb');
      for (const c of containers) {
        if (c.scrollHeight > c.clientHeight) c.scrollBy(0, 600);
      }
    });
    await sleep(600);
  }
  await sleep(2000);
}

async function extractReviews(page) {
  return page.evaluate(() => {
    const items = document.querySelectorAll('.jftiEf');
    const results = [];
    items.forEach(item => {
      const nameEl = item.querySelector('.d4r55');
      const starsEl = item.querySelector('.kvMYJc');
      const textEl = item.querySelector('.wiI7pd');
      const name = nameEl ? nameEl.textContent.trim() : '';
      const stars = starsEl ? starsEl.getAttribute('aria-label') : '';
      const text = textEl ? textEl.textContent.trim() : '';
      if (text) results.push({ name, stars, text });
    });
    return results;
  });
}

async function saveMetadata() {
  const fp = path.join(siteDir, 'assets', 'metadata.json');
  fs.writeFileSync(fp, JSON.stringify(metadata, null, 2));
  console.log(`\n📄 Saved metadata.json`);
}

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
  console.log(`\n🗺️  Opening Maps: ${mapsUrl}`);
  await page.goto(mapsUrl, { waitUntil: 'networkidle2', timeout: 60000 }).catch(() => {});
  console.log('Page loaded, waiting...');
  await sleep(8000);

  // 1. Extract metadata from main page
  console.log('\n📋 Extracting business metadata...');
  const meta = await extractMetadata(page);
  metadata.address = meta.address;
  metadata.phone = meta.phone;
  metadata.website = meta.website;
  metadata.hours = meta.hours;
  metadata.rating = meta.rating;
  metadata.reviewCount = meta.reviewCount;
  console.log(`  Address: ${meta.address || 'N/A'}`);
  console.log(`  Phone: ${meta.phone || 'N/A'}`);
  console.log(`  Website: ${meta.website || 'N/A'}`);
  console.log(`  Hours: ${meta.hours || 'N/A'}`);
  console.log(`  Rating: ${meta.rating || 'N/A'}`);
  console.log(`  Reviews: ${meta.reviewCount || 'N/A'}`);

  // 2. Photos
  console.log('\n📸 Opening Photos...');
  const photoResult = await clickPhotosTab(page);
  console.log('  ' + photoResult);
  await sleep(8000);

  // Navigate gallery with arrows
  for (let i = 0; i < 40; i++) {
    await page.keyboard.press('ArrowRight');
    await sleep(1000);
  }
  await sleep(5000);

  // 3. Reviews
  console.log('\n⭐ Opening Reviews...');
  const reviewResult = await clickReviewsTab(page);
  console.log('  ' + reviewResult);
  await sleep(3000);

  await scrollReviews(page, 15);

  console.log('\n📝 Extracting reviews...');
  const reviews = await extractReviews(page);
  metadata.reviews = reviews.slice(0, 5);
  console.log(`  Found ${reviews.length} reviews, keeping ${metadata.reviews.length}`);
  metadata.reviews.forEach((r, i) => {
    console.log(`  [${i+1}] ${r.name} — ${r.stars}`);
  });

  // Save photos
  console.log('\n💾 Saving photos...');
  const sorted = [...capturedImages.entries()]
    .filter(([, { buf }]) => buf.length > 40000)
    .sort((a, b) => b[1].buf.length - a[1].buf.length);

  console.log(`  Found ${sorted.length} high-res images out of ${capturedImages.size} total captures`);

  let count = 0;
  for (const [, { buf }] of sorted) {
    count++;
    const fp = path.join(assetsDir, `photo_${count}.jpg`);
    fs.writeFileSync(fp, buf);
    console.log(`  Saved photo_${count}.jpg (${(buf.length/1024).toFixed(1)} KB)`);
    metadata.photos.push(`photo_${count}.jpg`);
    if (count >= 5) break;
  }

  // Fallback: if no high-res, save the largest from all captures
  if (count === 0) {
    console.log('  No high-res found, saving largest captures...');
    const allSorted = [...capturedImages.entries()]
      .sort((a, b) => b[1].buf.length - a[1].buf.length);
    for (const [, { buf }] of allSorted) {
      count++;
      const fp = path.join(assetsDir, `photo_${count}.jpg`);
      fs.writeFileSync(fp, buf);
      console.log(`  Saved photo_${count}.jpg (${(buf.length/1024).toFixed(1)} KB)`);
      metadata.photos.push(`photo_${count}.jpg`);
      if (count >= 5) break;
    }
  }

  // Save metadata
  await saveMetadata();

  console.log(`\n✅ Done. ${count} photos saved.`);
  console.log(`   Metadata: sites/${slug}/assets/metadata.json`);
  await browser.close();
})();