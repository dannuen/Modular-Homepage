// src/modules/tasks.ts
var def9 = /* @__PURE__ */ (() => {
  return {
    name: "Tasks",
    about: "To-dos and events from the daily notes' Tasks section, with the active sermons' dates",
    width: 12,
    variants: [],
    async render(body2, { ui, renderTasks: renderTasks2, skin, store, data, time }) {
      ui.section(body2, "Tasks");
      const slot = ui.el(body2, "div", "m-tasks hp-grow");
      const sermons = data.entries().filter((e) => data.isActive(e.page)).map((e) => {
        const name = e.page.file.name, m = name.match(data.EMOJI), t = e.time;
        return {
          path: e.page.file.path,
          title: m ? m[1] + " " + name.slice(m[0].length) : name,
          date: e.date.toFormat("yyyy-MM-dd"),
          at: t?.clock ? t.minutes : null,
          minutes: t?.length || null,
          when: t && !t.clock ? time.PERIODS[t.period].label : null,
          church: data.churchesOf(e.page)[0] || ""
        };
      });
      try {
        await renderTasks2(slot, { skin, state: store, sermons });
      } catch (err) {
        console.error("Homepage: task panel failed", err);
        ui.el(slot, "div", "hp-empty", "The task panel could not be drawn.");
      }
    }
  };
})();
def9.watch = (paths, { config }) => anyUnder(paths, config.dailyFolder, config.sermonFolder);
var tasks_default = def9;

