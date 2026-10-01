// Integration point for the future Ana/Wandora support widget.
// Deliberately disabled: no network call, credential or Wandora runtime dependency
// is introduced by the public landing in this slice.
window.VIGIA_SUPPORT = Object.freeze({
  enabled: false,
  provider: 'wandora',
  assistant: 'ana',
  context: Object.freeze({
    product: 'vigia',
    channel: 'website'
  })
});

const root=document.documentElement;
const saved=localStorage.getItem('vigia-theme');
if(saved==='light'||saved==='dark') root.dataset.theme=saved;
else if(window.matchMedia&&window.matchMedia('(prefers-color-scheme: light)').matches) root.dataset.theme='light';

const themeToggle=document.querySelector('.theme-toggle');
const syncThemeToggle=()=>{
  themeToggle?.setAttribute('aria-pressed',String(root.dataset.theme==='light'));
};
syncThemeToggle();
themeToggle?.addEventListener('click',()=>{
  root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';
  localStorage.setItem('vigia-theme',root.dataset.theme);
  syncThemeToggle();
});

const menu=document.querySelector('.menu-toggle');
const links=document.querySelector('.nav-links');
const closeMenu=()=>{
  links?.classList.remove('open');
  menu?.setAttribute('aria-expanded','false');
};
menu?.setAttribute('aria-expanded','false');
menu?.addEventListener('click',()=>{
  const open=links?.classList.toggle('open');
  menu.setAttribute('aria-expanded',String(Boolean(open)));
});
links?.querySelectorAll('a').forEach((link)=>link.addEventListener('click',closeMenu));
document.addEventListener('keydown',(event)=>{
  if(event.key==='Escape') closeMenu();
});

const prefersReducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

const motionState = {
  hero: false,
  produto: false,
  conteudo: false,
  integracoes: false,
  casos: false,
};

