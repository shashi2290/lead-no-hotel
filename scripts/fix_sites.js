const fs = require('fs');
const path = require('path');

// Fix data for each site
const fixes = [
  {
    slug: 'rajgharana-palace',
    heroSub: 'Premium rooms · 24/7 Service · Central Location<br>Seoni Road, near Devi Mandir — Check-in 12 PM · Check-out 11 AM',
    statNum: '268+',
    bgImage: "style=\"background-image: url('assets/maps_photos/photo_1.jpg')\""
  },
  {
    slug: 'uma-adventure',
    heroSub: 'Premium rooms · 24/7 Service · Central Location<br>35, Block Colony Main Road — Open 24 hours · Camping check-in: 2 PM',
    statNum: '80+',
    bgImage: "style=\"background-image: url('assets/maps_photos/photo_1.jpg')\""
  },
  {
    slug: 'hotel-grand-palace',
    heroSub: 'Premium rooms · 24/7 Service · Central Location<br>RPP8+3P3, Ward, Bhopal Rd — Check-in 12 PM · Check-out 11 AM · 24/7 Front Desk',
    statNum: '1,603+',
    bgImage: "style=\"background-image: url('assets/maps_photos/photo_1.jpg')\""
  }
];

fixes.forEach(fix => {
  const filePath = path.join(__dirname, '..', 'sites', fix.slug, 'index.html');
  let html = fs.readFileSync(filePath, 'utf8');
  
  // Fix hero-sub
  html = html.replace(
    /<p class="hero-sub">Premium rooms · 24\/7 Service · Central Location<br>[^<]+— Check-in 12 PM<\/p>/,
    `<p class="hero-sub">${fix.heroSub}</p>`
  );
  
  // Fix stat-num
  html = html.replace(
    /<div class="hero-stat"><span class="stat-num">XXX\+<\/span><span class="stat-label">Happy Guests<\/span><\/div>/,
    `<div class="hero-stat"><span class="stat-num">${fix.statNum}</span><span class="stat-label">Happy Guests</span></div>`
  );
  
  // Fix bg-abstract to photo_1.jpg for hotels
  html = html.replace(
    /style="background-image: url\('assets\/bg-abstract\.jpg'\)"/,
    fix.bgImage
  );
  
  fs.writeFileSync(filePath, html);
  console.log(`✅ Fixed ${fix.slug}/index.html`);
});

console.log('\n✅ All hotel fixes applied!');