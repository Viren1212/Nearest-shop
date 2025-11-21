  /***************************************************************************
   * Item-Based Nearby Shop Discovery Prototype
   * - Client-side only demo (localStorage persistence)
   * - Search + filters + map + admin demo
   **************************************************************************/

  // --------- Sample Data ----------

  document.getElementById("loginBtn").addEventListener("click", () => {
    document.getElementById("loginModal").style.display = "block";
});

function closeLogin() {
    document.getElementById("loginModal").style.display = "none";
}

async function loginUser() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.status === "success") {
        alert("Login Successful!");

        document.getElementById("loginModal").style.display = "none";
        document.getElementById("loginBtn").style.display = "none";
        document.getElementById("logoutBtn").style.display = "inline-block";

        if (data.role === "admin") {
            document.getElementById("adminPanel").style.display = "block";
        } else {
            document.getElementById("adminPanel").style.display = "none";
        }
    } else {
        alert("Invalid Login");
    }
}
async function logoutUser() {
    await fetch("/logout");
    alert("Logged out!");

    document.getElementById("loginBtn").style.display = "inline-block";
    document.getElementById("logoutBtn").style.display = "none";
    document.getElementById("adminPanel").style.display = "none"; 
}

  const SAMPLE = [
    { id:'s1', name:'Sharma Grocery', category:'Grocery', lat:30.6939, lon:76.8573, rating:4.3, visits:1200, phone:'+91 98765 43210', hours:'8am - 10pm', description:'Local grocery with fresh produce.', photos:[], reviews:[{user:'Asha',score:5,comment:'Fresh items'}], items:[{name:'Milk',price:60,stock:25},{name:'Rice 5kg',price:240,stock:10},{name:'Toothpaste',price:80,stock:0}] },
    { id:'s2', name:'City Pharmacy', category:'Pharmacy', lat:30.6955, lon:76.8620, rating:4.6, visits:800, phone:'+91 99886 55443', hours:'9am - 9pm', description:'Medicines & health essentials.', photos:[], reviews:[{user:'Rahul',score:4,comment:'Helpful staff.'}], items:[{name:'Paracetamol',price:30,stock:50},{name:'Thermometer',price:450,stock:5}] },
    { id:'s3', name:'ElectroWorld', category:'Electronics', lat:30.6910, lon:76.8615, rating:4.0, visits:400, phone:'+91 91234 56789', hours:'10am - 8pm', description:'Gadgets and accessories.', photos:[], reviews:[], items:[{name:'Mobile Charger',price:299,stock:12},{name:'Earbuds',price:999,stock:3}] },
    { id:'s4', name:'Fashion Hub', category:'Clothing', lat:30.6895, lon:76.8600, rating:3.9, visits:320, phone:'+91 90123 45678', hours:'10:30am - 9:30pm', description:'Trendy clothing.', photos:[], reviews:[], items:[{name:'T-Shirt',price:499,stock:20}] },
    { id:'s5', name:'Daily Bakery', category:'Bakery', lat:30.6970, lon:76.8590, rating:4.7, visits:2100, phone:'+91 90000 11111', hours:'7am - 9pm', description:'Fresh bread & sweets daily.', photos:[], reviews:[{user:'Neha',score:5,comment:'Best croissants'}], items:[{name:'Bread',price:40,stock:30},{name:'Croissant',price:60,stock:5}] }
  ];

  // --------- App State ----------
  let shops = loadShops();
  let map, markersLayer, userLocation=null, miniMap;

  // --------- Utilities ----------
  function saveShops(){ localStorage.setItem('ns_items_shops', JSON.stringify(shops)); }
  function loadShops(){ const s = localStorage.getItem('ns_items_shops'); if(s) return JSON.parse(s); localStorage.setItem('ns_items_shops', JSON.stringify(SAMPLE)); return JSON.parse(localStorage.getItem('ns_items_shops')); }

  function haversine(lat1,lon1,lat2,lon2){ const R=6371; const r=Math.PI/180; const dLat=(lat2-lat1)*r; const dLon=(lon2-lon1)*r; const a=Math.sin(dLat/2)**2 + Math.cos(lat1*r)*Math.cos(lat2*r)*Math.sin(dLon/2)**2; return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a)); }

  function formatPrice(p){ if(p==null) return '—'; return '₹' + p; }

  // --------- Map ----------
  function initMap(){ map = L.map('map').setView([30.6939,76.8573],14); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19, attribution:'© OpenStreetMap'}).addTo(map); markersLayer = L.layerGroup().addTo(map); renderMarkers(); }

  function renderMarkers(filtered=null){ markersLayer.clearLayers(); const list = (filtered||shops);
    list.forEach(s=>{
      const marker = L.marker([s.lat,s.lon]).addTo(markersLayer).bindPopup(`<b>${s.name}</b><br>${s.category}<br>${s.rating} ★`);
      marker.on('click', ()=> openModal(s));
    });
  }

  // --------- Rendering UI ----------
  function renderFeatured(){ const el = document.getElementById('featured'); el.innerHTML=''; const featured = shops.slice().sort((a,b)=> (b.rating + b.visits/1000) - (a.rating + a.visits/1000)).slice(0,6);
    featured.forEach(s=>{ const d = document.createElement('div'); d.className='item'; d.innerHTML=`<div style="font-weight:700">${s.name}</div><div class="muted">${s.category}</div><div style="margin-top:6px;font-weight:700;color:var(--accent)">${s.rating} ★</div>`; d.addEventListener('click', ()=> map.setView([s.lat,s.lon],16)); el.appendChild(d); }); }

  function renderList(results){ const list = document.getElementById('list'); list.innerHTML=''; document.getElementById('resultCount').innerText = results.length + ' results';
    results.forEach(s=>{
      const div = document.createElement('div'); div.className='shop-card';
      // If current search is item-based, show availability
      const itemQuery = window.currentItemQuery;
      let availHTML = '';
      if(itemQuery){ const it = s.items.find(i=> i.name.toLowerCase() === itemQuery.toLowerCase()); if(it){ availHTML = `<div class="muted">In Stock: <strong>${it.stock}</strong> · ${formatPrice(it.price)}</div>` } else { availHTML = `<div class="muted">Not stocked</div>` } }

      div.innerHTML = `
        <div class="thumb">${s.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div>
        <div class="shop-info">
          <div style="display:flex;justify-content:space-between;align-items:center"><div><strong>${s.name}</strong> <span class="muted">· ${s.category}</span></div><div><span class="pill">${s.rating} ★</span></div></div>
          <div class="meta">${s.visits} visits · ${s.phone || '—'}</div>
          <div style="margin-top:6px">${availHTML}</div>
        </div>
        <div class="actions">
          <button class="small-btn" onclick='openModalById("${s.id}")'>View Details</button>
          <button class="small-btn" onclick='centerOn("${s.id}")'>Locate</button>
        </div>
      `;
      list.appendChild(div);
    }); }

  // --------- Search & Filter Logic ----------
  function searchAll(){
    const q = document.getElementById('globalSearch').value.trim();
    const mode = document.getElementById('searchMode').value;
    const category = document.getElementById('categoryFilter').value;
    const dist = parseFloat(document.getElementById('distanceFilter').value || Infinity);
    const rating = parseFloat(document.getElementById('ratingFilter').value || 0);
    const availability = document.getElementById('availabilityFilter').value;
    const sort = document.getElementById('sortBy').value;

    // Determine whether we're searching by item or shop
    let itemQuery = null;
    let shopQuery = null;
    if(mode === 'item') itemQuery = q;
    else if(mode === 'shop') shopQuery = q;
    else { // auto: if any shop name matches, treat as shop; else treat as item
      const ql = q.toLowerCase();
      const shopMatch = shops.find(s => s.name.toLowerCase().includes(ql) || (s.category && s.category.toLowerCase().includes(ql)));
      if(shopMatch) shopQuery = q; else itemQuery = q;
    }
    window.currentItemQuery = itemQuery; // used by renderList

    let out = shops.slice();
    if(shopQuery){ const ql = shopQuery.toLowerCase(); out = out.filter(s => s.name.toLowerCase().includes(ql) || (s.category && s.category.toLowerCase().includes(ql))); }
    if(itemQuery){ const ql = itemQuery.toLowerCase(); out = out.filter(s => s.items.some(i => i.name.toLowerCase().includes(ql))); }
    if(category) out = out.filter(s => s.category === category);
    if(rating) out = out.filter(s => s.rating >= rating);
    if(userLocation && isFinite(dist)) out = out.filter(s => haversine(userLocation.lat, userLocation.lon, s.lat, s.lon) <= dist);

    // availability filter
    if(availability === 'instock' && itemQuery){ out = out.filter(s => { const it = s.items.find(i=> i.name.toLowerCase().includes(itemQuery.toLowerCase())); return it && it.stock > 0; }); }
    if(availability === 'lowstock' && itemQuery){ out = out.filter(s => { const it = s.items.find(i=> i.name.toLowerCase().includes(itemQuery.toLowerCase())); return it && it.stock > 0 && it.stock < 5; }); }

    // annotate distances
    out.forEach(s=> s._distance = userLocation ? haversine(userLocation.lat,userLocation.lon,s.lat,s.lon) : Infinity);

    // sorting
    if(sort === 'nearest' && userLocation){ out.sort((a,b)=> a._distance - b._distance); }
    else if(sort === 'rating'){ out.sort((a,b)=> b.rating - a.rating); }
    else if(sort === 'topstock' && itemQuery){ out.sort((a,b)=> { const ai = a.items.find(i=> i.name.toLowerCase().includes(itemQuery.toLowerCase()))?.stock || 0; const bi = b.items.find(i=> i.name.toLowerCase().includes(itemQuery.toLowerCase()))?.stock || 0; return bi - ai; }); }
    else if(sort === 'lowprice' && itemQuery){ out.sort((a,b)=> { const ap = a.items.find(i=> i.name.toLowerCase().includes(itemQuery.toLowerCase()))?.price || Infinity; const bp = b.items.find(i=> i.name.toLowerCase().includes(itemQuery.toLowerCase()))?.price || Infinity; return ap - bp; }); }

    renderList(out);
    renderMarkers(out);
  }

  // --------- Modal (Shop Details) ----------
  function openModal(shop){ document.getElementById('modal').style.display='flex'; document.getElementById('modalName').innerText = shop.name; document.getElementById('modalDesc').innerText = shop.description || '';
    document.getElementById('modalContact').innerText = shop.phone || '—'; document.getElementById('modalHours').innerText = shop.hours || '—';
    // items
    const tbody = document.querySelector('#itemsTable tbody'); tbody.innerHTML=''; shop.items.forEach(it=>{
      const tr = document.createElement('tr'); tr.innerHTML = `<td>${it.name}</td><td>${formatPrice(it.price)}</td><td>${it.stock}</td><td><button class="small-btn" onclick='buyItem("${shop.id}","${it.name}")'>Buy</button></td>`; tbody.appendChild(tr);
    });
    // reviews
    const rv = document.getElementById('modalReviews'); rv.innerHTML=''; (shop.reviews||[]).forEach(r=>{ const d=document.createElement('div'); d.innerHTML = `<strong>${r.user}</strong> · ${r.score} ★<div class="muted">${r.comment}</div>`; rv.appendChild(d); });

    // mini map
    setTimeout(()=>{ if(miniMap) miniMap.remove(); miniMap = L.map('modalMiniMap',{attributionControl:false,zoomControl:false}).setView([shop.lat,shop.lon],15); L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(miniMap); L.marker([shop.lat,shop.lon]).addTo(miniMap).bindPopup(shop.name).openPopup(); },50);

    document.getElementById('openDirections').onclick = ()=>{ const url = userLocation ? `https://www.google.com/maps/dir/?api=1&origin=${userLocation.lat},${userLocation.lon}&destination=${shop.lat},${shop.lon}` : `https://www.google.com/maps/search/?api=1&query=${shop.lat},${shop.lon}`; window.open(url,'_blank'); }
  }

  window.openModalById = function(id){ const s = shops.find(x=> x.id === id); if(s) openModal(s); }
  window.centerOn = function(id){ const s = shops.find(x=> x.id === id); if(s) map.setView([s.lat,s.lon],16); }

  document.getElementById('closeModal').addEventListener('click', ()=>{ document.getElementById('modal').style.display='none'; if(miniMap) miniMap.remove(); });

  // Simulate buy: decrease stock (admin/demo only)
  window.buyItem = function(shopId, itemName){ const s = shops.find(x=> x.id === shopId); if(!s) return; const it = s.items.find(i=> i.name === itemName); if(!it){ alert('Item not found'); return; } if(it.stock <=0){ alert('Out of stock'); return; } if(confirm(`Buy 1 unit of ${it.name} for ${formatPrice(it.price)}?`)){ it.stock -=1; saveShops(); searchAll(); alert('Purchase simulated - stock decremented (demo).'); } }

  // --------- Geolocation ----------
  document.getElementById('detectBtn').addEventListener('click', ()=>{ if(!navigator.geolocation){ alert('Geolocation not supported'); return; } document.getElementById('detectBtn').innerText='Detecting...'; navigator.geolocation.getCurrentPosition(pos=>{ userLocation = {lat:pos.coords.latitude, lon:pos.coords.longitude}; document.getElementById('detectBtn').innerText='Detected'; setTimeout(()=>document.getElementById('detectBtn').innerText='Detect',1200); map.setView([userLocation.lat,userLocation.lon],14); L.circleMarker([userLocation.lat,userLocation.lon],{radius:8,color:varAccent()}).addTo(map).bindPopup('You are here'); searchAll(); }, err=>{ alert('Could not get location: ' + err.message); document.getElementById('detectBtn').innerText='Detect'; }); });

  function varAccent(){ return getComputedStyle(document.documentElement).getPropertyValue('--accent') || '#0b79f7'; }

  // --------- Admin: add shop ----------
  document.getElementById('addShop').addEventListener('click', ()=>{
    const name = document.getElementById('addName').value.trim(); const cat = document.getElementById('addCat').value.trim() || 'Misc'; const lat = parseFloat(document.getElementById('addLat').value); const lon = parseFloat(document.getElementById('addLon').value);
    const rating = parseFloat(document.getElementById('addRating').value) || 4.0; const visits = parseInt(document.getElementById('addVisits').value) || 0;
    if(!name || !lat || !lon){ alert('Provide name, lat and lon'); return; }
    const s = { id:'s'+Date.now(), name, category:cat, lat, lon, rating, visits, phone:'', hours:'9am - 9pm', description:'', photos:[], reviews:[], items:[] };
    shops.push(s); saveShops(); renderFeatured(); searchAll(); renderMarkers(); alert('Shop added (demo)'); document.getElementById('addName').value=''; document.getElementById('addLat').value=''; document.getElementById('addLon').value='';
  });

  document.getElementById('resetBtn').addEventListener('click', ()=>{ if(confirm('Reset demo data?')){ localStorage.removeItem('ns_items_shops'); shops = loadShops(); renderFeatured(); searchAll(); renderMarkers(); } });

  // --------- Feedback ----------
  document.getElementById('sendFeedback').addEventListener('click', ()=>{ const t = document.getElementById('feedback').value.trim(); if(!t){ alert('Type feedback'); return; } alert('Thanks for feedback (demo).'); document.getElementById('feedback').value=''; });

  // --------- Search events ----------
  document.getElementById('searchBtn').addEventListener('click', searchAll);
  document.getElementById('globalSearch').addEventListener('keyup', (e)=>{ if(e.key==='Enter') searchAll(); else {
    // optional: live suggestions could be implemented here
  }});

  // utility: open by id from inline handlers
  window.openModalById = window.openModalById;

  // --------- Boot ----------
  window.addEventListener('load', ()=>{ initMap(); renderFeatured(); searchAll(); });

  async function loginUser() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.status === "success") {
        alert("Logged in as " + data.role);
        updateUI();
    } else {
        alert("Invalid Credentials");
    }
}
async function updateUI() {
    const res = await fetch("/api/whoami");
    const data = await res.json();

    const adminPanel = document.getElementById("adminPanel");
    const userPanel = document.getElementById("userPanel");
    const loginBtn = document.getElementById("openLoginBtn");
    const logoutBtn = document.getElementById("logoutBtn");

    if (!data.logged_in) {
        adminPanel.style.display = "none";
        userPanel.style.display = "none";
        logoutBtn.style.display = "none";
        loginBtn.style.display = "block";
        return;
    }

    loginBtn.style.display = "none";
    logoutBtn.style.display = "block";

    if (data.role === "admin") {
        adminPanel.style.display = "block";
        userPanel.style.display = "none";
    } else {
        adminPanel.style.display = "none";
        userPanel.style.display = "block";
    }
}
async function logoutUser() {
    await fetch("/logout");
    updateUI();
}

