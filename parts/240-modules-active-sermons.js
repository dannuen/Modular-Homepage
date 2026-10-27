// src/modules/active-sermons.ts
var def8 = (() => {
  const OUTLINE_MAX = 6;
  const UP_STYLES = [["carousel", "Carousel"], ["profile", "Profile"], ["photo", "Photo"]];
  const IMAGE_EFFECTS = [
    ["mono", "Mono", "grayscale(1) contrast(1.08)"],
    ["noir", "Noir", "grayscale(1) contrast(1.45) brightness(0.88)"],
    ["accent", "Accent", "grayscale(1) sepia(1) hue-rotate(calc((var(--accent-h) - 35) * 1deg)) saturate(1.8) contrast(1.05)"],
    ["sepia", "Sepia", "sepia(0.75) contrast(1.05) saturate(1.1)"],
    ["faded", "Faded", "contrast(0.8) saturate(0.6) brightness(1.1)"],
    ["vivid", "Vivid", "saturate(1.45) contrast(1.12)"],
    ["dreamy", "Dreamy", "blur(1.5px) brightness(1.08) saturate(1.2) sepia(0.15)"],
    ["cool", "Cool", "saturate(0.6) sepia(0.35) hue-rotate(170deg) saturate(1.2) brightness(1.02)"]
  ];
  const UP_DEFAULT = { reveal: true, color: "accent", fade: 100, motion: true, effectOn: true, effect: "mono" };
  const onOff = (v, d) => v === true || v === false ? v : typeof v === "string" ? !/^(false|off|no|0)$/i.test(v.trim()) : d;
  return {
    name: "Active sermons",
    about: "The sermons in preparation, with their outline and progress",
    width: 12,
    variants: [["cards", "Cards"], ["agenda", "Agenda"], ["list", "List"], ["board", "Board"], ["desk", "Desk"], ["table", "Table"], ["panel", "Panel"], ...UP_STYLES],
    async render(body2, ctx) {
      const { ui, time, data, act, config, variant, store } = ctx;
      const { el } = ui;
      const active = await data.active();
      if (UP_STYLES.some(([k]) => k === variant)) return upNext(body2, ctx, active);
      const title = variant === "board" ? "Sermon board" : variant === "desk" ? "Sermons" : "Active sermons";
      ui.section(body2, title);
      const count = active.length ? active.length + " active" : "";
      const shell = (cls, tag = "div") => {
        const card = el(body2, tag, cls + " hp-card hp-grow");
        const bar = ui.bar(card, { label: count });
        ui.link(bar.tools, config.sermonArchive, variant === "desk" ? "Library →" : variant === "board" ? "All sermons →" : "Archive →");
        return card;
      };
      const switchFor = (parent, c, card) => ui.toggle(
        parent,
        data.isActive(c.p),
        "Active",
        "Untick when this sermon is finished; it leaves the homepage",
        (on, input) => act.setActive(c.p, on, input, card)
      );
      const openAt = (path, raw) => (newTab) => act.openNote(path + "#" + raw.replace(/[#|^:\[\]]/g, " "), newTab);
      const whenOf = (c) => c.next ? time.relLabel(c.n) + (c.next.time ? " " + time.timeText(c.next.time) : "") : "Not scheduled";
      if (variant === "panel") return drawPanel();
      if (!active.length) {
        el(shell("m-sermons-empty"), "div", "hp-empty", "No sermons are marked active.");
        return;
      }
      if (variant === "board") {
        const board = el(shell("m-sermons-box is-board"), "div", "m-sermons-board");
        for (const c of active) {
          const path = c.p.file.path;
          const card = el(board, "article", "m-sermons-bcard hp-panel");
          const cov = el(card, "div", "m-sermons-bcover");
          ui.cover(cov, c.church, "m-sermons-bphoto");
          el(cov, "div", "m-sermons-btint");
          const chips = el(cov, "div", "m-sermons-bchips");
          el(chips, "span", "m-sermons-bchip" + (c.n !== null && c.n <= 1 ? " is-hot" : ""), c.next ? time.relLabel(c.n) : "Not scheduled");
          if (c.next?.time) el(chips, "span", "m-sermons-bchip", time.timeText(c.next.time));
          ui.asLink(cov, "Open " + c.p.file.name, (newTab) => act.openNote(path, newTab));
          cov.tabIndex = -1;
          const b = el(card, "div", "m-sermons-bbody");
          el(b, "div", "m-sermons-bemoji hp-panel", c.emoji || c.title.charAt(0));
          el(b, "div", "m-sermons-bkicker", [c.church, c.next ? c.next.date.setLocale("en").toFormat("ccc d LLL") : ""].filter(Boolean).join(" · ") || "No church or date");
          ui.link(el(b, "div", "m-sermons-title m-sermons-btitle"), path, c.title);
          if (ui.textOf(c.p.bible)) ui.render(el(b, "div", "m-sermons-bref"), c.p.bible);
          const ready = el(b, "div", "m-sermons-bready");
          const secs = c.ms.sections.length;
          ui.ring(ready, secs ? c.ms.filled / secs * 100 : 0, 42, 4, secs ? c.ms.filled + "/" + secs : "—");
          const rt = el(ready, "div", "");
          el(rt, "b", "", ui.plural(c.ms.total, "word", "words"));
          el(rt, "span", "", c.ms.total ? "≈ " + time.minutesOf(c.ms.total) + " min spoken" : "Nothing written yet");
          const ol = el(b, "div", "m-sermons-bol");
          for (const sec of c.ms.sections.slice(0, OUTLINE_MAX)) {
            const row = el(ol, "div", "m-sermons-bol-row" + (sec.words ? "" : " is-empty"));
            ui.icon(el(row, "span", "m-sermons-bol-mark"), "check");
            el(row, "span", "m-sermons-bol-h", sec.heading);
            el(row, "span", "m-sermons-bol-w", sec.words ? ui.fmtNum(sec.words) : "");
            ui.asLink(row, "Open at “" + sec.heading + "”", openAt(path, sec.raw));
          }
          if (secs > OUTLINE_MAX) el(ol, "div", "m-sermons-bol-more", "+ " + ui.plural(secs - OUTLINE_MAX, "more section", "more sections"));
          if (!secs) el(ol, "div", "hp-empty", "No headings yet.");
          const foot = el(b, "div", "m-sermons-card-foot");
          switchFor(foot, c, card);
          const open = el(foot, "span", "m-sermons-open", "Open");
          ui.icon(open, "arrow");
          ui.asLink(open, "Open " + c.p.file.name, (newTab) => act.openNote(path, newTab));
        }
        return;
      }
      if (variant === "desk") {
        const panel = shell("m-sermons-desk");
        for (const c of active) {
          const row = el(panel, "article", "m-sermons-drow");
          const d = c.next?.date || c.last?.date || null;
          const date = el(row, "div", "m-sermons-ddate");
          el(date, "b", "hp-num", d ? d.toFormat("d") : "—");
          el(date, "span", "", d ? d.setLocale("en").toFormat("LLL") : "No date");
          const main = el(row, "div", "m-sermons-main");
          ui.link(ui.heading(main, 3, "m-sermons-title"), c.p.file.path, c.title);
          el(main, "div", "m-sermons-meta", [ui.textOf(c.p.bible) || ui.textOf(c.p.verse) || "Passage to choose", c.church].filter(Boolean).join(" · "));
          el(main, "div", "m-sermons-dwhen" + (c.n !== null && c.n <= 1 ? " is-soon" : ""), c.next ? whenOf(c) : c.last ? "Last date " + c.last.date.setLocale("en").toFormat("d LLL") : "Not scheduled");
          switchFor(main, c, row);
        }
        const waiting = data.sermons().filter((p) => !data.isActive(p) && time.entriesFor(p).some((e) => time.daysUntil(e.date) >= 0));
        if (waiting.length) {
          const note = el(panel, "details", "m-sermons-attention");
          el(note, "summary", "", waiting.length + " inactive " + (waiting.length === 1 ? "sermon has" : "sermons have") + " an upcoming date");
          for (const p of waiting) ui.link(el(note, "p", ""), p.file.path, p.file.name);
        }
        return;
      }
      if (variant === "table") {
        const rows = el(shell("m-sermons-box is-table"), "div", "m-sermons-table");
        const head = el(rows, "div", "m-sermons-trow is-head");
        for (const h of ["Sermon", "Scripture", "Church", "Next date", "Preparation"]) el(head, "div", "hp-label", h);
        for (const c of active) {
          const row = el(rows, "div", "m-sermons-trow");
          ui.link(el(row, "div", "m-sermons-title"), c.p.file.path, c.p.file.name);
          for (const [k, v] of [["Scripture", c.p.bible], ["Church", c.p.church]]) {
            const cell = el(row, "div", "m-sermons-tcell");
            el(cell, "span", "m-sermons-tkey", k);
            if (ui.textOf(v)) ui.render(cell, v);
            else cell.append("—");
          }
          const when = el(row, "div", "m-sermons-tcell is-when");
          el(when, "span", "m-sermons-tkey", "Next date");
          el(when, "span", "", c.next ? c.n <= 1 ? time.relLabel(c.n) : c.next.date.setLocale("en").toFormat("ccc d LLL") : "—");
          const bar = el(row, "div", "m-sermons-tbar");
          if (c.next && c.prep) {
            bar.title = "Time used from the start of preparation to the next preaching date";
            ui.meter(bar, c.prep.pct, time.urgency(c.n));
            el(bar, "span", "m-sermons-tleft", c.n === 0 ? "Today" : c.n + "d left");
          } else el(bar, "span", "m-sermons-tcell", "No upcoming date");
        }
        return;
      }
      if (variant === "agenda") {
        let agendaItem2 = function(parent, c, openByDefault) {
          const path = c.p.file.path;
          const item = el(parent, "article", "m-sermons-item hp-panel");
          const head = el(item, "div", "m-sermons-head");
          const setOpen = (open) => {
            item.classList.toggle("is-open", open);
            head.setAttribute("aria-expanded", String(open));
            store.open[path] = open;
          };
          head.setAttribute("role", "button");
          head.tabIndex = 0;
          head.addEventListener("click", (e) => {
            if (!e.target.closest("a, [role=link]")) setOpen(!item.classList.contains("is-open"));
          });
          head.addEventListener("keydown", (e) => {
            if ((e.key === "Enter" || e.key === " ") && e.target === head) {
              e.preventDefault();
              setOpen(!item.classList.contains("is-open"));
            }
          });
          const t = c.next?.time;
          const when = el(head, "div", "m-sermons-when");
          el(when, "b", t ? "hp-num" : "hp-num hp-muted", t?.clock || "—");
          const tl = el(when, "span", "");
          if (t) ui.icon(tl, time.PERIODS[t.period].icon);
          el(tl, "span", "", t ? time.PERIODS[t.period].label : "No time");
          el(head, "div", "m-sermons-glyph hp-panel", c.emoji || c.title.charAt(0));
          const main = el(head, "div", "m-sermons-main");
          ui.link(el(main, "div", "m-sermons-title"), path, c.title);
          const meta = el(main, "div", "m-sermons-meta");
          if (c.church) {
            const ch = el(meta, "span", "m-sermons-church");
            ui.avatar(ch, c.church);
            el(ch, "span", "", c.church);
          }
          if (ui.textOf(c.p.bible)) ui.render(meta, c.p.bible);
          const count = el(head, "div", "m-sermons-count");
          el(count, "b", "hp-num", ui.fmtNum(c.ms.total));
          count.append(c.ms.total === 1 ? "word" : "words");
          ui.icon(el(head, "div", "m-sermons-chev"), "down");
          const detail = el(el(el(item, "div", "m-sermons-body"), "div", "m-sermons-clip"), "div", "m-sermons-in");
          const left = el(detail, "div", "");
          const facts = el(left, "dl", "m-sermons-facts");
          const fact = (key, v) => {
            el(facts, "dt", "", key);
            const dd = el(facts, "dd", "");
            if (typeof v === "string") dd.textContent = v;
            else ui.render(dd, v);
          };
          if (ui.textOf(c.p.bible)) fact("Scripture", c.p.bible);
          if (ui.textOf(c.p.verse)) fact("Key verse", c.p.verse);
          if (ui.textOf(c.p.description)) fact("Series", c.p.description);
          if (c.church) fact("Church", data.churchesOf(c.p).join(" · "));
          if (c.later.length) fact("Also", c.later.map((e) => e.date.setLocale("en").toFormat("ccc d LLL")).join(" · "));
          if (!facts.childElementCount) facts.remove();
          el(left, "div", "hp-label", "Outline");
          const outline = el(left, "div", "m-sermons-outline");
          const most = Math.max(1, ...c.ms.sections.map((s2) => s2.words));
          if (!c.ms.sections.length) el(outline, "div", "hp-empty", "No headings yet.");
          c.ms.sections.forEach((s2, i) => {
            const row = el(outline, "div", "m-sermons-ol" + (s2.words ? "" : " is-empty"));
            el(row, "span", "m-sermons-ol-n", String(i + 1).padStart(2, "0"));
            el(row, "span", "m-sermons-ol-h", s2.heading);
            ui.meter(row, s2.words / most * 100);
            el(row, "span", "m-sermons-ol-w", s2.words ? ui.fmtNum(s2.words) : "empty");
            ui.asLink(row, "Open at “" + s2.heading + "”", openAt(path, s2.raw));
          });
          const panel = el(detail, "div", "m-sermons-panel");
          const ms = el(panel, "div", "");
          el(ms, "div", "hp-label", "Manuscript");
          const big = el(ms, "div", "m-sermons-big hp-num", ui.fmtNum(c.ms.total));
          el(big, "small", "", c.ms.total === 1 ? " word" : " words");
          el(ms, "div", "m-sermons-note", c.ms.total ? "≈ " + ui.plural(time.minutesOf(c.ms.total), "minute", "minutes") + " spoken · " + c.ms.filled + " of " + ui.plural(c.ms.sections.length, "section", "sections") + " written" : "Nothing written yet");
          if (c.prep) {
            const prep = el(panel, "div", "");
            el(prep, "div", "hp-label", "Prep window");
            ui.meter(prep, c.prep.pct, c.n <= 2 ? "is-urgent" : "");
            el(prep, "div", "m-sermons-note", c.prep.pct + "% used · started " + c.prep.start.setLocale("en").toFormat("d LLL") + " · " + (c.n === 0 ? "preaching today" : ui.plural(c.n, "day", "days") + " left"));
          }
          const foot = el(detail, "div", "m-sermons-foot");
          switchFor(foot, c, item);
          ui.button(foot, "hp-btn hp-pill", "arrow", "Open sermon", "Open " + c.p.file.name, (e) => act.openNote(path, e.ctrlKey || e.metaKey));
          setOpen(store.open[path] ?? openByDefault);
        };
        var agendaItem = agendaItem2;
        store.open ??= {};
        const agenda = el(shell("m-sermons-box is-agenda"), "div", "m-sermons-agenda");
        const groups = /* @__PURE__ */ new Map();
        for (const c of active) {
          const k = c.next ? c.next.date.toISODate() : "none";
          if (!groups.has(k)) groups.set(k, []);
          groups.get(k).push(c);
        }
        let first = true;
        for (const [k, list2] of groups) {
          const day = el(agenda, "div", "m-sermons-day");
          const rail = el(day, "div", "m-sermons-rail");
          if (k === "none") {
            el(rail, "div", "m-sermons-rail-num hp-num hp-muted", "—");
            el(rail, "div", "m-sermons-rail-wd", "Not scheduled");
          } else {
            const d = list2[0].next.date, n2 = list2[0].n;
            el(rail, "div", "m-sermons-rail-num hp-num", d.toFormat("d"));
            el(rail, "div", "m-sermons-rail-wd", d.setLocale("en").toFormat("cccc"));
            el(rail, "div", "m-sermons-rail-mo", d.setLocale("en").toFormat("LLLL"));
            el(rail, "div", "m-sermons-rail-rel" + (n2 <= 2 ? " is-urgent" : n2 <= 7 ? " is-soon" : ""), time.relLabel(n2));
          }
          const items = el(day, "div", "m-sermons-items");
          for (const c of list2) {
            agendaItem2(items, c, first);
            first = false;
          }
        }
        return;
      }
      if (variant === "list") {
        const list2 = shell("m-sermons-list");
        for (const c of active) {
          const row = el(list2, "div", "m-sermons-row");
          el(row, "div", "m-sermons-glyph hp-panel", c.emoji || c.title.charAt(0));
          const main = el(row, "div", "m-sermons-main");
          ui.link(el(main, "div", "m-sermons-title"), c.p.file.path, c.title);
          el(main, "div", "m-sermons-meta", [c.church, whenOf(c), ui.fmtNum(c.ms.total) + " words"].filter(Boolean).join(" · "));
          if (c.prep) {
            const m = ui.meter(main, c.prep.pct, c.n <= 2 ? "is-urgent" : "");
            m.title = "Preparation " + c.prep.pct + "%";
          }
          switchFor(row, c, row);
        }
        return;
      }
      function drawPanel() {
        const panel = el(body2, "section", "m-sermons-panelbox hp-card hp-grow");
        ui.bar(panel, { label: count });
        const list2 = el(panel, "div", "m-sermons-scroll");
        list2.setAttribute("role", "region");
        list2.setAttribute("aria-label", "Active sermons list");
        list2.tabIndex = 0;
        if (!active.length) el(list2, "div", "hp-empty", "No sermons are currently marked as active.");
        for (const c of active) {
          const card = el(list2, "article", "m-sermons-prow");
          ui.link(el(card, "div", "m-sermons-title"), c.p.file.path, c.p.file.name);
          const meta = el(card, "div", "m-sermons-pmeta");
          for (const [label, v] of [["Scripture", c.p.bible], ["Church", c.p.church], ["Date", c.p.date]]) {
            const d = el(meta, "span", "m-sermons-pdetail");
            el(d, "span", "hp-label", label);
            if (ui.textOf(v)) ui.render(d, v);
            else d.append("—");
          }
          const bar = el(card, "div", "m-sermons-tbar");
          if (c.next && c.prep) {
            ui.meter(bar, c.prep.pct, c.prep.pct >= 85 ? "is-soon" : "");
            el(bar, "span", "m-sermons-tleft", c.n === 0 ? "Today" : c.n + "d left");
            bar.title = "Time used: " + c.prep.pct + "% · started " + c.prep.start.toISODate() + " → next preaching " + c.next.date.toISODate();
          } else el(bar, "span", "m-sermons-tleft", "No upcoming preaching date");
        }
        const foot = el(panel, "div", "m-sermons-pfoot");
        ui.link(foot, config.sermonArchive, "Sermon archive →");
        ui.button(foot, "hp-btn hp-pill", "plus", "New sermon", "Create a new sermon", () => act.newFrom("sermon"));
      }
      const cards = el(shell("m-sermons-box is-cards"), "div", "m-sermons-cards");
      for (const c of active) {
        const path = c.p.file.path;
        const card = el(cards, "article", "m-sermons-card hp-panel");
        const top = el(card, "div", "m-sermons-card-top");
        el(top, "div", "m-sermons-glyph hp-panel", c.emoji || c.title.charAt(0));
        const head = el(top, "div", "");
        ui.link(el(head, "div", "m-sermons-title"), path, c.title);
        el(head, "div", "m-sermons-meta", [c.church, whenOf(c), ui.textOf(c.p.bible)].filter(Boolean).join(" · "));
        const box = el(card, "div", "m-sermons-wave-box");
        const wh = el(box, "div", "m-sermons-wave-head");
        el(wh, "span", "hp-label", "Shape");
        el(wh, "b", "", c.ms.filled + "/" + c.ms.sections.length + " sections");
        const wave = el(box, "div", "m-sermons-wave");
        const axis = el(box, "div", "m-sermons-wave-axis");
        const most = Math.max(1, ...c.ms.sections.map((s2) => s2.words));
        c.ms.sections.forEach((s2, i) => {
          const bar = el(wave, "i", s2.words ? "" : "is-empty");
          bar.style.height = (s2.words ? Math.max(6, s2.words / most * 100) : 4) + "%";
          ui.tip(bar, s2.heading + "\n" + (s2.words ? ui.plural(s2.words, "word", "words") + " · ≈ " + time.minutesOf(s2.words) + " min" : "Not written yet"));
          ui.asLink(bar, "Open at " + s2.heading, openAt(path, s2.raw));
          el(axis, "span", "", String(i + 1).padStart(2, "0"));
        });
        if (!c.ms.sections.length) {
          wave.remove();
          axis.remove();
          el(box, "div", "hp-empty", "No headings yet.");
        }
        const facts = el(card, "div", "m-sermons-facts3");
        for (const [big, small] of [
          [ui.fmtNum(c.ms.total), c.ms.total === 1 ? "word" : "words"],
          [c.ms.total ? "≈" + time.minutesOf(c.ms.total) : "—", "min spoken"],
          c.n === null ? ["—", "no date"] : c.n === 0 ? ["Today", "preaching"] : [String(c.n), c.n === 1 ? "day left" : "days left"]
        ]) {
          const f = el(facts, "div", "");
          el(f, "b", "hp-num", big);
          el(f, "span", "", small);
        }
        const foot = el(card, "div", "m-sermons-card-foot");
        switchFor(foot, c, card);
        const open = el(foot, "span", "m-sermons-open", "Open");
        ui.icon(open, "arrow");
        ui.asLink(open, "Open " + c.p.file.name, (newTab) => act.openNote(path, newTab));
      }
    }
  };
  async function upNext(body2, ctx, active) {
    const { ui, time, data, act, config, variant, store, self, life, app } = ctx;
    const { el } = ui;
    ui.section(body2, "Up next");
    const sec = el(body2, "div", "m-up hp-card hp-grow");
    const aside = ui.bar(sec, { label: active.length ? active.length + " active" : "" }).tools;
    const seg = el(aside, "div", "m-up-seg");
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", "Sermon card style");
    const glide = el(seg, "span", "m-up-glide");
    const segBtns = UP_STYLES.map(([key, label]) => {
      const b = ui.button(seg, "m-up-seg-btn" + (key === variant ? " is-on" : ""), "", label, "Show sermons as " + label.toLowerCase() + " cards", () => {
        if (key === variant) return;
        store.from = variant;
        ctx.setVariant(key);
      });
      b.dataset.style = key;
      b.setAttribute("aria-pressed", String(key === variant));
      return b;
    });
    const gear = ui.button(aside, "hp-round hp-knob m-up-gear", "gear", "", "Up next settings");
    const placeGlide = (key) => {
      const on = segBtns.find((b) => b.dataset.style === key);
      if (!on) return;
      const a = on.getBoundingClientRect(), o = seg.getBoundingClientRect();
      glide.style.setProperty("--x", a.left - o.left + "px");
      glide.style.setProperty("--w", a.width + "px");
    };
    const from = store.from;
    delete store.from;
    glide.classList.add("is-placing");
    placeGlide(from || variant);
    void glide.offsetWidth;
    glide.classList.remove("is-placing");
    placeGlide(variant);
    const ro = new ResizeObserver(() => placeGlide(variant));
    ro.observe(seg);
    life.cleanup(() => ro.disconnect());
    if (from) sec.classList.add("is-entering");
    const read = () => {
      const c = String(self?.upnext_color ?? UP_DEFAULT.color).trim();
      const fx = String(self?.upnext_effect ?? "").trim().toLowerCase();
      return {
        reveal: onOff(self?.upnext_reveal, UP_DEFAULT.reveal),
        color: !c || c.toLowerCase() === "accent" || !CSS.supports("color", c) ? "accent" : c,
        fade: data.clampPct(self?.upnext_fade, UP_DEFAULT.fade),
        motion: onOff(self?.upnext_motion, UP_DEFAULT.motion),
        effectOn: onOff(self?.upnext_effect_on, UP_DEFAULT.effectOn),
        effect: IMAGE_EFFECTS.some(([k]) => k === fx) ? fx : UP_DEFAULT.effect
      };
    };
    let cfg = read();
    const set = ui.settings(sec, gear, life, "Up next", () => {
      cfg = read();
      sync();
    });
    const shows = [];
    const onOffRow = (label, key, hint) => shows.push(set.chips(set.row(label, hint), [[true, "On", label + ": on"], [false, "Off", label + ": off"]], () => cfg[key], (v) => {
      cfg[key] = v;
      sync();
    }));
    onOffRow("Dynamic gradient", "reveal", "Profile and Photo: the church photo appears as preparation progresses");
    const colorCtl = set.row("Colour");
    shows.push(set.chips(colorCtl, [["accent", "Accent", "The theme's accent (dark cards in light mode, light cards in dark mode)"]], () => cfg.color, (v) => {
      cfg.color = v;
      sync();
    }));
    const showColor = set.color(colorCtl, "Pick a card colour", "#3a2f2a", (v) => {
      cfg.color = v;
      sync();
    });
    const showFade = set.slider("Fade", (v) => {
      cfg.fade = v;
      sync();
    });
    onOffRow("Image effect", "effectOn", "Off shows the church photos in their own colours");
    const sample = active.map((c) => data.photoOf(c.church)).find(Boolean) || (data.images()[0] ? app.vault.getResourcePath(data.images()[0]) : null);
    const fxGrid = set.tiles("is-fx");
    const fxTiles = IMAGE_EFFECTS.map(([key, label, filter]) => [key, set.tile(fxGrid, label, sample, () => {
      cfg.effect = key;
      cfg.effectOn = true;
      sync();
    }, filter)]);
    onOffRow("Animation", "motion", "Carousel slide, cards rising in, glow and the gliding highlight");
    set.actions(() => {
      cfg = { ...UP_DEFAULT };
      sync();
    }, async () => {
      const fields = { upnext_reveal: cfg.reveal, upnext_color: cfg.color, upnext_fade: cfg.fade, upnext_motion: cfg.motion, upnext_effect_on: cfg.effectOn, upnext_effect: cfg.effect };
      if (await act.saveProps(fields, "Up next settings")) set.close(false);
    });
    const revealOf = (c) => !cfg.reveal ? 1 : c.pct === null ? 0.3 : Math.max(0, Math.min(1, c.pct / 100));
    function sync() {
      if (cfg.color === "accent") {
        sec.style.removeProperty("--m-up-panel");
        sec.style.removeProperty("--m-up-on");
      } else {
        sec.style.setProperty("--m-up-panel", cfg.color);
        sec.style.setProperty("--m-up-on", data.isDark(cfg.color) ? "255, 255, 255" : "30, 26, 24");
      }
      sec.style.setProperty("--m-up-fade", String(cfg.fade / 100));
      sec.style.setProperty("--m-up-filter", cfg.effectOn ? (IMAGE_EFFECTS.find(([k]) => k === cfg.effect) || IMAGE_EFFECTS[0])[2] : "none");
      sec.classList.toggle("is-still", !cfg.motion);
      for (const card of sec.querySelectorAll("[data-reveal]")) card.style.setProperty("--m-reveal", String(revealOf(cards[Number(card.dataset.reveal)])));
      fxGrid.classList.toggle("is-off", !cfg.effectOn);
      for (const [key, t] of fxTiles) t.classList.toggle("is-on", cfg.effectOn && key === cfg.effect);
      shows.forEach((fn) => fn());
      showColor(cfg.color);
      showFade(cfg.fade);
    }
    const cards = active.map((c) => ({
      ...c,
      pct: c.prep ? c.prep.pct : null,
      dates: time.entriesFor(c.p),
      days: c.n === null ? "No date" : c.n === 0 ? "Today" : c.n === 1 ? "1 day" : c.n + " days",
      when: c.next ? c.next.date.setLocale("en").toFormat("ccc d LLL") : "Not scheduled"
    }));
    const box = el(sec, "div", "m-up-body");
    if (!cards.length) el(box, "div", "hp-empty", "No sermons are currently marked as active.");
    else if (variant === "profile") drawProfile(box);
    else if (variant === "photo") drawPhoto(box);
    else drawCarousel(box);
    sync();
    async function openChurch(church, newTab) {
      let target = config.sermonArchive;
      try {
        const text = await app.vault.adapter.read(config.sermonArchive);
        const views = [...text.matchAll(/^\s*name:\s*(.+?)\s*$/gm)].map((m) => m[1].replace(/^["']|["']$/g, ""));
        const match2 = views.find((v) => data.norm(v) === data.norm(church)) || views.find((v) => data.norm(v) === "all");
        if (match2) target += "#" + match2;
      } catch (err) {
        console.warn("Homepage: could not read the Sermons base views", err);
      }
      act.openNote(target, newTab);
    }
    function makeLink(node, label, onOpen) {
      node.classList.add("is-link");
      ui.asLink(node, label, onOpen);
    }
    function rule(parent, c) {
      const r = el(parent, "div", "m-up-bar is-rule");
      ui.meter(r, c.pct ?? 0, c.pct === null ? "" : time.urgency(c.n));
      r.title = c.pct === null ? "No upcoming date" : c.pct + "% of the preparation time used";
    }
    function info(parent, c, card, footIn = parent, o = {}) {
      const { titleFirst = false, churchPill = false, bar = true, pctStat = true, lead = null, stats = true, barAsRule = false, keepVerse = false } = o;
      const title = () => ui.link(el(parent, "div", "m-up-title"), c.p.file.path, c.title);
      if (titleFirst) title();
      const top = el(parent, "div", "m-up-top");
      if (lead) lead(top);
      const tags = el(top, "div", "m-up-tags");
      const church = el(tags, "span", "m-up-church" + (churchPill ? " is-pill" : ""));
      ui.icon(church, "lighthouse");
      el(church, "span", "", c.church || "Sermon");
      const pills = el(tags, "span", "m-up-pills");
      const datePill = el(pills, "span", "m-up-pill", c.when);
      if (c.church) makeLink(church, "Sermons at " + c.church, (newTab) => openChurch(c.church, newTab));
      if (c.next) makeLink(datePill, "Daily note " + c.next.date.toISODate(), (newTab) => act.openDaily(c.next.date, newTab));
      const t = c.next?.time;
      if (t) {
        const tp = el(pills, "span", "m-up-pill is-" + t.period);
        ui.icon(tp, time.PERIODS[t.period].icon);
        el(tp, "span", "", time.PERIODS[t.period].label + (t.clock ? " · " + t.clock : ""));
      }
      if (!titleFirst) title();
      const lines = el(parent, "div", "m-up-lines");
      const line = (key, v, cls = "") => {
        const l2 = el(lines, "div", ("m-up-line " + cls).trim());
        el(l2, "span", "m-up-key", key + ": ");
        ui.render(l2, v);
      };
      line("Scripture", ui.textOf(c.p.bible) ? c.p.bible : "—");
      if (ui.textOf(c.p.verse)) line("Key verse", c.p.verse);
      else if (keepVerse) el(lines, "div", "m-up-line", " ");
      if (bar && !barAsRule && c.pct !== null) {
        const b = el(parent, "div", "m-up-bar");
        ui.meter(b, c.pct, time.urgency(c.n));
        el(b, "span", "", c.pct + "% prepared");
      }
      if (stats) {
        const s2 = el(parent, "div", "m-up-stats");
        for (const [big, small] of [
          [c.days, c.n === null ? "" : "left"],
          pctStat ? [c.pct === null ? "—" : c.pct + "%", "prep time used"] : null,
          [String(c.dates.length), c.dates.length === 1 ? "preaching date" : "preaching dates"]
        ].filter(Boolean)) {
          const st = el(s2, "span", "");
          el(st, "b", "", big);
          if (small) st.append(" " + small);
        }
      }
      if (barAsRule) rule(footIn, c);
      const foot = el(footIn, "div", "m-up-foot" + (barAsRule ? " no-rule" : ""));
      ui.toggle(foot, data.isActive(c.p), "Active", "Untick when this sermon is finished; it leaves the homepage", (on, input) => act.setActive(c.p, on, input, card));
      ui.button(foot, "m-up-open", "", "Open sermon", "Open " + c.p.file.name, (e) => act.openNote(c.p.file.path, e.ctrlKey || e.metaKey));
    }
    function drawCarousel(parent) {
      const wrap = el(parent, "div", "m-up-c1");
      const stage = el(wrap, "div", "m-up-c1-stage");
      const rail = el(wrap, "div", "m-up-c1-rail");
      const go = (i, dir) => {
        store.index = (i + cards.length) % cards.length;
        draw(dir);
      };
      if (cards.length > 1) {
        ui.button(rail, "m-up-c1-arrow is-left", "left", "", "Previous sermon", () => go((store.index ?? 0) - 1, -1));
        ui.button(rail, "m-up-c1-arrow is-right", "right", "", "Next sermon", () => go((store.index ?? 0) + 1, 1));
      }
      const placeArrows = () => {
        const m = stage.querySelector(".m-up-c1-media");
        if (!m) return;
        const a = m.getBoundingClientRect(), w = wrap.getBoundingClientRect();
        if (a.height) rail.style.setProperty("--m-arrow-y", a.top - w.top + a.height / 2 + "px");
      };
      const resize = new ResizeObserver(placeArrows);
      resize.observe(stage);
      life.cleanup(() => resize.disconnect());
      const dots = el(wrap, "div", "m-up-c1-dots");
      const foot = el(wrap, "div", "m-up-c1-foot");
      ui.button(foot, "hp-btn m-up-ink", "", "Explore all sermons", "Open the sermon archive", () => act.openNote(config.sermonArchive, false));
      function draw(dir = 0) {
        const i = store.index = Math.min(store.index ?? 0, cards.length - 1), c = cards[i];
        stage.replaceChildren();
        dots.replaceChildren();
        if (cards.length > 1) {
          ui.cover(el(stage, "div", "m-up-c1-peek is-left"), cards[(i - 1 + cards.length) % cards.length].church);
          ui.cover(el(stage, "div", "m-up-c1-peek is-right"), cards[(i + 1) % cards.length].church);
          cards.forEach((_, k) => ui.button(dots, "m-up-c1-dot" + (k === i ? " is-on" : ""), "", "", "Sermon " + (k + 1), () => go(k, Math.sign(k - i))));
        }
        ui.cover(el(stage, "div", "m-up-c1-bloom"), c.church);
        const card = el(stage, "article", "m-up-c1-card" + (dir > 0 ? " is-from-right" : dir < 0 ? " is-from-left" : "") + (data.isActive(c.p) ? "" : " is-inactive"));
        stage.classList.toggle("is-moving", !!dir);
        ui.cover(el(card, "div", "m-up-c1-media"), c.church);
        info(el(card, "div", "m-up-c1-body"), c, card, void 0, { titleFirst: true, churchPill: true, barAsRule: true });
        placeArrows();
      }
      draw();
    }
    function drawProfile(parent) {
      const grid = el(parent, "div", "m-up-cards is-wide");
      cards.forEach((c, k) => {
        const card = el(grid, "article", "m-up-p");
        card.dataset.reveal = String(k);
        card.style.setProperty("--i", String(k));
        ui.cover(card, c.church, "m-up-p-img");
        const content = el(card, "div", "m-up-p-content");
        const lead = (top) => {
          const r = ui.ring(top, c.pct ?? 0, 84, 5, "", "m-up-p-ring " + (c.pct === null ? "" : time.urgency(c.n)));
          r.title = c.pct === null ? "No upcoming date" : "Preparation time used: " + c.pct + "%";
          ui.cover(el(r, "div", "m-up-p-avatar"), c.church);
        };
        info(content, c, card, card, { churchPill: true, bar: false, pctStat: false, lead });
      });
    }
    function drawPhoto(parent) {
      const grid = el(parent, "div", "m-up-cards is-tall");
      cards.forEach((c, k) => {
        const card = el(grid, "article", "m-up-t");
        card.dataset.reveal = String(k);
        card.style.setProperty("--i", String(k));
        ui.cover(card, c.church, "m-up-t-img");
        if (c.dates.length > 1) {
          const dots = el(card, "div", "m-up-t-dots");
          for (const e of c.dates) el(dots, "i", c.next && e.date.toMillis() === c.next.date.toMillis() ? "is-on" : "");
        }
        info(card, c, card, card, { stats: false, barAsRule: true, keepVerse: true });
      });
    }
  }
})();
def8.watch = (paths, { config }) => anyUnder(paths, config.sermonFolder, config.attachments);
var active_sermons_default = def8;

