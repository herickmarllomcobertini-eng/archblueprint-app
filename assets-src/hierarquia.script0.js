
    // Parallax background aureolas on scroll
    const bgItems = document.querySelectorAll('.bg-aureola-item');
    window.addEventListener('scroll', () => {
      const scrollY = window.scrollY;
      bgItems.forEach((item, i) => {
        const speed = (i % 3 === 0) ? 0.08 : (i % 3 === 1) ? 0.12 : 0.05;
        const dir = i % 2 === 0 ? 1 : -1;
        item.style.transform = `translateY(${scrollY * speed * dir}px) rotate(${scrollY * 0.01 * dir}deg)`;
      });
    });

    // Nav click animations
    document.querySelectorAll('.nav-links a, .nav-aureolas a').forEach(link => {
      link.addEventListener('click', function() {
        this.classList.remove('clicked');
        void this.offsetWidth; // reflow
        this.classList.add('clicked');
        setTimeout(() => this.classList.remove('clicked'), 500);
      });
    });

    function toggleGrimoire(e) {
      if (e) e.stopPropagation();
      document.getElementById('grimoireMenu').classList.toggle('open');
    }

    function closeGrimoire() {
      document.getElementById('grimoireMenu').classList.remove('open');
    }

    document.addEventListener('click', function(e) {
      const menu = document.getElementById('grimoireMenu');
      const btn = document.getElementById('floatingBookBtn');
      if (menu && menu.classList.contains('open') && !menu.contains(e.target) && !btn.contains(e.target)) {
        closeGrimoire();
      }
    });

    // Close the grimoire menu automatically when the page is scrolled
    window.addEventListener('scroll', function() {
      const menu = document.getElementById('grimoireMenu');
      if (menu && menu.classList.contains('open')) {
        closeGrimoire();
      }
    }, { passive: true });

    function toggleChar(card) {
      const body = card.querySelector('.char-body');
      const toggle = card.querySelector('.char-toggle');
      const isOpen = body.classList.contains('open');
      body.classList.toggle('open');
      toggle.innerHTML = isOpen ? '▸ &nbsp; Ver ficha' : '▾ &nbsp; Fechar ficha';
    }

    // ===== EPISODE SEARCH + SEASON/SPINOFF FILTER =====
    let currentSeason = 1;
    let currentSpinoff = 'shadow';
    let episodeSearchQuery = '';

    // ===== ARCANE DECODE ANIMATION =====
    const ARCANE_RUNES = 'ᚠᚢᚦᚨᚱᚲᚷᚹᚺᚾᛁᛃᛇᛈᛉᛊᛏᛒᛖᛗᛚᛜᛞᛟ⟁⟟⏃⌰⟢⟣⟤⟥';
    const arcaneTimers = {};

    function scrambleString(len) {
      let s = '';
      for (let i = 0; i < len; i++) {
        s += ARCANE_RUNES[Math.floor(Math.random() * ARCANE_RUNES.length)];
      }
      return s;
    }

    function toggleArcane(blockId, btn) {
      const block = document.getElementById(blockId);
      const isVisible = block.classList.contains('is-visible');

      if (isVisible) {
        block.classList.remove('is-visible');
        btn.classList.remove('is-open');
        if (arcaneTimers[blockId]) {
          clearInterval(arcaneTimers[blockId]);
          delete arcaneTimers[blockId];
        }
        return;
      }

      block.classList.add('is-visible');
      btn.classList.add('is-open');

      const textEl = document.getElementById(blockId + '-text');
      if (textEl.classList.contains('decoded')) return;

      const real = textEl.getAttribute('data-real');
      const len = real.length;
      let frame = 0;
      const totalFrames = 34;

      arcaneTimers[blockId] = setInterval(() => {
        frame++;
        let out = '';
        for (let i = 0; i < len; i++) {
          const ch = real[i];
          if (ch === ' ') { out += ' '; continue; }
          const revealAt = (i / len) * totalFrames;
          if (frame >= revealAt + 6) {
            out += ch;
          } else {
            out += ARCANE_RUNES[Math.floor(Math.random() * ARCANE_RUNES.length)];
          }
        }
        textEl.textContent = out;

        if (frame >= totalFrames + 8) {
          clearInterval(arcaneTimers[blockId]);
          delete arcaneTimers[blockId];
          textEl.textContent = real;
          textEl.classList.add('decoded');
        }
      }, 45);
    }

    function normalizeText(s) {
      return (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    }

    function episodeMatchesSearch(item) {
      if (!episodeSearchQuery) return true;
      const title = item.querySelector('.ep-title');
      const sub = item.querySelector('.ep-sub');
      const text = normalizeText((title ? title.textContent : '') + ' ' + (sub ? sub.textContent : ''));
      return text.includes(normalizeText(episodeSearchQuery));
    }

    function switchSeason(n) {
      currentSeason = n;
      applySeasonFilter();
    }

    function applySeasonFilter() {
      const items = document.querySelectorAll('#ep-list .ep-item[data-season]');
      let visibleCount = 0;
      items.forEach(item => {
        const matches = parseInt(item.getAttribute('data-season')) === currentSeason && episodeMatchesSearch(item);
        item.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });

      document.getElementById('season-label').textContent = 'TEMPORADA ' + currentSeason;
      document.getElementById('season-count').textContent = visibleCount;

      const emptyMsg = document.getElementById('season-empty');
      emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
      emptyMsg.textContent = episodeSearchQuery
        ? '// Nenhum episódio encontrado para "' + episodeSearchQuery + '".'
        : '// Temporada ' + currentSeason + ' ainda não começou. Em breve.';
    }

    function toggleSeasonDropdown() {
      document.getElementById('season-dropdown').classList.toggle('open');
    }

    function selectSeason(n, btn) {
      document.querySelectorAll('.season-dropdown-item').forEach(i => i.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('season-dropdown-label').textContent = btn.textContent;
      document.getElementById('season-dropdown').classList.remove('open');
      switchSeason(n);
    }

    // Close season dropdown when clicking outside it
    document.addEventListener('click', (e) => {
      const dropdown = document.getElementById('season-dropdown');
      if (dropdown && !dropdown.contains(e.target)) {
        dropdown.classList.remove('open');
      }
    });

    function showSeasonView() {
      document.getElementById('season-view').classList.add('active');
      document.getElementById('spinoff-view').classList.remove('active');
      document.getElementById('spinoff-toggle-btn').classList.remove('active');
      document.getElementById('spinoff-toggle-btn').textContent = 'Spin offs';
      applySeasonFilter();
    }

    function showSpinoffView() {
      document.getElementById('season-view').classList.remove('active');
      document.getElementById('spinoff-view').classList.add('active');
      document.getElementById('spinoff-toggle-btn').classList.add('active');
      document.getElementById('spinoff-toggle-btn').textContent = 'Temporadas';
      applySpinoffFilter();
    }

    function toggleEpisodeView() {
      const spinoffView = document.getElementById('spinoff-view');
      if (spinoffView.classList.contains('active')) {
        showSeasonView();
      } else {
        showSpinoffView();
      }
    }

    function selectSpinoff(id, btn) {
      document.querySelectorAll('.spinoff-tab').forEach(t => t.classList.remove('active'));
      btn.classList.add('active');
      currentSpinoff = id;
      applySpinoffFilter();
    }

    function applySpinoffFilter() {
      const items = document.querySelectorAll('.spinoff-ep-item');
      let visibleCount = 0;
      items.forEach(item => {
        const matches = item.getAttribute('data-spinoff') === currentSpinoff && episodeMatchesSearch(item);
        item.style.display = matches ? '' : 'none';
        if (matches) visibleCount++;
      });

      const emptyMsg = document.getElementById('spinoff-empty');
      if (emptyMsg) {
        emptyMsg.style.display = visibleCount === 0 ? 'block' : 'none';
        emptyMsg.textContent = episodeSearchQuery
          ? '// Nenhum episódio encontrado para "' + episodeSearchQuery + '".'
          : '// Nenhum episódio publicado ainda. Em breve.';
      }
    }

    function filterEpisodes(query) {
      episodeSearchQuery = query;
      document.getElementById('ep-search-clear').style.display = query ? 'block' : 'none';
      const spinoffActive = document.getElementById('spinoff-view').classList.contains('active');
      if (spinoffActive) {
        applySpinoffFilter();
      } else {
        applySeasonFilter();
      }
    }

    function clearEpisodeSearch() {
      const input = document.getElementById('ep-search-input');
      input.value = '';
      filterEpisodes('');
      input.focus();
    }

    // ===== READING PROGRESS =====
    function getReadEpisodes() {
      try {
        return JSON.parse(localStorage.getItem('readEpisodes') || '[]');
      } catch (e) {
        return [];
      }
    }

    function markEpisodeRead(id) {
      const read = new Set(getReadEpisodes());
      if (!read.has(id)) {
        read.add(id);
        localStorage.setItem('readEpisodes', JSON.stringify([...read]));
      }
      applyReadBadge(id);
    }

    function applyReadBadge(id) {
      document.querySelectorAll('.ep-item[onclick*="\'' + id + '\'"]').forEach(item => {
        item.classList.add('is-read');
        if (!item.querySelector('.ep-read-badge')) {
          const badge = document.createElement('span');
          badge.className = 'ep-read-badge';
          badge.textContent = '✓ LIDO';
          const arrow = item.querySelector('.ep-arrow');
          if (arrow) {
            item.insertBefore(badge, arrow);
          } else {
            item.appendChild(badge);
          }
        }
      });
    }

    function applyAllReadBadges() {
      getReadEpisodes().forEach(id => applyReadBadge(id));
    }

    // ===== SHARE EPISODE =====
    function shareEpisode(id, title, btn) {
      const url = location.origin + location.pathname + '#' + id;
      if (navigator.share) {
        navigator.share({ title: title || document.title, url: url }).catch(() => {});
        return;
      }
      const done = () => {
        if (!btn) return;
        const original = btn.textContent;
        btn.textContent = '✓ Copiado!';
        setTimeout(() => { btn.textContent = original; }, 1800);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(done).catch(() => {
          window.prompt('Copie o link do episódio:', url);
        });
      } else {
        window.prompt('Copie o link do episódio:', url);
      }
    }

    function injectShareButtons() {
      document.querySelectorAll('.ep-reader').forEach(reader => {
        const closeBtn = reader.querySelector('.close-reader');
        if (!closeBtn || reader.querySelector('.ep-share-btn')) return;
        const titleEl = reader.querySelector('.ep-reader-title');
        const title = titleEl ? titleEl.textContent : document.title;
        const shareBtn = document.createElement('button');
        shareBtn.className = 'ep-share-btn';
        shareBtn.type = 'button';
        shareBtn.textContent = '↗ Compartilhar';
        shareBtn.style.position = 'relative';
        shareBtn.style.zIndex = '2';
        shareBtn.onclick = function() { shareEpisode(reader.id, title, shareBtn); };
        closeBtn.parentNode.insertBefore(shareBtn, closeBtn);
      });
    }

    // Open an episode directly if the page URL has a matching #hash on load,
    // switching to the right season/spin-off tab first if needed.
    function openEpisodeFromHash() {
      const id = location.hash.replace('#', '');
      if (!id) return;
      const el = document.getElementById(id);
      if (!el || !el.classList.contains('ep-reader')) return;

      if (id.startsWith('spinoff-')) {
        const spinoffId = (el.closest('.spinoff-ep-item') && el.closest('.spinoff-ep-item').getAttribute('data-spinoff'))
          || (document.querySelector('.spinoff-ep-item[onclick*="\'' + id + '\'"]') && document.querySelector('.spinoff-ep-item[onclick*="\'' + id + '\'"]').getAttribute('data-spinoff'));
        showSpinoffView();
        if (spinoffId) {
          const tab = document.querySelector('.spinoff-tab[onclick*="\'' + spinoffId + '\'"]');
          if (tab) selectSpinoff(spinoffId, tab);
        }
      } else {
        const seasonItem = document.querySelector('.ep-item[data-season][onclick*="\'' + id + '\'"]');
        if (seasonItem) {
          const season = parseInt(seasonItem.getAttribute('data-season'));
          const seasonBtn = document.querySelector('.season-dropdown-item[onclick*="' + season + ',"]');
          if (seasonBtn) selectSeason(season, seasonBtn);
        }
      }
      openEp(id);
    }

    document.addEventListener('DOMContentLoaded', function() {
      applyAllReadBadges();
      injectShareButtons();
      openEpisodeFromHash();
    });

    function openEp(id) {
      document.querySelectorAll('.ep-reader').forEach(r => r.classList.remove('active'));
      const el = document.getElementById(id);
      el.classList.add('active');
      setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
      markEpisodeRead(id);
    }

    function closeEp(id) {
      document.getElementById(id).classList.remove('active');
    }

    // Fade in on scroll
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) {
          e.target.style.opacity = '1';
          e.target.style.transform = 'translateY(0)';
        }
      });
    }, { threshold: 0.1 });

    document.querySelectorAll('.entity-card, .cosmo-layer, .ep-item').forEach(el => {
      el.style.opacity = '0';
      el.style.transform = 'translateY(20px)';
      el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
      observer.observe(el);
    });

    // Garante que só a Temporada 1 apareça ao carregar a página
    document.addEventListener('DOMContentLoaded', () => {
      const defaultBtn = document.querySelector('.season-dropdown-item[onclick*="selectSeason(1"]');
      // episodios, cronologia e mapa de relacoes vivem no site da historia
    });

    // ===== CRONOLOGIA =====
    // Gera a linha do tempo a partir dos episódios já existentes no site (nenhum dado duplicado, só reorganizado).
    function buildTimeline() {
      const wrap = document.getElementById('timeline-wrap');
      if (!wrap) return;
      const items = document.querySelectorAll('#spinoff-view ~ *, .ep-item[data-season]');
      // Coleta episódios das temporadas (data-season) em ordem de aparição no DOM
      const eps = Array.from(document.querySelectorAll('.ep-item[data-season]'));
      let currentSeason = null;
      eps.forEach(ep => {
        const season = ep.getAttribute('data-season');
        const num = ep.querySelector('.ep-num') ? ep.querySelector('.ep-num').textContent : '';
        const title = ep.querySelector('.ep-title') ? ep.querySelector('.ep-title').textContent : '';
        const onclickAttr = ep.getAttribute('onclick') || '';
        const match = onclickAttr.match(/openEp\('([^']+)'\)/);
        const epId = match ? match[1] : null;

        if (season !== currentSeason) {
          currentSeason = season;
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
            const btn = document.querySelector('.season-dropdown-item[onclick*="selectSeason(' + season + '"]');
            if (btn) selectSeason(parseInt(season), btn);
            showSeasonView();
            openEp(epId);
            document.getElementById('episodios').scrollIntoView({ behavior: 'smooth' });
          });
        }
        wrap.appendChild(item);
      });

      // Animação de entrada em cascata conforme rola a tela
      const tObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            tObserver.unobserve(entry.target);
          }
        });
      }, { threshold: 0.15 });
      wrap.querySelectorAll('.timeline-item').forEach((el, i) => {
        el.style.transitionDelay = (i % 8) * 0.04 + 's';
        tObserver.observe(el);
      });
    }

    // ===== MAPA DE RELAÇÕES =====
    // Conexões confirmadas nas fichas de personagem. Adicionar aqui conforme novas relações forem reveladas.
    const relMapData = {
      nodes: [
        {"id": "onyx", "name": "Onyx", "x": 350, "y": 320, "hub": true},
        {"id": "ayla", "name": "Ayla", "x": 350, "y": 170},
        {"id": "tolta", "name": "Tolta", "x": 425, "y": 190},
        {"id": "maria", "name": "Maria", "x": 480, "y": 245},
        {"id": "tengu", "name": "Tengu", "x": 500, "y": 320},
        {"id": "lothus", "name": "Lothus", "x": 480, "y": 395},
        {"id": "jeff", "name": "Jeff", "x": 425, "y": 450},
        {"id": "homens-terno", "name": "Homens de Terno", "x": 350, "y": 470},
        {"id": "falcon", "name": "Falcon", "x": 275, "y": 450},
        {"id": "shadow-revna", "name": "Shadow Rëvna", "x": 220, "y": 395},
        {"id": "bulldog", "name": "Bulldog Shoesign", "x": 200, "y": 320},
        {"id": "kevin", "name": "Kevin", "x": 220, "y": 245},
        {"id": "braco-de-ferro", "name": "Braço de Ferro", "x": 275, "y": 190},
        {"id": "ferid", "name": "Ferid", "x": 239, "y": 83},
        {"id": "lucifer", "name": "Lúcifer", "x": 97, "y": 252},
        {"id": "feng", "name": "Feng", "x": 587, "y": 209},
        {"id": "ania", "name": "Ania", "x": 608, "y": 275},
        {"id": "brulhios", "name": "Brulhios", "x": 611, "y": 343},
        {"id": "kael", "name": "Kael", "x": 596, "y": 410},
        {"id": "ford", "name": "Ford", "x": 565, "y": 470}
      ],
      edges: [
        {"from": "onyx", "to": "ayla", "label": "Casados. Ela é o motivo pelo qual ele decidiu se estabelecer."},
        {"from": "onyx", "to": "tolta", "label": "Onyx treina Tolta e busca ajuda pra controlar Nephilis Heder, a Anomalia primordial selada nele."},
        {"from": "onyx", "to": "tengu", "label": "Discípulo oficial de Onyx, mesmo negando o título."},
        {"from": "onyx", "to": "kevin", "label": "Amigos antigos. Conexão leve, se respeitam como iguais."},
        {"from": "onyx", "to": "maria", "label": "Relação tensa e respeitosa. Ela sabe de Nephilis Heder, a Anomalia que habita Tolta."},
        {"from": "onyx", "to": "homens-terno", "label": "Rivalidade direta. Onyx já enfrentou o sistema deles várias vezes."},
        {"from": "falcon", "to": "tolta", "label": "Falcon avaliou a entidade dentro de Tolta e confirmou seu nível de poder."},
        {"from": "ferid", "to": "braco-de-ferro", "label": "Ferid forjou o Distorcedor de Narrativas usado por Braço de Ferro."},
        {"from": "onyx", "to": "falcon", "label": "Reencontro após 30 anos. Luta que destruiu um planeta e rasgou múltiplas camadas, terminou com a ativação da Forma Alfa e Falcon desistindo de continuar lutando."},
        {"from": "onyx", "to": "shadow-revna", "label": "Onyx é fã declarado dele. Shadow não se impressiona: \"admiração sem poder não vale nada aqui\"."},
        {"from": "shadow-revna", "to": "falcon", "label": "Colegas antigos. Muito amigos."},
        {"from": "onyx", "to": "braco-de-ferro", "label": "Respeito mútuo. Braço de Ferro intermedia contratos e informações e tem contato com o Mestre da Forja."},
        {"from": "maria", "to": "tolta", "label": "Tia de Tolta. Já foi muito mais forte e escolheu uma vida simples pra protegê-lo."},
        {"from": "homens-terno", "to": "tolta", "label": "Monitoraram a evolução de Tolta durante o treino e tentaram agir depois de confirmar que ele estava sob proteção."},
        {"from": "onyx", "to": "lothus", "label": "Assistente de Onyx. Treina a equipe de Tengu na ausência dele."},
        {"from": "lothus", "to": "tengu", "label": "Treinou Tengu e foi destruído por ele incontáveis vezes em forma base no ep 29."},
        {"from": "tengu", "to": "feng", "label": "Mesmo grupo. Feng é o escudo da equipe."},
        {"from": "tengu", "to": "ania", "label": "Mesmo grupo. Ania é o Domínio Sensorial da equipe."},
        {"from": "tengu", "to": "brulhios", "label": "Mesmo grupo. Brulhios é a analista da equipe e dona do bar onde o grupo se reúne."},
        {"from": "tengu", "to": "kael", "label": "Mesmo grupo. Kael faz a Precisão Letal da equipe."},
        {"from": "ford", "to": "tengu", "label": "Ford, Rank S, viu Tengu apagar um boss e ficou com receio. Resgatou Tengu e a equipe na dungeon destruída."},
        {"from": "jeff", "to": "onyx", "label": "Jeff quer medir forças com Onyx em combate oficial e reconhece que há algo diferente nele."},
        {"from": "onyx", "to": "bulldog", "label": "Destino de Onyx. Kevin deu o nome e a direção até ele, na Árvore Morta. Ainda não foi encontrado."},
        {"from": "bulldog", "to": "falcon", "label": "Bulldog indicou Falcon como o único capaz de ajudar Tolta a controlar o que existe dentro dele."},
        {"from": "lucifer", "to": "kevin", "label": "Lúcifer não suporta Kevin e o considera inferior no submundo. Mandou recado pra ele tirar o cavalinho da chuva."},
        {"from": "lucifer", "to": "onyx", "label": "Abordou Onyx no ep 26, na saída da reunião com Bulldog e Sukum, pra mandar um recado ao Kevin."}
      ]
    };

    function buildRelMap() {
      const edgesG = document.getElementById('relmap-edges');
      const nodesG = document.getElementById('relmap-nodes');
      if (!edgesG || !nodesG) return;
      const svgNS = 'http://www.w3.org/2000/svg';
      const byId = {};
      relMapData.nodes.forEach(n => byId[n.id] = n);

      relMapData.edges.forEach(e => {
        const a = byId[e.from], b = byId[e.to];
        const line = document.createElementNS(svgNS, 'line');
        line.setAttribute('x1', a.x); line.setAttribute('y1', a.y);
        line.setAttribute('x2', b.x); line.setAttribute('y2', b.y);
        line.classList.add('relmap-edge');
        line.dataset.from = e.from; line.dataset.to = e.to;
        edgesG.appendChild(line);
      });

      relMapData.nodes.forEach(n => {
        const g = document.createElementNS(svgNS, 'g');
        g.classList.add('relmap-node');
        if (n.hub) g.classList.add('hub');
        g.dataset.id = n.id;

        const r = n.hub ? 30 : 24;
        const circle = document.createElementNS(svgNS, 'circle');
        circle.setAttribute('cx', n.x); circle.setAttribute('cy', n.y); circle.setAttribute('r', r);
        g.appendChild(circle);

        const words = n.name.split(' ');
        words.forEach((w, i) => {
          const text = document.createElementNS(svgNS, 'text');
          text.setAttribute('x', n.x);
          text.setAttribute('y', n.y + (i - (words.length - 1) / 2) * 11 + 4);
          text.textContent = w;
          g.appendChild(text);
        });

        g.addEventListener('click', () => selectRelNode(n.id));
        nodesG.appendChild(g);
      });

      // Animação de entrada
      const rObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            document.querySelectorAll('.relmap-node').forEach((el, i) => {
              setTimeout(() => el.classList.add('visible'), i * 70);
            });
            rObserver.disconnect();
          }
        });
      }, { threshold: 0.2 });
      const svgEl = document.getElementById('relmap-svg');
      if (svgEl) rObserver.observe(svgEl);
    }

    function selectRelNode(id) {
      const info = document.getElementById('relmap-info');
      document.querySelectorAll('.relmap-edge').forEach(edge => {
        const match = edge.dataset.from === id || edge.dataset.to === id;
        edge.classList.toggle('highlight', match);
      });

      const related = relMapData.edges.filter(e => e.from === id || e.to === id);
      const nodeName = relMapData.nodes.find(n => n.id === id).name;

      if (related.length === 0) {
        info.innerHTML = '<strong>' + nodeName + '</strong><br>Nenhuma conexão confirmada ainda.';
        return;
      }
      info.innerHTML = related.map(e => {
        const otherId = e.from === id ? e.to : e.from;
        const otherName = relMapData.nodes.find(n => n.id === otherId).name;
        return '<strong>' + nodeName + ' ↔ ' + otherName + '</strong><br>' + e.label;
      }).join('<br><br>');
    }
  