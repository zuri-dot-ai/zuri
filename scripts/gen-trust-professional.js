// One-off generator script for trust-professional templates. Not part of the app runtime.
const fs = require('fs');
const path = require('path');

const OUT_DIR = path.join(__dirname, '..', 'templates-v2', 'trust-professional');

const HERO_IMAGES = [
  'zuri-stock/trust-professional/hero/benyamin-bohlouli-e7MJLM5VGjY-unsplash',
  'zuri-stock/trust-professional/hero/pexels-cedric-fauntleroy-4266934',
  'zuri-stock/trust-professional/hero/pexels-cristian-rojas-8459996',
  'zuri-stock/trust-professional/hero/marios-gkortsilas--i6kaig732w-unsplash',
];
const ABOUT_IMAGES = [
  'zuri-stock/trust-professional/about/pexels-bakytzhan-baurzhanov-854600-9951386',
  'zuri-stock/trust-professional/about/istockphoto-2214934999-612x612',
  'zuri-stock/trust-professional/about/pexels-layth-mushreq-2148270719-37273005',
  'zuri-stock/trust-professional/about/istockphoto-904802064-612x612',
  'zuri-stock/trust-professional/about/pexels-worldsikhorg-14797857',
];

const CLOUD_BASE = 'https://res.cloudinary.com/dzuvmw4l/image/upload';
const HERO_T = 'c_fill,g_auto,w_1600,h_900,f_auto,q_auto:good';
const SQUARE_T = 'c_fill,g_auto,w_1200,h_1200,f_auto,q_auto:good';

function heroImg(id, alt) {
  return `<img src="${CLOUD_BASE}/${HERO_T}/${id}" data-image-slot="hero" alt="${alt}" loading="eager" />`;
}
function aboutImg(id, alt) {
  return `<img src="${CLOUD_BASE}/${SQUARE_T}/${id}" data-image-slot="about" alt="${alt}" loading="lazy" />`;
}

const LIGHT = { bg: '#FFFFFF', surface: '#F1F5F5', text: '#1A2226', text_muted: '#5E6B70', accent_text: '#FFFFFF' };
const DARK = { bg: '#12191C', surface: '#1B2428', text: '#F1F5F5', text_muted: '#9BAAAE', accent_text: '#FFFFFF' };

const TEAL = '#2E7D6B';
const BLUE = '#2A4D8F';

// ---- Variant plan ----
const VARIANTS = [
  { name: 'dark-harbor', mode: 'dark', hero: 'typography', modules: ['credentials-bar', 'faq-accordion', 'founder-split'], accent: BLUE, display: 'Medical Dark Harbor' },
  { name: 'light-anchor', mode: 'light', hero: 'image', modules: ['founder-split', 'credentials-bar'], accent: TEAL, display: 'Medical Light Anchor' },
  { name: 'dark-clarity', mode: 'dark', hero: 'typography', modules: ['stats-strip', 'faq-accordion'], accent: BLUE, display: 'Medical Dark Clarity' },
  { name: 'light-steady', mode: 'light', hero: 'typography', modules: ['credentials-bar', 'stats-strip', 'founder-split'], accent: TEAL, display: 'Medical Light Steady' },
  { name: 'dark-poise', mode: 'dark', hero: 'image', modules: ['credentials-bar', 'faq-accordion', 'stats-strip'], accent: BLUE, display: 'Medical Dark Poise' },
  { name: 'light-assure', mode: 'light', hero: 'image', modules: ['founder-split', 'faq-accordion'], accent: TEAL, display: 'Medical Light Assure' },
  { name: 'dark-tenet', mode: 'dark', hero: 'typography', modules: ['stats-strip', 'credentials-bar', 'faq-accordion'], accent: BLUE, display: 'Medical Dark Tenet' },
  { name: 'light-remedy', mode: 'light', hero: 'typography', modules: ['credentials-bar', 'faq-accordion'], accent: TEAL, display: 'Medical Light Remedy' },
  { name: 'dark-provident', mode: 'dark', hero: 'image', modules: ['founder-split', 'stats-strip', 'credentials-bar'], accent: BLUE, display: 'Medical Dark Provident' },
];

