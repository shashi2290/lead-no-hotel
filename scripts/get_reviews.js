const puppeteer = require('puppeteer');
const [,, placeId] = process.argv;

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  const page = await browser.newPage();
  await page.goto(`https://www.google.com/maps/place/?q=place_id:${placeId}`, { waitUntil: 'networkidle2' });

  // Click on "Reviews" tab
  try {
    const reviewsTab = await page.waitForSelector('button[aria-label*="Reviews"]', { timeout: 10000 });
    await reviewsTab.click();
    await new Promise(r => setTimeout(r, 5000));
  } catch (e) {
    console.error('Could not find reviews tab');
  }

  const reviews = await page.evaluate(() => {
    const reviewEls = document.querySelectorAll('.jftiEf');
    return Array.from(reviewEls).map(el => {
      const author = el.querySelector('.d4r55')?.innerText;
      const text = el.querySelector('.wi7761')?.innerText;
      const rating = el.querySelector('.kvMYyc')?.getAttribute('aria-label');
      return { author, text, rating };
    }).filter(r => r.author && r.text);
  });

  console.log(JSON.stringify(reviews, null, 2));
  await browser.close();
})();