const rafCounter = (element, end, formatter, duration = 1050) => {
  if (!element) return;
  if (prefersReducedMotion) {
    element.textContent = formatter(end);
    return;
  }

  const startedAt = performance.now();
  const tick = (now) => {
    const progress = Math.min(1, (now - startedAt) / duration);
    const eased = 1 - Math.pow(1 - progress, 3);
    element.textContent = formatter(end * eased);
    if (progress < 1) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

const animateHeroDashboard = () => {
  if (motionState.hero) return;
  motionState.hero = true;

  const dashboard = document.querySelector('.dashboard-shell');
  if (!dashboard) return;
  dashboard.classList.add('is-awake');

  const kpis = dashboard.querySelectorAll('.kpis strong');
  rafCounter(kpis[0], 12432, (value) => Math.round(value).toLocaleString('pt-BR'));
  rafCounter(kpis[1], 78, (value) => `${Math.round(value)}%`, 900);
  rafCounter(
    kpis[2],
    892,
    (value) => `R$ ${Math.round(value).toLocaleString('pt-BR')}`,
    1200,
  );
  rafCounter(kpis[3], 3, (value) => String(Math.round(value)), 760);

  const lines = dashboard.querySelectorAll('.chart-card .line');
  lines.forEach((line, index) => {
    if (!(line instanceof SVGPathElement)) return;
    const length = line.getTotalLength();
    line.style.strokeDasharray = String(length);
    line.style.strokeDashoffset = prefersReducedMotion ? '0' : String(length);
    line.style.transition = prefersReducedMotion
      ? 'none'
      : `stroke-dashoffset 1.15s cubic-bezier(.2,.8,.2,1) ${220 + index * 180}ms`;
    requestAnimationFrame(() => {
      line.style.strokeDashoffset = '0';
    });
  });

  const result = dashboard.querySelector('.result-panel');
  if (result) {
    result.classList.add('is-revealed');
    rafCounter(result.querySelector('strong'), 324, (value) => String(Math.round(value)), 1100);
  }
};

const playComparison = () => {
  if (motionState.produto) return;
  motionState.produto = true;

  const section = document.querySelector('#produto');
  const pre = section?.querySelector('.log-card pre');
  const outcome = section?.querySelector('.outcome-card');
  const arrow = section?.querySelector('.arrow');
  if (!section || !pre || !outcome) return;

  section.classList.add('story-running');
  outcome.querySelectorAll('dt, dd').forEach((item, index) => {
    item.style.transitionDelay = `${index * 70}ms`;
  });
  const fullText = pre.textContent ?? '';

  if (!prefersReducedMotion) {
    pre.textContent = '';
    let index = 0;
    const timer = window.setInterval(() => {
      index = Math.min(fullText.length, index + 4);
      pre.textContent = fullText.slice(0, index);
      if (index >= fullText.length) {
        window.clearInterval(timer);
        arrow?.classList.add('is-active');
        window.setTimeout(() => outcome.classList.add('is-revealed'), 220);
      }
    }, 22);
  } else {
    arrow?.classList.add('is-active');
    outcome.classList.add('is-revealed');
  }
};

const playTimeline = () => {
  if (motionState.conteudo) return;
  motionState.conteudo = true;

  const section = document.querySelector('#conteudo');
  const items = [...(section?.querySelectorAll('.timeline > div') ?? [])];
  const result = section?.querySelector('.result-card');
  const arrow = section?.querySelector('.big-arrow');
  if (!section || items.length === 0) return;

  if (prefersReducedMotion) {
    items.forEach((item) => item.classList.add('is-complete'));
    arrow?.classList.add('is-active');
    result?.classList.add('is-revealed');
    return;
  }

  items.forEach((item, index) => {
    window.setTimeout(() => {
      items[index - 1]?.classList.remove('is-current');
      items[index - 1]?.classList.add('is-complete');
      item.classList.add('is-current');

      if (index === items.length - 1) {
        window.setTimeout(() => {
          item.classList.remove('is-current');
          item.classList.add('is-complete');
          arrow?.classList.add('is-active');
          result?.classList.add('is-revealed');
        }, 420);
      }
    }, index * 430);
  });
};

const playSteps = () => {
  if (motionState.integracoes) return;
  motionState.integracoes = true;

  const steps = [...document.querySelectorAll('#integracoes .steps > div')];
  steps.forEach((step, index) => {
    window.setTimeout(() => step.classList.add('is-active'), prefersReducedMotion ? 0 : index * 260);
  });
};

const prepareUseCases = () => {
  if (motionState.casos) return;
  motionState.casos = true;

  const examples = [
    'Exemplo visual · 78% resolvidos',
    'Exemplo visual · 42 oportunidades',
    'Exemplo visual · 18 concluídos',
    'Exemplo visual · 3 falhas críticas',
  ];

  document.querySelectorAll('#casos .usecase-grid article').forEach((card, index) => {
    if (card.querySelector('.demo-pill')) return;
    const pill = document.createElement('small');
    pill.className = 'demo-pill';
    pill.textContent = examples[index] ?? 'Exemplo visual';
    card.appendChild(pill);
    card.tabIndex = 0;
    card.setAttribute('role', 'button');
    card.setAttribute('aria-label', `${card.querySelector('h3')?.textContent ?? 'Caso de uso'} — mostrar exemplo demonstrativo`);
    const toggle = () => card.classList.toggle('is-expanded');
    card.addEventListener('click', toggle);
    card.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        toggle();
      }
    });
  });
};

if (!prefersReducedMotion) document.documentElement.classList.add('motion-ready');

const observeOnce = (selector, callback, threshold = 0.28) => {
  const element = document.querySelector(selector);
  if (!element) return;
  if (!('IntersectionObserver' in window)) {
    callback();
    return;
  }
  const observer = new IntersectionObserver(
    (entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      callback();
    },
    { threshold },
  );
  observer.observe(element);
};

