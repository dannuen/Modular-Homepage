// src/modules/vault-glance.ts
var def17 = /* @__PURE__ */ (() => {
  const AREAS = [
    ["Bible", "Bible/Bible MOC", "Bible", "Scripture reference"],
    ["Spaces/Sermons", "Spaces/Sermons/Sermons MOC.base", "Sermons", "Your preaching archive"],
    ["Notes", null, "Notes", "My very own atomic notes"],
    ["Spaces/Books", "Spaces/Books/Books MOC", "Books", "Reading & source notes"],
    ["Spaces/Osermons", "Spaces/Osermons/Osermons MOC", "Other sermons", "Other pastors & speakers"],
    ["Spaces/Courses", null, "Courses", "Lessons & training"],
    ["Projects", "Projects/Projects MOC", "Projects", "Programs & church work"],
    ["Cards", null, "Cards", "Schedules & records"],
    ["Daily Notes", null, "Daily Notes", "Daily observations"]
  ];
  return {
    name: "Vault at a glance",
    about: "Note counts for each part of the vault",
    width: 12,
    areas: AREAS,
    variants: [],
    async render(body2, { ui, vault }) {
      const { el } = ui;
      ui.section(body2, "Vault at a glance", "Markdown notes");
      const card = el(body2, "div", "m-glance-card hp-card hp-grow");
      const tiles = el(card, "div", "m-glance");
      for (const [folder, index, label, purpose] of AREAS) {
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
def17.watch = (paths) => anyUnder(paths, ...def17.areas.map((a) => a[0]));
var vault_glance_default = def17;

