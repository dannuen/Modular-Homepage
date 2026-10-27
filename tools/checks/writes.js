// node writes.js <main.js>: checks what the homepage writes to notes and data.json (writes-action.js). Exit 1 on a failure.
const path = require("path"), fs = require("fs");
const H = path.resolve(__dirname, "../harness");
const { renderHomepage, launch } = require(path.join(H, "render.js"));
(async () => {
  const browser = await launch();
  const rep = await renderHomepage(browser, {
    main: path.resolve(process.argv[2]),
    theme: "aurora",
    layout: [{ module: "tasks", w: 12 }, { module: "next-actions", w: 12 }],
    action: fs.readFileSync(path.join(__dirname, "writes-action.js"), "utf8"),
    out: path.join(require("os").tmpdir(), "hp-writes.png"),
    quiet: true
  });
  await browser.close();
  const a = rep.actions && rep.actions[0];
  console.log(a && a.ok ? "writes: ok" : "writes: FAILED\n" + (a ? a.error : "the page did not boot"));
  process.exitCode = a && a.ok && rep.ok ? 0 : 1;
})();