function navItems(modules) {
  const items = [];
  if (modules.includes('credentials-bar')) items.push(['#credentials', 'Credentials']);
  if (modules.includes('founder-split')) items.push(['#founder', 'About']);
  items.push(['#services', 'Services']);
  if (modules.includes('faq-accordion')) items.push(['#faq', 'FAQ']);
  items.push(['#testimonials', 'Testimonials']);
  items.push(['#contact', 'Contact']);
  return items;
}

function navHtml(modules, cls) {
  return navItems(modules).map(([href, label]) => `<li><a href="${href}">${label}</a></li>`).join('\n        ');
}

function credentialsSection() {
  return `
  <section id="credentials" aria-label="Credentials" data-module="credentials-bar">
    <div class="container">
      <div class="credentials-header">
        <p class="eyebrow">Why Patients Trust Us</p>
        <h2>Credentials &amp; Care Standards</h2>
      </div>
      <div class="credentials-grid">
        <div class="credential-card">
          <svg class="credential-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 2l7 4v6c0 5-3.5 8-7 10-3.5-2-7-5-7-10V6l7-4z"/><path d="M9 12l2 2 4-4"/></svg>
          <h3>{{credential_1_title}}</h3><p>{{credential_1_detail}}</p>
        </div>
        <div class="credential-card">
          <svg class="credential-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="4" y="3" width="16" height="18" rx="2"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
          <h3>{{credential_2_title}}</h3><p>{{credential_2_detail}}</p>
        </div>
        <div class="credential-card">
          <svg class="credential-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>
          <h3>{{credential_3_title}}</h3><p>{{credential_3_detail}}</p>
        </div>
      </div>
    </div>
  </section>`;
}

function statsSection() {
  return `
  <section class="stats-strip" aria-label="Stats" data-module="stats-strip">
    <div class="marquee" id="marquee-track">
      <span class="marquee-item"><span class="stat-num">{{stat_1_value}}</span><span class="stat-label">{{stat_1_label}}</span></span>
      <span class="marquee-item"><span class="stat-num">{{stat_2_value}}</span><span class="stat-label">{{stat_2_label}}</span></span>
      <span class="marquee-item"><span class="stat-num">{{stat_3_value}}</span><span class="stat-label">{{stat_3_label}}</span></span>
      <span class="marquee-item"><span class="stat-num">{{stat_4_value}}</span><span class="stat-label">{{stat_4_label}}</span></span>
      <span class="marquee-item"><span class="stat-num">{{stat_1_value}}</span><span class="stat-label">{{stat_1_label}}</span></span>
      <span class="marquee-item"><span class="stat-num">{{stat_2_value}}</span><span class="stat-label">{{stat_2_label}}</span></span>
      <span class="marquee-item"><span class="stat-num">{{stat_3_value}}</span><span class="stat-label">{{stat_3_label}}</span></span>
      <span class="marquee-item"><span class="stat-num">{{stat_4_value}}</span><span class="stat-label">{{stat_4_label}}</span></span>
    </div>
  </section>`;
}

function founderSection(imgId) {
  return `
  <section id="founder" aria-label="Founder" data-module="founder-split">
    <div class="container founder-grid">
      <div class="founder-image">
        ${aboutImg(imgId, '{{business_name}}')}
      </div>
      <div class="founder-copy">
        <p class="eyebrow">Meet Your Provider</p>
        <h2>A Personal Note From {{first_name}}</h2>
        <p>{{about_body_long}}</p>
      </div>
    </div>
  </section>`;
}

function faqSection() {
  return `
  <section id="faq" aria-label="FAQ" data-module="faq-accordion">
    <div class="container">
      <div class="faq-header">
        <p class="eyebrow">Good To Know</p>
        <h2>Frequently Asked</h2>
      </div>
      <div class="faq-list">
        <div class="faq-item"><button class="faq-q"><span>{{faq_1_question}}</span><span class="plus">+</span></button><div class="faq-a"><p>{{faq_1_answer}}</p></div></div>
        <div class="faq-item"><button class="faq-q"><span>{{faq_2_question}}</span><span class="plus">+</span></button><div class="faq-a"><p>{{faq_2_answer}}</p></div></div>
        <div class="faq-item"><button class="faq-q"><span>{{faq_3_question}}</span><span class="plus">+</span></button><div class="faq-a"><p>{{faq_3_answer}}</p></div></div>
      </div>
    </div>
  </section>`;
}

