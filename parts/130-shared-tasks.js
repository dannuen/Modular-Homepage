// src/shared/tasks.ts
async function renderTasks(env, input) {
  const DAILY_FOLDER = env.config.dailyFolder;
  const DAILY_TEMPLATE = env.config.dailyTemplate;
  const dailyPath = (d) => DAILY_FOLDER + "/" + d.setLocale("en").toFormat("yyyy/MM-LLLL/yyyy-MM-dd") + ".md";
  const SECTION2 = "Tasks";
  const TIMES = [15, 30, 45, 60, 90, 120];
  const EVENT_TIMES = ["08:00", "09:00", "14:00", "17:00", "19:00", "19:30"];
  const EVENT_LENGTHS = [30, 60, 90, 120, 180];
  const UNDO_SECONDS = 6;
  const options = input || {};
  const app = env.app;
  const doc = env.container.ownerDocument;
  const win = doc.defaultView;
  const SKIN2 = { card: "hp-tk-card-base", panel: "hp-tk-panel-base", pill: "hp-tk-pill-base", knob: "hp-tk-knob-base", mint: "hp-tk-mint-base", kicker: "hp-tk-kicker-base", track: "hp-tk-track-base", ...options.skin || {} };
  const emptyDraft = (kind = "todo") => ({ kind, text: "", due: null, start: null, sched: null, at: null, minutes: null, tags: [] });
  const isEvent = (x) => x?.kind === "event";
  const store = options.state ?? (win.__homeTasks ??= {});
  store.draft ??= emptyDraft();
  const cls = (...names) => names.filter(Boolean).join(" ");
  function el(parent, tag, className, text) {
    const node = doc.createElement(tag);
    if (className) node.className = className;
    if (text !== void 0) node.textContent = text;
    if (parent) parent.append(node);
    return node;
  }
  function icon(parent, name) {
    const s2 = el(parent, "span", "hp-tk-ico");
    s2.setAttribute("aria-hidden", "true");
    s2.innerHTML = svgOf(name);
    return s2;
  }
  function button(parent, className, iconName, label, title, onClick) {
    const b = el(parent, "button", className);
    b.type = "button";
    if (iconName) icon(b, iconName);
    if (label) el(b, "span", "", label);
    if (title) {
      b.title = title;
      b.setAttribute("aria-label", title);
    }
    b.addEventListener("click", (e) => {
      if (isMounted() && b.isConnected) onClick(e);
    });
    return b;
  }
  function markdown(parent, className, text) {
    return env.render(parent, text, className);
  }
  function notify(message) {
    new import_obsidian2.Notice(message);
  }
  const dayNow = () => DateTime.now().startOf("day");
  let today = dayNow();
  const iso = (d) => d.toFormat("yyyy-MM-dd");
  const fromIso = (s2) => {
    const d = DateTime.fromISO(String(s2 || ""));
    return d.isValid ? d.startOf("day") : null;
  };
  const stamp2 = () => iso(DateTime.now());
  function dayLabel(d) {
    const n2 = Math.round(d.diff(today, "days").days);
    if (n2 === 0) return "Today";
    if (n2 === 1) return "Tomorrow";
    if (n2 === -1) return "Yesterday";
    const e = d.setLocale("en");
    if (Math.abs(n2) < 7) return e.toFormat("ccc d LLL");
    return e.toFormat(d.year === today.year ? "d LLL" : "d LLL yyyy");
  }
  function shortDay(d) {
    const n2 = Math.round(d.diff(today, "days").days);
    if (n2 === 0) return "Today";
    if (n2 === 1) return "Tomorrow";
    if (n2 === -1) return "Yesterday";
    return d.setLocale("en").toFormat(d.year === today.year ? "d LLL" : "d LLL yyyy");
  }
  function parseMinutes(input2) {
    const s2 = String(input2 ?? "").toLowerCase().replace(/,/g, ".").trim();
    if (!s2) return null;
    if (/^\d+(\.\d+)?$/.test(s2)) return Math.round(parseFloat(s2)) || null;
    const hm = s2.match(/^(\d+)\s*(?:h|giờ|g)\s*(\d{1,2})$/u);
    if (hm) return Number(hm[1]) * 60 + Number(hm[2]) || null;
    let total = 0, found = false;
    for (const [, n2, unit] of s2.matchAll(/(\d+(?:\.\d+)?)\s*([a-zà-ỹđ]+)/gu)) {
      if (/^(h|hr|hrs|hour|hours|giờ|g)$/u.test(unit)) total += parseFloat(n2) * 60;
      else if (/^(m|min|mins|minute|minutes|phút|p)$/u.test(unit)) total += parseFloat(n2);
      else return null;
      found = true;
    }
    return found && total > 0 ? Math.round(total) : null;
  }
  const fmtMinutes = (m) => {
    const h = Math.floor(m / 60), r = m % 60;
    return (h ? h + "h" : "") + (h && r ? " " : "") + (r || !h ? r + "m" : "");
  };
  const minutesNow = () => {
    const n2 = DateTime.now();
    return n2.hour * 60 + n2.minute;
  };
  const fmtClock = (m) => String(Math.floor(m / 60) % 24).padStart(2, "0") + ":" + String(m % 60).padStart(2, "0");
  function parseClock(input2) {
    const m = String(input2 ?? "").toLowerCase().trim().match(/^(\d{1,2})(?:\s*[:h.]\s*(\d{2})?|(\d{2}))?\s*(am|pm|sáng|trưa|chiều|tối)?$/u);
    if (!m) return null;
    let h = Number(m[1]);
    const min = Number(m[2] ?? m[3] ?? 0);
    if (/^(pm|chiều|tối)$/u.test(m[4] || "") && h < 12) h += 12;
    else if (m[4] === "trưa" && h < 6) h += 12;
    else if (/^(am|sáng)$/u.test(m[4] || "") && h === 12) h = 0;
    return h <= 23 && min <= 59 ? h * 60 + min : null;
  }
  function lengthOf(input2, at) {
    const s2 = String(input2 ?? "").trim();
    const end = s2.match(/^(?:[-–—]|to|until|till|đến|tới)\s*(.+)$/iu);
    if (!end && !s2.includes(":")) return parseMinutes(s2);
    const e = parseClock(end ? end[1] : s2);
    return e === null || at === null || at === void 0 || e <= at ? null : e - at;
  }
  const VS = String.fromCodePoint(65039);
  const DUE = /(?:📅|🗓)\s*(\d{4}-\d{2}-\d{2})/u;
  const START = /🛫\s*(\d{4}-\d{2}-\d{2})/u;
  const SCHED = /⏳\s*(\d{4}-\d{2}-\d{2})/u;
  const DONE = /✅\s*(\d{4}-\d{2}-\d{2})/u;
  const DURATION2 = /\[duration::\s*([^\]]*)\]/iu;
  const TIME = /\[time::\s*([^\]]*)\]/iu;
  function parseTask(raw) {
    const s2 = String(raw).split("\n")[0].split(VS).join("");
    const pick2 = (re) => {
      const m = s2.match(re);
      return m ? fromIso(m[1]) : null;
    };
    const dur = s2.match(DURATION2), time = s2.match(TIME);
    const tags = [...s2.matchAll(/(?:^|\s)#([^\s#]+)/gu)].map((m) => m[1].replace(/[.,;:!?)]+$/u, "")).filter(Boolean);
    const text = s2.replace(/\[(?:duration|time)::[^\]]*\]/giu, " ").replace(/(?:📅|🗓|🛫|✅|⏳|➕|❌)\s*\d{4}-\d{2}-\d{2}/gu, " ").replace(/[⏫🔼🔽⏬🔺]/gu, " ").replace(/(?:^|\s)#[^\s#]+/gu, " ").replace(/\s\^[\w-]+\s*$/u, " ").replace(/\s+/g, " ").trim();
    const keep = [...s2.matchAll(/[⏫🔼🔽⏬🔺]|(?:➕|❌)\s*\d{4}-\d{2}-\d{2}/gu)].map((m) => m[0]);
    const doneMark = (s2.match(/✅\s*\d{4}-\d{2}-\d{2}/u) || [""])[0];
    const blockId = (s2.match(/\s(\^[\w-]+)\s*$/u) || [])[1] || "";
    const at = time ? parseClock(time[1]) : null;
    return { text, tags, due: pick2(DUE), start: pick2(START), sched: pick2(SCHED), done: pick2(DONE), at, minutes: dur ? parseMinutes(dur[1]) : null, keep, doneMark, blockId };
  }
  const tasks = [];
  const tagUses = /* @__PURE__ */ new Map();
  const useTags = (x) => {
    for (const g of x.tags) tagUses.set(g, (tagUses.get(g) || 0) + 1);
  };
  const dailyPages = env.vault.pages(DAILY_FOLDER).filter((page) => fromIso(page.file.name));
  const dailyLists = await Promise.all(dailyPages.map((page) => env.vault.lists(page)));
  for (const [k, page] of dailyPages.entries()) {
    const day = fromIso(page.file.name);
    if (!day) continue;
    const items = dailyLists[k];
    const mine = [], todoLines = /* @__PURE__ */ new Set(), children = /* @__PURE__ */ new Map();
    for (const t of items) {
      const parsed = t.task ? parseTask(t.text) : null;
      if (parsed) useTags(parsed);
      if (String(t.section?.subpath ?? "").trim().toLowerCase() !== SECTION2.toLowerCase()) continue;
      mine.push({ item: t, parsed });
      if (t.task) {
        todoLines.add(t.line);
        const count = children.get(t.parent) || { kids: 0, kidsDone: 0 };
        count.kids++;
        if (t.completed) count.kidsDone++;
        children.set(t.parent, count);
      }
    }
    for (const { item: t, parsed } of mine) {
      const raw = String(t.text).split("\n")[0], where = { raw, path: page.file.path, line: t.line, day };
      if (!t.task) {
        if (t.parent !== void 0 && t.parent !== null) continue;
        const e = parseTask(raw);
        if (e.due) {
          tasks.push({ ...e, ...where, kind: "event", closed: false, kids: 0, kidsDone: 0 });
          useTags(e);
        }
        continue;
      }
      if (t.parent !== void 0 && t.parent !== null && todoLines.has(t.parent)) continue;
      if (t.status === "-") continue;
      tasks.push({ ...parsed, ...where, kind: "todo", closed: !!t.completed, ...children.get(t.line) || { kids: 0, kidsDone: 0 } });
    }
  }
  for (const s2 of options.sermons || []) {
    const due = fromIso(s2.date);
    if (!due || !s2.path) continue;
    tasks.push({
      kind: "event",
      sermon: true,
      text: s2.title || s2.path.split("/").pop().replace(/\.md$/i, ""),
      tags: [],
      due,
      start: null,
      sched: null,
      done: null,
      at: Number.isFinite(s2.at) ? s2.at : null,
      minutes: s2.minutes || null,
      when: s2.when || "",
      church: s2.church || "",
      keep: [],
      doneMark: "",
      blockId: "",
      raw: "",
      path: s2.path,
      line: "sermon:" + s2.date,
      day: due,
      closed: false,
      kids: 0,
      kidsDone: 0
    });
  }
  let disposed = false, tick = null, undoTimer = null;
  let drag = null, nowLine = null;
  const timeouts = /* @__PURE__ */ new Set();
  const view = { tasks, refresh: (focusKey) => {
    if (isMounted()) draw(focusKey);
  } };
  store.view = view;
  function isMounted() {
    return !disposed && wrap.isConnected;
  }
  function later(callback, delay) {
    if (!isMounted()) return null;
    const id = win.setTimeout(() => {
      timeouts.delete(id);
      if (isMounted()) callback();
    }, delay);
    timeouts.add(id);
    return id;
  }
  function cleanup() {
    disposed = true;
    drag?.stop(false);
    for (const id of timeouts) win.clearTimeout(id);
    timeouts.clear();
    if (tick !== null) win.clearInterval(tick);
    if (store.view === view) delete store.view;
  }
  env.life.cleanup(cleanup);
  function updateTask(t, changes) {
    const matches = (store.view?.tasks || []).filter((x) => x.path === t.path && x.raw === t.raw);
    const current = matches.find((x) => x.line === t.line) || (matches.length === 1 ? matches[0] : null);
    if (changes.raw !== void 0 && store.edit?.path === t.path && store.edit.raw === t.raw) store.edit.raw = changes.raw;
    Object.assign(t, changes);
    if (current && current !== t) Object.assign(current, changes);
  }
  const copyDraft = (d) => ({ ...d, tags: [...d.tags] });
  const sameDraft = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  async function transact(message, change) {
    if (!isMounted() || store.busy) return;
    store.busy = true;
    store.view = view;
    let focusKey;
    try {
      focusKey = await change();
    } catch (err) {
      console.error(err);
      notify(message + ": " + (err.message || err));
    } finally {
      store.busy = false;
      store.view?.refresh(store.view === view ? focusKey : void 0);
    }
  }
  const LIST = /^([\s>]*(?:\d+\.|\d+\)|\*|-|\+)\s+)(?:\[(.?)\]\s*)?(.*)$/u;
  const eolOf = (data) => data.includes("\r\n") ? "\r\n" : "\n";
  function findLine(lines, t) {
    const same = (i) => {
      const m = LIST.exec(lines[i] ?? "");
      return !!m && m[2] === void 0 === isEvent(t) && m[3].trim() === t.raw.trim();
    };
    if (same(t.line)) return t.line;
    const hits = lines.map((_, i) => i).filter(same);
    return hits.length === 1 ? hits[0] : -1;
  }
  async function editTask(t, change) {
    const file = app.vault.getAbstractFileByPath(t.path);
    let result = null;
    if (file) await app.vault.process(file, (data) => {
      const lines = data.split(/\r?\n/);
      const i = findLine(lines, t);
      if (i < 0) return data;
      result = change(lines, i) ?? true;
      return lines.join(eolOf(data));
    });
    if (!result) notify("That task was changed in its note, so nothing was saved. Open the note to edit it.");
    return result;
  }
  function toggled(line, done) {
    const m = line.match(/^(.*?)(\s+\^[\w-]+)?\s*$/u);
    const body2 = m[1].replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/gu, "").replace(/^([\s>]*(?:\d+\.|\d+\)|\*|-|\+)\s*)\[.?\]/u, "$1[" + (done ? "x" : " ") + "]");
    return body2 + (done ? " ✅ " + stamp2() : "") + (m[2] || "");
  }
  function lineBody(d, words, old) {
    const ev = isEvent(d);
    const withTime = d.at !== null && d.at !== void 0;
    return [
      words,
      ...d.tags.map((g) => "#" + g),
      withTime ? "[time:: " + fmtClock(d.at) + "]" : "",
      d.minutes ? "[duration:: " + fmtMinutes(d.minutes) + "]" : "",
      ...old?.keep || [],
      !ev && d.sched ? "⏳ " + d.sched : "",
      !ev && d.start ? "🛫 " + d.start : "",
      d.due ? "📅 " + d.due : "",
      ev ? "" : old?.doneMark,
      old?.blockId
    ].filter(Boolean).join(" ");
  }
  function rebuilt(line, d, words) {
    const m = LIST.exec(line);
    const body2 = lineBody(d, words, parseTask(m[3]));
    return { line: m[1] + (isEvent(d) ? "" : "[" + (m[2] ?? " ") + "] ") + body2, body: body2 };
  }
  // A move swaps only the date and time tokens it changes, so the rest of the line stays as the user wrote it.
  const MOVE_TOKENS = {
    due: [/(\s*)(?:📅|🗓)\uFE0F?\s*\d{4}-\d{2}-\d{2}/u, (v) => "📅 " + v],
    sched: [/(\s*)⏳\uFE0F?\s*\d{4}-\d{2}-\d{2}/u, (v) => "⏳ " + v],
    at: [/(\s*)\[time::[^\]]*\]/iu, (v) => "[time:: " + fmtClock(v) + "]"],
    minutes: [/(\s*)\[duration::[^\]]*\]/iu, (v) => "[duration:: " + fmtMinutes(v) + "]"]
  };
  function moved(line, d, changes) {
    let s2 = line.trimEnd();
    for (const [k, [re, fmt]] of Object.entries(MOVE_TOKENS)) {
      if (!(k in changes)) continue;
      const token = d[k] === null || d[k] === void 0 ? "" : fmt(d[k]);
      if (re.test(s2)) s2 = s2.replace(re, (_, space) => token && space + token);
      else if (token) s2 = s2.replace(/(?:\s*✅\uFE0F?\s*\d{4}-\d{2}-\d{2})?(?:\s+\^[\w-]+)?$/u, (tail) => " " + token + tail);
    }
    return s2;
  }
  function blockEnd(lines, i) {
    const indent = (s2) => s2.match(/^[\s>]*/u)[0].replace(/\t/g, "    ").length;
    const base = indent(lines[i]);
    let j = i + 1;
    while (j < lines.length && lines[j].trim() && indent(lines[j]) > base) j++;
    return j;
  }
  function intoSection(data, newLines) {
    const lines = data.split(/\r?\n/);
    const heading = (l2, fence2) => !fence2 && l2.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/u);
    let at = -1, level = 7, fence = false;
    for (let i = 0; i < lines.length; i++) {
      if (/^\s*(```|~~~)/u.test(lines[i])) fence = !fence;
      const m = heading(lines[i], fence);
      if (m && m[2].toLowerCase() === SECTION2.toLowerCase()) {
        at = i;
        level = m[1].length;
        break;
      }
    }
    if (at < 0) {
      while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
      lines.push(...lines.length ? [""] : [], "## " + SECTION2, "", ...newLines, "");
      return lines.join(eolOf(data));
    }
    let end = lines.length;
    fence = false;
    for (let i = at + 1; i < lines.length; i++) {
      if (/^\s*(```|~~~)/u.test(lines[i])) fence = !fence;
      const m = heading(lines[i], fence);
      if (m && m[1].length <= level) {
        end = i;
        break;
      }
    }
    let last = -1;
    for (let i = at + 1; i < end; i++)
      if (/^[\s>]*([-*+]|\d+[.)])\s/u.test(lines[i]) || last === i - 1 && /^\s+\S/u.test(lines[i])) last = i;
    if (last >= 0) lines.splice(last + 1, 0, ...newLines);
    else {
      let i = at + 1;
      const block = [...newLines];
      if (lines[i] !== void 0 && !lines[i].trim()) i++;
      else block.unshift("");
      if (lines[i] !== void 0 && lines[i].trim()) block.push("");
      lines.splice(i, 0, ...block);
    }
    return lines.join(eolOf(data));
  }
  async function todayNote() {
    const day = DateTime.now().startOf("day");
    const path = dailyPath(day);
    let file = app.vault.getAbstractFileByPath(path);
    if (file) return file;
    const folder = path.slice(0, path.lastIndexOf("/"));
    if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder);
    const templater = app.plugins.plugins["templater-obsidian"]?.templater;
    const template = app.vault.getAbstractFileByPath(DAILY_TEMPLATE);
    if (templater && template) file = await templater.create_new_note_from_template(template, app.vault.getAbstractFileByPath(folder), iso(day), false);
    return app.vault.getAbstractFileByPath(path) || file || await app.vault.create(path, "");
  }
  async function addTask() {
    if (!isMounted() || store.busy) return;
    const original = store.draft, d = copyDraft(original);
    const words = d.text.replace(/\s+/g, " ").replace(/^[-*+]\s*(\[.?\]\s*)?/u, "").trim();
    if (!words) {
      draw("add-text");
      return;
    }
    if (isEvent(d) && !d.due) {
      closePickers();
      store.pop = "due";
      draw("add-pop");
      return;
    }
    const body2 = lineBody(d, words);
    return transact("Could not add the task", async () => {
      draw();
      const file = await todayNote();
      await app.vault.process(file, (data) => intoSection(data, [(isEvent(d) ? "- " : "- [ ] ") + body2]));
      const unchanged = store.draft === original && sameDraft(original, d);
      if (unchanged) {
        store.draft = emptyDraft(d.kind);
        store.pop = null;
      }
      if (isMounted()) tasks.push({ ...parseTask(body2), kind: isEvent(d) ? "event" : "todo", raw: body2, path: file.path, line: -1, day: fromIso(file.path.split("/").pop().replace(/\.md$/, "")) || today, closed: false, kids: 0, kidsDone: 0, pending: true });
      return unchanged ? "add-text" : void 0;
    });
  }
  const editKey = (t) => "edit:" + t.path + ":" + t.line;
  function startEdit(t, event) {
    if (!isMounted() || t.pending || t.sermon) return;
    store.pop = null;
    store.edit = {
      path: t.path,
      raw: t.raw,
      line: t.line,
      pop: null,
      keyboard: !!event && event.detail === 0,
      draft: draftOf(t)
    };
    draw("edit-text");
  }
  const draftOf = (t) => ({ kind: t.kind, text: t.text, due: t.due ? iso(t.due) : null, start: t.start ? iso(t.start) : null, sched: t.sched ? iso(t.sched) : null, at: t.at, minutes: t.minutes, tags: [...t.tags] });
  function cancelEdit() {
    if (!isMounted()) return;
    const e = store.edit;
    store.edit = null;
    draw(e?.keyboard ? "edit:" + e.path + ":" + e.line : void 0);
  }
  async function saveEdit(t) {
    if (!isMounted() || store.busy) return;
    const e = store.edit;
    const d = e && copyDraft(e.draft);
    const words = d ? d.text.replace(/\s+/g, " ").trim() : "";
    if (!words) {
      draw("edit-text");
      return;
    }
    if (isEvent(d) && !d.due) {
      closePickers();
      e.pop = "due";
      draw("edit-pop");
      return;
    }
    return transact("Could not save the task", async () => {
      draw();
      let body2 = null;
      const ok = await editTask(t, (lines, i) => {
        const r = rebuilt(lines[i], d, words);
        lines[i] = r.line;
        body2 = r.body;
      });
      if (!ok) return;
      const ev = isEvent(d);
      updateTask(t, { ...parseTask(body2), raw: body2, kind: ev ? "event" : "todo", closed: ev ? false : t.closed });
      if (store.edit === e && sameDraft(e.draft, d)) {
        store.edit = null;
        return e.keyboard ? editKey(t) : void 0;
      }
    });
  }
  async function setDone(t, done) {
    return transact("Could not update the task", async () => {
      const before = { closed: t.closed, done: t.done };
      updateTask(t, { closed: done, done: done ? dayNow() : null });
      draw();
      let ok = false;
      try {
        const result = await editTask(t, (lines, i) => {
          lines[i] = toggled(lines[i], done);
          return { body: LIST.exec(lines[i])[3] };
        });
        if (result) {
          updateTask(t, { ...parseTask(result.body), raw: result.body, closed: done });
          ok = true;
        }
      } finally {
        if (!ok) updateTask(t, before);
      }
    });
  }
  async function removeTask(t) {
    return transact("Could not remove the task", async () => {
      const hidden = t.hidden;
      updateTask(t, { hidden: true });
      draw();
      let removed;
      try {
        removed = await editTask(t, (lines, i) => ({ index: i, before: lines[i - 1], lines: lines.splice(i, blockEnd(lines, i) - i) }));
        if (removed) store.undo = { path: t.path, ...removed, label: t.text, until: Date.now() + UNDO_SECONDS * 1e3 };
      } finally {
        if (!removed) updateTask(t, { hidden });
      }
    });
  }
  async function undoRemove() {
    const u = store.undo;
    if (!u || Date.now() >= u.until) return;
    return transact("Could not restore the task", async () => {
      draw();
      let restored = false;
      try {
        const file = app.vault.getAbstractFileByPath(u.path);
        if (!file) throw new Error("That note is gone, so the task can't come back.");
        await app.vault.process(file, (data) => {
          const lines = data.split(/\r?\n/);
          let at = lines[u.index - 1] === u.before ? u.index : -1;
          if (at < 0) {
            const hits = lines.map((l2, i) => l2 === u.before ? i + 1 : -1).filter((i) => i > 0);
            if (hits.length === 1) at = hits[0];
          }
          if (at < 0) return intoSection(data, u.lines);
          lines.splice(at, 0, ...u.lines);
          return lines.join(eolOf(data));
        });
        restored = true;
        if (store.undo === u) store.undo = null;
        for (const t of store.view?.tasks || []) if (t.hidden && t.path === u.path && t.raw.trim() === (LIST.exec(u.lines[0])?.[3] || "").trim()) t.hidden = false;
      } finally {
        if (!restored && store.undo === u) u.until = Date.now() + UNDO_SECONDS * 1e3;
      }
    });
  }
  async function reschedule(t, changes, focusKey) {
    if (!isMounted() || store.busy || t.pending || t.sermon || !t.text) return;
    const d = { ...draftOf(t), ...changes };
    return transact("Could not move the task", async () => {
      const before = { due: t.due, sched: t.sched, at: t.at, minutes: t.minutes };
      updateTask(t, { due: fromIso(d.due), sched: fromIso(d.sched), at: d.at, minutes: d.minutes });
      draw(focusKey);
      let ok = false;
      try {
        let body2 = null;
        const result = await editTask(t, (lines, i) => {
          lines[i] = moved(lines[i], d, changes);
          body2 = LIST.exec(lines[i])[3];
        });
        if (result) {
          updateTask(t, { ...parseTask(body2), raw: body2 });
          ok = true;
        }
      } finally {
        if (!ok) updateTask(t, before);
      }
      return focusKey;
    });
  }
  function openNote(t, event) {
    if (!t.pending) app.workspace.openLinkText(t.path, "", !!(event && (event.ctrlKey || event.metaKey)));
  }
  const wrap = el(env.container, "div", "hp-tk-wrap");
  const GROUPS = [["late", "Overdue"], ["today", "Today"], ["week", "This week"], ["later", "Later"], ["none", "No date"]];
  function groupOf(t) {
    if (!t.due) return "none";
    if (t.due.hasSame(today, "day")) return "today";
    if (t.due < today) return "late";
    return t.due <= today.endOf("week") ? "week" : "later";
  }
  const shown = (t) => !t.hidden && (isEvent(t) ? t.due >= today : !t.closed || t.done && t.done.hasSame(today, "day"));
  const ms = (d) => d?.toMillis() ?? Infinity;
  const order = (a, b) => a.closed - b.closed || ms(a.due) - ms(b.due) || isEvent(b) - isEvent(a) || (a.at ?? -1) - (b.at ?? -1) || ms(a.start) - ms(b.start) || a.day.toMillis() - b.day.toMillis();
  const ended = (t) => isEvent(t) && t.due.hasSame(today, "day") && t.at !== null && t.at !== void 0 && !!t.minutes && t.at + t.minutes <= minutesNow();
  let endedCount = 0;
  const editing = (t) => !!store.edit && t.path === store.edit.path && t.raw === store.edit.raw;
  function render2() {
    if (!store.busy && store.edit && !tasks.some((t) => !t.hidden && editing(t))) store.edit = null;
    const visible = tasks.filter(shown);
    endedCount = tasks.filter(ended).length;
    const tags = [...new Set(visible.flatMap((t) => t.tags))];
    if (store.filter && !tags.includes(store.filter)) store.filter = null;
    const box = el(wrap, "section", cls("hp-tk-box", SKIN2.card));
    box.setAttribute("aria-label", "Tasks");
    const head = el(box, "div", "hp-tk-head");
    const title = el(head, "div", "hp-tk-title");
    el(title, "span", cls("hp-tk-kicker", SKIN2.kicker), "Tasks");
    const dueToday = visible.filter((t) => !isEvent(t) && !t.closed && groupOf(t) === "today");
    const eventsToday = visible.filter((t) => isEvent(t) && groupOf(t) === "today").length;
    const late = visible.filter((t) => !t.closed && groupOf(t) === "late").length;
    const planned = dueToday.reduce((s2, t) => s2 + (t.minutes || 0), 0);
    const sum = el(title, "span", "hp-tk-sum");
    const part = (b, rest, className) => {
      const s2 = el(sum, "span", className);
      el(s2, "b", "", b);
      s2.append(rest);
    };
    part(String(dueToday.length), " open today");
    if (eventsToday) {
      sum.append(" · ");
      part(String(eventsToday), eventsToday === 1 ? " event today" : " events today");
    }
    if (late) {
      sum.append(" · ");
      part(String(late), " overdue", "hp-tk-sum-late");
    }
    if (planned) {
      sum.append(" · ");
      part(fmtMinutes(planned), " planned");
    }
    const mode = MODES.some(([k]) => k === store.mode) ? store.mode : "list";
    const modes = el(head, "nav", cls("hp-tk-filter hp-tk-modes", SKIN2.pill));
    modes.setAttribute("aria-label", "View");
    for (const [k, label] of MODES) {
      const b = button(modes, mode === k ? "is-on" : "", "", label, label + " view", () => {
        store.mode = k;
        closePickers();
        draw("mode-" + k);
      });
      b.setAttribute("aria-pressed", String(mode === k));
      b.dataset.tkFocus = "mode-" + k;
    }
    if (tags.length > 3) {
      const pick2 = el(head, "select", "hp-tk-tagsel");
      pick2.setAttribute("aria-label", "Show tasks with a tag");
      for (const g of [null, ...tags]) {
        const o = el(pick2, "option", "", g ? "#" + g : "All tags");
        o.value = g || "";
        o.selected = (store.filter || null) === g;
      }
      pick2.addEventListener("change", () => {
        if (!isMounted() || !pick2.isConnected) return;
        store.filter = pick2.value || null;
        draw();
      });
    } else if (tags.length) {
      const filter = el(head, "nav", cls("hp-tk-filter", SKIN2.pill));
      filter.setAttribute("aria-label", "Show tasks with a tag");
      for (const g of [null, ...tags]) {
        const on = (store.filter || null) === g;
        const b = button(filter, on ? "is-on" : "", "", g ? "#" + g : "All", g ? "Only #" + g : "All tasks", () => {
          store.filter = g;
          draw();
        });
        b.setAttribute("aria-pressed", String(on));
      }
    }
    drawAdd(box);
    const inFilter = (t) => !t.hidden && (!store.filter || t.tags.includes(store.filter));
    if (mode === "month") drawMonth(box, tasks.filter(inFilter));
    else if (mode === "week") drawWeek(box, tasks.filter(inFilter));
    else drawList(box, visible.filter(inFilter));
    if (undoTimer !== null) {
      win.clearTimeout(undoTimer);
      timeouts.delete(undoTimer);
      undoTimer = null;
    }
    const u = store.undo;
    if (u && (Date.now() < u.until || store.busy)) {
      const toast = el(box, "div", cls("hp-tk-toast", SKIN2.pill));
      toast.setAttribute("role", "status");
      el(toast, "span", "hp-tk-toast-text", "Removed “" + u.label + "”");
      button(toast, cls("hp-tk-undo", SKIN2.mint), "undo", "Undo", "Put the task back", undoRemove).disabled = !!store.busy;
      if (!store.busy) undoTimer = later(() => {
        if (store.undo === u && !store.busy) {
          store.undo = null;
          draw();
        }
      }, u.until - Date.now());
    } else if (u) store.undo = null;
  }
  const MODES = [["list", "List"], ["month", "Month"], ["week", "Week"]];
  function drawList(box, rows) {
    const byGroup = Object.fromEntries(GROUPS.map(([key]) => [key, rows.filter((t) => groupOf(t) === key).sort(order)]));
    if (!rows.length) {
      el(box, "p", "hp-tk-empty", store.filter ? "No tasks with #" + store.filter + "." : "No tasks yet. Add one above; it goes into today's daily note.");
    } else {
      const cols = el(box, "div", "hp-tk-cols");
      const left = el(cols, "div", "hp-tk-col"), right = el(cols, "div", "hp-tk-col");
      for (const [key, name] of GROUPS) {
        const list2 = byGroup[key];
        if (!list2.length && key !== "today") continue;
        const group = el(key === "late" || key === "today" ? left : right, "div", cls("hp-tk-group", "is-" + key, list2.some(isEvent) && "has-event", SKIN2.panel));
        const gh = el(group, "div", "hp-tk-group-head");
        el(gh, "span", "", name);
        el(gh, "b", "hp-tk-count", String(list2.filter((t) => !t.closed).length));
        if (!list2.length) el(group, "p", "hp-tk-empty", "Nothing today.");
        for (const t of list2) (editing(t) ? drawEdit : drawRow)(group, t, key);
      }
      if (!right.childElementCount) el(el(right, "div", cls("hp-tk-group", SKIN2.panel)), "p", "hp-tk-empty", "Nothing coming up.");
    }
  }
  function drawRow(parent, t, key) {
    const ev = isEvent(t);
    const row = el(parent, "div", cls("hp-tk-row", ev && "is-event", t.sermon && "is-sermon", t.closed && "is-done", ended(t) && "is-past", t.pending && "is-new"));
    if (ev) {
      const has = t.at !== null && t.at !== void 0;
      el(row, "span", cls("hp-tk-when", !has && "is-allday"), has ? fmtClock(t.at) : t.when || "All day").title = has ? "Starts at " + fmtClock(t.at) : t.when || "All day";
    } else {
      const check = button(row, cls("hp-tk-check", SKIN2.knob), "check", "", (t.closed ? "Not done: " : "Done: ") + t.text, () => setDone(t, !t.closed));
      check.setAttribute("role", "checkbox");
      check.setAttribute("aria-checked", String(t.closed));
      check.disabled = !!t.pending || !!store.busy;
      check.dataset.tkFocus = "check:" + t.path + ":" + t.line;
    }
    const main = el(row, "div", "hp-tk-main");
    const text = markdown(main, "hp-tk-text", t.sermon ? Link.file(t.path, false, t.text) : t.text || "(no text)");
    if (!t.pending) text.addEventListener("click", (e) => {
      if (!e.target.closest("a")) {
        if (t.sermon) openNote(t, e);
        else startEdit(t);
      }
    });
    const meta = el(main, "div", "hp-tk-meta");
    const bit = (iconName, text2, className) => {
      const s2 = el(meta, "span", cls("hp-tk-bit", className));
      icon(s2, iconName);
      s2.append(text2);
      return s2;
    };
    for (const g of t.tags) el(meta, "span", "hp-tk-tag", "#" + g);
    if (ev) {
      if (t.sermon) bit("book", "Sermon" + (t.church ? " · " + t.church : ""), "hp-tk-sermon").title = "Date and time from the sermon's properties";
      if (t.at !== null && t.at !== void 0 && t.minutes) bit("clock", fmtClock(t.at) + "–" + fmtClock(t.at + t.minutes)).title = "Time";
      if (t.minutes) bit("timer", fmtMinutes(t.minutes)).title = "Length";
      if (key !== "today") bit("calendar", dayLabel(t.due), "hp-tk-due").title = "Date";
    } else drawTodoMeta(t, key, bit);
    const src = el(row, "span", "hp-tk-src");
    if (!t.sermon) {
      icon(src, "note");
      env.render(src, Link.file(t.path, false, t.day.setLocale("en").toFormat("d LLL")), "");
      src.title = "From the daily note of " + t.day.setLocale("en").toFormat("cccc d LLLL");
    }
    const acts = el(row, "div", "hp-tk-acts");
    if (t.pending || t.sermon) return;
    button(acts, "hp-tk-act hp-tk-pen", "pencil", "", "Edit: " + t.text, (e) => startEdit(t, e)).dataset.tkFocus = editKey(t);
    button(acts, "hp-tk-act hp-tk-del", "x", "", "Remove: " + t.text, () => removeTask(t)).disabled = !!store.busy;
  }
  function drawTodoMeta(t, key, bit) {
    if (t.minutes) bit("timer", fmtMinutes(t.minutes)).title = "Time needed";
    if (t.sched) bit("clock", dayLabel(t.sched) + (hasTime(t) ? " " + fmtClock(t.at) : ""), "hp-tk-plan").title = "Planned";
    if (t.start && t.due) {
      const span = bit("start", dayLabel(t.start) + " → " + dayLabel(t.due), "hp-tk-span" + (key === "late" && !t.closed ? " is-late" : ""));
      span.title = "Start → due";
      const total = t.due.diff(t.start, "days").days, gone = today.diff(t.start, "days").days;
      const pct = total <= 0 ? gone >= 0 ? 100 : 0 : Math.max(0, Math.min(100, gone / total * 100));
      const track = el(span, "span", cls("hp-tk-track", SKIN2.track));
      el(track, "span", "hp-tk-track-fill").style.width = pct + "%";
    } else if (t.due) bit("calendar", dayLabel(t.due), "hp-tk-due" + (key === "late" && !t.closed ? " is-late" : key === "today" ? " is-today" : "")).title = "Due";
    else if (t.start) bit("start", "from " + dayLabel(t.start)).title = "Start";
    if (t.kids) bit("list", t.kidsDone + "/" + t.kids).title = "Subtasks done";
  }
  function drawEdit(parent, t) {
    const box = el(parent, "div", cls("hp-tk-edit", SKIN2.pill));
    box.setAttribute("role", "group");
    box.setAttribute("aria-label", "Edit task");
    const pick2 = drawFields(box, "edit", { placeholder: "Task", label: "Task", onEnter: () => saveEdit(t), onEscape: cancelEdit });
    const acts = el(box, "div", "hp-tk-edit-acts");
    button(acts, "hp-tk-cancel", "", "Cancel", "Cancel (Esc)", cancelEdit);
    button(acts, cls("hp-tk-save", SKIN2.mint), "check", "Save", "Save (Enter)", () => saveEdit(t)).disabled = !!store.busy;
    pick2();
  }
  const FORMS = {
    add: { get draft() {
      return store.draft;
    }, get pop() {
      return store.pop || null;
    }, set pop(v) {
      store.pop = v;
    } },
    edit: { get draft() {
      return store.edit?.draft;
    }, get pop() {
      return store.edit?.pop || null;
    }, set pop(v) {
      if (store.edit) store.edit.pop = v;
    } }
  };
  const closePickers = () => {
    store.pop = null;
    store.calMonth = null;
    if (store.edit) store.edit.pop = null;
  };
  function drawAdd(box) {
    const add = el(box, "div", cls("hp-tk-add", SKIN2.pill));
    const ev = isEvent(store.draft);
    const pick2 = drawFields(add, "add", { placeholder: ev ? "Add an event to today's note…" : "Add a task to today's note…", label: ev ? "New event" : "New task", onEnter: addTask });
    button(add, cls("hp-tk-go", SKIN2.mint), "", "Add", ev ? "Add the event to today's daily note" : "Add the task to today's daily note", addTask).disabled = !!store.busy;
    pick2();
  }
  function kindSwitch(parent, name, d) {
    const sw = el(parent, "div", "hp-tk-kind");
    sw.setAttribute("role", "group");
    sw.setAttribute("aria-label", "Kind");
    for (const [kind, iconName, label] of [["todo", "todo", "To do"], ["event", "event", "Event"]]) {
      const on = (isEvent(d) ? "event" : "todo") === kind;
      const b = button(sw, cls("hp-tk-kind-btn", on && "is-on"), iconName, "", label, () => {
        if (on) return;
        d.kind = kind;
        closePickers();
        draw(name + "-kind-" + kind);
      });
      el(b, "span", "hp-tk-kind-label", label);
      b.setAttribute("aria-pressed", String(on));
      b.dataset.tkFocus = name + "-kind-" + kind;
    }
  }
  function drawFields(host, name, { placeholder, label, onEnter, onEscape }) {
    const form = FORMS[name], d = form.draft;
    host.tabIndex = -1;
    host.addEventListener("keydown", (e) => {
      if (!isMounted() || !host.isConnected) return;
      if (e.key !== "Escape") return;
      e.stopPropagation();
      if (form.pop) {
        form.pop = null;
        draw(name + "-text");
      } else if (onEscape) onEscape();
    });
    host.addEventListener("focusout", () => later(() => {
      if (form.pop && host.isConnected && !host.contains(doc.activeElement)) {
        form.pop = null;
        draw();
      }
    }, 0));
    if (name === "add") kindSwitch(host, name, d);
    const text = el(host, "input", "hp-tk-input");
    text.type = "text";
    text.placeholder = placeholder;
    text.value = d.text;
    text.dataset.tkFocus = name + "-text";
    text.setAttribute("aria-label", label);
    text.addEventListener("input", () => {
      if (isMounted() && text.isConnected) {
        d.text = text.value;
        store.focusAt = Date.now();
      }
    });
    text.addEventListener("keydown", (e) => {
      if (isMounted() && text.isConnected && e.key === "Enter" && !e.isComposing) {
        e.preventDefault();
        onEnter();
      }
    });
    text.addEventListener("focus", () => {
      if (!isMounted() || !text.isConnected || !form.pop) return;
      form.pop = null;
      host.querySelector(".hp-tk-pop")?.remove();
      for (const b of opts.querySelectorAll(".hp-tk-opt")) {
        b.classList.remove("is-active");
        b.setAttribute("aria-expanded", "false");
      }
    });
    const opts = el(host, "div", "hp-tk-opts");
    if (name === "edit") kindSwitch(opts, name, d);
    const hasAt = d.at !== null && d.at !== void 0;
    const values = {
      due: d.due ? shortDay(fromIso(d.due)) : "",
      start: d.start ? shortDay(fromIso(d.start)) : "",
      at: hasAt ? fmtClock(d.at) : "",
      time: d.minutes ? fmtMinutes(d.minutes) : "",
      tag: d.tags.join(" ")
      // the button's icon is already a #
    };
    const OPTS = isEvent(d) ? [["due", "calendar", "Date"], ["at", "clock", "At"], ["time", "timer", "Length"], ["tag", "hash", "Tag"]] : [["due", "calendar", "Due"], ["start", "start", "Start"], ["time", "timer", "Time"], ["tag", "hash", "Tag"]];
    const optButtons = {};
    for (const [key, iconName, title] of OPTS) {
      const b = button(opts, cls("hp-tk-opt", values[key] && "is-set", form.pop === key && "is-active"), iconName, "", title + (values[key] ? ": " + values[key] : ""), () => {
        const open = form.pop === key ? null : key;
        closePickers();
        form.pop = open;
        draw(open ? name + "-pop" : name + "-opt-" + key);
      });
      el(b, "span", "hp-tk-opt-label", values[key] || title);
      b.dataset.tkFocus = name + "-opt-" + key;
      b.setAttribute("aria-expanded", String(form.pop === key));
      optButtons[key] = b;
    }
    return () => {
      if (form.pop) drawPop(host, name, optButtons[form.pop]);
    };
  }
  function drawPop(host, name, anchor) {
    const form = FORMS[name], d = form.draft, key = form.pop;
    const done = () => {
      form.pop = null;
      draw(name + "-text");
    };
    const pop = el(host, "div", cls("hp-tk-pop", SKIN2.panel));
    pop.tabIndex = -1;
    pop.dataset.tkFocus = name + "-pop";
    pop.setAttribute("role", "dialog");
    const ev = isEvent(d);
    const titles = { due: ev ? "Date" : "Due", start: "Start", at: "Starts at", time: ev ? "Length" : "Time needed", tag: "Tags" };
    pop.setAttribute("aria-label", titles[key]);
    const head = el(pop, "div", "hp-tk-pop-head");
    el(head, "span", "hp-tk-pop-title", titles[key]);
    const isSet = key === "time" ? d.minutes : key === "tag" ? d.tags.length : key === "at" ? d.at !== null && d.at !== void 0 : d[key];
    if (isSet) button(head, "hp-tk-pop-clear", "", "Clear", "Clear " + titles[key].toLowerCase(), () => {
      if (key === "time") d.minutes = null;
      else if (key === "tag") d.tags = [];
      else d[key] = null;
      done();
    });
    const chips = el(pop, "div", "hp-tk-chips");
    const chip = (text, on, choose) => {
      const b = button(chips, cls("hp-tk-chip", SKIN2.pill, on && "is-on"), "", text, "", choose);
      b.setAttribute("aria-pressed", String(on));
      return b;
    };
    const typed = (placeholder, value, focusKey, apply) => {
      const row = el(pop, "label", "hp-tk-pop-type");
      el(row, "span", "", "or type");
      const field = el(row, "input", "hp-tk-pop-input");
      field.type = "text";
      field.placeholder = placeholder;
      field.value = value;
      field.dataset.tkFocus = focusKey;
      field.addEventListener("keydown", (e) => {
        if (!isMounted() || !field.isConnected) return;
        if (e.key !== "Enter" || e.isComposing) return;
        e.preventDefault();
        if (!apply(field.value)) {
          field.classList.add("is-bad");
          field.setAttribute("aria-invalid", "true");
        }
      });
      return field;
    };
    if (key === "due" || key === "start") {
      const sunday = today.plus({ days: 7 - today.weekday || 7 });
      const choices = [["Today", today], ["Tomorrow", today.plus({ days: 1 })], ["Sunday", sunday], ["Next week", today.plus({ weeks: 1 })]];
      for (const [text, day] of choices) chip(text, d[key] === iso(day), () => {
        d[key] = iso(day);
        done();
      });
      drawCalendar(pop, name, key, d, done);
    } else if (key === "at") {
      const offered = EVENT_TIMES.map(parseClock).filter((m) => m !== null);
      chip("All day", d.at === null || d.at === void 0, () => {
        d.at = null;
        done();
      });
      for (const m of offered) chip(fmtClock(m), d.at === m, () => {
        d.at = m;
        done();
      });
      typed("14:30, 2pm, 7:30 tối", d.at !== null && d.at !== void 0 && !offered.includes(d.at) ? fmtClock(d.at) : "", name + "-pop-at", (v) => {
        const m = parseClock(v);
        if (m === null) return false;
        d.at = m;
        done();
        return true;
      });
    } else if (key === "time") {
      const list2 = ev ? EVENT_LENGTHS : TIMES;
      const hasAt = d.at !== null && d.at !== void 0;
      for (const m of list2) chip(fmtMinutes(m), d.minutes === m, () => {
        d.minutes = m;
        done();
      });
      typed(ev && hasAt ? "1h 15m, or ends 16:00" : "1h 15m", d.minutes && !list2.includes(d.minutes) ? fmtMinutes(d.minutes) : "", name + "-pop-time", (v) => {
        const m = ev ? lengthOf(v, d.at) : parseMinutes(v);
        if (!m) return false;
        d.minutes = m;
        done();
        return true;
      });
    } else if (key === "tag") {
      const offered = [.../* @__PURE__ */ new Set([...d.tags, ...[...tagUses.entries()].sort((a, b) => b[1] - a[1]).map(([g]) => g)])].slice(0, 18);
      for (const g of offered) chip("#" + g, d.tags.includes(g), () => {
        d.tags = d.tags.includes(g) ? d.tags.filter((x2) => x2 !== g) : [...d.tags, g];
        draw(name + "-pop");
      });
      if (!offered.length) el(chips, "span", "hp-tk-pop-note", "No tags yet: type one below.");
      typed("new tag", "", name + "-pop-tag", (v) => {
        const g = v.trim().replace(/^#+/u, "").replace(/\s+/g, "-").replace(/[#,.;:!?()[\]{}"'`]/gu, "");
        if (!g || /^\d+$/.test(g)) return false;
        if (!d.tags.includes(g)) d.tags = [...d.tags, g];
        draw(name + "-pop-tag");
        return true;
      });
    }
    const w = host.clientWidth, pw = Math.min(320, Math.max(key === "due" || key === "start" ? 250 : 200, w - 16));
    pop.style.width = pw + "px";
    const x = anchor ? anchor.offsetLeft + anchor.offsetWidth / 2 - pw / 2 : w - pw;
    pop.style.left = Math.max(8, Math.min(x, w - pw - 8)) + "px";
    placePop = () => {
      const clip = clipRect(host), at = host.getBoundingClientRect();
      const below = clip.bottom - at.bottom - 8, above = at.top - clip.top - 8;
      const up = pop.offsetHeight > below && above > below;
      pop.classList.toggle("is-up", up);
      const room = up ? above : below;
      if (pop.offsetHeight > room) {
        pop.style.maxHeight = Math.max(160, room) + "px";
        pop.style.overflowY = "auto";
      }
    };
  }
  let placePop = null;
  function clipRect(node) {
    const view2 = doc.defaultView;
    for (let n2 = node.parentElement; n2 && n2 !== doc.body; n2 = n2.parentElement) {
      const s2 = view2.getComputedStyle(n2);
      if (/paint|strict|content/.test(s2.contain) || s2.overflowX !== "visible" || s2.overflowY !== "visible") return n2.getBoundingClientRect();
    }
    return { top: 0, bottom: view2.innerHeight };
  }
  function drawCalendar(pop, name, key, d, done) {
    const chosen = fromIso(d[key]);
    const month = (fromIso(store.calMonth) || chosen || today).startOf("month");
    const dayKey = (day) => name + "-cal-" + iso(day);
    const cal = el(pop, "div", "hp-tk-cal");
    const head = el(cal, "div", "hp-tk-cal-head");
    const turn = (n2, focusKey) => {
      store.calMonth = iso(month.plus({ months: n2 }));
      draw(focusKey);
    };
    button(head, "hp-tk-cal-nav", "left", "", "Previous month", () => turn(-1, name + "-cal-prev")).dataset.tkFocus = name + "-cal-prev";
    el(head, "span", "hp-tk-cal-month", month.setLocale("en").toFormat("LLLL yyyy"));
    button(head, "hp-tk-cal-nav", "right", "", "Next month", () => turn(1, name + "-cal-next")).dataset.tkFocus = name + "-cal-next";
    const grid = el(cal, "div", "hp-tk-cal-grid");
    for (const wd of ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]) el(grid, "span", "hp-tk-cal-wd", wd).setAttribute("aria-hidden", "true");
    const first = month.minus({ days: month.weekday - 1 });
    const weeks = Math.ceil((month.weekday - 1 + month.daysInMonth) / 7);
    const tabDay = chosen?.hasSame(month, "month") ? chosen : today.hasSame(month, "month") ? today : month;
    for (let i = 0; i < weeks * 7; i++) {
      const day = first.plus({ days: i });
      const on = !!chosen && day.hasSame(chosen, "day");
      const b = button(
        grid,
        cls("hp-tk-cal-day", !day.hasSame(month, "month") && "is-out", day.hasSame(today, "day") && "is-today", on && "is-on"),
        "",
        String(day.day),
        day.setLocale("en").toFormat("cccc d LLLL yyyy"),
        () => {
          d[key] = iso(day);
          done();
        }
      );
      b.dataset.tkFocus = dayKey(day);
      b.tabIndex = day.hasSame(tabDay, "day") ? 0 : -1;
      b.setAttribute("aria-pressed", String(on));
    }
    const STEPS = { ArrowLeft: { days: -1 }, ArrowRight: { days: 1 }, ArrowUp: { days: -7 }, ArrowDown: { days: 7 }, PageUp: { months: -1 }, PageDown: { months: 1 } };
    grid.addEventListener("keydown", (e) => {
      if (!isMounted() || !grid.isConnected) return;
      const from = fromIso((e.target.dataset?.tkFocus || "").slice((name + "-cal-").length));
      if (!from || !STEPS[e.key]) return;
      e.preventDefault();
      e.stopPropagation();
      const to = from.plus(STEPS[e.key]);
      const target = to.hasSame(month, "month") && grid.querySelector('[data-tk-focus="' + dayKey(to) + '"]');
      if (target) target.focus();
      else {
        store.calMonth = iso(to.startOf("month"));
        draw(dayKey(to));
      }
    });
  }
  const hasTime = (t) => t.at !== null && t.at !== void 0;
  const sameDay = (a, b) => !!a && !!b && a.hasSame(b, "day");
  const plainText = (s2) => String(s2 || "").replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1") || "(no text)";
  function periodNav(box, label, unit, step, toToday, current) {
    const nav = el(box, "div", "hp-tk-period");
    button(nav, "hp-tk-cal-nav", "left", "", "Previous " + unit, () => step(-1)).dataset.tkFocus = "period-prev";
    el(nav, "span", "hp-tk-period-label", label);
    button(nav, "hp-tk-cal-nav", "right", "", "Next " + unit, () => step(1)).dataset.tkFocus = "period-next";
    const b = button(nav, cls("hp-tk-chip", SKIN2.pill), "", "Today", "Back to this " + unit, toToday);
    b.disabled = current;
    b.dataset.tkFocus = "period-today";
  }
  const showWeek = (day) => {
    store.mode = "week";
    store.week = iso(day.startOf("week"));
    draw("mode-week");
  };
  function drawMonth(box, items) {
    const month = (fromIso(store.month) || today).startOf("month");
    periodNav(
      box,
      month.setLocale("en").toFormat("LLLL yyyy"),
      "month",
      (n2) => {
        store.month = iso(month.plus({ months: n2 }));
        draw();
      },
      () => {
        store.month = null;
        draw("period-today");
      },
      month.hasSame(today, "month")
    );
    const byDay = /* @__PURE__ */ new Map();
    for (const t of items) if (t.due) {
      const k = iso(t.due);
      (byDay.get(k) || byDay.set(k, []).get(k)).push(t);
    }
    const grid = el(box, "div", cls("hp-tk-month", SKIN2.panel));
    for (const wd of ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]) el(grid, "span", "hp-tk-month-wd", wd).setAttribute("aria-hidden", "true");
    const first = month.minus({ days: month.weekday - 1 });
    const weeks = Math.ceil((month.weekday - 1 + month.daysInMonth) / 7);
    const MAX = 3;
    for (let i = 0; i < weeks * 7; i++) {
      const day = first.plus({ days: i });
      const list2 = (byDay.get(iso(day)) || []).sort(order);
      const cell = el(grid, "div", cls("hp-tk-mday", !day.hasSame(month, "month") && "is-out", sameDay(day, today) && "is-today"));
      button(cell, "hp-tk-mday-num", "", String(day.day), "Show the week of " + day.setLocale("en").toFormat("cccc d LLLL"), () => showWeek(day));
      for (const t of list2.slice(0, MAX)) monthItem(cell, t);
      if (list2.length > MAX) button(cell, "hp-tk-mday-more", "", "+" + (list2.length - MAX) + " more", "Show the week of " + day.setLocale("en").toFormat("d LLLL"), () => showWeek(day));
    }
  }
  function monthItem(cell, t) {
    const ev = isEvent(t), words = plainText(t.text);
    const item = el(cell, "div", cls("hp-tk-mitem", ev && "is-event", t.sermon && "is-sermon", t.closed && "is-done", t.pending && "is-new"));
    if (ev) el(item, "span", "hp-tk-mitem-time", hasTime(t) ? fmtClock(t.at) : t.when || "All day");
    else {
      const check = button(item, cls("hp-tk-mcheck", SKIN2.knob), "check", "", (t.closed ? "Not done: " : "Done: ") + words, () => setDone(t, !t.closed));
      check.setAttribute("role", "checkbox");
      check.setAttribute("aria-checked", String(t.closed));
      check.disabled = !!t.pending || !!store.busy;
    }
    button(item, "hp-tk-mitem-text", t.sermon ? "book" : "", words, (t.sermon ? "Open the sermon: " : "Open the note: ") + words, (e) => openNote(t, e));
  }
  const DAY_START = 5 * 60, DAY_END = 24 * 60, HOUR_PX = 44, SNAP = 15, BLOCK = 30;
  const pxOf = (m) => (m - DAY_START) / 60 * HOUR_PX;
  const snap = (m) => Math.round(m / SNAP) * SNAP;
  const blockLen = (t) => t.minutes || BLOCK;
  const isPlanned = (t) => !isEvent(t) && !!t.sched && hasTime(t);
  const blockDay = (t) => isEvent(t) ? t.due : t.sched;
  const timed = (t) => isEvent(t) ? !!t.due && hasTime(t) : isPlanned(t);
  const dayChange = (t, day) => isEvent(t) ? { due: iso(day) } : { sched: iso(day) };
  const blockKey = (t) => "blk:" + t.path + ":" + t.line;
  function lanes(list2) {
    let cluster = [], laneEnds = [], clusterEnd = -Infinity;
    const flush = () => {
      for (const x of cluster) x.cols = laneEnds.length;
      cluster = [];
      laneEnds = [];
    };
    const sorted = [...list2].sort((a, b) => a.start - b.start || b.end - a.end);
    for (const x of sorted) {
      if (x.start >= clusterEnd) {
        flush();
        clusterEnd = -Infinity;
      }
      let lane = laneEnds.findIndex((e) => e <= x.start);
      if (lane < 0) {
        lane = laneEnds.length;
        laneEnds.push(0);
      }
      laneEnds[lane] = x.end;
      x.lane = lane;
      cluster.push(x);
      clusterEnd = Math.max(clusterEnd, x.end);
    }
    flush();
    return sorted;
  }
  function drawWeek(box, items) {
    const week = (fromIso(store.week) || today).startOf("week");
    const days = Array.from({ length: 7 }, (_, i) => week.plus({ days: i })), last = days[6];
    const label = week.setLocale("en").toFormat(week.month === last.month ? "d" : "d LLL") + " – " + last.setLocale("en").toFormat("d LLL yyyy");
    periodNav(
      box,
      label,
      "week",
      (n2) => {
        store.week = iso(week.plus({ weeks: n2 }));
        draw();
      },
      () => {
        store.week = null;
        draw("period-today");
      },
      days.some((d) => sameDay(d, today))
    );
    const layout = el(box, "div", "hp-tk-week");
    const tray = el(layout, "div", cls("hp-tk-tray", SKIN2.panel));
    const loose = items.filter((t) => !isEvent(t) && !t.closed && !isPlanned(t)).sort(order);
    const th = el(tray, "div", "hp-tk-group-head");
    el(th, "span", "", "Not planned");
    el(th, "b", "hp-tk-count", String(loose.length));
    if (!loose.length) el(tray, "p", "hp-tk-empty", "Everything is planned.");
    for (const t of loose) {
      const words = plainText(t.text);
      const it = el(tray, "div", cls("hp-tk-tray-item", t.pending && "is-new"));
      it.tabIndex = 0;
      it.setAttribute("role", "button");
      it.setAttribute("aria-label", "Plan " + words + ": drag it onto the week, or press Enter for the next free time today");
      it.title = "Drag onto the week to plan it. Enter: the next free time today. Click: open its note.";
      it.dataset.tkFocus = "tray:" + t.path + ":" + t.line;
      el(it, "span", "hp-tk-tray-text", words);
      const meta = [t.minutes ? fmtMinutes(t.minutes) : "", t.due ? "due " + dayLabel(t.due) : ""].filter(Boolean).join(" · ");
      if (meta) el(it, "span", cls("hp-tk-tray-meta", t.due && t.due < today && "is-late"), meta);
      if (t.pending) continue;
      it.addEventListener("pointerdown", (e) => startDrag(e, t, "plan", it));
      it.addEventListener("keydown", (e) => {
        if (!isMounted() || !it.isConnected || e.key !== "Enter") return;
        e.preventDefault();
        planNext(t, items);
      });
    }
    const cal = el(layout, "div", cls("hp-tk-wcal", SKIN2.panel));
    const headRow = el(cal, "div", "hp-tk-wrow hp-tk-whead");
    el(headRow, "span", "hp-tk-wgut");
    for (const d of days) el(headRow, "div", cls("hp-tk-wday", sameDay(d, today) && "is-today"), d.setLocale("en").toFormat("ccc d"));
    const allRow = el(cal, "div", "hp-tk-wrow hp-tk-wall");
    el(allRow, "span", "hp-tk-wgut hp-tk-wall-label", "All day");
    for (const d of days) {
      const cell = el(allRow, "div", "hp-tk-wallday");
      for (const t of items.filter((x) => isEvent(x) && !hasTime(x) && sameDay(x.due, d)).sort(order)) weekChip(cell, t, "is-event");
      for (const t of items.filter((x) => !isEvent(x) && sameDay(x.due, d)).sort(order)) weekChip(cell, t, "is-due");
    }
    const body2 = el(cal, "div", "hp-tk-wrow hp-tk-wbody");
    const gut = el(body2, "div", "hp-tk-wgut hp-tk-whours");
    gut.style.height = pxOf(DAY_END) + "px";
    for (let m = DAY_START; m < DAY_END; m += 60) el(gut, "span", "hp-tk-whour", fmtClock(m)).style.top = pxOf(m) + "px";
    nowLine = null;
    for (const d of days) {
      const col = el(body2, "div", cls("hp-tk-wcol", sameDay(d, today) && "is-today"));
      col.style.height = pxOf(DAY_END) + "px";
      col.style.backgroundSize = "100% " + HOUR_PX + "px";
      col.dataset.tkDay = iso(d);
      for (const x of lanes(items.filter((t) => timed(t) && sameDay(blockDay(t), d)).map((t) => ({ t, start: t.at, end: t.at + blockLen(t) })))) drawBlock(col, x);
      if (sameDay(d, today)) {
        nowLine = el(col, "div", "hp-tk-wnow");
        placeNow();
      }
    }
  }
  function placeNow() {
    if (!nowLine?.isConnected) return;
    const m = minutesNow();
    nowLine.hidden = m < DAY_START || m > DAY_END;
    nowLine.style.top = pxOf(Math.min(Math.max(m, DAY_START), DAY_END)) + "px";
  }
  function weekChip(cell, t, kind) {
    const words = plainText(t.text), due = kind === "is-due";
    button(
      cell,
      cls("hp-tk-wchip", kind, t.sermon && "is-sermon", t.closed && "is-done"),
      due ? "calendar" : t.sermon ? "book" : "",
      words,
      (due ? "Due: " : t.sermon ? "Sermon: " : "") + words + ". Open its note",
      (e) => openNote(t, e)
    );
  }
  function drawBlock(col, x) {
    const t = x.t, ev = isEvent(t), words = plainText(t.text);
    const top = pxOf(Math.max(x.start, DAY_START)), bottom = pxOf(Math.min(x.end, DAY_END));
    const b = el(col, "div", cls("hp-tk-blk", ev && "is-event", t.sermon && "is-sermon", t.sermon && !t.minutes && "is-brief", t.closed && "is-done", ended(t) && "is-past", t.pending && "is-new"));
    b.style.top = top + "px";
    b.style.height = Math.max(bottom - top, 18) + "px";
    b.style.left = "calc(" + x.lane / x.cols * 100 + "% + 2px)";
    b.style.width = "calc(" + 100 / x.cols + "% - 4px)";
    const range = fmtClock(t.at) + (t.sermon && !t.minutes ? "" : "–" + fmtClock(t.at + blockLen(t)));
    b.tabIndex = 0;
    b.setAttribute("role", "button");
    b.setAttribute("aria-label", words + ", " + range + (t.sermon ? ", sermon" : ev ? ", event" : ""));
    b.title = words + "\n" + range + (t.sermon ? "\nSermon: its date and time are in its properties. Click or Enter opens it." : (!ev && !t.minutes ? " (no time needed set: 30m)" : "") + "\nDrag to move, or its bottom edge to change the length." + (ev ? "" : " Drag onto Not planned to unplan.") + "\nKeys: ↑ ↓ move · Shift+↑ ↓ length · ← → day" + (ev ? "" : " · Delete unplan") + " · Enter open the note");
    b.dataset.tkFocus = blockKey(t);
    el(b, "span", "hp-tk-blk-time", range);
    const text = el(b, "span", "hp-tk-blk-text");
    if (t.sermon) icon(text, "book");
    text.append(words);
    if (t.pending) return;
    if (t.sermon) {
      b.addEventListener("click", (e) => openNote(t, e));
      b.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          openNote(t, e);
        }
      });
      return;
    }
    const grip = el(b, "span", "hp-tk-blk-grip");
    grip.setAttribute("aria-hidden", "true");
    b.addEventListener("pointerdown", (e) => startDrag(e, t, e.target === grip ? "resize" : "move", b));
    b.addEventListener("keydown", (e) => keyOnBlock(e, t));
  }
  function keyOnBlock(e, t) {
    if (!isMounted() || store.busy) return;
    const len = blockLen(t);
    let change = null;
    if (e.key === "Enter") {
      e.preventDefault();
      openNote(t, e);
      return;
    }
    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
      const step = e.key === "ArrowUp" ? -SNAP : SNAP;
      if (e.shiftKey) {
        const m = len + step;
        if (m >= SNAP && t.at + m <= 24 * 60) change = { minutes: m };
      } else {
        const at = t.at + step;
        if (at >= 0 && at + len <= 24 * 60) change = { at };
      }
    } else if (e.key === "ArrowLeft" || e.key === "ArrowRight") change = dayChange(t, blockDay(t).plus({ days: e.key === "ArrowLeft" ? -1 : 1 }));
    else if ((e.key === "Delete" || e.key === "Backspace") && !isEvent(t)) change = { sched: null, at: null };
    if (!change) return;
    e.preventDefault();
    reschedule(t, change, blockKey(t));
  }
  function planNext(t, items) {
    const len = blockLen(t);
    const taken = items.filter((x) => x !== t && timed(x) && sameDay(blockDay(x), today)).map((x) => [x.at, x.at + blockLen(x)]);
    let at = Math.max(DAY_START, Math.ceil(minutesNow() / SNAP) * SNAP);
    for (let moved = true; moved; ) {
      moved = false;
      for (const [s2, e] of taken) if (at < e && at + len > s2) {
        at = Math.ceil(e / SNAP) * SNAP;
        moved = true;
      }
    }
    if (at + len > DAY_END) {
      notify("No free time left today between " + fmtClock(DAY_START) + " and midnight.");
      return;
    }
    reschedule(t, { sched: iso(today), at });
  }
  function startDrag(e, t, kind, node) {
    if (!isMounted() || store.busy || e.button !== 0 || t.pending) return;
    const x0 = e.clientX, y0 = e.clientY, len = blockLen(t);
    const grab = kind === "move" ? (y0 - node.getBoundingClientRect().top) / HOUR_PX * 60 : 0;
    const cols = [...wrap.querySelectorAll(".hp-tk-wcol")], tray = wrap.querySelector(".hp-tk-tray");
    let active = false, ghost = null, target = null;
    const inside2 = (n2, x, y, pad = 0) => {
      const r = n2.getBoundingClientRect();
      return x >= r.left && x <= r.right && y >= r.top - pad && y <= r.bottom + pad;
    };
    const minuteAt = (col, y) => DAY_START + (y - col.getBoundingClientRect().top) / HOUR_PX * 60;
    const where = (x, y) => {
      if (kind === "resize") {
        const end = Math.min(DAY_END, Math.max(t.at + SNAP, snap(minuteAt(node.parentElement, y))));
        return { col: node.parentElement, at: t.at, minutes: end - t.at };
      }
      if (tray && inside2(tray, x, y)) return isPlanned(t) ? { tray: true } : null;
      const col = cols.find((c) => inside2(c, x, y, 24));
      if (!col) return null;
      const at = Math.max(DAY_START, Math.min(snap(minuteAt(col, y) - grab), DAY_END - Math.min(len, DAY_END - DAY_START)));
      return { col, at, minutes: len };
    };
    const show = () => {
      ghost?.remove();
      ghost = null;
      tray?.classList.toggle("is-drop", !!target?.tray);
      if (!target || target.tray) return;
      ghost = el(target.col, "div", cls("hp-tk-blk hp-tk-ghost", isEvent(t) && "is-event"));
      ghost.style.top = pxOf(target.at) + "px";
      ghost.style.height = Math.max(pxOf(Math.min(target.at + target.minutes, DAY_END)) - pxOf(target.at), 18) + "px";
      el(ghost, "span", "hp-tk-blk-time", fmtClock(target.at) + "–" + fmtClock(target.at + target.minutes));
    };
    const move = (ev) => {
      if (!active) {
        if (Math.hypot(ev.clientX - x0, ev.clientY - y0) < 5) return;
        active = true;
        node.classList.add("is-dragging");
        wrap.classList.add("is-dragging");
      }
      ev.preventDefault();
      target = where(ev.clientX, ev.clientY);
      show();
    };
    const stop = (commit) => {
      doc.removeEventListener("pointermove", move);
      doc.removeEventListener("pointerup", up);
      doc.removeEventListener("pointercancel", cancel);
      doc.removeEventListener("keydown", esc, true);
      if (drag === handle) drag = null;
      ghost?.remove();
      tray?.classList.remove("is-drop");
      node.classList.remove("is-dragging");
      wrap.classList.remove("is-dragging");
      const to = target;
      if (!commit || !to || !isMounted()) return;
      if (to.tray) {
        reschedule(t, { sched: null, at: null });
        return;
      }
      if (kind === "resize") {
        if (to.minutes !== len) reschedule(t, { minutes: to.minutes }, blockKey(t));
        return;
      }
      const day = fromIso(to.col.dataset.tkDay);
      if (timed(t) && sameDay(blockDay(t), day) && to.at === t.at) return;
      reschedule(t, { ...dayChange(t, day), at: to.at }, blockKey(t));
    };
    const up = (ev) => {
      if (active) {
        target = where(ev.clientX, ev.clientY);
        stop(true);
        return;
      }
      stop(false);
      if (kind !== "resize") openNote(t, ev);
    };
    const cancel = () => stop(false);
    const esc = (ev) => {
      if (ev.key === "Escape") {
        ev.preventDefault();
        ev.stopPropagation();
        stop(false);
      }
    };
    const handle = { stop };
    drag?.stop(false);
    drag = handle;
    doc.addEventListener("pointermove", move);
    doc.addEventListener("pointerup", up);
    doc.addEventListener("pointercancel", cancel);
    doc.addEventListener("keydown", esc, true);
  }
  function draw(focusKey) {
    if (!isMounted()) return;
    const active = doc.activeElement;
    const key = focusKey ?? (active && wrap.contains(active) ? active.dataset?.tkFocus : null);
    const caret = !focusKey && active?.tagName === "INPUT" && active.type === "text" ? [active.selectionStart, active.selectionEnd] : null;
    wrap.replaceChildren();
    placePop = null;
    render2();
    if (placePop) placePop();
    const target = key && wrap.querySelector('[data-tk-focus="' + key + '"]');
    if (target) {
      target.focus({ preventScroll: true });
      if (caret && target.setSelectionRange) target.setSelectionRange(...caret);
    }
  }
  wrap.addEventListener("focusin", (e) => {
    if (isMounted()) {
      store.focus = e.target.dataset?.tkFocus || null;
      store.focusAt = Date.now();
    }
  });
  wrap.addEventListener("focusout", () => later(() => {
    if (!wrap.contains(doc.activeElement)) store.focus = null;
  }, 0));
  const back = store.focus && Date.now() - (store.focusAt || 0) < 6e4 && (!doc.activeElement || doc.activeElement === doc.body) ? store.focus : null;
  draw(back || void 0);
  tick = win.setInterval(() => {
    if (!isMounted()) {
      cleanup();
      return;
    }
    if (drag) return;
    placeNow();
    const now2 = dayNow();
    if (!now2.hasSame(today, "day")) {
      today = now2;
      draw();
    } else if (tasks.filter(ended).length !== endedCount) draw();
  }, 6e4);
}

