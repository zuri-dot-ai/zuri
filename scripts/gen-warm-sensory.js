// Generator for warm-sensory 9 new templates. Run with: node scripts/gen-warm-sensory.js
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'templates-v2', 'warm-sensory');

const CLOUD = 'https://res.cloudinary.com/dzuvmw4l/image/upload';
const HERO_T = 'c_fill,g_auto,w_1600,h_900,f_auto,q_auto:good';
const SQ_T = 'c_fill,g_auto,w_1200,h_1200,f_auto,q_auto:good';

const HERO_IDS = [
  'zuri-stock/warm-sensory/hero/albert-YYZU0Lo1uXE-unsplash',
  'zuri-stock/warm-sensory/hero/andy-li-RndRFJ1v1kk-unsplash',
  'zuri-stock/warm-sensory/hero/daniel-ufDSxtZAbvs-unsplash',
  'zuri-stock/warm-sensory/hero/elisha-terada-IYjXGUpJH74-unsplash',
  'zuri-stock/warm-sensory/hero/glenov-brankovic-nulJA9vxJII-unsplash',
  'zuri-stock/warm-sensory/hero/igor-rand-1-IeBcvLUQ4-unsplash',
];
const ABOUT_IDS = [
  'zuri-stock/warm-sensory/about/pexels-amineispir-15597767',
  'zuri-stock/warm-sensory/about/pexels-bruno-bomtempo-2675062-4234495',
  'zuri-stock/warm-sensory/about/pexels-msaimakin-37060185',
];
const GALLERY_IDS = [
  'zuri-stock/warm-sensory/gallery/alina-chernysheva-oj2hBf5TOFM-unsplash',
  'zuri-stock/warm-sensory/gallery/farhad-ibrahimzade-asQ6VI-pL2k-unsplash',
  'zuri-stock/warm-sensory/gallery/ishan-seefromthesky-NhJX41giJFs-unsplash',
  'zuri-stock/warm-sensory/gallery/jessica-hearn-9tdOe5n6WQU-unsplash',
  'zuri-stock/warm-sensory/gallery/martin-baron-BDnO_6lRTT0-unsplash',
  'zuri-stock/warm-sensory/gallery/mohamad-sameh-CrnvBfeBb7w-unsplash',
  'zuri-stock/warm-sensory/gallery/omar-hakeem-u1RYfBGbtCo-unsplash',
  'zuri-stock/warm-sensory/gallery/seyjoon-park-uLGZhFyv7lc-unsplash',
  'zuri-stock/warm-sensory/gallery/stradivarius-studio-OaSmpmU6TgM-unsplash',
];
const MENU_IDS = [
  'zuri-stock/warm-sensory/menu-item/anthony-espinosa-TQTPyxwZuYA-unsplash',
  'zuri-stock/warm-sensory/menu-item/claudio-springolo-QOxVCKMbsn0-unsplash',
  'zuri-stock/warm-sensory/menu-item/david-thielen-6KHcuE4UuXs-unsplash',
];

function heroImg(url, i=0){ return `${CLOUD}/${HERO_T}/${HERO_IDS[i]}`; }
function galleryImg(i){ return `${CLOUD}/${SQ_T}/${GALLERY_IDS[i]}`; }
function aboutImg(i){ return `${CLOUD}/${SQ_T}/${ABOUT_IDS[i]}`; }

// ---------- variant definitions ----------
const variants = [
  {
    id:'light-harvest', display:'Restaurant Light Harvest', mode:'light', hero:'image', accent:'#C1662F',
    modules:['gallery','stats-strip','faq-accordion'], heroIdx:0, galIdx:[0,1,2,3]
  },
  {
    id:'dark-clove', display:'Restaurant Dark Clove', mode:'dark', hero:'image', accent:'#B8860B',
    modules:['opening-hours-cta','stats-strip','gallery'], heroIdx:1, galIdx:[4,5,6,7]
  },
  {
    id:'light-linen', display:'Restaurant Light Linen', mode:'light', hero:'typography', accent:'#A85C1E',
    modules:['faq-accordion','stats-strip'], heroIdx:2, galIdx:[]
  },
  {
    id:'dark-saffron', display:'Restaurant Dark Saffron', mode:'dark', hero:'image', accent:'#C1662F',
    modules:['gallery','opening-hours-cta'], heroIdx:3, galIdx:[8,0,1,2]
  },
  {
    id:'light-terra', display:'Restaurant Light Terra', mode:'light', hero:'image', accent:'#B8860B',
    modules:['gallery','faq-accordion','opening-hours-cta'], heroIdx:4, galIdx:[3,4,5,6]
  },
  {
    id:'dark-honey', display:'Restaurant Dark Honey', mode:'dark', hero:'typography', accent:'#A85C1E',
    modules:['stats-strip','faq-accordion'], heroIdx:5, galIdx:[]
  },
  {
    id:'light-marrow', display:'Restaurant Light Marrow', mode:'light', hero:'image', accent:'#C1662F',
    modules:['opening-hours-cta','gallery'], heroIdx:0, galIdx:[7,8,0,1]
  },
  {
    id:'dark-cinder', display:'Restaurant Dark Cinder', mode:'dark', hero:'image', accent:'#B8860B',
    modules:['gallery','stats-strip','faq-accordion'], heroIdx:1, galIdx:[2,3,4,5]
  },
  {
    id:'light-basil', display:'Restaurant Light Basil', mode:'light', hero:'image', accent:'#A85C1E',
    modules:['gallery','opening-hours-cta','stats-strip'], heroIdx:2, galIdx:[6,7,8,0]
  },
];

