// node dates.js <main.js>: checks the Linter's date_created format and the preaching dial on a preaching day. Exit 1 on a failure.
const path = require("path");
const { renderHomepage, launch } = require(path.resolve(__dirname, "../harness/render.js"));
// Runs in the page. The fixture's Christmas sermon preaches on 2026-12-25 with time "sáng" (morning).
const action = `
const expect = (what, got, want) => {
  if (got !== want) throw new Error(what + "\\n  got:  " + got + "\\n  want: " + want);
};
expect("Linter date_created", [...H.plugin.blocks][0].draw.core.time.toDate("2026-10-02 09:00 AM")?.toISODate(), "2026-10-02");
const dial = () => H.slot("preaching-dial");
const centre = () => [...H.$(".m-dial-center", dial()).children].map((c) => c.textContent).join(" | ");
expect("dial centre before a morning sermon", centre(), "Next | Morning | in 30 min");
expect("dial label for a morning sermon", H.$$(".m-dial-at", dial()).map((t) => t.textContent).join(), "Morning");
await H.app.vault.process(H.file("Spaces/Sermons/⭐ Ánh Sáng Đến Thế Gian.md"), (t) => t.replace("\\n  - sáng\\n", "\\n"));
await H.settleAfterAction();
expect("dial centre before a sermon with no time", centre(), "Today | — | any time");
`;
(async () => {
  const browser = await launch();
  const rep = await renderHomepage(browser, {
    main: path.resolve(process.argv[2]),
    theme: "aurora",
    now: "2026-12-25T07:30:00+07:00",
    layout: [{ module: "preaching-dial", w: 12 }],
    action,
    out: path.join(require("os").tmpdir(), "hp-dates.png"),
    quiet: true
  });
  await browser.close();
  const a = rep.actions && rep.actions[0];
  console.log(a && a.ok ? "dates: ok" : "dates: FAILED\n" + (a ? a.error : "the page did not boot"));
  process.exitCode = a && a.ok && rep.ok ? 0 : 1;
})();
