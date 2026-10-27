// src/modules/next-actions.ts
var def11 = /* @__PURE__ */ (() => {
  const COUNT = 6;
  return {
    name: "Next actions",
    about: "Open tasks from your active projects, due first",
    width: 12,
    variants: [],
    async render(body2, { ui, time, data, config }) {
      const { el } = ui;
      const open = (await data.projects()).filter((p) => p.active).flatMap((p) => p.open.map((t) => ({ ...t, p }))).sort((a, b) => (a.due?.toMillis() ?? Infinity) - (b.due?.toMillis() ?? Infinity) || a.line - b.line);
      const due = open.filter((t) => t.due && time.daysUntil(t.due) <= 0).length;
      ui.section(body2, "Next actions");
      const card = el(body2, "div", "m-actions-card hp-card hp-grow");
      const head = ui.bar(card, { label: due ? ui.plural(due, "action needs", "actions need") + " attention" : open.length ? ui.plural(open.length, "open action", "open actions") : "" });
      ui.link(head.tools, config.projectsIndex, "All projects →");
      const list2 = el(card, "div", "m-actions");
      if (!open.length) {
        el(list2, "div", "hp-empty m-actions-empty", "No open actions in your active projects.");
        return;
      }
      for (const t of open.slice(0, COUNT)) {
        const row = el(list2, "div", "m-actions-row hp-panel");
        const copy = el(row, "div", "m-actions-copy");
        ui.link(copy, t.path, t.text);
        el(copy, "div", "m-actions-meta", t.p.name);
        if (t.due) {
          const n2 = time.daysUntil(t.due);
          el(row, "span", "m-actions-badge" + (n2 <= 0 ? " is-warning" : ""), (n2 < 0 ? "Overdue · " : n2 === 0 ? "Today · " : "") + t.due.setLocale("en").toFormat("d LLL"));
        }
      }
      if (open.length > COUNT) el(list2, "div", "m-actions-meta m-actions-more", "Showing " + COUNT + " of " + open.length + " open actions. Open a project's Tasks note for the full list.");
    }
  };
})();
def11.watch = (paths, { config }) => anyUnder(paths, config.projectsFolder);
var next_actions_default = def11;