function servicesSection() {
  return `
  <section id="services" aria-label="Services">
    <div class="container">
      <div class="services-header">
        <p class="eyebrow">What We Offer</p>
        <h2>Our Services</h2>
      </div>
      <div class="service-grid">
        <div class="service-card" data-optional-slot="1"><h3>{{service_1_name}}</h3><p>{{service_1_description}}</p></div>
        <div class="service-card" data-optional-slot="2"><h3>{{service_2_name}}</h3><p>{{service_2_description}}</p></div>
        <div class="service-card" data-optional-slot="3"><h3>{{service_3_name}}</h3><p>{{service_3_description}}</p></div>
        <div class="service-card" data-optional="true" data-optional-slot="4" hidden><h3>{{service_4_name}}</h3><p>{{service_4_description}}</p></div>
        <div class="service-card" data-optional="true" data-optional-slot="5" hidden><h3>{{service_5_name}}</h3><p>{{service_5_description}}</p></div>
        <div class="service-card" data-optional="true" data-optional-slot="6" hidden><h3>{{service_6_name}}</h3><p>{{service_6_description}}</p></div>
      </div>
    </div>
  </section>`;
}

function testimonialsSection() {
  return `
  <section class="testimonials-section" id="testimonials" aria-label="Testimonials">
    <div class="container">
      <div class="testimonials-header">
        <p class="eyebrow">Patient Words</p>
        <h2>What Patients Say</h2>
      </div>
      <div class="testimonial-grid">
        <blockquote class="testimonial-card"><p class="testimonial-quote">"{{testimonial_1_quote}}"</p><p class="testimonial-name">{{testimonial_1_name}}</p><p class="testimonial-role">{{testimonial_1_role}}</p></blockquote>
        <blockquote class="testimonial-card"><p class="testimonial-quote">"{{testimonial_2_quote}}"</p><p class="testimonial-name">{{testimonial_2_name}}</p><p class="testimonial-role">{{testimonial_2_role}}</p></blockquote>
        <blockquote class="testimonial-card"><p class="testimonial-quote">"{{testimonial_3_quote}}"</p><p class="testimonial-name">{{testimonial_3_name}}</p><p class="testimonial-role">{{testimonial_3_role}}</p></blockquote>
      </div>
    </div>
  </section>`;
}

function contactSection() {
  return `
  <section class="contact-section" id="contact" aria-label="Contact">
    <div class="container">
      <div class="contact-info">
        <p class="eyebrow">Get In Touch</p>
        <h2>Schedule A Visit</h2>
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
  </section>`;
}

function heroSection(type, imgId) {
  if (type === 'typography') {
    return `
  <section class="hero hero-typography" aria-label="Hero">
    <div class="container">
      <div class="hero-copy">
        <p class="eyebrow">{{tagline}}</p>
        <h1 id="hero-headline">{{business_name}}</h1>
        <p>{{about_body_short}}</p>
        <div class="hero-cta-group">
          <a href="#contact" class="btn">Book An Appointment</a>
          <a href="#services" class="btn btn-outline">Our Services</a>
        </div>
      </div>
    </div>
  </section>`;
  }
  return `
  <section class="hero hero-image" aria-label="Hero">
    <div class="container hero-grid">
      <div class="hero-copy">
        <p class="eyebrow">{{tagline}}</p>
        <h1 id="hero-headline">{{business_name}}</h1>
        <p>{{about_body_short}}</p>
        <div class="hero-cta-group">
          <a href="#contact" class="btn">Book An Appointment</a>
          <a href="#services" class="btn btn-outline">Our Services</a>
        </div>
      </div>
      <div class="hero-media">
        ${heroImg(imgId, '{{business_name}}')}
      </div>
    </div>
  </section>`;
}

function moduleSection(id, imgId) {
  switch (id) {
    case 'credentials-bar': return credentialsSection();
    case 'stats-strip': return statsSection();
    case 'faq-accordion': return faqSection();
    case 'founder-split': return founderSection(imgId);
    default: return '';
  }
}

