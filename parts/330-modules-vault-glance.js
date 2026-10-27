// src/modules/vault-glance.ts
var def17 = /* @__PURE__ */ (() => {
  const areas = (config) => [
    [config.bibleFolder, config.bibleFolder + "/Bible MOC", "Bible", "Scripture reference"],
    [config.sermonFolder, config.sermonArchive, "Sermons", "Your preaching archive"],
    ["Notes", null, "Notes", "My very own atomic notes"],
    ["Spaces/Books", "Spaces/Books/Books MOC", "Books", "Reading & source notes"],
    ["Spaces/Osermons", "Spaces/Osermons/Osermons MOC", "Other sermons", "Other pastors & speakers"],
    ["Spaces/Courses", null, "Courses", "Lessons & training"],
    [config.projectsFolder, config.projectsIndex, "Projects", "Programs & church work"],
    ["Cards", null, "Cards", "Schedules & records"],
    [config.dailyFolder, null, "Daily Notes", "Daily observations"]
  ];
  return {
    name: "Vault at a glance",
    about: "Note counts for each part of the vault",
    width: 12,
    areas,
    variants: [],
    async render(body2, { ui, vault, config }) {
      const { el } = ui;
      ui.section(body2, "Vault at a glance", "Markdown notes");
      const card = el(body2, "div", "m-glance-card hp-card hp-grow");
      const tiles = el(card, "div", "m-glance");
      for (const [folder, index, label, purpose] of areas(config)) {
        const tile = el(tiles, "div", "m-glance-tile hp-panel");
        const top = el(tile, "div", "m-glance-top");
        if (index) ui.link(top, index, label, "hp-link m-glance-name");
        else el(top, "span", "m-glance-name", label);
        el(top, "b", "hp-num", ui.fmtNum(vault.pages(folder).length));
        el(tile, "div", "m-glance-purpose", purpose);
      }
    }
  };
})();
def17.watch = (paths, { config }) => anyUnder(paths, ...def17.areas(config).map((a) => a[0]));
var vault_glance_default = def17;

