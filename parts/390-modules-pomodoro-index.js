// src/modules/pomodoro/index.ts
var NS2 = "http://www.w3.org/2000/svg";
var CHARACTERS2 = [["tomato", "Tomato"], ["avocado", "Avocado"], ["clock", "Clock"]];
var PHASE_LIST = ["focus", "short", "long"];
var BAR = 20;
var GEAR = ["....o....", ".o.ooo.o.", "..ooooo..", ".oo...oo.", "ooo...ooo", ".oo...oo.", "..ooooo..", ".o.ooo.o.", "....o...."];
var ZED = ["ooooo", "...o.", "..o..", ".o...", "ooooo"];
var STAR = [".o.", "ooo", ".o."];
function pixels(doc, grid, cls, palette = COLORS) {
  const rows = grid.map((r) => typeof r === "string" ? [...r] : r);
  const h = rows.length, w = rows[0]?.length || 0;
  const svg = doc.createElementNS(NS2, "svg");
  svg.setAttribute("viewBox", "0 0 " + w + " " + h);
  svg.setAttribute("class", cls);
  svg.setAttribute("shape-rendering", "crispEdges");
  svg.setAttribute("aria-hidden", "true");
  rows.forEach((row, y) => {
    for (let x = 0; x < w; ) {
      const key = row[x];
      let run = 1;
      while (x + run < w && row[x + run] === key) run++;
      if (key !== "." && key in palette) {
        const r = doc.createElementNS(NS2, "rect");
        r.setAttribute("x", String(x));
        r.setAttribute("y", String(y));
        r.setAttribute("width", String(run));
        r.setAttribute("height", "1");
        if (palette[key]) r.setAttribute("fill", palette[key]);
        else r.setAttribute("class", "m-pomo-" + key);
        svg.append(r);
      }
      x += run;
    }
  });
  return svg;
}
function clockDigits(doc, text) {
  const g = digits(text);
  let x = 0;
  for (const ch of text) {
    if (ch === ":") {
      for (const row of g) if (row[x] === "#") row[x] = "c";
    }
    x += (ch === ":" ? 1 : 5) + 1;
  }
  return pixels(doc, g.map((row) => row.map((k) => k === "#" ? "d" : k)), "m-pomo-digits", { d: "", c: "" });
}
var fmt = (ms) => {
  const s2 = Math.ceil(ms / 1e3);
  return String(Math.floor(s2 / 60)).padStart(2, "0") + ":" + String(s2 % 60).padStart(2, "0");
};
var spoken = (ms) => {
  const m = Math.ceil(ms / 6e4);
  return m <= 1 ? "under a minute" : m + " minutes";
};
function render(body2, ctx) {
  const { life, store, ui } = ctx;
  const doc = body2.ownerDocument;
  const timer = pomodoroFor(ctx.app);
  const el = (parent, tag, cls = "", text) => {
    const node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (text !== void 0) node.textContent = text;
    parent?.append(node);
    return node;
  };
  const button = (parent, cls, text, title, onClick) => {
    const b = el(parent, "button", "m-pomo-btn " + cls, text);
    b.type = "button";
    b.title = title;
    b.setAttribute("aria-label", title);
    b.addEventListener("click", onClick);
    return b;
  };
  ui.section(body2, "Pomodoro");
  const shell = el(body2, "div", "m-pomo-shell hp-card hp-grow");
  const note = ui.bar(shell).label;
  const card = el(shell, "div", "m-pomo");
  const face2 = el(card, "div", "m-pomo-face");
  const top = el(face2, "div", "m-pomo-top");
  const tabs = el(top, "div", "m-pomo-tabs");
  tabs.setAttribute("role", "group");
  tabs.setAttribute("aria-label", "Phase");
  const tabBtns = PHASE_LIST.map((p) => {
    const b = button(tabs, "m-pomo-tab", PHASES[p].short, PHASES[p].name, () => timer.choose(p));
    b.dataset.phase = p;
    return b;
  });
  const gear = button(top, "m-pomo-gear", "", "Pomodoro settings", () => setOpen(true));
  gear.append(pixels(doc, GEAR, "m-pomo-gear-ico", { o: "" }));
  const stage = el(face2, "div", "m-pomo-stage");
  const hero = el(stage, "div", "m-pomo-hero");
  const spriteBox = el(hero, "div", "m-pomo-sprite");
  const zzz = el(hero, "div", "m-pomo-zzz");
  for (let i = 0; i < 2; i++) zzz.append(pixels(doc, ZED, "m-pomo-z", { o: "" }));
  const stars = el(hero, "div", "m-pomo-stars");
  for (let i = 0; i < 3; i++) stars.append(pixels(doc, STAR, "m-pomo-star", { o: "" }));
  const readout = el(stage, "div", "m-pomo-readout");
  const digitsBox = el(readout, "div", "m-pomo-time");
  digitsBox.setAttribute("role", "timer");
  const status = el(readout, "div", "m-pomo-status");
  const sessionBtn = button(readout, "m-pomo-session", "", "Rename this session", () => openAsk("rename"));
  const sessionName = el(sessionBtn, "b");
  const sessionMeta = el(sessionBtn, "span");
  const bar = el(readout, "div", "m-pomo-bar");
  bar.setAttribute("aria-hidden", "true");
  const cells = Array.from({ length: BAR }, () => el(bar, "i"));
  const round = el(face2, "div", "m-pomo-round");
  const dots = el(round, "div", "m-pomo-dots");
  const today = el(round, "div", "m-pomo-today");
  const ask = el(face2, "div", "m-pomo-ask");
  ask.setAttribute("role", "group");
  ask.setAttribute("aria-label", "Name this session");
  const askLabel = el(ask, "label", "m-pomo-label", "What are you working on?");
  const askRow = el(ask, "div", "m-pomo-ask-row");
  const askInput = el(askRow, "input", "m-pomo-input");
  askInput.type = "text";
  askInput.maxLength = 80;
  askInput.spellcheck = false;
  askInput.placeholder = "Session name";
  askInput.id = "m-pomo-ask-" + Math.random().toString(36).slice(2, 8);
  askLabel.htmlFor = askInput.id;
  const askGo = button(askRow, "is-main", "Start", "Start", () => submitAsk());
  button(askRow, "", "Cancel", "Cancel", () => closeAsk(true));
  const recentBox = el(ask, "div", "m-pomo-recent");
  askInput.addEventListener("input", () => askInput.classList.remove("is-empty"));
  askInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitAsk();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      closeAsk(true);
    }
  });
  const ctrls = el(face2, "div", "m-pomo-ctrls");
  const mainBtn = button(ctrls, "is-main", "Start", "Start", () => {
    const t = timer.timer;
    if (t.status === "running") timer.pause();
    else if (t.phase === "focus" && t.status === "idle" && !timer.data.session) openAsk("start");
    else timer.start();
  });
  button(ctrls, "", "Reset", "Start this phase again", () => timer.reset());
  button(ctrls, "", "Skip", "Go to the next phase", () => timer.skip());
  const endBtn = button(ctrls, "", "End", "End this session (it stays in today's note)", () => timer.endSession());
  const presets = el(face2, "div", "m-pomo-presets");
  presets.setAttribute("role", "group");
  presets.setAttribute("aria-label", "Presets");
  const set = el(card, "div", "m-pomo-set");
  set.setAttribute("role", "group");
  set.setAttribute("aria-label", "Pomodoro settings");
  const setHead = el(set, "div", "m-pomo-set-head");
  el(setHead, "b", "", "Settings");
  const doneBtn = button(setHead, "is-main", "Done", "Close the settings", () => setOpen(false));
  const row = (label) => {
    const r = el(set, "div", "m-pomo-row");
    el(r, "span", "m-pomo-label", label);
    return el(r, "div", "m-pomo-ctl");
  };
  const charCtl = row("Character");
  const charBtns = CHARACTERS2.map(([id, name]) => {
    const b = button(charCtl, "m-pomo-char", "", name, () => timer.set("character", id));
    b.append(pixels(doc, character(id, "idle", 0.1), "m-pomo-char-art"));
    el(b, "span", "", name);
    return [id, b];
  });
  const presetCtl = row("Presets");
  presetCtl.classList.add("m-pomo-presets");
  const fields = el(set, "div", "m-pomo-fields");
  const nameRow = el(fields, "label", "m-pomo-field m-pomo-field-name");
  el(nameRow, "span", "m-pomo-label", "Name");
  const nameInput = el(nameRow, "input", "m-pomo-input");
  nameInput.type = "text";
  nameInput.maxLength = 30;
  nameInput.spellcheck = false;
  nameInput.addEventListener("input", () => {
    if (nameInput.value.trim()) timer.editPreset(timer.preset.id, { name: nameInput.value });
  });
  nameInput.addEventListener("blur", () => {
    nameInput.value = timer.preset.name;
  });
  const NUMBERS = [["focus", "Focus", "min"], ["short", "Short break", "min"], ["long", "Long break", "min"], ["cycles", "Long break after", "focus"]];
  const inputs = /* @__PURE__ */ new Map();
  for (const [key, label, unit] of NUMBERS) {
    const f = el(fields, "div", "m-pomo-field");
    el(f, "span", "m-pomo-label", label);
    const step = el(f, "div", "m-pomo-step");
    const edit = (n2) => {
      const patch = {};
      patch[key] = n2;
      timer.editPreset(timer.preset.id, patch);
    };
    const nudge = (by) => edit(timer.preset[key] + by);
    button(step, "m-pomo-mini", "−", label + ": less", () => nudge(-1));
    const input = el(step, "input", "m-pomo-input m-pomo-num");
    input.type = "text";
    input.inputMode = "numeric";
    input.setAttribute("aria-label", label + " (" + (unit === "min" ? "minutes" : "focus sessions") + ")");
    const commit = () => {
      const n2 = parseInt(input.value, 10);
      if (Number.isFinite(n2)) edit(n2);
      input.value = String(timer.preset[key]);
    };
    input.addEventListener("change", commit);
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        commit();
      }
    });
    button(step, "m-pomo-mini", "+", label + ": more", () => nudge(1));
    el(f, "span", "m-pomo-unit", unit);
    input.title = LIMITS[key][0] + "–" + LIMITS[key][1];
    inputs.set(key, input);
  }
  const presetActs = el(set, "div", "m-pomo-row m-pomo-row-acts");
  button(presetActs, "", "+ New preset", "Add a preset (a copy of this one)", () => {
    timer.addPreset();
    nameInput.focus();
    nameInput.select();
  });
  let armed = false;
  const disarm = () => {
    armed = false;
    delBtn.textContent = "Delete";
    delBtn.classList.remove("is-armed");
  };
  const delBtn = button(presetActs, "is-danger", "Delete", "Delete this preset", () => {
    if (!armed) {
      armed = true;
      delBtn.textContent = "Sure?";
      delBtn.classList.add("is-armed");
      life.timeout(disarm, 3e3);
      return;
    }
    disarm();
    timer.deletePreset(timer.preset.id);
  });
  const switchRow = (label, key) => {
    const r = el(set, "div", "m-pomo-row");
    el(r, "span", "m-pomo-label", label);
    const b = button(r, "m-pomo-switch", "", label, () => timer.set(key, !timer.data[key]));
    b.setAttribute("role", "switch");
    el(b, "i");
    return [key, b];
  };
  const switches = [switchRow("Chime when a phase ends", "sound"), switchRow("Start the next phase by itself", "autoStart")];
  const hint = el(set, "p", "m-pomo-hint");
  function setOpen(open, focus = true) {
    store.settingsOpen = open;
    card.classList.toggle("is-set", open);
    face2.hidden = open;
    set.hidden = !open;
    gear.setAttribute("aria-expanded", String(open));
    if (open) fill(true);
    if (focus) (open ? doneBtn : gear).focus({ preventScroll: true });
  }
  life.on(doc, "keydown", (e) => {
    if (e.key === "Escape" && store.settingsOpen && card.contains(doc.activeElement)) setOpen(false);
  });
  function openAsk(mode, focus = true) {
    if (mode === "rename" && !timer.data.session) return;
    store.ask = mode;
    const current = timer.data.session?.name || "";
    askLabel.textContent = mode === "start" ? "What are you working on?" : "Rename this session";
    askGo.textContent = mode === "start" ? "Start" : "Save";
    askGo.setAttribute("aria-label", askGo.textContent);
    askGo.title = askGo.textContent;
    askInput.value = mode === "rename" ? current : "";
    askInput.classList.remove("is-empty");
    recentBox.replaceChildren();
    for (const name of timer.data.recent.filter((n2) => n2 !== current)) button(recentBox, "m-pomo-chip", name, (mode === "start" ? "Start " : "Rename to ") + name, () => {
      askInput.value = name;
      submitAsk();
    });
    recentBox.hidden = !recentBox.childElementCount;
    ask.hidden = false;
    ctrls.hidden = presets.hidden = true;
    if (focus) {
      askInput.focus({ preventScroll: true });
      askInput.select();
    }
  }
  function closeAsk(refocus) {
    store.ask = null;
    ask.hidden = true;
    ctrls.hidden = presets.hidden = false;
    if (refocus) mainBtn.focus({ preventScroll: true });
  }
  function submitAsk() {
    const name = askInput.value.trim();
    if (!name) {
      askInput.classList.add("is-empty");
      askInput.focus();
      return;
    }
    if (store.ask === "rename") timer.renameSession(name);
    else {
      timer.beginSession(name);
      timer.start();
    }
    closeAsk(true);
  }
  let shown = { time: "", sprite: "", presets: "", dots: "", presetId: "" };
  function moodOf() {
    const t = timer.timer;
    if (t.status === "running") return t.phase === "focus" ? "focus" : "happy";
    if (t.status === "paused") return "sleep";
    return t.finished ? "happy" : "idle";
  }
  function tick() {
    const left = timer.remaining(), progress = timer.progress(), t = timer.timer;
    const text = fmt(left);
    if (text !== shown.time) {
      shown.time = text;
      digitsBox.replaceChildren(clockDigits(doc, text));
      if (text.endsWith(":00") || t.status !== "running") digitsBox.setAttribute("aria-label", PHASES[t.phase].name + ": " + spoken(left) + " left");
    }
    const lit = Math.round(progress * BAR);
    cells.forEach((c, i) => c.classList.toggle("is-on", i < lit));
    const who = timer.data.character, mood = moodOf();
    const turn = who === "clock" ? Math.floor(progress * 48) / 48 : 0;
    const key = who + mood + turn;
    if (key !== shown.sprite) {
      shown.sprite = key;
      spriteBox.replaceChildren(pixels(doc, character(who, mood, turn), "m-pomo-art", { ...COLORS, e: "" }));
    }
  }
  function chips(parent, cls) {
    parent.querySelectorAll(":scope > .m-pomo-chip").forEach((n2) => n2.remove());
    for (const p of timer.data.presets) {
      const on = p.id === timer.data.presetId;
      const b = button(parent, "m-pomo-chip " + cls + (on ? " is-on" : ""), p.name, p.name + ": " + summary(p), () => timer.usePreset(p.id));
      b.setAttribute("aria-pressed", String(on));
    }
  }
  const summary = (p) => p.focus + " min focus, " + p.short + " / " + p.long + " min breaks, long break after " + p.cycles;
  function fill(force) {
    const p = timer.preset;
    if (force || doc.activeElement !== nameInput) nameInput.value = p.name;
    for (const [key, input] of inputs) if (force || doc.activeElement !== input) input.value = String(p[key]);
    delBtn.disabled = timer.data.presets.length <= 1;
  }
  function update() {
    const t = timer.timer, p = timer.preset, d = timer.data;
    card.dataset.phase = t.phase;
    card.dataset.status = t.status;
    card.dataset.mood = moodOf();
    card.dataset.character = d.character;
    for (const b of tabBtns) {
      const on = b.dataset.phase === t.phase;
      b.classList.toggle("is-on", on);
      b.setAttribute("aria-pressed", String(on));
      b.disabled = t.status === "running" && !on;
      b.title = t.status === "running" && !on ? "Pause first to change the phase" : PHASES[b.dataset.phase].name;
    }
    mainBtn.textContent = t.status === "running" ? "Pause" : t.status === "paused" ? "Resume" : "Start";
    mainBtn.setAttribute("aria-label", mainBtn.textContent);
    mainBtn.title = mainBtn.textContent;
    status.textContent = t.status === "running" ? t.phase === "focus" ? "Focusing" : t.phase === "short" ? "Short break" : "Long break" : t.status === "paused" ? "Paused" : t.finished === "focus" ? t.phase === "long" ? "Long break time!" : "Break time!" : t.finished ? "Back to focus!" : "Ready: " + PHASES[t.phase].name.toLowerCase();
    const s2 = d.session;
    sessionBtn.hidden = !s2;
    endBtn.hidden = !s2;
    if (s2) {
      sessionName.textContent = s2.name;
      sessionMeta.textContent = s2.cycles + (s2.cycles === 1 ? " cycle" : " cycles") + " · " + duration(s2.focusMs);
      sessionBtn.title = "Rename “" + s2.name + "”";
    }
    if (!s2 && store.ask === "rename") closeAsk(false);
    const inRound = t.phase === "focus" ? Math.min(t.done + 1, p.cycles) : Math.min(t.done, p.cycles);
    if (note) note.textContent = (s2 ? s2.name : p.name) + " · " + (t.phase === "long" ? "long break" : t.phase === "focus" ? "focus " + inRound + " of " + p.cycles : "short break, " + inRound + " of " + p.cycles + " done");
    const dotKey = d.character + t.done + "/" + p.cycles + t.phase + t.status;
    if (dotKey !== shown.dots) {
      shown.dots = dotKey;
      dots.replaceChildren();
      dots.setAttribute("aria-label", Math.min(t.done, p.cycles) + " of " + p.cycles + " focus sessions done this round");
      for (let i = 0; i < p.cycles; i++) {
        const dot = pixels(doc, miniGrid(d.character), "m-pomo-dot");
        dot.classList.toggle("is-done", i < t.done);
        dot.classList.toggle("is-now", i === t.done && t.phase === "focus");
        dots.append(dot);
      }
    }
    today.replaceChildren();
    el(today, "span", "", "Today");
    today.append(pixels(doc, miniGrid(d.character), "m-pomo-dot is-done"));
    el(today, "b", "", "×" + timer.todayCount());
    today.title = timer.todayCount() + " focus " + (timer.todayCount() === 1 ? "session" : "sessions") + " finished today " + EMOJI[d.character];
    const presetKey = d.presets.map((q) => q.id + q.name).join("|") + d.presetId;
    if (presetKey !== shown.presets) {
      shown.presets = presetKey;
      chips(presets, "");
      chips(presetCtl, "");
    }
    for (const [id, b] of charBtns) {
      b.classList.toggle("is-on", id === d.character);
      b.setAttribute("aria-pressed", String(id === d.character));
    }
    for (const [key, b] of switches) {
      b.classList.toggle("is-on", d[key]);
      b.setAttribute("aria-checked", String(d[key]));
    }
    fill(d.presetId !== shown.presetId);
    shown.presetId = d.presetId;
    hint.textContent = t.status === "idle" ? "Changes to the lengths show at once." : "The timer is " + (t.status === "running" ? "running" : "paused") + ": new lengths start with the next phase.";
    tick();
  }
  setOpen(!!store.settingsOpen, false);
  if (store.ask) openAsk(store.ask, false);
  else ask.hidden = true;
  life.cleanup(timer.subscribe(update));
  life.interval(tick, 250);
  update();
  timer.ready.then(() => {
    if (life.active) {
      shown = { time: "", sprite: "", presets: "", dots: "", presetId: "" };
      update();
    }
  });
}
var def19 = {
  name: "Pomodoro",
  about: "A focus timer as pixel art: a tomato, an avocado or a clock, with your own presets",
  width: 4,
  variants: [],
  render: (body2, ctx) => render(body2, ctx),
  timerFor: pomodoroFor
  // for the harness
};
def19.watch = () => false;
var pomodoro_default = def19;

