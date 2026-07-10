/**
 * scrape_maps.js — Single-visit Google Maps data fetcher (with anti-detection)
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

async function randomSleep(min = 500, max = 1500) {
  return sleep(Math.floor(Math.random() * (max - min + 1)) + min);
}

async function humanType(page, selector, text) {
  await page.click(selector);
  await randomSleep(200, 500);
  for (const char of text) {
    await page.keyboard.type(char, { delay: Math.random() * 200 + 50 });
  }
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

    const addrEl = document.querySelector('[data-item-id="address"]');
    const address = addrEl ? addrEl.textContent.trim() : '';

    const phoneEl = document.querySelector('[data-item-id*="phone"]') || document.querySelector('a[href^="tel:"]');
    const phone = phoneEl ? (phoneEl.textContent.trim() || phoneEl.href?.replace('tel:', '') || '') : '';

    const websiteEl = document.querySelector('a[data-item-id*="authority"]');
    const website = websiteEl ? (websiteEl.href || websiteEl.textContent.trim()) : '';

    const hoursEl = document.querySelector('[data-item-id="oh"]') || document.querySelector('[aria-label*="hours"]') || document.querySelector('[aria-label*="Hours"]');
    const hours = hoursEl ? hoursEl.textContent.trim() : '';

    const ratingEl = document.querySelector('[role="img"][aria-label*="star"]') || document.querySelector('.fontDisplayLarge') || document.querySelector('[jsaction*="rating"]');
    const rating = ratingEl ? (ratingEl.getAttribute('aria-label') || ratingEl.textContent.trim()) : '';

    const reviewCountEl = document.querySelector('button[jsaction*="pane.rating"] span') || document.querySelector('[aria-label*="review"]');
    const reviewCount = reviewCountEl ? reviewCountEl.textContent.trim() : '';

    return { address, phone, website, hours, rating, reviewCount };
  });
}

async function clickPhotosTab(page) {
  return page.evaluate(() => {
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
    if (imgs.length > 0) { imgs[0].click(); return 'clicked first img directly'; }
    return 'no images to click';
  });
}

async function clickPhotoStripThumbnails(page) {
  return page.evaluate(() => {
    const imgs = document.querySelectorAll('img[src*="googleusercontent"]');
    const clicked = [];
    for (const img of imgs) {
      if (clicked.length >= 15) break;
      try {
        img.click();
        clicked.push('clicked thumbnail');
        const start = Date.now();
        while (Date.now() - start < 800) {}
      } catch(e) {}
    }
    return `clicked ${clicked.length} thumbnails`;
  });
}

async function navigateGallery(page, maxSteps = 60) {
  for (let i = 0; i < maxSteps; i++) {
    await page.keyboard.press('ArrowRight');
    await randomSleep(600, 1200);
    if (i % 8 === 7) {
      await page.evaluate(() => {
        const nextBtn = document.querySelector('button[aria-label*="Next"], button[aria-label*="next"], button[jsaction*="next"]');
        if (nextBtn) nextBtn.click();
      });
      await randomSleep(500, 1000);
    }
    // Random mouse movement to appear human
    if (i % 5 === 0) {
      await page.mouse.move(
        Math.random() * 800 + 200,
        Math.random() * 600 + 100
      );
    }
  }
}

async function scrollReviews(page, iterations = 12) {
  for (let i = 0; i < iterations; i++) {
    await page.evaluate(() => {
      const divs = document.querySelectorAll('div[role="feed"]');
      if (divs.length > 0) divs[0].scrollBy(0, 800);
      const containers = document.querySelectorAll('.m6QErb');
      for (const c of containers) {
        if (c.scrollHeight > c.clientHeight) c.scrollBy(0, 600);
      }
    });
    await randomSleep(800, 1500);
  }
  await sleep(3000);
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

async function handleConsent(page) {
  try {
    await page.waitForSelector('form[action*="consent"], button[aria-label*="Accept"], button[aria-label*="accept"]', { timeout: 5000 });
    await page.evaluate(() => {
      const btns = document.querySelectorAll('button');
      for (const btn of btns) {
        if (btn.textContent.toLowerCase().includes('accept') || btn.textContent.toLowerCase().includes('agree')) {
          btn.click();
          return true;
        }
      }
      return false;
    });
    await sleep(2000);
  } catch (e) {}
}

(async () => {
  // Use persistent user data dir to maintain cookies/session
  const userDataDir = path.join(__dirname, '..', '.puppeteer_profile');
  fs.mkdirSync(userDataDir, { recursive: true });

  const browser = await puppeteer.launch({
    headless: false,
    userDataDir,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--allow-running-insecure-content',
      '--disable-features=IsolateOrigins,site-per-process',
      '--window-size=1366,768',
      '--start-maximized'
    ],
    defaultViewport: null,
    ignoreDefaultArgs: ['--enable-automation']
  });

  const page = await browser.newPage();
  
  // Anti-detection: override navigator.webdriver
  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] });
    Object.defineProperty(navigator, 'languages', { get: () => ['en-US', 'en'] });
    window.chrome = { runtime: {} };
  });

  await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
  await page.setExtraHTTPHeaders({ 'Accept-Language': 'en-US,en;q=0.9' });

  page.on('response', async (resp) => {
    const url = resp.url();
    if (url.includes('googleusercontent.com/')) {
      try {
        const buf = await resp.buffer();
        if (buf.length < 3000) return;
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
  await page.goto(mapsUrl, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});
  
  // Handle consent popup if appears
  await handleConsent(page);
  
  console.log('Page loaded, waiting...');
  await randomSleep(8000, 12000);

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

  // 2. Photos - capture from main page without clicking photos tab (to avoid sign-in)
  console.log('\n📸 Capturing photos from main page...');
  // The main page already loads some photos - scroll to trigger more
  await page.evaluate(() => {
    window.scrollBy(0, 500);
  });
  await randomSleep(3000, 5000);
  
  // Try to click on any visible photo thumbnails on main page
  await page.evaluate(() => {
    const imgs = document.querySelectorAll('img[src*="googleusercontent"]');
    for (const img of imgs) {
      if (img.offsetWidth > 100 && img.offsetHeight > 100) {
        img.click();
        return 'clicked visible photo';
      }
    }
    return 'no visible photos to click';
  });
  await randomSleep(4000, 6000);

  // Try to open lightbox from main page
  const lightboxResult = await openPhotoLightbox(page);
  console.log('  ' + lightboxResult);
  await randomSleep(6000, 10000);

  // Click thumbnails in strip
  const stripResult = await clickPhotoStripThumbnails(page);
  console.log('  ' + stripResult);
  await randomSleep(6000, 10000);

  console.log('  Navigating gallery...');
  await navigateGallery(page, 60);
  await randomSleep(5000, 8000);

  // 3. Reviews
  console.log('\n⭐ Opening Reviews...');
  const reviewResult = await clickReviewsTab(page);
  console.log('  ' + reviewResult);
  await randomSleep(4000, 7000);

  await scrollReviews(page, 12);

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
    .filter(([, { buf }]) => buf.length > 15000)
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

  if (count < 5) {
    console.log(`  Only got ${count}, saving largest from all captures...`);
    const allSorted = [...capturedImages.entries()]
      .sort((a, b) => b[1].buf.length - a[1].buf.length);
    for (const [, { buf }] of allSorted) {
      if (metadata.photos.includes(`photo_${count+1}.jpg`)) continue;
      count++;
      const fp = path.join(assetsDir, `photo_${count}.jpg`);
      fs.writeFileSync(fp, buf);
      console.log(`  Saved photo_${count}.jpg (${(buf.length/1024).toFixed(1)} KB)`);
      metadata.photos.push(`photo_${count}.jpg`);
      if (count >= 5) break;
    }
  }

  await saveMetadata();

  console.log(`\n✅ Done. ${count} photos saved.`);
  console.log(`   Metadata: sites/${slug}/assets/metadata.json`);
  await browser.close();
})();