function palette(mode, accent){
  if(mode==='dark'){
    return { bg:'#181310', surface:'#241C17', text:'#F7F1E9', textMuted:'#C4B8AB', accent, accentText:'#181310', footerBg:'#0F0C0A' };
  }
  return { bg:'#FBF6EF', surface:'#F2E8DA', text:'#2B2018', textMuted:'#6E5F4F', accent, accentText:'#FBF6EF', footerBg:'#211A14' };
}

function rgbFromHex(hex){
  const h = hex.replace('#','');
  const r = parseInt(h.substring(0,2),16), g = parseInt(h.substring(2,4),16), b = parseInt(h.substring(4,6),16);
  return `${r},${g},${b}`;
}

function navLinksForModules(modules){
  const links = [];
  if(modules.includes('gallery')) links.push(['#gallery','Gallery']);
  links.push(['#services','Menu']);
  if(modules.includes('faq-accordion')) links.push(['#faq','FAQ']);
  links.push(['#testimonials','Reviews']);
  links.push(['#contact','Contact']);
  return links;
}

function moduleBlock(name, ctx){
  if(name==='opening-hours-cta'){
    return `
  <section class="hours-strip" aria-label="Opening Hours" data-module="opening-hours-cta">
    <div class="container hours-inner">
      <div class="hours-days">
        <div class="hours-day"><strong>Mon – Fri</strong>{{hours_weekday}}</div>
        <div class="hours-day"><strong>Saturday</strong>{{hours_saturday}}</div>
        <div class="hours-day"><strong>Sunday</strong>{{hours_sunday}}</div>
      </div>
      <a href="#contact" class="btn">Book a Table</a>
    </div>
  </section>`;
  }
  if(name==='gallery'){
    const idx = ctx.galIdx.length ? ctx.galIdx : [0,1,2,3];
    return `
  <section id="gallery" aria-label="Gallery" data-module="gallery">
    <div class="container">
      <div class="gallery-header">
        <p class="eyebrow">A Closer Look</p>
        <h2>Moments From The Table</h2>
        <p>{{about_body_long}}</p>
      </div>
      <div class="gallery-grid">
        <figure><img src="${galleryImg(idx[0])}" data-image-slot="gallery_1" alt="{{business_name}} dish" loading="lazy"></figure>
        <figure><img src="${galleryImg(idx[1])}" data-image-slot="gallery_2" alt="{{business_name}} dish" loading="lazy"></figure>
        <figure><img src="${galleryImg(idx[2])}" data-image-slot="gallery_3" alt="{{business_name}} dish" loading="lazy"></figure>
        <figure><img src="${galleryImg(idx[3])}" data-image-slot="gallery_4" alt="{{business_name}} dish" loading="lazy"></figure>
      </div>
    </div>
  </section>`;
  }
  if(name==='faq-accordion'){
    return `
  <section id="faq" aria-label="FAQ" data-module="faq-accordion">
    <div class="container">
      <div class="faq-header">
        <p class="eyebrow">Good To Know</p>
        <h2>Frequently Asked</h2>
      </div>
      <div class="faq-list">
        <div class="faq-item">
          <button class="faq-q"><span>{{faq_1_question}}</span><span class="plus">+</span></button>
          <div class="faq-a"><p>{{faq_1_answer}}</p></div>
        </div>
        <div class="faq-item">
          <button class="faq-q"><span>{{faq_2_question}}</span><span class="plus">+</span></button>
          <div class="faq-a"><p>{{faq_2_answer}}</p></div>
        </div>
        <div class="faq-item">
          <button class="faq-q"><span>{{faq_3_question}}</span><span class="plus">+</span></button>
          <div class="faq-a"><p>{{faq_3_answer}}</p></div>
        </div>
      </div>
    </div>
  </section>`;
  }
  if(name==='stats-strip'){
    return `
  <section class="stats-strip" aria-label="Restaurant Stats" data-module="stats-strip">
    <div class="marquee-wrap">
      <div class="marquee" id="stats-marquee">
        <div class="marquee-track" id="stats-track">
          <span class="stat-item"><strong>{{stat_1_value}}</strong>{{stat_1_label}}</span>
          <span class="stat-item"><strong>{{stat_2_value}}</strong>{{stat_2_label}}</span>
          <span class="stat-item"><strong>{{stat_3_value}}</strong>{{stat_3_label}}</span>
          <span class="stat-item"><strong>{{stat_4_value}}</strong>{{stat_4_label}}</span>
          <span class="stat-item"><strong>{{stat_1_value}}</strong>{{stat_1_label}}</span>
          <span class="stat-item"><strong>{{stat_2_value}}</strong>{{stat_2_label}}</span>
          <span class="stat-item"><strong>{{stat_3_value}}</strong>{{stat_3_label}}</span>
          <span class="stat-item"><strong>{{stat_4_value}}</strong>{{stat_4_label}}</span>
        </div>
      </div>
    </div>
  </section>`;
  }
  return '';
}

