// node geom.js <main.js> <out.json> [themes] — tool-row and card geometry for every theme × mode × layout.
const path = require("path"), fs = require("fs");
const H = path.resolve(__dirname, "../harness");
const { renderHomepage, launch, THEMES } = require(path.join(H, "render.js"));
(async () => {
  const [main, outFile, th] = process.argv.slice(2);
  const themes = th ? th.split(",") : THEMES;
  const layouts = fs.readdirSync(path.join(H, "layouts")).filter((f) => /^(all|dan)-/.test(f)).map((f) => path.join(H, "layouts", f));
  const action = fs.readFileSync(path.join(__dirname, "geom-action.js"), "utf8");
  const browser = await launch();
  const jobs = [];
  for (const theme of themes) for (const dark of [false, true]) for (const width of [1230, 420]) for (const layout of layouts) jobs.push({ theme, dark, width, layout });
  const results = [];
  let i = 0;
  async function worker() {
    while (i < jobs.length) {
      const j = jobs[i++];
      const rep = await renderHomepage(browser, { main: path.resolve(main), theme: j.theme, dark: j.dark, width: j.width, layout: j.layout, action, quiet: true, out: path.join(__dirname, "tmp", j.theme + (j.dark ? "-dark" : "-light") + "-" + j.width + "-" + path.basename(j.layout, ".json") + ".png") });
      const a = rep.actions && rep.actions[0];
      results.push({ ...j, layout: path.basename(j.layout, ".json"), ok: rep.ok, sideways: rep.scrolls_sideways, errors: (rep.console_errors || 0) + (rep.page_errors || []).length, slots: a && a.ok ? JSON.parse(a.value) : { error: a && a.error } });
      process.stdout.write(".");
    }
  }
  fs.mkdirSync(path.join(__dirname, "tmp"), { recursive: true });
  await Promise.all([worker(), worker(), worker(), worker()]);
  await browser.close();
  fs.writeFileSync(outFile, JSON.stringify(results));
  console.log("\n" + results.length + " renders");
})();
