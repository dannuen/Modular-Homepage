// node dates.js <main.js>: checks the Linter's date_created format, time words and word counts in decomposed (NFD) text,
// reading a modern CSS colour, the preaching dial on a preaching day, unquoted times, durations, the roster and countdown
// parsers, and Stats' Bible books. Exit 1 on a failure.
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
expect("## LỄ 1 table with bold dates", roster("## LỄ 1\\n" + table("**27/12**") + "| **03/01** | B |\\n", "Lịch HDCT Quý 1 - 2027"), "2026-12-27 LỄ 1 1, 2027-01-03 LỄ 1 1");
// Countdown lines: the name before the tag, else after it, else the date; nothing without the exact tag and a date link.
const countdown = new Map(H.plugin.modules).get("countdown").lineOf;
expect("countdown lines", ["Christmas #countdown [[2026-12-24]]", "#countdown Easter [[2027-03-28|Easter Sunday]]", "#countdown [[Daily/2027-01-01]]", "Christmas #countdowns [[2026-12-24]]", "Christmas [[2026-12-24]]"].map((l) => JSON.stringify(countdown(l))).join(" "),
  '{"name":"Christmas","iso":"2026-12-24"} {"name":"Easter","iso":"2027-03-28"} {"name":"2027-01-01","iso":"2027-01-01"} null null');
// An unquoted time reaches parseTime as a number: 9 and 19.30 (19.3) are hours, 1170 (YAML's 19:30) is minutes.
expect("unquoted times", [9, 19.3, 9.05, 1170, 24.5].map((v) => core.time.parseTime(v)?.clock ?? "-").join(), "09:00,19:30,09:05,19:30,-");
expect("7pm, a range and a linked date", [core.time.parseTime("7pm")?.clock, core.time.parseTime("9 - 11")?.endClock, core.time.toDate("[[2026-10-18]]")?.toISODate()].join(), "19:00,11:00,2026-10-18");
// Durations in frontmatter. A long value that is not one comes back at once: the old regex could split each separator
// several ways and tried every split, so 13 "N thousand" pairs already take it a tenth of a second, 16 take seconds and
// 20 take minutes: 16 here, so the old regex fails this check instead of hanging it.
const OLD_DURATION = /^\\s*(?:\\d+(?:\\.\\d+)?\\s*[a-z]+(?:\\s*,?\\s*(?:and\\s+)?|\\s*$))+$/i;
const pairs = (n, sep) => Array.from({ length: n }, (_, i) => i + 1 + " thousand").join(sep) + " !";
const ms = (fn) => {
  const t = performance.now();
  fn();
  return performance.now() - t;
};
const fm = { a: "1h 30m", b: "1 hour, 30 minutes", c: "2 hours and 15 minutes", d: "1.5h", e: "45 min", f: "1 John", g: "3 thousand", h: pairs(16, " "), i: pairs(16, " , and  ") };
await H.app.vault.create("Durations.md", "");
H.app.metadataCache.byPath.set("Durations.md", { frontmatter: fm });
let dur;
const fast = ms(() => (dur = H.plugin.vault.page("Durations.md")));
expect("durations", Object.keys(fm).map((k) => (dur[k] === fm[k] ? "text" : dur[k].as("minutes"))).join(), "90,90,135,90,45,text,text,text,text");
const slow = ms(() => OLD_DURATION.test(pairs(13, " ")));
if (!(fast < 50 && slow > 20)) throw new Error("duration regex: " + fast.toFixed(1) + " ms for 32 pairs (want < 50), the old regex " + slow.toFixed(1) + " ms for 13 (want > 20)");
// Stats' books: the chapter is cut from plain text (with or without a space) or an unresolved link's alias, but not a
// numbered book's own number.
H.plugin.settings.config.sermonFolder = "Books";
for (const [name, bible] of [["a", "1 Cô-rinh-tô 13:4"], ["b", "[[2ti-3#16|2 Ti-mô-thê 3:16]]"], ["c", "Giăng 3:16"], ["d", "Giăng3:16"]]) await H.app.vault.create("Books/" + name + ".md", "---\\ntype: sermon\\nbible: \\"" + bible + "\\"\\n---\\n");
H.plugin.redrawAll();
await H.settle();
H.click(H.$(".m-stats-more-btn", H.slot("stats")));
const books = H.$$(".m-stats-tile", H.slot("stats")).find((t) => t.textContent.includes("Books you preach from"));
expect("Stats books", H.$$(".m-stats-bar > span:first-child", books).map((s) => s.textContent).sort().join(), "1 Cô-rinh-tô,2 Ti-mô-thê,Giăng");
`;
(async () => {
  const browser = await launch();
  const rep = await renderHomepage(browser, {
    main: path.resolve(process.argv[2]),
    theme: "aurora",
    now: "2026-12-25T07:30:00+07:00",
    layout: [{ module: "preaching-dial", w: 12 }, { module: "stats", w: 12 }],
    action,
    out: path.join(require("os").tmpdir(), "hp-dates.png"),
    quiet: true
  });
  await browser.close();
  const a = rep.actions && rep.actions[0];
  console.log(a && a.ok ? "dates: ok" : "dates: FAILED\n" + (a ? a.error : "the page did not boot"));
  process.exitCode = a && a.ok && rep.ok ? 0 : 1;
})();