function heroBlock(ctx){
  if(ctx.hero==='image'){
    return `
  <section class="hero" aria-label="Hero">
    <div class="container">
      <div class="hero-copy">
        <p class="eyebrow">{{tagline}}</p>
        <h1 id="hero-headline">{{business_name}}</h1>
        <p>{{about_body_short}}</p>
        <div class="hero-cta-group">
          <a href="#services" class="btn">View Menu</a>
          <a href="#contact" class="btn btn-outline">Reserve a Table</a>
        </div>
      </div>
      <div class="hero-image">
        <img src="${heroImg(null, ctx.heroIdx)}" data-image-slot="hero" alt="{{business_name}}" loading="eager">
      </div>
    </div>
  </section>`;
  }
  return `
  <section class="hero hero-typography" aria-label="Hero">
    <div class="hero-mesh" aria-hidden="true"></div>
    <div class="hero-numeral" aria-hidden="true">01</div>
    <div class="container">
      <div class="hero-copy hero-copy-center">
        <p class="eyebrow">{{tagline}}</p>
        <h1 id="hero-headline">{{business_name}}</h1>
        <p>{{about_body_short}}</p>
        <div class="hero-cta-group">
          <a href="#services" class="btn">View Menu</a>
          <a href="#contact" class="btn btn-outline">Reserve a Table</a>
        </div>
      </div>
    </div>
  </section>`;
}

