// node dates.js <main.js>: checks the Linter's date_created format, time words and word counts in decomposed (NFD) text,
// reading a modern CSS colour, and the preaching dial on a preaching day. Exit 1 on a failure.
const path = require("path");
const { renderHomepage, launch } = require(path.resolve(__dirname, "../harness/render.js"));
// Runs in the page. The fixture's Christmas sermon preaches on 2026-12-25 with time "sáng" (morning).
const action = `
const expect = (what, got, want) => {
  if (got !== want) throw new Error(what + "\\n  got:  " + got + "\\n  want: " + want);
};
const core = [...H.plugin.blocks][0].draw.core;
expect("Linter date_created", core.time.toDate("2026-10-02 09:00 AM")?.toISODate(), "2026-10-02");
expect("NFD period word", core.time.parseTime("buổi chiều".normalize("NFD"))?.period, "afternoon");
expect("NFD word count", core.data.countWords("Ánh sáng ✝️ đến thế gian".normalize("NFD")), 5);
expect("isDark of a near-white oklch()", core.data.isDark("oklch(0.95 0.02 90)"), false);
const dial = () => H.slot("preaching-dial");
const centre = () => [...H.$(".m-dial-center", dial()).children].map((c) => c.textContent).join(" | ");
expect("dial centre before a morning sermon", centre(), "Next | Morning | in 30 min");
expect("dial label for a morning sermon", H.$$(".m-dial-at", dial()).map((t) => t.textContent).join(), "Morning");
const sermon = (from, to) => H.app.vault.process(H.file("Spaces/Sermons/⭐ Ánh Sáng Đến Thế Gian.md"), (t) => t.replace("\\n  - " + from + "\\n", to));
await sermon("sáng", "\\n  - chiều\\n");
await H.settleAfterAction();
const width = (sel) => H.$(sel, dial()).getBoundingClientRect().width;
if (width(".m-dial-big") > width(".m-dial-center")) throw new Error("Afternoon is wider than the dial centre");
await sermon("chiều", "\\n");
await H.settleAfterAction();
expect("dial centre before a sermon with no time", centre(), "Today | — | any time");
// Roster dates: a heading's year with the file's quarter, a list date with a note, a dotted time as a service name.
const roster = (text, file) => new Map(H.plugin.modules).get("roster").parse(text, file, "2026-10-27").map((e) => e.date + " " + e.service + " " + e.roles.length).join(", ");
const table = (day) => "| Ngày | Giảng |\\n|---|---|\\n| " + day + " | A |\\n";
expect("Q1 2027 file, ## Tháng 12 - 2026", roster("## Tháng 12 - 2026\\n" + table("27/12") + "## Tháng 1 - 2027\\n" + table("03/01"), "Lịch HDCT Quý 1 - 2027"), "2026-12-27  1, 2027-01-03  1");
expect("Q4 2026 file, ## Tháng 1 - 2027", roster("## Tháng 1 - 2027\\n" + table("03/01"), "Lịch HDCT Quý 4 - 2026"), "2027-01-03  1");
expect("Q1 2027 file, ## Lịch năm 2027", roster("## Lịch năm 2027\\n" + table("27/12"), "Lịch HDCT Quý 1 - 2027"), "2026-12-27  1");
expect("list date with a note", roster("- **01/11**\\n  - Giảng: A\\n- **08/11** (Tiệc thánh)\\n  - Giảng: B\\n", "Lịch Quý 4 - 2026"), "2026-11-01  1, 2026-11-08  1");
expect("dotted times as services", roster("## 01/11\\n### 8.30 Lễ sáng\\n- Giảng: A\\n### 10.30 Lễ trưa\\n- Giảng: B\\n", "Lịch Quý 4 - 2026"), "2026-11-01 8.30 Lễ sáng 1, 2026-11-01 10.30 Lễ trưa 1");
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
