(() => {
  const NAME_KEY = 'bingo:nickname';
  const marksKey = seed => `bingo:marks:${seed}`;
  const $ = id => document.getElementById(id);
  const FREE = 12;
  let items = [], seed = '', nickname = '', marks = new Set();

  // --- storage helpers (may throw in private mode) ---
  const store = {
    get(k){ try { return localStorage.getItem(k); } catch { return null; } },
    set(k,v){ try { localStorage.setItem(k,v); } catch {} },
    del(k){ try { localStorage.removeItem(k); } catch {} }
  };

  // --- seeded RNG ---
  function hash(str){ let h = 1779033703 ^ str.length;
    for (let i = 0; i < str.length; i++){ h = Math.imul(h ^ str.charCodeAt(i), 3432918353); h = h << 13 | h >>> 19; }
    return () => { h = Math.imul(h ^ h >>> 16, 2246822507); h = Math.imul(h ^ h >>> 13, 3266489909); return (h ^= h >>> 16) >>> 0; };
  }
  function mulberry32(a){ return () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  const newSeed = () => Math.random().toString(36).slice(2, 10).padEnd(8, '0');

  function buildCard(seed){
    const rand = mulberry32(hash(seed)());
    const pool = items.slice();
    for (let i = pool.length - 1; i > 0; i--){ const j = Math.floor(rand() * (i + 1)); [pool[i], pool[j]] = [pool[j], pool[i]]; }
    const card = pool.slice(0, 24);
    card.splice(FREE, 0, null); // free center
    return card;
  }

  // --- URL ---
  function readUrl(){ const p = new URLSearchParams(location.search); return { seed: (p.get('seed') || '').replace(/[^a-z0-9]/gi, '').slice(0, 16), name: (p.get('name') || '').slice(0, 24) }; }
  function writeUrl(){ const p = new URLSearchParams(); p.set('seed', seed); p.set('name', nickname); history.replaceState(null, '', `${location.pathname}?${p}`); }

  // --- marks ---
  function loadMarks(){ try { marks = new Set(JSON.parse(store.get(marksKey(seed)) || '[]')); } catch { marks = new Set(); } marks.delete(FREE); }
  const saveMarks = () => store.set(marksKey(seed), JSON.stringify([...marks]));

  const LINES = (() => { const L = [];
    for (let i = 0; i < 5; i++){ L.push([0,1,2,3,4].map(c => i*5+c), [0,1,2,3,4].map(r => r*5+i)); }
    L.push([0,6,12,18,24], [4,8,12,16,20]); return L; })();

  function render(){
    const card = buildCard(seed);
    const grid = $('grid'); grid.textContent = '';
    card.forEach((text, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'cell'; b.dataset.i = i;
      if (text === null){ b.classList.add('free'); b.innerHTML = '<span class="star">★</span><span class="main">FREE</span>'; b.setAttribute('aria-pressed', 'true'); b.disabled = true; }
      else {
        const m = text.match(/^(.*?)\s*(\(.*\))$/);
        const main = document.createElement('span'); main.className = 'main'; main.textContent = m ? m[1] : text;
        b.appendChild(main);
        if (m) { const sub = document.createElement('span'); sub.className = 'sub'; sub.textContent = m[2]; b.appendChild(sub); }
        if (text.length > 44) b.classList.add('xl'); else if (text.length > 28) b.classList.add('long');
        b.setAttribute('aria-pressed', marks.has(i));
      }
      grid.appendChild(b);
    });
    $('player-label').textContent = `Card for ${nickname}`;
    $('print-name').textContent = `Card for ${nickname}`;
    updateWins();
  }

  function updateWins(){
    const on = i => i === FREE || marks.has(i);
    const winning = new Set();
    LINES.forEach(l => { if (l.every(on)) l.forEach(i => winning.add(i)); });
    document.querySelectorAll('.cell').forEach(c => c.classList.toggle('win', winning.has(+c.dataset.i) && +c.dataset.i !== FREE));
    $('bingo-banner').hidden = winning.size === 0;
  }

  function showCard(){
    $('name-form').hidden = true; $('card-area').hidden = false;
    writeUrl(); loadMarks(); render();
  }

  // --- events ---
  $('grid').addEventListener('click', e => {
    const c = e.target.closest('.cell'); if (!c || c.disabled) return;
    const i = +c.dataset.i;
    marks.has(i) ? marks.delete(i) : marks.add(i);
    c.setAttribute('aria-pressed', marks.has(i));
    saveMarks(); updateWins();
  });

  $('name-form').addEventListener('submit', e => {
    e.preventDefault();
    nickname = $('nickname').value.trim().slice(0, 24); if (!nickname) return;
    store.set(NAME_KEY, nickname);
    if (!seed) seed = newSeed();
    showCard();
  });

  $('new-card').addEventListener('click', () => {
    if (marks.size && !confirm('Start a new card? Your current marks will be cleared.')) return;
    store.del(marksKey(seed)); marks.clear();
    seed = newSeed(); showCard();
  });

  $('print').addEventListener('click', () => window.print());

  // tabs
  const tabs = { card: [$('tab-card'), $('panel-card')], rules: [$('tab-rules'), $('panel-rules')] };
  function selectTab(name){
    for (const [k, [t, p]] of Object.entries(tabs)){ t.setAttribute('aria-selected', k === name); p.hidden = k !== name; }
  }
  $('tab-card').onclick = () => selectTab('card');
  $('tab-rules').onclick = () => selectTab('rules');

  // --- init ---
  fetch('bingo-items.json').then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(data => {
    items = data;
    const u = readUrl();
    seed = u.seed;
    nickname = u.name || store.get(NAME_KEY) || '';
    $('nickname').value = nickname;
    if (seed && nickname) showCard();
    else { $('name-form').hidden = false; $('nickname').focus(); }
  }).catch(err => {
    const el = $('error'); el.hidden = false;
    el.textContent = 'Could not load bingo-items.json. Serve this folder over http (for example "python3 -m http.server") instead of opening the file directly.';
    console.error(err);
  });
})();