function buildHtml(v){
  const p = palette(v.mode, v.accent);
  const rgb = rgbFromHex(v.accent);
  const nav = navLinksForModules(v.modules);
  const navHtml = nav.map(([href,label])=>`<li><a href="${href}">${label}</a></li>`).join('\n        ');
  const drawerHtml = nav.map(([href,label])=>`<li><a href="${href}">${label}</a></li>`).join('\n    ');
  const modulesHtml = v.modules.map(m=>moduleBlock(m, v)).join('\n');
  const hasFaq = v.modules.includes('faq-accordion');
  const heroHtml = heroBlock(v);
  const heroTypographyCss = v.hero==='typography' ? `
  .hero.hero-typography{min-height:78vh;display:flex;align-items:center;justify-content:center;text-align:center;overflow:hidden;}
  .hero.hero-typography .container{display:block;}
  .hero-copy-center{max-width:640px;margin:0 auto;display:flex;flex-direction:column;align-items:center;}
  .hero-copy-center p{max-width:460px;}
  .hero-cta-group{justify-content:center;}
  .hero-mesh{position:absolute;inset:0;z-index:0;background:
      radial-gradient(circle at 20% 25%, rgba(${rgb},.28), transparent 55%),
      radial-gradient(circle at 80% 20%, rgba(${rgb},.18), transparent 50%),
      radial-gradient(circle at 50% 90%, rgba(${rgb},.14), transparent 60%);
    pointer-events:none;}
  .hero-numeral{position:absolute;top:-4vw;right:-2vw;font-family:'Cormorant Garamond',serif;font-weight:600;font-size:38vw;line-height:1;color:rgba(${rgb},.07);z-index:0;pointer-events:none;user-select:none;}
  .hero.hero-typography .container{position:relative;z-index:1;}
  ` : '';

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{business_name}}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<style>
  :root{
    --color-bg:${p.bg};
    --color-surface:${p.surface};
    --color-text:${p.text};
    --color-text-muted:${p.textMuted};
    --color-accent:${p.accent};
    --color-accent-text:${p.accentText};
  }

  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{scroll-behavior:smooth;}
  body{
    background:var(--color-bg);
    color:var(--color-text);
    font-family:'Montserrat',sans-serif;
    line-height:1.65;
    -webkit-font-smoothing:antialiased;
    overflow-x:hidden;
  }
  h1,h2,h3,h4{
    font-family:'Cormorant Garamond',serif;
    color:var(--color-text);
    line-height:1.15;
    font-weight:600;
  }
  a{color:inherit;text-decoration:none;}
  img{max-width:100%;display:block;}
  .container{width:100%;max-width:1200px;margin:0 auto;padding:0 20px;}
  section{padding:60px 0;position:relative;}
  .eyebrow{
    text-transform:uppercase;letter-spacing:2.5px;font-size:.72rem;
    color:var(--color-accent);font-weight:600;margin-bottom:14px;
  }
  .btn{
    display:inline-block;padding:14px 30px;background:var(--color-accent);
    color:var(--color-accent-text);font-weight:600;font-size:.88rem;
    letter-spacing:.4px;border-radius:2px;border:1px solid var(--color-accent);
    transition:transform .3s ease, box-shadow .3s ease;
  }
  .btn:hover{transform:translateY(-2px);box-shadow:0 10px 24px rgba(${rgb},.35);}
  .btn-outline{background:transparent;color:var(--color-text);border:1px solid rgba(${v.mode==='dark'?'247,241,233':'43,32,24'},.4);}
  .btn-outline:hover{background:rgba(${v.mode==='dark'?'247,241,233':'43,32,24'},.08);}
  :focus-visible{outline:2px solid var(--color-accent);outline-offset:3px;}

  /* NAV */
  header#site-nav{
    position:fixed;top:0;left:0;right:0;z-index:1000;padding:22px 0;
    transition:background .35s ease, padding .35s ease, box-shadow .35s ease;
    background:transparent;
  }
  header#site-nav.scrolled{
    background:${v.mode==='dark'?'rgba(24,19,16,.92)':'rgba(251,246,239,.92)'};backdrop-filter:blur(10px);padding:14px 0;
    box-shadow:0 2px 20px rgba(0,0,0,.15);
  }
  .nav-inner{display:flex;align-items:center;justify-content:space-between;}
  .logo{font-family:'Cormorant Garamond',serif;font-size:1.5rem;font-weight:700;letter-spacing:.4px;}
  nav.primary-nav ul{display:flex;gap:36px;list-style:none;}
  nav.primary-nav a{font-size:.85rem;text-transform:uppercase;letter-spacing:1px;font-weight:500;position:relative;padding-bottom:4px;}
  nav.primary-nav a::after{content:'';position:absolute;left:0;bottom:0;width:0;height:1px;background:var(--color-accent);transition:width .3s ease;}
  nav.primary-nav a:hover::after{width:100%;}
  .hamburger{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;z-index:1100;padding:8px;}
  .hamburger span{width:24px;height:2px;background:var(--color-text);transition:all .3s ease;}
  .hamburger.open span:nth-child(1){transform:translateY(7px) rotate(45deg);}
  .hamburger.open span:nth-child(2){opacity:0;}
  .hamburger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg);}
  .mobile-drawer{position:fixed;top:0;right:-100%;width:78%;max-width:340px;height:100vh;background:var(--color-surface);box-shadow:-4px 0 24px rgba(0,0,0,.3);z-index:1050;transition:right .35s ease;padding:100px 32px 40px;}
  .mobile-drawer.open{right:0;}
  .mobile-drawer ul{list-style:none;display:flex;flex-direction:column;gap:26px;}
  .mobile-drawer a{font-size:1.15rem;font-family:'Cormorant Garamond',serif;}
  .drawer-overlay{position:fixed;inset:0;background:rgba(0,0,0,.5);z-index:1040;opacity:0;pointer-events:none;transition:opacity .3s ease;}
  .drawer-overlay.open{opacity:1;pointer-events:auto;}

  /* HERO (image-backed) */
  .hero{padding-top:150px;padding-bottom:70px;}
  .hero .container{display:grid;grid-template-columns:1fr;gap:40px;align-items:center;}
  .hero-copy h1{font-size:2.05rem;margin-bottom:20px;overflow:hidden;}
  .hero-copy p{color:var(--color-text-muted);font-size:1.02rem;max-width:460px;margin-bottom:32px;}
  .hero-cta-group{display:flex;gap:16px;flex-wrap:wrap;}
  .hero-image{position:relative;border-radius:6px;overflow:hidden;aspect-ratio:4/3.4;}
  .hero-image img{width:100%;height:100%;object-fit:cover;}
  ${heroTypographyCss}

  /* OPENING HOURS CTA */
  .hours-strip{background:var(--color-surface);}
  .hours-inner{display:flex;flex-direction:column;align-items:center;text-align:center;justify-content:center;gap:20px;padding:36px 0;}
  .hours-days{display:flex;gap:28px;flex-wrap:wrap;justify-content:center;}
  .hours-day{font-size:.85rem;color:var(--color-text-muted);}
  .hours-day strong{display:block;font-family:'Cormorant Garamond',serif;font-size:1.1rem;color:var(--color-text);font-weight:600;}

  /* GALLERY */
  .gallery-header{text-align:center;max-width:600px;margin:0 auto 44px;}
  .gallery-header h2{font-size:2.1rem;margin-bottom:12px;}
  .gallery-header p{color:var(--color-text-muted);}
  .gallery-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:14px;}
  .gallery-grid figure{overflow:hidden;border-radius:4px;aspect-ratio:1;}
  .gallery-grid img{width:100%;height:100%;object-fit:cover;transition:transform .6s ease;}
  .gallery-grid figure:hover img{transform:scale(1.08);}

  /* STATS STRIP (marquee) */
  .stats-strip{background:var(--color-accent);padding:0;}
  .marquee-wrap{overflow:hidden;width:100%;}
  .marquee{overflow:hidden;width:100%;}
  .marquee-track{display:flex;white-space:nowrap;width:max-content;}
  .stat-item{display:inline-flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;padding:34px 40px;color:var(--color-accent-text);flex-shrink:0;}
  .stat-item strong{font-family:'Cormorant Garamond',serif;font-size:2.1rem;font-weight:700;line-height:1;}
  .stat-item{font-size:.78rem;text-transform:uppercase;letter-spacing:1px;font-weight:600;}

  /* SERVICES */
  .services-section{background:var(--color-surface);}
  .services-header{text-align:center;max-width:600px;margin:0 auto 44px;}
  .services-header h2{font-size:2.1rem;margin-bottom:12px;}
  .services-header p{color:var(--color-text-muted);}
  .service-grid{display:grid;grid-template-columns:1fr;gap:22px;}
  .service-card{background:var(--color-bg);padding:30px;border-radius:6px;border:1px solid rgba(${v.mode==='dark'?'247,241,233':'43,32,24'},.08);}
  .service-price{font-family:'Cormorant Garamond',serif;color:var(--color-accent);font-size:1.5rem;font-weight:600;margin-bottom:10px;}
  .service-card h3{font-size:1.25rem;margin-bottom:8px;}
  .service-card p{color:var(--color-text-muted);font-size:.92rem;}

  /* FAQ ACCORDION */
  .faq-header{text-align:center;max-width:600px;margin:0 auto 40px;}
  .faq-header h2{font-size:2.1rem;margin-bottom:12px;}
  .faq-list{max-width:760px;margin:0 auto;}
  .faq-item{border-bottom:1px solid rgba(${v.mode==='dark'?'247,241,233':'43,32,24'},.12);}
  .faq-q{width:100%;text-align:left;background:none;border:none;color:var(--color-text);padding:22px 0;display:flex;justify-content:space-between;align-items:center;font-family:'Cormorant Garamond',serif;font-size:1.15rem;cursor:pointer;}
  .faq-q .plus{transition:transform .3s ease;color:var(--color-accent);font-size:1.4rem;}
  .faq-item.open .plus{transform:rotate(45deg);}
  .faq-a{max-height:0;overflow:hidden;transition:max-height .35s ease;}
  .faq-a p{color:var(--color-text-muted);padding-bottom:20px;font-size:.92rem;max-width:640px;}

  /* TESTIMONIALS */
  .testimonials-section{background:var(--color-surface);}
  .testimonials-header{text-align:center;margin-bottom:44px;}
  .testimonials-header h2{font-size:2.1rem;}
  .testimonial-grid{display:grid;grid-template-columns:1fr;gap:24px;}
  .testimonial-card{background:var(--color-bg);padding:32px;border-radius:6px;border-left:3px solid var(--color-accent);}
  .testimonial-quote{font-family:'Cormorant Garamond',serif;font-size:1.2rem;font-style:italic;margin-bottom:20px;}
  .testimonial-name{font-weight:600;font-size:.95rem;}
  .testimonial-role{color:var(--color-text-muted);font-size:.85rem;}

  /* CONTACT */
  .contact-section .container{display:grid;grid-template-columns:1fr;gap:44px;}
  .contact-info h2{font-size:2.1rem;margin-bottom:18px;}
  .contact-info p{color:var(--color-text-muted);margin-bottom:24px;}
  .contact-detail{margin-bottom:14px;font-size:.95rem;}
  .contact-detail strong{display:block;font-size:.72rem;text-transform:uppercase;letter-spacing:1px;color:var(--color-accent);margin-bottom:2px;}
  form#contact-form{background:var(--color-surface);padding:32px;border-radius:6px;display:flex;flex-direction:column;gap:16px;}
  form#contact-form label{font-size:.78rem;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px;display:block;}
  form#contact-form input,form#contact-form textarea{width:100%;padding:12px 14px;border:1px solid rgba(${v.mode==='dark'?'247,241,233':'43,32,24'},.15);border-radius:2px;background:var(--color-bg);font-family:'Montserrat',sans-serif;font-size:.95rem;color:var(--color-text);}
  form#contact-form textarea{resize:vertical;min-height:110px;}
  form#contact-form input:focus,form#contact-form textarea:focus{outline:2px solid var(--color-accent);outline-offset:2px;}
  .form-success{display:none;background:var(--color-accent);color:var(--color-accent-text);padding:14px;border-radius:2px;font-size:.9rem;text-align:center;}
  .form-success.show{display:block;}
  form#contact-form.submitted .form-fields{display:none;}

  /* FOOTER */
  footer{background:${p.footerBg};color:#F7F1E9;padding:56px 0 30px;}
  .footer-inner{text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;}
  footer p.tagline{color:rgba(247,241,233,.55);font-size:.9rem;max-width:400px;}
  .footer-socials{display:flex;gap:18px;margin-top:6px;}
  .footer-socials a{font-size:.8rem;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--color-accent);padding-bottom:2px;}
  .powered-by{margin-top:30px;font-size:.75rem;color:rgba(247,241,233,.35);}
  .powered-by a{border-bottom:1px solid rgba(247,241,233,.35);}

  /* WHATSAPP FLOAT */
  #whatsapp-float{position:fixed;bottom:1.25rem;right:1.25rem;z-index:9999;}
  #whatsapp-float a{display:flex;align-items:center;justify-content:center;width:3.25rem;height:3.25rem;border-radius:9999px;background:#25D366;color:#fff;box-shadow:0 4px 14px rgba(37,211,102,.45);transition:transform .2s ease;}
  #whatsapp-float a:hover{transform:scale(1.08);}
  #whatsapp-float svg{width:1.75rem;height:1.75rem;fill:#fff;}

  /* SMALL-MOBILE — base styles, no media query — the genuine floor, ≤360px */
  .hero-copy h1{font-size:1.78rem;}
  .hero-numeral{font-size:44vw;}
  .gallery-grid{grid-template-columns:1fr;}
  .stat-item{padding:26px 26px;}
  .stat-item strong{font-size:1.7rem;}
  .hours-days{gap:18px;}

  /* MOBILE — 361-480px */
  @media (min-width:361px){
    .hero-copy h1{font-size:2.2rem;}
    .gallery-grid{grid-template-columns:repeat(2,1fr);}
    .hero-cta-group{flex-wrap:nowrap;}
    .stat-item{padding:30px 32px;}
    .stat-item strong{font-size:1.9rem;}
  }

  /* TABLET — 481-1024px */
  @media (min-width:481px){
    .service-grid{grid-template-columns:repeat(2,1fr);}
    .testimonial-grid{grid-template-columns:repeat(3,1fr);}
    .gallery-grid{grid-template-columns:repeat(4,1fr);}
    .hero-copy h1{font-size:2.6rem;}
    .hero-numeral{font-size:32vw;}
    .hours-inner{flex-direction:row;justify-content:space-between;text-align:left;}
    .hours-days{justify-content:flex-start;}
    .stat-item{padding:34px 40px;}
    .stat-item strong{font-size:2.1rem;}
  }

  /* DESKTOP */
  @media (min-width:1025px){
    .hamburger{display:none;}
    .hero .container{grid-template-columns:1fr 1fr;}
    .hero-copy h1{font-size:3.4rem;}
    .hero-numeral{font-size:24vw;}
    .contact-section .container{grid-template-columns:1fr 1fr;}
  }
  @media (max-width:1024px){
    nav.primary-nav{display:none;}
    .hamburger{display:flex;}
  }

  @media (prefers-reduced-motion: reduce){
    *{animation-duration:.01ms !important;transition-duration:.01ms !important;}
    .marquee{overflow-x:auto;}
    .marquee-track{animation:none !important;}
  }
