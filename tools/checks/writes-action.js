// Runs in the page: what the homepage writes to notes and data.json. Throws on the first wrong result.
const day = "Daily Notes/2026/10-October/2026-10-14.md"; // "today" in the harness
const expect = (what, got, want) => {
  if (got !== want) throw new Error(what + "\n  got:  " + got + "\n  want: " + want);
};
const saves = () => H.log.writes.filter((w) => w.op === "saveData").length;
const line = () => H.text(day).split("\n").find((l) => l.includes("Gọi anh Phúc"));
const press = async (view, key, words = "Gọi anh Phúc", sel = ".hp-tk-blk") => {
  const b = [...view.querySelectorAll(sel)].find((x) => x.textContent.includes(words));
  if (!b) throw new Error("No " + sel + " for " + words);
  b.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  await H.settleAfterAction();
};

// The task line reader and writers on real lines: a move or a save that changes nothing gives the line back, and a new
// line lands at the end of its section's list, before any sub-heading, where the reader files it.
const L = new Map(H.plugin.modules).get("tasks").lines, withEntry = new Map(H.plugin.modules).get("pomodoro").withEntry;
const draftOf = (line) => {
  const p = L.parseTask(line.replace(/^[\s>]*(?:\d+[.)]|[-*+])\s+(?:\[.\]\s*)?/u, "")), iso = (d) => d?.toISODate() ?? null;
  return { kind: /^[\s>]*(?:\d+[.)]|[-*+])\s+\[.\]/u.test(line) ? "todo" : "event", text: p.text, due: iso(p.due), start: iso(p.start), sched: iso(p.sched), at: p.at, minutes: p.minutes, tags: p.tags };
};
const canonical = ["- [ ] Write intro #sermon 📅 2026-10-18", "- Elders meeting [time:: 19:00] [duration:: 1h] 📅 2026-10-20", "- [x] Gọi nhà in ⏫ ⏳ 2026-10-13 📅 2026-10-15 ✅ 2026-10-14 ^in-1", "  - [ ] Soạn dàn ý [duration:: 1h 30m] 🛫 2026-10-12", "> 1. [ ] Đọc Rô-ma 8 #kinh-thanh"];
for (const l of [...canonical, "- [ ] Gọi anh Phúc ☎️ #📬 về [[Sách|Tập #2]]  [time:: 09:00] [duration:: 30m] ⏳ 2026-10-14 📅 2026-10-30"]) expect("a move that changes nothing", L.moved(l, draftOf(l), draftOf(l)), l);
for (const l of canonical) expect("a save that changes nothing", L.rebuilt(l, draftOf(l), draftOf(l).text).line, l);
const done = canonical[2], add = (data) => L.intoSection(data, "## Tasks", ["- [ ] New"]);
const entry = { name: "B", cycles: 1, focusMs: 25 * 6e4, start: Date.now() - 25 * 6e4, end: Date.now(), id: "pomo-b" }, log = withEntry("", entry).split("\n")[2];
for (const [what, got, want] of [
  ["toggled done", L.toggled(canonical[0], true), canonical[0].replace("[ ]", "[x]") + " ✅ 2026-10-14"],
  ["toggled open and done again", L.toggled(L.toggled(done, false), true), done],
  ["findLine of a line that moved", L.findLine(["- [ ] A", "- [ ] B"], { raw: "B", line: 0, kind: "todo" }), 1],
  ["findLine of a line written twice", L.findLine(["- [ ] A", "- [ ] B", "- [ ] A"], { raw: "A", line: 3, kind: "todo" }), -1],
  ["blockEnd takes the indented lines", L.blockEnd(["- [ ] A", "  - [ ] a1", "    more", "- [ ] B"], 0), 3],
  ["new task in an empty note", add(""), "## Tasks\n\n- [ ] New\n"],
  ["new task in a note without Tasks", add("# Day\n\nText\n"), "# Day\n\nText\n\n## Tasks\n\n- [ ] New\n"],
  ["new task with a ### Done in Tasks", add("## Tasks\n- [ ] A\n  more on A\n### Done\n- [x] B\n"), "## Tasks\n- [ ] A\n  more on A\n- [ ] New\n### Done\n- [x] B\n"],
  ["new task under ## Tasks:", add("## Tasks:\n\n- [ ] A\n"), "## Tasks:\n\n- [ ] A\n- [ ] New\n"],
  ["new task after a fenced ## Tasks", add("```\n## Tasks\n```\n\n## Tasks\n- [ ] A\n"), "```\n## Tasks\n```\n\n## Tasks\n- [ ] A\n- [ ] New\n"],
  ["new task in a CRLF note", add("## Tasks\r\n- [ ] A\r\n"), "## Tasks\r\n- [ ] A\r\n- [ ] New\r\n"],
  ["focus log in an empty note", withEntry("", entry), "# Focus\n\n" + log + "\n"],
  ["focus log replaces its own line", withEntry("# Focus\n\n- **B** ^pomo-b\n", entry), "# Focus\n\n" + log + "\n"],
  ["focus log after an entry's indented note", withEntry("# Focus\n- **A** ^pomo-a\n    note on A\n## Next\n", entry), "# Focus\n- **A** ^pomo-a\n    note on A\n" + log + "\n## Next\n"],
  ["focus log with a sub-heading after # Focus", withEntry("# Focus\n\n### Notes\ntext\n", entry), "# Focus\n\n" + log + "\n\n### Notes\ntext\n"],
  ["focus log with only a fenced ## Focus", withEntry("```\n## Focus\n```\n", entry), "```\n## Focus\n```\n\n# Focus\n\n" + log + "\n"],
  ["focus log in a CRLF note", withEntry("# Focus\r\n- **A** ^pomo-a\r\n", entry), "# Focus\r\n- **A** ^pomo-a\r\n" + log + "\r\n"]
]) expect(what, got, want);

