// node host.js <main.js>: checks how the page follows changes: a root folder, an open ⚙ panel, a theme pick, Arrange
// in a second view of the same note, and a rename of the note. Exit 1 on a failure.
const path = require("path");
const { renderHomepage, launch } = require(path.resolve(__dirname, "../harness/render.js"));
// Runs in the page.
const action = `
const expect = (what, got, want) => {
  if (got !== want) throw new Error(what + "\\n  got:  " + got + "\\n  want: " + want);
};
const block = [...H.plugin.blocks][0];

// A root sermons folder ("" or "/") is the whole vault, so a sermon edit still redraws the modules that read it.
const watch = H.plugin.modules.find(([id]) => id === "coming-up")[1].watch;
for (const f of ["", "/", "Spaces/Sermons/"]) expect("coming-up watches " + JSON.stringify(f), watch(["Spaces/Sermons/x.md"], { config: { sermonFolder: f } }), true);
expect("coming-up watches another folder", watch(["Notes/x.md"], { config: { sermonFolder: "Spaces/Sermons" } }), false);

// An open ⚙ panel survives a note change that redraws its module, and the module catches up when the panel closes.
const activeSermons = () => H.$$(".m-banner-stat", H.slot("banner")).find((x) => x.textContent.includes("active sermons"))?.textContent;
const activeBefore = activeSermons();
H.click(H.$(".m-banner-gear", H.slot("banner")));
const panel = H.$(".hp-set", H.slot("banner"));
await H.app.vault.process(H.file("Spaces/Sermons/⭐ Ánh Sáng Đến Thế Gian.md"), (t) => t.replace(/is_active:\\s*true/, "is_active: false"));
await H.settleAfterAction();
expect("banner panel open after a sermon edit", panel.isConnected && !panel.hidden, true);
H.click(H.$(".m-banner-gear", H.slot("banner")));
await H.settleAfterAction();
expect("active sermons after the panel closes", activeSermons(), parseInt(activeBefore) - 1 + "active sermons");

// A theme pick draws the page once (after the note's home_theme changes), in the new theme.
let draws = 0;
block.redraw = function () {
  draws++;
  return Object.getPrototypeOf(this).redraw.call(this);
};
H.click(H.$(".hp-tb-icon[aria-label^='Homepage theme']"));
H.click(H.$$(".hp-hs-item").find((b) => b.textContent.startsWith("Prism")));
await H.settleAfterAction();
delete block.redraw;
expect("draws after a theme pick", draws, 1);
expect("theme after a theme pick", H.$(".hp-home").dataset.theme, "prism");

// Arrange in one view of the note shows in the other, and Done there saves the draft, not its old page.
const first = H.$(".block-language-modular-homepage");
const second = H.$(".markdown-preview-sizer").createDiv("block-language-modular-homepage");
await H.codeBlockProcessors["modular-homepage"]("", second, { docId: "harness-2", sourcePath: H.homePath, addChild: (c) => H.viewComponent.addChild(c) });
await H.settle();
const modules = (view) => H.$$(".hp-slot", view).map((s) => s.dataset.module).join();
H.click(H.$(".hp-tb-icon[aria-label^='Layout']", first));
H.click(H.$$(".hp-hs-item", first).find((b) => b.textContent.startsWith("Arrange")));
H.click(H.$(".hp-slot[data-module='coming-up'] .hp-hide", first));
await H.settle();
expect("second view while the first arranges", !!H.$(".hp-home.is-arranging", second) && modules(second), "banner");
H.click(H.$(".hp-tb-icon[aria-label^='Done']", second));
await H.settle();
expect("saved layout after Done in the second view", H.plugin.layoutFor(H.homePath).items.map((i) => i.module).join(), "banner");
expect("views arranging after Done", H.$$(".hp-home.is-arranging").length, 0);

// A renamed or moved homepage note keeps its picked layout, and its open views follow it, still arranging.
const picked = (await H.plugin.createLayout("Picked", [{ module: "coming-up", w: 12 }])).id;
await H.plugin.chooseLayout(H.homePath, picked);
await H.settle();
H.click(H.$(".hp-tb-icon[aria-label^='Layout']", first));
H.click(H.$$(".hp-hs-item", first).find((b) => b.textContent.startsWith("Arrange")));
await H.settle();
const moved = await H.app.vault.rename(H.file(H.homePath), "Moved/Home.md");
H.app.vault.trigger("rename", moved, H.homePath); // the harness's rename only deletes and creates
await H.settleAfterAction();
expect("chosen layouts in data.json after a rename", JSON.stringify(H.data.layouts.chosen), JSON.stringify({ "Moved/Home.md": picked }));
expect("views after a rename", [...H.plugin.blocks].map((b) => b.sourcePath + " " + b.layoutId).join(), "Moved/Home.md " + picked + ",Moved/Home.md " + picked);
expect("views arranging after a rename", H.$$(".hp-home.is-arranging").length, 2);
`;
(async () => {
  const browser = await launch();
  const rep = await renderHomepage(browser, {
    main: path.resolve(process.argv[2]),
    theme: "aurora",
    layout: [{ module: "banner", w: 12, variant: "hero" }, { module: "coming-up", w: 12 }],
    action,
    out: path.join(require("os").tmpdir(), "hp-host.png"),
    quiet: true
  });
  await browser.close();
  const a = rep.actions && rep.actions[0];
  console.log(a && a.ok ? "host: ok" : "host: FAILED\n" + (a ? a.error : "the page did not boot"));
  process.exitCode = a && a.ok && rep.ok ? 0 : 1;
})();
