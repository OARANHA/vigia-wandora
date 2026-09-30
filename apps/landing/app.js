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

document.querySelector('.theme-toggle')?.addEventListener('click',()=>{
  root.dataset.theme=root.dataset.theme==='dark'?'light':'dark';
  localStorage.setItem('vigia-theme',root.dataset.theme);
});

const menu=document.querySelector('.menu-toggle');
const links=document.querySelector('.nav-links');
menu?.addEventListener('click',()=>{
  const open=links?.classList.toggle('open');
  menu.setAttribute('aria-expanded',String(Boolean(open)));
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
    892.17,
    (value) => `R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
    1200,
  );

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

  const result = dashboard.querySelector('.result-float');
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

observeOnce('.dashboard-shell', animateHeroDashboard, 0.2);
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
