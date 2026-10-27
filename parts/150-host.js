// src/host.ts
var PROPERTY = "home_theme";
var WIDTHS = [[4, "⅓", "One third"], [6, "½", "Half"], [8, "⅔", "Two thirds"], [12, "Full", "Full width"]];
var SKIN = { card: "hp-card", panel: "hp-panel", pill: "hp-pill", knob: "hp-knob", mint: "hp-accent", kicker: "hp-kicker", track: "hp-track" };
var REDRAW_DELAY = 600;
var plainItems = (list2) => list2.map(({ module: module2, w, variant, settings, themed }) => ({
  module: module2,
  w,
  variant,
  ...Object.keys(settings || {}).length ? { settings: { ...settings } } : {},
  ...Object.keys(themed || {}).length ? { themed: { ...themed } } : {}
}));
function makeLife(win) {
  const jobs = /* @__PURE__ */ new Set();
  const component = new import_obsidian5.Component();
  component.load();
  let active = true;
  const dispose = (fn) => {
    try {
      fn();
    } catch (err) {
      console.error("Modular Homepage: clean-up failed", err);
    }
  };
  jobs.add(() => component.unload());
  return {
    get active() {
      return active;
    },
    component,
    interval(fn, ms) {
      if (!active) return 0;
      const id = win.setInterval(() => {
        if (active) fn();
      }, ms);
      jobs.add(() => win.clearInterval(id));
      return id;
    },
    timeout(fn, ms) {
      if (!active) return 0;
      const cancel = () => win.clearTimeout(id);
      const id = win.setTimeout(() => {
        jobs.delete(cancel);
        if (active) fn();
      }, ms);
      jobs.add(cancel);
      return id;
    },
    on(target, type, fn, opts) {
      if (!active) return;
      target.addEventListener(type, fn, opts);
      jobs.add(() => target.removeEventListener(type, fn, opts));
    },
    cleanup(fn) {
      if (active) jobs.add(fn);
      else dispose(fn);
      return () => jobs.delete(fn);
    },
    stop() {
      if (!active) return;
      active = false;
      const pending = [...jobs].reverse();
      jobs.clear();
      pending.forEach(dispose);
    }
  };
}
var HomeBlock = class extends import_obsidian5.MarkdownRenderChild {
  constructor(plugin, containerEl, sourcePath) {
    super(containerEl);
    this.plugin = plugin;
    this.sourcePath = sourcePath;
  }
  draw = null;
  drawing = Promise.resolve();
  fullTimer = 0;
  changed = /* @__PURE__ */ new Set();
  changeTimer = 0;
  releaseStyles = null;
  onload() {
    this.plugin.blocks.add(this);
    this.releaseStyles = this.plugin.useStyles(this.containerEl.ownerDocument);
    this.containerEl.style.overflowX = "auto";
    this.redraw();
  }
  onunload() {
    this.plugin.blocks.delete(this);
    this.releaseStyles?.();
    const win = this.containerEl.win;
    win.clearTimeout(this.fullTimer);
    win.clearTimeout(this.changeTimer);
    this.draw?.dispose();
    this.draw = null;
  }
  get theme() {
    return this.draw?.theme.id ?? null;
  }
  get layoutId() {
    return this.draw?.layout?.id ?? null;
  }
  get arranging() {
    return !!this.draw?.G.arrange;
  }
  // Draw the whole page again, after any draw in progress.
  redraw() {
    this.drawing = this.drawing.then(async () => {
      if (!this.plugin.blocks.has(this)) return;
      this.draw?.dispose();
      this.containerEl.empty();
      const draw = this.draw = new PageDraw(this);
      try {
        await draw.start();
      } catch (err) {
        console.error("Modular Homepage: the page could not be drawn", err);
        this.containerEl.createEl("pre", { text: "Modular Homepage: the page could not be drawn.\n" + err });
      }
    });
    return this.drawing;
  }
  // A note changed: this note → the whole page (soon); another note → the modules that watch it, together.
  noteChanged(path) {
    const win = this.containerEl.win;
    if (path === this.sourcePath) {
      win.clearTimeout(this.fullTimer);
      this.fullTimer = win.setTimeout(() => this.redraw(), 150);
      return;
    }
    this.changed.add(path);
    win.clearTimeout(this.changeTimer);
    this.changeTimer = win.setTimeout(() => {
      const paths = [...this.changed];
      this.changed.clear();
      this.drawing = this.drawing.then(() => this.draw?.refresh(paths)).catch((err) => console.error("Modular Homepage: redraw failed", err));
    }, REDRAW_DELAY);
  }
};
var PageDraw = class {
  constructor(block) {
    this.block = block;
    this.plugin = block.plugin;
    this.app = block.plugin.app;
    this.host = block.containerEl;
    this.doc = this.host.ownerDocument;
    this.win = this.doc.defaultView || window;
    this.G = this.plugin.pageState(block.sourcePath);
    this.pageLife = makeLife(this.win);
    this.cleanups.push(() => this.pageLife.stop());
  }
  alive = true;
  plugin;
  app;
  host;
  doc;
  win;
  G;
  pageLife;
  cleanups = [];
  theme;
  layout;
  hint = null;
  defs = /* @__PURE__ */ new Map();
  core;
  root;
  tipBox;
  grid;
  bar;
  arrangeBtn;
  addBtn = null;
  addPop = null;
  dispose() {
    if (!this.alive) return;
    this.alive = false;
    for (const s2 of this.slots()) {
      s2.__dragStop?.();
      s2.__life?.stop();
    }
    for (const fn of this.cleanups.splice(0).reverse()) {
      try {
        fn();
      } catch (err) {
        console.error("Modular Homepage: clean-up failed", err);
      }
    }
  }
  notify(message) {
    new import_obsidian5.Notice(message);
  }
  get self() {
    return this.plugin.vault.page(this.block.sourcePath);
  }
  makeCore() {
    return makeCore({
      app: this.app,
      vault: this.plugin.vault,
      doc: this.doc,
      config: this.plugin.config,
      root: this.root,
      tipBox: this.tipBox,
      host: this.host,
      sourcePath: this.block.sourcePath,
      manuscripts: this.plugin.manuscripts
    });
  }
  async start() {
    const { plugin, G, doc, host } = this;
    const THEMES2 = plugin.themes;
    const self = this.self;
    const themeById = (id) => THEMES2.find((t) => t.id === String(id ?? "").trim().toLowerCase()) || null;
    const pending = G.themePending;
    const saved = themeById(self?.[PROPERTY]);
    this.theme = pending && Date.now() - pending.at < 15e3 && themeById(pending.id) || saved || themeById(plugin.settings.defaultTheme) || THEMES2[0];
    if (pending && saved && saved.id === pending.id) G.themePending = null;
    const theme = this.theme;
    const layout = this.layout = plugin.layoutFor(this.block.sourcePath);
    for (const [id, def20] of plugin.modules) this.defs.set(id, {
      id,
      name: def20.name || id,
      about: def20.about || "",
      width: def20.width || 12,
      variants: def20.variants || [],
      settings: def20.settings || {},
      render: def20.render,
      watch: def20.watch
    });
    const viewContent = host.closest(".view-content");
    const noteViews = viewContent ? [...viewContent.querySelectorAll(":scope > .markdown-reading-view > .markdown-preview-view, :scope > .markdown-source-view")] : [];
    const added = [];
    for (const view of noteViews)
      for (const cls of theme.classes || [])
        if (!view.classList.contains(cls)) {
          view.classList.add(cls);
          added.push([view, cls]);
        }
    this.cleanups.push(() => {
      for (const [view, cls] of added) view.classList.remove(cls);
    });
    const arranging = G.arrange && G.arrange.layoutId === layout.id ? G.arrange : null;
    if (G.arrange && !arranging) G.arrange = null;
    const items = arranging ? this.clean(arranging.items) : this.savedItems();
    const root = this.root = doc.createElement("div");
    root.className = "hp-home";
    root.dataset.theme = theme.id;
    if (!plugin.settings.showTitles) root.classList.add("hp-titles-off");
    this.tipBox = doc.createElement("div");
    this.tipBox.className = "hp-tip hp-panel";
    this.core = this.makeCore();
    const ui = this.core.uiFor(this.pageLife.component);
    const barButton = (iconName, title) => {
      const b = ui.el(null, "button", "hp-tb-icon");
      b.type = "button";
      b.title = title;
      b.setAttribute("aria-label", title);
      b.setAttribute("aria-haspopup", "menu");
      b.setAttribute("aria-expanded", "false");
      ui.icon(b, iconName, "hp-tb-ico");
      return b;
    };
    const layoutBtn = this.arrangeBtn = barButton("layout", "Layout: " + layout.name);
    layoutBtn.setAttribute("aria-pressed", String(!!arranging));
    const themeBtn = barButton("palette", "Homepage theme: " + theme.name);
    try {
      renderTopbar({
        app: this.app,
        config: plugin.config,
        container: host,
        sourcePath: this.block.sourcePath,
        homeNote: plugin.settings.homeNote,
        render: (parent, md, cls) => ui.render(parent, md, cls)
      }, { ...theme.bar || {}, buttons: (acts) => acts.append(layoutBtn, themeBtn) });
    } catch (err) {
      console.error("Modular Homepage: could not draw the top bar", err);
    }
    if (!this.alive) return;
    if (!themeBtn.isConnected) ui.el(host, "div", "hp-hs-top").append(layoutBtn, themeBtn);
    const layer = ui.el(host, "div", "hp-hs-layer");
    const menus = [];
    const isOpen = (button) => button.getAttribute("aria-expanded") === "true";
    const makeMenu = (button, title, entries) => {
      const menu = ui.el(layer, "div", "hp-hs-menu");
      menu.hidden = true;
      menu.setAttribute("role", "menu");
      menu.setAttribute("aria-label", title);
      let items2 = [];
      const build = () => {
        menu.replaceChildren();
        ui.el(menu, "div", "hp-hs-menu-title", title);
        items2 = [];
        for (const e of entries()) {
          if (e === "sep") {
            ui.el(menu, "div", "hp-hs-sep").setAttribute("role", "separator");
            continue;
          }
          const radio = e.on !== void 0;
          const item = ui.el(menu, "button", "hp-hs-item" + (e.on ? " is-on" : "") + (radio ? "" : " is-action") + (e.danger ? " is-danger" : ""));
          item.type = "button";
          item.disabled = !!e.disabled;
          item.setAttribute("role", radio ? "menuitemradio" : "menuitem");
          if (radio) item.setAttribute("aria-checked", String(!!e.on));
          ui.el(item, "span", "hp-hs-mark").innerHTML = e.on ? svgOf("check", 3.5) : e.icon ? svgOf(e.icon) : "";
          const text = ui.el(item, "span", "");
          ui.el(text, "b", "", e.label);
          if (e.about) ui.el(text, "small", "", e.about);
          item.addEventListener("click", () => {
            set(false);
            e.run();
          });
          if (!e.disabled) items2.push(item);
        }
      };
      const place = () => {
        const box = layer.getBoundingClientRect(), b = button.getBoundingClientRect(), w = menu.offsetWidth;
        menu.style.top = Math.round(b.bottom - box.top + 8) + "px";
        menu.style.left = Math.round(Math.max(0, Math.min(b.right - box.left - w, box.width - w))) + "px";
        this.fitPopups();
      };
      const set = (open) => {
        if (open) {
          for (const m of menus) if (m.menu !== menu) m.set(false);
          build();
        }
        menu.hidden = !open;
        button.setAttribute("aria-expanded", String(open));
        if (!open) return this.fitPopups();
        place();
        (items2.find((i) => i.classList.contains("is-on")) || items2[0])?.focus({ preventScroll: true });
      };
      menu.addEventListener("keydown", (e) => {
        const i = items2.indexOf(doc.activeElement);
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
          e.preventDefault();
          items2[(i + (e.key === "ArrowDown" ? 1 : -1) + items2.length) % items2.length]?.focus({ preventScroll: true });
        }
        if (e.key === "Tab") {
          e.preventDefault();
          set(false);
          button.focus();
        }
      });
      menus.push({ menu, button, set, place });
      return set;
    };
    this.pageLife.on(doc, "pointerdown", (e) => {
      const target = e.target;
      for (const m of menus) if (!m.menu.hidden && !m.button.contains(target) && !m.menu.contains(target)) m.set(false);
      if (this.addPop && !this.addPop.hidden && !this.addPop.contains(target) && !this.addBtn?.contains(target)) {
        this.addPop.hidden = true;
        this.fitPopups();
      }
    }, true);
    this.pageLife.on(doc, "keydown", (e) => {
      if (e.key !== "Escape") return;
      for (const m of menus) if (!m.menu.hidden) {
        m.set(false);
        m.button.focus();
      }
      if (this.addPop && !this.addPop.hidden) {
        this.addPop.hidden = true;
        this.fitPopups();
        this.addBtn?.focus();
      }
    });
    this.cleanups.push(() => host.style.minHeight = "");
    this.pageLife.on(doc, "scroll", () => {
      for (const m of menus) if (!m.menu.hidden) m.place();
    }, true);
    this.pageLife.on(this.win, "resize", () => {
      for (const m of menus) if (!m.menu.hidden) m.place();
    });
    const chooseTheme = async (id) => {
      if (id === theme.id) return;
      G.themePending = { id, at: Date.now() };
      const file = this.app.vault.getAbstractFileByPath(this.block.sourcePath);
      try {
        if (file instanceof import_obsidian5.TFile) await this.app.fileManager.processFrontMatter(file, (fm) => {
          fm[fmKey(fm, PROPERTY)] = id;
        });
      } catch (err) {
        console.error("Modular Homepage: could not save the theme", err);
        this.notify("Could not save the theme choice");
      }
      if (this.alive) this.block.redraw();
    };
    const themeMenu = makeMenu(themeBtn, "Homepage theme", () => THEMES2.map((t) => ({ label: t.name, about: t.about, on: t.id === theme.id, run: () => chooseTheme(t.id) })));
    themeBtn.addEventListener("click", () => themeMenu(!isOpen(themeBtn)));
    const layoutMenu = makeMenu(layoutBtn, "Layout", () => {
      const L = plugin.layouts, only = L.list.length < 2;
      return [
        ...L.list.map((l2) => ({
          label: l2.name,
          on: l2.id === layout.id,
          run: () => this.pickLayout(l2.id),
          about: ui.plural(this.clean(l2.items).length, "module", "modules") + (l2.id === L.defaultId ? " · default" : "")
        })),
        "sep",
        { label: "Arrange “" + layout.name + "”", about: "Move, resize, add or hide its modules", icon: "layout", run: () => this.setArranging(true, false) },
        { label: "New layout…", about: "Start empty, then add modules", icon: "plus", run: () => this.newLayout() },
        { label: "Duplicate…", about: "A copy of “" + layout.name + "” to change", icon: "copy", run: () => this.duplicateLayout() },
        { label: "Rename…", icon: "pencil", run: () => this.renameLayout() },
        ...L.defaultId === layout.id ? [] : [{ label: "Make default", about: "For homepages that haven't picked a layout", icon: "star", run: () => this.makeDefault() }],
        { label: "Delete…", about: only ? "Your only layout can't be deleted" : void 0, icon: "trash", danger: true, disabled: only, run: () => this.deleteLayout() }
      ];
    });
    layoutBtn.addEventListener("click", () => {
      if (G.arrange) this.setArranging(false, true);
      else layoutMenu(!isOpen(layoutBtn));
    });
    host.append(root);
    root.append(this.tipBox);
    this.bar = ui.el(root, "div", "hp-arrange-bar hp-panel");
    this.grid = ui.el(root, "div", "hp-grid");
    this.drawBar();
    await this.buildGrid(items);
    let shownDay = this.core.time.today.toISODate(), refreshing = false;
    this.pageLife.interval(async () => {
      const day = this.core.time.todayNow().toISODate();
      if (day === shownDay || !root.isConnected || refreshing) return;
      refreshing = true;
      try {
        this.core = this.makeCore();
        await this.buildGrid(this.draftItems());
        shownDay = day;
      } catch (err) {
        console.error("Modular Homepage: new-day redraw failed", err);
      } finally {
        refreshing = false;
      }
    }, 6e4);
  }
  // An open menu or add-module list hangs below the top bar. On a short page (a new, empty layout) the note's box cut
  // it off, so the homepage block grows to hold it while it is open.
  fitPopups() {
    const { host } = this;
    const open = [...host.querySelectorAll(".hp-hs-menu:not([hidden]), .hp-add-pop:not([hidden])")];
    if (!open.length) {
      host.style.minHeight = "";
      return;
    }
    const top = host.getBoundingClientRect().top;
    host.style.minHeight = Math.ceil(Math.max(...open.map((el) => el.getBoundingClientRect().bottom)) - top + 16) + "px";
  }
  // ---------- Layout menu actions ----------
  async pickLayout(id) {
    if (id === this.layout.id) return;
    if (this.G.arrange) {
      this.G.arrange = null;
      this.notify("Arrange mode closed without saving");
    }
    try {
      await this.plugin.chooseLayout(this.block.sourcePath, id);
    } catch (err) {
      console.error("Modular Homepage: could not switch the layout", err);
      this.notify("Could not switch the layout");
    }
  }
  async newLayout() {
    const name = await askName(this.app, "New layout", "", "Create");
    if (!name) return;
    try {
      const made = await this.plugin.createLayout(name, []);
      this.G.arrange = { layoutId: made.id, items: [] };
      await this.plugin.chooseLayout(this.block.sourcePath, made.id);
    } catch (err) {
      console.error("Modular Homepage: could not create the layout", err);
      this.notify("Could not create the layout");
    }
  }
  async duplicateLayout() {
    const from = this.layout;
    const name = await askName(this.app, "Duplicate “" + from.name + "”", this.plugin.uniqueName(from.name + " copy"), "Duplicate");
    if (!name) return;
    const items = this.G.arrange ? this.draftItems() : this.savedItems();
    try {
      const made = await this.plugin.createLayout(name, plainItems(items));
      if (this.G.arrange) {
        this.G.arrange = null;
        this.notify("“" + from.name + "” was left as it was saved; the copy has your changes");
      }
      await this.plugin.chooseLayout(this.block.sourcePath, made.id);
    } catch (err) {
      console.error("Modular Homepage: could not duplicate the layout", err);
      this.notify("Could not duplicate the layout");
    }
  }
  async renameLayout() {
    const name = await askName(this.app, "Rename “" + this.layout.name + "”", this.layout.name, "Rename");
    if (!name || name === this.layout.name) return;
    try {
      await this.plugin.renameLayout(this.layout.id, name);
    } catch (err) {
      console.error("Modular Homepage: could not rename the layout", err);
      this.notify("Could not rename the layout");
    }
  }
  async makeDefault() {
    try {
      await this.plugin.setDefaultLayout(this.layout.id);
      this.notify("“" + this.layout.name + "” is the default layout");
    } catch (err) {
      console.error("Modular Homepage: could not set the default layout", err);
      this.notify("Could not set the default layout");
    }
  }
  async deleteLayout() {
    const { plugin, layout } = this;
    if (plugin.layouts.list.length < 2) return;
    const fallback = plugin.layouts.defaultId === layout.id ? plugin.layouts.list.find((l2) => l2.id !== layout.id) : plugin.layoutById(plugin.layouts.defaultId);
    const ok = await askConfirm(this.app, "Delete “" + layout.name + "”?", "Homepages showing it switch to “" + fallback.name + "”. This can't be undone.", "Delete");
    if (!ok) return;
    try {
      if (await plugin.deleteLayout(layout.id)) this.notify("Layout “" + layout.name + "” deleted");
    } catch (err) {
      console.error("Modular Homepage: could not delete the layout", err);
      this.notify("Could not delete the layout");
    }
  }
  // Notes changed: fresh data, and the modules that watch any of them drawn again.
  async refresh(paths) {
    if (!this.alive || !this.root?.isConnected) return;
    const dirty = this.slots().filter((s2) => {
      const def20 = this.defOf(s2.__item);
      try {
        return !def20.watch || def20.watch(paths, { config: this.plugin.config, app: this.app, seen: s2.__seen ?? /* @__PURE__ */ new Set() });
      } catch (err) {
        console.error("Modular Homepage: watch failed for " + def20.id, err);
        return true;
      }
    });
    if (!dirty.length) return;
    this.core = this.makeCore();
    await Promise.all(dirty.map((s2) => this.renderSlot(s2)));
  }
  // ---------- Layouts ----------
  // Keep only modules that exist (once each), with a known width and variant (and known per-theme picks).
  clean(items) {
    const seen = /* @__PURE__ */ new Set();
    return (items || []).filter((i) => this.defs.has(i?.module) && !seen.has(i.module) && seen.add(i.module)).map((i) => {
      const def20 = this.defs.get(i.module);
      const known = (v) => def20.variants.some(([k]) => k === v);
      const w = WIDTHS.some(([n2]) => n2 === Number(i.w)) ? Number(i.w) : def20.width;
      const variant = known(i.variant) ? i.variant : def20.variants[0]?.[0] || "";
      const themed = Object.fromEntries(Object.entries(i.themed && typeof i.themed === "object" ? i.themed : {}).filter(([, v]) => known(v)));
      return { module: i.module, w, variant, settings: i.settings || {}, ...Object.keys(themed).length ? { themed } : {} };
    });
  }
  // The variant a module shows in this theme: your pick in this theme, else the theme's own look for the module (Dune's
  // event card), else the layout's variant.
  variantOf(item) {
    const def20 = this.defOf(item), known = (v) => !!v && def20.variants.some(([k]) => k === v);
    const mine = item.themed?.[this.theme.id], look = this.theme.variants?.[item.module];
    return known(mine) ? mine : known(look) ? look : item.variant;
  }
  // A variant picked in Arrange (or with a module's own style switch): kept for this theme when the theme has its own
  // look for the module, so the other themes keep showing the layout's variant; else it is the layout's variant.
  pickVariantOf(item, v) {
    const look = this.theme.variants?.[item.module];
    if (look && this.defOf(item).variants.some(([k]) => k === look) || item.themed?.[this.theme.id]) item.themed = { ...item.themed, [this.theme.id]: v };
    else item.variant = v;
  }
  savedItems() {
    return this.clean(this.plugin.layoutById(this.layout.id)?.items);
  }
  async saveItems(list2) {
    try {
      await this.plugin.saveLayoutItems(this.layout.id, plainItems(list2), this.block);
      return true;
    } catch (err) {
      console.error("Modular Homepage: layout could not be saved", err);
      this.notify("Could not save the layout");
      return false;
    }
  }
  // An empty layout says how to fill it (not while arranging: the Add module button is right there).
  syncHint() {
    const empty = !this.G.arrange && !this.slots().length;
    if (!empty) {
      this.hint?.remove();
      this.hint = null;
      return;
    }
    if (this.hint?.isConnected) return;
    const ui = this.core.uiFor(this.pageLife.component);
    this.hint = ui.el(null, "div", "hp-empty hp-panel hp-layout-empty", "“" + this.layout.name + "” has no modules yet. Open the layout menu in the top bar and choose Arrange to add some.");
    this.grid.after(this.hint);
  }
  // ---------- Modules ----------
  defOf = (item) => this.defs.get(item.module);
  slots = () => this.grid ? [...this.grid.querySelectorAll(":scope > .hp-slot")] : [];
  draftItems = () => this.slots().map((s2) => s2.__item);
  syncDraft() {
    if (this.G.arrange) this.G.arrange.items = this.draftItems().map((i) => ({ ...i }));
  }
  // renderSlot(): draw one module into its slot, with its own ctx and clean-up.
  async renderSlot(slot) {
    if (!this.alive || !slot.isConnected) return;
    const item = slot.__item, G = this.G, core = this.core;
    slot.__life?.stop();
    const life = slot.__life = makeLife(this.win);
    const seen = slot.__seen = /* @__PURE__ */ new Set();
    const def20 = this.defOf(item);
    const body2 = this.doc.createElement("div");
    body2.className = "hp-body";
    body2.inert = !!G.arrange;
    slot.querySelector(":scope > .hp-body").replaceWith(body2);
    const variant = this.variantOf(item);
    slot.dataset.variant = variant || "";
    const ui = core.uiFor(life.component);
    const ctx = {
      ...core,
      ui,
      app: this.app,
      vault: this.plugin.vault,
      doc: this.doc,
      self: this.self,
      config: this.plugin.config,
      skin: SKIN,
      theme: this.theme.id,
      module: def20.id,
      variant,
      settings: { ...def20.settings, ...item.settings },
      store: G.state[def20.id] ??= {},
      life,
      root: this.root,
      seen,
      // The task panel, drawn into `node` with this module's life.
      renderTasks: (node, input) => renderTasks({
        app: this.app,
        vault: this.plugin.vault,
        config: this.plugin.config,
        container: node,
        life,
        render: (parent, md, cls) => ui.render(parent, md, cls)
      }, input),
      redraw: () => life.active && this.alive && slot.isConnected ? this.renderSlot(slot) : Promise.resolve(),
      // A module's own style switch (Stylish's card styles): changes its variant and saves the layout, as Done would.
      setVariant: async (v) => {
        if (!life.active || !this.alive || v === variant || !def20.variants.some(([k]) => k === v)) return;
        const previous = { variant: item.variant, themed: item.themed };
        this.pickVariantOf(item, v);
        if (G.arrange) {
          this.syncDraft();
          this.addHandle(slot);
        } else if (!await this.saveItems(this.slots().map((s2) => s2.__item))) {
          item.variant = previous.variant;
          if (previous.themed) item.themed = previous.themed;
          else delete item.themed;
          return;
        }
        if (life.active && this.alive) await this.renderSlot(slot);
      }
    };
    try {
      await def20.render(body2, ctx);
    } catch (err) {
      if (!this.alive || !life.active) return;
      console.error("Modular Homepage: module " + def20.id + " failed", err);
      ui.el(body2, "div", "hp-error hp-panel", "“" + def20.name + "” could not be drawn: " + (err?.message || err));
    }
  }
  makeSlot(item) {
    const def20 = this.defOf(item);
    const slot = this.doc.createElement("section");
    slot.className = "hp-slot";
    slot.__item = item;
    slot.dataset.module = item.module;
    slot.dataset.w = String(item.w);
    slot.setAttribute("aria-label", def20.name);
    slot.createDiv({ cls: "hp-body" });
    return slot;
  }
  async buildGrid(list2) {
    if (!this.alive) return;
    for (const s2 of this.slots()) {
      s2.__dragStop?.();
      s2.__life?.stop();
    }
    this.grid.replaceChildren();
    const made = list2.map((item) => {
      const s2 = this.makeSlot(item);
      this.grid.append(s2);
      return s2;
    });
    if (this.G.arrange) made.forEach((s2) => this.addHandle(s2));
    this.syncHint();
    await Promise.all(made.map((s2) => this.renderSlot(s2)));
  }
  // ---------- Arrange mode ----------
  segmented(parent, label, options, current, onPick) {
    const ui = this.core.uiFor(this.pageLife.component);
    const seg = ui.el(parent, "div", "hp-seg");
    seg.setAttribute("role", "group");
    seg.setAttribute("aria-label", label);
    for (const [value, text, title] of options) {
      const b = ui.button(seg, "hp-seg-btn" + (value === current ? " is-on" : ""), "", text, title || text, () => onPick(value));
      b.setAttribute("aria-pressed", String(value === current));
    }
    return seg;
  }
  addHandle(slot) {
    const ui = this.core.uiFor(this.pageLife.component);
    slot.__dragStop?.();
    slot.querySelector(":scope > .hp-handle")?.remove();
    const item = slot.__item, def20 = this.defOf(item);
    const handle = ui.el(null, "div", "hp-handle hp-pill");
    slot.prepend(handle);
    slot.querySelector(":scope > .hp-body").inert = true;
    const grip = ui.button(handle, "hp-grip", "grip", "", "Drag to move " + def20.name);
    ui.el(handle, "b", "hp-handle-name", def20.name);
    const tools = ui.el(handle, "div", "hp-handle-tools");
    const pickVariant = (v) => {
      this.pickVariantOf(item, v);
      this.syncDraft();
      this.addHandle(slot);
      this.renderSlot(slot);
    };
    const current = this.variantOf(item);
    if (def20.variants.length > 6) {
      const pick2 = ui.el(tools, "select", "hp-variant");
      pick2.setAttribute("aria-label", "Variant");
      for (const [v, text] of def20.variants) {
        const o = ui.el(pick2, "option", "", text);
        o.value = v;
        o.selected = v === current;
      }
      pick2.addEventListener("change", () => pickVariant(pick2.value));
    } else if (def20.variants.length > 1) this.segmented(tools, "Variant", def20.variants, current, pickVariant);
    this.segmented(tools, "Width", WIDTHS, item.w, (w) => {
      item.w = w;
      slot.dataset.w = String(w);
      this.syncDraft();
      this.addHandle(slot);
    });
    const moves = ui.el(tools, "div", "hp-seg");
    ui.button(moves, "hp-seg-btn", "left", "", "Move earlier", () => this.move(slot, -1));
    ui.button(moves, "hp-seg-btn", "right", "", "Move later", () => this.move(slot, 1));
    ui.button(handle, "hp-seg-btn hp-hide", "eyeOff", "", "Hide " + def20.name, () => {
      slot.__life?.stop();
      slot.remove();
      this.syncDraft();
      this.drawBar();
    });
    this.dragWith(grip, slot);
  }
  move(slot, step) {
    const list2 = this.slots(), i = list2.indexOf(slot), j = i + step;
    if (j < 0 || j >= list2.length) return;
    if (step < 0) this.grid.insertBefore(slot, list2[j]);
    else this.grid.insertBefore(slot, list2[j].nextSibling);
    this.syncDraft();
    slot.querySelector(step < 0 ? "[aria-label='Move earlier']" : "[aria-label='Move later']")?.focus();
  }
  // Drag ⠿: the module moves among the others as the pointer crosses them (mouse, pen or finger). Near the top or bottom
  // edge the note scrolls, so a module can travel the whole page.
  dragWith(grip, slot) {
    const { doc, win, grid, root } = this;
    grip.addEventListener("pointerdown", (e) => {
      if (!this.alive || e.button !== 0) return;
      slot.__dragStop?.();
      e.preventDefault();
      grip.setPointerCapture?.(e.pointerId);
      const scroller = this.host.closest(".markdown-preview-view, .cm-scroller") || doc.scrollingElement;
      let x = e.clientX, y = e.clientY, frame = 0;
      slot.classList.add("is-dragging");
      root.classList.add("is-dragging");
      const place = () => {
        const target = this.slots().find((s2) => {
          if (s2 === slot) return false;
          const r2 = s2.getBoundingClientRect();
          return x >= r2.left && x <= r2.right && y >= r2.top && y <= r2.bottom;
        });
        if (!target) return;
        const r = target.getBoundingClientRect();
        const sideBySide = r.width < grid.clientWidth * 0.9;
        const before = sideBySide ? x < r.left + r.width / 2 : y < r.top + r.height / 2;
        if (before ? slot.nextElementSibling !== target : target.nextElementSibling !== slot) grid.insertBefore(slot, before ? target : target.nextSibling);
      };
      const step = () => {
        const r = scroller === doc.scrollingElement ? { top: 0, bottom: win.innerHeight } : scroller.getBoundingClientRect();
        const speed = y < r.top + 60 ? -Math.ceil((r.top + 60 - y) / 4) : y > r.bottom - 60 ? Math.ceil((y - r.bottom + 60) / 4) : 0;
        if (speed) {
          scroller.scrollTop += speed;
          place();
        }
        frame = win.requestAnimationFrame(step);
      };
      const onMove = (ev) => {
        x = ev.clientX;
        y = ev.clientY;
        place();
      };
      let dragging = true;
      let releaseCleanup;
      const onEnd = () => {
        if (!dragging) return;
        dragging = false;
        releaseCleanup?.();
        if (slot.__dragStop === onEnd) delete slot.__dragStop;
        win.cancelAnimationFrame(frame);
        grip.removeEventListener("pointermove", onMove);
        grip.removeEventListener("pointerup", onEnd);
        grip.removeEventListener("pointercancel", onEnd);
        grip.removeEventListener("lostpointercapture", onEnd);
        slot.classList.remove("is-dragging");
        root.classList.remove("is-dragging");
        this.syncDraft();
      };
      slot.__dragStop = onEnd;
      releaseCleanup = this.pageLife.cleanup(onEnd);
      grip.addEventListener("pointermove", onMove);
      grip.addEventListener("pointerup", onEnd);
      grip.addEventListener("pointercancel", onEnd);
      grip.addEventListener("lostpointercapture", onEnd);
      frame = win.requestAnimationFrame(step);
    });
  }
  drawBar() {
    const { G, bar, root, arrangeBtn, layout } = this;
    const ui = this.core.uiFor(this.pageLife.component);
    bar.replaceChildren();
    this.fitPopups();
    bar.hidden = !G.arrange;
    root.classList.toggle("is-arranging", !!G.arrange);
    arrangeBtn.setAttribute("aria-pressed", String(!!G.arrange));
    arrangeBtn.classList.toggle("is-on", !!G.arrange);
    arrangeBtn.title = G.arrange ? "Done: save “" + layout.name + "”" : "Layout: " + layout.name;
    arrangeBtn.setAttribute("aria-label", arrangeBtn.title);
    this.syncHint();
    if (!G.arrange) return;
    const text = ui.el(bar, "div", "hp-arrange-text");
    ui.el(text, "b", "", "Arrange · " + layout.name);
    ui.el(text, "span", "", "Drag ⠿ to move. Pick a width and variant. Done saves the layout “" + layout.name + "”.");
    const acts = ui.el(bar, "div", "hp-arrange-acts");
    const placed = new Set(this.draftItems().map((i) => i.module));
    const unused = [...this.defs.values()].filter((d) => !placed.has(d.id));
    const addWrap = ui.el(acts, "div", "hp-add-wrap");
    const addBtn = this.addBtn = ui.button(addWrap, "hp-btn hp-pill", "plus", "Add module", "Add a module to the page", () => {
      addPop.hidden = !addPop.hidden;
      this.fitPopups();
    });
    addBtn.disabled = !unused.length;
    const addPop = this.addPop = ui.el(addWrap, "div", "hp-add-pop hp-panel");
    addPop.hidden = true;
    for (const d of unused) {
      const b = ui.el(addPop, "button", "hp-add-item");
      b.type = "button";
      ui.el(b, "b", "", d.name);
      ui.el(b, "small", "", d.about);
      b.addEventListener("click", () => {
        const item = { module: d.id, w: d.width, variant: d.variants[0]?.[0] || "", settings: {} };
        const slot = this.makeSlot(item);
        this.grid.append(slot);
        this.addHandle(slot);
        this.syncDraft();
        this.drawBar();
        this.renderSlot(slot).then(() => {
          if (this.alive && slot.isConnected) slot.scrollIntoView({ block: "nearest", behavior: "smooth" });
        });
      });
    }
    ui.button(acts, "hp-btn hp-pill", "", "Cancel", "Leave without saving", () => this.setArranging(false, false));
    ui.button(acts, "hp-btn hp-accent", "check", "Done", "Save “" + layout.name + "”", () => this.setArranging(false, true));
  }
  async setArranging(on, save) {
    const { G } = this;
    if (on) {
      if (G.arrange) return;
      G.arrange = { layoutId: this.layout.id, items: this.draftItems().map((i) => ({ ...i })) };
      this.slots().forEach((s2) => this.addHandle(s2));
      this.drawBar();
      return;
    }
    const list2 = this.draftItems();
    const wasSaved = save ? await this.saveItems(list2) : false;
    if (save && !wasSaved) return;
    G.arrange = null;
    this.drawBar();
    if (save) {
      for (const s2 of this.slots()) {
        s2.querySelector(":scope > .hp-handle")?.remove();
        s2.querySelector(":scope > .hp-body").inert = false;
      }
      this.notify("Layout “" + this.layout.name + "” saved");
    } else await this.buildGrid(this.savedItems());
  }
};

