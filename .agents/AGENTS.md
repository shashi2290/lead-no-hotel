# Pitch Website Project Rules & Workflow

This project is dedicated to building and deploying pitch websites for businesses (leads) without an existing online presence.

## 1. Project Structure
The repository is modularized to handle multiple leads:
- `sites/` — Contains individual deployed pitch sites for each lead. Each site is a static HTML/CSS/JS bundle in a folder named after the lead's slug (e.g. `sites/mehta-mri/`).
- `templates/` — Contains base scaffolding templates by business type (e.g. `diagnostic`, `restaurant`, `coaching`).
- `scripts/` — Contains Node.js utilities for scaffolding sites (`new_site.js`) and fetching assets (`scrape_maps.js`). This should not be changed.

## 2. Design & Aesthetics Guidelines

### Load the Frontend Design Skill
Before starting any design work, load the [Frontend Design skill](https://github.com/anthropics/skills/blob/main/skills/frontend-design/SKILL.md) for detailed guidance on distinctive, intentional visual design.

### Core Design Principles
- **Ground it in the subject:** Name the business, its audience, and the page's single job before designing. The subject's own world (its materials, location, instruments, vernacular) is where distinctive choices come from.
- **Hero is a thesis:** Open with the most characteristic thing about the business. Be deliberate: a big number with a small label is the template answer — only use it if it's truly the best option.
- **Typography carries personality:** Pair display and body faces deliberately, not the same families you'd reach for on any project. Set a clear type scale with intentional weights and spacing.
- **Structure is information:** Structural devices (eyebrows, dividers, labels) should encode something true about the content. Question whether numbered markers like "01 / 02 / 03" make sense before using them — only appropriate if content is actually sequential.
- **Leverage motion deliberately:** Scroll-triggered reveals, hover micro-interactions — orchestrate one moment rather than scattering effects everywhere. Extra animation can make a design feel AI-generated.
- **Match complexity to the vision:** Maximalist directions need elaborate execution; minimal directions need precision in spacing, type, and detail.
- **Restraint:** Spend boldness in one signature element. Keep everything else quiet and disciplined. Cut any decoration that does not serve the brief.
- **Writing as design material:** Words appear to make things easier to understand. Write from the end user's side. Use active voice. Name things by what people control and recognize.
- **Don't Change any pre-existing templates** Note existing templates need not be changed, if a new template is to be created for a new category lead, take reference from hotel template

### Project Palette & Typography
- **Typography:** Playfair Display (serif display) paired with DM Sans (clean sans-serif body).
- **Colors:** Deep crimson red (`#C0392B`) against warm off-white (`#FAF7F4`) — ink-on-paper style. Near-black (`#1A0A07`) for dark sections.
- **Note on defaults:** The cream + serif + terracotta palette is a known AI-generated default. It is intentionally prescribed here by the project brief for consistency across leads. Where the brief leaves an axis free (e.g., layout, imagery, signature element), make a deliberate choice for that specific lead rather than reaching for the generic option.

### Layout & Spacing
- **Whitespace:** Bento-grid galleries and clean section delineations. Avoid full-width stretched photos unless explicitly styled in a hero grid.
- **Section padding:** Default `7rem` is too generous. Use `5rem` as the standard.
- **Hero height:** `min-height: 100vh` is excessive. Prefer `80vh` with tighter grid ratios (e.g., `1fr 1.3fr` to give more weight to the hero image).
- **Emoji in CSS:** Do not apply `color`, `font-family`, `font-weight`, or `letter-spacing` to elements containing emoji. Emoji render best with no text styling overrides.

### Hero-Right Background Pattern (canonical)
Every site must use this exact pattern for `.hero-right` — do not use `background-image` directly on the element:
```css
.hero-right { position: relative; overflow: hidden; background: var(--ink); }
.hero-right::before {
  content: ''; position: absolute; inset: 0;
  background: url('assets/bg-abstract.jpg') no-repeat center / cover;
  opacity: .12; z-index: 0;
}
.hero-right > * { position: relative; z-index: 1; }
.hero-photo-frame { position: relative; width: 100%; height: 100%; }
.hero-photo { width: 100%; height: 100%; object-fit: cover; opacity: .9; }
```
- Replace `bg-abstract.jpg` with the domain-appropriate asset for each lead (e.g. `hero_bg.jpg`, `bg-water.jpg`).
- **Do NOT** use `background-attachment: fixed` on `.hero-right` itself — `overflow: hidden` on the parent silently breaks it in WebKit/Blink.

### Location Strip (required after every hero)
Every site must include a `.location-strip` div immediately after the `</section>` closing tag of the hero. This provides the `background-attachment: fixed` CSS parallax effect:
```html
<div class="location-strip" style="background-image: url('assets/bg-abstract.jpg');">
  <div class="wrap location-strip-inner">
    <span class="location-label">📍 Full Address, City</span>
    <span class="location-desc">Access info · hours · one key differentiator</span>
  </div>
</div>
```
- The CSS for `.location-strip` is already in every template's `style.css`.
- Use `background-attachment: fixed` here (not in hero-right) — it works correctly because `.location-strip` is not `overflow: hidden`.
- Background image set via `style` attribute so it can differ per lead without CSS changes.
- All four templates (`diagnostic`, `coaching`, `hotel`, `restaurant`) have the HTML placeholder with `{{ADDRESS}}` / `{{ADDRESS_DESC}}` tokens — fill these in during Step 3.

## 3. Media Assets & Reviews

### Scraping Google Maps Photos
Google Maps aggressively blocks automated headless scraping. To bypass this on macOS:
1. **Always use `headless: false`** in Puppeteer inside the `scripts/scrape_maps.js` script. 
2. **Fresh Session:** Do NOT attach to or use the user's active Chrome session. Always spawn a fresh, separate browser window for scraping and debugging so it doesn't disrupt their work.
3. Add necessary stealth arguments (`--no-sandbox`, `--disable-blink-features=AutomationControlled`).
4. Set a standard, modern `User-Agent`.
5. **Method:** Intercept network responses. Listen for all URLs containing `googleusercontent.com/`.
6. **URL format:** Use `https://www.google.com/maps/place/?q=place_id:{placeId}` instead of the older `/search/?api=1&query_place_id=` format (the old format often doesn't load photos).
7. **Photo capture flow:**
   a. Click the "Photos" tab button (`button[aria-label*="Photo" i]`).
   b. Click a photo thumbnail to open the lightbox viewer.
   c. **Clear `capturedImages` map** before lightbox navigation to discard profile pics and thumbnails from the main page.
   d. Arrow-key navigate through the gallery — the response handler captures only high-res gallery images.
   e. Close lightbox with `Escape`.
8. **Filtering:** After capture, filter by buffer size > 50,000 bytes (50KB) to keep only real gallery images. Sort by size descending, take top 5. Fallback to >15KB if fewer than 5 found.
9. **Storage:** Save them incrementally (e.g., `photo_1.jpg`, `photo_2.jpg`) into the lead's `assets/maps_photos/` directory.
10. **Troubleshooting:** If 0 photos are captured, try adding `--disable-web-security` and `--allow-running-insecure-content` flags to Puppeteer launch args.

### Extracting Real Reviews
To populate the `reviews-section` dynamically across any template:
1. **After closing the lightbox, scroll to top** (`window.scrollTo(0, 0)`) so the left panel with ratings/reviews is visible.
2. **Click the reviews trigger** — try these strategies in order:
   a. `span[aria-label*="reviews"]` or `button[aria-label*="reviews"]` (the rating/review count element)
   b. `button[jsaction*="pane.rating.moreReviews"]` or `button[aria-label*="More reviews" i]`
   c. Any clickable element whose text matches "X reviews" pattern
   d. Any element with `aria-label` containing "star" or "review"
3. **Scroll the reviews list** to load more reviews (iterate `div[role="feed"]` or `.m6QErb` containers).
4. **Extract** from `.jftiEf`, `[data-review-id]`, `.MyEned` or similar review containers.
5. Inject these manually into the `blockquote` structures in the respective template's HTML.
6. If Maps is inaccessible, search travel blogs and third-party review sites for real guest quotes as a fallback. Note the source context (e.g., blog post, trip report).

### Free Stock / AI Background Images
- When no `generate_image` tool is available, use free-to-use stock photos from Unsplash for abstract backgrounds, textures, or generic domain-specific mood accents (e.g., highway night scenes, hotel corridors, warm bokeh).
- **Never** use AI or stock images to fake real storefronts or exterior signage.
- Blend background images into CSS via `::before` pseudo-elements with low `opacity` (3–12%) behind content sections. Use `isolation: isolate` on the parent to keep them behind content.
- Unsplash images are free for commercial use (no attribution required under the Unsplash License).
- Download via: `curl -L -o assets/bg-{name}.jpg "https://unsplash.com/photos/{id}/download?force=true&w=1920"`

## 4. Workflow for a New Lead

### Step 1: Scaffold the Site & Select Template
Identify the type of business (diagnostic, restaurant, coaching, etc.). Use the scaffolding script to generate a new site from the appropriate template folder:
```bash
node scripts/new_site.js <slug> "<Business Name>" <business_type> [place_id]
```
*(Available templates in `templates/`: `diagnostic`, `restaurant`, `coaching`, `hotel`, `retail`, `salon`)*

### Step 2: Fetch and Configure Assets
If the `place_id` was provided in Step 1, the Maps photos will be scraped automatically into `sites/<slug>/assets/maps_photos/`.
- If manual intervention is needed, run `node scripts/scrape_maps.js <place_id> <slug>`. 
- Source free Unsplash images for abstract domain-specific accents (e.g., highway lights for a motel, bokeh for a clinic).
- Place all assets in the `assets/` folder.

### Step 3: Edit and Refine
- Update `sites/<slug>/index.html` to fill in specific details (addresses, phone numbers, domain-specific text, and real reviews from Maps).
- **Fill in the location strip:** Replace `{{ADDRESS}}` with the full street address and `{{ADDRESS_DESC}}` with 1–2 lines of access info + hours. Change `style="background-image: url('assets/bg-abstract.jpg');"` to the lead's actual background asset.
- Update `sites/<slug>/style.css` if minor layout adjustments are needed.
- Use section padding of `5rem` as standard. Keep hero max `80vh`.

### Step 4: Verify Locally by user by launching the new lead site
Open the site file in a browser to check for CSS issues before deploying. Common issues:
- Emoji rendering with text color overrides (remove color/font-weight from emoji containers)
- Missing images (check asset paths)
- Section spacing (too much whitespace between sections)

### Step 5: Stage and Commit(ONLY on user confirmation after full changes confirmed by user)
```bash
git add -A
git commit -m "Add new lead: <slug>"
git push origin main
```

### Step 6: Deploy (ONLY on user confirmation)
**IMPORTANT: Do NOT deploy until the user explicitly confirms.**
Push the repository to the `gh-pages` branch to auto-trigger GitHub Pages deployment:
```bash
git push origin main:gh-pages
```
After pushing, wait ~20s for CDN cache to clear. If styles look stale, force a cache bust by making a minor CSS change (e.g., bump a version comment) and re-push.

### Step 7: Update the Tracking Sheet
After deployment, verify the site is live at `https://shashi2290.github.io/lead-no-hotel/sites/<slug>/`. Manually paste this URL into the designated column in the master Google Sheet.

## 5. GitHub Pages & Caching Notes
- GitHub Pages CDN caches assets with `max-age=600` (10 minutes).
- After pushing to `gh-pages`, the CDN may serve stale CSS for up to 10 minutes.
- To force a cache bust: make a trivial change to the CSS (bump a version string in a comment) and re-push.
- Verify fresh deployment by checking `x-cache: MISS` and `x-proxy-cache: MISS` in response headers.
- The repository has a `.nojekyll` file in the root to prevent Jekyll processing.