</style>
</head>
<body>

<header id="site-nav">
  <div class="container nav-inner">
    <a href="#top" class="logo">{{business_name}}</a>
    <nav class="primary-nav" aria-label="Primary navigation">
      <ul>
        ${navHtml}
      </ul>
    </nav>
    <button class="hamburger" id="hamburger-btn" aria-label="Toggle menu" aria-expanded="false" aria-controls="mobile-drawer">
      <span></span><span></span><span></span>
    </button>
  </div>
</header>

<div class="drawer-overlay" id="drawer-overlay"></div>
<nav class="mobile-drawer" id="mobile-drawer" aria-label="Mobile navigation">
  <ul>
    ${drawerHtml}
  </ul>
</nav>

<main id="top">
${heroHtml}
${modulesHtml}

  <section class="services-section" id="services" aria-label="Menu Highlights">
    <div class="container">
      <div class="services-header">
        <p class="eyebrow">Chef's Selection</p>
        <h2>From The Menu</h2>
        <p>A taste of what we serve.</p>
      </div>
      <div class="service-grid">
        <div class="service-card" data-optional-slot="1">
          <p class="service-price">01</p>
          <h3>{{service_1_name}}</h3>
          <p>{{service_1_description}}</p>
        </div>
        <div class="service-card" data-optional-slot="2">
          <p class="service-price">02</p>
          <h3>{{service_2_name}}</h3>
          <p>{{service_2_description}}</p>
        </div>
        <div class="service-card" data-optional-slot="3">
          <p class="service-price">03</p>
          <h3>{{service_3_name}}</h3>
          <p>{{service_3_description}}</p>
        </div>
        <div class="service-card" data-optional="true" data-optional-slot="4" hidden>
          <p class="service-price">04</p>
          <h3>{{service_4_name}}</h3>
          <p>{{service_4_description}}</p>
        </div>
        <div class="service-card" data-optional="true" data-optional-slot="5" hidden>
          <p class="service-price">05</p>
          <h3>{{service_5_name}}</h3>
          <p>{{service_5_description}}</p>
        </div>
        <div class="service-card" data-optional="true" data-optional-slot="6" hidden>
          <p class="service-price">06</p>
          <h3>{{service_6_name}}</h3>
          <p>{{service_6_description}}</p>
        </div>
      </div>
    </div>
  </section>

  <section class="testimonials-section" id="testimonials" aria-label="Testimonials">
    <div class="container">
      <div class="testimonials-header">
        <p class="eyebrow">Guest Words</p>
        <h2>What Guests Say</h2>
      </div>
      <div class="testimonial-grid">
        <blockquote class="testimonial-card">
          <p class="testimonial-quote">"{{testimonial_1_quote}}"</p>
          <p class="testimonial-name">{{testimonial_1_name}}</p>
          <p class="testimonial-role">{{testimonial_1_role}}</p>
        </blockquote>
        <blockquote class="testimonial-card">
          <p class="testimonial-quote">"{{testimonial_2_quote}}"</p>
          <p class="testimonial-name">{{testimonial_2_name}}</p>
          <p class="testimonial-role">{{testimonial_2_role}}</p>
        </blockquote>
        <blockquote class="testimonial-card">
          <p class="testimonial-quote">"{{testimonial_3_quote}}"</p>
          <p class="testimonial-name">{{testimonial_3_name}}</p>
          <p class="testimonial-role">{{testimonial_3_role}}</p>
        </blockquote>
      </div>
    </div>
  </section>

  <section class="contact-section" id="contact" aria-label="Contact">
    <div class="container">
      <div class="contact-info">
        <p class="eyebrow">Visit Us</p>
        <h2>Get In Touch</h2>
        <p>{{about_body_short}}</p>
        <div class="contact-detail"><strong>Address</strong>{{address}}</div>
        <div class="contact-detail"><strong>Phone</strong>{{phone_number}}</div>
        <div class="contact-detail"><strong>Email</strong>{{email_address}}</div>
      </div>
      <form id="contact-form" novalidate>
        <div class="form-fields">
          <div><label for="cf-name">Name</label><input type="text" id="cf-name" name="name" required></div>
          <div><label for="cf-email">Email</label><input type="email" id="cf-email" name="email" required></div>
          <div><label for="cf-message">Message</label><textarea id="cf-message" name="message" required></textarea></div>
          <button type="submit" class="btn">Send Message</button>
        </div>
        <div class="form-success">Message sent. We'll be in touch soon.</div>
      </form>
    </div>
  </section>

