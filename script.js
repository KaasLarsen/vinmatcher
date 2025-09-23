// minimal søgning + UTM tracking (shop-specifik tracking tages senere)
const AFFILIATE = {
  utm: { source: "vinmatcher", medium: "match", campaign: "pairing" },
  subid: "{query}-{id}-{pos}"
};

function withUtm(url, utm, sub){
  try{
    const u = new URL(url);
    u.searchParams.set("utm_source", utm.source);
    u.searchParams.set("utm_medium", utm.medium);
    u.searchParams.set("utm_campaign", utm.campaign);
    if (sub) u.searchParams.set("subid", sub);
    return u.toString();
  }catch(e){ return url; }
}

function buildAffiliateLink(productUrl, query, id, pos){
  const sub = (AFFILIATE.subid||"{query}-{id}-{pos}")
    .replace("{query}", (query||"homepage"))
    .replace("{id}", id)
    .replace("{pos}", String(pos));
  return withUtm(productUrl, AFFILIATE.utm, sub);
}

// demo-data
const WINES = [
  { id:"1", name:"Chianti Classico DOCG", shop:"Jysk Vin", price:99, style:"tør rød, italiensk",
    features:{acid:3,tannin:3,sweet:0,body:2,oak:1,aromatic:1,alcohol:2},
    tags:["#italien","#sangiovese"],
    url:"https://www.jyskvin.dk/chianti-classico-docg"
  },
  { id:"2", name:"Riesling Kabinett", shop:"Beer Me", price:89, style:"halvsød hvid, tysk",
    features:{acid:3,tannin:0,sweet:2,body:1,oak:0,aromatic:3,alcohol:1},
    tags:["#tyskland","#riesling"],
    url:"https://www.beerme.dk/riesling-kabinett"
  },
  { id:"3", name:"Cava Brut", shop:"Jysk Vin", price:69, style:"tør bobler, spansk",
    features:{acid:3,tannin:0,sweet:0,body:1,oak:0,aromatic:1,sparkling:1,alcohol:2},
    tags:["#spanien","#cava"],
    url:"https://www.jyskvin.dk/cava-brut"
  }
];

// chips
const CHIPS = ["bolognese","grill aften","sushi","ostebord","tapas","italien","hyggestemning"];
const chipsEl = document.getElementById("chips");
CHIPS.forEach(s=>{
  const b=document.createElement("button");
  b.textContent=s; b.onclick=()=>{ document.getElementById("q").value=s; runSearch(); };
  chipsEl.appendChild(b);
});

function analyzeQuery(q){
  q = (q||'').toLowerCase();
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

function scoreWine(w, tags){
  let s = 0;
  const f = (k)=> (w.features?.[k]||0);
  const boost = (k,v)=>{ s += f(k)*v; };
  tags.forEach(t=>{
    if (t==="dish:tomatsauce"){ boost("acid",2); boost("tannin",1); }
    if (t==="tag:grill"){ boost("oak",1); boost("body",1); }
    if (t==="taste:spicy"){ boost("sweet",2); s -= (f("alcohol")||0)*1; }
    if (t==="protein:red_meat"){ boost("tannin",2); boost("body",1); }
    if (t==="protein:fish"){ boost("acid",2); }
    if (t==="dish:cheese"){ boost("body",1); boost("aromatic",1); }
    if (t==="dish:sushi"){ boost("acid",2); boost("sparkling",1); }
    if (t==="cuisine:italian"){ s += w.name.toLowerCase().includes("chianti") ? 2 : 0; }
  });
  return Math.max(0, Math.round(70 + s));
}

function render(results, q){
  const el = document.getElementById("results");
  el.innerHTML = "";
  results.forEach(({w,score}, idx)=>{
    const href = buildAffiliateLink(w.url, q, w.id, idx+1);
    const card=document.createElement("article"); card.className="card";
    card.innerHTML = `
      <div class="title">${w.name}</div>
      <div class="meta"><span class="shop"><span class="shop-dot"></span>${w.shop}</span> • ${w.style}</div>
      <div><span class="badge">match ${score}%</span>${(w.tags||[]).join(" ")}</div>
      <div class="row">
        <div class="price">${w.price} kr</div>
        <a class="btn" href="${href}" target="_blank" rel="nofollow sponsored">se tilbud</a>
      </div>`;
    el.appendChild(card);
  });
}

function runSearch(){
  const q = document.getElementById("q").value;
  const tags = analyzeQuery(q);
  const results = WINES.map(w=>({ w, score: scoreWine(w, tags)})).sort((a,b)=> b.score - a.score);
  render(results, q);
}

document.getElementById("q").addEventListener("input", runSearch);
document.getElementById("y").textContent = new Date().getFullYear();
runSearch();
