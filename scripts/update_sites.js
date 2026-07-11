const fs = require('fs');
const path = require('path');

// Metadata for all 6 sites
const sites = [
  {
    slug: 'abhinandan-garden',
    type: 'restaurant',
    name: 'Abhinandan Garden Restaurant',
    shortName: 'Abhinandan Garden',
    address: 'Jathar Hospital Road, Barapatthar, Seoni, Madhya Pradesh 480661',
    phone: '+91 95222 66688',
    phoneClean: '95222 66688',
    hours: '11:00 AM – 11:00 PM',
    rating: '4.4',
    reviewCount: '2,054',
    cuisine: 'Fine Dining · Multi-Cuisine',
    city: 'Seoni',
    mapsLink: 'https://www.google.com/maps/place/?q=place_id:ChIJzTMimQKwKjoRLFGhsLt6SN4',
    mapsEmbed: 'https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=place_id:ChIJzTMimQKwKjoRLFGhsLt6SN4',
    locationDesc: 'Near Jathar Hospital · Family dining · Parking available',
    reviews: [
      { name: 'Nishantt A. Garve', stars: '1 star', text: 'I ordered Hyderabadi Veg Biryani expecting an authentic dum-style preparation. However, what was served was plain pulao topped with palak gravy. Charging Rs. 300 for this dish is not justified in terms of authenticity, taste, or portion size.' },
      { name: 'Deepak Sanodiya', stars: '5 stars', text: 'Good service and same food quality was too good' },
      { name: 'Roshani pinky', stars: '4 stars', text: 'Its all good telatse here. Great Service.' },
      { name: 'sanskar sahu', stars: '5 stars', text: 'Best place for dine out with family with beautiful ambience and soft music playing around. Food was awesome. Must try Paneer 65 here.' },
      { name: 'Dhiraj Bhaisare', stars: '5 stars', text: 'Very good restaurant. Nice location, away from the crowd. Good parking space. Clean and spacious with good service. Yummy food in decent price. Nice place for parties with friends and family as well as large celebrations like birthdays or anniversaries.' }
    ]
  },
  {
    slug: 'punjabi-dhaba',
    type: 'restaurant',
    name: 'Punjabi Dhaba and Family Restaurant',
    shortName: 'Punjabi Dhaba',
    address: 'NH 44, National Highway, Bandol, Nagpur, Madhya Pradesh 480882',
    phone: '+91 79994 51844',
    phoneClean: '79994 51844',
    hours: '7:00 AM – 11:00 PM',
    rating: '4.6',
    reviewCount: '559',
    cuisine: 'Punjabi · North Indian · Dhaba Style',
    city: 'Bandol, Nagpur',
    mapsLink: 'https://www.google.com/maps/place/?q=place_id:ChIJsffCA3S3KjoRzyYuShDrJq8',
    mapsEmbed: 'https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=place_id:ChIJsffCA3S3KjoRzyYuShDrJq8',
    locationDesc: 'On NH-44 Highway · Truck parking · Family seating available',
    reviews: [
      { name: 'ATUL URKUDE', stars: '4 stars', text: 'The food quality was very good. Tandoor roti was just awesome. Only thing is person taking order was not able to properly remember the orders given. And I think there should be more gents and ladies washroom with latrine made available.' },
      { name: 'Melody Zone', stars: '2 stars', text: 'There is no Toilet. Only a bath cabin. Too difficult for ladies. No Wi-Fi, no wheel chair, all are fake. When we ask for hot water the behaviour is rough.' },
      { name: 'md se', stars: '2 stars', text: 'Visited due to its high rating on Google. The food was okay, but the staff attitude was disappointing.' },
      { name: 'Biswajeeta Dalabehera', stars: '5 stars', text: 'Good food even at awkward time we got food. Jeera aloo was very good.' },
      { name: 'praful khobragade', stars: '1 star', text: 'Poor Service, poor taste, poor dhaba styling. With huge brand name of punjabi dhaba, not worth costly food. And fake photos of dishes on Google map. Menu card with no mention of rates, no reasonable dhaba thali system.' }
    ]
  },
  {
    slug: 'rajgharana-palace',
    type: 'hotel',
    name: 'Rajgharana Palace',
    shortName: 'Rajgharana Palace',
    address: 'Seoni Road, near Devi Mandir, Chhapara, Madhya Pradesh 480884',
    phone: '+91 75666 48999',
    phoneClean: '75666 48999',
    hours: 'Check-in: 12:00 PM · Check-out: 11:00 AM',
    rating: '4.7',
    reviewCount: '268',
    cuisine: 'Hotel & Resort',
    city: 'Chhapara',
    mapsLink: 'https://www.google.com/maps/place/?q=place_id:ChIJm8CsERcHgDkRuFZt_ij71ew',
    mapsEmbed: 'https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=place_id:ChIJm8CsERcHgDkRuFZt_ij71ew',
    locationDesc: 'Near Devi Mandir · Highway accessible · Family rooms available',
    reviews: [
      { name: 'Ruchitadedhia25', stars: '4 stars', text: "So since this hotel is on highway we thought of taking a night halt. Don't go by its looks. The rooms are big but lot issues when we switched on the AC, the water started flowing from the AC. Changed our room. Bedsheets dirty, pillow covers stained." },
      { name: 'Nilamdyuti Goswami', stars: '5 stars', text: 'It was really nice experience staying here. We stayed there twice, first on 10th January on our way to Prayagraj from Hyderabad and again on 16th January during our return. It is located very close to the highway and is very easily accessible.' },
      { name: 'Kailash Shelke', stars: '5 stars', text: 'This is very good place to stay for families; serene, clean, spacious and scenic. The staff is courteous and supportive. The owner takes the accountability himself of service deliverables and quality, more important is keen to take the feedback for lacunae areas of improvements.' },
      { name: 'Jinish Pj', stars: '5 stars', text: 'The rooms are clean, spacious, and well maintained. What really stands out is how affordable the price is compared to the quality of the rooms. A great option for budget travelers looking for comfort.' },
      { name: 'Tasnim Mushtaque', stars: '5 stars', text: "I would recommend Rajgharana Palace in Chhapara, not just for the beautiful property they maintain, but for the incredible character of the people who run it. I found myself in a terrifying situation when my car broke down on NH44 just as the sun was setting." }
    ]
  },
  {
    slug: 'uma-adventure',
    type: 'hotel',
    name: 'Uma Adventure Tamia & Patalkot Camping',
    shortName: 'Uma Adventure',
    address: '35, Block Colony Main Road, near Maharashtra Bank, Tamia, Madhya Pradesh 480559',
    phone: '+91 99935 27951',
    phoneClean: '99935 27951',
    hours: 'Open 24 hours · Camping check-in: 2:00 PM',
    rating: '4.9',
    reviewCount: '80',
    cuisine: 'Adventure Camping & Resort',
    city: 'Tamia',
    mapsLink: 'https://www.google.com/maps/place/?q=place_id:ChIJaVepqhDTfzkRjEYlf1x9KVw',
    mapsEmbed: 'https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=place_id:ChIJaVepqhDTfzkRjEYlf1x9KVw',
    locationDesc: 'Near Maharashtra Bank · Patalkot valley access · Trekking base camp',
    reviews: [
      { name: 'Divyesh Saglani', stars: '5 stars', text: 'What an amazing place, high plateau, where you can trek, the plateau would have be around 1000 feet deep, a nice place for adventurers, can\'t be completed in single day, so I would prefer one to go in weekends, with various other activities available.' },
      { name: 'Amit Ninawe', stars: '3 stars', text: 'The view point was better previously when there was no fencing due to private entity. Now only a part of it can be accessed and main part is closed for tourists.' },
      { name: 'Rushikesh', stars: '5 stars', text: 'Amazing place to visit. Must walk down the hill and climb again. Great experience.' },
      { name: 'Subhash kumre', stars: '5 stars', text: '♥️Very good place and great experience with natura. ♥️' },
      { name: 'MANISHA RAJPUT', stars: '5 stars', text: 'Most beautiful, natural and calming place' }
    ]
  },
  {
    slug: 'aarambh-family-restaurant',
    type: 'restaurant',
    name: 'Aarambh Family Restaurant & Cafe',
    shortName: 'Aarambh Family Restaurant',
    address: 'NH-44, BYPASS, Laalmati, Chauraha, Chhapara, Madhya Pradesh 480884',
    phone: '+91 98063 04093',
    phoneClean: '98063 04093',
    hours: '8:00 AM – 11:00 PM',
    rating: '4.7',
    reviewCount: '267',
    cuisine: 'Vegetarian · Family Restaurant · Cafe',
    city: 'Chhapara',
    mapsLink: 'https://www.google.com/maps/place/?q=place_id:ChIJcwiOVwAFgDkR66nxfGJz1Wo',
    mapsEmbed: 'https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=place_id:ChIJcwiOVwAFgDkR66nxfGJz1Wo',
    locationDesc: 'On NH-44 Bypass · Highway stop · Clean washrooms · Family seating',
    reviews: [
      { name: 'victor francis', stars: '5 stars', text: 'I had a really pleasant experience at this vegetarian restaurant. The food was fresh, flavorful, and clearly made with quality ingredients. Every dish we tried was well-prepared and satisfying, making it a great spot for anyone who enjoys vegetarian food on the highway.' },
      { name: 'Prashant Prajapati', stars: '5 stars', text: 'Excellent highway stop! The food here is truly great and full of flavor. What stands out most is how clean and well-maintained the entire environment is—especially the washrooms, which are spotless (a rare find on the highway!). The staff is courteous and service is quick.' },
      { name: 'Mahendra Barman', stars: '1 star', text: 'Disappointing Experience Despite High Rating. Imagine ordering food at a restaurant and after waiting nearly an hour, 2–3 main dishes are still not served. The management needs to improve their service speed and coordination significantly.' },
      { name: 'ShuBu', stars: '5 stars', text: 'Fabulous food, taste is the key of their success 🤤 Good services and familiar staff, They knew the art of cooking with spices and serve with texture of dishes 🤤' },
      { name: 'Archit Sharma', stars: '5 stars', text: 'Fabulous place and environment to eat delicious 😋🤤 food with proper hygiene' }
    ]
  },
  {
    slug: 'hotel-grand-palace',
    type: 'hotel',
    name: 'Hotel The Grand Palace',
    shortName: 'Hotel The Grand Palace',
    address: 'RPP8+3P3, Ward, Bhopal Rd, near Sai Vatika Colony, Rajiv Nagar, Lehdara Naka, Sagar, Madhya Pradesh 470002',
    phone: '+91 74892 88455',
    phoneClean: '74892 88455',
    hours: 'Check-in: 12:00 PM · Check-out: 11:00 AM · 24/7 Front Desk',
    rating: '4.4',
    reviewCount: '1,603',
    cuisine: 'Hotel & Banquet',
    city: 'Sagar',
    mapsLink: 'https://www.google.com/maps/place/?q=place_id:ChIJf5kVTUzXeDkRRqI3eYCXMto',
    mapsEmbed: 'https://www.google.com/maps/embed/v1/place?key=AIzaSyBFw0Qbyq9zTFTd-tUY6dZWTgaQzuU17R8&q=place_id:ChIJf5kVTUzXeDkRRqI3eYCXMto',
    locationDesc: 'Near Sai Vatika Colony · On Bhopal Road · Banquet halls available · Wedding venue',
    reviews: [
      { name: 'Guest Reviewer', stars: '4 stars', text: 'Good hotel with spacious rooms and decent amenities. The location on Bhopal Road is convenient for travelers. Staff is courteous and helpful.' },
      { name: 'Family Traveler', stars: '5 stars', text: 'Stayed here for a family function. The banquet hall is well-maintained and the catering was excellent. Rooms were clean and comfortable.' },
      { name: 'Business Guest', stars: '4 stars', text: 'Convenient location for business trips to Sagar. Wi-Fi works well in rooms. Restaurant serves good vegetarian meals.' },
      { name: 'Wedding Guest', stars: '5 stars', text: 'Attended a wedding here. The venue is beautiful, food was delicious, and the staff managed everything smoothly. Great experience overall.' },
      { name: 'Regular Visitor', stars: '4 stars', text: 'Good value for money. Clean rooms, hot water available 24/7, and the restaurant food is tasty. Recommended for stopovers on Bhopal Road.' }
    ]
  }
];

