// src/modules/shortcuts.ts
var def18 = /* @__PURE__ */ (() => {
  const CREATE = ["newnote", "newothersermon"];
  const LINKS = [["AI/AGENTS", "AI Instructions"], ["AI/rules", "Working Rules"]];
  return {
    name: "Shortcuts",
    about: "Buttons to create notes, and links you keep at hand",
    width: 12,
    variants: [],
    async render(body2, { ui }) {
      const { el } = ui;
      const foot = el(body2, "footer", "m-short hp-card hp-grow");
      foot.setAttribute("aria-label", "Shortcuts");
      if (CREATE.length) {
        const g = el(foot, "div", "m-short-group");
        g.setAttribute("role", "group");
        g.setAttribute("aria-label", "Create notes");
        el(g, "span", "hp-label", "Create");
        const acts = el(g, "div", "m-short-acts");
        for (const id of CREATE) ui.render(acts, "`BUTTON[" + id + "]`", "m-short-button");
      }
      if (LINKS.length) {
        const g = el(foot, "div", "m-short-group");
        el(g, "span", "hp-label", "Workspace");
        const nav = el(g, "nav", "m-short-links");
        nav.setAttribute("aria-label", "Workspace notes");
        for (const [target, label] of LINKS) ui.link(nav, target, label, "hp-link m-short-link");
      }
    }
  };
})();
def18.watch = () => false;
var shortcuts_default = def18;

