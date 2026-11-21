# Christmas Movie Bingo

A static site (plain HTML/CSS/JS, no build step). Host it with GitHub Pages.

## Leaderboard setup (Google Sheets + Apps Script, about 5 minutes)

1. Create a new Google Sheet (https://sheets.new) and name it "Bingo leaderboard".
2. Choose **Extensions → Apps Script**. Delete the starter code and paste in everything from `apps-script/Code.gs`. Click Save.
3. Choose **Deploy → New deployment**. Click the gear next to "Select type" and pick **Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Click **Deploy**, approve the permissions prompt, and copy the **Web app URL** (it ends in `/exec`).
5. Paste that URL into `config.js` as `window.LEADERBOARD_URL`, commit, and push.

The script creates a `Scores` tab in the sheet the first time someone posts. Open the sheet any time to see or delete rows.

If you change `Code.gs` later, use **Deploy → Manage deployments → Edit → New version** so the same URL keeps working.

### Rooms
Add `?room=name` to the site URL (letters, numbers, `-`, `_`) to give a group its own leaderboard. The default room is `main`.

### Limits
There are no logins, so the board runs on trust. The script recomputes lines from the squares sent, caps field lengths, ignores bad links, and never exposes card ids, but anyone could still post a made-up set of squares. Delete rows in the sheet to clean up.