document.getElementById("openLoginBtn").addEventListener("click", () => {
    document.getElementById("loginModal").style.display = "block";
});

// Run once when page loads
updateUI();

// -------------------------------
// LOGIN MODAL OPEN/CLOSE
// -------------------------------
document.getElementById("loginBtn").addEventListener("click", () => {
    document.getElementById("loginModal").style.display = "block";
});

function closeLogin() {
    document.getElementById("loginModal").style.display = "none";
}

// -------------------------------
// LOGIN USER
// -------------------------------
async function loginUser() {
    const email = document.getElementById("loginEmail").value;
    const password = document.getElementById("loginPassword").value;

    const res = await fetch("/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });

    const data = await res.json();

    if (data.status === "success") {
        closeLogin();
        updateUI();
    } else {
        alert("Invalid login!");
    }
}

// -------------------------------
// LOGOUT USER
// -------------------------------
async function logoutUser() {
    await fetch("/logout");
    updateUI();
}

// -------------------------------
// UPDATE UI BASED ON ROLE
// -------------------------------
async function updateUI() {
    const res = await fetch("/api/whoami");
    const data = await res.json();

    const loginBtn = document.getElementById("loginBtn");
    const logoutBtn = document.getElementById("logoutBtn");
    const adminPanel = document.getElementById("adminPanel");

    if (!data.logged_in) {
        loginBtn.style.display = "inline-block";
        logoutBtn.style.display = "none";
        adminPanel.style.display = "none";
        return;
    }

    loginBtn.style.display = "none";
    logoutBtn.style.display = "inline-block";

    if (data.role === "admin") {
        adminPanel.style.display = "block";
    } else {
        adminPanel.style.display = "none";
    }
}

// Run on page load
updateUI();

