/**
 * Comportamentos do site original (menu grimorio, busca/filtro de episodios, leitor, progresso de
 * leitura, cronologia, mapa de relacoes, animacoes de entrada).
 * Porte fiel do JavaScript original para TypeScript: mesma logica, mesmos ids/classes.
 * As funcoes chamadas por handlers inline (onclick="openEp('ep1')") ficam expostas em `window`.
 */
import type { RelMapData } from '@/lib/types';

type Cleanup = () => void;
const q = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) => root.querySelector<T>(sel);
const qa = <T extends Element = HTMLElement>(sel: string, root: ParentNode = document) =>
  Array.from(root.querySelectorAll<T>(sel));
const byId = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T | null;

export function initBehaviors(page: 'home' | 'hierarquia', relMapData: RelMapData): Cleanup {
  const cleanups: Cleanup[] = [];
  const on = (
    target: Document | Window, type: string, fn: EventListenerOrEventListenerObject, opts?: AddEventListenerOptions,
  ) => {
    target.addEventListener(type, fn, opts);
    cleanups.push(() => target.removeEventListener(type, fn, opts));
  };
  const w = window as unknown as Record<string, unknown>;
  const expose = (name: string, fn: (...args: any[]) => unknown) => {
    w[name] = fn;
    cleanups.push(() => { delete w[name]; });
  };

  // ---- Parallax das aureolas de fundo
  const bgItems = qa('.bg-aureola-item');
  on(window, 'scroll', () => {
    const scrollY = window.scrollY;
    bgItems.forEach((item, i) => {
      const speed = i % 3 === 0 ? 0.08 : i % 3 === 1 ? 0.12 : 0.05;
      const dir = i % 2 === 0 ? 1 : -1;
      item.style.transform = `translateY(${scrollY * speed * dir}px) rotate(${scrollY * 0.01 * dir}deg)`;
    });
  });

  // ---- Animacao de clique na navegacao
  qa<HTMLAnchorElement>('.nav-links a, .nav-aureolas a').forEach((link) => {
    const fn = function (this: HTMLElement) {
      this.classList.remove('clicked');
      void this.offsetWidth; // reflow
      this.classList.add('clicked');
      setTimeout(() => this.classList.remove('clicked'), 500);
    };
    link.addEventListener('click', fn);
    cleanups.push(() => link.removeEventListener('click', fn));
  });

  // ---- Grimorio
  const closeGrimoire = () => byId('grimoireMenu')?.classList.remove('open');
  expose('toggleGrimoire', (e?: Event) => {
    if (e) e.stopPropagation();
    byId('grimoireMenu')?.classList.toggle('open');
  });
  expose('closeGrimoire', closeGrimoire);
  on(document, 'click', ((e: MouseEvent) => {
    const menu = byId('grimoireMenu');
    const btn = byId('floatingBookBtn');
    if (menu && menu.classList.contains('open') && !menu.contains(e.target as Node) && !btn?.contains(e.target as Node)) {
      closeGrimoire();
    }
  }) as EventListener);
  on(window, 'scroll', () => {
    const menu = byId('grimoireMenu');
    if (menu && menu.classList.contains('open')) closeGrimoire();
  }, { passive: true });

  // ---- Fichas de personagem
  expose('toggleChar', (card: HTMLElement) => {
    const body = card.querySelector('.char-body') as HTMLElement;
    const toggle = card.querySelector('.char-toggle') as HTMLElement;
    const isOpen = body.classList.contains('open');
    body.classList.toggle('open');
    toggle.innerHTML = isOpen ? '▸ &nbsp; Ver ficha' : '▾ &nbsp; Fechar ficha';
  });

  // ---- Decodificador arcano
  const ARCANE_RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ⟁⟟⏃⌰⟢⟣⟤⟥';
  const arcaneTimers: Record<string, number> = {};
  expose('toggleArcane', (blockId: string, btn: HTMLElement) => {
    const block = byId(blockId)!;
    if (block.classList.contains('is-visible')) {
      block.classList.remove('is-visible');
      btn.classList.remove('is-open');
      if (arcaneTimers[blockId]) { clearInterval(arcaneTimers[blockId]); delete arcaneTimers[blockId]; }
      return;
    }
    block.classList.add('is-visible');
    btn.classList.add('is-open');
    const textEl = byId(blockId + '-text')!;
    if (textEl.classList.contains('decoded')) return;
    const real = textEl.getAttribute('data-real') ?? '';
    const len = real.length;
    let frame = 0;
    const totalFrames = 34;
    arcaneTimers[blockId] = window.setInterval(() => {
      frame++;
      let out = '';
      for (let i = 0; i < len; i++) {
        const ch = real[i];
        if (ch === ' ') { out += ' '; continue; }
        const revealAt = (i / len) * totalFrames;
        out += frame >= revealAt + 6 ? ch : ARCANE_RUNES[Math.floor(Math.random() * ARCANE_RUNES.length)];
      }
      textEl.textContent = out;
      if (frame >= totalFrames + 8) {
        clearInterval(arcaneTimers[blockId]);
        delete arcaneTimers[blockId];
        textEl.textContent = real;
        textEl.classList.add('decoded');
      }
    }, 45);
  });
  cleanups.push(() => Object.values(arcaneTimers).forEach((t) => clearInterval(t)));

  // ---- Busca e filtro de episodios
  let currentSeason = 1;
  let currentSpinoff = 'shadow';
  let episodeSearchQuery = '';
  const normalizeText = (s: string) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  const episodeMatchesSearch = (item: HTMLElement) => {
    if (!episodeSearchQuery) return true;
    const title = item.querySelector('.ep-title');
    const sub = item.querySelector('.ep-sub');
    const text = normalizeText((title ? title.textContent : '') + ' ' + (sub ? sub.textContent : ''));
    return text.includes(normalizeText(episodeSearchQuery));
  };

  const applySeasonFilter = () => {
    const items = qa('#ep-list .ep-item[data-season]');
    let visibleCount = 0;
    items.forEach((item) => {
      const matches = parseInt(item.getAttribute('data-season') ?? '0') === currentSeason && episodeMatchesSearch(item);
      item.style.display = matches ? '' : 'none';
      if (matches) visibleCount++;
    });
    const label = byId('season-label'); if (label) label.textContent = 'TEMPORADA ' + currentSeason;
    const count = byId('season-count'); if (count) count.textContent = String(visibleCount);
    const emptyMsg = byId('season-empty');
    if (emptyMsg) {
      emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
      emptyMsg.textContent = episodeSearchQuery
        ? '// Nenhum episódio encontrado para "' + episodeSearchQuery + '".'
        : '// Temporada ' + currentSeason + ' ainda não começou. Em breve.';
    }
  };
  const applySpinoffFilter = () => {
    const items = qa('.spinoff-ep-item');
    let visibleCount = 0;
    items.forEach((item) => {
      const matches = item.getAttribute('data-spinoff') === currentSpinoff && episodeMatchesSearch(item);
      item.style.display = matches ? '' : 'none';
      if (matches) visibleCount++;
    });
    const emptyMsg = byId('spinoff-empty');
    if (emptyMsg) {
      emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
      emptyMsg.textContent = episodeSearchQuery
        ? '// Nenhum episódio encontrado para "' + episodeSearchQuery + '".'
        : '// Nenhum episódio publicado ainda. Em breve.';
    }
  };
  const switchSeason = (n: number) => { currentSeason = n; applySeasonFilter(); };
  expose('switchSeason', switchSeason);
  expose('toggleSeasonDropdown', () => byId('season-dropdown')?.classList.toggle('open'));
  const selectSeason = (n: number, btn: HTMLElement) => {
    qa('.season-dropdown-item').forEach((i) => i.classList.remove('active'));
    btn.classList.add('active');
    const label = byId('season-dropdown-label'); if (label) label.textContent = btn.textContent;
    byId('season-dropdown')?.classList.remove('open');
    switchSeason(n);
  };
  expose('selectSeason', selectSeason);
  on(document, 'click', ((e: MouseEvent) => {
    const dropdown = byId('season-dropdown');
    if (dropdown && !dropdown.contains(e.target as Node)) dropdown.classList.remove('open');
  }) as EventListener);

  const showSeasonView = () => {
    byId('season-view')?.classList.add('active');
    byId('spinoff-view')?.classList.remove('active');
    const t = byId('spinoff-toggle-btn');
    if (t) { t.classList.remove('active'); t.textContent = 'Spin offs'; }
    applySeasonFilter();
  };
  const showSpinoffView = () => {
    byId('season-view')?.classList.remove('active');
    byId('spinoff-view')?.classList.add('active');
    const t = byId('spinoff-toggle-btn');
    if (t) { t.classList.add('active'); t.textContent = 'Temporadas'; }
    applySpinoffFilter();
  };
  expose('showSeasonView', showSeasonView);
  expose('showSpinoffView', showSpinoffView);
  expose('toggleEpisodeView', () => {
    if (byId('spinoff-view')?.classList.contains('active')) showSeasonView(); else showSpinoffView();
  });
  const selectSpinoff = (id: string, btn: HTMLElement) => {
    qa('.spinoff-tab').forEach((t) => t.classList.remove('active'));
    btn.classList.add('active');
    currentSpinoff = id;
    applySpinoffFilter();
  };
  expose('selectSpinoff', selectSpinoff);
  const filterEpisodes = (query: string) => {
    episodeSearchQuery = query;
    const clear = byId('ep-search-clear'); if (clear) clear.style.display = query ? 'block' : 'none';
    if (byId('spinoff-view')?.classList.contains('active')) applySpinoffFilter(); else applySeasonFilter();
  };
  expose('filterEpisodes', filterEpisodes);
  expose('clearEpisodeSearch', () => {
    const input = byId<HTMLInputElement>('ep-search-input');
    if (!input) return;
    input.value = '';
    filterEpisodes('');
    input.focus();
  });

  // ---- Progresso de leitura
  const getReadEpisodes = (): string[] => {
    try { return JSON.parse(localStorage.getItem('readEpisodes') || '[]'); } catch { return []; }
  };
  const applyReadBadge = (id: string) => {
    qa('.ep-item[data-onclick*="\'' + id + '\'"]').forEach((item) => {
      item.classList.add('is-read');
      if (!item.querySelector('.ep-read-badge')) {
        const badge = document.createElement('span');
        badge.className = 'ep-read-badge';
        badge.textContent = '✓ LIDO';
        const arrow = item.querySelector('.ep-arrow');
        if (arrow) item.insertBefore(badge, arrow); else item.appendChild(badge);
      }
    });
  };
  const markEpisodeRead = (id: string) => {
    const read = new Set(getReadEpisodes());
    if (!read.has(id)) {
      read.add(id);
      localStorage.setItem('readEpisodes', JSON.stringify([...read]));
    }
    applyReadBadge(id);
  };

  // ---- Leitor
  const openEp = (id: string) => {
    window.dispatchEvent(new CustomEvent('ep:open', { detail: id })); // modo protegido: baixa o texto agora
    qa('.ep-reader').forEach((r) => r.classList.remove('active'));
    const el = byId(id)!;
    el.classList.add('active');
    setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    markEpisodeRead(id);
  };
  expose('openEp', openEp);
  expose('closeEp', (id: string) => byId(id)?.classList.remove('active'));

  // ---- Compartilhar
  const shareEpisode = (id: string, title: string, btn: HTMLElement) => {
    const url = location.origin + location.pathname + '#' + id;
    if (navigator.share) {
      navigator.share({ title: title || document.title, url }).catch(() => {});
      return;
    }
    const done = () => {
      if (!btn) return;
      const original = btn.textContent;
      btn.textContent = '✓ Copiado!';
      setTimeout(() => { btn.textContent = original; }, 1800);
    };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(done).catch(() => window.prompt('Copie o link do episódio:', url));
    } else {
      window.prompt('Copie o link do episódio:', url);
    }
  };
  const injectShareButtons = () => {
    qa('.ep-reader').forEach((reader) => {
      const closeBtn = reader.querySelector('.close-reader');
      if (!closeBtn || reader.querySelector('.ep-share-btn')) return;
      const titleEl = reader.querySelector('.ep-reader-title');
      const title = titleEl ? titleEl.textContent ?? '' : document.title;
      const shareBtn = document.createElement('button');
      shareBtn.className = 'ep-share-btn';
      shareBtn.type = 'button';
      shareBtn.textContent = '↗ Compartilhar';
      shareBtn.style.position = 'relative';
      shareBtn.style.zIndex = '2';
      shareBtn.onclick = () => shareEpisode(reader.id, title, shareBtn);
      closeBtn.parentNode!.insertBefore(shareBtn, closeBtn);
    });
  };

  const openEpisodeFromHash = () => {
    const id = location.hash.replace('#', '');
    if (!id) return;
    const el = byId(id);
    if (!el || !el.classList.contains('ep-reader')) return;
    if (id.startsWith('spinoff-')) {
      const itemSel = '.spinoff-ep-item[data-onclick*="\'' + id + '\'"]';
      const spinoffId = el.closest('.spinoff-ep-item')?.getAttribute('data-spinoff') ?? q(itemSel)?.getAttribute('data-spinoff');
      showSpinoffView();
      if (spinoffId) {
        const tab = q('.spinoff-tab[data-onclick*="\'' + spinoffId + '\'"]');
        if (tab) selectSpinoff(spinoffId, tab);
      }
    } else {
      const seasonItem = q('.ep-item[data-season][data-onclick*="\'' + id + '\'"]');
      if (seasonItem) {
        const season = parseInt(seasonItem.getAttribute('data-season') ?? '0');
        const seasonBtn = q('.season-dropdown-item[data-onclick*="' + season + ',"]');
        if (seasonBtn) selectSeason(season, seasonBtn);
      }
    }
    openEp(id);
  };

  // ---- Animacao de entrada ao rolar
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        (e.target as HTMLElement).style.opacity = '1';
        (e.target as HTMLElement).style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });
  qa('.entity-card, .cosmo-layer, .ep-item').forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(20px)';
    el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
    observer.observe(el);
  });
  cleanups.push(() => observer.disconnect());

  // ---- Cronologia (gerada a partir dos episodios do banco)
  const buildTimeline = () => {
    const wrap = byId('timeline-wrap');
    if (!wrap) return;
    wrap.innerHTML = '';
    const eps = qa('.ep-item[data-season]');
    let currentSeasonLabel: string | null = null;
    eps.forEach((ep) => {
      const season = ep.getAttribute('data-season') ?? '';
      const num = ep.querySelector('.ep-num')?.textContent ?? '';
      const title = ep.querySelector('.ep-title')?.textContent ?? '';
      const match = (ep.getAttribute('data-onclick') || '').match(/openEp\('([^']+)'\)/);
      const epId = match ? match[1] : null;
      if (season !== currentSeasonLabel) {
        currentSeasonLabel = season;
        const label = document.createElement('div');
        label.className = 'timeline-season-label';
        label.textContent = '// TEMPORADA ' + season;
        wrap.appendChild(label);
      }
      const item = document.createElement('div');
      item.className = 'timeline-item';
      item.innerHTML = '<div class="timeline-num">' + num + '</div><div class="timeline-title">' + title + '</div>';
      if (epId) {
        item.style.cursor = 'pointer';
        item.addEventListener('click', () => {
          const btn = q('.season-dropdown-item[data-onclick*="selectSeason(' + season + '"]');
          if (btn) selectSeason(parseInt(season), btn);
          showSeasonView();
          openEp(epId);
          byId('episodios')?.scrollIntoView({ behavior: 'smooth' });
        });
      }
      wrap.appendChild(item);
    });
    const tObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add('visible'); tObserver.unobserve(entry.target); }
      });
    }, { threshold: 0.15 });
    qa('.timeline-item', wrap).forEach((el, i) => {
      el.style.transitionDelay = (i % 8) * 0.04 + 's';
      tObserver.observe(el);
    });
    cleanups.push(() => tObserver.disconnect());
  };

  // ---- Mapa de relacoes (dados vem do banco: RelNode / RelEdge)
  const selectRelNode = (id: string) => {
    const info = byId('relmap-info');
    if (!info) return;
    qa<SVGElement>('.relmap-edge').forEach((edge) => {
      const match = edge.dataset.from === id || edge.dataset.to === id;
      edge.classList.toggle('highlight', match);
    });
    const related = relMapData.edges.filter((e) => e.from === id || e.to === id);
    const nodeName = relMapData.nodes.find((n) => n.id === id)!.name;
    if (related.length === 0) {
      info.innerHTML = '<strong>' + nodeName + '</strong><br>Nenhuma conexão confirmada ainda.';
      return;
    }
    info.innerHTML = related.map((e) => {
      const otherId = e.from === id ? e.to : e.from;
      const otherName = relMapData.nodes.find((n) => n.id === otherId)!.name;
      return '<strong>' + nodeName + ' ↔ ' + otherName + '</strong><br>' + e.label;
    }).join('<br><br>');
  };
  const buildRelMap = () => {
    const edgesG = byId('relmap-edges') as unknown as SVGGElement | null;
    const nodesG = byId('relmap-nodes') as unknown as SVGGElement | null;
    if (!edgesG || !nodesG) return;
    edgesG.innerHTML = '';
    nodesG.innerHTML = '';
    const svgNS = 'http://www.w3.org/2000/svg';
    const nodeById: Record<string, RelMapData['nodes'][number]> = {};
    relMapData.nodes.forEach((n) => (nodeById[n.id] = n));
    relMapData.edges.forEach((e) => {
      const a = nodeById[e.from], b = nodeById[e.to];
      const line = document.createElementNS(svgNS, 'line');
      line.setAttribute('x1', String(a.x)); line.setAttribute('y1', String(a.y));
      line.setAttribute('x2', String(b.x)); line.setAttribute('y2', String(b.y));
      line.classList.add('relmap-edge');
      line.dataset.from = e.from; line.dataset.to = e.to;
      edgesG.appendChild(line);
    });
    relMapData.nodes.forEach((n) => {
      const g = document.createElementNS(svgNS, 'g');
      g.classList.add('relmap-node');
      if (n.hub) g.classList.add('hub');
      g.dataset.id = n.id;
      const circle = document.createElementNS(svgNS, 'circle');
      circle.setAttribute('cx', String(n.x)); circle.setAttribute('cy', String(n.y));
      circle.setAttribute('r', String(n.hub ? 30 : 24));
      g.appendChild(circle);
      const words = n.name.split(' ');
      words.forEach((word, i) => {
        const text = document.createElementNS(svgNS, 'text');
        text.setAttribute('x', String(n.x));
        text.setAttribute('y', String(n.y + (i - (words.length - 1) / 2) * 11 + 4));
        text.textContent = word;
        g.appendChild(text);
      });
      g.addEventListener('click', () => selectRelNode(n.id));
      nodesG.appendChild(g);
    });
    const rObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          qa('.relmap-node').forEach((el, i) => setTimeout(() => el.classList.add('visible'), i * 70));
          rObserver.disconnect();
        }
      });
    }, { threshold: 0.2 });
    const svgEl = byId('relmap-svg');
    if (svgEl) rObserver.observe(svgEl as unknown as Element);
    cleanups.push(() => rObserver.disconnect());
  };

  // ---- Equivalente ao DOMContentLoaded do original
  if (page === 'home') {
    getReadEpisodes().forEach((id) => applyReadBadge(id));
    injectShareButtons();
    openEpisodeFromHash();
    switchSeason(1);
    buildTimeline();
    buildRelMap();
  } else {
    getReadEpisodes().forEach((id) => applyReadBadge(id));
  }

  return () => cleanups.splice(0).reverse().forEach((fn) => fn());
}
