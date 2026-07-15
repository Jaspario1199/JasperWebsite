/* ============ PhoneStack ============
 * Stack your phones. Lock in together.
 * Vanilla JS, no build step. State lives in localStorage.
 */
(() => {
  "use strict";

  const $ = (sel) => document.querySelector(sel);
  const RING_CIRC = 565.49; // 2π·90, matches styles.css

  const STATS_KEY = "phonestack.stats.v1";
  const SESSION_KEY = "phonestack.session.v1";
  const ROSTER_KEY = "phonestack.roster.v1";

  /* ---------- persistence ---------- */

  const load = (key, fallback) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };
  const save = (key, val) => {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* storage full/blocked */ }
  };

  // stats = { people: { name: {minutes, sessions, folds, survived, streak} }, sessions: n, totalMinutes: n }
  let stats = load(STATS_KEY, { people: {}, sessions: 0, totalMinutes: 0 });

  const personStats = (name) => {
    if (!stats.people[name]) {
      stats.people[name] = { minutes: 0, sessions: 0, folds: 0, survived: 0, streak: 0 };
    }
    return stats.people[name];
  };

  /* ---------- app state ---------- */

  let roster = load(ROSTER_KEY, []); // names carried between sessions
  let durationMin = 50;

  // session = { people, duration, stakes, endsAt, startedAt, folds:[{name,at}], disturbances, recorded }
  let session = load(SESSION_KEY, null);

  let tickHandle = null;
  let wakeLock = null;
  let audioCtx = null;
  let motionArmed = false;
  let lastAccel = null;
  let alarmUntil = 0;

  /* ---------- screens ---------- */

  const show = (id) => {
    document.querySelectorAll(".screen").forEach((s) => s.classList.remove("active"));
    $("#" + id).classList.add("active");
  };

  /* ---------- setup screen ---------- */

  const renderRoster = () => {
    const el = $("#roster");
    el.innerHTML = "";
    roster.forEach((name) => {
      const chip = document.createElement("span");
      chip.className = "person-chip";
      chip.textContent = name;
      const rm = document.createElement("button");
      rm.textContent = "✕";
      rm.setAttribute("aria-label", `remove ${name}`);
      rm.addEventListener("click", () => {
        roster = roster.filter((n) => n !== name);
        save(ROSTER_KEY, roster);
        renderRoster();
      });
      chip.appendChild(rm);
      el.appendChild(chip);
    });
    $("#btn-to-stacking").disabled = roster.length === 0;
  };

  $("#add-person-form").addEventListener("submit", (e) => {
    e.preventDefault();
    const input = $("#person-input");
    const name = input.value.trim();
    if (!name) return;
    if (!roster.some((n) => n.toLowerCase() === name.toLowerCase())) {
      roster.push(name);
      save(ROSTER_KEY, roster);
      renderRoster();
    }
    input.value = "";
    input.focus();
  });

  $("#duration-chips").addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (!chip) return;
    document.querySelectorAll("#duration-chips .chip").forEach((c) => c.classList.remove("active"));
    chip.classList.add("active");
    if (chip.dataset.min === "custom") {
      $("#custom-duration").classList.remove("hidden");
      durationMin = clampMinutes($("#custom-minutes").value);
    } else {
      $("#custom-duration").classList.add("hidden");
      durationMin = parseInt(chip.dataset.min, 10);
    }
  });

  const clampMinutes = (v) => Math.min(480, Math.max(1, parseInt(v, 10) || 60));
  $("#custom-minutes").addEventListener("input", (e) => { durationMin = clampMinutes(e.target.value); });

  $("#btn-to-stacking").addEventListener("click", () => {
    session = {
      people: [...roster],
      stacked: [],
      duration: durationMin,
      stakes: $("#stakes-input").value.trim(),
      startedAt: null,
      endsAt: null,
      folds: [],
      disturbances: 0,
      recorded: false,
    };
    renderStacking();
    show("screen-stacking");
  });

  $("#btn-leaderboard").addEventListener("click", () => { renderBoard(); show("screen-board"); });

  /* ---------- stacking screen ---------- */

  const renderStacking = () => {
    const btns = $("#stack-buttons");
    btns.innerHTML = "";
    session.people.forEach((name) => {
      const b = document.createElement("button");
      b.className = "stack-btn" + (session.stacked.includes(name) ? " stacked" : "");
      b.innerHTML = `<span>${escapeHtml(name)}</span><span class="state">${
        session.stacked.includes(name) ? "on the stack ✓" : "tap to stack 📱"
      }</span>`;
      b.addEventListener("click", () => {
        const i = session.stacked.indexOf(name);
        if (i === -1) session.stacked.push(name);
        else session.stacked.splice(i, 1);
        renderStacking();
      });
      btns.appendChild(b);
    });

    const visual = $("#stack-visual");
    visual.innerHTML = "";
    session.stacked.forEach((name, i) => {
      const p = document.createElement("div");
      p.className = "stacked-phone";
      p.style.setProperty("--tilt", `${((i * 7) % 9) - 4}deg`);
      p.style.transform = `rotate(${((i * 7) % 9) - 4}deg)`;
      p.textContent = name;
      visual.appendChild(p);
    });

    $("#btn-lock-in").disabled = session.stacked.length !== session.people.length;
  };

  $("#btn-back-setup").addEventListener("click", () => { session = null; show("screen-setup"); });

  $("#btn-lock-in").addEventListener("click", () => {
    // user gesture: safe point to create the AudioContext for later chimes/alarms
    ensureAudio();
    session.startedAt = Date.now();
    session.endsAt = session.startedAt + session.duration * 60 * 1000;
    save(SESSION_KEY, session);
    startFocus();
  });

  /* ---------- focus screen ---------- */

  const startFocus = () => {
    show("screen-focus");

    const stakes = $("#focus-stakes");
    if (session.stakes) {
      stakes.textContent = `⚠️ on the line: ${session.stakes}`;
      stakes.classList.remove("hidden");
    } else {
      stakes.classList.add("hidden");
    }

    renderFocusPeople();
    updateDisturb();
    requestWakeLock();
    tick();
    clearInterval(tickHandle);
    tickHandle = setInterval(tick, 250);
  };

  const renderFocusPeople = () => {
    const el = $("#focus-people");
    el.innerHTML = "";
    session.people.forEach((name) => {
      const folded = session.folds.some((f) => f.name === name);
      const span = document.createElement("span");
      span.className = "focus-person" + (folded ? " folded" : "");
      span.textContent = folded ? `${name} 💀` : name;
      el.appendChild(span);
    });
  };

  const tick = () => {
    if (!session || !session.endsAt) return;
    const left = session.endsAt - Date.now();
    if (left <= 0) {
      finishSession(true);
      return;
    }
    const mins = Math.floor(left / 60000);
    const secs = Math.floor((left % 60000) / 1000);
    $("#time-left").textContent = `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    const frac = left / (session.duration * 60 * 1000);
    $("#ring-fg").style.strokeDashoffset = String(RING_CIRC * (1 - frac));
    if (Date.now() > alarmUntil) document.body.classList.remove("alarming");
  };

  /* fold flow */
  $("#btn-fold").addEventListener("click", () => {
    const opts = $("#fold-options");
    opts.innerHTML = "";
    session.people
      .filter((name) => !session.folds.some((f) => f.name === name))
      .forEach((name) => {
        const b = document.createElement("button");
        b.className = "fold-option";
        b.textContent = `${name} grabbed their phone 😔`;
        b.addEventListener("click", () => recordFold(name));
        opts.appendChild(b);
      });
    $("#fold-modal").classList.remove("hidden");
  });

  $("#btn-fold-cancel").addEventListener("click", () => $("#fold-modal").classList.add("hidden"));

  const recordFold = (name) => {
    session.folds.push({ name, at: Date.now() });
    save(SESSION_KEY, session);
    $("#fold-modal").classList.add("hidden");
    renderFocusPeople();
    // whole stack folded → session busts
    if (session.folds.length >= session.people.length) finishSession(false);
  };

  $("#btn-abort").addEventListener("click", () => {
    if (confirm("End the session early? The stack takes the L.")) finishSession(false);
  });

  /* ---------- session end ---------- */

  const finishSession = (completed) => {
    clearInterval(tickHandle);
    tickHandle = null;
    releaseWakeLock();
    disarmMotion();
    document.body.classList.remove("alarming");
    $("#fold-modal").classList.add("hidden");

    if (!session.recorded) {
      session.recorded = true;
      const elapsedMs = Math.min(Date.now(), session.endsAt) - session.startedAt;
      const minutes = Math.max(0, Math.round(elapsedMs / 60000));

      stats.sessions += 1;
      stats.totalMinutes += minutes;
      session.people.forEach((name) => {
        const p = personStats(name);
        const folded = session.folds.some((f) => f.name === name);
        p.sessions += 1;
        p.minutes += minutes;
        if (folded) {
          p.folds += 1;
          p.streak = 0;
        } else if (completed) {
          p.survived += 1;
          p.streak += 1;
        }
      });
      save(STATS_KEY, stats);
    }
    localStorage.removeItem(SESSION_KEY);

    if (completed) playChime();
    renderResults(completed);
    show("screen-results");
  };

  const renderResults = (completed) => {
    const survivors = session.people.filter((n) => !session.folds.some((f) => f.name === n));
    const elapsedMs = Math.min(Date.now(), session.endsAt || Date.now()) - session.startedAt;
    const minutes = Math.max(0, Math.round(elapsedMs / 60000));

    $("#results-title").textContent = completed ? "LOCKED IN ✅" : "STACK BUSTED 💥";
    $("#results-sub").textContent = completed
      ? (session.folds.length === 0
          ? "flawless stack. not a single fold."
          : "made it to the end — with casualties.")
      : "the stack didn't survive. run it back.";

    $("#results-stats").innerHTML = `
      <div class="stat"><div class="num">${minutes}</div><div class="lbl">minutes locked</div></div>
      <div class="stat"><div class="num">${survivors.length}/${session.people.length}</div><div class="lbl">survived</div></div>
      <div class="stat"><div class="num ${session.folds.length ? "bad" : ""}">${session.folds.length}</div><div class="lbl">folds</div></div>
      <div class="stat"><div class="num ${session.disturbances ? "bad" : ""}">${session.disturbances}</div><div class="lbl">stack disturbed</div></div>
    `;

    const list = $("#results-people");
    list.innerHTML = "";
    session.people.forEach((name) => {
      const folded = session.folds.some((f) => f.name === name);
      const row = document.createElement("div");
      row.className = "result-row" + (folded ? " folded" : "");
      const verdict = folded
        ? `folded 💀${session.stakes ? " — owes: " + escapeHtml(session.stakes) : ""}`
        : (completed ? `survived · streak ${personStats(name).streak} 🔥` : "held on");
      row.innerHTML = `<span>${escapeHtml(name)}</span><span class="verdict">${verdict}</span>`;
      list.appendChild(row);
    });
  };

  $("#btn-again").addEventListener("click", () => { session = null; show("screen-setup"); });
  $("#btn-results-board").addEventListener("click", () => { renderBoard(); show("screen-board"); });

  /* ---------- leaderboard ---------- */

  const renderBoard = () => {
    const entries = Object.entries(stats.people);

    const fame = $("#board-fame");
    fame.innerHTML = "";
    entries
      .filter(([, p]) => p.minutes > 0 || p.streak > 0)
      .sort((a, b) => b[1].minutes - a[1].minutes)
      .slice(0, 8)
      .forEach(([name, p], i) => {
        fame.appendChild(boardRow(
          `${i === 0 ? "👑 " : ""}${name}`,
          `${fmtMinutes(p.minutes)} · streak ${p.streak}🔥`,
          i === 0
        ));
      });

    const shame = $("#board-shame");
    shame.innerHTML = "";
    entries
      .filter(([, p]) => p.folds > 0)
      .sort((a, b) => b[1].folds - a[1].folds)
      .slice(0, 8)
      .forEach(([name, p]) => {
        shame.appendChild(boardRow(name, `${p.folds} fold${p.folds === 1 ? "" : "s"} 💀`, false));
      });

    const totals = $("#board-totals");
    totals.innerHTML = "";
    if (stats.sessions > 0) {
      totals.appendChild(boardRow("sessions together", String(stats.sessions), false));
      totals.appendChild(boardRow("total time locked in", fmtMinutes(stats.totalMinutes), false));
    }
  };

  const boardRow = (label, val, first) => {
    const row = document.createElement("div");
    row.className = "board-row" + (first ? " first" : "");
    row.innerHTML = `<span>${escapeHtml(label)}</span><span class="val">${escapeHtml(val)}</span>`;
    return row;
  };

  const fmtMinutes = (m) => (m >= 60 ? `${Math.floor(m / 60)}h ${m % 60}m` : `${m}m`);

  $("#btn-board-back").addEventListener("click", () => show("screen-setup"));
  $("#btn-wipe").addEventListener("click", () => {
    if (confirm("Wipe all stats and history? No undo.")) {
      stats = { people: {}, sessions: 0, totalMinutes: 0 };
      save(STATS_KEY, stats);
      renderBoard();
    }
  });

  /* ---------- wake lock ---------- */

  const requestWakeLock = async () => {
    try {
      if ("wakeLock" in navigator) wakeLock = await navigator.wakeLock.request("screen");
    } catch { /* not fatal — screen may sleep */ }
  };
  const releaseWakeLock = () => {
    if (wakeLock) { wakeLock.release().catch(() => {}); wakeLock = null; }
  };
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible" && tickHandle) requestWakeLock();
  });

  /* ---------- stack guard (motion alarm) ---------- */

  $("#motion-guard").addEventListener("change", async (e) => {
    if (e.target.checked) {
      // iOS requires an explicit permission request from a user gesture
      if (typeof DeviceMotionEvent !== "undefined" &&
          typeof DeviceMotionEvent.requestPermission === "function") {
        try {
          const res = await DeviceMotionEvent.requestPermission();
          if (res !== "granted") { e.target.checked = false; return; }
        } catch { e.target.checked = false; return; }
      }
      armMotion();
    } else {
      disarmMotion();
    }
  });

  const onMotion = (ev) => {
    const a = ev.accelerationIncludingGravity;
    if (!a || a.x == null) return;
    if (lastAccel) {
      const delta = Math.abs(a.x - lastAccel.x) + Math.abs(a.y - lastAccel.y) + Math.abs(a.z - lastAccel.z);
      if (delta > 8 && motionArmed && Date.now() > alarmUntil) triggerAlarm();
    }
    lastAccel = { x: a.x, y: a.y, z: a.z };
  };

  const armMotion = () => {
    lastAccel = null;
    // grace period so setting the phone down doesn't instantly trip it
    setTimeout(() => { motionArmed = true; }, 3000);
    window.addEventListener("devicemotion", onMotion);
  };
  const disarmMotion = () => {
    motionArmed = false;
    lastAccel = null;
    window.removeEventListener("devicemotion", onMotion);
    const guard = $("#motion-guard");
    if (guard) guard.checked = false;
  };

  const triggerAlarm = () => {
    alarmUntil = Date.now() + 3000;
    if (session) {
      session.disturbances += 1;
      save(SESSION_KEY, session);
      updateDisturb();
    }
    document.body.classList.add("alarming");
    if (navigator.vibrate) navigator.vibrate([300, 100, 300, 100, 300]);
    playSiren();
  };

  const updateDisturb = () => {
    const el = $("#disturb-count");
    if (session && session.disturbances > 0) {
      el.classList.remove("hidden");
      el.querySelector("span").textContent = String(session.disturbances);
    } else {
      el.classList.add("hidden");
    }
  };

  /* ---------- audio ---------- */

  const ensureAudio = () => {
    try {
      if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      if (audioCtx.state === "suspended") audioCtx.resume();
    } catch { /* no audio */ }
  };

  const beep = (freq, start, dur, type = "sine", gain = 0.2) => {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const g = audioCtx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(gain, audioCtx.currentTime + start);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + start + dur);
    osc.connect(g).connect(audioCtx.destination);
    osc.start(audioCtx.currentTime + start);
    osc.stop(audioCtx.currentTime + start + dur);
  };

  const playChime = () => {
    ensureAudio();
    beep(523.25, 0, 0.5);      // C5
    beep(659.25, 0.15, 0.5);   // E5
    beep(783.99, 0.3, 0.8);    // G5
  };

  const playSiren = () => {
    ensureAudio();
    for (let i = 0; i < 6; i++) beep(i % 2 ? 660 : 880, i * 0.25, 0.22, "square", 0.3);
  };

  /* ---------- misc ---------- */

  const escapeHtml = (s) =>
    String(s).replace(/[&<>"']/g, (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  /* ---------- service worker ---------- */

  if ("serviceWorker" in navigator && location.protocol === "https:") {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }

  /* ---------- boot ---------- */

  renderRoster();

  // resume or settle a session that was in flight (e.g. page reloaded mid lock-in)
  if (session && session.endsAt) {
    if (Date.now() < session.endsAt) {
      startFocus();
    } else {
      finishSession(true);
    }
  } else {
    session = null;
    show("screen-setup");
  }
})();
