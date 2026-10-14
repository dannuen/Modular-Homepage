// src/modules/recently-edited.ts
var def16 = /* @__PURE__ */ (() => {
  const FOLDERS = ["Notes", "Spaces", "Projects", "Cards", "Daily Notes"];
  const COUNT = 8;
  return {
    name: "Recently edited",
    about: "The notes you changed last",
    width: 6,
    folders: FOLDERS,
    variants: [],
    async render(body2, { ui, vault }) {
      const { el } = ui;
      ui.section(body2, "Recently edited");
      const recent = [...new Map(FOLDERS.flatMap((f) => vault.pages(f)).map((p) => [p.file.path, p])).values()].sort((a, b) => b.file.mtime.toMillis() - a.file.mtime.toMillis()).slice(0, COUNT);
      const list2 = el(body2, "div", "m-recent hp-card hp-grow");
      if (!recent.length) {
        el(list2, "div", "hp-empty", "No notes found.");
        return;
      }
      for (const p of recent) {
        const row = el(list2, "div", "m-recent-row is-edited");
        const main = el(row, "div", "m-recent-main");
        ui.link(el(main, "div", "m-recent-title"), p.file.path, p.file.name === "Home" ? p.file.folder.split("/").pop() : p.file.name);
        el(main, "div", "m-recent-sub", p.file.folder);
        el(row, "time", "m-recent-side", p.file.mtime.setLocale("en").toFormat("d LLL · HH:mm"));
      }
    }
  };
})();
def16.watch = (paths) => anyUnder(paths, ...def16.folders);
var recently_edited_default = def16;