</main>

<footer>
  <div class="container footer-inner">
    <a href="#top" class="logo">{{business_name}}</a>
    <p class="tagline">{{tagline}}</p>
    <div class="footer-socials" id="footer-instagram-wrap" data-instagram-url="{{instagram_url}}">
      <a href="{{instagram_url}}" id="footer-instagram-link" target="_blank" rel="noopener">Instagram</a>
    </div>
    <p class="powered-by">Powered by <a href="#">Zuri</a></p>
  </div>
</footer>

<div id="whatsapp-float" data-whatsapp-number="{{whatsapp_number}}">
  <a href="#" aria-label="Chat on WhatsApp">
    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M12.001 2C6.478 2 2 6.477 2 12c0 1.876.52 3.63 1.42 5.13L2 22l4.99-1.31A9.95 9.95 0 0 0 12.001 22C17.524 22 22 17.523 22 12S17.524 2 12.001 2zm0 18.05a8.03 8.03 0 0 1-4.1-1.13l-.294-.175-3.02.792.81-2.943-.192-.303A8.05 8.05 0 1 1 20.05 12a8.05 8.05 0 0 1-8.049 8.05z"/></svg>
  </a>
</div>

<script>
  var prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Nav scroll state
  var navEl = document.getElementById('site-nav');
  window.addEventListener('scroll', function(){
    if(window.scrollY > 40){ navEl.classList.add('scrolled'); } else { navEl.classList.remove('scrolled'); }
  });

  // Hamburger drawer
  var hamburgerBtn = document.getElementById('hamburger-btn');
  var drawer = document.getElementById('mobile-drawer');
  var overlay = document.getElementById('drawer-overlay');
  function closeDrawer(){
    hamburgerBtn.classList.remove('open'); drawer.classList.remove('open');
    overlay.classList.remove('open'); hamburgerBtn.setAttribute('aria-expanded','false');
  }
  hamburgerBtn.addEventListener('click', function(){
    var isOpen = drawer.classList.toggle('open');
    hamburgerBtn.classList.toggle('open', isOpen);
    overlay.classList.toggle('open', isOpen);
    hamburgerBtn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
  overlay.addEventListener('click', closeDrawer);
  drawer.querySelectorAll('a').forEach(function(a){ a.addEventListener('click', closeDrawer); });

  // FAQ accordion
  document.querySelectorAll('.faq-item').forEach(function(item){
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    q.addEventListener('click', function(){
      var isOpen = item.classList.toggle('open');
      a.style.maxHeight = isOpen ? a.scrollHeight + 'px' : '0px';
    });
  });

  // Contact form
  var form = document.getElementById('contact-form');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    form.classList.add('submitted');
    form.querySelector('.form-success').classList.add('show');
  });

  // Instagram optional hide
  (function(){
    var wrap = document.getElementById('footer-instagram-wrap');
    var url = wrap.getAttribute('data-instagram-url');
    if(!url || url.trim() === '' || url.indexOf('{{') === 0){ wrap.remove(); }
  })();

  // WhatsApp float
  (function(){
    var el = document.getElementById('whatsapp-float');
    var num = el.getAttribute('data-whatsapp-number');
    if (!num || num.trim() === '' || num.indexOf('{{') === 0) { el.remove(); }
    else { el.querySelector('a').href = 'https://wa.me/' + num.replace(/[^0-9]/g,''); }
  })();

  // GSAP animation
  if(!prefersReducedMotion && window.gsap){
    gsap.registerPlugin(ScrollTrigger);

    // Hero entrance choreography
    var heroTl = gsap.timeline({ delay: 0.15 });
    heroTl.from('.hero-copy .eyebrow', { opacity: 0, y: 16, duration: .5, ease: 'power2.out' })
          .from('.hero-copy h1', { opacity: 0, y: 24, duration: .65, ease: 'power2.out' }, '-=.25')
          .from('.hero-copy p', { opacity: 0, y: 18, duration: .55, ease: 'power2.out' }, '-=.35')
          .from('.hero-cta-group a', { opacity: 0, y: 14, duration: .5, stagger: .1, ease: 'power2.out' }, '-=.3')
          .from('.hero-image', { opacity: 0, scale: 1.06, duration: .9, ease: 'power2.out' }, '-=.7');

    // Section reveals with stagger
    document.querySelectorAll('section').forEach(function(sec){
      var targets = sec.querySelectorAll('.gallery-grid figure, .service-card, .testimonial-card, .faq-item, .hours-day, .contact-info, form, .gallery-header, .services-header, .faq-header, .testimonials-header');
      if(!targets.length) return;
      gsap.from(targets, {
        opacity: 0, y: 26, duration: .6, stagger: .08, ease: 'power2.out',
        scrollTrigger: { trigger: sec, start: 'top 80%' }
      });
    });

    // Signature moment: scale-up reveal on gallery images (appetite-driven energy)
    document.querySelectorAll('.gallery-grid img').forEach(function(img){
      gsap.fromTo(img, { scale: 1.15 }, {
        scale: 1, duration: 1.1, ease: 'power2.out',
        scrollTrigger: { trigger: img, start: 'top 85%' }
      });
    });

    // Stats-strip marquee — mandatory horizontal auto-scroll pattern
    var statsTrack = document.getElementById('stats-track');
    if(statsTrack){
      gsap.to(statsTrack, { xPercent: -50, duration: 18, repeat: -1, ease: 'none' });
    }
  }
