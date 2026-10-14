// src/modules/coming-up.ts
var def4 = /* @__PURE__ */ (() => {
  const COUNT = 5;
  return {
    name: "Coming up",
    about: "The next preaching dates as a timeline",
    width: 4,
    variants: [],
    async render(body2, { ui, time, data, act, config }) {
      const { el } = ui;
      ui.section(body2, "Coming up");
      const box = el(body2, "div", "m-soon hp-card hp-grow");
      ui.link(ui.bar(box).tools, config.sermonArchive, "Archive →");
      const up = data.upcoming().slice(0, COUNT);
      if (!up.length) {
        el(box, "div", "hp-empty", "No upcoming preaching dates.");
        return;
      }
      let lastDay = null, list2 = null;
      up.forEach((e, i) => {
        const k = e.date.toISODate();
        if (k !== lastDay) {
          lastDay = k;
          const group = el(box, "div", "m-soon-group");
          const day = el(group, "div", "m-soon-day", e.date.setLocale("en").toFormat("cccc d LLL"));
          const n2 = time.daysUntil(e.date);
          el(day, "span", n2 <= 7 ? "is-soon" : "", time.relLabel(n2));
          list2 = el(group, "div", "m-soon-list");
        }
        const item = el(list2, "div", "m-soon-item" + (i === 0 ? " is-next" : ""));
        el(item, "div", "m-soon-time", [time.timeText(e.time), data.churchesOf(e.page)[0]].filter(Boolean).join(" · ") || "Time not set");
        el(item, "div", "m-soon-title", e.page.file.name.replace(data.EMOJI, ""));
        if (ui.textOf(e.page.bible)) el(item, "div", "m-soon-sub", ui.textOf(e.page.bible));
        ui.asLink(item, "Open " + e.page.file.name, (newTab) => act.openNote(e.page.file.path, newTab));
      });
    }
  };
})();
def4.watch = (paths, { config }) => anyUnder(paths, config.sermonFolder);
var coming_up_default = def4;

