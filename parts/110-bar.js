// src/bar.ts
var BarBlock = class extends import_obsidian3.MarkdownRenderChild {
  constructor(plugin, containerEl, sourcePath) {
    super(containerEl);
    this.plugin = plugin;
    this.sourcePath = sourcePath;
  }
  releaseStyles = null;
  life = null;
  onload() {
    this.plugin.bars.add(this);
    this.releaseStyles = this.plugin.useStyles(this.containerEl.ownerDocument);
    this.containerEl.style.overflowX = "auto";
    this.redraw();
  }
  onunload() {
    this.plugin.bars.delete(this);
    this.releaseStyles?.();
    this.life?.unload();
    this.life = null;
  }
  redraw() {
    this.life?.unload();
    const life = this.life = new import_obsidian3.Component();
    life.load();
    this.containerEl.empty();
    const { app } = this.plugin;
    try {
      renderTopbar({
        app,
        config: this.plugin.config,
        container: this.containerEl,
        sourcePath: this.sourcePath,
        homeNote: this.plugin.settings.homeNote,
        render: (parent, md, cls) => {
          const node = this.containerEl.ownerDocument.createElement("span");
          node.classList.add(...String(cls || "").split(/\s+/).filter(Boolean));
          renderValue(app, md, node, this.sourcePath, life).catch((err) => console.error("Modular Homepage: could not draw a link", err));
          parent?.append(node);
          return node;
        }
      }, {});
    } catch (err) {
      console.error("Modular Homepage: could not draw the top bar", err);
      this.containerEl.createEl("pre", { text: "Modular Homepage: the top bar could not be drawn.\n" + err });
    }
  }
};

