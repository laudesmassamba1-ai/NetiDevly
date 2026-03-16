// ================================================================
//  DEVNET — app.js
//  Utilitaires partagés + micro-interactions + animations
//  Importer dans chaque page :
//  import { toast, esc, timeAgo, resize, initApp } from './js/app.js';
// ================================================================

// ── Toast ────────────────────────────────────────────────────────
export function toast(msg, type = 'ok', duration = 3000) {
  let el = document.getElementById('toast');
  if (!el) {
    el = document.createElement('div');
    el.id = 'toast';
    document.body.appendChild(el);
  }
  clearTimeout(el._t);
  el.textContent = msg;
  el.className = `toast ${type} show`;
  el._t = setTimeout(() => el.classList.remove('show'), duration);
}

// ── Escape HTML ──────────────────────────────────────────────────
export function esc(s) {
  return (s || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br/>');
}

// ── Temps relatif ────────────────────────────────────────────────
export function timeAgo(date) {
  const d = date instanceof Date ? date : new Date(date);
  const s = Math.floor((Date.now() - d) / 1000);
  if (s < 5)     return 'maintenant';
  if (s < 60)    return `${s}s`;
  if (s < 3600)  return `${Math.floor(s / 60)}min`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  if (s < 604800) return `${Math.floor(s / 86400)}j`;
  return d.toLocaleDateString('fr', { day: 'numeric', month: 'short' });
}

// ── Auto-resize textarea ─────────────────────────────────────────
export function resize(el, max = 120) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, max) + 'px';
}

// ── Vibration tactile (si supporté) ─────────────────────────────
export function haptic(pattern = [8]) {
  if (navigator.vibrate) navigator.vibrate(pattern);
}

// ── Spinner HTML ─────────────────────────────────────────────────
export function spinnerHTML() {
  return '<span class="spin"></span>';
}

// ── Chargement d'un bouton ───────────────────────────────────────
export function btnLoad(btn) {
  btn._label = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = spinnerHTML();
}
export function btnReset(btn) {
  btn.disabled = false;
  btn.innerHTML = btn._label || btn.textContent;
}

// ── Press effect (scale au touch) ───────────────────────────────
function initPressEffect() {
  document.addEventListener('pointerdown', e => {
    const el = e.target.closest('.btn, .row, .post, .nav-link, .compose-btn, .icon-btn, .post-btn, .send-btn');
    if (!el) return;
    el.style.transition = 'transform 0.08s ease';
    el.style.transform  = 'scale(0.97)';
  }, { passive: true });

  document.addEventListener('pointerup', e => {
    const el = e.target.closest('.btn, .row, .post, .nav-link, .compose-btn, .icon-btn, .post-btn, .send-btn');
    if (!el) return;
    el.style.transform = '';
    setTimeout(() => { el.style.transition = ''; }, 200);
  }, { passive: true });

  document.addEventListener('pointercancel', e => {
    const el = e.target.closest('.btn, .row, .post, .nav-link, .compose-btn, .icon-btn, .post-btn, .send-btn');
    if (!el) return;
    el.style.transform = '';
    setTimeout(() => { el.style.transition = ''; }, 200);
  }, { passive: true });
}

// ── Reveal au scroll (IntersectionObserver) ──────────────────────
function initScrollReveal() {
  const observer = new IntersectionObserver(
    entries => entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.style.opacity  = '1';
        e.target.style.transform = 'translateY(0)';
        observer.unobserve(e.target);
      }
    }),
    { threshold: 0.08 }
  );

  // On observe les posts qui arrivent dynamiquement
  const mo = new MutationObserver(mutations => {
    mutations.forEach(m => {
      m.addedNodes.forEach(node => {
        if (node.nodeType !== 1) return;
        if (node.classList?.contains('post') || node.classList?.contains('row')) {
          // Le CSS .post a déjà l'animation slideUp — on observe les cards statiques
          observer.observe(node);
        }
      });
    });
  });
  const feed = document.getElementById('feed') || document.getElementById('feedContainer');
  if (feed) mo.observe(feed, { childList: true });
}

// ── Transition de page (fade out au clic sur les liens) ──────────
function initPageTransitions() {
  // Ajouter un overlay de transition
  const overlay = document.createElement('div');
  overlay.id = 'pageTransition';
  overlay.style.cssText = `
    position:fixed; inset:0; background:var(--bg); z-index:9999;
    pointer-events:none; opacity:0;
    transition:opacity 0.18s ease;
  `;
  document.body.appendChild(overlay);

  // Fade in à l'arrivée sur la page
  requestAnimationFrame(() => {
    overlay.style.opacity = '0';
  });

  // Fade out avant de quitter
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;

    const href = link.getAttribute('href');
    // Ignorer les liens externes, ancres, javascript:
    if (!href || href.startsWith('#') || href.startsWith('http') || href.startsWith('javascript')) return;
    // Ignorer si même page
    if (href === window.location.pathname.split('/').pop()) return;

    e.preventDefault();
    overlay.style.pointerEvents = 'all';
    overlay.style.opacity = '1';

    setTimeout(() => {
      window.location.href = href;
    }, 160);
  });
}

// ── Focus visible amélioré ────────────────────────────────────────
function initFocusStyle() {
  document.addEventListener('keydown', () => document.body.classList.add('kb-nav'));
  document.addEventListener('pointerdown', () => document.body.classList.remove('kb-nav'));
}

// ── Sheets : fermer en swipant vers le bas ────────────────────────
function initSwipeToClose() {
  document.querySelectorAll('.overlay').forEach(overlay => {
    const sheet = overlay.querySelector('.sheet');
    if (!sheet) return;

    let startY = 0, currentY = 0, dragging = false;

    sheet.addEventListener('touchstart', e => {
      startY = e.touches[0].clientY;
      dragging = true;
    }, { passive: true });

    sheet.addEventListener('touchmove', e => {
      if (!dragging) return;
      currentY = e.touches[0].clientY;
      const dy = currentY - startY;
      if (dy > 0) {
        sheet.style.transform = `translateY(${dy}px)`;
        sheet.style.transition = 'none';
      }
    }, { passive: true });

    sheet.addEventListener('touchend', () => {
      dragging = false;
      const dy = currentY - startY;
      sheet.style.transition = '';

      if (dy > 100) {
        // Fermer la sheet
        overlay.classList.remove('open');
        sheet.style.transform = '';
      } else {
        // Revenir à la position initiale
        sheet.style.transform = '';
      }
      startY = 0; currentY = 0;
    });
  });
}

// ── Active le bon lien de navigation ─────────────────────────────
function highlightNav() {
  const page = window.location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-link').forEach(link => {
    const href = link.getAttribute('href');
    link.classList.toggle('active', href === page);
  });
}

// ── Initialisation globale ────────────────────────────────────────
export function initApp() {
  initPressEffect();
  initScrollReveal();
  initPageTransitions();
  initFocusStyle();
  // Swipe to close : après que le DOM est chargé
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initSwipeToClose();
      highlightNav();
    });
  } else {
    initSwipeToClose();
    highlightNav();
  }
}

// ── CSS dynamique (focus keyboard) ───────────────────────────────
const style = document.createElement('style');
style.textContent = `
  body:not(.kb-nav) *:focus { outline: none !important; }
  body.kb-nav *:focus {
    outline: 2px solid rgba(202,255,51,0.6) !important;
    outline-offset: 2px !important;
  }
  #pageTransition { will-change: opacity; }
`;
document.head.appendChild(style);
