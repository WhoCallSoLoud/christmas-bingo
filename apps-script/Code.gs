/**
 * Christmas Movie Bingo leaderboard backend.
 * Paste into a Google Sheet's Apps Script editor and deploy as a Web app
 * (Execute as: Me, Who has access: Anyone). See README.md.
 */
const SHEET_NAME = 'Scores';
const HEADERS = ['id', 'room', 'nickname', 'squares', 'lines', 'movie', 'link', 'first', 'updated'];
const MAX_ROWS = 2000;
const FREE = 12;
const LINES = (() => {
  const L = [];
  for (let i = 0; i < 5; i++) {
    L.push([0, 1, 2, 3, 4].map(c => i * 5 + c), [0, 1, 2, 3, 4].map(r => r * 5 + i));
  }
  L.push([0, 6, 12, 18, 24], [4, 8, 12, 16, 20]);
  return L;
})();

function sheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let s = ss.getSheetByName(SHEET_NAME);
  if (!s) { s = ss.insertSheet(SHEET_NAME); s.appendRow(HEADERS); s.setFrozenRows(1); }
  return s;
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Stop spreadsheet formulas from being injected through text fields.
function safeText_(v, max) {
  v = String(v == null ? '' : v).replace(/[\u0000-\u001f]/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(v) ? "'" + v : v;
}

function safeLink_(v) {
  v = String(v || '').trim().slice(0, 300);
  return /^https?:\/\/[^\s]+\.[^\s]+$/i.test(v) ? v : '';
}

// Public read: returns this room's rows WITHOUT the private card id.
function doGet(e) {
  const room = String((e && e.parameter && e.parameter.room) || 'main').toLowerCase();
  const values = sheet_().getDataRange().getValues();
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const r = values[i];
    if (String(r[1]).toLowerCase() !== room) continue;
    rows.push({
      nickname: String(r[2]).replace(/^'/, ''), squares: Number(r[3]) || 0, lines: Number(r[4]) || 0,
      movie: String(r[5]).replace(/^'/, ''), link: String(r[6]),
      first: r[7] instanceof Date ? r[7].toISOString() : String(r[7])
    });
  }
  return json_({ ok: true, rows: rows });
}

// Public write: validates everything and recomputes the score from the marked squares.
function doPost(e) {
  let d;
  try { d = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'bad json' }); }
  const id = String(d.id || '');
  const room = String(d.room || 'main').toLowerCase();
  if (!/^[a-z0-9]{4,16}$/i.test(id) || !/^[a-z0-9_-]{1,24}$/.test(room)) return json_({ ok: false, error: 'bad id' });
  const nickname = safeText_(d.nickname, 24);
  if (!nickname) return json_({ ok: false, error: 'no nickname' });
  const marks = Array.isArray(d.marks)
    ? d.marks.filter((n, i, a) => Number.isInteger(n) && n >= 0 && n < 25 && n !== FREE && a.indexOf(n) === i)
    : [];
  const on = n => n === FREE || marks.indexOf(n) !== -1;
  const lines = LINES.filter(l => l.every(on)).length;
  const now = new Date();

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const s = sheet_();
    const ids = s.getRange(1, 1, s.getLastRow(), 1).getValues().map(r => String(r[0]));
    const idx = ids.indexOf(id, 1);
    const record = [id, room, nickname, marks.length, lines, safeText_(d.movie, 80), safeLink_(d.link)];
    if (idx !== -1) {
      const first = s.getRange(idx + 1, 8).getValue() || now;
      s.getRange(idx + 1, 1, 1, 9).setValues([record.concat([first, now])]);
    } else {
      if (s.getLastRow() >= MAX_ROWS) return json_({ ok: false, error: 'full' });
      s.appendRow(record.concat([now, now]));
    }
  } finally { lock.release(); }
  return json_({ ok: true });
}
