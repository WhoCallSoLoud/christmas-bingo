(() => {
  const { safeLink, fillCell } = window.Bingo;
  const $ = id => document.getElementById(id);
  const LB = String(window.LEADERBOARD_URL || '').trim();
  const params = new URLSearchParams(location.search);
  const room = (params.get('room') || 'main').replace(/[^a-z0-9_-]/gi, '').toLowerCase().slice(0, 24) || 'main';
  const pid = (params.get('p') || '').replace(/[^a-f0-9]/gi, '').slice(0, 32);
  const fail = msg => { $('view-status').textContent = msg; };

  if (!LB || !pid) return fail("This card link isn't valid.");
  (async () => {
    try {
      const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 12000);
      const res = await fetch(`${LB}${LB.includes('?') ? '&' : '?'}room=${encodeURIComponent(room)}`, { signal: ctl.signal }); clearTimeout(t);
      const data = await res.json();
      const row = (data.rows || []).find(r => r.pid === pid);
      if (!row || !Array.isArray(row.card) || row.card.length !== 25 || typeof row.marks !== 'string') return fail("Couldn't find that card. It may have been removed.");
      document.title = `${row.nickname}'s card · Christmas Movie Bingo`;
      $('view-title').textContent = `${row.nickname}'s card`;
      $('view-score').textContent = `${row.squares}/24 squares · ${row.lines} ${row.lines === 1 ? 'line' : 'lines'}${row.lines ? ' 🎉' : ''}`;
      const link = safeLink(row.link), mv = $('view-movie');
      if (row.movie){ mv.textContent = '🎬 '; if (link){ const a = document.createElement('a'); a.href = link; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.textContent = row.movie; mv.appendChild(a); } else mv.append(row.movie); }
      const grid = $('view-grid');
      row.card.forEach((text, i) => {
        const c = document.createElement('div'); c.className = 'cell'; c.setAttribute('role', 'listitem');
        if (i === 12){ c.classList.add('free'); c.innerHTML = '<span class="star">★</span><span class="main">FREE</span>'; }
        else { fillCell(c, String(text)); if (row.marks[i] === '1'){ c.classList.add('on'); c.setAttribute('aria-label', `${text} (spotted)`); } }
        grid.appendChild(c);
      });
      $('view-status').hidden = true; $('view').hidden = false;
    } catch (e) { fail("Couldn't load the card. Check your connection and reload."); }
  })();
})();
