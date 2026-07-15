# PhoneStack 📱📱📱

> "alright everyone, gimme your phones — we needa lock in."

The social accountability timer. When you and your friends need to study or lock in,
the phones go in one pile — the **phonestack** — and nobody touches theirs until the
timer runs out. Because nothing holds you accountable like the people whose opinions
you actually care about.

## How it works

1. **Add your crew** — everyone who's locking in.
2. **Pick a duration** (25 / 50 / 90 min or custom) and optional **stakes**
   ("first to fold buys Cane's").
3. **Stack 'em** — each person taps their name as their phone hits the pile.
4. **LOCK IN** — the top phone runs the timer face-up on the stack:
   - big countdown with a progress ring, screen kept awake (Wake Lock API),
   - optional **Stack guard**: uses the accelerometer — if anyone disturbs the
     stack, the phone flashes, vibrates, and sounds a siren,
   - **"someone folded"** button records casualties without stopping the session.
5. **Results & leaderboard** — minutes locked, survivors, streaks 🔥, and the
   Wall of Shame (most folds 💀). Stats persist in `localStorage` on the phone
   that runs the stack.

## Tech

Plain HTML/CSS/JS — no build step, no dependencies, matching the rest of this repo.
Installable as a PWA (manifest + service worker) so it works offline and can be added
to a home screen. Everything is stored locally; there's no backend and no accounts.

## Run it

Serve the repo root (`python3 -m http.server 8000`) and open
`http://localhost:8000/phonestack/`, or just open `phonestack/index.html`.
Once the site is on GitHub Pages it lives at `/JasperWebsite/phonestack/`.

Note: the service worker (offline mode) and motion permission require HTTPS —
they activate on GitHub Pages but are skipped on plain-HTTP local previews.
