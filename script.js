// === Affiliate tracking pr. butik (Partner-ads) ===
// Brug de skabeloner du sendte (PRODUKTLINK udskiftes automatisk)
// Der tilføjes også ?subid=... hvis det ikke findes i skabelonen.
const SHOP_TRACKING = {
  "Den Sidste Flaske":
    "https://www.partner-ads.com/dk/klikbanner.php?partnerid=50537&bannerid=68720&htmlurl=PRODUKTLINK",
  "DH Wines":
    "https://www.partner-ads.com/dk/klikbanner.php?partnerid=50537&bannerid=108257&htmlurl=PRODUKTLINK",
  "Winther Vin":
    "https://www.partner-ads.com/dk/klikbanner.php?partnerid=50537&bannerid=76709&htmlurl=PRODUKTLINK"
};

// Global UTM + subid-mønster
const AFFILIATE = {
  utm: { source: "vinmatcher", medium: "match", campaign: "pairing" },
  subid: "{query}-{id}-{pos}" // søgetekst + produkt-id + position
};

// Læg UTM + subid på et “rent” produktlink
function withUtm(url, utm, sub) {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", utm.source);
    u.searchParams.set("utm_medium", utm.medium);
    u.searchParams.set("utm_campaign", utm.campaign);
    if (sub) u.searchParams.set("subid", sub);
    return u.toString();
  } catch (e) {
    return url; // hvis URL-parser fejler, brug original
  }
}

// Byg endeligt affiliate-link (Partner-ads redirect pr. butik)
function buildLink(shop, productUrl, query, id, pos) {
  const sub = (AFFILIATE.subid || "{query}-{id}-{pos}")
    .replace("{query}", (query || "homepage"))
    .replace("{id}", id)
    .replace("{pos}", String(pos));

  // læg UTM på det rene produktlink
  const urlWithUtm = withUtm(productUrl, AFFILIATE.utm, sub);

  const tpl = SHOP_TRACKING[shop];
  if (!tpl) {
    // fallback: direkte link med UTM hvis vi ikke har skabelon
    return urlWithUtm;
  }

  // erstat PRODUKTLINK + tilføj subid hvis skabelonen ikke allerede har det
  let out = tpl.replace("PRODUKTLINK", encodeURIComponent(urlWithUtm));
  if (!/[?&]subid=/.test(out)) {
    out += (out.includes("?") ? "&" : "?") + "subid=" + encodeURIComponent(sub);
  }
  return out;
}

// === Produkter til forsiden (“Se dine bedste match her”) ===
// Priser sat til null → UI viser “Se pris”. Udfyld tal når du har dem.
const WINES = [
  {
    id: "dsf1",
    name: "Boccantino Primitivo Susumaniello Salento 2024",
    shop: "Den Sidste Flaske",
    price: null,
    style: "Tør rød, italiensk",
    features: { acid: 2, tannin: 2, sweet: 1, body: 3, oak: 1, aromatic: 1, alcohol: 2 },
    tags: ["#Italien", "#Primitivo", "#Susumaniello"],
    url: "https://densidsteflaske.dk/products/primitivo-susumaniello-salento-boccantino-2024"
  },
  {
    id: "dh2",
    name: "David Finlayson Pinot Noir 2022",
    shop: "DH Wines",
    price: null,
    style: "Tør rød, sydafrikansk",
    features: { acid: 2, tannin: 1, sweet: 0, body: 2, oak: 1, aromatic: 2, alcohol: 2 },
    tags: ["#Sydafrika", "#PinotNoir"],
    url: "https://dhwines.dk/products/david-finlayson-pinot-noir-2022"
  },
  {
    id: "wv3",
    name: "Think Big Zinfandel 2021 (75 cl)",
    shop: "Winther Vin",
    price: null,
    style: "Tør rød, californisk",
    features: { acid: 1, tannin: 2, sweet: 1, body: 3, oak: 2, aromatic: 1, alcohol: 3 },
    tags: ["#USA", "#Zinfandel", "#2021"],
    url: "https://winthervin.dk/shop/think-big-zinfandel-2021-75-cl/"
  }
];