</script>

</body>
</html>
`;
  return html;
}

function buildJson(v){
  const p = palette(v.mode, v.accent);
  const accents = ['#C1662F','#B8860B','#A85C1E'];
  const color_themes = accents.map((a,i)=>({
    key:'theme-'+(i+1),
    bg:p.bg, surface:p.surface, text:p.text, text_muted:p.textMuted,
    accent:a, accent_text:p.accentText
  }));

  const placeholder_fields = [
    "business_name","tagline","about_body_short","about_body_long",
    "service_1_name","service_1_description","service_2_name","service_2_description",
    "service_3_name","service_3_description","service_4_name","service_4_description",
    "service_5_name","service_5_description","service_6_name","service_6_description",
    "testimonial_1_quote","testimonial_1_name","testimonial_1_role",
    "testimonial_2_quote","testimonial_2_name","testimonial_2_role",
    "testimonial_3_quote","testimonial_3_name","testimonial_3_role",
    "phone_number","email_address","whatsapp_number","instagram_url","address"
  ];
  if(v.modules.includes('opening-hours-cta')) placeholder_fields.push('hours_weekday','hours_saturday','hours_sunday');
  if(v.modules.includes('faq-accordion')) placeholder_fields.push('faq_1_question','faq_1_answer','faq_2_question','faq_2_answer','faq_3_question','faq_3_answer');
  if(v.modules.includes('stats-strip')) placeholder_fields.push('stat_1_value','stat_1_label','stat_2_value','stat_2_label','stat_3_value','stat_3_label','stat_4_value','stat_4_label');

  const image_slots = [];
  if(v.hero==='image'){ placeholder_fields.push('hero_image_public_id'); image_slots.push('hero'); }
  if(v.modules.includes('gallery')){
    placeholder_fields.push('gallery_1_public_id','gallery_2_public_id','gallery_3_public_id','gallery_4_public_id');
    image_slots.push('gallery_1','gallery_2','gallery_3','gallery_4');
  }

  const hasUnique = v.modules.includes('opening-hours-cta');

  return {
    template_id: `warm-sensory-${v.id}`,
    archetype: "warm-sensory",
    mode: v.mode,
    hero_type: v.hero,
    supportedModules: v.modules,
    lean: "international",
    display_name: v.display,
    storage_path: `warm-sensory/${v.id}.html`,
    color_themes,
    placeholder_fields,
    image_slots,
    has_unique_section: hasUnique,
    ...(hasUnique ? { unique_section_name: "opening-hours-cta" } : {})
  };
}

for(const v of variants){
  const html = buildHtml(v);
  const json = buildJson(v);
  fs.writeFileSync(path.join(OUT_DIR, `${v.id}.html`), html, 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, `${v.id}.json`), JSON.stringify(json, null, 2), 'utf8');
  console.log('wrote', v.id);
}
