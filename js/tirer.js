// Tirer vers le bas pour recharger (application installée sur l'écran d'accueil).
// rafraichir() (facultatif) : met la page à jour sans tout recharger (pas d'écran vide).
export function tirerPourRecharger(rafraichir = null) {
  const installee = navigator.standalone || matchMedia('(display-mode: standalone)').matches;
  if (!installee || !('ontouchstart' in window)) return;
  const SEUIL = 80;
  const rond = document.createElement('div');
  rond.className = 'tirer-rond';
  rond.innerHTML = '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/></svg>';
  const style = document.createElement('style');
  style.textContent = `.tirer-rond{position:fixed;left:50%;top:calc(env(safe-area-inset-top) + 8px);width:38px;height:38px;margin-left:-19px;border-radius:50%;display:grid;place-items:center;background:#fff;color:#333;box-shadow:0 2px 10px rgba(0,0,0,.18);z-index:9999;opacity:0;transform:translateY(-60px);pointer-events:none}
  .tirer-rond.pret{color:#e4572e}.tirer-rond.tourne svg{animation:tirer-t .7s linear infinite}@keyframes tirer-t{to{transform:rotate(360deg)}}
  @media (prefers-color-scheme:dark){.tirer-rond{background:#2a2826;color:#eee}}`;
  document.head.append(style); document.body.append(rond);
  let debut = null; let dy = 0;
  const bloque = (cible) => {
    if (document.querySelector('#feuille:not([hidden]), dialog[open], .feuille.ouverte')) return true;
    for (let el = cible; el && el !== document.body; el = el.parentElement) {
      if (el.scrollTop > 0) return true;
      if (/^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName)) return true;
    }
    return false;
  };
  addEventListener('touchstart', (ev) => {
    debut = (scrollY <= 0 && ev.touches.length === 1 && !bloque(ev.target)) ? ev.touches[0].clientY : null; dy = 0;
  }, { passive: true });
  addEventListener('touchmove', (ev) => {
    if (debut == null) return;
    dy = ev.touches[0].clientY - debut;
    if (dy <= 0 || scrollY > 0) { rond.style.opacity = 0; rond.style.transform = 'translateY(-60px)'; return; }
    const d = Math.min(dy, SEUIL * 1.6) * 0.6;
    rond.style.transition = 'none';
    rond.style.opacity = Math.min(1, dy / SEUIL);
    rond.style.transform = `translateY(${d - 20}px) rotate(${dy * 2}deg)`;
    rond.classList.toggle('pret', dy >= SEUIL);
  }, { passive: true });
  addEventListener('touchend', () => {
    if (debut == null) return;
    debut = null;
    rond.style.transition = 'transform .2s, opacity .2s';
    if (dy >= SEUIL) {
      rond.classList.add('tourne'); rond.style.transform = 'translateY(30px)';
      if (!rafraichir) { setTimeout(() => location.reload(), 250); return; }
      const debutT = Date.now();
      Promise.resolve().then(rafraichir).catch(() => {}).then(() => {
        // Le rond tourne au moins un instant, puis repart en douceur.
        setTimeout(() => { rond.classList.remove('tourne'); rond.style.opacity = 0; rond.style.transform = 'translateY(-60px)'; }, Math.max(0, 450 - (Date.now() - debutT)));
      });
    } else { rond.style.opacity = 0; rond.style.transform = 'translateY(-60px)'; }
  }, { passive: true });
}