function buildHtml(v, idx) {
  const palette = v.mode === 'dark' ? DARK : LIGHT;
  const heroImgId = HERO_IMAGES[idx % HERO_IMAGES.length];
  const aboutImgId = ABOUT_IMAGES[idx % ABOUT_IMAGES.length];
  const modulesHtml = v.modules.map((m) => moduleSection(m, aboutImgId)).join('\n');
  const footerBg = v.mode === 'dark' ? '#0A0E10' : '#12191C';
  const navScrolledBg = v.mode === 'dark' ? 'rgba(18,25,28,.92)' : 'rgba(255,255,255,.95)';
  const drawerShadow = v.mode === 'dark' ? '-4px 0 24px rgba(0,0,0,.5)' : '-4px 0 24px rgba(0,0,0,.12)';
  const overlayColor = v.mode === 'dark' ? 'rgba(0,0,0,.55)' : 'rgba(26,34,38,.35)';
  const borderTone = v.mode === 'dark' ? 'rgba(255,255,255,.12)' : 'rgba(26,34,38,.1)';
  const borderToneStrong = v.mode === 'dark' ? 'rgba(255,255,255,.18)' : 'rgba(26,34,38,.15)';
  const heroGradient = v.mode === 'dark'
    ? `linear-gradient(180deg, ${palette.surface}, ${palette.bg})`
    : `linear-gradient(180deg, ${palette.surface}, ${palette.bg})`;
  const btnHoverShadow = `0 10px 22px ${hexToRgba(v.accent, 0.28)}`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{{business_name}}</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js"></script>
<style>
  :root{
    --color-bg:${palette.bg};
    --color-surface:${palette.surface};
    --color-text:${palette.text};
    --color-text-muted:${palette.text_muted};
    --color-accent:${v.accent};
    --color-accent-text:${palette.accent_text};
  }
  *,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
  html{scroll-behavior:smooth;}
  body{background:var(--color-bg);color:var(--color-text);font-family:'Montserrat',sans-serif;line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden;}
  h1,h2,h3,h4{font-family:Georgia,'Times New Roman',serif;color:var(--color-text);font-weight:700;line-height:1.2;}
  a{color:inherit;text-decoration:none;}
  img{max-width:100%;display:block;}
  .container{width:100%;max-width:1180px;margin:0 auto;padding:0 20px;}
  section{padding:64px 0;}
  .eyebrow{text-transform:uppercase;letter-spacing:2px;font-size:.72rem;color:var(--color-accent);font-weight:600;margin-bottom:14px;}
  .btn{display:inline-block;padding:14px 30px;background:var(--color-accent);color:var(--color-accent-text);font-weight:600;font-size:.88rem;border-radius:4px;transition:transform .28s ease, box-shadow .28s ease;}
  .btn:hover{transform:translateY(-2px);box-shadow:${btnHoverShadow};}
  .btn-outline{background:transparent;color:var(--color-text);border:1px solid ${borderToneStrong};}
  .btn-outline:hover{background:${v.mode === 'dark' ? 'rgba(255,255,255,.06)' : 'rgba(26,34,38,.04)'};}
  :focus-visible{outline:2px solid var(--color-accent);outline-offset:3px;}

  header#site-nav{position:fixed;top:0;left:0;right:0;z-index:1000;padding:22px 0;transition:background .28s ease, padding .28s ease;background:transparent;}
  header#site-nav.scrolled{background:${navScrolledBg};backdrop-filter:blur(8px);padding:14px 0;box-shadow:0 2px 18px rgba(0,0,0,.12);}
  .nav-inner{display:flex;align-items:center;justify-content:space-between;}
  .logo{font-family:Georgia,serif;font-size:1.4rem;font-weight:700;}
  nav.primary-nav ul{display:flex;gap:34px;list-style:none;}
  nav.primary-nav a{font-size:.85rem;font-weight:500;position:relative;padding-bottom:4px;}
  nav.primary-nav a::after{content:'';position:absolute;left:0;bottom:0;width:0;height:2px;background:var(--color-accent);transition:width .25s ease;}
  nav.primary-nav a:hover::after{width:100%;}
  .hamburger{display:none;flex-direction:column;gap:5px;background:none;border:none;cursor:pointer;z-index:1100;padding:8px;}
  .hamburger span{width:24px;height:2px;background:var(--color-text);transition:all .25s ease;}
  .hamburger.open span:nth-child(1){transform:translateY(7px) rotate(45deg);}
  .hamburger.open span:nth-child(2){opacity:0;}
  .hamburger.open span:nth-child(3){transform:translateY(-7px) rotate(-45deg);}
  .mobile-drawer{position:fixed;top:0;right:-100%;width:78%;max-width:340px;height:100vh;background:var(--color-bg);box-shadow:${drawerShadow};z-index:1050;transition:right .3s ease;padding:100px 32px 40px;}
  .mobile-drawer.open{right:0;}
  .mobile-drawer ul{list-style:none;display:flex;flex-direction:column;gap:26px;}
  .mobile-drawer a{font-family:Georgia,serif;font-size:1.15rem;font-weight:700;}
  .drawer-overlay{position:fixed;inset:0;background:${overlayColor};z-index:1040;opacity:0;pointer-events:none;transition:opacity .3s ease;}
  .drawer-overlay.open{opacity:1;pointer-events:auto;}

  /* HERO */
  .hero{padding-top:170px;padding-bottom:100px;position:relative;background:${heroGradient};}
  .hero-typography .container{max-width:800px;text-align:center;}
  .hero-typography .hero-copy .eyebrow{justify-content:center;display:flex;}
  .hero-copy h1{font-size:1.95rem;margin-bottom:22px;}
  .hero-copy p{color:var(--color-text-muted);font-size:1.05rem;max-width:540px;margin:0 auto 34px;}
  .hero-typography .hero-copy p{margin:0 auto 34px;}
  .hero-cta-group{display:flex;gap:16px;justify-content:center;flex-wrap:wrap;}
  .hero-image .hero-grid{display:grid;grid-template-columns:1fr;gap:36px;align-items:center;}
  .hero-image .hero-copy{text-align:left;}
  .hero-image .hero-copy .eyebrow{justify-content:flex-start;}
  .hero-image .hero-copy p{margin:0 0 34px;}
  .hero-image .hero-cta-group{justify-content:flex-start;}
  .hero-media{border-radius:10px;overflow:hidden;order:-1;}
  .hero-media img{width:100%;height:auto;aspect-ratio:4/3;object-fit:cover;}

  /* CREDENTIALS */
  .credentials-header{text-align:center;max-width:600px;margin:0 auto 46px;}
  .credentials-header h2{font-size:2rem;}
  .credentials-grid{display:grid;grid-template-columns:1fr;gap:26px;}
  .credential-card{text-align:center;background:var(--color-surface);padding:30px;border-radius:8px;}
  .credential-icon{width:40px;height:40px;margin:0 auto 14px;color:var(--color-accent);}
  .credential-card h3{font-size:1.05rem;margin-bottom:8px;}
  .credential-card p{font-size:.88rem;color:var(--color-text-muted);}

  /* STATS STRIP */
  .stats-strip{background:var(--color-surface);overflow:hidden;padding:34px 0;}
  .marquee{display:flex;white-space:nowrap;align-items:baseline;gap:0;}
  .marquee-item{display:flex;align-items:baseline;gap:14px;padding:0 40px;}
  .stat-num{font-family:Georgia,serif;font-size:1.9rem;color:var(--color-accent);font-weight:700;flex-shrink:0;}
  .stat-label{font-size:.78rem;text-transform:uppercase;letter-spacing:1.5px;color:var(--color-text-muted);flex-shrink:0;}
  .marquee-item + .marquee-item{border-left:1px solid ${borderTone};}

  /* FOUNDER SPLIT */
  .founder-grid{display:grid;grid-template-columns:1fr;gap:32px;align-items:center;}
  .founder-image{border-radius:10px;overflow:hidden;}
  .founder-image img{aspect-ratio:1/1;width:100%;height:auto;object-fit:cover;}
  .founder-copy h2{font-size:1.9rem;margin-bottom:16px;}
  .founder-copy p{color:var(--color-text-muted);font-size:.98rem;}

  /* SERVICES */
  .services-header{text-align:center;max-width:600px;margin:0 auto 46px;}
  .services-header h2{font-size:2rem;}
  .service-grid{display:grid;grid-template-columns:1fr;gap:20px;}
  .service-card{background:var(--color-surface);padding:28px;border-radius:8px;}
  .service-card h3{font-size:1.15rem;margin-bottom:8px;}
  .service-card p{color:var(--color-text-muted);font-size:.92rem;}

  /* FAQ */
  .faq-header{text-align:center;max-width:600px;margin:0 auto 42px;}
  .faq-header h2{font-size:2rem;}
  .faq-list{max-width:760px;margin:0 auto;}
  .faq-item{border-bottom:1px solid ${borderTone};}
  .faq-q{width:100%;text-align:left;background:none;border:none;color:var(--color-text);padding:20px 0;display:flex;justify-content:space-between;align-items:center;font-family:Georgia,serif;font-weight:700;font-size:1.05rem;cursor:pointer;}
  .faq-q .plus{transition:transform .25s ease;color:var(--color-accent);font-size:1.3rem;}
  .faq-item.open .plus{transform:rotate(45deg);}
  .faq-a{max-height:0;overflow:hidden;transition:max-height .3s ease;}
  .faq-a p{color:var(--color-text-muted);padding-bottom:18px;font-size:.92rem;max-width:640px;}

  /* TESTIMONIALS */
  .testimonials-section{background:var(--color-surface);}
  .testimonials-header{text-align:center;margin-bottom:46px;}
  .testimonials-header h2{font-size:2rem;}
  .testimonial-grid{display:grid;grid-template-columns:1fr;gap:22px;}
  .testimonial-card{background:var(--color-bg);padding:30px;border-radius:8px;border-left:3px solid var(--color-accent);}
  .testimonial-quote{font-size:1rem;font-style:italic;margin-bottom:18px;}
  .testimonial-name{font-weight:700;font-size:.9rem;}
  .testimonial-role{color:var(--color-text-muted);font-size:.82rem;}

  /* CONTACT */
  .contact-section .container{display:grid;grid-template-columns:1fr;gap:40px;}
  .contact-info h2{font-size:2rem;margin-bottom:18px;}
  .contact-info p{color:var(--color-text-muted);margin-bottom:24px;}
  .contact-detail{margin-bottom:14px;font-size:.95rem;}
  .contact-detail strong{display:block;font-size:.72rem;text-transform:uppercase;letter-spacing:1px;color:var(--color-accent);margin-bottom:2px;}
  form#contact-form{background:var(--color-surface);padding:30px;border-radius:8px;display:flex;flex-direction:column;gap:16px;}
  form#contact-form label{font-size:.78rem;text-transform:uppercase;letter-spacing:1px;font-weight:600;margin-bottom:6px;display:block;}
  form#contact-form input,form#contact-form textarea{width:100%;padding:12px 14px;border:1px solid ${borderToneStrong};border-radius:4px;background:var(--color-bg);font-family:'Montserrat',sans-serif;font-size:.92rem;color:var(--color-text);}
  form#contact-form textarea{resize:vertical;min-height:110px;}
  form#contact-form input:focus,form#contact-form textarea:focus{outline:2px solid var(--color-accent);outline-offset:2px;}
  .form-success{display:none;background:var(--color-accent);color:#fff;padding:14px;border-radius:4px;font-size:.9rem;text-align:center;}
  .form-success.show{display:block;}
  form#contact-form.submitted .form-fields{display:none;}

  footer{background:${footerBg};color:#fff;padding:56px 0 30px;}
  .footer-inner{text-align:center;display:flex;flex-direction:column;align-items:center;gap:14px;}
  footer .logo{color:#fff;}
  footer p.tagline{color:rgba(255,255,255,.55);font-size:.9rem;max-width:400px;}
  .footer-socials{display:flex;gap:18px;margin-top:6px;}
  .footer-socials a{font-size:.8rem;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid var(--color-accent);padding-bottom:2px;}
  .powered-by{margin-top:28px;font-size:.75rem;color:rgba(255,255,255,.35);}

  #whatsapp-float{position:fixed;bottom:1.25rem;right:1.25rem;z-index:9999;}
  #whatsapp-float a{display:flex;align-items:center;justify-content:center;width:3.25rem;height:3.25rem;border-radius:9999px;background:#25D366;color:#fff;box-shadow:0 4px 14px rgba(37,211,102,.45);transition:transform .2s ease;}
  #whatsapp-float a:hover{transform:scale(1.08);}
  #whatsapp-float svg{width:1.75rem;height:1.75rem;fill:#fff;}

  /* SMALL-MOBILE — base styles, no media query, this is what ≤360px actually renders */
  .hero-copy h1{font-size:1.7rem;}
  .marquee-item{padding:0 22px;}
  .stat-num{font-size:1.5rem;}
  section{padding:52px 0;}

  /* MOBILE — 361-480px */
  @media (min-width:361px){
    section{padding:60px 0;}
    .hero-copy h1{font-size:2.1rem;}
    .hero-cta-group{flex-wrap:nowrap;}
    .marquee-item{padding:0 32px;}
    .stat-num{font-size:1.7rem;}
  }

  /* TABLET — 481-1024px */
  @media (min-width:481px){
    section{padding:72px 0;}
    .hero-copy h1{font-size:2.6rem;}
    .credentials-grid{grid-template-columns:repeat(3,1fr);}
    .service-grid{grid-template-columns:repeat(2,1fr);}
    .testimonial-grid{grid-template-columns:repeat(3,1fr);}
    .founder-grid{grid-template-columns:1fr 1fr;}
    .marquee-item{padding:0 40px;}
    .stat-num{font-size:1.9rem;}
  }
  @media (min-width:1025px){
    .hamburger{display:none;}
    section{padding:88px 0;}
    .hero-copy h1{font-size:3.3rem;}
    .contact-section .container{grid-template-columns:1fr 1fr;}
    .hero-image .hero-grid{grid-template-columns:1.5fr 1fr;}
    .hero-media{order:0;}
  }
  @media (max-width:1024px){ nav.primary-nav{display:none;} .hamburger{display:flex;} }

  @media (prefers-reduced-motion: reduce){ *{animation-duration:.01ms !important;transition-duration:.01ms !important;} .stats-strip{overflow-x:auto;} .marquee{width:max-content;} }
</style>
</head>
<body>

<header id="site-nav">
  <div class="container nav-inner">
    <a href="#top" class="logo">{{business_name}}</a>
    <nav class="primary-nav" aria-label="Primary navigation">
      <ul>
        ${navHtml(v.modules)}
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
    ${navHtml(v.modules)}
  </ul>
</nav>

<main id="top">
${heroSection(v.hero, heroImgId)}
${modulesHtml}
${servicesSection()}
${testimonialsSection()}
${contactSection()}
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

  var navEl = document.getElementById('site-nav');
  window.addEventListener('scroll', function(){
    if(window.scrollY > 40){ navEl.classList.add('scrolled'); } else { navEl.classList.remove('scrolled'); }
  });

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

  document.querySelectorAll('.faq-item').forEach(function(item){
    var q = item.querySelector('.faq-q');
    var a = item.querySelector('.faq-a');
    q.addEventListener('click', function(){
      var isOpen = item.classList.toggle('open');
      a.style.maxHeight = isOpen ? a.scrollHeight + 'px' : '0px';
    });
  });

  var form = document.getElementById('contact-form');
  form.addEventListener('submit', function(e){
    e.preventDefault();
    form.classList.add('submitted');
    form.querySelector('.form-success').classList.add('show');
  });

  (function(){
    var wrap = document.getElementById('footer-instagram-wrap');
    var url = wrap.getAttribute('data-instagram-url');
    if(!url || url.trim() === '' || url.indexOf('{{') === 0){ wrap.remove(); }
  })();

  (function(){
    var el = document.getElementById('whatsapp-float');
    var num = el.getAttribute('data-whatsapp-number');
    if (!num || num.trim() === '' || num.indexOf('{{') === 0) { el.remove(); }
    else { el.querySelector('a').href = 'https://wa.me/' + num.replace(/[^0-9]/g,''); }
  })();

  if(!prefersReducedMotion && window.gsap){
    gsap.registerPlugin(ScrollTrigger);

    // Crisp, minimal hero entrance (250-300ms per archetype motion spec)
    var heroTl = gsap.timeline({ delay: 0.1 });
    heroTl.from('.hero-copy .eyebrow', { opacity: 0, y: 10, duration: .28, ease: 'power1.out' })
          .from('.hero-copy h1', { opacity: 0, y: 16, duration: .3, ease: 'power1.out' }, '-=.15')
          .from('.hero-copy p', { opacity: 0, y: 12, duration: .28, ease: 'power1.out' }, '-=.18')
          .from('.hero-cta-group a', { opacity: 0, y: 10, duration: .26, stagger: .06, ease: 'power1.out' }, '-=.15');
    ${v.hero === 'image' ? `heroTl.from('.hero-media', { opacity: 0, y: 18, duration: .3, ease: 'power1.out' }, '-=.2');` : ''}

    document.querySelectorAll('section').forEach(function(sec){
      var targets = sec.querySelectorAll('.credential-card, .service-card, .faq-item, .testimonial-card, .contact-info, form, .founder-image, .founder-copy');
      if(!targets.length) return;
      gsap.from(targets, {
        opacity: 0, y: 16, duration: .32, stagger: .06, ease: 'power1.out',
        scrollTrigger: { trigger: sec, start: 'top 86%' }
      });
    });

    ${v.modules.includes('stats-strip') ? `// Signature moment: infinite marquee scroll on stats strip
    var track = document.getElementById('marquee-track');
    gsap.to(track, { xPercent: -50, duration: 20, repeat: -1, ease: 'none' });` : ''}
  }
</script>

</body>
</html>
`;
  return html;
}

function hexToRgba(hex, alpha) {
  var h = hex.replace('#', '');
  var r = parseInt(h.substring(0, 2), 16);
  var g = parseInt(h.substring(2, 4), 16);
  var b = parseInt(h.substring(4, 6), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}

function buildJson(v, idx) {
  const heroImgId = HERO_IMAGES[idx % HERO_IMAGES.length];
  const aboutImgId = ABOUT_IMAGES[idx % ABOUT_IMAGES.length];
  const palette = v.mode === 'dark' ? DARK : LIGHT;
  const accentAlt1 = v.accent === TEAL ? BLUE : TEAL;
  const accentAlt2 = v.accent === TEAL ? '#3D8C7A' : '#2C5F9E';

  const placeholderFields = [
    'business_name', 'tagline', 'about_body_short', 'about_body_long', 'first_name',
    'service_1_name', 'service_1_description', 'service_2_name', 'service_2_description',
    'service_3_name', 'service_3_description', 'service_4_name', 'service_4_description',
    'service_5_name', 'service_5_description', 'service_6_name', 'service_6_description',
    'testimonial_1_quote', 'testimonial_1_name', 'testimonial_1_role',
    'testimonial_2_quote', 'testimonial_2_name', 'testimonial_2_role',
    'testimonial_3_quote', 'testimonial_3_name', 'testimonial_3_role',
    'phone_number', 'email_address', 'whatsapp_number', 'instagram_url', 'address',
  ];
  if (v.modules.includes('credentials-bar')) {
    placeholderFields.push('credential_1_title', 'credential_1_detail', 'credential_2_title', 'credential_2_detail', 'credential_3_title', 'credential_3_detail');
  }
  if (v.modules.includes('stats-strip')) {
    placeholderFields.push('stat_1_value', 'stat_1_label', 'stat_2_value', 'stat_2_label', 'stat_3_value', 'stat_3_label', 'stat_4_value', 'stat_4_label');
  }
  if (v.modules.includes('faq-accordion')) {
    placeholderFields.push('faq_1_question', 'faq_1_answer', 'faq_2_question', 'faq_2_answer', 'faq_3_question', 'faq_3_answer');
  }

  const imageSlots = v.hero === 'image' ? ['hero'] : [];
  if (v.modules.includes('founder-split')) imageSlots.push('about');

  const uniqueModule = v.modules[0];

  return {
    template_id: `trust-professional-${v.name}`,
    archetype: 'trust-professional',
    mode: v.mode,
    hero_type: v.hero,
    supportedModules: v.modules,
    lean: 'international',
    display_name: v.display,
    storage_path: `trust-professional/${v.name}.html`,
    color_themes: [
      { key: 'theme-1', bg: palette.bg, surface: palette.surface, text: palette.text, text_muted: palette.text_muted, accent: v.accent, accent_text: palette.accent_text },
      { key: 'theme-2', bg: palette.bg, surface: palette.surface, text: palette.text, text_muted: palette.text_muted, accent: accentAlt1, accent_text: palette.accent_text },
      { key: 'theme-3', bg: palette.bg, surface: palette.surface, text: palette.text, text_muted: palette.text_muted, accent: accentAlt2, accent_text: palette.accent_text },
    ],
    placeholder_fields: placeholderFields,
    image_slots: imageSlots,
    has_unique_section: true,
    unique_section_name: uniqueModule,
  };
}

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

VARIANTS.forEach((v, idx) => {
  const html = buildHtml(v, idx);
  const json = buildJson(v, idx);
  fs.writeFileSync(path.join(OUT_DIR, `${v.name}.html`), html, 'utf8');
  fs.writeFileSync(path.join(OUT_DIR, `${v.name}.json`), JSON.stringify(json, null, 2), 'utf8');
  console.log('Wrote', v.name);
});
