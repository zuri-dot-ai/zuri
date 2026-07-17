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
  function open(){
    hamburger.classList.add('open'); drawer.classList.add('open'); backdrop.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function close(){
    hamburger.classList.remove('open'); drawer.classList.remove('open'); backdrop.classList.remove('open');
    document.body.style.overflow = '';
  }
  hamburger.addEventListener('click', ()=> hamburger.classList.contains('open') ? close() : open());
  backdrop.addEventListener('click', close);
  drawer.querySelectorAll('a,button').forEach(el=> el.addEventListener('click', close));
  window.addEventListener('keydown', e=>{ if(e.key==='Escape') close(); });
  window.addEventListener('resize', ()=>{ if(window.innerWidth>900) close(); });
})();

/* ---------------- Scroll reveal ---------------- */
(function(){
  const revealEls = document.querySelectorAll('.reveal');
  if(!revealEls.length) return;
  const io = new IntersectionObserver((entries)=>{
    entries.forEach(e=>{ if(e.isIntersecting) e.target.classList.add('in'); });
  },{threshold:0.15});
  revealEls.forEach(el=>io.observe(el));
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
      void btn.offsetWidth;
      btn.classList.add('auto-active');
      timer = setTimeout(()=>{ if(!hovering) fade(); }, HOLD_MS);
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

/* ---------------- 3D card tilt on hover (feature cards, desktop only) ---------------- */
if(!prefersReducedMotion){
  document.querySelectorAll('.btn-gold').forEach(btn=>{
    btn.addEventListener('mousemove', (e)=>{
      const r = btn.getBoundingClientRect();
      const x = e.clientX - r.left - r.width/2;
      const y = e.clientY - r.top - r.height/2;
      btn.style.transform = `translate(${x*0.15}px, ${y*0.25}px)`;
    });
    btn.addEventListener('mouseleave', ()=>{ btn.style.transform = 'translate(0,0)'; });
  });
  document.querySelectorAll('.feature-card').forEach(card=>{
    card.addEventListener('mousemove', (e)=>{
      const r = card.getBoundingClientRect();
      const px = (e.clientX - r.left)/r.width - 0.5;
      const py = (e.clientY - r.top)/r.height - 0.5;
      card.style.transform = `perspective(600px) rotateY(${px*6}deg) rotateX(${-py*6}deg)`;
    });
    card.addEventListener('mouseleave', ()=>{ card.style.transform = 'perspective(600px) rotateY(0) rotateX(0)'; });
  });
}

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