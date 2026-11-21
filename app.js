(() => {
  const NAME_KEY = 'bingo:nickname';
  const marksKey = seed => `bingo:marks:${seed}`;
  const $ = id => document.getElementById(id);
  const FREE = 12;
  const { safeLink, fillCell, thumb } = window.Bingo;
  const movieKey = s => `bingo:movie:${s}`;
  let room = 'main';
  let items = [], seed = '', nickname = '', marks = new Set(), movie = { title: '', link: '' };

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
  function readUrl(){ const p = new URLSearchParams(location.search); room = (p.get('room') || 'main').replace(/[^a-z0-9_-]/gi, '').toLowerCase().slice(0, 24) || 'main'; return { seed: (p.get('seed') || '').replace(/[^a-z0-9]/gi, '').slice(0, 16), name: (p.get('name') || '').slice(0, 24) }; }
  function writeUrl(){ const p = new URLSearchParams(); p.set('seed', seed); p.set('name', nickname); if (room !== 'main') p.set('room', room); history.replaceState(null, '', `${location.pathname}?${p}`); }

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
        fillCell(b, text);
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
    writeUrl(); loadMarks(); loadMovie(); render();
  }

  // --- movie ---
  function loadMovie(){
    try { movie = JSON.parse(store.get(movieKey(seed)) || '{}') || {}; } catch { movie = {}; }
    movie.title = String(movie.title || ''); movie.link = String(movie.link || '');
    $('movie-title').value = movie.title; $('movie-link').value = movie.link;
    showMovie();
  }
  function showMovie(){
    $('print-movie').textContent = movie.title ? `Watching: ${movie.title}` : '';
    $('movie-link-error').hidden = !(movie.link.trim() && !safeLink(movie.link));
  }
  function saveMovie(){
    movie = { title: $('movie-title').value.trim(), link: $('movie-link').value.trim() };
    store.set(movieKey(seed), JSON.stringify(movie)); showMovie();
  }
  $('movie-title').addEventListener('input', saveMovie);
  $('movie-link').addEventListener('input', saveMovie);

  // --- share ---
  const lineCount = () => LINES.filter(l => l.every(i => i === FREE || marks.has(i))).length;
  const siteUrl = () => location.origin + location.pathname;
  function shareText(detail = false){
    const rows = [];
    for (let r = 0; r < 5; r++){
      let row = ''; for (let c = 0; c < 5; c++){ const i = r*5+c; row += i === FREE ? '🟨' : marks.has(i) ? '🟩' : '⬜'; }
      rows.push(row);
    }
    const n = marks.size, l = lineCount();
    let t = `🎄 Christmas Movie Bingo · ${nickname}\n${n}/24 squares · ${l} ${l === 1 ? 'line' : 'lines'}${l ? ' 🎉' : ''}\n\n${rows.join('\n')}`;
    if (detail){
      const card = buildCard(seed), got = [...marks].sort((x, y) => x - y).map(i => card[i]).filter(Boolean);
      t += `\n\n` + (got.length ? got.map(s => `✅ ${s}`).join('\n') : 'Nothing marked yet');
    }
    if (movie.title) t += `\n\n🎬 ${movie.title}`;
    const link = safeLink(movie.link); if (link) t += `\n${link}`;
    return t + `\n\nPlay: ${siteUrl()}`;
  }
  function roundRect(ctx, x, y, w, h, r){ ctx.beginPath(); ctx.moveTo(x+r,y); ctx.arcTo(x+w,y,x+w,y+h,r); ctx.arcTo(x+w,y+h,x,y+h,r); ctx.arcTo(x,y+h,x,y,r); ctx.arcTo(x,y,x+w,y,r); ctx.closePath(); }
  function fitText(ctx, text, maxW, start, font){ let s = start; do { ctx.font = font(s); s -= 2; } while (ctx.measureText(text).width > maxW && s > 14); }
  function wrapLines(ctx, text, maxW){
    const words = text.split(/\s+/), lines = []; let cur = '';
    for (const w of words){ const t = cur ? cur + ' ' + w : w; if (cur && ctx.measureText(t).width > maxW){ lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur); return lines;
  }
  function drawImage(detail = false){
    const W = detail ? 960 : 720, pad = 48, gap = detail ? 10 : 12, cell = (W - pad*2 - gap*4) / 5, gridTop = 210;
    const H = gridTop + 5*cell + 4*gap + 170;
    const card = buildCard(seed);
    const cv = document.createElement('canvas'); cv.width = W; cv.height = H;
    const ctx = cv.getContext('2d'); const serif = 'Georgia, "Times New Roman", serif';
    ctx.fillStyle = '#fffdf7'; ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = 8; ctx.strokeStyle = '#1f6b45'; roundRect(ctx, 14, 14, W-28, H-28, 28); ctx.stroke();
    ctx.lineWidth = 3; ctx.strokeStyle = '#b3262d'; roundRect(ctx, 26, 26, W-52, H-52, 22); ctx.stroke();
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.fillStyle = '#b3262d'; ctx.font = `italic 700 52px ${serif}`; ctx.fillText('Christmas Movie Bingo', W/2, 100);
    ctx.fillStyle = '#1f6b45'; ctx.font = `700 28px ${serif}`;
    fitText(ctx, nickname, W - 160, 28, s => `700 ${s}px ${serif}`); ctx.fillText(nickname, W/2, 146);
    const n = marks.size, l = lineCount();
    ctx.fillStyle = '#5d6b63'; ctx.font = `22px ${serif}`;
    ctx.fillText(`${n}/24 squares · ${l} ${l === 1 ? 'line' : 'lines'}${l ? ' · BINGO!' : ''}`, W/2, 180);
    for (let i = 0; i < 25; i++){
      const x = pad + (i % 5) * (cell + gap), y = gridTop + Math.floor(i / 5) * (cell + gap);
      roundRect(ctx, x, y, cell, cell, 14);
      if (i === FREE){ ctx.fillStyle = '#f6dc8f'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#b3262d'; ctx.stroke();
        ctx.fillStyle = '#b3262d'; ctx.font = `${cell*0.5}px ${serif}`; ctx.textBaseline = 'middle'; ctx.fillText('★', x+cell/2, y+cell/2+3); ctx.textBaseline = 'alphabetic'; }
      else if (marks.has(i)){ ctx.fillStyle = '#3aa56b'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = '#1f6b45'; ctx.stroke(); }
      else { ctx.fillStyle = '#eef0ea'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = '#d6cdbd'; ctx.stroke(); }
      if (detail && i !== FREE){
        const txt = card[i], maxW = cell - 16; let size = 20, lines;
        for (; size >= 11; size--){ ctx.font = `600 ${size}px ${serif}`; lines = wrapLines(ctx, txt, maxW);
          if (lines.length * size * 1.18 <= cell - 16 && lines.every(l => ctx.measureText(l).width <= maxW)) break; }
        ctx.fillStyle = marks.has(i) ? '#fff' : '#5d6b63'; ctx.textBaseline = 'middle';
        const lh = size * 1.18, y0 = y + cell/2 - (lines.length - 1) * lh / 2;
        lines.forEach((l, k) => ctx.fillText(l, x + cell/2, y0 + k * lh)); ctx.textBaseline = 'alphabetic';
      }
    }
    const by = gridTop + 5*cell + 4*gap + 54;
    if (movie.title){ ctx.fillStyle = '#1f2a24'; fitText(ctx, '🎬 ' + movie.title, W - 120, 28, s => `700 ${s}px ${serif}`); ctx.fillText('🎬 ' + movie.title, W/2, by); }
    ctx.fillStyle = '#5d6b63'; ctx.font = `18px ${serif}`;
    ctx.fillText(siteUrl().replace(/^https?:\/\//, ''), W/2, H - 56);
    return cv;
  }
  let shareBlob = null;
  const dlg = $('share-dialog');
  const detail = () => $('share-detail').checked;
  function renderShare(){
    const cv = drawImage(detail()); $('share-img').src = cv.toDataURL('image/png'); $('share-text').textContent = shareText(detail());
    shareBlob = null; cv.toBlob(b => { shareBlob = b; }, 'image/png');
  }
  $('share-detail').addEventListener('change', () => { renderShare(); $('share-status').textContent = detail() ? 'Showing square names.' : 'Square names hidden.'; });
  $('share').addEventListener('click', () => {
    $('share-status').textContent = ''; renderShare();
    $('share-native').hidden = !navigator.share;
    dlg.showModal ? dlg.showModal() : dlg.setAttribute('open', '');
  });
  $('share-close').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', e => { if (e.target === dlg) dlg.close(); });
  $('share-copy').addEventListener('click', async () => {
    try { await navigator.clipboard.writeText(shareText(detail())); $('share-status').textContent = 'Copied! Paste it anywhere.'; }
    catch { const r = document.createRange(); r.selectNodeContents($('share-text')); getSelection().removeAllRanges(); getSelection().addRange(r); $('share-status').textContent = 'Press copy on the selected text.'; }
  });
  $('share-download').addEventListener('click', () => {
    const a = document.createElement('a'); a.href = $('share-img').src; a.download = detail() ? 'christmas-bingo-squares.png' : 'christmas-bingo.png'; a.click();
  });
  $('share-native').addEventListener('click', async () => {
    const data = { title: 'Christmas Movie Bingo', text: shareText(detail()) };
    try {
      if (shareBlob){ const f = new File([shareBlob], 'christmas-bingo.png', { type: 'image/png' }); if (navigator.canShare && navigator.canShare({ files: [f] })) data.files = [f]; }
      await navigator.share(data);
    } catch (e) { if (e.name !== 'AbortError') $('share-status').textContent = 'Sharing isn\'t available here. Use Copy text or Save image.'; }
  });

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
    store.del(marksKey(seed)); store.del(movieKey(seed)); marks.clear();
    seed = newSeed(); showCard();
  });

  $('print').addEventListener('click', () => window.print());

  // --- leaderboard ---
  const LB = String(window.LEADERBOARD_URL || '').trim();
  let boardTimer = null;
  const setBoardStatus = t => { $('board-status').textContent = t; $('post-status').textContent = t; };
  function renderBoard(rows){
    rows = rows.slice().sort((a, b) => (b.lines - a.lines) || (b.squares - a.squares) || String(a.first).localeCompare(String(b.first)));
    const body = $('board-body'); body.textContent = '';
    rows.forEach((r, i) => {
      const tr = document.createElement('tr');
      if (nickname && r.nickname.toLowerCase() === nickname.toLowerCase()) tr.className = 'mine';
      const add = (txt, cls) => { const td = document.createElement('td'); td.textContent = txt; if (cls) td.className = cls; tr.appendChild(td); return td; };
      add(i + 1, 'num'); add(r.nickname + (r.lines ? ' 🎉' : ''));
      const ct = add('', 'thumbcell');
      if (r.pid && typeof r.marks === 'string' && r.marks.length === 25){
        const a = document.createElement('a'); a.href = `view.html?room=${encodeURIComponent(room)}&p=${encodeURIComponent(r.pid)}`;
        a.target = '_blank'; a.rel = 'noopener'; a.title = `See ${r.nickname}'s card`; a.setAttribute('aria-label', `See ${r.nickname}'s full card`);
        a.appendChild(thumb(r.marks)); ct.appendChild(a);
      } add(`${r.squares}/24`, 'num'); add(r.lines, 'num');
      const mt = add(''); const link = safeLink(r.link);
      if (r.movie && link){ const a = document.createElement('a'); a.href = link; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = r.movie; mt.appendChild(a); }
      else mt.textContent = r.movie || '';
      body.appendChild(tr);
    });
    return rows.length;
  }
  async function loadBoard(){
    if (!LB) return;
    setBoardStatus('Loading…');
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
      const res = await fetch(`${LB}${LB.includes('?') ? '&' : '?'}room=${encodeURIComponent(room)}`, { signal: ctl.signal }); clearTimeout(t);
      const data = await res.json(); if (!data.ok) throw new Error('bad response');
      const n = renderBoard(data.rows || []); setBoardStatus(n ? '' : 'No scores yet. Be the first to post!');
      return data.rows;
    } catch (err) { setBoardStatus("Couldn't load the leaderboard. Check your connection and tap Refresh."); }
  }
  async function postScore(){
    if (!seed || !nickname){ setBoardStatus('Get your card first, then post your score.'); return; }
    setBoardStatus('Posting…'); $('post-score').disabled = true;
    try {
      await fetch(LB, { method: 'POST', mode: 'no-cors', headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ id: seed, room, nickname, marks: [...marks], card: buildCard(seed).map(t => t || ''), movie: movie.title, link: safeLink(movie.link) }) });
      await new Promise(r => setTimeout(r, 1500));
      const rows = await loadBoard();
      const mine = (rows || []).some(r => r.nickname.toLowerCase() === nickname.toLowerCase() && r.squares === marks.size);
      if (rows) setBoardStatus(mine ? 'Posted! You\'re on the board.' : 'Sent, but your score isn\'t showing yet. Tap Refresh in a moment.');
    } catch (err) { setBoardStatus("Couldn't post your score. Check your connection and try again."); }
    $('post-score').disabled = false;
  }
  function openBoard(){
    $('board-room').textContent = room === 'main' ? '' : `Room: ${room}`;
    $('board-setup').hidden = !!LB; $('board-refresh').disabled = !LB;
    loadBoard(); clearInterval(boardTimer); if (LB) boardTimer = setInterval(loadBoard, 30000);
  }
  $('post-score').hidden = !LB;
  $('post-score').addEventListener('click', postScore);
  $('board-refresh').addEventListener('click', loadBoard);

  // tabs
  const tabs = { card: [$('tab-card'), $('panel-card')], rules: [$('tab-rules'), $('panel-rules')], board: [$('tab-board'), $('panel-board')] };
  function selectTab(name){
    for (const [k, [t, p]] of Object.entries(tabs)){ t.setAttribute('aria-selected', k === name); p.hidden = k !== name; }
    if (name === 'board') openBoard(); else clearInterval(boardTimer);
  }
  $('tab-card').onclick = () => selectTab('card');
  $('tab-rules').onclick = () => selectTab('rules');
  $('tab-board').onclick = () => selectTab('board');

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
