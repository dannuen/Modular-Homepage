// src/modules/pomodoro/timer.ts
var LIMITS = { focus: [1, 180], short: [1, 60], long: [1, 120], cycles: [1, 12] };
var PHASES = {
  focus: { name: "Focus", short: "Focus" },
  short: { name: "Short break", short: "Short" },
  long: { name: "Long break", short: "Long" }
};
var STARTERS = [
  { id: "classic", name: "Classic", focus: 25, short: 5, long: 15, cycles: 4 },
  { id: "quick", name: "Quick", focus: 15, short: 3, long: 10, cycles: 4 },
  { id: "deep", name: "Deep work", focus: 50, short: 10, long: 30, cycles: 2 }
];
var CHARACTERS = ["tomato", "avocado", "clock"];
var EMOJI = { tomato: "🍅", avocado: "🥑", clock: "⏰" };
var PLUGIN_ID = "modular-homepage";
var FILE = "pomodoro.json";
var AWAY = 2 * 6e4;
var MIN = 6e4;
var clamp = (v, [lo, hi], d) => {
  const n2 = Math.round(Number(v));
  return Number.isFinite(n2) ? Math.max(lo, Math.min(hi, n2)) : d;
};
var dayOf = (t) => {
  const d = new Date(t);
  return d.getFullYear() + "-" + String(d.getMonth() + 1).padStart(2, "0") + "-" + String(d.getDate()).padStart(2, "0");
};
var newId = () => "p" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
var RECENT = 6;
var cleanName = (v) => String(v ?? "").replace(/\s+/g, " ").trim().slice(0, 80);
function cleanPreset(p, i) {
  const s2 = STARTERS[0];
  return {
    id: typeof p?.id === "string" && p.id ? p.id : "p" + i,
    name: typeof p?.name === "string" && p.name.trim() ? p.name.trim().slice(0, 30) : "Preset " + (i + 1),
    focus: clamp(p?.focus, LIMITS.focus, s2.focus),
    short: clamp(p?.short, LIMITS.short, s2.short),
    long: clamp(p?.long, LIMITS.long, s2.long),
    cycles: clamp(p?.cycles, LIMITS.cycles, s2.cycles)
  };
}
function defaults() {
  const presets = STARTERS.map((p) => ({ ...p }));
  return {
    version: 1,
    character: "tomato",
    presets,
    presetId: presets[0].id,
    sound: true,
    autoStart: false,
    timer: { phase: "focus", done: 0, status: "idle", endsAt: 0, left: presets[0].focus * MIN, total: presets[0].focus * MIN, finished: null, today: { day: dayOf(Date.now()), count: 0 } },
    session: null,
    recent: []
  };
}
function clean(raw) {
  const d = defaults();
  if (!raw || typeof raw !== "object") return d;
  const seen = /* @__PURE__ */ new Set();
  const presets = Array.isArray(raw.presets) ? raw.presets.map(cleanPreset).filter((p) => !seen.has(p.id) && seen.add(p.id)) : d.presets;
  if (!presets.length) presets.push(...d.presets);
  const t = raw.timer || {};
  const phase = t.phase === "short" || t.phase === "long" ? t.phase : "focus";
  const status = t.status === "running" || t.status === "paused" ? t.status : "idle";
  const num = (v, dflt) => Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : dflt;
  const preset = presets.find((p) => p.id === raw.presetId) || presets[0];
  const length = preset[phase] * MIN;
  const s2 = raw.session;
  const session = s2 && typeof s2 === "object" && /^pomo-[a-z0-9]+$/i.test(String(s2.id)) && cleanName(s2.name) && /^\d{4}-\d{2}-\d{2}$/.test(String(s2.day)) ? { id: s2.id, name: cleanName(s2.name), day: s2.day, start: num(s2.start, Date.now()), end: num(s2.end, num(s2.start, Date.now())), cycles: clamp(s2.cycles, [0, 999], 0), focusMs: num(s2.focusMs, 0) } : null;
  const recent = Array.isArray(raw.recent) ? [...new Set(raw.recent.map(cleanName).filter(Boolean))].slice(0, RECENT) : [];
  return {
    version: 1,
    character: CHARACTERS.includes(raw.character) ? raw.character : d.character,
    presets,
    presetId: preset.id,
    sound: raw.sound !== false,
    autoStart: raw.autoStart === true,
    timer: {
      phase,
      status,
      done: clamp(t.done, [0, LIMITS.cycles[1]], 0),
      endsAt: num(t.endsAt, 0),
      left: num(t.left, length),
      total: num(t.total, length) || length,
      finished: t.finished === "focus" || t.finished === "short" || t.finished === "long" ? t.finished : null,
      today: { day: typeof t.today?.day === "string" ? t.today.day : d.timer.today.day, count: clamp(t.today?.count, [0, 999], 0) }
    },
    session,
    recent
  };
}
var PomodoroTimer = class {
  constructor(app, path, logConfig) {
    this.app = app;
    this.path = path;
    this.logConfig = logConfig;
    this.ready = this.load();
  }
  data = defaults();
  ready;
  listeners = /* @__PURE__ */ new Set();
  tickId = 0;
  saveId = 0;
  audio = null;
  disposed = false;
  saving = Promise.resolve();
  logging = Promise.resolve();
  // ---------- Reading ----------
  get preset() {
    return this.data.presets.find((p) => p.id === this.data.presetId) || this.data.presets[0];
  }
  get timer() {
    return this.data.timer;
  }
  lengthOf(phase) {
    return this.preset[phase] * MIN;
  }
  remaining(now2 = Date.now()) {
    const t = this.timer;
    return t.status === "running" ? Math.max(0, t.endsAt - now2) : t.left;
  }
  progress(now2 = Date.now()) {
    const t = this.timer;
    return t.total > 0 ? Math.max(0, Math.min(1, 1 - this.remaining(now2) / t.total)) : 0;
  }
  todayCount() {
    return this.timer.today.day === dayOf(Date.now()) ? this.timer.today.count : 0;
  }
  subscribe(fn) {
    this.listeners.add(fn);
    return () => {
      this.listeners.delete(fn);
    };
  }
  // ---------- The timer ----------
  start() {
    const t = this.timer;
    if (t.status === "running") return;
    this.unlockAudio();
    if (t.left <= 0) t.left = t.total = this.lengthOf(t.phase);
    t.endsAt = Date.now() + t.left;
    t.status = "running";
    t.finished = null;
    this.changed();
  }
  pause() {
    const t = this.timer;
    if (t.status !== "running") return;
    t.left = this.remaining();
    t.status = "paused";
    this.changed();
  }
  // Back to the start of this phase, stopped.
  reset() {
    this.stopAt(this.timer.phase);
  }
  // Straight to the next phase (a skipped focus still moves the round on, but is not counted for today; the minutes
  // it ran count for the session).
  skip() {
    this.finish(false, Date.now());
  }
  // Pick a phase by hand (the tabs).
  choose(phase) {
    if (this.timer.status !== "running") this.stopAt(phase);
  }
  stopAt(phase) {
    const t = this.timer;
    t.phase = phase;
    t.status = "idle";
    t.left = t.total = this.lengthOf(phase);
    t.endsAt = 0;
    t.finished = null;
    this.changed();
  }
  // The phase is over: on to the next. `natural` = its time ran out (counts, chimes, may start the next by itself).
  finish(natural, at, quiet = false) {
    const t = this.timer, p = this.preset, ended = t.phase;
    if (ended === "focus") {
      this.addFocus(natural ? t.total : t.total - this.remaining(at), at, natural);
      if (natural) {
        const day = dayOf(at);
        t.today = t.today.day === day ? { day, count: t.today.count + 1 } : { day, count: 1 };
      }
      t.done = Math.min(t.done + 1, LIMITS.cycles[1]);
      t.phase = t.done >= p.cycles ? "long" : "short";
    } else {
      if (ended === "long" || t.done >= p.cycles) t.done = 0;
      t.phase = "focus";
    }
    t.left = t.total = this.lengthOf(t.phase);
    t.finished = natural ? ended : null;
    const auto = natural && !quiet && this.data.autoStart && !(t.phase === "focus" && !this.data.session);
    if (auto) {
      t.status = "running";
      t.endsAt = at + t.total;
      t.finished = null;
    } else {
      t.status = "idle";
      t.endsAt = 0;
    }
    if (natural && !quiet) this.announce(ended, t.phase);
    this.changed();
  }
  tick = () => {
    const t = this.timer;
    if (t.status !== "running") {
      this.syncTick();
      return;
    }
    const now2 = Date.now();
    if (now2 >= t.endsAt) this.finish(true, t.endsAt, now2 - t.endsAt > AWAY);
  };
  // One interval for the whole plugin, only while the timer runs.
  syncTick() {
    const want = !this.disposed && this.timer.status === "running";
    if (want && !this.tickId) this.tickId = window.setInterval(this.tick, 500);
    if (!want && this.tickId) {
      window.clearInterval(this.tickId);
      this.tickId = 0;
    }
  }
  // ---------- Sessions ----------
  // Start a session (Start asked for its name). The same name as the running session carries it on.
  beginSession(name) {
    const clean2 = cleanName(name);
    if (!clean2 || clean2 === this.data.session?.name) return;
    this.data.session = this.newSession(clean2, Date.now());
    this.remember(clean2);
    this.changed();
  }
  renameSession(name) {
    const s2 = this.data.session, clean2 = cleanName(name);
    if (!s2 || !clean2 || clean2 === s2.name) return;
    s2.name = clean2;
    this.remember(clean2);
    if (s2.cycles || s2.focusMs) this.log(s2);
    this.changed();
  }
  // End the session: a focus under way counts the minutes it ran; the timer goes back to a new round's first focus.
  endSession() {
    const t = this.timer, s2 = this.data.session;
    if (!s2) return;
    const now2 = Date.now();
    if (t.phase === "focus" && t.status !== "idle") this.addFocus(t.total - this.remaining(now2), now2, false);
    this.data.session = null;
    t.done = 0;
    this.stopAt("focus");
  }
  newSession(name, start, day = dayOf(start)) {
    return { id: "pomo-" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6), name, day, start, end: start, cycles: 0, focusMs: 0 };
  }
  remember(name) {
    this.data.recent = [name, ...this.data.recent.filter((n2) => n2 !== name)].slice(0, RECENT);
  }
  // A focus that ended (`cycle`) or stopped part-way (its minutes only, if at least one): added to the session and
  // written to the daily note. Past midnight the session goes on in a new line of the new day's note.
  addFocus(ms, at, cycle) {
    if (!cycle && ms < MIN) return;
    let s2 = this.data.session;
    if (!s2) s2 = this.data.session = this.newSession("Focus", at - ms);
    if (dayOf(at) !== s2.day) s2 = this.data.session = this.newSession(s2.name, at - ms, dayOf(at));
    if (cycle) s2.cycles++;
    s2.focusMs += ms;
    s2.end = at;
    this.log(s2);
  }
  // One write at a time, once Obsidian has finished starting (the daily note may have to be made from its template).
  log(s2) {
    const cfg = this.logConfig();
    if (!cfg) return;
    const entry = { ...s2 };
    this.logging = this.logging.then(() => new Promise((done) => this.app.workspace.onLayoutReady(done))).then(() => writeEntry(this.app, cfg, entry)).catch((err) => {
      console.error("Modular Homepage: could not write the focus log", err);
      new import_obsidian8.Notice("Pomodoro: could not write the session to the daily note");
    });
  }
  // ---------- Settings and presets ----------
  set(key, value) {
    this.data[key] = value;
    this.changed();
  }
  usePreset(id) {
    if (!this.data.presets.some((p) => p.id === id) || id === this.data.presetId) return;
    this.data.presetId = id;
    this.lengthsChanged();
  }
  editPreset(id, patch) {
    const p = this.data.presets.find((q) => q.id === id);
    if (!p) return;
    if (patch.name !== void 0) p.name = patch.name.trim().slice(0, 30) || p.name;
    for (const key of ["focus", "short", "long", "cycles"])
      if (patch[key] !== void 0) p[key] = clamp(patch[key], LIMITS[key], p[key]);
    if (id === this.data.presetId) this.lengthsChanged();
    else this.changed();
  }
  // A new preset: a copy of the one in use, then in use itself.
  addPreset() {
    const from = this.preset, names = new Set(this.data.presets.map((p2) => p2.name));
    let n2 = this.data.presets.length + 1;
    while (names.has("Preset " + n2)) n2++;
    const p = { ...from, id: newId(), name: "Preset " + n2 };
    this.data.presets.push(p);
    this.data.presetId = p.id;
    this.lengthsChanged();
    return p;
  }
  deletePreset(id) {
    const list2 = this.data.presets;
    const i = list2.findIndex((p) => p.id === id);
    if (i < 0 || list2.length <= 1) return;
    list2.splice(i, 1);
    if (this.data.presetId === id) {
      this.data.presetId = list2[Math.min(i, list2.length - 1)].id;
      this.lengthsChanged();
    } else this.changed();
  }
  // New lengths: a stopped timer shows them at once; a running or paused one keeps its phase.
  lengthsChanged() {
    const t = this.timer;
    if (t.status === "idle") t.left = t.total = this.lengthOf(t.phase);
    this.changed();
  }
  // ---------- Saving ----------
  async load() {
    try {
      if (await this.app.vault.adapter.exists(this.path)) this.data = clean(JSON.parse(await this.app.vault.adapter.read(this.path)));
    } catch (err) {
      console.error("Modular Homepage: could not read " + this.path, err);
    }
    if (this.disposed) return;
    const t = this.timer;
    if (t.status === "running" && Date.now() >= t.endsAt) this.finish(true, t.endsAt, true);
    this.syncTick();
    this.emit();
  }
  changed() {
    this.syncTick();
    this.scheduleSave();
    this.emit();
  }
  emit() {
    for (const fn of [...this.listeners]) {
      try {
        fn();
      } catch (err) {
        console.error("Modular Homepage: pomodoro view failed", err);
      }
    }
  }
  scheduleSave() {
    window.clearTimeout(this.saveId);
    this.saveId = window.setTimeout(() => {
      this.saveId = 0;
      this.save();
    }, 400);
  }
  save() {
    const snapshot = JSON.stringify(this.data, null, "	");
    this.saving = this.saving.then(() => this.app.vault.adapter.write(this.path, snapshot)).catch((err) => {
      console.error("Modular Homepage: could not save " + this.path, err);
    });
    return this.saving;
  }
  // ---------- Chime and notice ----------
  announce(ended, next) {
    const icon = EMOJI[this.data.character];
    const text = ended === "focus" ? "Focus done. Time for a " + PHASES[next].name.toLowerCase() + "." : PHASES[ended].name + " over. Back to focus.";
    new import_obsidian8.Notice(icon + " " + text + (this.data.autoStart ? "" : " Press Start when you're ready."), 8e3);
    if (this.data.sound) this.chime(ended === "focus" ? [784, 988, 1319] : [1319, 988, 784]);
  }
  // The audio has to be unlocked by a click (Start) before a later chime can play.
  unlockAudio() {
    try {
      this.audio ??= new AudioContext();
      if (this.audio.state === "suspended") void this.audio.resume();
    } catch {
      this.audio = null;
    }
  }
  // An 8-bit chime: a few short square-wave notes.
  chime(notes) {
    try {
      this.unlockAudio();
      const ctx = this.audio;
      if (!ctx) return;
      const start = ctx.currentTime + 0.02;
      notes.forEach((freq, i) => {
        const at = start + i * 0.14, osc = ctx.createOscillator(), gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(1e-4, at);
        gain.gain.exponentialRampToValueAtTime(0.06, at + 0.01);
        gain.gain.exponentialRampToValueAtTime(1e-4, at + 0.13);
        osc.connect(gain).connect(ctx.destination);
        osc.start(at);
        osc.stop(at + 0.14);
      });
    } catch (err) {
      console.error("Modular Homepage: could not play the chime", err);
    }
  }
  dispose() {
    this.disposed = true;
    this.syncTick();
    if (this.saveId) {
      window.clearTimeout(this.saveId);
      this.saveId = 0;
      void this.save();
    }
    this.listeners.clear();
    void this.audio?.close().catch(() => {
    });
    this.audio = null;
  }
};
var timers = /* @__PURE__ */ new WeakMap();
function pomodoroFor(app) {
  const plugin = app.plugins?.getPlugin?.(PLUGIN_ID);
  const owner = plugin || app;
  let timer = timers.get(owner);
  if (!timer) {
    const dir = plugin?.manifest?.dir || app.vault.configDir + "/plugins/" + PLUGIN_ID;
    const config = () => plugin?.settings?.config ?? null;
    const made = timer = new PomodoroTimer(app, dir + "/" + FILE, config);
    timers.set(owner, made);
    plugin?.register(() => {
      made.dispose();
      timers.delete(owner);
    });
  }
  return timer;
}

