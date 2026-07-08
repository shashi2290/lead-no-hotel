const puppeteer = require('puppeteer');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

function downloadImageFromUrl(url, filepath) {
    return new Promise((resolve, reject) => {
        const lib = url.startsWith('https') ? https : http;
        lib.get(url, { headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' } }, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return downloadImageFromUrl(res.headers.location, filepath).then(resolve).catch(reject);
            }
            if (res.statusCode === 200) {
                res.pipe(fs.createWriteStream(filepath))
                   .on('error', reject)
                   .once('close', () => resolve(filepath));
            } else {
                res.resume();
                reject(new Error(`Status: ${res.statusCode} for ${url.substring(0,80)}`));
            }
        }).on('error', reject);
    });
}

(async () => {
    const browser = await puppeteer.launch({ 
        headless: 'new', 
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--lang=en-US']
    });
    const page = await browser.newPage();
    await page.setViewport({ width: 1440, height: 900 });
    await page.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const allCaptures = new Set();

    // Intercept all responses for googleusercontent images
    page.on('response', async (response) => {
        const url = response.url();
        if (url.includes('googleusercontent.com')) {
            allCaptures.add(url);
        }
    });

    // Use the original search URL that we know works (from earlier successful screenshot)
    const searchUrl = 'https://www.google.com/maps/search/?api=1&query=Mehta%20MRI%20and%20Diagnostics&query_place_id=ChIJl4sSfmt0YzkRgOK1Yl6voSc';
    console.log('Navigating to:', searchUrl);
    await page.goto(searchUrl, { waitUntil: 'networkidle2', timeout: 45000 });
    await new Promise(r => setTimeout(r, 5000));

    await page.screenshot({ path: 'debug_step1.png' });
    console.log('Step 1 screenshot taken');

    // Check what images are on screen already
    let gcUrls = await page.evaluate(() => {
        return Array.from(document.querySelectorAll('img'))
            .map(i => i.src)
            .filter(s => s && s.includes('googleusercontent.com'));
    });
    console.log('Initial googleusercontent images:', gcUrls);

    // Try clicking the place photo (the signboard image we saw before)
    // Look for an img inside the sidebar that has the googleusercontent URL
    if (gcUrls.length > 0) {
        console.log('Clicking the photo to open gallery...');
        await page.evaluate((targetSrc) => {
            const imgs = Array.from(document.querySelectorAll('img'));
            const target = imgs.find(img => img.src === targetSrc);
            if (target) {
                // Click the parent container
                target.click();
                // Also try a nearby clickable ancestor
                let el = target.parentElement;
                for (let i = 0; i < 5; i++) {
                    if (!el) break;
                    if (el.tagName === 'BUTTON' || el.getAttribute('role') === 'button' || el.getAttribute('jsaction')) {
                        el.click();
                        break;
                    }
                    el = el.parentElement;
                }
            }
        }, gcUrls[0]);
        
        await new Promise(r => setTimeout(r, 5000));
        await page.screenshot({ path: 'debug_step2.png' });
        console.log('Step 2 screenshot (after clicking photo)');
        
        // Now check for more googleusercontent images
        gcUrls = await page.evaluate(() => {
            return Array.from(document.querySelectorAll('img'))
                .map(i => i.src)
                .filter(s => s && s.includes('googleusercontent.com'));
        });
        console.log('After click googleusercontent images:', gcUrls);
    }

    // Also look for background images
    const bgUrls = await page.evaluate(() => {
        const results = [];
        document.querySelectorAll('*').forEach(el => {
            const bg = window.getComputedStyle(el).backgroundImage;
            if (bg && bg.includes('googleusercontent')) {
                const match = bg.match(/url\(["']?(https[^"')\s]+)["']?\)/);
                if (match) results.push(match[1]);
            }
        });
        return results;
    });
    console.log('Background images:', bgUrls);

    // Try to scroll and trigger more images
    await page.evaluate(() => {
        const sidebar = document.querySelector('div[role="main"]') || document.querySelector('[data-value="All"]');
        if (sidebar) sidebar.scrollTop += 2000;
    });
    await new Promise(r => setTimeout(r, 3000));

    // Final capture from network + DOM
    const allUrlsList = [...allCaptures, ...gcUrls, ...bgUrls];
    console.log(`\nAll captured URLs (${allUrlsList.length}):`);
    allUrlsList.forEach(u => console.log(' -', u.substring(0, 120)));

    // Download the ones that look like actual photos
    const assetsDir = path.join(__dirname, 'assets', 'maps_photos');
    fs.mkdirSync(assetsDir, { recursive: true });

    let count = 0;
    for (const imgUrl of allUrlsList) {
        if (count >= 5) break;
        // Build big version url
        let bigUrl = imgUrl;
        if (imgUrl.includes('=w')) {
            bigUrl = imgUrl.replace(/=w\d+-h\d+[^&]*/, '=w1200-h900-k-no');
        } else if (!imgUrl.includes('=w')) {
            bigUrl = imgUrl.split('=')[0] + '=w1200-h900-k-no';
        }
        
        try {
            const filepath = path.join(assetsDir, `photo_${count+1}.jpg`);
            await downloadImageFromUrl(bigUrl, filepath);
            const stat = fs.statSync(filepath);
            if (stat.size < 1000) { // too small, skip
                fs.unlinkSync(filepath);
                console.log(`✗ Skipped (too small): ${bigUrl.substring(0,80)}`);
                continue;
            }
            console.log(`✓ Saved photo_${count+1}.jpg (${stat.size} bytes)`);
            count++;
        } catch(e) {
            try {
                const filepath = path.join(assetsDir, `photo_${count+1}.jpg`);
                await downloadImageFromUrl(imgUrl, filepath);
                const stat = fs.statSync(filepath);
                if (stat.size < 1000) {
                    fs.unlinkSync(filepath);
                    continue;
                }
                console.log(`✓ Saved photo_${count+1}.jpg via original url`);
                count++;
            } catch(e2) {
                console.log(`✗ Failed: ${e2.message}`);
            }
        }
    }

    console.log(`\nDone. Downloaded ${count} real photos.`);
    await browser.close();
})();
