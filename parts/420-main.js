// src/main.ts
var STYLE_ID = "modular-homepage-styles";
var ModularHomepage = class extends import_obsidian10.Plugin {
  layouts = { version: 2, list: [], defaultId: "", chosen: {} };
  vault;
  blocks = /* @__PURE__ */ new Set();
  bars = /* @__PURE__ */ new Set();
  manuscripts = /* @__PURE__ */ new Map();
  // sermon word counts, kept between draws (by file version)
  pageStates = /* @__PURE__ */ new Map();
  styles = /* @__PURE__ */ new Map();
  resolvedOnce = false;
  get config() {
    return this.settings.config;
  }
  get themes() {
    return THEMES;
  }
  get modules() {
    return MODULES.filter(([id]) => !this.settings.hiddenModules.includes(id));
  }
  async onload() {
    await this.loadAll();
    this.vault = new VaultData(this.app);
    this.registerMarkdownCodeBlockProcessor("modular-homepage", (_source, el, ctx) => {
      ctx.addChild(new HomeBlock(this, el, ctx.sourcePath));
    });
    this.registerMarkdownCodeBlockProcessor("modular-homepage-bar", (_source, el, ctx) => {
      ctx.addChild(new BarBlock(this, el, ctx.sourcePath));
    });
    this.addSettingTab(new HomeSettingTab(this.app, this));
    this.registerEvent(this.app.metadataCache.on("changed", (file) => this.noteChanged(file.path)));
    this.registerEvent(this.app.metadataCache.on("deleted", (file) => this.noteChanged(file.path)));
    this.registerEvent(this.app.metadataCache.on("resolved", () => {
      if (this.resolvedOnce) return;
      this.resolvedOnce = true;
      for (const b of this.blocks) b.redraw();
    }));
    this.app.workspace.onLayoutReady(() => {
      const other = (f) => !(f instanceof import_obsidian10.TFile) || f.extension !== "md";
      this.registerEvent(this.app.vault.on("rename", (file, oldPath) => {
        this.noteChanged(oldPath);
        this.noteChanged(file.path);
      }));
      this.registerEvent(this.app.vault.on("create", (file) => {
        if (other(file)) this.noteChanged(file.path);
      }));
      this.registerEvent(this.app.vault.on("delete", (file) => {
        if (other(file)) this.noteChanged(file.path);
      }));
      this.registerEvent(this.app.vault.on("modify", (file) => {
        if (other(file)) this.noteChanged(file.path);
      }));
    });
  }
  onunload() {
    for (const { el } of this.styles.values()) el.remove();
    this.styles.clear();
  }
  noteChanged(path) {
    this.vault.forget(path);
    for (const b of this.blocks) b.noteChanged(path);
  }
  pageState(path) {
    if (!this.pageStates.has(path)) this.pageStates.set(path, { state: {}, arrange: null, themePending: null });
    return this.pageStates.get(path);
  }
  // The stylesheet, once per window, while a homepage or a top bar shows there. At the end of <body>, after
  // Obsidian's theme and snippets, as the Dataview version's in-note styles were.
  useStyles(doc) {
    let entry = this.styles.get(doc);
    if (!entry) {
      doc.getElementById(STYLE_ID)?.remove();
      const el = doc.createElement("style");
      el.id = STYLE_ID;
      el.textContent = styles_default;
      doc.body.append(el);
      this.styles.set(doc, entry = { el, users: 0 });
    }
    entry.users++;
    return () => {
      const e = this.styles.get(doc);
      if (!e || --e.users > 0) return;
      e.el.remove();
      this.styles.delete(doc);
    };
  }
  // ---------- Settings ----------
  async loadAll() {
    const data = await this.loadData();
    const s2 = data?.settings;
    this.settings = {
      config: { ...DEFAULT_CONFIG, ...s2?.config || {}, templates: { ...DEFAULT_CONFIG.templates, ...s2?.config?.templates || {} } },
      defaultTheme: THEMES.some((t) => t.id === s2?.defaultTheme) ? s2.defaultTheme : DEFAULT_THEME,
      homeNote: s2?.homeNote || "Homepage",
      hiddenModules: Array.isArray(s2?.hiddenModules) ? s2.hiddenModules : [],
      showTitles: s2?.showTitles === true
      // module titles above the cards (off: every module is just its card)
    };
    const saved = data?.layouts;
    this.layouts = { version: 2, list: [], defaultId: "", chosen: {} };
    if (saved?.version === 2 && Array.isArray(saved.list)) {
      const list2 = saved.list.filter((l2) => l2 && typeof l2.id === "string" && Array.isArray(l2.items)).map((l2) => ({ id: l2.id, name: String(l2.name || "Layout"), items: l2.items }));
      this.layouts = {
        version: 2,
        list: list2,
        defaultId: list2.some((l2) => l2.id === saved.defaultId) ? saved.defaultId : list2[0]?.id ?? "",
        chosen: saved.chosen && typeof saved.chosen === "object" ? { ...saved.chosen } : {}
      };
    }
    if (!this.layouts.list.length) {
      const aurora = Array.isArray(saved?.themes?.aurora) ? saved.themes.aurora : FIRST_LAYOUT;
      this.layouts = { version: 2, list: [{ id: "aurora", name: "Aurora", items: structuredClone(aurora) }], defaultId: "aurora", chosen: {} };
      await this.saveAll();
    }
  }
  // data.json changed outside Obsidian (a sync from another device): read it again and redraw.
  async onExternalSettingsChange() {
    await this.loadAll();
    this.redrawAll();
  }
  async saveAll() {
    await this.saveData({ settings: this.settings, layouts: this.layouts });
  }
  // Settings changed (folders, names, modules): draw every open homepage and top bar again.
  redrawAll() {
    this.vault.clear();
    for (const b of this.blocks) b.redraw();
    for (const b of this.bars) b.redraw();
  }
  // ---------- Layouts ----------
  layoutById(id) {
    return this.layouts.list.find((l2) => l2.id === id) ?? null;
  }
  // The layout a homepage note shows: the one picked there, else the default.
  layoutFor(notePath) {
    const L = this.layouts;
    return this.layoutById(L.chosen[notePath]) ?? this.layoutById(L.defaultId) ?? L.list[0];
  }
  // Change and save, putting everything back if the write fails.
  async commit(change) {
    const before = structuredClone(this.layouts);
    change();
    try {
      await this.saveAll();
    } catch (err) {
      this.layouts = before;
      throw err;
    }
  }
  // Open homepages showing one of these layouts are drawn again (a page being arranged keeps its draft).
  redrawLayouts(ids, except, notArranging = false) {
    for (const b of this.blocks) {
      if (b === except || !ids.includes(b.layoutId ?? "") || notArranging && b.arranging) continue;
      b.redraw();
    }
  }
  // A name no other layout has: "Sunday", else "Sunday 2", "Sunday 3"…
  uniqueName(name, except) {
    const base = name.trim() || "Layout";
    const taken = (n2) => this.layouts.list.some((l2) => l2.id !== except && l2.name.toLowerCase() === n2.toLowerCase());
    let next = base;
    for (let i = 2; taken(next); i++) next = base + " " + i;
    return next;
  }
  newId() {
    let id;
    do
      id = "l" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    while (this.layoutById(id));
    return id;
  }
  async saveLayoutItems(id, items, from) {
    if (!this.layoutById(id)) throw new Error("That layout no longer exists");
    await this.commit(() => {
      const layout = this.layoutById(id);
      const saved = structuredClone(items);
      const included = new Set(saved.map((item) => item.module));
      layout.items.forEach((item, index) => {
        if (this.settings.hiddenModules.includes(item.module) && !included.has(item.module)) {
          saved.splice(Math.min(index, saved.length), 0, structuredClone(item));
          included.add(item.module);
        }
      });
      layout.items = saved;
    });
    this.redrawLayouts([id], from, true);
  }
  async createLayout(name, items) {
    const layout = { id: this.newId(), name: this.uniqueName(name), items: structuredClone(items) };
    await this.commit(() => {
      this.layouts.list.push(layout);
    });
    return layout;
  }
  async renameLayout(id, name) {
    if (!this.layoutById(id)) return;
    await this.commit(() => {
      this.layoutById(id).name = this.uniqueName(name, id);
    });
    this.redrawLayouts([id]);
  }
  // The last layout can't be deleted. Homepages that showed it go to the default.
  async deleteLayout(id) {
    if (this.layouts.list.length < 2 || !this.layoutById(id)) return false;
    await this.commit(() => {
      const L = this.layouts;
      L.list = L.list.filter((l2) => l2.id !== id);
      if (L.defaultId === id) L.defaultId = L.list[0].id;
      for (const [note, chosen] of Object.entries(L.chosen)) if (chosen === id) delete L.chosen[note];
    });
    this.redrawLayouts([id]);
    return true;
  }
  async setDefaultLayout(id) {
    if (!this.layoutById(id)) return;
    const before = this.layouts.defaultId;
    await this.commit(() => {
      this.layouts.defaultId = id;
    });
    this.redrawLayouts([before, id]);
  }
  // Show a layout on a homepage note (every open view of that note follows).
  async chooseLayout(notePath, id) {
    if (!this.layoutById(id)) return;
    await this.commit(() => {
      this.layouts.chosen[notePath] = id;
    });
    for (const b of this.blocks) if (b.sourcePath === notePath) b.redraw();
  }
};