// A missing data.json (not synced yet) is never saved over with the defaults.
const data = H.data, layouts = JSON.stringify(H.plugin.layouts), before = saves();
H.data = null;
await H.plugin.onExternalSettingsChange();
expect("layouts after a sync with no data.json", JSON.stringify(H.plugin.layouts), layouts);
await H.plugin.loadAll();
expect("saveData calls with no data.json", saves(), before);
H.data = data;
await H.plugin.loadAll();

// Saving a layout keeps a switched-off module at its place, though the page leaves it out.
const id = H.plugin.layoutFor(H.homePath).id;
H.plugin.settings.hiddenModules = ["tasks"];
await H.plugin.saveLayoutItems(id, [{ module: "next-actions", w: 12 }], [...H.plugin.blocks][0]);
expect("layout saved with Tasks switched off", H.plugin.layoutById(id).items.map((i) => i.module).join(), "tasks,next-actions");
H.data = data;
await H.plugin.loadAll();

// A move changes only the time and date in the line; tags, emoji and links stay as written.
const task = "- [ ] Gọi anh Phúc ☎️ #📬 về [[Sách|Tập #2]]  [time:: 09:00] [duration:: 30m] ⏳ 2026-10-14 📅 2026-10-30";
await H.app.vault.process(H.file(day), (t) => t.replace("## Tasks\n", "## Tasks\n" + task + "\n"));
H.click(H.$$("button", H.slot("tasks")).find((b) => b.textContent === "Week"));
await H.settleAfterAction();
const first = H.$(".block-language-modular-homepage");
await press(first, "ArrowDown");
expect("line after ArrowDown", line(), task.replace("09:00", "09:15"));