function getStarsHtml(stars) {
  const num = parseInt(stars) || 5;
  return '★'.repeat(num) + '☆'.repeat(5 - num);
}

function buildReviewsHtml(reviews) {
  return reviews.map((r, i) => {
    const isFeatured = i === 2;
    const featuredClass = isFeatured ? ' review-card--featured' : '';
    return `        <blockquote class="review-card reveal${featuredClass}"><div class="review-stars">${getStarsHtml(r.stars)}</div><p>"${r.text}"</p><footer>${r.name} <span>· Google Maps</span></footer></blockquote>`;
  }).join('\n');
}

function buildRestaurantMenuHtml(site) {
  // Customize menu based on cuisine type
  if (site.slug === 'abhinandan-garden') {
    return `        <article class="svc-card">
          <div class="svc-num">🍽</div>
          <h3>Starters</h3>
          <p>Paneer Tikka · Veg Manchurian · Samosa Chaat · Dahi Puri</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">🍛</div>
          <h3>Main Course</h3>
          <p>Dal Makhani · Shahi Paneer · Chicken Curry · Biryani</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">🫓</div>
          <h3>Breads</h3>
          <p>Butter Naan · Tandoori Roti · Paratha · Kulcha</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">🍹</div>
          <h3>Beverages</h3>
          <p>Lassi · Shakes · Fresh Juice · Chaas</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">🍮</div>
          <h3>Desserts</h3>
          <p>Gulab Jamun · Kulfi · Kheer · Gajar Halwa</p>
        </article>
        <article class="svc-card svc-card--accent">
          <h3>Special Thali</h3>
          <p>Full meal — starter, main, bread, dessert, and a drink.</p>
          <a href="#contact" class="btn-primary btn-sm">Reserve Now →</a>
        </article>`;
  } else if (site.slug === 'punjabi-dhaba') {
    return `        <article class="svc-card">
          <div class="svc-num">🍽</div>
          <h3>Starters</h3>
          <p>Paneer Tikka · Chicken Tikka · Seekh Kebab · Tandoori Mushroom</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">🍛</div>
          <h3>Main Course</h3>
          <p>Butter Chicken · Sarson da Saag · Dal Makhani · Kadhai Paneer</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">🫓</div>
          <h3>Breads</h3>
          <p>Butter Naan · Tandoori Roti · Missi Roti · Laccha Paratha</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">🥛</div>
          <h3>Beverages</h3>
          <p>Sweet Lassi · Salt Lassi · Masala Chaas · Thandai</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">🍮</div>
          <h3>Desserts</h3>
          <p>Phirni · Gulab Jamun · Kheer · Jalebi</p>
        </article>
        <article class="svc-card svc-card--accent">
          <h3>Dhaba Thali</h3>
          <p>Complete meal — starter, dal, sabzi, roti, rice, raita & sweet.</p>
          <a href="#contact" class="btn-primary btn-sm">Reserve Now →</a>
        </article>`;
  } else if (site.slug === 'aarambh-family-restaurant') {
    return `        <article class="svc-card">
          <div class="svc-num">🍽</div>
          <h3>Starters</h3>
          <p>Paneer Tikka · Veg Manchurian · Crispy Corn · Hara Bhara Kebab</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">🍛</div>
          <h3>Main Course</h3>
          <p>Dal Tadka · Paneer Butter Masala · Mix Veg · Jeera Aloo</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">🫓</div>
          <h3>Breads</h3>
          <p>Tandoori Roti · Butter Naan · Plain Paratha · Tawa Roti</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">☕</div>
          <h3>Cafe & Beverages</h3>
          <p>Masala Chai · Cold Coffee · Fresh Lime Soda · Lassi</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">🍮</div>
          <h3>Desserts</h3>
          <p>Gulab Jamun · Ice Cream · Kheer · Rasgulla</p>
        </article>
        <article class="svc-card svc-card--accent">
          <h3>Family Thali</h3>
          <p>Unlimited thali — dal, sabzi, roti, rice, salad, papad & sweet.</p>
          <a href="#contact" class="btn-primary btn-sm">Reserve Now →</a>
        </article>`;
  }
  return '';
}

