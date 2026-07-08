# Leads — Non-Hotel Pitch Sites

A modular repository for generating bespoke, high-quality pitch websites for local businesses without an existing web presence. Each business gets its own folder under `sites/`, scaffolded from a business-specific template, and is populated with real imagery scraped directly from Google Maps.

## Structure

```
leads-non-hotel/
├── .agents/
│   └── AGENTS.md        ← Core rules and workflow for AI agents working in this repo
├── .gitignore
├── package.json         ← Contains puppeteer dependency for scraping
├── scripts/
│   ├── scrape_maps.js   ← Scrapes full-res photos from Maps network buffers (macOS bot bypass)
│   └── new_site.js      ← Scaffolds a new site based on a business template
├── templates/           ← Base templates tailored by industry
│   ├── diagnostic/
│   ├── restaurant/
│   └── coaching/
└── sites/
    └── mehta-mri/       ← Deployed lead folder (e.g., sites/<slug>/)
        ├── index.html
        ├── style.css
        ├── script.js
        └── assets/
            └── maps_photos/ ← Contains real photos scraped from Maps
```

## Setup

```bash
npm install
```

## Adding a New Lead

### 1. Scaffold the Site
Use the scaffolding script to generate a new site. You must specify the **slug**, **business name**, and **template type** (`diagnostic`, `restaurant`, `coaching`, etc.). Optionally provide the Google Maps `place_id` to automatically scrape photos.

```bash
node scripts/new_site.js <slug> "<Business Name>" <template_type> [place_id]
```

**Example:**
```bash
node scripts/new_site.js punjabi-dhaba "Punjabi Dhaba" restaurant ChIJxxxxxxxxxxxxxxxx
```

This will:
- Create `sites/punjabi-dhaba/` by copying the `templates/restaurant/` folder.
- Replace `{{BUSINESS_NAME}}` placeholders.
- If a `place_id` is provided, it triggers `scrape_maps.js` to download real photos into `assets/maps_photos/`.

### 2. Manual Scraping (If Needed)
If you didn't provide a `place_id` during scaffolding, or need to run it again, run:

```bash
node scripts/scrape_maps.js <place_id> <slug>
```

> **Note:** The script runs Puppeteer in `headless: false` mode with stealth arguments. This is strictly required to bypass Google Maps bot detection on macOS. It spawns a fresh, isolated browser window rather than hijacking your active Chrome session, so it won't disrupt your work. It intercepts network buffers (e.g. `/gps-cs-s/`) rather than scraping the DOM for thumbnails.

### 3. Edit & Refine
Open `sites/<slug>/index.html` and populate the remaining placeholders:
- Addresses (`{{BUSINESS_ADDRESS}}`), phone numbers, and Maps embed links (`{{MAPS_LINK}}`, `{{MAPS_EMBED_URL}}`).
- Specific services, menus, or courses.
- **Reviews:** Manually navigate to the business's Google Maps page, copy the text of real reviews, and paste them into the blockquote structures in the HTML.
- **AI Assets:** Use AI generation tools to create generic abstract backgrounds or domain-specific accent photos (like a generic MRI scan or clinic reception) and save them to `assets/`. *Never use AI to fake real storefronts.*

### 4. Deploy
We use GitHub Pages on the `gh-pages` branch for a unified deployment. The entire `sites/` folder is pushed, allowing each lead to exist on its own path.

```bash
git add -A
git commit -m "Add new lead: <slug>"
git push origin main:gh-pages
```

The site will then be live at:
`https://<your-username>.github.io/lead-no-hotel/sites/<slug>/`

### 5. Update Master Tracking Sheet
Finally, take the deployed URL and paste it into the designated column in the main Leads Google Sheet.

---

## Current Leads

| Slug | Business Type | Status | Live URL |
|------|--------------|--------|----------|
| `mehta-mri` | Diagnostic | ✅ Live | [View Site](https://shashi2290.github.io/lead-no-hotel/sites/mehta-mri/) |