// A second view of the homepage (a split pane or a hover preview) leaves the first one working.
const second = H.$(".markdown-preview-sizer").createDiv("block-language-modular-homepage");
await H.codeBlockProcessors["modular-homepage"]("", second, { docId: "harness-2", sourcePath: H.homePath, addChild: (c) => H.viewComponent.addChild(c) });
await H.settle();
await press(first, "ArrowRight");
expect("line after ArrowRight in the first of two views", line(), task.replace("09:00", "09:15").replace("⏳ 2026-10-14", "⏳ 2026-10-15"));
await press(first, "Delete");
expect("line after Delete (unplan)", line(), "- [ ] Gọi anh Phúc ☎️ #📬 về [[Sách|Tập #2]] [duration:: 30m] 📅 2026-10-30");

// An event that runs past midnight still moves up by key. Enter on a Not planned to-do skips events the tag filter hides.
await H.app.vault.process(H.file(day), (t) => t.replace("## Tasks\n", "## Tasks\n- Gặp ban nhạc [time:: 10:00] [duration:: 1h] 📅 2026-10-14\n- Trực đêm [time:: 23:00] [duration:: 2h] 📅 2026-10-14\n"));
await H.settleAfterAction();
await press(first, "ArrowUp", "Trực đêm");
expect("late event after ArrowUp", H.text(day).split("\n").find((l) => l.includes("Trực đêm")), "- Trực đêm [time:: 22:45] [duration:: 2h] 📅 2026-10-14");
const tagPick = H.$(".hp-tk-tagsel", first); // more than 3 tags: the filter is a select
tagPick.value = "📬";
tagPick.dispatchEvent(new Event("change"));
await H.settleAfterAction();
await press(first, "Enter", "Gọi anh Phúc", ".hp-tk-tray-item");
expect("time planned by Enter with #📬 on (10:00 is taken)", line().match(/\[time:: ([^\]]*)\]/u)?.[1], "11:00");

// A next action from a project without Tasks.md links to the note it is in, so a click can't create an empty Tasks.md.
// A [[link]] in the task's text shows as its text, so it can't close the row's link early.
const folder = "Projects/Sửa Mái Nhà Thờ";
await H.app.vault.delete(H.file(folder + "/Tasks.md"));
await H.app.vault.create(folder + "/Meetings/Họp thêm.md", "# Họp thêm\n\n- [ ] Gọi [[Nhà thầu|nhà thầu]] xác nhận 📅 2026-10-15\n");
await H.settleAfterAction();
const link = H.$$("a.internal-link", H.slot("next-actions")).find((a) => a.textContent.includes("Gọi nhà thầu"));
if (!link) throw new Error("Next actions does not show the meeting note's task");
expect("Next actions link", link.getAttribute("data-href").replace(/\.md$/, ""), folder + "/Meetings/Họp thêm");
expect("Next actions link text", link.textContent, "Gọi nhà thầu xác nhận");

// Calendar reads the Tasks section as Tasks does: 🗓 or 📅 with U+FE0F, a to-do under a plain bullet, and a time in words.
// A time range, which Tasks can't place, still shows in Calendar.
await H.app.vault.process(H.file(day), (t) => t.replace("## Tasks\n", "## Tasks\n- Nhóm nhỏ\n  - [ ] Gọi nhà in 🗓 2026-10-21\n- Họp ban chấp sự 📅️ 2026-10-20 [time:: 7:30 tối]\n- Tập hát [time:: 19:00-20:30] 📅 2026-10-21\n"));
await H.settleAfterAction();
const tip = (date, words) => (H.$$(".m-cal-day", H.slot("calendar")).find((b) => b.title.startsWith(date))?.title ?? "").split("\n").find((l) => l.includes(words));
expect("Calendar on 20 Oct", tip("Tuesday 20 Oct", "Họp ban chấp sự"), "● 19:30 · Họp ban chấp sự");
expect("Calendar on 21 Oct", tip("Wednesday 21 Oct", "Gọi nhà in"), "☐ Gọi nhà in");
expect("Calendar's time range", tip("Wednesday 21 Oct", "Tập hát"), "● 19:00–20:30 · Tập hát");

