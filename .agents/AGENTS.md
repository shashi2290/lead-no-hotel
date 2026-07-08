# Pitch Website Project Rules & Workflow

This project is dedicated to building and deploying pitch websites for businesses (leads) without an existing online presence.

## 1. Project Structure
The repository is fully modularized to handle multiple leads:
- `sites/` — Contains individual deployed pitch sites for each lead. Each site is a static HTML/CSS/JS bundle in a folder named after the lead's slug (e.g. `sites/mehta-mri/`).
- `templates/` — Contains base scaffolding templates by business type (e.g. `diagnostic`, `restaurant`, `coaching`).
- `scripts/` — Contains Node.js utilities for scaffolding sites (`new_site.js`) and fetching assets (`scrape_maps.js`).

## 2. Design & Aesthetics Guidelines
- **Visual Identity:** All sites must employ distinctive, intentional, high-contrast visual design. Avoid generic "templated" aesthetics.
- **Typography & Colors:** Use premium serif display faces (e.g., Playfair Display) paired with clean sans-serifs (e.g., DM Sans). Rely on deep, rich color palettes like crimson red against off-white (ink-on-paper style). 
- **Layout:** Rely on plenty of whitespace, bento-grid style galleries, and clean section delineations. Avoid full-width stretched photos unless explicitly styled in a hero grid.
- **Assets:** 
  1. **Real Photos:** Use the `scrape_maps.js` script to fetch real storefront, interior, and signage photos from Google Maps. **Real photos are mandatory** for galleries and hero highlights.
  2. **AI Imagery:** Only use the `generate_image` tool for abstract backgrounds, textures, or generic domain-specific mood accents (e.g., MRI lightboxes, generic luxury restaurant table setups). **Never** use AI to fake real storefronts or exterior signage, and ensure AI images blend cleanly via CSS without bleeding over real photos.

## 3. Scraping Strategy (Assets & Reviews)
Since these sites rely heavily on real social proof and imagery, we extract data directly from the business's Google Maps listing using Puppeteer.

### Bot Bypass & Environment Setup
Google Maps aggressively blocks automated headless scraping. To bypass this on macOS:
1. **Always use `headless: false`** in Puppeteer. 
2. Add necessary stealth arguments (`--no-sandbox`, `--disable-blink-features=AutomationControlled`).
3. Set a standard, modern `User-Agent`.

### Scraping High-Quality Images (Assets)
Do not rely on the DOM for images, as Google Maps uses complex dynamic rendering and small thumbnails.
- **Method:** Intercept network responses.
- **Targets:** Listen for network paths containing `/gps-cs-s/` or `/grass-cs/`.
- **Filtering:** Check the buffer byte-size. Filter out anything under ~5,000 bytes to ensure you are grabbing full-resolution photos rather than small icons or map tiles.
- **Storage:** Save them incrementally (e.g., `photo_1.jpg`, `photo_2.jpg`) into the lead's `assets/maps_photos/` directory.

### Scraping Real Reviews
To populate the `reviews-section` dynamically across any template:
- **Navigation:** Click the "Reviews" tab button (`button[aria-label*="Reviews"]` or similar) on the Maps panel.
- **Extraction:** Target the review containers (e.g., `.jftiEf` or equivalent classes).
- **Data Points:** For each review, extract the `Author Name`, `Star Rating`, and `Review Text`.
- **Integration:** Inject these directly into the `blockquote` structures in the respective template's HTML.

## 4. Workflow for a New Lead

### Step 1: Scaffold the Site
Use the scaffolding script to generate a new site from the appropriate template:
```bash
node scripts/new_site.js <slug> "<Business Name>" <business_type> [place_id]
```
*(Available templates: `diagnostic`, `restaurant`, `coaching`, `retail`, `salon`, `hotel`)*

### Step 2: Fetch and Configure Assets
If the `place_id` was provided in Step 1, the Maps photos will be scraped automatically into `sites/<slug>/assets/maps_photos/`.
- If manual intervention is needed, run `node scripts/scrape_maps.js <place_id> <slug>`. (This runs Puppeteer in non-headless mode to bypass bot detection on macOS).
- Configure the AI accent backgrounds as needed for the specific business type.

### Step 3: Edit and Refine
- Update `sites/<slug>/index.html` to fill in specific details (addresses, phone numbers, domain-specific text).
- Update `sites/<slug>/style.css` if minor layout adjustments are needed (e.g., fixing hero columns or map iframes).

### Step 4: Deploy
Push the repository to the `gh-pages` branch to auto-trigger GitHub Pages deployment:
```bash
git add -A
git commit -m "Add new lead: <slug>"
git push origin main:gh-pages
```

### Step 5: Update the Tracking Sheet
After deployment, manually copy the resulting deployed URL (`https://shashi2290.github.io/lead-no-hotel/sites/<slug>/`) and paste it into the designated column in the master Google Sheet. (Note: MacOS browser subagent cannot perform this autonomously due to local Chrome sandboxing, so output the URL clearly for the user).
