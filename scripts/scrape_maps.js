/**
 * scrape_maps.js — Single-visit Google Maps data fetcher (optimized for photos)
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
    // Strategy 1: Find Photos tab button
    const buttons = document.querySelectorAll('button[role="tab"], button[aria-label*="Photos"], button[aria-label*="photos"]');
    for (const btn of buttons) {
      if (btn.offsetParent !== null && (btn.textContent.toLowerCase().includes('photo') || btn.getAttribute('aria-label')?.toLowerCase().includes('photo'))) {
        btn.click();
        return 'clicked photos tab';
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

async function openPhotoLightbox(page) {
  return page.evaluate(() => {
    // Try to open the lightbox by clicking the first photo in the photo strip
    const imgs = document.querySelectorAll('img[src*="googleusercontent"]');
    for (const img of imgs) {
      let el = img;
      for (let i = 0; i < 8; i++) {
        if (!el.parentElement) break;
        el = el.parentElement;
        if (el.tagName === 'A' && el.href) { el.click(); return 'clicked anchor for lightbox'; }
        if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.getAttribute('jsaction')?.includes('click')) { el.click(); return 'clicked button for lightbox'; }
        if (el.tagName === 'DIV' && (el.onclick || el.getAttribute('jsaction'))) { el.click(); return 'clicked div with handler'; }
      }
    }
    // Direct click on first image
    if (imgs.length > 0) { imgs[0].click(); return 'clicked first img directly'; }
    return 'no images to click';
  });
}

async function clickPhotoStripThumbnails(page) {
  return page.evaluate(() => {
    // Find and click multiple thumbnails in the photo strip to load different full-res images
    const imgs = document.querySelectorAll('img[src*="googleusercontent"]');
    const clicked = [];
    for (const img of imgs) {
      if (clicked.length >= 10) break;
      try {
        img.click();
        clicked.push('clicked thumbnail');
        // Small delay between clicks
        const start = Date.now();
        while (Date.now() - start < 500) {}
      } catch(e) {}
    }
    return `clicked ${clicked.length} thumbnails`;
  });
}

async function navigateGallery(page, maxSteps = 80) {
  // Navigate with arrow keys and occasionally click next button
  for (let i = 0; i < maxSteps; i++) {
    await page.keyboard.press('ArrowRight');
    await sleep(800);
    // Every 10 steps, also try clicking the next button in lightbox
    if (i % 10 === 9) {
      await page.evaluate(() => {
        const nextBtn = document.querySelector('button[aria-label*="Next"], button[aria-label*="next"], button[jsaction*="next"]');
        if (nextBtn) nextBtn.click();
      });
    }
  }
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
      '--disable-web-security',
      '--allow-running-insecure-content',
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
        if (buf.length < 3000) return; // Lower threshold to catch more
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

  // 2. Photos - open lightbox and navigate aggressively
  console.log('\n📸 Opening Photos...');
  const photoTabResult = await clickPhotosTab(page);
  console.log('  ' + photoTabResult);
  await sleep(5000);

  // If lightbox didn't open via tab click, try explicit lightbox opener
  const lightboxResult = await openPhotoLightbox(page);
  console.log('  ' + lightboxResult);
  await sleep(5000);

  // Also try clicking multiple thumbnails in the strip
  const stripResult = await clickPhotoStripThumbnails(page);
  console.log('  ' + stripResult);
  await sleep(5000);

  // Navigate gallery aggressively
  console.log('  Navigating gallery...');
  await navigateGallery(page, 80);
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

  // Save photos - use lower threshold
  console.log('\n💾 Saving photos...');
  const sorted = [...capturedImages.entries()]
    .filter(([, { buf }]) => buf.length > 15000) // Lower threshold
    .sort((a, b) => b[1].buf.length - a[1].buf.length);

  console.log(`  Found ${sorted.length} images >15KB out of ${capturedImages.size} total captures`);

  let count = 0;
  for (const [, { buf }] of sorted) {
    count++;
    const fp = path.join(assetsDir, `photo_${count}.jpg`);
    fs.writeFileSync(fp, buf);
    console.log(`  Saved photo_${count}.jpg (${(buf.length/1024).toFixed(1)} KB)`);
    metadata.photos.push(`photo_${count}.jpg`);
    if (count >= 5) break;
  }

  // Fallback: if still not enough, save the largest from all captures
  if (count < 5) {
    console.log(`  Only got ${count}, saving largest from all captures...`);
    const allSorted = [...capturedImages.entries()]
      .sort((a, b) => b[1].buf.length - a[1].buf.length);
    for (const [, { buf }] of allSorted) {
      // Check if already saved
      if (metadata.photos.includes(`photo_${count+1}.jpg`)) continue;
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