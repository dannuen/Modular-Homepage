// src/modules/preaching-dial.ts
var def7 = /* @__PURE__ */ (() => {
  return {
    name: "Preaching dial",
    about: "The next preaching day on a 12-hour clock",
    width: 12,
    variants: [],
    async render(body2, ctx) {
      const { ui, time, data, act, config, life } = ctx;
      const { el, svg } = ui;
      const active = await data.active();
      const byPath = new Map(active.map((c) => [c.p.file.path, c]));
      const upcoming = data.upcoming();
      const dayEntries = upcoming.length ? upcoming.filter((e) => e.date.toMillis() === upcoming[0].date.toMillis()) : [];
      const dayN = upcoming.length ? time.daysUntil(upcoming[0].date) : null;
      const lengthOf = (e) => e.time?.length ?? time.minutesOf(byPath.get(e.page.file.path)?.ms.total || 0);
      const lengthText = (e) => (e.time?.length ? "" : "≈ ") + lengthOf(e) + " min";
      const statusOf = (e, now2) => {
        if (dayN !== 0 || !e.time) return "later";
        if (now2 >= e.time.minutes + (e.time.length ?? Math.max(lengthOf(e), 15))) return "past";
        return now2 >= e.time.minutes ? "now" : "later";
      };
      const hero = el(body2, "section", "m-dial hp-card hp-grow");
      let lastMinute, lastGreeting;
      function draw() {
        const now2 = time.nowMinutes(), greeting = time.greeting();
        const minute = dayN === 0 ? now2 : null;
        if (minute === lastMinute && greeting === lastGreeting) return;
        lastMinute = minute;
        lastGreeting = greeting;
        hero.replaceChildren();
        const statuses = dayEntries.map((e) => statusOf(e, now2));
        const nextIdx = statuses.findIndex((s2, i) => s2 === "later" && (dayN !== 0 || dayEntries[i].time));
        const dial = el(hero, "div", "m-dial-face");
        const S = 300, C = S / 2, R = 118, W = 16;
        const face2 = svg(dial, "svg", { viewBox: "0 0 " + S + " " + S, role: "img", "aria-label": "Preaching times on a 12-hour clock" });
        const polar = (r, deg2) => {
          const a = (deg2 - 90) * Math.PI / 180;
          return [C + r * Math.cos(a), C + r * Math.sin(a)];
        };
        const deg = (min) => min % 720 / 720 * 360;
        const span = (min) => min / 720 * 360;
        const arc = (r, d0, d1) => {
          const [x0, y0] = polar(r, d0), [x1, y1] = polar(r, d1);
          return "M" + x0.toFixed(2) + "," + y0.toFixed(2) + "A" + r + "," + r + ",0," + (d1 - d0 > 180 ? 1 : 0) + ",1," + x1.toFixed(2) + "," + y1.toFixed(2);
        };
        svg(face2, "circle", { cx: C, cy: C, r: R, fill: "none", "stroke-width": W }, "m-dial-track");
        for (let h = 0; h < 12; h++) {
          const [x0, y0] = polar(R - W / 2 - 5, deg(h * 60)), [x1, y1] = polar(R - W / 2 - (h % 3 ? 9 : 14), deg(h * 60));
          svg(face2, "line", { x1: x0, y1: y0, x2: x1, y2: y1 }, "m-dial-tick");
          const [tx, ty] = polar(R - W / 2 - 26, deg(h * 60));
          svg(face2, "text", { x: tx, y: ty, "text-anchor": "middle", "dominant-baseline": "central" }, "m-dial-hour").textContent = String(h || 12);
        }
        dayEntries.forEach((e, i) => {
          if (!e.time) return;
          const d0 = deg(e.time.minutes), d1 = d0 + span(e.time.length ?? Math.max(lengthOf(e), 20));
          const path = svg(face2, "path", { d: arc(R, d0, d1), fill: "none", "stroke-width": W }, "m-dial-svc" + (statuses[i] === "past" ? " is-past" : ""));
          ui.tip(path, e.page.file.name + "\n" + time.timeText(e.time) + " · " + lengthText(e) + (data.churchesOf(e.page)[0] ? " · " + data.churchesOf(e.page)[0] : ""));
          const [lx, ly] = polar(R + W / 2 + 16, d0);
          svg(face2, "text", { x: lx, y: ly, "text-anchor": "middle", "dominant-baseline": "central" }, "m-dial-at").textContent = e.time.clock;
        });
        if (dayN === 0) {
          const [nx0, ny0] = polar(R - W / 2 - 34, deg(now2)), [nx1, ny1] = polar(R + W / 2 + 4, deg(now2));
          svg(face2, "line", { x1: nx0, y1: ny0, x2: nx1, y2: ny1 }, "m-dial-needle");
          const [dx, dy] = polar(R, deg(now2));
          ui.tip(svg(face2, "circle", { cx: dx, cy: dy, r: 7 }, "m-dial-now"), "Now · " + String(Math.floor(now2 / 60)).padStart(2, "0") + ":" + String(now2 % 60).padStart(2, "0"));
        }
        const center = el(dial, "div", "m-dial-center hp-panel");
        const centre = (label, big, sub) => {
          el(center, "div", "hp-label", label);
          el(center, "div", "m-dial-big hp-num", big);
          el(center, "div", "m-dial-sub", sub);
        };
        if (!dayEntries.length) centre("Next", "—", "nothing scheduled");
        else if (dayN > 0) centre(dayN === 1 ? "Tomorrow" : "In", dayN === 1 ? dayEntries[0].time?.clock || "—" : String(dayN), dayN === 1 ? "first service" : "days");
        else if (statuses.includes("now")) centre("Now", dayEntries[statuses.indexOf("now")].time.clock, "preaching");
        else if (nextIdx >= 0) centre("Next", dayEntries[nextIdx].time.clock, time.inLabel(dayEntries[nextIdx].time.minutes - now2));
        else centre("Today", "Done", "rest well");
        const side = el(hero, "div", "m-dial-side");
        const today = time.today;
        if (!dayEntries.length) {
          el(side, "div", "hp-kicker", greeting + " · " + today.setLocale("en").toFormat("cccc d LLLL"));
          ui.heading(side, 1, "m-dial-title", "No preaching dates yet.");
          el(side, "div", "hp-muted", "Mark a sermon active and give it a date, and it will appear on the dial.");
          return;
        }
        const d = dayEntries[0].date;
        el(side, "div", "hp-kicker", greeting + " · " + time.relLabel(dayN) + " is " + d.setLocale("en").toFormat("cccc d LLLL"));
        const title = ui.heading(side, 1, "m-dial-title");
        const words = ["No", "One", "Two", "Three", "Four", "Five"];
        title.append((words[dayEntries.length] || String(dayEntries.length)) + " " + (dayEntries.length === 1 ? "sermon" : "sermons") + " ");
        el(title, "em", "", dayN === 0 ? "today" : dayN === 1 ? "tomorrow" : "on " + d.setLocale("en").toFormat("cccc"));
        title.append(".");
        const plan = el(side, "div", "m-dial-plan");
        dayEntries.forEach((e, i) => {
          const c = byPath.get(e.page.file.path);
          const s2 = statuses[i];
          const row = el(plan, "div", "m-dial-svc-row hp-panel" + (s2 === "past" ? " is-past" : ""));
          el(row, "div", "m-dial-svc-time hp-num", e.time?.clock || time.timeText(e.time) || "—");
          ui.avatar(row, data.churchesOf(e.page)[0]);
          const main = el(row, "div", "");
          el(main, "div", "m-dial-svc-title", c ? c.title : e.page.file.name);
          el(main, "div", "m-dial-svc-sub", [data.churchesOf(e.page)[0], ui.textOf(e.page.bible), lengthText(e)].filter(Boolean).join(" · "));
          const chip = el(row, "span", "m-dial-chip" + (i === nextIdx ? " is-next" : s2 === "now" ? " is-now" : ""));
          chip.textContent = s2 === "now" ? "Now" : s2 === "past" ? "Earlier" : i === nextIdx ? dayN === 0 ? "Next · " + time.inLabel(e.time.minutes - now2) : "First" : e.time ? "Later" : "Any time";
          ui.asLink(row, "Open " + e.page.file.name, (newTab) => act.openNote(e.page.file.path, newTab));
        });
      }
      draw();
      life.interval(() => {
        if (hero.isConnected) draw();
      }, 3e4);
    }
  };
})();
def7.watch = (paths, { config }) => anyUnder(paths, config.sermonFolder, config.attachments);
var preaching_dial_default = def7;

