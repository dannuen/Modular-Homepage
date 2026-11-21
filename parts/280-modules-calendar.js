// src/modules/calendar.ts
var def12 = /* @__PURE__ */ (() => {
  return {
    name: "Calendar",
    about: "Preaching dates, to-dos and events by day; click a day for its note",
    width: 4,
    variants: [["month", "Month"]],
    async render(body2, ctx) {
      const { ui, time, data, act, vault, config, store } = ctx;
      const { el } = ui;
      const today = time.today;
      store.offset ??= {};
      const key = "month";
      store.offset[key] ??= 0;
      const byDay = /* @__PURE__ */ new Map();
      const dayOf2 = (k) => {
        if (!byDay.has(k)) byDay.set(k, { services: [], events: [], todos: [] });
        return byDay.get(k);
      };
      for (const e of data.entries()) dayOf2(e.date.toISODate()).services.push(e);
      for (const t of (await dailyItems(vault, config.dailyFolder)).tasks) {
        if (!t.due || t.closed) continue;
        if (t.kind === "todo") dayOf2(t.due.toISODate()).todos.push(t);
        // A range or a part of the day ("19:00-20:30", "tối") has no clock time in Tasks, but Calendar still shows it.
        else dayOf2(t.due.toISODate()).events.push({ text: t.text, at: time.parseTime(t.at == null ? null : fmtClock(t.at)) ?? time.parseTime(t.raw.match(TIME)?.[1].trim()), path: t.path });
      }
      for (const d of byDay.values()) d.events.sort((a, b) => (a.at?.minutes ?? -1) - (b.at?.minutes ?? -1));
      ui.section(body2, "Calendar");
      const fmt2 = (d, f) => d.setLocale("en").toFormat(f);
      const card = el(body2, "div", "m-cal hp-card hp-grow is-month");
      const bar = ui.bar(card), aside = bar.tools;
      const caption = bar.label;
      const back = ui.button(aside, "hp-btn hp-pill hp-back m-cal-back", "reset", "Today", "Back to this month", () => {
        store.offset[key] = 0;
        draw();
      });
      ui.button(aside, "hp-round hp-knob", "left", "", "Previous month", () => {
        store.offset[key]--;
        draw();
      });
      ui.button(aside, "hp-round hp-knob", "right", "", "Next month", () => {
        store.offset[key]++;
        draw();
      });
      const grid = el(card, "div", "m-cal-grid");
      const legend = el(card, "div", "m-cal-legend");
      for (const [cls, label2] of [["is-preach", "Preaching"], ["is-event", "Event"], ["is-todo", "To-do due"]]) {
        const s2 = el(legend, "span", "");
        el(s2, "i", cls);
        s2.append(label2);
      }
      const nameOf = (e) => e.page.file.name.replace(data.EMOJI, "");
      const tipOf = (d, info, exists) => [
        d.setLocale("en").toFormat("cccc d LLL") + " · " + (exists ? "open" : "create") + " daily note",
        ...info.services.map((e) => "✦ " + [time.timeText(e.time), nameOf(e), data.churchesOf(e.page)[0]].filter(Boolean).join(" · ")),
        ...info.events.map((e) => "● " + [e.at ? time.timeText(e.at) : "", e.text].filter(Boolean).join(" · ")),
        ...info.todos.map((t) => "☐ " + t.text)
      ].join("\n");
      function draw() {
        grid.replaceChildren();
        const off = store.offset[key];
        back.classList.toggle("is-off", !off);
        const first = today.startOf("month").plus({ months: off });
        caption.textContent = fmt2(first, "LLLL yyyy");
        for (let i = 0; i < 7; i++) el(grid, "div", "m-cal-dow", today.startOf("week").plus({ days: i }).setLocale("en").toFormat("ccccc"));
        const end = first.endOf("month").endOf("week").startOf("day");
        for (let d = first.startOf("week"); d <= end; d = d.plus({ days: 1 })) {
          const day = d, k = time.daysUntil(day);
          const info = byDay.get(day.toISODate()) || { services: [], events: [], todos: [] };
          const exists = act.present(time.dailyPath(day));
          const preach = info.services.some((e) => data.isActive(e.page)) && k >= 0;
          const cls = ["m-cal-day", day.month !== first.month && "is-out", k === 0 && "is-today", preach ? "is-preach" : info.services.length && "was-preached"].filter(Boolean).join(" ");
          const b = ui.button(grid, cls, "", "", tipOf(day, info, exists), (e) => act.openDaily(day, e.ctrlKey || e.metaKey));
          el(b, "span", "m-cal-num", day.toFormat("d"));
          const marks = el(b, "span", "m-cal-marks");
          if (exists) el(marks, "i", "m-cal-note has-note");
          if (info.events.length) el(marks, "i", "is-event");
          if (info.todos.length) el(marks, "i", "is-todo");
        }
      }
      draw();
    }
  };
})();
def12.watch = (paths, { config }) => anyUnder(paths, config.sermonFolder, config.dailyFolder);
var calendar_default = def12;