// === Søgning og match ===
const CHIPS = ["Bolognese", "Grill aften", "Sushi", "Ostebord", "Tapas", "Italien", "Hyggestemning"];

function analyzeQuery(q) {
  q = (q || "").toLowerCase();
  const tags = [];
  if (/(bolognese|tomat|pasta)/.test(q)) tags.push("dish:tomatsauce");
  if (/(grill|grillet|bbq|røg|røget)/.test(q)) tags.push("tag:grill");
  if (/(stærk|spicy|chili)/.test(q)) tags.push("taste:spicy");
  if (/(okse|bøf|rødt kød|oksesteg)/.test(q)) tags.push("protein:red_meat");
  if (/(fisk|torsk|laks|frisk fisk)/.test(q)) tags.push("protein:fish");
  if (/(hygg|hygge|stemning)/.test(q)) tags.push("mood:hyggestemning");
  if (/(italien|italiansk)/.test(q)) tags.push("cuisine:italian");
  if (/(ost|ostebord|cheese)/.test(q)) tags.push("dish:cheese");
  if (/(sushi)/.test(q)) tags.push("dish:sushi");
  return tags;
}

function scoreWine(w, tags) {
  let s = 0;
  const f = (k) => (w.features?.[k] || 0);
  const boost = (k, v) => { s += f(k) * v; };
  tags.forEach((t) => {
    if (t === "dish:tomatsauce") { boost("acid", 2); boost("tannin", 1); }
    if (t === "tag:grill") { boost("oak", 1); boost("body", 1); }
    if (t === "taste:spicy") { boost("sweet", 2); s -= (f("alcohol") || 0); }
    if (t === "protein:red_meat") { boost("tannin", 2); boost("body", 1); }
    if (t === "protein:fish") { boost("acid", 2); }
    if (t === "dish:cheese") { boost("body", 1); boost("aromatic", 1); }
    if (t === "dish:sushi") { boost("acid", 2); boost("sparkling", 1); }
    if (t === "cuisine:italian") { s += w.name.toLowerCase().includes("chianti") ? 2 : 0; }
  });
  return Math.max(0, Math.round(70 + s)); // baseline for pæn skala
}

// Render kortene i “Se dine bedste match her”
function render(results, q) {
  const el = document.getElementById("results");
  if (!el) return; // hvis siden ikke har sektionen endnu
  el.innerHTML = "";
  results.forEach(({ w, score }, idx) => {
    const a = buildLink(w.shop, w.url, q, w.id, idx + 1);
    const priceTxt = (w.price || w.price === 0) ? `${w.price} kr` : "Se pris";
    const art = document.createElement("article");
    art.className = "card wine-card";
    art.innerHTML = `
      <div class="title">${w.name}</div>
      <div class="meta"><span class="shop"><span class="shop-dot"></span>${w.shop}</span> • ${w.style}</div>
      <div><span class="badge">Match ${score}%</span> ${(w.tags || []).join(" ")}</div>
      <div class="row">
        <div class="price">${priceTxt}</div>
        <a class="btn" href="${a}" target="_blank" rel="nofollow sponsored">Se tilbud</a>
      </div>`;
    el.appendChild(art);
  });
}

// Kør søgning + byg chips
function runSearch() {
  const qEl = document.getElementById("q");
  const q = qEl ? qEl.value : "";
  const tags = analyzeQuery(q);
  const results = WINES
    .map(w => ({ w, score: scoreWine(w, tags) }))
    .sort((a, b) => b.score - a.score);
  render(results, q);
}

document.addEventListener("DOMContentLoaded", () => {
  // chips (valgfrit)
  const chipsEl = document.getElementById("chips");
  if (chipsEl) {
    CHIPS.forEach(s => {
      const b = document.createElement("button");
      b.className = "chip";
      b.textContent = s;
      b.onclick = () => {
        const q = document.getElementById("q");
        if (q) { q.value = s; runSearch(); }
      };
      chipsEl.appendChild(b);
    });
  }

  const q = document.getElementById("q");
  if (q) q.addEventListener("input", runSearch);

  runSearch();
});
