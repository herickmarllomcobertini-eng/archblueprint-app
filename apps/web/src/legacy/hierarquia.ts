/** Ceu estrelado (canvas #stars) e indice lateral com destaque da secao atual: pagina Hierarquia. */
export function initHierarquiaEffects(): () => void {
  const cleanups: Array<() => void> = [];

  try {
    const c = document.createElement('canvas');
    c.id = 'stars';
    document.body.insertBefore(c, document.body.firstChild);
    const x = c.getContext('2d')!;
    let W = 0, H = 0;
    let S: Array<{ x: number; y: number; r: number; p: number; s: number }> = [];
    let L: Array<[number, number]> = [];
    let raf = 0;
    const calm = !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

    const init = () => {
      W = c.width = innerWidth; H = c.height = innerHeight;
      const n = Math.min(220, Math.round((W * H) / 9500));
      S = []; L = [];
      for (let i = 0; i < n; i++) S.push({ x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.2 + 0.25, p: Math.random() * 6.28, s: 0.4 + Math.random() * 1.1 });
      for (let a = 0; a < Math.min(70, n); a++)
        for (let b = a + 1; b < Math.min(70, n); b++) {
          const dx = S[a].x - S[b].x, dy = S[a].y - S[b].y;
          if (dx * dx + dy * dy < 9000 && L.length < 45) L.push([a, b]);
        }
    };
    const draw = (t: number) => {
      x.clearRect(0, 0, W, H);
      x.strokeStyle = 'rgba(141,162,232,.10)'; x.lineWidth = 0.6;
      L.forEach((l) => { x.beginPath(); x.moveTo(S[l[0]].x, S[l[0]].y); x.lineTo(S[l[1]].x, S[l[1]].y); x.stroke(); });
      S.forEach((s) => {
        const a = calm ? 0.6 : 0.35 + 0.45 * Math.sin((t / 1000) * s.s + s.p);
        x.fillStyle = 'rgba(222,230,255,' + a + ')';
        x.beginPath(); x.arc(s.x, s.y, s.r, 0, 6.283); x.fill();
      });
      if (!calm) raf = requestAnimationFrame(draw);
    };
    init();
    const onResize = () => { init(); if (calm) draw(0); };
    addEventListener('resize', onResize);
    raf = requestAnimationFrame(draw);
    cleanups.push(() => { cancelAnimationFrame(raf); removeEventListener('resize', onResize); c.remove(); });
  } catch { /* efeito decorativo */ }

  try {
    const spy = () => {
      const links = Array.from(document.querySelectorAll<HTMLAnchorElement>('.hier-toc a[href^="#"]'));
      const map = links
        .map((a) => ({ a, el: document.getElementById((a.getAttribute('href') ?? '').slice(1)) }))
        .filter((m) => m.el);
      let cur: (typeof map)[number] | null = null;
      map.forEach((m) => { if (m.el!.getBoundingClientRect().top <= 140) cur = m; });
      links.forEach((l) => l.classList.remove('active'));
      if (cur) (cur as (typeof map)[number]).a.classList.add('active');
    };
    addEventListener('scroll', spy, { passive: true });
    addEventListener('chunks:loaded', spy);
    spy();
    cleanups.push(() => { removeEventListener('scroll', spy); removeEventListener('chunks:loaded', spy); });
  } catch { /* efeito decorativo */ }

  return () => cleanups.forEach((fn) => fn());
}