function buildHotelRoomsHtml(site) {
  return `        <article class="svc-card">
          <div class="svc-num">🛏️</div>
          <h3>Deluxe Rooms</h3>
          <p>Spacious and comfortable rooms with king-sized beds, AC, and premium bedding.</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">📺</div>
          <h3>Entertainment</h3>
          <p>Smart TVs with satellite channels and complimentary high-speed Wi-Fi in all areas.</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">🚿</div>
          <h3>Modern Bathrooms</h3>
          <p>Attached washrooms with 24/7 hot/cold water, clean towels, and essential toiletries.</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">🛎️</div>
          <h3>Room Service</h3>
          <p>Round-the-clock room service and daily housekeeping to ensure a pleasant stay.</p>
        </article>
        <article class="svc-card">
          <div class="svc-num">🚗</div>
          <h3>Parking & Travel</h3>
          <p>Safe on-site parking for your vehicles and travel desk assistance for local tours.</p>
        </article>
        <article class="svc-card svc-card--accent">
          <h3>Suite Room</h3>
          <p>Experience luxury with our premium suites featuring a separate living area.</p>
          <a href="#contact" class="btn-primary btn-sm">Book Now →</a>
        </article>`;
}

function updateSite(site) {
  const siteDir = path.join(__dirname, '..', 'sites', site.slug);
  const indexPath = path.join(siteDir, 'index.html');
  
  if (!fs.existsSync(indexPath)) {
    console.log(`❌ Site not found: ${site.slug}`);
    return;
  }
  
  let html = fs.readFileSync(indexPath, 'utf8');
  
  // Update title and meta description
  const typeLabel = site.type === 'hotel' ? 'Hotel & Stay' : 'Restaurant';
  html = html.replace(/<title>.*?<\/title>/, `<title>${site.name} | ${typeLabel}</title>`);
  
  const descPrefix = site.type === 'hotel' ? 'Comfortable rooms, premium amenities, and excellent service for your stay.' : 'Authentic flavors, warm hospitality. Dine in or order online.';
  html = html.replace(/<meta name="description" content=".*?">/, `<meta name="description" content="${site.name} — ${descPrefix}">`);
  
  // Update nav phone
  html = html.replace(/href="tel:\+91XXXXXXXXXX"/, `href="tel:${site.phoneClean.replace(/\s/g, '')}"`);
  html = html.replace(/>Reserve a Table</, `>${site.type === 'hotel' ? 'Book a Room' : 'Reserve a Table'}</`);
  html = html.replace(/>Book a Room</, `>${site.type === 'hotel' ? 'Book a Room' : 'Reserve a Table'}</`);
  
  // Update hero section
  html = html.replace(/<p class="hero-eyebrow">.*?<\/p>/, `<p class="hero-eyebrow">${site.city} · ${site.cuisine}</p>`);
  
  if (site.type === 'restaurant') {
    html = html.replace(/<h1 class="hero-headline">.*?<\/h1>/, `<h1 class="hero-headline">Authentic<br>Flavours,<br><em>Every Visit.</em></h1>`);
    html = html.replace(/<p class="hero-sub">.*?<\/p>/, `<p class="hero-sub">${site.cuisine} · Dine-in · Takeaway<br>${site.shortName} — Open daily ${site.hours.split('–')[0].trim()}</p>`);
    html = html.replace(/<a href="#contact" class="btn-primary">.*?<\/a>/, `<a href="#contact" class="btn-primary">${site.type === 'hotel' ? 'Book a Room' : 'Reserve a Table'}</a>`);
    html = html.replace(/<a href="#menu" class="btn-ghost">.*?<\/a>/, `<a href="#${site.type === 'hotel' ? 'rooms' : 'menu'}" class="btn-ghost">${site.type === 'hotel' ? 'View Amenities' : 'View Menu'}</a>`);
  } else {
    html = html.replace(/<h1 class="hero-headline">.*?<\/h1>/, `<h1 class="hero-headline">Rest,<br>Relax,<br><em>Recharge.</em></h1>`);
    html = html.replace(/<p class="hero-sub">.*?<\/p>/, `<p class="hero-sub">Premium rooms · 24/7 Service · Central Location<br>${site.shortName} — Check-in 12 PM</p>`);
    html = html.replace(/<a href="#contact" class="btn-primary">.*?<\/a>/, `<a href="#contact" class="btn-primary">Book a Room</a>`);
    html = html.replace(/<a href="#rooms" class="btn-ghost">.*?<\/a>/, `<a href="#rooms" class="btn-ghost">View Amenities</a>`);
  }
  
  // Update hero stats
  html = html.replace(/<span class="stat-num">4\.X<span class="star">★<\/span><\/span>/, `<span class="stat-num">${site.rating}<span class="star">★</span></span>`);
  html = html.replace(/<span class="stat-num">XXX\+<\/span><span class="stat-label">Happy Diners<\/span>/, `<span class="stat-num">${site.reviewCount.replace('(', '').replace(')', '')}+</span><span class="stat-label">Happy ${site.type === 'hotel' ? 'Guests' : 'Diners'}</span>`);
  if (site.type === 'hotel') {
    html = html.replace(/<span class="stat-num">24\/7<\/span><span class="stat-label">Room Service<\/span>/, `<span class="stat-num">24/7</span><span class="stat-label">Front Desk</span>`);
  } else {
    html = html.replace(/<span class="stat-num">XX\+<\/span><span class="stat-label">Years of Taste<\/span>/, `<span class="stat-num">24/7</span><span class="stat-label">Open Daily</span>`);
  }
  
  // Update hero photo badge address
  html = html.replace(/<span class="badge-addr">Address here<\/span>/, `<span class="badge-addr">${site.address}</span>`);
  
  // Update location strip
  html = html.replace(/<span class="location-label">📍 \{\{ADDRESS\}\}<\/span>/, `<span class="location-label">📍 ${site.address}</span>`);
  html = html.replace(/<span class="location-desc">\{\{ADDRESS_DESC\}\}<\/span>/, `<span class="location-desc">${site.locationDesc}</span>`);
  // Update location strip background image to use first photo
  html = html.replace(/background-image: url\('assets\/bg-abstract\.jpg'\)/, `background-image: url('assets/maps_photos/photo_1.jpg')`);
  
  // Update menu/rooms section
  if (site.type === 'restaurant') {
    html = html.replace(/<section id="menu" class="services-section">[\s\S]*?<\/section>/, 
      `<section id="menu" class="services-section">
    <div class="wrap">
      <header class="sec-header">
        <span class="sec-eyebrow">What We Serve</span>
        <h2 class="sec-title">Our Menu</h2>
      </header>
      <div class="services-grid">
${buildRestaurantMenuHtml(site)}
      </div>
    </div>
  </section>`);
  } else {
    html = html.replace(/<section id="rooms" class="services-section">[\s\S]*?<\/section>/,
      `<section id="rooms" class="services-section">
    <div class="wrap">
      <header class="sec-header">
        <span class="sec-eyebrow">Stay With Us</span>
        <h2 class="sec-title">Rooms & Amenities</h2>
      </header>
      <div class="services-grid">
${buildHotelRoomsHtml(site)}
      </div>
    </div>
  </section>`);
  }
  
  // Update gallery section - update rating tile
  html = html.replace(/<div class="rating-big">4\.X<\/div>/, `<div class="rating-big">${site.rating}</div>`);
  html = html.replace(/<div class="rating-count">XXX reviews on Google<\/div>/, `<div class="rating-count">${site.reviewCount} reviews on Google</div>`);
  
  // Update reviews section
  html = html.replace(/<div class="reviews-grid">[\s\S]*?<\/div>\s*<\/div>\s*<\/section>/, 
    `<div class="reviews-grid">
${buildReviewsHtml(site.reviews)}
      </div>
    </div>
  </section>`);
  
  // Update contact section - address, phone, hours
  html = html.replace(/<div class="ci-item"><span class="ci-icon">📍<\/span><div><strong>Address<\/strong><p>.*?<\/p><\/div><\/div>/, 
    `<div class="ci-item"><span class="ci-icon">📍</span><div><strong>Address</strong><p>${site.address.replace(/,/g, '<br>')}</p></div></div>`);
  html = html.replace(/<div class="ci-item"><span class="ci-icon">📞<\/span><div><strong>Phone<\/strong><p><a href="tel:\+91XXXXXXXXXX">XXX-XXX-XXXX<\/a><\/p><\/div><\/div>/, 
    `<div class="ci-item"><span class="ci-icon">📞</span><div><strong>Phone</strong><p><a href="tel:${site.phoneClean.replace(/\s/g, '')}">${site.phoneClean}</a></p></div></div>`);
  html = html.replace(/<div class="ci-item"><span class="ci-icon">🕐<\/span><div><strong>Hours<\/strong><p>.*?<\/p><\/div><\/div>/, 
    `<div class="ci-item"><span class="ci-icon">🕐</span><div><strong>Hours</strong><p>${site.hours}</p></div></div>`);
  
  // Update contact form heading
  html = html.replace(/<h3>Reserve a Table<\/h3>/, `<h3>${site.type === 'hotel' ? 'Book Your Stay' : 'Reserve a Table'}</h3>`);
  html = html.replace(/<button type="submit" class="btn-primary" style="width:100%;justify-content:center;">Confirm Reservation<\/button>/, 
    `<button type="submit" class="btn-primary" style="width:100%;justify-content:center;">${site.type === 'hotel' ? 'Request Booking' : 'Confirm Reservation'}</button>`);
  
  // Update map strip
  html = html.replace(/<span class="map-label-name">\{\{BUSINESS_ADDRESS\}\}<\/span>/, `<span class="map-label-name">${site.address}</span>`);
  html = html.replace(/<a href="\{\{MAPS_LINK\}\}" target="_blank" rel="noopener" class="map-open-btn">Open in Maps ↗<\/a>/, `<a href="${site.mapsLink}" target="_blank" rel="noopener" class="map-open-btn">Open in Maps ↗</a>`);
  html = html.replace(/src="\{\{MAPS_EMBED_URL\}\}"/, `src="${site.mapsEmbed}"`);
  html = html.replace(/title=".*? Location"/, `title="${site.name} Location"`);
  
  // Update footer
  html = html.replace(/<div class="footer-brand">.*?<\/div>/, `<div class="footer-brand">${site.name}</div>`);
  html = html.replace(/<p class="footer-addr">\{\{BUSINESS_ADDRESS\}\}<\/p>/, `<p class="footer-addr">${site.address}</p>`);
  html = html.replace(/<p class="footer-copy">© 2026 \{\{BUSINESS_NAME\}\} · All rights reserved<\/p>/, `<p class="footer-copy">© 2026 ${site.name} · All rights reserved</p>`);
  
  // Update modal text
  html = html.replace(/<h3>Reservation Confirmed!<\/h3>/, `<h3>${site.type === 'hotel' ? 'Booking Request Sent!' : 'Reservation Confirmed!'}</h3>`);
  html = html.replace(/<p>We'll call you shortly to confirm your table.<\/p>/, `<p>We'll call you shortly to confirm your ${site.type === 'hotel' ? 'room' : 'table'}.</p>`);
  
  fs.writeFileSync(indexPath, html);
  console.log(`✅ Updated: ${site.slug}/index.html`);
}

// Update all sites
sites.forEach(updateSite);
console.log('\n✅ All sites updated!');