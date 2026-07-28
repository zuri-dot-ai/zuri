/* ============================================================
   ZURI MARKETING SITE — HOME PAGE SCRIPT (index.html only)
   Hero 3D chrome mark (Three.js), burst starfield, and the mobile
   feature carousel. Loaded as a module in addition to script.js.
   ============================================================ */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ---------------- Warp-speed starfield (burst on load, home page only) ---------------- */
(function(){
  const c = document.getElementById('dust-canvas');
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

  const COUNT = prefersReducedMotion ? 0 : 260;
  const FOCAL = 260;
  const BASE_SPEED = 0.09;
  const BURST_MS = 2200;
  const BURST_MULT = 7;

  function spawnStar(){
    return {
      x: (Math.random()-0.5)*w*1.6,
      y: (Math.random()-0.5)*h*1.6,
      z: 0.15 + Math.random()*1,
      gold: Math.random()<0.3,
      tw: Math.random()*Math.PI*2
    };
  }
  const stars = Array.from({length:COUNT}, spawnStar);

  const start = performance.now();
  function speedNow(now){
    const elapsed = now - start;
    if(elapsed >= BURST_MS) return BASE_SPEED;
    const p = elapsed/BURST_MS;
    const ease = 1 - Math.pow(1-p, 2);
    return BASE_SPEED * (1 + (1-ease) * (BURST_MULT-1));
  }

  function draw(now){
    const speed = speedNow(now);
    ctx.fillStyle = 'rgba(10,10,10,0.35)';
    ctx.fillRect(0,0,w,h);

    for(const s of stars){
      s.z -= speed * 0.016;
      if(s.z <= 0.02){ Object.assign(s, spawnStar(), {z:1}); }
      const sx = cx + (s.x/s.z) * (FOCAL/300);
      const sy = cy + (s.y/s.z) * (FOCAL/300);
      if(sx < -20 || sx > w+20 || sy < -20 || sy > h+20) continue;

      const depth = 1 - s.z;
      const r = Math.max(0.3, depth*1.8);
      const tw = 0.5 + 0.4*Math.sin(now*0.002 + s.tw);
      const alpha = Math.min(0.85, depth*0.9) * tw;

      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI*2);
      ctx.fillStyle = s.gold ? `rgba(201,168,76,${alpha})` : `rgba(201,206,214,${alpha*0.85})`;
      ctx.fill();
    }
    requestAnimationFrame(draw);
  }
  if(!prefersReducedMotion) requestAnimationFrame(draw);
  else { ctx.fillStyle = '#0a0a0a'; ctx.fillRect(0,0,w,h); }
})();

/* ---------------- Navbar scroll fade (home variant — hero-relative threshold) ---------------- */
(function(){
  const nav = document.getElementById('navbar');
  const hero = document.querySelector('.hero');
  function threshold(){
    if(window.innerWidth <= 900 && hero){ return hero.offsetHeight * 0.10; }
    return 40;
  }
  function onScroll(){
    if(window.scrollY > threshold()) nav.classList.add('scrolled');
    else nav.classList.remove('scrolled');
  }
  window.addEventListener('scroll', onScroll, {passive:true});
  window.addEventListener('resize', onScroll);
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
  hamburger.addEventListener('click', ()=>{ hamburger.classList.contains('open') ? close() : open(); });
  backdrop.addEventListener('click', close);
  drawer.querySelectorAll('a,button').forEach(el=> el.addEventListener('click', close));
  window.addEventListener('keydown', (e)=>{ if(e.key === 'Escape') close(); });
  window.addEventListener('resize', ()=>{ if(window.innerWidth > 900) close(); });
})();