observeOnce('#produto', playComparison);
observeOnce('#conteudo', playTimeline);
observeOnce('#integracoes', playSteps);
observeOnce('#casos', prepareUseCases);
observeOnce('#comecar', () => document.querySelector('#comecar')?.classList.add('is-active'), 0.35);

const navLinks = [...document.querySelectorAll('.nav-links a[href^="#"]')];
const navSections = navLinks
  .map((link) => document.querySelector(link.getAttribute('href')))
  .filter(Boolean);

if ('IntersectionObserver' in window && navSections.length > 0) {
  const navObserver = new IntersectionObserver(
    (entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
      if (!visible?.target?.id) return;
      navLinks.forEach((link) => {
        link.classList.toggle('is-active', link.getAttribute('href') === `#${visible.target.id}`);
      });
    },
    { rootMargin: '-22% 0px -58% 0px', threshold: [0.1, 0.35, 0.65] },
  );
  navSections.forEach((section) => navObserver.observe(section));
}


const siteHeader=document.querySelector('.site-header');
const scrollProgress=document.querySelector('.scroll-progress span');
let scrollFrame=0;

const syncScrollChrome=()=>{
  scrollFrame=0;
  const maxScroll=Math.max(1,document.documentElement.scrollHeight-window.innerHeight);
  const progress=Math.min(1,Math.max(0,window.scrollY/maxScroll));
  if(scrollProgress instanceof HTMLElement){
    scrollProgress.style.transform=`scaleX(${progress})`;
  }
  siteHeader?.classList.toggle('is-scrolled',window.scrollY>10);
};

const requestScrollChrome=()=>{
  if(scrollFrame) return;
  scrollFrame=requestAnimationFrame(syncScrollChrome);
};

syncScrollChrome();
window.addEventListener('scroll',requestScrollChrome,{passive:true});
window.addEventListener('resize',requestScrollChrome,{passive:true});

const revealTargets=[
  ...document.querySelectorAll('.motion-section .eyebrow, .motion-section h2, .motion-section .section-copy'),
  ...document.querySelectorAll('.final-cta .hero-actions')
];

revealTargets.forEach((element)=>element.classList.add('reveal-target'));

if(prefersReducedMotion || !('IntersectionObserver' in window)){
  revealTargets.forEach((element)=>element.classList.add('is-visible'));
}else{
  const revealObserver=new IntersectionObserver((entries)=>{
    entries.forEach((entry)=>{
      if(!entry.isIntersecting) return;
      entry.target.classList.add('is-visible');
      revealObserver.unobserve(entry.target);
    });
  },{threshold:.22,rootMargin:'0px 0px -8% 0px'});
  revealTargets.forEach((element)=>revealObserver.observe(element));
}

const heroStage=document.querySelector('.hero.hero-reference');
const finePointer=window.matchMedia?.('(hover: hover) and (pointer: fine)').matches ?? false;

if(heroStage instanceof HTMLElement && finePointer && !prefersReducedMotion){
  const resetHeroTilt=()=>{
    heroStage.style.setProperty('--tilt-x','0deg');
    heroStage.style.setProperty('--tilt-y','0deg');
    heroStage.style.setProperty('--office-x','0px');
    heroStage.style.setProperty('--office-y','0px');
  };

  heroStage.addEventListener('pointermove',(event)=>{
    const bounds=heroStage.getBoundingClientRect();
    const x=(event.clientX-bounds.left)/bounds.width-.5;
    const y=(event.clientY-bounds.top)/bounds.height-.5;
    heroStage.style.setProperty('--tilt-x',`${(x*2.8).toFixed(2)}deg`);
    heroStage.style.setProperty('--tilt-y',`${(-y*2.2).toFixed(2)}deg`);
    heroStage.style.setProperty('--office-x',`${(-x*7).toFixed(1)}px`);
    heroStage.style.setProperty('--office-y',`${(-y*5).toFixed(1)}px`);
  });
  heroStage.addEventListener('pointerleave',resetHeroTilt);
}
