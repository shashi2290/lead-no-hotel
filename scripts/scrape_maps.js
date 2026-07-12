/**
 * scrape_maps.js — Single-visit Google Maps data fetcher (with anti-detection)
 *
 * Usage:
 *   node scripts/scrape_maps.js <place_id> <slug>
 *
 * Fetches ALL data in ONE visit:
 *   - Business metadata (address, phone, hours, website, rating, review count)
 *   - Up to 5 high-res photos → sites/<slug>/assets/maps_photos/photo_N.jpg
 *   - Up to 5 real reviews (from "More reviews" button on main page)
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

// Validate slug to prevent path traversal
if (!/^[a-z0-9-]+$/.test(slug)) {
  console.error(`❌ Invalid slug: "${slug}". Use only lowercase letters, numbers, and hyphens.`);
  process.exit(1);
}

// Validate placeId format
if (!/^[a-zA-Z0-9_-]+$/.test(placeId)) {
  console.error(`❌ Invalid place_id: "${placeId}". Unexpected characters.`);
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
let enoughPhotos = false;

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function randomSleep(min = 500, max = 1500) {
  return sleep(Math.floor(Math.random() * (max - min + 1)) + min);
}

async function extractMetadata(page) {
  return page.evaluate(() => {
    const getText = (sel) => {
      const el = document.querySelector(sel);
      return el ? el.textContent.trim() : '';
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
    if (enoughPhotos) {
      console.log('  Enough photos captured, stopping gallery navigation');
      break;
    }
    await page.keyboard.press('ArrowRight');
    await randomSleep(600, 1200);
    if (i % 8 === 7) {
      await page.evaluate(() => {
        const nextBtn = document.querySelector('button[aria-label*="Next"], button[aria-label*="next"], button[jsaction*="next"]');
        if (nextBtn) nextBtn.click();
      });
      await randomSleep(500, 1000);
    }
    if (i % 5 === 0) {
      await page.mouse.move(
        Math.random() * 800 + 200,
        Math.random() * 600 + 100
      );
    }
  }
}

async function clickMoreReviews(page) {
  return page.evaluate(() => {
    // Find "More reviews" or "All reviews" button on main page
    const selectors = [
      'button[jsaction*="pane.rating.moreReviews"]',
      'button[jsaction*="review.more"]',
      'button[aria-label*="More reviews" i]',
      'button[aria-label*="All reviews" i]',
      'a[href*="review"]',
      'button:has-text("More reviews")',
      'button:has-text("All reviews")',
      'span:has-text("More reviews")',
      'span:has-text("All reviews")'
    ];
    
    for (const sel of selectors) {
      try {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.offsetParent !== null) {
            el.click();
            return `clicked more reviews via ${sel}`;
          }
        }
      } catch(e) {}
    }
    
    // Fallback: search for any clickable element with "review" text
    const clickables = document.querySelectorAll('button, a, span[role="button"], div[role="button"]');
    for (const el of clickables) {
      const text = (el.textContent || '').toLowerCase();
      if ((text.includes('more review') || text.includes('all review') || text.includes('view all review')) && el.offsetParent !== null) {
        el.click();
        return 'clicked more reviews via text search';
      }
    }
    
    return 'no more reviews button found';
  });
}

async function scrollReviewsList(page, iterations = 10) {
  for (let i = 0; i < iterations; i++) {
    await page.evaluate(() => {
      // Scroll the reviews dialog/list
      const dialogs = document.querySelectorAll('[role="dialog"]');
      for (const d of dialogs) {
        if (d.scrollHeight > d.clientHeight) d.scrollBy(0, 1500);
      }
      const feedDivs = document.querySelectorAll('div[role="feed"]');
      feedDivs.forEach(d => d.scrollBy(0, 1500));
      const containers = document.querySelectorAll('.m6QErb, .review-list, [jsaction*="review"]');
      for (const c of containers) {
        if (c.scrollHeight > c.clientHeight) c.scrollBy(0, 1500);
      }
    });
    await randomSleep(1000, 2000);
  }
  await sleep(2000);
}

async function extractReviews(page) {
  return page.evaluate(() => {
    const results = [];
    
    // Try multiple selectors for review items - works both in dialog and main page
    const reviewSelectors = [
      '.jftiEf',           // Classic
      '[data-review-id]',  // Newer
      '.review-item',      // Alternative
      '.gws-localreviews__review', // Another variant
      'div[jsaction*="review"]',   // JS action based
      '.MyEned'            // In dialog
    ];
    
    let items = [];
    for (const sel of reviewSelectors) {
      items = document.querySelectorAll(sel);
      if (items.length > 0) break;
    }
    
    // If still no items, try finding all elements with review-like structure
    if (items.length === 0) {
      const allDivs = document.querySelectorAll('div');
      items = Array.from(allDivs).filter(div => {
        const text = div.textContent || '';
        return text.length > 50 && text.length < 3000 && 
               (div.querySelector('[aria-label*="star"]') || div.querySelector('[role="img"][aria-label*="star"]'));
      });
    }
    
    items.forEach(item => {
      // Try multiple selectors for name
      const nameEl = item.querySelector('.d4r55') || 
                     item.querySelector('[class*="name"]') ||
                     item.querySelector('.TSUbDb') ||
                     item.querySelector('.WNxHhc') ||
                     item.querySelector('span[class*="font"]') ||
                     item.querySelector('div[class*="font"]');
      
      // Try multiple selectors for stars
      const starsEl = item.querySelector('.kvMYJc') ||
                      item.querySelector('[role="img"][aria-label*="star"]') ||
                      item.querySelector('[aria-label*="star"]');
      
      // Try multiple selectors for text
      const textEl = item.querySelector('.wiI7pd') ||
                     item.querySelector('.MyEned') ||
                     item.querySelector('[class*="comment"]') ||
                     item.querySelector('[jsaction*="review"]') ||
                     item.querySelector('span[style*="font"]');
      
      const name = nameEl ? nameEl.textContent.trim() : '';
      const stars = starsEl ? (starsEl.getAttribute('aria-label') || starsEl.textContent.trim()) : '';
      const text = textEl ? textEl.textContent.trim() : '';
      
      // Filter out non-review content
      if (text && text.length > 10 && text.length < 3000) {
        results.push({ name, stars, text });
      }
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
  const userDataDir = path.join(__dirname, '..', '.puppeteer_profile');
  fs.mkdirSync(userDataDir, { recursive: true });

  // ⚠️  SECURITY NOTE: The flags below intentionally weaken browser security to
  // bypass Google Maps anti-bot detection (--no-sandbox, --disable-web-security,
  // --allow-running-insecure-content, --disable-features=IsolateOrigins).
  // These are necessary for the scraper to function, but the browser should
  // only navigate to trusted URLs (google.com/maps). Do not add generic
  // web browsing to this script.
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

  // Track pages to prevent multiple tabs
  const pages = await browser.pages();
  const page = pages[0] || await browser.newPage();
  
  // Close any extra pages
  if (pages.length > 1) {
    for (let i = 1; i < pages.length; i++) {
      await pages[i].close();
    }
  }
  
  // Listen for new pages and close them
  browser.on('targetcreated', async (target) => {
    const newPage = await target.page();
    if (newPage && newPage !== page) {
      console.log('  ⚠️  New tab detected, closing...');
      await newPage.close();
    }
  });
  
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
        // Validate content-type is an image before capturing
        const contentType = resp.headers()['content-type'] || '';
        if (!contentType.startsWith('image/')) return;
        
        const buf = await resp.buffer();
        if (buf.length < 3000) return;
        const id = url.split('/').pop().split('=')[0];
        const existing = capturedImages.get(id);
        if (!existing || buf.length > existing.buf.length) {
          capturedImages.set(id, { buf, url });
          console.log(`  captured (${capturedImages.size}) — ${(buf.length/1024).toFixed(1)} KB`);
          
          // Check if we have 5 photos > 50KB each
          const goodPhotos = [...capturedImages.values()].filter(v => v.buf.length > 50000);
          if (goodPhotos.length >= 5) {
            enoughPhotos = true;
            console.log('  ✅ Got 5 good photos, will stop after current batch');
          }
        }
      } catch(e) {}
    }
  });

  const mapsUrl = `https://www.google.com/maps/place/?q=place_id:${placeId}`;
  console.log(`\n🗺️  Opening Maps: ${mapsUrl}`);
  await page.goto(mapsUrl, { waitUntil: 'networkidle2', timeout: 90000 }).catch(() => {});
  
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

  // 2. PHOTOS - Stay on main page, capture from photo strip
  console.log('\n📸 Capturing photos from main page...');
  await page.evaluate(() => window.scrollBy(0, 500));
  await randomSleep(3000, 5000);
  
  // Click first visible photo to open lightbox
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

  // Open lightbox properly
  const lightboxResult = await openPhotoLightbox(page);
  console.log('  ' + lightboxResult);
  await randomSleep(5000, 8000);

  // Click thumbnails in strip
  const stripResult = await clickPhotoStripThumbnails(page);
  console.log('  ' + stripResult);
  await randomSleep(5000, 8000);

  // Navigate gallery with arrow keys
  console.log('  Navigating gallery...');
  await navigateGallery(page, 50);
  await randomSleep(3000, 5000);

  // Close lightbox if open (press Escape)
  await page.keyboard.press('Escape');
  await randomSleep(1000, 2000);

  // 3. REVIEWS - Click "More reviews" button on main page (not reviews tab)
  console.log('\n⭐ Opening reviews via "More reviews" button...');
  const moreReviewsResult = await clickMoreReviews(page);
  console.log('  ' + moreReviewsResult);
  await randomSleep(4000, 7000);

  // Wait for reviews to load
  await page.waitForSelector('.jftiEf, [data-review-id], .review-item, [jsaction*="review"], div[role="feed"], .MyEned', { timeout: 15000 }).catch(() => {});
  
  console.log('  Scrolling reviews...');
  await scrollReviewsList(page, 10);

  console.log('\n📝 Extracting reviews...');
  const reviews = await extractReviews(page);
  metadata.reviews = reviews.slice(0, 5);
  console.log(`  Found ${reviews.length} reviews, keeping ${metadata.reviews.length}`);
  metadata.reviews.forEach((r, i) => {
    console.log(`  [${i+1}] ${r.name} — ${r.stars}`);
    console.log(`       "${r.text.substring(0, 100)}..."`);
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

  console.log(`\n✅ Done. ${count} photos saved, ${metadata.reviews.length} reviews extracted.`);
  console.log(`   Metadata: sites/${slug}/assets/metadata.json`);
  await browser.close();
})();