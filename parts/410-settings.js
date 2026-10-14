// src/settings.ts
var import_obsidian9 = require("obsidian");
var list = (s2) => s2.split(",").map((x) => x.trim()).filter(Boolean);
var pairsToText = (pairs) => pairs.map(([a, b]) => a + " | " + b).join("\n");
var textToPairs = (text) => text.split(/\r?\n/).map((l2) => l2.split("|").map((x) => x.trim())).filter((p) => p[0]).map(([a, b]) => [a, b || a.split("/").pop()]);
var HomeSettingTab = class extends import_obsidian9.PluginSettingTab {
  constructor(app, plugin) {
    super(app, plugin);
    this.plugin = plugin;
  }
  display() {
    const { containerEl, plugin } = this;
    const C = plugin.settings.config;
    containerEl.empty();
    let timer = 0;
    const changed = () => {
      window.clearTimeout(timer);
      timer = window.setTimeout(async () => {
        await plugin.saveAll();
        plugin.redrawAll();
      }, 500);
    };
    const text = (name, desc, key, placeholder) => new import_obsidian9.Setting(containerEl).setName(name).setDesc(desc).addText((t) => t.setPlaceholder(placeholder ?? String(DEFAULT_CONFIG[key])).setValue(String(C[key] ?? "")).onChange((v) => {
      C[key] = v.trim();
      changed();
    }));
    containerEl.createEl("p", { text: "Show the homepage in any note with a code block named modular-homepage. Its theme is the note's home_theme property; the theme menu in the top bar changes it." });
    new import_obsidian9.Setting(containerEl).setName("You").setHeading();
    text("Name", "In greetings, the banner and the top bar.", "name");
    new import_obsidian9.Setting(containerEl).setName("Your names on the roster").setDesc("How the roster writes your name, separated by commas: those rows are marked as yours.").addText((t) => t.setValue(C.rosterMe.join(", ")).onChange((v) => {
      C.rosterMe = list(v);
      changed();
    }));
    new import_obsidian9.Setting(containerEl).setName("Words per minute").setDesc("Your speaking speed, for “≈ min spoken” and the preaching dial.").addText((t) => t.setValue(String(C.spokenWpm)).onChange((v) => {
      const n2 = Number(v);
      if (n2 > 0) {
        C.spokenWpm = n2;
        changed();
      }
    }));
    new import_obsidian9.Setting(containerEl).setName("Folders and notes").setHeading();
    text("Sermons folder", "Notes with type: sermon.", "sermonFolder");
    text("Sermon archive", "Opened by “Sermon archive →”.", "sermonArchive");
    text("Projects folder", "Each project's Home.md has document_type: project-dashboard.", "projectsFolder");
    text("Projects index", "Opened by “All projects →”.", "projectsIndex");
    text("Daily notes folder", "Tasks live under ## Tasks in these notes.", "dailyFolder");
    text("Daily note template", "Used when a daily note doesn't exist yet (Templater).", "dailyTemplate");
    text("Attachments folder", "Church photos, named after the church.", "attachments");
    text("Bible folder", "For the books in Stats.", "bibleFolder");
    text("Roster folder", "The Church Roster plugin's exports.", "rosterFolder");
    new import_obsidian9.Setting(containerEl).setName("Roster churches").setDesc("Roster notes are grouped by these churches, in this order (separated by commas).").addText((t) => t.setValue(C.rosterChurches.join(", ")).onChange((v) => {
      C.rosterChurches = list(v);
      changed();
    }));
    new import_obsidian9.Setting(containerEl).setName("Home note").setDesc("The note your name in the top bar opens.").addText((t) => t.setPlaceholder("Homepage").setValue(plugin.settings.homeNote).onChange((v) => {
      plugin.settings.homeNote = v.trim() || "Homepage";
      changed();
    }));
    new import_obsidian9.Setting(containerEl).setName("New notes").setHeading();
    for (const [kind, label] of [["sermon", "New sermon"], ["note", "New note"], ["project", "New project"]]) {
      const t = C.templates[kind];
      new import_obsidian9.Setting(containerEl).setName(label).setDesc("Template, folder, and the new note's name (empty: Templater's default).").addText((x) => x.setPlaceholder("Template").setValue(t[0]).onChange((v) => {
        t[0] = v.trim();
        changed();
      })).addText((x) => x.setPlaceholder("Folder").setValue(t[1]).onChange((v) => {
        t[1] = v.trim();
        changed();
      })).addText((x) => x.setPlaceholder("Name").setValue(t[2] ?? "").onChange((v) => {
        if (v.trim()) t[2] = v.trim();
        else t.length = 2;
        changed();
      }));
    }
    new import_obsidian9.Setting(containerEl).setName("Top bar").setHeading();
    new import_obsidian9.Setting(containerEl).setName("Links").setDesc("One per line: note | label.").addTextArea((t) => {
      t.setValue(pairsToText(C.nav)).onChange((v) => {
        C.nav = textToPairs(v);
        changed();
      });
      t.inputEl.rows = 6;
      t.inputEl.cols = 40;
    });
    new import_obsidian9.Setting(containerEl).setName("Themes").setHeading();
    containerEl.createEl("p", { cls: "setting-item-description", text: "A theme changes how the modules look. Each homepage note keeps its own in its home_theme property; the palette button in the top bar changes it." });
    new import_obsidian9.Setting(containerEl).setName("Default theme").setDesc("For a homepage note without a home_theme property.").addDropdown((d) => {
      for (const t of plugin.themes) d.addOption(t.id, t.name);
      d.setValue(plugin.settings.defaultTheme).onChange((v) => {
        plugin.settings.defaultTheme = v;
        changed();
      });
    });
    new import_obsidian9.Setting(containerEl).setName("Module titles").setDesc("Show each module's title above its card. Off: every module is just its card. Buttons stay inside the cards either way.").addToggle((tg) => tg.setValue(plugin.settings.showTitles).onChange((on) => {
      plugin.settings.showTitles = on;
      changed();
    }));
    new import_obsidian9.Setting(containerEl).setName("Layouts").setHeading();
    containerEl.createEl("p", { cls: "setting-item-description", text: "Which modules show, where and how wide. Any layout works with any theme. Arrange a layout from the layout button in the homepage's top bar." });
    const L = plugin.layouts;
    new import_obsidian9.Setting(containerEl).setName("Default layout").setDesc("For a homepage note that hasn't picked a layout.").addDropdown((d) => {
      for (const l2 of L.list) d.addOption(l2.id, l2.name);
      d.setValue(L.defaultId).onChange(async (v) => {
        await plugin.setDefaultLayout(v);
        this.display();
      });
    });
    for (const l2 of L.list) {
      const count = l2.items.length;
      let typed = l2.name;
      new import_obsidian9.Setting(containerEl).setName(l2.name).setDesc(count + (count === 1 ? " module" : " modules") + (l2.id === L.defaultId ? " · default" : "")).addText((t) => {
        t.setValue(l2.name).setPlaceholder("Name").onChange((v) => {
          typed = v;
        });
        const commit = async () => {
          if (typed.trim() && typed.trim() !== l2.name) {
            await plugin.renameLayout(l2.id, typed);
            this.display();
          }
        };
        t.inputEl.addEventListener("blur", commit);
        t.inputEl.addEventListener("keydown", (e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            t.inputEl.blur();
          }
        });
      }).addExtraButton((x) => x.setIcon("copy").setTooltip("Duplicate").onClick(async () => {
        await plugin.createLayout(l2.name + " copy", l2.items);
        this.display();
      })).addExtraButton((x) => x.setIcon("trash-2").setTooltip(L.list.length < 2 ? "Your only layout can't be deleted" : "Delete").setDisabled(L.list.length < 2).onClick(async () => {
        if (!await askConfirm(this.app, "Delete “" + l2.name + "”?", "Homepages showing it switch to the default layout. This can't be undone.", "Delete")) return;
        await plugin.deleteLayout(l2.id);
        new import_obsidian9.Notice("Layout “" + l2.name + "” deleted");
        this.display();
      }));
    }
    new import_obsidian9.Setting(containerEl).addButton((b) => b.setButtonText("New layout").onClick(async () => {
      const name = await askName(this.app, "New layout", "", "Create");
      if (!name) return;
      await plugin.createLayout(name, []);
      new import_obsidian9.Notice("Layout “" + name + "” made: pick it in a homepage's layout menu, then Arrange it");
      this.display();
    }));
    new import_obsidian9.Setting(containerEl).setName("Modules").setHeading();
    containerEl.createEl("p", { cls: "setting-item-description", text: "A module that is off is left out of every page and of Arrange → Add module." });
    for (const [id, def20] of MODULES) {
      new import_obsidian9.Setting(containerEl).setName(def20.name).setDesc(def20.about || "").addToggle((tg) => tg.setValue(!plugin.settings.hiddenModules.includes(id)).onChange((on) => {
        const hidden = new Set(plugin.settings.hiddenModules);
        if (on) hidden.delete(id);
        else hidden.add(id);
        plugin.settings.hiddenModules = [...hidden];
        changed();
      }));
    }
  }
};

