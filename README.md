# Leads — Non-Hotel Pitch Sites

A modular repo for generating bespoke pitch websites for local businesses that don't have a web presence yet. Each business gets its own folder under `sites/`, built from a shared template and populated with real assets scraped from Google Maps.

## Structure

```
leads-non-hotel/
├── .gitignore
├── package.json
├── README.md
├── scripts/
│   ├── scrape_maps.js   ← download real photos from Google Maps
│   └── new_site.js      ← scaffold a new site from template
├── template/            ← blank starter (edit to update all future sites)
│   ├── index.html
│   ├── style.css
│   └── script.js
└── sites/
    └── mehta-mri/       ← one folder per lead
        ├── index.html
        ├── style.css
        ├── script.js
        └── assets/
            └── maps_photos/
                ├── photo_1.jpg
                ├── photo_2.jpg
                ├── photo_3.jpg
                └── photo_4.jpg
```

## Setup

```bash
npm install
```

## Adding a New Lead

### 1. Scaffold the site

```bash
node scripts/new_site.js <slug> "<Business Name>" [place_id]
```

**Example:**
```bash
node scripts/new_site.js sharma-clinic "Sharma Clinic" ChIJxxxxxxxxxxxxxxxx
```

This will:
- Create `sites/sharma-clinic/` from the template
- Replace `{{BUSINESS_NAME}}` throughout
- Automatically scrape photos from Google Maps (if place_id provided)

### 2. Scrape Maps photos (separately if needed)

```bash
node scripts/scrape_maps.js <place_id> <slug>
```

**Example:**
```bash
node scripts/scrape_maps.js ChIJl4sSfmt0YzkRgOK1Yl6voSc mehta-mri
```

> **Tip:** The `place_id` is the last part of the Google Maps URL query string: `?query_place_id=<THIS_PART>`

### 3. Edit the HTML

Open `sites/<slug>/index.html` and fill in:
- Business name, tagline, address, phone
- Services list
- Real reviews (copy from Google Maps)
- Hours of operation

### 4. Deploy to GitHub Pages

Create a GitHub repo for the business and push:

```bash
cd sites/<slug>
git init
git remote add origin git@github.com:<username>/<repo>.git
git add -A && git commit -m "Initial site"
git push -u origin main
```

Then enable GitHub Pages from the repo Settings → Pages → Deploy from `main`.

## Current Leads

| Slug | Business | Status |
|------|----------|--------|
| `mehta-mri` | Mehta MRI and Diagnostics, Ujjain | ✅ Built |
