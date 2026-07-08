# Pitch Website Project Rules & Workflow

This project is dedicated to building and deploying pitch websites for businesses (leads) without an existing online presence.

## 1. Project Structure
The repository is modularized to handle multiple leads:
- `sites/` — Contains individual deployed pitch sites for each lead. Each site is a static HTML/CSS/JS bundle in a folder named after the lead's slug (e.g. `sites/mehta-mri/`).
- `templates/` — Contains base scaffolding templates by business type (e.g. `diagnostic`, `restaurant`, `coaching`).
- `scripts/` — Contains Node.js utilities for scaffolding sites (`new_site.js`) and fetching assets (`scrape_maps.js`).

## 2. Design & Aesthetics Guidelines
- **Visual Identity:** All sites must employ distinctive, intentional, high-contrast visual design. Avoid generic "templated" aesthetics.
- **Typography & Colors:** Use premium serif display faces (e.g., Playfair Display) paired with clean sans-serifs (e.g., DM Sans). Rely on deep, rich color palettes like crimson red against off-white (ink-on-paper style). 
- **Layout:** Rely on plenty of whitespace, bento-grid style galleries, and clean section delineations. Avoid full-width stretched photos unless explicitly styled in a hero grid.

## 3. Media Assets & Reviews

### Scraping Google Maps (Real Assets)
Google Maps aggressively blocks automated headless scraping. To bypass this on macOS:
1. **Always use `headless: false`** in Puppeteer inside the `scripts/scrape_maps.js` script. 
2. **Fresh Session:** Do NOT attach to or use the user's active Chrome session. Always spawn a fresh, separate browser window for scraping and debugging so it doesn't disrupt their work.
3. Add necessary stealth arguments (`--no-sandbox`, `--disable-blink-features=AutomationControlled`).
4. Set a standard, modern `User-Agent`.
4. **Method:** Intercept network responses. Listen for network paths containing `/gps-cs-s/` or `/grass-cs/`.
5. **Filtering:** Check the buffer byte-size. Filter out anything under ~5,000 bytes to ensure you are grabbing full-resolution photos rather than small icons or map tiles.
6. **Storage:** Save them incrementally (e.g., `photo_1.jpg`, `photo_2.jpg`) into the lead's `assets/maps_photos/` directory.

### AI Generated Images
- Only use the `generate_image` tool for abstract backgrounds, textures, or generic domain-specific mood accents (e.g., MRI lightboxes, generic luxury restaurant table setups, clinic receptions). 
- **Never** use AI to fake real storefronts or exterior signage. 
- Ensure AI images blend cleanly via standard CSS (no weird overlays bleeding over real photos).

### Extracting Real Reviews
To populate the `reviews-section` dynamically across any template:
- Navigate to the Google Maps URL and click the "Reviews" tab button (`button[aria-label*="Reviews"]` or similar).
- Extract the text from the review containers (e.g., `.jftiEf` or equivalent classes).
- Grab the `Author Name`, `Star Rating`, and `Review Text`.
- Inject these manually or programmatically into the `blockquote` structures in the respective template's HTML.

## 4. Workflow for a New Lead

### Step 1: Scaffold the Site & Select Template
Identify the type of business (diagnostic, restaurant, coaching, etc.). Use the scaffolding script to generate a new site from the appropriate template folder:
```bash
node scripts/new_site.js <slug> "<Business Name>" <business_type> [place_id]
```
*(Available templates in `templates/`: `diagnostic`, `restaurant`, `coaching`, etc.)*

### Step 2: Fetch and Configure Assets
If the `place_id` was provided in Step 1, the Maps photos will be scraped automatically into `sites/<slug>/assets/maps_photos/`.
- If manual intervention is needed, run `node scripts/scrape_maps.js <place_id> <slug>`. 
- Call the `generate_image` tool to create domain-specific AI assets (like backgrounds or accents) and place them in the `assets/` folder.

### Step 3: Edit and Refine
- Update `sites/<slug>/index.html` to fill in specific details (addresses, phone numbers, domain-specific text, and real reviews from Maps).
- Update `sites/<slug>/style.css` if minor layout adjustments are needed.

### Step 4: Deploy
Push the repository to the `gh-pages` branch to auto-trigger GitHub Pages deployment:
```bash
git add -A
git commit -m "Add new lead: <slug>"
git push origin main:gh-pages
```

### Step 5: Update the Tracking Sheet
After deployment, verify the site is live at `https://shashi2290.github.io/lead-no-hotel/sites/<slug>/`. Manually paste this URL into the designated column in the master Google Sheet.
