// src/modules/roster.ts
var def5 = (() => {
  const DAYS = "chúa nhật|chủ nhật|cn|thứ\\s*(?:hai|ba|tư|năm|sáu|bảy|[2-7])|sunday|monday|tuesday|wednesday|thursday|friday|saturday";
  const DATE_HEAD = new RegExp("^(ngày|date|dates|day|" + DAYS + ")$", "iu");
  const SKIP_HEAD = /^(#|stt|tt|no\.?|tuần|week)$/iu;
  const INFO_HEAD = /^(ghi chú|chú thích|notes?|remarks?|sự kiện|events?|occasion|dịp|chủ đề|đề tài|theme|topic|kinh thánh|scripture|passage|câu gốc|series)$/iu;
  const EMPTY = /^(-+|—|–|\?|tba|tbd|n\/a)?$/iu;
  const WEEKDAY = new RegExp("(?<!\\p{L})(" + DAYS + "|sun|mon|tue|tues|wed|thu|thur|thurs|fri|sat|ngày)(?!\\p{L})\\.?,?", "giu");
  const PERIOD = /(?<!\p{L})(?:quý|quí|quy|quarter|q|tháng|month|năm|year)\s*\d|(?<!\d)(?:19|20)\d{2}(?!\d)/iu;
  const tidy = (s2) => String(s2 ?? "").replace(/~~[\s\S]*?~~/g, "").replace(/\s*(?:→|->)\s*/g, ", ").replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, "").replace(/(\*\*|__|==|`)/g, "").replace(/^[\s,]+|[\s,]+$/g, "");
  const plain = (s2) => tidy(s2).replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/(^|\s)[*_]([^*_]+)[*_](?=\s|$)/g, "$1$2").replace(/\s+/g, " ").trim();
  function cellsOf(line) {
    let s2 = line.trim();
    if (s2.startsWith("|")) s2 = s2.slice(1);
    if (s2.endsWith("|") && !s2.endsWith("\\|")) s2 = s2.slice(0, -1);
    const cells = [];
    let cur = "", depth = 0;
    for (let i = 0; i < s2.length; i++) {
      if (s2[i] === "\\" && s2[i + 1] === "|") {
        cur += "|";
        i++;
        continue;
      }
      if (s2.startsWith("[[", i)) depth++;
      if (s2.startsWith("]]", i)) depth = Math.max(0, depth - 1);
      if (s2[i] === "|" && !depth) {
        cells.push(cur.trim());
        cur = "";
        continue;
      }
      cur += s2[i];
    }
    cells.push(cur.trim());
    return cells;
  }
  const isRule = (line) => {
    const c = cellsOf(line);
    return c.length > 0 && c.every((x) => /^:?-{2,}:?$/.test(x));
  };
  const iso = (y, m, d) => {
    const t = new Date(Date.UTC(y, m - 1, d));
    return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? t.toISOString().slice(0, 10) : null;
  };
  function yearFor(m, d, hint, todayIso) {
    if (hint.year) {
      if (hint.quarter) {
        const first = (hint.quarter - 1) * 3 + 1;
        if (m < first - 6) return hint.year + 1;
        if (m > first + 8) return hint.year - 1;
      }
      return hint.year;
    }
    const y0 = Number((todayIso || (/* @__PURE__ */ new Date()).toISOString()).slice(0, 4));
    const t0 = Date.parse(todayIso || (/* @__PURE__ */ new Date()).toISOString().slice(0, 10));
    return [y0 - 1, y0, y0 + 1].sort((a, b) => Math.abs(Date.parse(iso(a, m, d) || 0) - t0) - Math.abs(Date.parse(iso(b, m, d) || 0) - t0))[0];
  }
  const FULL_MONTHS = ["january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december"];
  const monthOf = (w) => {
    const k = String(w).toLowerCase();
    return k.length >= 3 ? FULL_MONTHS.findIndex((f) => f.startsWith(k)) + 1 || null : null;
  };
  function dateOf(raw, hint, todayIso) {
    const s2 = plain(raw).replace(WEEKDAY, " ").replace(/^[\s,.:–—-]+/, "").trim();
    let y = null, m = null, d = null, x;
    if (x = s2.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})(?!\d)/)) [y, m, d] = [+x[1], +x[2], +x[3]];
    else if (x = s2.match(/^(\d{1,2})[/.-](\d{1,2})(?:[/.-](\d{4}|\d{2}))?(?!\d)/)) {
      [d, m] = [+x[1], +x[2]];
      if (m > 12 && d <= 12) [d, m] = [m, d];
      if (x[3]) y = x[3].length === 2 ? 2e3 + +x[3] : +x[3];
    } else if (x = s2.match(/^(\d{1,2})\s*(?:tháng|th|t)\s*(\d{1,2})(?:\s*(?:năm|,|\/)?\s*(\d{4}))?(?!\d)/iu)) [d, m, y] = [+x[1], +x[2], x[3] ? +x[3] : null];
    else if ((x = s2.match(/^(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?(\p{L}{3,9})\.?,?(?:\s+(\d{4}))?(?![\p{L}\d])/iu)) && monthOf(x[2])) [d, m, y] = [+x[1], monthOf(x[2]), x[3] ? +x[3] : null];
    else if ((x = s2.match(/^(\p{L}{3,9})\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?(?:\s+(\d{4}))?(?!\d)/iu)) && monthOf(x[1])) [m, d, y] = [monthOf(x[1]), +x[2], x[3] ? +x[3] : null];
    else return null;
    if (!m || !d) return null;
    const date = iso(y || yearFor(m, d, hint, todayIso), m, d);
    return date ? { iso: date, rest: s2.slice(x[0].length).replace(/^[\s,.:;()–—-]+|[\s()]+$/g, "").trim() } : null;
  }
  function peopleOf(cell) {
    const links = [];
    const s2 = tidy(cell).replace(/\[\[[^\]]*\]\]/g, (m) => "\0" + (links.push(m) - 1) + "\0");
    if (EMPTY.test(plain(s2))) return [];
    return s2.split(/\s*(?:[,;\n/&+]|\s(?:và|and)\s)\s*/iu).map((p) => p.replace(/\u0000(\d+)\u0000/g, (_, i) => links[+i]).trim()).filter((p) => p && !EMPTY.test(plain(p)));
  }
  function hintOf(text) {
    const y = String(text).match(/(?<!\d)((?:19|20)\d{2})(?!\d)/);
    const q = String(text).match(/(?:quý|quí|quy|quarter|q)\s*([1-4])(?!\d)/iu) || String(text).match(/(?<!\d)([1-4])\s*(?:quý|quí|quarter)/iu);
    return { year: y ? +y[1] : null, quarter: q ? +q[1] : null };
  }
  function parse2(text, fileName = "", todayIso = "") {
    let body2 = String(text ?? "").replace(/^﻿?---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
    const start = body2.search(/%%\s*church-roster:start/i), end = body2.search(/%%\s*church-roster:end/i);
    if (start >= 0) body2 = body2.slice(start, end > start ? end : void 0);
    body2 = body2.replace(/%%[\s\S]*?%%/g, "").replace(/<!--[\s\S]*?-->/g, "");
    const hint = hintOf(fileName);
    const out = [];
    const lines = body2.split(/\r?\n/);
    let section = "", sectionLevel = 7, dateCtx = null, service = "";
    const entryFor = (date, svc, note) => {
      let e = out.find((x) => x.date === date && x.service === svc);
      if (!e) out.push(e = { date, service: svc, roles: [], info: [], note: note || "" });
      else if (note && !e.note) e.note = note;
      return e;
    };
    const addCell = (e, label, cell) => {
      const l2 = plain(label);
      if (!l2 || SKIP_HEAD.test(l2)) return;
      if (INFO_HEAD.test(l2)) {
        const v = plain(cell);
        if (!EMPTY.test(v)) e.info.push({ label: l2, value: v });
        return;
      }
      e.roles.push({ role: l2, people: peopleOf(cell) });
    };
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
      if (h) {
        const level = h[1].length, title = plain(h[2]);
        const d2 = dateOf(title, hint, todayIso);
        if (d2 && !d2.rest.match(/^\p{L}{0,2}\d/u)) {
          dateCtx = { iso: d2.iso, level, note: d2.rest };
          service = "";
          continue;
        }
        if (PERIOD.test(title)) {
          const yh = hintOf(title);
          if (yh.year) Object.assign(hint, { year: yh.year, quarter: yh.quarter || hint.quarter });
          else if (yh.quarter) hint.quarter = yh.quarter;
          if (level <= sectionLevel) {
            section = "";
            sectionLevel = 7;
          }
          dateCtx = null;
          service = section;
          continue;
        }
        if (dateCtx && level > dateCtx.level) service = title;
        else {
          dateCtx = null;
          section = service = title;
          sectionLevel = level;
        }
        continue;
      }
      if (/^\s*\|/.test(line) && i + 1 < lines.length && isRule(lines[i + 1])) {
        const head = cellsOf(line).map(plain);
        const rows = [];
        for (i += 2; i < lines.length && /^\s*\|/.test(lines[i]); i++) rows.push(cellsOf(lines[i]));
        i--;
        const svc = dateCtx ? service : section;
        let cols = head.map((x, j) => DATE_HEAD.test(x) ? j : -1).filter((j) => j >= 0);
        if (!cols.length) {
          const score = head.map((_, j) => rows.filter((r) => dateOf(r[j], hint, todayIso)).length);
          const best = Math.max(0, ...score);
          if (best && best >= rows.length / 2) cols = [score.indexOf(best)];
        }
        if (cols.length) {
          for (const r of rows) cols.forEach((col, k) => {
            const d2 = dateOf(r[col], hint, todayIso);
            if (!d2) return;
            const e = entryFor(d2.iso, svc, d2.rest);
            for (let j = k ? col + 1 : 0; j < (cols[k + 1] ?? head.length); j++) if (j !== col) addCell(e, head[j], r[j] ?? "");
          });
          continue;
        }
        const across = head.map((x, j) => j > 0 ? dateOf(x, hint, todayIso) : null);
        if (across.filter(Boolean).length >= Math.max(1, (head.length - 1) / 2)) {
          across.forEach((d2, j) => {
            if (!d2) return;
            const e = entryFor(d2.iso, svc, d2.rest);
            for (const r of rows) addCell(e, r[0], r[j] ?? "");
          });
          continue;
        }
        if (dateCtx && head.length >= 2) {
          const e = entryFor(dateCtx.iso, service, dateCtx.note);
          const named = /^(vai trò|việc|nhiệm vụ|ban|role|duty|task|position)$/iu.test(head[0]);
          if (!named) addCell(e, head[0], head.slice(1).join(", "));
          for (const r of rows) addCell(e, r[0], r.slice(1).filter(Boolean).join(", "));
        }
        continue;
      }
      const item = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(.*)$/);
      const textOfLine = (item ? item[1] : line).trim();
      if (!textOfLine) continue;
      const d = dateOf(textOfLine, hint, todayIso);
      if (d && !d.rest) {
        dateCtx = { iso: d.iso, level: 7, note: d.rest };
        service = "";
        continue;
      }
      const field = textOfLine.match(/^(?:\*\*|__)?([^:：|]{1,40}?)(?:\*\*|__)?\s*(?:::?|：)\s*(?:\*\*|__)?\s*(.*)$/u);
      if (dateCtx && field) addCell(entryFor(dateCtx.iso, service, dateCtx.note), field[1], field[2]);
    }
    return out.filter((e) => e.roles.length || e.info.length);
  }
  const fold = (t) => String(t ?? "").normalize("NFC").toLowerCase().replace(/\s+/g, " ").trim();
  const escapeRe = (s2) => s2.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  function churchOf(app, f, churches) {
    const prop = app.metadataCache?.getFileCache?.(f)?.frontmatter?.church;
    const own = plain(Array.isArray(prop) ? prop[0] : prop);
    if (own) return churches.find((c) => fold(c) === fold(own)) || own;
    return churches.find((c) => fold(f.basename).includes(fold(c))) || "";
  }
  const scheduleOf = (base, church) => String(base).normalize("NFC").replace(church ? new RegExp(escapeRe(church.normalize("NFC")), "iu") : /(?!)/, " ").replace(/^\s*lịch\s+/iu, "").replace(/(?<!\p{L})(?:quý|quí|quy|quarter|năm|year)\s*\d*(?![\p{L}\d])/giu, " ").replace(/(?<!\d)(?:19|20)\d{2}(?!\d)/g, " ").replace(/\s+/g, " ").replace(/^[\s\-–—_,:]+|[\s\-–—_,:]+$/g, "").trim();
  async function readRoster(app, folder, churches, todayIso) {
    const root = app.vault.getAbstractFileByPath(folder);
    if (!root || !Array.isArray(root.children)) return { missing: true, days: [], notes: 0 };
    const walk = (f) => Array.isArray(f.children) ? f.children.flatMap(walk) : [f];
    const notes = walk(root).filter((f) => String(f.extension).toLowerCase() === "md").sort((a, b) => (b.stat?.mtime ?? 0) - (a.stat?.mtime ?? 0) || b.path.localeCompare(a.path));
    const texts = await Promise.all(notes.map((f) => app.vault.cachedRead(f).catch(() => "")));
    const byDay = /* @__PURE__ */ new Map();
    notes.forEach((f, k) => {
      const church = churchOf(app, f, churches);
      for (const e of parse2(texts[k], f.basename, todayIso)) {
        const service = e.service || scheduleOf(f.basename, church) || f.basename;
        const day = byDay.get(e.date) || byDay.set(e.date, { iso: e.date, services: [] }).get(e.date);
        if (day.services.some((s2) => s2.church === church && s2.service === service && s2.path !== f.path)) continue;
        day.services.push({ ...e, church, service, team: !e.service, path: f.path });
      }
    });
    return { missing: false, notes: notes.length, days: [...byDay.values()].sort((a, b) => a.iso.localeCompare(b.iso)) };
  }
  const FOLDER = "Church Roster";
  const TITLE = /^((?:\p{Lu}[\p{L}]{0,3}\.\s*)+)(.+)$/u;
  return {
    name: "Sunday roster",
    about: "Who is doing what this week, church by church, from the roster notes",
    width: 12,
    variants: [["list", "List"], ["tiles", "Tiles"]],
    parse: parse2,
    // for the harness's parser checks
    async render(body2, { ui, time, app, config, store, variant }) {
      const { el } = ui;
      const today = time.today, todayIso = today.toISODate();
      const folder = config.rosterFolder || FOLDER;
      const churches = config.rosterChurches || [];
      const me = new Set((config.rosterMe || []).map(fold));
      const isMe = (name) => {
        const p = plain(name);
        return me.has(fold(p)) || me.has(fold(p.replace(TITLE, "$2")));
      };
      const fmt2 = (d, f) => d.setLocale("en").toFormat(f);
      const dt = (isoDay) => time.DateTime.fromISO(isoDay).startOf("day");
      ui.section(body2, "Sunday roster");
      const card = el(body2, "div", "m-roster hp-card hp-grow is-" + variant);
      const view = el(card, "div", "m-roster-view");
      const empty = (text) => el(view, "div", "hp-empty m-roster-empty", text);
      const { missing, notes, days } = await readRoster(app, folder, churches, todayIso);
      if (missing) {
        empty("No “" + folder + "” folder in the vault. Set rosterFolder in registry.js to the folder Church Roster exports to.");
        return;
      }
      if (!days.length) {
        empty(notes ? "No dates found in the notes in “" + folder + "”." : "No roster notes in “" + folder + "” yet. Export a quarter from Church Roster.");
        return;
      }
      const weeks = [];
      for (const day of days) {
        const monday = dt(day.iso).startOf("week").toISODate();
        if (weeks.at(-1)?.monday !== monday) weeks.push({ monday, days: [] });
        weeks.at(-1).days.push(day);
      }
      const thisMonday = today.startOf("week").toISODate();
      const home = weeks.find((w) => w.monday >= thisMonday) || null;
      if (store.pick?.on !== todayIso) store.pick = null;
      const bar = ui.bar(card), aside = bar.tools;
      const back = ui.button(aside, "hp-btn hp-pill hp-back m-roster-back", "reset", "This Sunday", "Back to this Sunday", () => {
        store.pick = null;
        draw();
      });
      const prev = ui.button(aside, "hp-round hp-knob", "left", "", "Previous week on the roster", () => go(-1));
      const next = ui.button(aside, "hp-round hp-knob", "right", "", "Next week on the roster", () => go(1));
      const shown = () => store.pick && weeks.find((w) => w.monday === store.pick.monday) || home;
      function go(step) {
        const cur = shown();
        const i = cur ? weeks.indexOf(cur) + step : step < 0 ? weeks.length - 1 : -1;
        if (i < 0 || i >= weeks.length) return;
        store.pick = weeks[i] === home ? null : { monday: weeks[i].monday, on: todayIso };
        draw();
      }
      function names(parent, people) {
        const list2 = el(parent, "div", "m-roster-names");
        people.forEach((p, k) => {
          if (k) el(list2, "span", "m-roster-sep", ", ");
          const m = tidy(p).match(TITLE);
          const item = el(list2, "span", "m-roster-name" + (isMe(p) ? " is-me" : ""));
          if (m) el(item, "small", "m-roster-title", m[1].trim());
          const text = m ? m[2] : tidy(p);
          if (/\[\[/.test(text)) ui.render(item, text);
          else item.append(text);
        });
        return list2;
      }
      function serviceBox(parent, s2, label) {
        const box = el(parent, "div", "m-roster-service");
        if (label) el(box, "div", "m-roster-svc hp-kicker", label);
        const about = [...new Set([s2.note, ...s2.info.map((x) => x.value)].filter(Boolean))];
        if (about.length) el(box, "div", "m-roster-note", about.join(" · "));
        const filled = s2.roles.filter((r) => r.people.length);
        if (!filled.length) {
          el(box, "div", "hp-empty", "Nobody on the roster.");
          return;
        }
        const list2 = el(box, "div", variant === "tiles" ? "m-roster-tiles" : "m-roster-rows");
        for (const r of filled) {
          const row = el(list2, "div", variant === "tiles" ? "m-roster-tile hp-panel" : "m-roster-row");
          if (r.people.some(isMe)) row.classList.add("is-mine");
          el(row, "div", "m-roster-role", r.role);
          names(row, r.people);
        }
      }
      function draw() {
        view.replaceChildren();
        bar.row.querySelector(":scope > .hp-bar-main")?.remove();
        const week = shown();
        const i = week ? weeks.indexOf(week) : -1;
        prev.disabled = week ? i <= 0 : !weeks.some((w) => w.monday < thisMonday);
        next.disabled = !week || i >= weeks.length - 1;
        back.classList.toggle("is-off", !store.pick);
        if (!week) {
          empty("Nothing on the roster from this week on. The last date in “" + folder + "” is " + fmt2(dt(days.at(-1).iso), "d LLL yyyy") + "; add the next quarter's roster.");
          return;
        }
        const sunday = dt(week.monday).plus({ days: 6 }), n2 = time.daysUntil(sunday);
        const dayOf2 = (s2) => fmt2(dt(s2.iso), "ccc d LLL");
        const rank = (c) => {
          const k = churches.indexOf(c);
          return k < 0 ? churches.length + (c ? 0 : 1) : k;
        };
        const all = week.days.flatMap((d) => d.services.map((s2) => ({ ...s2, iso: d.iso }))).sort((a, b) => rank(a.church) - rank(b.church) || a.church.localeCompare(b.church) || a.iso.localeCompare(b.iso) || a.team - b.team || a.service.localeCompare(b.service, "vi", { numeric: true }));
        const head = el(null, "div", "m-roster-head hp-bar-main");
        bar.row.insertBefore(head, aside);
        const badge = el(head, "div", "m-roster-badge hp-panel" + (n2 === 0 ? " is-today" : ""));
        el(badge, "b", "hp-num", fmt2(sunday, "d"));
        el(badge, "span", "", fmt2(sunday, "LLL"));
        const when = el(head, "div", "m-roster-when");
        ui.heading(when, 3, "m-roster-day", fmt2(sunday, "cccc d LLLL"));
        el(when, "div", "m-roster-sub", time.relLabel(n2));
        const mine = all.flatMap((s2) => s2.roles.filter((r) => r.people.some(isMe)).map((r) => {
          const where = [s2.church, s2.service, s2.iso !== sunday.toISODate() && dayOf2(s2)].filter(Boolean).join(" · ");
          return r.role + (where ? " (" + where + ")" : "");
        }));
        if (mine.length) {
          const you = el(view, "div", "m-roster-you hp-pill");
          ui.icon(you, "check");
          el(you, "span", "", "You: " + mine.join(", "));
        }
        const groups = [];
        for (const s2 of all) {
          if (groups.at(-1)?.church !== s2.church) groups.push({ church: s2.church, services: [] });
          groups.at(-1).services.push(s2);
        }
        const list2 = el(view, "div", "m-roster-churches");
        for (const g of groups) {
          const block = el(list2, "section", "m-roster-church");
          if (g.church) ui.heading(block, 3, "m-roster-church-name", g.church);
          const manyDays = new Set(g.services.map((s2) => s2.iso)).size > 1;
          const manyServices = new Set(g.services.map((s2) => s2.service)).size > 1;
          const grid = el(block, "div", "m-roster-services" + (g.services.length > 1 ? " is-multi" : ""));
          for (const s2 of g.services) serviceBox(grid, s2, [manyDays && dayOf2(s2), manyServices && s2.service].filter(Boolean).join(" · "));
        }
        const files = [...new Set(all.map((s2) => s2.path))];
        const foot = el(view, "div", "m-roster-foot");
        ui.icon(foot, "note");
        files.forEach((path, k) => {
          if (k) foot.append(" · ");
          ui.link(foot, path, path.split("/").pop().replace(/\.md$/i, ""));
        });
      }
      draw();
    }
  };
})();
def5.watch = (paths, { config }) => anyUnder(paths, config.rosterFolder);
var roster_default = def5;

