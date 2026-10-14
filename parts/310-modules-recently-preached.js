// src/modules/recently-preached.ts
var def15 = /* @__PURE__ */ (() => {
  const COUNT = 6;
  return {
    name: "Recently preached",
    about: "The last sermons you preached, and where",
    width: 6,
    variants: [],
    async render(body2, { ui, time, data, config }) {
      const { el } = ui;
      ui.section(body2, "Recently preached");
      const recent = data.past().slice(-COUNT).reverse();
      const list2 = el(body2, "div", "m-recent hp-card hp-grow");
      ui.link(ui.bar(list2).tools, config.sermonArchive, "Archive →");
      if (!recent.length) {
        el(list2, "div", "hp-empty", "No past preaching dates yet.");
        return;
      }
      for (const e of recent) {
        const row = el(list2, "div", "m-recent-row");
        const date = el(row, "div", "m-recent-date");
        el(date, "b", "hp-num", e.date.toFormat("d"));
        el(date, "span", "", e.date.setLocale("en").toFormat("LLL"));
        const main = el(row, "div", "m-recent-main");
        ui.link(el(main, "div", "m-recent-title"), e.page.file.path, e.page.file.name);
        el(main, "div", "m-recent-sub", [data.churchesOf(e.page)[0], time.relLabel(time.daysUntil(e.date))].filter(Boolean).join(" · "));
      }
    }
  };
})();
def15.watch = (paths, { config }) => anyUnder(paths, config.sermonFolder);
var recently_preached_default = def15;

