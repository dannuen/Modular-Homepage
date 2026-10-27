// src/modules/greeting.ts
var def = /* @__PURE__ */ (() => {
  const WORDS = ["No", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten"];
  return {
    name: "Greeting",
    about: "The day, and one sentence about the next preaching day",
    width: 12,
    variants: [["sentence", "Sentence"], ["simple", "Simple"], ["desk", "Desk"], ["masthead", "Masthead"], ["glow", "Glow"]],
    async render(body2, { ui, time, data, config, variant }) {
      const { el } = ui;
      const today = time.today;
      const box = el(body2, "section", "m-greet is-" + (variant || "sentence"));
      const word = (n3) => WORDS[n3] || String(n3);
      if (variant === "desk") {
        const projects = (await data.projects()).filter((p) => p.active), desk = await data.active();
        el(box, "div", "hp-kicker m-greet-eyebrow", time.greeting() + " · " + today.setLocale("en").toFormat("cccc d LLLL"));
        const title = ui.heading(box, 1, "m-greet-title");
        el(title, "em", "", word(projects.length));
        title.append(" active " + (projects.length === 1 ? "project" : "projects") + ", ");
        el(title, "em", "", word(desk.length).toLowerCase());
        title.append(" " + (desk.length === 1 ? "sermon" : "sermons") + " on the desk.");
        const line = el(box, "div", "m-greet-lede");
        const next = desk.find((c) => c.next);
        if (!next) {
          line.textContent = "Nothing to preach is scheduled yet.";
          return;
        }
        line.append("Next up ");
        ui.link(line, next.p.file.path, next.title, "hp-link m-greet-strong");
        line.append(" · " + time.relLabel(next.n) + (next.next.time ? " · " + time.timeText(next.next.time) : "") + (next.church ? " · " + next.church : ""));
        return;
      }
      if (variant === "masthead" || variant === "glow") {
        const glow = variant === "glow";
        const mast = el(box, "div", glow ? "m-greet-glow" : "m-greet-mast");
        let right = mast;
        if (glow) {
          el(mast, "div", "m-greet-glow-date", today.setLocale("en").toFormat("cccc d LLLL yyyy"));
          el(mast, "div", "m-greet-glow-hello", time.greeting() + ", " + config.name);
        } else {
          const date = el(mast, "div", "m-greet-date");
          el(date, "div", "m-greet-daynum", today.toFormat("d"));
          const dt = el(date, "div", "");
          el(dt, "div", "m-greet-weekday", today.setLocale("en").toFormat("cccc"));
          el(dt, "div", "m-greet-month", today.setLocale("en").toFormat("LLLL yyyy"));
          right = el(mast, "div", "m-greet-right");
          el(right, "div", "m-greet-hello", time.greeting() + ", " + config.name);
        }
        const line = el(right, "div", "m-greet-next");
        const up = data.upcoming()[0];
        if (up) {
          el(line, "span", "", "Next preaching");
          el(line, "span", "m-greet-when", time.relLabel(time.daysUntil(up.date)));
          const where = data.churchesOf(up.page)[0];
          el(line, "span", "", up.date.setLocale("en").toFormat("cccc d LLL") + (where ? " · " + where : ""));
        } else el(line, "span", "", "No preaching dates scheduled");
        const weekStart = today.startOf("week"), weekEnd = weekStart.plus({ weeks: 1 });
        const projects = (await data.projects()).filter((p) => p.active);
        const stats = el(right, "div", "m-greet-stats");
        for (const [n3, label] of [
          [data.entries().filter((e) => data.isActive(e.page) && e.date >= weekStart && e.date < weekEnd).length, "this week"],
          [data.sermons().filter(data.isActive).length, "active sermons"],
          [projects.length, "active projects"],
          [projects.reduce((s2, p) => s2 + p.open.length, 0), "open tasks"]
        ]) {
          const st = el(stats, "div", "m-greet-stat");
          el(st, "b", "", String(n3));
          el(st, "span", "", label);
        }
        return;
      }
      const upcoming = data.upcoming();
      const nextDay = upcoming[0]?.date || null;
      const sameDay = nextDay ? upcoming.filter((e) => e.date.toMillis() === nextDay.toMillis()) : [];
      const n2 = nextDay ? time.daysUntil(nextDay) : null;
      const when = n2 === null ? "" : n2 === 0 ? "today" : n2 === 1 ? "tomorrow" : n2 < 7 ? "on " + nextDay.setLocale("en").toFormat("cccc") : "on " + nextDay.setLocale("en").toFormat("cccc d LLLL");
      if (variant === "simple") {
        ui.heading(box, 1, "m-greet-title", time.greeting() + ".");
        el(box, "div", "m-greet-sub", today.setLocale("en").toFormat("cccc d LLLL") + (nextDay ? " · next preaching " + when + (sameDay[0]?.time ? " at " + time.timeText(sameDay[0].time) : "") : " · nothing scheduled"));
        return;
      }
      el(box, "div", "hp-kicker m-greet-eyebrow", today.setLocale("en").toFormat("cccc, d LLLL") + " · " + time.greeting());
      const headline = ui.heading(box, 1, "m-greet-title");
      const lede = el(box, "div", "m-greet-lede");
      if (!nextDay) {
        headline.textContent = "Nothing on the calendar.";
        lede.textContent = "Mark a sermon active and give it a date, and it will appear here.";
        return;
      }
      headline.append(word(sameDay.length) + " " + (sameDay.length === 1 ? "sermon" : "sermons") + " ");
      el(headline, "em", "", when);
      headline.append(".");
      const parts = sameDay.map((e) => {
        const where = data.churchesOf(e.page)[0] || e.page.file.name.replace(data.EMOJI, "");
        const t = e.time;
        return where + (!t ? "" : t.clock ? " at " + t.clock : " in the " + t.period);
      });
      lede.textContent = new Intl.ListFormat("en", { style: "long", type: "conjunction" }).format(parts) + ".";
    }
  };
})();
def.watch = (paths, { config }) => anyUnder(paths, config.sermonFolder, config.projectsFolder);
var greeting_default = def;

