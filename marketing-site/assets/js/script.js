/* ============================================================
   ZURI MARKETING SITE — SHARED SCRIPT
   Used by: about.html, pricing.html, terms.html, privacy.html, 404.html
   (index.html uses its own home.js in addition to this file, for the
   hero 3D scene and the feature carousel — see home.js)
   ============================================================ */

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- Ambient starfield (lighter version, no burst) ---------------- */
(function(){
  const c = document.getElementById('dust-canvas');
  if(!c) return;
  const ctx = c.getContext('2d');
  let w,h,dpr,cx,cy;
  function size(){
    dpr = Math.min(window.devicePixelRatio,2);
    w = window.innerWidth; h = window.innerHeight;
    c.width = w*dpr; c.height = h*dpr;
    c.style.width = w+'px'; c.style.height = h+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    cx = w/2; cy = h/2;
  }
  size();
  window.addEventListener('resize', size);

  const COUNT = prefersReducedMotion ? 0 : 180;
  const FOCAL = 260;
  const SPEED = 0.09;

  function spawnStar(){
    return {
      x:(Math.random()-0.5)*w*1.6,
      y:(Math.random()-0.5)*h*1.6,
      z:0.15+Math.random()*1,
      gold:Math.random()<0.3,
      tw:Math.random()*Math.PI*2
    };
  }
  const stars = Array.from({length:COUNT}, spawnStar);

  function draw(now){
    ctx.fillStyle = 'rgba(10,10,10,0.35)';
    ctx.fillRect(0,0,w,h);
    for(const s of stars){
      s.z -= SPEED*0.016;
      if(s.z<=0.02) Object.assign(s, spawnStar(), {z:1});
      const sx = cx + (s.x/s.z)*(FOCAL/300);
      const sy = cy + (s.y/s.z)*(FOCAL/300);
      if(sx<-20||sx>w+20||sy<-20||sy>h+20) continue;
      const depth = 1-s.z;
      const r = Math.max(0.3, depth*1.8);
      const tw = 0.5+0.4*Math.sin(now*0.002+s.tw);
      const alpha = Math.min(0.85, depth*0.9)*tw;
      ctx.beginPath();
      ctx.arc(sx,sy,r,0,Math.PI*2);
      ctx.fillStyle = s.gold ? `rgba(240,200,120,${alpha})` : `rgba(201,206,214,${alpha*0.85})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  if(!prefersReducedMotion) requestAnimationFrame(draw);
  else { ctx.fillStyle='#0a0a0a'; ctx.fillRect(0,0,w,h); }
})();

/* ---------------- Navbar scroll state ----------------
   Works for both .navbar (always-solid, default) and .navbar.home
   (transparent-to-solid) — the "scrolled" class is harmless either way. */
(function(){
  const nav = document.getElementById('navbar');
  if(!nav) return;
  function onScroll(){
    if(window.scrollY > 20) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  onScroll();
})();

/* ---------------- Hamburger / drawer ---------------- */
(function(){
  const hamburger = document.getElementById('hamburger');
  const drawer = document.getElementById('drawer');
  const backdrop = document.getElementById('drawer-backdrop');
  if(!hamburger || !drawer || !backdrop) return;

  let openState = false;
  function setOpen(next){
    openState = next;
    hamburger.classList.toggle('open', next);
    drawer.classList.toggle('open', next);
    backdrop.classList.toggle('open', next);
    /* Defer body overflow — not needed for next paint */
    const applyOverflow = ()=>{ document.body.style.overflow = next ? 'hidden' : ''; };
    if('requestIdleCallback' in window) requestIdleCallback(applyOverflow, {timeout:100});
    else setTimeout(applyOverflow, 0);
  }
  hamburger.addEventListener('click', ()=> setOpen(!openState));
  backdrop.addEventListener('click', ()=> setOpen(false));
  drawer.addEventListener('click', (e)=>{
    if(e.target.closest('a,button')) setOpen(false);
  });
  window.addEventListener('keydown', e=>{ if(e.key==='Escape' && openState) setOpen(false); });
  window.addEventListener('resize', ()=>{ if(window.innerWidth>900 && openState) setOpen(false); });
})();

/* ---------------- Scroll reveal ---------------- */
(function(){
  const revealEls = document.querySelectorAll('.reveal');
  if(!revealEls.length) return;

  function markInView(el){
    el.classList.add('in', 'in-view');
  }

  function initReveal(){
    if(prefersReducedMotion){
      revealEls.forEach(markInView);
      return;
    }
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          markInView(e.target);
          io.unobserve(e.target);
        }
      });
    },{threshold:0.2});
    revealEls.forEach(el=>io.observe(el));
  }

  if('requestIdleCallback' in window){
    requestIdleCallback(initReveal, {timeout:1200});
  } else {
    setTimeout(initReveal, 1);
  }
})();

/* ---------------- Timeline pulse-once (How it works) ---------------- */
(function(){
  const items = document.querySelectorAll('.timeline-item');
  if(!items.length) return;
  if(prefersReducedMotion){
    items.forEach(el=>el.classList.add('pulse-once'));
    return;
  }
  function initTimeline(){
    const io = new IntersectionObserver((entries)=>{
      entries.forEach(e=>{
        if(e.isIntersecting){
          e.target.classList.add('pulse-once');
          io.unobserve(e.target);
        }
      });
    },{threshold:0.35});
    items.forEach(el=>io.observe(el));
  }
  if('requestIdleCallback' in window){
    requestIdleCallback(initTimeline, {timeout:1500});
  } else {
    setTimeout(initTimeline, 50);
  }
})();

/* ---------------- Ghost button auto-pulse CTA cycle ---------------- */
(function(){
  if(prefersReducedMotion) return;
  const HOLD_MS = 5000, FADE_MS = 2000;
  document.querySelectorAll('.btn-ghost').forEach(btn=>{
    let hovering=false, timer=null;
    function activate(){
      if(hovering) return;
      btn.classList.remove('auto-fading');
      /* Avoid forced reflow (offsetWidth); restart via rAF class toggle */
      btn.classList.remove('auto-active');
      requestAnimationFrame(()=>{
        if(hovering) return;
        btn.classList.add('auto-active');
        timer = setTimeout(()=>{ if(!hovering) fade(); }, HOLD_MS);
      });
    }
    function fade(){
      btn.classList.remove('auto-active');
      btn.classList.add('auto-fading');
      timer = setTimeout(()=>{ btn.classList.remove('auto-fading'); activate(); }, FADE_MS);
    }
    function onEnter(){ hovering=true; clearTimeout(timer); btn.classList.remove('auto-active','auto-fading'); }
    function onLeave(){ hovering=false; clearTimeout(timer); timer=setTimeout(activate,500); }
    btn.addEventListener('mouseenter', onEnter);
    btn.addEventListener('mouseleave', onLeave);
    btn.addEventListener('touchstart', onEnter, {passive:true});
    btn.addEventListener('touchend', onLeave, {passive:true});
    activate();
  });
})();

/* Magnetic / 3D tilt removed — pure CSS :hover only (INP).
   No document/window cursor-tracking for ambient orbs. */

/* ---------------- FAQ accordion ---------------- */
(function(){
  document.querySelectorAll('.faq-item').forEach(item=>{
    const q = item.querySelector('.faq-question');
    const a = item.querySelector('.faq-answer');
    if(!q || !a) return;
    q.addEventListener('click', ()=>{
      const isOpen = item.classList.contains('open');
      document.querySelectorAll('.faq-item.open').forEach(other=>{
        if(other!==item){ other.classList.remove('open'); other.querySelector('.faq-answer').style.maxHeight = null; }
      });
      item.classList.toggle('open', !isOpen);
      a.style.maxHeight = !isOpen ? a.scrollHeight+'px' : null;
    });
  });
})();

/* ---------------- Pricing billing toggle — generic, data-attribute driven ----------------
   Any .plan-price element with data-monthly + data-annual attributes will be
   updated automatically. Works uniformly across index.html (4 plans) and
   pricing.html (4 plans) without page-specific hardcoded IDs. */
(function(){
  const sw = document.getElementById('billing-switch');
  if(!sw) return;
  const priceEls = document.querySelectorAll('.plan-price[data-monthly]');
  sw.addEventListener('click', ()=>{
    const on = sw.classList.toggle('on');
    priceEls.forEach(el=>{
      const monthly = el.getAttribute('data-monthly');
      const annual = el.getAttribute('data-annual');
      if(monthly === '0'){ return; } // Free plan — no change
      el.innerHTML = on ? `${annual} <span>/yr</span>` : `${monthly} <span>/mo</span>`;
    });
  });
})();