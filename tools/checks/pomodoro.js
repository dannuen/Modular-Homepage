// node pomodoro.js <main.js>: checks that a synced pomodoro.json is read again (but not over a change made here) and that a tab logs a paused focus. Exit 1 on a failure.
const path = require("path");
const { renderHomepage, launch } = require(path.resolve(__dirname, "../harness/render.js"));
// Runs in the page. "Today" is 2026-10-14 10:00; the fixture's timer is idle at the start of a focus.
const action = `
const expect = (what, got, want) => {
  if (got !== want) throw new Error(what + "\\n  got:  " + got + "\\n  want: " + want);
};
const file = ".obsidian/plugins/modular-homepage/pomodoro.json", day = "Daily Notes/2026/10-October/2026-10-14.md";
const status = () => H.$(".m-pomo-status", H.slot("pomodoro")).textContent;
// Another device paused a focus 13 minutes in, and a sync brought its pomodoro.json here.
const data = JSON.parse(await H.app.vault.adapter.read(file)), start = Date.now() - 13 * 6e4;
data.timer = { ...data.timer, status: "paused", left: 12 * 6e4, total: 25 * 6e4 };
data.session = { id: "pomo-check", name: "Check", day: "2026-10-14", start, end: start, cycles: 0, focusMs: 0 };
await H.app.vault.adapter.write(file, JSON.stringify(data, null, "\\t"));
expect("status before the window comes back", status(), "Ready: focus");
window.dispatchEvent(new Event("focus"));
await H.settleAfterAction();
expect("status after the window comes back", status(), "Paused");
// Leaving the paused focus by a tab counts the minutes it ran, as Skip and End do.
H.click(H.$$(".m-pomo-tab", H.slot("pomodoro")).find((b) => b.dataset.phase === "short"));
await H.settleAfterAction();
expect("focus log line", H.text(day).split("\\n").find((l) => l.endsWith("^pomo-check")), "- **Check** · 0 chu kỳ · 13m · 09:47–10:00 ^pomo-check");
// A preset picked here wins over a synced file, even when its save starts while a slow read of that file is under way.
const ad = H.app.vault.adapter, read = ad.read;
H.app.vault.adapterFiles.set(file, JSON.stringify({ ...JSON.parse(await read(file)), presetId: "deep" }));
ad.read = async (p) => { const v = await read(p); await H.sleep(800); return v; };
H.click(H.$$(".m-pomo-presets .m-pomo-chip", H.slot("pomodoro")).find((b) => b.textContent === "Quick"));
window.dispatchEvent(new Event("focus"));
await H.sleep(1200);
ad.read = read;
expect("preset after a slow read", H.$(".m-pomo-presets .is-on", H.slot("pomodoro")).textContent + " / " + JSON.parse(await read(file)).presetId, "Quick / quick");
`;
(async () => {
  const browser = await launch();
  const rep = await renderHomepage(browser, {
    main: path.resolve(process.argv[2]),
    theme: "aurora",
    layout: [{ module: "pomodoro", w: 12 }],
    action,
    out: path.join(require("os").tmpdir(), "hp-pomodoro.png"),
    quiet: true
  });
  await browser.close();
  const a = rep.actions && rep.actions[0];
  console.log(a && a.ok ? "pomodoro: ok" : "pomodoro: FAILED\n" + (a ? a.error : "the page did not boot"));
  process.exitCode = a && a.ok && rep.ok ? 0 : 1;
})();