// The top bar's New note uses the Name from Settings → New notes.
const [template, noteFolder] = H.plugin.config.templates.note;
H.plugin.config.templates.note = [template, noteFolder, "Inbox note"];
await H.redraw();
H.click('button[aria-label="New note"]');
await H.settleAfterAction();
if (!H.file(noteFolder + "/Inbox note.md")) throw new Error("New note in the top bar ignored the Name setting");

// The layout name prompt: Enter saves the typed name, Escape keeps the old one, and no prompt is left open.
const draw = () => [...H.plugin.blocks][0].draw;
const layoutId = draw().layout.id, layoutName = () => H.plugin.layoutById(layoutId).name;
const rename = async (key, text) => {
  const asked = draw().renameLayout();
  const input = H.$(".modal-container input");
  if (text !== undefined) {
    input.value = text;
    input.dispatchEvent(new Event("input"));
  }
  (key === "Escape" ? document : input).dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  await asked;
  await H.settleAfterAction();
};
await rename("Enter", "Renamed");
expect("layout name after Enter", layoutName(), "Renamed");
await rename("Escape", "Not saved");
expect("layout name after Escape", layoutName(), "Renamed");
expect("prompts left open", H.$$(".modal-container").length, 0);

// A ⚙ panel's Save overwrites a hand-typed capitalised property instead of adding a second, lower-case one.
await H.app.vault.process(H.file(H.homePath), (t) => t.replace(/^---\n/, "---\nCheck_Key: 10\n"));
await [...H.plugin.blocks][0].draw.core.act.saveProps({ check_key: 40 }, "Check");
expect("home note keys after a save", H.text(H.homePath).match(/^check_key:.*$/gim)?.join(), "Check_Key: 40");
// A sync that redraws the settings tab does not save a layout name still being typed.
const tab = H.settingTabs[0];
document.body.append(tab.containerEl);
tab.display();
const typing = [...tab.containerEl.querySelectorAll("input")].find((i) => i.value === layoutName());
typing.focus();
typing.value = "Half-typed";
typing.dispatchEvent(new Event("input", { bubbles: true }));
const savesBeforeSync = saves();
H.data = JSON.parse(JSON.stringify(H.data));
await H.plugin.onExternalSettingsChange();
await H.settleAfterAction();
expect("layout name after a sync while typing", layoutName(), "Renamed");
expect("saveData calls after a sync while typing", saves(), savesBeforeSync);
tab.containerEl.remove();

// Calendar, the top bar's Today and Tasks find or make a day's note one way (the focus log too: pomodoro.js): "Daily Notes/"
// in Settings is the same folder, and without Templater a missing note is made empty, with its folders.
delete H.app.plugins.plugins["templater-obsidian"];
H.plugin.config.dailyFolder = "Daily Notes/";
await H.redraw();
const opened = () => H.log.opened.at(-1)?.file;
expect("Calendar on today with Daily Notes/", tip("Wednesday 14 Oct", "daily note"), "Wednesday 14 Oct · open daily note");
H.click('button[aria-label="Today\'s note"]');
await H.settleAfterAction();
expect("top bar's Today's note with Daily Notes/", opened(), day);
H.click('button[aria-label="Next month"]');
await H.settleAfterAction();
H.click(H.$$(".m-cal-day", H.slot("calendar")).find((b) => b.title.startsWith("Monday 2 Nov")));
await H.settleAfterAction();
expect("Calendar's new note without Templater", opened() + " | " + H.text(opened()), "Daily Notes/2026/11-November/2026-11-02.md | ");
await H.app.vault.delete(H.file(day));
await H.settleAfterAction();
const input = H.$(".hp-tk-add .hp-tk-input", H.slot("tasks"));
input.value = "Viết thư";
input.dispatchEvent(new Event("input"));
H.click(H.$(".hp-tk-add .hp-tk-go", H.slot("tasks")));
await H.settleAfterAction();
expect("today's note made by Tasks without Templater", H.text(day), "## Tasks\n\n- [ ] Viết thư\n");
return "ok";
