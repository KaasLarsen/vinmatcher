// simple client-side partial loader
(async function(){
  const nodes = document.querySelectorAll("[data-include]");
  for (const el of nodes){
    const file = el.getAttribute("data-include");
    if (!file) continue;
    try{
      const res = await fetch(file, { cache: "no-store" });
      const html = await res.text();
      el.outerHTML = html;
    }catch(e){ console.warn("include failed:", file, e); }
  }
})().then(()=>{
  const path = location.pathname.replace(/\/index\.html?$/,"/");
  document.querySelectorAll('a[data-nav]').forEach(a=>{
    const href = a.getAttribute('href')||"";
    const hp = href.replace(/\/index\.html?$/,"/");
    if (hp === path){ a.classList.add('is-active'); }
  });
});
