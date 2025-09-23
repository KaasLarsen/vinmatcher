// Partner-ads: butiksspecifik skabelon
const SHOP_TRACKING = {
  "Den Sidste Flaske": "https://www.partner-ads.com/dk/klikbanner.php?partnerid=50537&bannerid=68720&htmlurl=PRODUKTLINK",
  "DH Wines": "https://www.partner-ads.com/dk/klikbanner.php?partnerid=50537&bannerid=108257&htmlurl=PRODUKTLINK",
  "Winther Vin": "https://www.partner-ads.com/dk/klikbanner.php?partnerid=50537&bannerid=76709&htmlurl=PRODUKTLINK"
};

// Global UTM + subid
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

function buildLink(shop, productUrl, query, id, pos){
  const sub = (AFFILIATE.subid||"{query}-{id}-{pos}")
    .replace("{query}", (query||"homepage"))
    .replace("{id}", id)
    .replace("{pos}", String(pos));

  // læg UTM på det rene produktlink
  const urlWithUtm = withUtm(productUrl, AFFILIATE.utm, sub);

  // butiksskabelon fra Partner-ads
  const tpl = SHOP_TRACKING[shop];
  if (!tpl){
    // fallback til direkte link med UTM
    return urlWithUtm;
  }
  // erstat PRODUKTLINK og tilføj subid som ekstra param hvis mangler
  let out = tpl.replace("PRODUKTLINK", encodeURIComponent(urlWithUtm));
  if (!/[?&]subid=/.test(out)){
    out += (out.includes("?") ? "&" : "?") + "subid=" + encodeURIComponent(sub);
  }
  return out;
}

// Forsidens 3 produkter (dine rene links + korrekt butik)
const WINES = [
  { id:"dsf1", name:"Boccantino Primitivo Susumaniello Salento 2024", shop:"Den Sidste Flaske",
    price:null, style:"Tør rød, italiensk",
    features:{acid:2,tannin:2,sweet:1,body:3,oak:1,aromatic:1,alcohol:2},
    tags:["#Italien","#Primitivo","#Susumaniello"],
    url:"https://densidsteflaske.dk/products/primitivo-susumaniello-salento-boccantino-2024"
  },
  { id:"dh2", name:"David Finlayson Pinot Noir 2022", shop:"DH Wines",
    price:null, style:"Tør rød, sydafrikansk",
    features:{acid:2,tannin:1,sweet:0,body:2,oak:1,aromatic:2,alcohol:2},
    tags:["#Sydafrika","#PinotNoir"],
    url:"https://dhwines.dk/products/david-finlayson-pinot-noir-2022"
  },
  { id:"wv3", name:"Think Big Zinfandel 2021 (75 cl)", shop:"Winther Vin",
    price:null, style:"Tør rød, californisk",
    features:{acid:1,tannin:2,sweet:1,body:3,oak:2,aromatic:1,alcohol:3},
    tags:["#USA","#Zinfandel","#2021"],
    url:"https://winthervin.dk/shop/think-big-zinfandel-2021-75-cl/"
  }
];

// Chips (små genveje)
const CHIPS = ["Bolognese","Grill aften","Sushi","Ostebord","Tapas","Italien","Hyggestemning"];

document.addEventListener("DOMContentLoaded", ()=>{
  const chipsEl = document.getElementById("chips");
  if (chipsEl){
    CHIPS.forEach(s=>{
      const b=document.createElement("button");
      b.className="chip";
      b.textContent=s;
      b.onclick=()=>{ const q=document.getElementById("q"); if(q){ q.value=s; runSearch(); } };
      chipsEl.appendChild(b);
    });
  }
  const q=document.getElementById("q");
  if (q){ q.addEventListener("input", runSearch); }
  runSearch();
});

// Query → tags
function analyzeQuery(q){
  q=(q||"").toLowerCase();
  const tags=[];
  if (/(bolognese|tomat|pasta)/.test(q)) tags.push("dish:tomatsauce");
 
