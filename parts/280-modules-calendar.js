// src/modules/calendar.ts
var def12 = /* @__PURE__ */ (() => {
  return {
    name: "Calendar",
    about: "Preaching dates, to-dos and events by day; click a day for its note",
    width: 4,
    variants: [["month", "Month"], ["week", "Week"], ["planner", "Planner"]],
    async render(body2, ctx) {
      const { ui, time, data, act, vault, config, variant, store } = ctx;
      const { el } = ui;
      const today = time.today;
      const isWeek = variant === "week", isPlanner = variant === "planner";
      store.offset ??= {};
      const key = isWeek ? "week" : "month";
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
        else dayOf2(t.due.toISODate()).events.push({ text: t.text, at: time.parseTime(t.at) ?? time.parseTime(t.raw.match(TIME)?.[1].trim()), path: t.path });
      }
      for (const d of byDay.values()) d.events.sort((a, b) => (a.at?.minutes ?? -1) - (b.at?.minutes ?? -1));
      ui.section(body2, isWeek ? "This week" : "Calendar", isPlanner ? "Click a date to open or create its daily note" : "");
      const fmt2 = (d, f) => d.setLocale("en").toFormat(f);
      const card = el(body2, "div", "m-cal hp-card hp-grow is-" + variant);
      const bar = ui.bar(card), aside = bar.tools;
      const caption = bar.label;
      const back = ui.button(aside, "hp-btn hp-pill hp-back m-cal-back", "reset", isWeek ? "This week" : isPlanner ? "This month" : "Today", "Back to " + (isWeek ? "this week" : "this month"), () => {
        store.offset[key] = 0;
        draw();
      });
      ui.button(aside, "hp-round hp-knob", "left", "", isWeek ? "Previous week" : "Previous month", () => {
        store.offset[key]--;
        draw();
      });
      ui.button(aside, "hp-round hp-knob", "right", "", isWeek ? "Next week" : "Next month", () => {
        store.offset[key]++;
        draw();
      });
      if (isPlanner) {
        const head = el(card, "div", "m-cal-phead");
        for (let i = 0; i < 7; i++) el(head, "div", "", today.startOf("week").plus({ days: i }).setLocale("en").toFormat("ccc"));
      }
      const grid = el(card, "div", "m-cal-grid");
      if (variant === "month") {
        const legend = el(card, "div", "m-cal-legend");
        for (const [cls, label2] of [["is-preach", "Preaching"], ["is-event", "Event"], ["is-todo", "To-do due"]]) {
          const s2 = el(legend, "span", "");
          el(s2, "i", cls);
          s2.append(label2);
        }
      }
      const tipOf = (d, info, exists) => [
        d.setLocale("en").toFormat("cccc d LLL") + " · " + (exists ? "open" : "create") + " daily note",
        ...info.services.map((e) => "✦ " + [time.timeText(e.time), e.page.file.name, data.churchesOf(e.page)[0]].filter(Boolean).join(" · ")),
        ...info.events.map((e) => "● " + [e.at ? time.timeText(e.at) : "", e.text].filter(Boolean).join(" · ")),
        ...info.todos.map((t) => "☐ " + t.text)
      ].join("\n");
      function draw() {
        grid.replaceChildren();
        const off = store.offset[key];
        back.classList.toggle("is-off", !off);
        if (isWeek) {
          const start = today.startOf("week").plus({ weeks: off });
          caption.textContent = fmt2(start, "d LLL") + " – " + fmt2(start.plus({ days: 6 }), "d LLL");
          for (let i = 0; i < 7; i++) {
            const d = start.plus({ days: i }), k = time.daysUntil(d);
            const info = byDay.get(d.toISODate()) || { services: [], events: [], todos: [] };
            const exists = act.present(time.dailyPath(d));
            const cell = el(grid, "div", "m-cal-wd hp-panel" + (k === 0 ? " is-today" : k < 0 ? " is-past" : ""));
            const open = ui.button(cell, "m-cal-wd-open", "", "", (exists ? "Open" : "Create") + " daily note " + d.toFormat("yyyy-MM-dd"), (e) => act.openDaily(d, e.ctrlKey || e.metaKey));
            el(open, "span", "m-cal-wd-name", d.setLocale("en").toFormat("ccc"));
            el(open, "span", "m-cal-note" + (exists ? " has-note" : ""));
            el(open, "span", "m-cal-wd-num hp-num", d.toFormat("d"));
            const evs = el(cell, "div", "m-cal-wd-evs");
            for (const e of info.services) {
              const ev = el(evs, "div", "m-cal-ev is-preach" + (data.isActive(e.page) ? "" : " is-inactive"));
              el(ev, "b", "", time.timeText(e.time) || "No time");
              el(ev, "span", "", data.churchesOf(e.page)[0] || e.page.file.name);
              ui.asLink(ev, e.page.file.name, (newTab) => act.openNote(e.page.file.path, newTab));
            }
            for (const e of info.events) {
              const ev = el(evs, "div", "m-cal-ev is-event");
              el(ev, "b", "", e.at ? time.timeText(e.at) : "All day");
              el(ev, "span", "", e.text);
              ui.asLink(ev, e.text, (newTab) => act.openNote(e.path, newTab));
            }
            if (info.todos.length) el(evs, "div", "m-cal-ev is-todo", ui.plural(info.todos.length, "to-do", "to-dos") + " due").title = info.todos.map((t) => "☐ " + t.text).join("\n");
          }
          return;
        }
        const first = today.startOf("month").plus({ months: off });
        caption.textContent = fmt2(first, "LLLL yyyy");
        if (isPlanner) {
          const end2 = first.endOf("month").endOf("week").startOf("day");
          for (let d = first.startOf("week"); d <= end2; d = d.plus({ days: 1 })) {
            const day = d, k = time.daysUntil(day);
            const info = byDay.get(day.toISODate()) || { services: [], events: [], todos: [] };
            const exists = act.present(time.dailyPath(day));
            const cell = el(grid, "div", "m-cal-pday" + (day.month !== first.month ? " is-out" : "") + (k === 0 ? " is-today" : k < 0 ? " is-past" : ""));
            const b = ui.button(cell, "m-cal-pbtn", "", "", tipOf(day, info, exists), (e) => act.openDaily(day, e.ctrlKey || e.metaKey));
            el(b, "span", "m-cal-note" + (exists ? " has-note" : ""));
            el(b, "span", "m-cal-pnum", day.toFormat("d"));
            for (const e of info.services) {
              const ev = el(cell, "div", "m-cal-chip is-preach" + (data.isActive(e.page) ? "" : " is-inactive"));
              if (e.time) ui.icon(ev, time.PERIODS[e.time.period].icon);
              el(ev, "span", "", e.page.file.name);
              ev.title = [e.page.file.name, time.timeText(e.time), data.churchesOf(e.page)[0]].filter(Boolean).join(" · ");
              ui.asLink(ev, e.page.file.name, (newTab) => act.openNote(e.page.file.path, newTab));
            }
            for (const e of info.events) {
              const ev = el(cell, "div", "m-cal-chip is-event");
              el(ev, "span", "", [e.at ? time.timeText(e.at) : "", e.text].filter(Boolean).join(" "));
              ev.title = e.text;
              ui.asLink(ev, e.text, (newTab) => act.openNote(e.path, newTab));
            }
            if (info.todos.length) {
              const td = el(cell, "div", "m-cal-chip is-todo");
              el(td, "span", "", ui.plural(info.todos.length, "to-do", "to-dos"));
              td.title = info.todos.map((t) => "☐ " + t.text).join("\n");
            }
          }
          return;
        }
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

