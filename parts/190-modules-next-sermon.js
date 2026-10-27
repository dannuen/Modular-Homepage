// src/modules/next-sermon.ts
var def3 = /* @__PURE__ */ (() => {
  return {
    name: "Next sermon",
    about: "Countdown, preparation slider and the sermons in preparation",
    width: 12,
    variants: [["hero", "Hero"], ["compact", "Compact"], ["photo", "Photo"], ["week", "This week"], ["event", "Event"]],
    async render(body2, ctx) {
      const { ui, time, act, data, config, variant, life } = ctx;
      const { el } = ui;
      if (variant === "photo") return drawPhoto();
      if (variant === "week") return drawWeek();
      if (variant === "event") return drawEvent();
      const box = el(body2, "div", "m-next hp-grow is-" + (variant || "hero"));
      async function drawPhoto() {
        const lead = (await data.active()).find((c2) => c2.next) || null;
        const hero = el(body2, "article", "m-next-photo hp-grow" + (lead ? "" : " is-empty"));
        if (!lead) {
          ui.mesh(el(hero, "div", "hp-cover m-next-photo-img"), config.name);
          el(hero, "div", "m-next-photo-tint");
          const b2 = el(hero, "div", "m-next-photo-body");
          el(el(b2, "div", "m-next-photo-chips"), "span", "m-next-photo-chip", "Nothing scheduled");
          ui.heading(b2, 1, "m-next-photo-title", "No preaching dates yet");
          el(b2, "div", "m-next-photo-refs", "Mark a sermon active and give it a date, and it will take this spot.");
          ui.button(el(b2, "div", "m-next-photo-foot"), "m-next-photo-open", "plus", "New sermon", "Create a new sermon", () => act.newFrom("sermon"));
          return;
        }
        const c = lead, e = c.next;
        ui.cover(hero, c.church, "m-next-photo-img");
        el(hero, "div", "m-next-photo-tint");
        const b = el(hero, "div", "m-next-photo-body");
        const chips = el(b, "div", "m-next-photo-chips");
        el(chips, "span", "m-next-photo-chip is-live", "Next up");
        el(chips, "span", "m-next-photo-chip" + (c.n <= 1 ? " is-hot" : ""), time.relLabel(c.n) + (e.time ? " · " + time.timeText(e.time) : ""));
        if (c.church) {
          const ch = el(chips, "span", "m-next-photo-chip");
          ui.avatar(ch, c.church);
          ch.append(c.church);
        }
        ui.link(ui.heading(b, 1, "m-next-photo-title"), c.p.file.path, c.title);
        const refs = el(b, "div", "m-next-photo-refs");
        for (const [label, v] of [["Scripture", c.p.bible], ["Key verse", c.p.verse], ["Series", c.p.description]]) {
          if (!ui.textOf(v)) continue;
          const r = el(refs, "span", "");
          el(r, "i", "", label);
          ui.render(r, v);
        }
        const foot = el(b, "div", "m-next-photo-foot");
        const count = el(foot, "div", "m-next-photo-count");
        el(count, "small", "", "Until you preach");
        const num = el(count, "div", "m-next-photo-num");
        const m = e.time ? e.time.minutes : 0, target = e.date.set({ hour: Math.floor(m / 60), minute: m % 60 }); // wall-clock time, also on a DST day
        let lastDisplay;
        const tick = () => {
          const mins = Math.floor(target.diff(time.DateTime.now(), "minutes").minutes);
          const display = mins <= 0 ? "today" : mins < 60 * 48 ? mins : "days:" + c.n;
          if (display === lastDisplay) return;
          lastDisplay = display;
          num.replaceChildren();
          const unit = (n2, u) => {
            el(num, "b", "hp-num", String(n2));
            el(num, "span", "", u);
          };
          if (mins <= 0) el(num, "b", "hp-num", "Today");
          else if (mins < 60 * 48) {
            if (mins >= 60) unit(Math.floor(mins / 60), "h");
            unit(mins % 60, "m");
          } else unit(c.n, "days"); // calendar days, as the chip above says
        };
        tick();
        life.interval(tick, 3e4);
        const ready = el(foot, "div", "m-next-photo-ready");
        const secs = c.ms.sections.length;
        ui.ring(ready, secs ? c.ms.filled / secs * 100 : 0, 50, 5, secs ? c.ms.filled + "/" + secs : "—");
        const rt = el(ready, "div", "");
        el(rt, "b", "", secs ? c.ms.filled + " of " + ui.plural(secs, "section", "sections") + " written" : "No headings yet");
        el(rt, "span", "", c.ms.total ? ui.plural(c.ms.total, "word", "words") + " · ≈ " + time.minutesOf(c.ms.total) + " min spoken" : "Nothing written yet");
        const open = ui.button(foot, "m-next-photo-open", "", "Open sermon", "Open " + c.p.file.name, (ev) => act.openNote(c.p.file.path, ev.ctrlKey || ev.metaKey));
        ui.icon(open, "arrow");
      }
      function drawWeek() {
        const today = time.today, weekStart = today.startOf("week"), weekEnd = weekStart.plus({ days: 6 });
        const up = data.upcoming();
        const inWeek = data.entries().filter((e) => data.isActive(e.page) && e.date >= weekStart && e.date <= weekEnd);
        const featured = inWeek.length ? inWeek : up.slice(0, 1);
        const range = weekStart.setLocale("en").toFormat("d LLL") + " – " + weekEnd.setLocale("en").toFormat("d LLL");
        ui.section(body2, "Up next");
        const box = el(body2, "div", "m-next-week-box hp-card hp-grow");
        ui.link(ui.bar(box, { label: inWeek.length ? range + " · " + ui.plural(inWeek.length, "sermon", "sermons") : featured.length ? "Nothing this week · next date" : "" }).tools, config.sermonArchive, "Archive →");
        const wrap = el(box, "div", "m-next-week" + (featured.length === 1 ? " is-single" : ""));
        if (!featured.length) {
          el(wrap, "div", "hp-empty m-next-week-empty", "No preaching dates are scheduled.");
          return;
        }
        const size = featured.length === 1 ? 128 : 100;
        for (const e of featured) {
          const p = e.page, n2 = time.daysUntil(e.date), past = n2 < 0;
          const card = el(wrap, "article", "m-next-week-card hp-panel" + (past ? " is-past" : ""));
          const prep = data.preparation(p, e);
          const r = past ? ui.ring(card, 100, size, 9, "—", "is-past", "past") : ui.ring(card, prep ? prep.pct : 100, size, 9, n2 === 0 ? "Today" : String(n2), time.urgency(n2), n2 === 0 ? "" : n2 === 1 ? "day left" : "days left");
          r.classList.add("m-next-week-ring");
          r.title = prep ? prep.pct + "% of the preparation time used" : "";
          const main = el(card, "div", "m-next-week-main");
          el(main, "div", "hp-label", e.date.setLocale("en").toFormat("cccc, d LLLL") + (n2 === 0 ? " · today" : n2 === 1 ? " · tomorrow" : "") + (e.time ? " · " + time.timeText(e.time) : ""));
          ui.link(el(main, "div", "m-next-week-title"), p.file.path, p.file.name);
          const facts = el(main, "div", "m-next-week-facts");
          for (const [k, v] of [["Scripture", p.bible], ["Key verse", p.verse], ["Church", p.church]]) {
            if (!ui.textOf(v)) continue;
            const f = el(facts, "div", "");
            el(f, "div", "hp-label", k);
            ui.render(el(f, "div", "m-next-week-val"), v);
          }
        }
      }
      async function drawEvent() {
        const lineup = await data.active();
        const lead = lineup.find((c2) => c2.next) || null;
        const card = el(body2, "article", "m-next-ev hp-card hp-grow" + (lead ? "" : " is-empty"));
        const panel = el(card, "div", "m-next-ev-panel");
        const side = el(card, "div", "m-next-ev-side");
        const day = lead ? lead.next.date : time.today;
        const nth = (d) => d + (["th", "st", "nd", "rd"][(d % 100 - 20) % 10] || ["th", "st", "nd", "rd"][d % 100] || "th");
        const when = el(panel, "div", "m-next-ev-day");
        when.setAttribute("role", "img");
        const thisYear = day.hasSame(time.today, "year");
        when.setAttribute("aria-label", day.setLocale("en").toFormat(thisYear ? "cccc d LLLL" : "cccc d LLLL yyyy"));
        when.title = day.setLocale("en").toFormat("cccc d LLLL yyyy");
        el(when, "b", "", day.setLocale("en").toFormat("ccc"));
        el(when, "span", "", nth(day.day));
        const facts = el(panel, "div", "m-next-ev-facts");
        const mark = el(panel, "div", "m-next-ev-mark");
        ui.icon(mark, "burst", "hp-ico m-next-ev-burst");
        const head = el(side, "div", "m-next-ev-head");
        const well = el(side, "div", "m-next-ev-well");
        for (const part of ["m-next-ev-haze", "m-next-ev-orb"]) el(well, "div", part).setAttribute("aria-hidden", "true");
        if (!lead) {
          el(facts, "div", "", day.setLocale("en").toFormat("LLLL"));
          el(facts, "div", "hp-muted", "Nothing scheduled");
          el(mark, "span", "", "Today");
          el(head, "div", "m-next-ev-kicker", "Next sermon");
          ui.heading(head, 1, "m-next-ev-title", "No preaching dates yet");
          el(head, "div", "m-next-ev-note", "Mark a sermon active and give it a date, and it will take this spot.");
          drawGo(side, "New sermon", "Create a new sermon", () => act.newFrom("sermon"));
          return;
        }
        const c = lead, e = c.next, p = c.p;
        const passage = ui.textOf(p.bible) ? p.bible : p.verse;
        if (!day.hasSame(time.today, "month")) el(facts, "div", "m-next-ev-month", day.setLocale("en").toFormat(thisYear ? "LLLL" : "LLLL yyyy"));
        if (e.time) el(facts, "div", "m-next-ev-time", time.timeText(e.time));
        if (c.church) el(facts, "div", "", c.church);
        if (ui.textOf(passage)) ui.render(el(facts, "div", "m-next-ev-ref"), passage);
        if (!facts.childElementCount) el(facts, "div", "", day.setLocale("en").toFormat("LLLL"));
        el(mark, "span", "m-next-ev-when" + (c.n <= 1 ? " is-near" : ""), time.relLabel(c.n));
        el(head, "div", "m-next-ev-kicker", "Next sermon");
        ui.link(ui.heading(head, 1, "m-next-ev-title"), p.file.path, c.title);
        const secs = c.ms.sections.length;
        const notes = [ui.textOf(p.description), secs ? c.ms.filled + " of " + ui.plural(secs, "section", "sections") + " written" : ""].filter(Boolean);
        for (const n2 of notes) el(head, "div", "m-next-ev-note", n2);
        drawGo(side, "Open sermon", "Open sermon: " + c.title, (ev) => act.openNote(p.file.path, ev.ctrlKey || ev.metaKey));
      }
      function drawGo(parent, label, title, run) {
        const go = ui.button(el(parent, "div", "m-next-ev-foot"), "m-next-ev-go", "", "", title, run);
        el(go, "span", "m-next-ev-go-label", label);
        ui.icon(el(go, "span", "m-next-ev-go-arrow"), "right");
        return go;
      }
      async function draw() {
        box.replaceChildren();
        const lineup = await data.active();
        const card = el(box, "section", "m-next-card hp-card");
        const lead = lineup[0];
        const disc = el(card, "div", "m-next-disc hp-knob");
        const main = el(card, "div", "m-next-main");
        if (!lead) {
          el(disc, "b", "", "0");
          el(disc, "span", "", "active");
          disc.setAttribute("role", "img");
          disc.setAttribute("aria-label", "No active sermons");
          el(main, "div", "hp-kicker", "Next sermon");
          ui.heading(main, 1, "m-next-title", "Nothing on the pulpit yet");
          el(main, "p", "m-next-lede", "Mark a sermon active and give it a date, and it will appear here.");
          const row2 = el(main, "div", "m-next-controls");
          ui.button(row2, "hp-btn hp-pill", "", "Sermon archive", "Open the sermon archive", (e) => act.openNote(config.sermonArchive, e.ctrlKey || e.metaKey));
          return;
        }
        const { p, next, n: days, prep } = lead;
        el(disc, "b", "", days === null ? "—" : days === 0 ? "Today" : String(days));
        el(disc, "span", "", days === null ? "no date" : days === 0 ? "preaching" : days === 1 ? "day left" : "days left");
        disc.setAttribute("role", "img");
        disc.setAttribute("aria-label", days === null ? "No preaching date" : days === 0 ? "Preaching today" : days + " days left");
        disc.classList.toggle("is-today", days === 0);
        el(main, "div", "hp-kicker", "Next sermon" + (next ? " · " + next.date.setLocale("en").toFormat("cccc d LLLL") + (next.time ? " · " + time.timeText(next.time) : "") : " · no date yet"));
        ui.link(ui.heading(main, 1, "m-next-title"), p.file.path, p.file.name);
        const pills = el(main, "div", "m-next-pills");
        const passage = ui.textOf(p.bible) ? ["Scripture", p.bible] : ["Key verse", p.verse];
        for (const [label, v, ic] of [[...passage, "book"], ["Church", p.church, "church"]]) {
          if (!ui.textOf(v)) continue;
          const pill = el(pills, "span", "hp-pill hp-chip");
          ui.icon(pill, ic);
          el(pill, "span", "m-next-chip-label", label);
          el(pill, "b", "", ui.textOf(v));
        }
        const row = el(main, "div", "m-next-controls");
        ui.button(row, "hp-btn hp-accent", "arrow", "Open sermon", "Open " + p.file.name, (e) => act.openNote(p.file.path, e.ctrlKey || e.metaKey));
        ui.button(row, "hp-btn hp-pill", "", "Sermon archive", "Open the sermon archive", (e) => act.openNote(config.sermonArchive, e.ctrlKey || e.metaKey));
        const panel = el(main, "div", "m-next-prep hp-panel");
        const head = el(panel, "div", "m-next-prep-head");
        if (prep) {
          const left = el(head, "span", "m-next-prep-pct");
          el(left, "span", "", "Preparation");
          el(left, "b", "", prep.pct + "%");
          el(head, "span", "m-next-prep-range", prep.start.setLocale("en").toFormat("d LLL") + " → " + next.date.setLocale("en").toFormat("d LLL"));
          const slider = el(panel, "div", "m-next-slider");
          slider.setAttribute("role", "progressbar");
          slider.setAttribute("aria-label", "Preparation time used");
          slider.setAttribute("aria-valuemin", "0");
          slider.setAttribute("aria-valuemax", "100");
          slider.setAttribute("aria-valuenow", String(prep.pct));
          slider.style.setProperty("--pct", String(prep.pct));
          el(slider, "div", "m-next-track hp-track");
          el(slider, "div", "m-next-fill");
          el(slider, "div", "m-next-thumb hp-knob");
        } else el(head, "span", "m-next-prep-pct", next ? "No start date" : "Give this sermon a preaching date to see its preparation time");
        if (lineup.length > 1) {
          const more = el(main, "div", "m-next-also");
          el(more, "span", "hp-label", "Also preparing");
          for (const o of lineup.slice(1)) {
            const chip = ui.link(more, o.p.file.path, o.p.file.name, "hp-link hp-pill hp-chip m-next-also-chip");
            if (o.next) el(chip, "span", "hp-muted", " · " + o.next.date.setLocale("en").toFormat("d LLL"));
          }
        }
      }
      await draw();
    }
  };
})();
def3.watch = (paths, { config }) => anyUnder(paths, config.sermonFolder, config.attachments);
var next_sermon_default = def3;

