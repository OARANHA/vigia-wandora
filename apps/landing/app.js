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
