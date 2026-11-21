// Helpers shared by index.html (app.js) and view.html (view.js).
window.Bingo = {
  // Returns a safe http(s) URL, or '' if the input isn't a usable web link.
  safeLink(raw){
    raw = (raw || '').trim(); if (!raw) return '';
    if (!/^[a-z][a-z0-9+.-]*:/i.test(raw)) raw = 'https://' + raw;
    try { const u = new URL(raw); return /^https?:$/.test(u.protocol) && u.hostname.includes('.') ? u.href : ''; } catch { return ''; }
  },
  // Fills a card cell with a square's text; "(...)" drops to a smaller second line.
  fillCell(el, text){
    const m = text.match(/^(.*?)\s*(\(.*\))$/);
    const main = document.createElement('span'); main.className = 'main'; main.textContent = m ? m[1] : text;
    el.appendChild(main);
    if (m){ const sub = document.createElement('span'); sub.className = 'sub'; sub.textContent = m[2]; el.appendChild(sub); }
    if (text.length > 44) el.classList.add('xl'); else if (text.length > 28) el.classList.add('long');
  },
  // Builds a small "Wordle style" thumbnail from a 25-char marks string.
  thumb(marksStr){
    const t = document.createElement('span'); t.className = 'thumb'; t.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 25; i++){ const c = document.createElement('i'); if (i === 12) c.className = 'free'; else if (marksStr[i] === '1') c.className = 'on'; t.appendChild(c); }
    return t;
  }
};