/* ---------------- Ghost button auto-pulse CTA cycle ---------------- */
(function(){
  if(prefersReducedMotion) return;
  const HOLD_MS = 5000;
  const FADE_MS = 2000;
  document.querySelectorAll('.btn-ghost').forEach(btn=>{
    let hovering = false;
    let timer = null;
    function activate(){
      if(hovering) return;
      btn.classList.remove('auto-fading');
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
    function onEnter(){ hovering = true; clearTimeout(timer); btn.classList.remove('auto-active','auto-fading'); }
    function onLeave(){ hovering = false; clearTimeout(timer); timer = setTimeout(activate, 500); }
    btn.addEventListener('mouseenter', onEnter);
    btn.addEventListener('mouseleave', onLeave);
    btn.addEventListener('touchstart', onEnter, {passive:true});
    btn.addEventListener('touchend', onLeave, {passive:true});
    activate();
  });
})();

/* ---------------- Feature carousel (mobile) — COVERFLOW, Jul-2026 rebuild ----------------
   Design: native browser scroll-snap drives the actual dragging (so touch
   response is 1:1 with the finger — no JS trying to fake a drag), while JS
   applies per-card scale/opacity/z-index based on distance from center to
   produce the coverflow look: active card large and on top, neighbors
   visibly smaller and peeking at the sides. Autoplay kept, sped up. */
(function(){
  const grid = document.getElementById('feature-grid');
  const dotsWrap = document.getElementById('feature-dots');
  if(!grid || !dotsWrap) return;
  const cards = Array.from(grid.children);

  cards.forEach((_,i)=>{
    const d = document.createElement('div');
    d.className = 'dot' + (i===0?' active':'');
    dotsWrap.appendChild(d);
  });
  const dots = Array.from(dotsWrap.children);

  function isCarouselActive(){ return window.innerWidth <= 900; }

  let activeIndex = 0;
  function updateActive(){
    if(!isCarouselActive()) return;
    const section = grid.closest('.reveal');
    if(section && !section.classList.contains('in')) return;
    const center = grid.scrollLeft + grid.clientWidth/2;
    let closest = 0, closestDist = Infinity;

    cards.forEach((c,i)=>{
      const cCenter = c.offsetLeft + c.offsetWidth/2;
      const d = Math.abs(cCenter - center);
      if(d < closestDist){ closestDist = d; closest = i; }

      // Coverflow curve: active card scales UP and sits on top; each step
      // away scales down and drops behind, with a steep opacity falloff so
      // only the active + immediate neighbors read clearly.
      const norm = Math.min(1.6, d / (grid.clientWidth*0.62)); // can exceed 1 for far cards
      const scale = Math.max(0.72, 1.1 - norm*0.28);
      const opacity = Math.max(0.32, 1 - norm*0.68);
      c.style.transform = `scale(${scale})`;
      c.style.opacity = String(opacity);
      c.style.zIndex = String(100 - Math.round(d));
      c.classList.toggle('is-active', i === closest);
    });

    if(closest !== activeIndex){
      activeIndex = closest;
      dots.forEach((d,i)=> d.classList.toggle('active', i===activeIndex));
    }
  }

  // Snappy eased scroll (used by autoplay only — manual swipes stay 100%
  // native drag, this never runs during a user-initiated touch).
  function easeOutBack(t){ const c=1.7; return 1+c*Math.pow(t-1,3)+ (c)*Math.pow(t-1,2); }
  function animateScrollTo(target, duration){
    const startX = grid.scrollLeft;
    const delta = target - startX;
    const startTime = performance.now();
    function step(now){
      const t = Math.min(1, (now - startTime) / duration);
      grid.scrollLeft = startX + delta * easeOutBack(t);
      updateActive();
      if(t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  let ticking = false;
  grid.addEventListener('scroll', ()=>{
    if(!ticking){
      requestAnimationFrame(()=>{ updateActive(); ticking=false; });
      ticking = true;
    }
  }, {passive:true});
  grid._updateActive = updateActive;
  updateActive();

  let autoTimer = null, resumeTimer = null;
  function scrollToIndex(i){
    const c = cards[(i+cards.length)%cards.length];
    const target = c.offsetLeft - (grid.clientWidth - c.offsetWidth)/2;
    animateScrollTo(target, 300);
  }
  function startAuto(){
    if(prefersReducedMotion || !isCarouselActive()) return;
    stopAuto();
    autoTimer = setInterval(()=>{ scrollToIndex(activeIndex+1); }, 2800);
  }
  function stopAuto(){ if(autoTimer){ clearInterval(autoTimer); autoTimer=null; } }
  function pauseThenResume(){
    stopAuto();
    clearTimeout(resumeTimer);
    resumeTimer = setTimeout(startAuto, 3600);
  }
  ['touchstart','pointerdown','wheel'].forEach(evt=>{
    grid.addEventListener(evt, pauseThenResume, {passive:true});
  });
  window.addEventListener('resize', ()=>{ isCarouselActive() ? startAuto() : stopAuto(); });
  startAuto();
})();

/* Magnetic / 3D tilt removed — pure CSS :hover only (INP). */

/* ---------------- Pricing toggle — generic, data-attribute driven (shared logic, home-page instance) ---------------- */
(function(){
  const sw = document.getElementById('billing-switch');
  if(!sw) return;
  const priceEls = document.querySelectorAll('.plan-price[data-monthly]');
  sw.addEventListener('click', ()=>{
    const on = sw.classList.toggle('on');
    priceEls.forEach(el=>{
      const monthly = el.getAttribute('data-monthly');
      const annual = el.getAttribute('data-annual');
      if(monthly === '0'){ return; }
      el.innerHTML = on ? `${annual} <span>/yr</span>` : `${monthly} <span>/mo</span>`;
    });
  });
})();

/* ---------------- Scroll reveal ---------------- */
const revealEls = document.querySelectorAll('.reveal');
const io = new IntersectionObserver((entries)=>{
  entries.forEach(e=>{
    if(e.isIntersecting){
      e.target.classList.add('in');
      const fg = e.target.querySelector('#feature-grid');
      if(fg && fg._updateActive) setTimeout(fg._updateActive, 400);
    }
  });
},{threshold:0.15});
revealEls.forEach(el=>io.observe(el));

/* ---------------- Hero: sculptural chrome mark ---------------- */
const canvas = document.getElementById('hero-canvas');
const dprCap = Math.min(window.devicePixelRatio || 1, 2);
const useAntialias = dprCap <= 1.5;
const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: useAntialias,
  alpha: true,
  powerPreference: 'high-performance',
});
renderer.setPixelRatio(dprCap);
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 100);
camera.position.set(0, 0, 9);
const IDLE_Z = 10.5;

const pmrem = new THREE.PMREMGenerator(renderer);
const envRT = pmrem.fromScene(new RoomEnvironment(), 0.04);
scene.environment = envRT.texture;

const keyLight = new THREE.DirectionalLight(0xffffff, 1.9);
keyLight.position.set(4, 5, 6);
scene.add(keyLight);
const goldRim = new THREE.PointLight(0xD4AF5C, 26, 22, 2);
goldRim.position.set(-3.2, -1.6, 3.5);
scene.add(goldRim);
const fillLight = new THREE.PointLight(0xc9ced6, 2.2, 20, 2);
fillLight.position.set(3, -3, -4);
scene.add(fillLight);
scene.add(new THREE.AmbientLight(0x1a1a1a, 1));

function buildFrameGeometry(){
  const outer = new THREE.Shape();
  outer.moveTo(0, 1.7);
  outer.lineTo(0.58, 1.7);
  outer.lineTo(0.58, 1.12);
  outer.lineTo(1.42, -0.95);
  outer.lineTo(-1.42, -0.95);
  outer.closePath();

  const inner = new THREE.Path();
  inner.moveTo(0.02, 0.95);
  inner.lineTo(0.78, -0.5);
  inner.lineTo(-0.78, -0.5);
  inner.closePath();
  outer.holes.push(inner);

  const geo = new THREE.ExtrudeGeometry(outer, {
    depth: 0.55,
    bevelEnabled: true,
    bevelThickness: 0.07,
    bevelSize: 0.05,
    bevelSegments: 5,
    curveSegments: 2
  });
  geo.center();
  return geo;
}
function buildChipGeometry(){
  const chipShape = new THREE.Shape();
  chipShape.moveTo(0, 0.62);
  chipShape.lineTo(0.5, -0.32);
  chipShape.lineTo(-0.5, -0.32);
  chipShape.closePath();
  const geo = new THREE.ExtrudeGeometry(chipShape, {
    depth: 0.3, bevelEnabled:true, bevelThickness:0.04, bevelSize:0.03, bevelSegments:3, curveSegments:2
  });
  geo.center();
  return geo;
}

const markGeo = buildFrameGeometry();
const chipGeo = buildChipGeometry();
const chromeMat = new THREE.MeshPhysicalMaterial({
  color: 0xc4cad2,
  metalness: 1,
  roughness: 0.14,
  clearcoat: 0.8,
  clearcoatRoughness: 0.12,
  envMapIntensity: 1.6
});
const mark = new THREE.Mesh(markGeo, chromeMat);
scene.add(mark);

const chipMat = new THREE.MeshPhysicalMaterial({
  color: 0x050505,
  metalness: 0.3,
  roughness: 0.25,
  clearcoat: 1,
  clearcoatRoughness: 0.1,
  envMapIntensity: 0.8
});
const chip = new THREE.Mesh(chipGeo, chipMat);
chip.position.set(0.03, 0.05, -0.28);
mark.add(chip);

const edgeGeo = new THREE.EdgesGeometry(markGeo, 20);
const edgeMat = new THREE.LineBasicMaterial({color:0xD4AF5C, transparent:true, opacity:0.6});
const edges3d = new THREE.LineSegments(edgeGeo, edgeMat);
mark.add(edges3d);

const pointerNDC = new THREE.Vector2(0,0);
let pointerActive = false;
canvas.addEventListener('mousemove', (e)=>{
  const r = canvas.getBoundingClientRect();
  pointerNDC.x = ((e.clientX-r.left)/r.width)*2-1;
  pointerNDC.y = -(((e.clientY-r.top)/r.height)*2-1);
  pointerActive = true;
}, {passive:true});
canvas.addEventListener('mouseleave', ()=>{ pointerActive=false; });

let scrollT = 0;
function onScroll(){
  const max = document.body.scrollHeight - window.innerHeight;
  scrollT = Math.min(1, window.scrollY / Math.max(1,max*0.4));
}
window.addEventListener('scroll', onScroll, {passive:true});

function resize(){
  const w = canvas.clientWidth, h = canvas.clientHeight;
  if(w < 2 || h < 2) return;
  renderer.setSize(w,h,false);
  camera.aspect = w/h;
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', resize);
let resizeObs = null;
if(typeof ResizeObserver !== 'undefined'){
  resizeObs = new ResizeObserver(resize);
  resizeObs.observe(canvas);
}
resize();

const heroStart = performance.now();
const REVEAL_MS = 1900;
const FLOAT_AMP = 0.08;
/* Y sway stays within a safe front-facing cone so the open back never shows.
   Threshold check: hollow starts reading past ~25–30° from base; ±18° is safe. */
const BASE_ROT_Y = 0.48;
const BASE_ROT_X = 0.12;
const SWAY_AMP_Y = THREE.MathUtils.degToRad(18);
const SWAY_AMP_X = THREE.MathUtils.degToRad(6);
const SWAY_SPEED_Y = 0.32;
const SWAY_SPEED_X = 0.24;
const POINTER_Y_MAX = THREE.MathUtils.degToRad(5);
const POINTER_X_MAX = THREE.MathUtils.degToRad(4);
mark.scale.setScalar(0.001);
mark.rotation.set(0.6, -2.4, 0.3);
camera.position.z = 15;

let mx = 0, my = 0;
let rafId = 0;
let loopRunning = false;
let tabVisible = !document.hidden;
let canvasVisible = true;

window.__zuriHeroDebug = {
  frames: 0,
  rendering: false,
  tabVisible: true,
  canvasVisible: true,
  pixelRatio: dprCap,
  antialias: useAntialias,
};

function shouldRender(){
  return tabVisible && canvasVisible && !prefersReducedMotion;
}

function startLoop(){
  if(loopRunning || !shouldRender()) return;
  loopRunning = true;
  window.__zuriHeroDebug.rendering = true;
  rafId = requestAnimationFrame(animate);
}

function stopLoop(){
  loopRunning = false;
  window.__zuriHeroDebug.rendering = false;
  if(rafId){ cancelAnimationFrame(rafId); rafId = 0; }
}

function syncLoop(){
  window.__zuriHeroDebug.tabVisible = tabVisible;
  window.__zuriHeroDebug.canvasVisible = canvasVisible;
  if(shouldRender()) startLoop();
  else stopLoop();
}

document.addEventListener('visibilitychange', ()=>{
  tabVisible = !document.hidden;
  syncLoop();
});

const heroIO = new IntersectionObserver((entries)=>{
  canvasVisible = entries.some(e => e.isIntersecting && e.intersectionRatio > 0);
  syncLoop();
}, {threshold: 0.01});
heroIO.observe(canvas);

function animate(){
  if(!loopRunning) return;
  rafId = requestAnimationFrame(animate);
  window.__zuriHeroDebug.frames++;

  const now = performance.now();
  const elapsed = now - heroStart;

  const tx = pointerActive ? pointerNDC.x : 0;
  const ty = pointerActive ? pointerNDC.y : 0;
  mx += (tx-mx)*0.06; my += (ty-my)*0.06;

  if(elapsed < REVEAL_MS){
    const p = elapsed/REVEAL_MS;
    const ease = 1 - Math.pow(1-p, 3);
    mark.scale.setScalar(THREE.MathUtils.lerp(0.001, 1, ease));
    mark.rotation.y = THREE.MathUtils.lerp(-2.4, BASE_ROT_Y, ease);
    mark.rotation.x = THREE.MathUtils.lerp(0.6, BASE_ROT_X, ease);
    mark.rotation.z = THREE.MathUtils.lerp(0.3, 0, ease);
    mark.position.y = 0;
    camera.position.z = THREE.MathUtils.lerp(15, IDLE_Z, ease);
  } else {
    const idle = (elapsed-REVEAL_MS)/1000;
    const swayY = Math.sin(idle * SWAY_SPEED_Y) * SWAY_AMP_Y;
    const swayX = Math.cos(idle * SWAY_SPEED_X) * SWAY_AMP_X;
    const ptrY = THREE.MathUtils.clamp(mx * 0.18, -POINTER_Y_MAX, POINTER_Y_MAX);
    const ptrX = THREE.MathUtils.clamp(-my * 0.14, -POINTER_X_MAX, POINTER_X_MAX);
    mark.rotation.y = BASE_ROT_Y + swayY + ptrY;
    mark.rotation.x = BASE_ROT_X + swayX + ptrX;
    mark.position.y = Math.sin(idle * 0.65) * FLOAT_AMP;
    camera.position.z = IDLE_Z - scrollT*1.5;

    const lightAngle = idle*0.11;
    goldRim.position.x = Math.cos(lightAngle)*4.2 - 1 + mx*2;
    goldRim.position.y = Math.sin(lightAngle*1.3)*2.4 - 1 + my*2;
    goldRim.position.z = 3 + Math.sin(lightAngle*0.7)*1.5;
  }

  camera.position.x = mx*0.6;
  camera.position.y = my*0.4;
  camera.lookAt(0, mark.position.y, 0);

  renderer.render(scene, camera);
}

function disposeHero(){
  stopLoop();
  heroIO.disconnect();
  if(resizeObs) resizeObs.disconnect();
  markGeo.dispose();
  chipGeo.dispose();
  edgeGeo.dispose();
  chromeMat.dispose();
  chipMat.dispose();
  edgeMat.dispose();
  envRT.dispose();
  pmrem.dispose();
  renderer.dispose();
}
window.addEventListener('pagehide', disposeHero);

if(prefersReducedMotion){
  mark.scale.setScalar(1);
  mark.rotation.set(0.12, 0.5, 0);
  resize();
  renderer.render(scene, camera);
} else {
  syncLoop();
}