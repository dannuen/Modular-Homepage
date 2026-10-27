// Runs in the page: what the homepage writes to notes and data.json. Throws on the first wrong result.
const day = "Daily Notes/2026/10-October/2026-10-14.md"; // "today" in the harness
const expect = (what, got, want) => {
  if (got !== want) throw new Error(what + "\n  got:  " + got + "\n  want: " + want);
};
const saves = () => H.log.writes.filter((w) => w.op === "saveData").length;
const line = () => H.text(day).split("\n").find((l) => l.includes("Gọi anh Phúc"));
const press = async (view, key) => {
  const b = [...view.querySelectorAll(".hp-tk-blk")].find((x) => x.textContent.includes("Gọi anh Phúc"));
  if (!b) throw new Error("No week block for the test task");
  b.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  await H.settleAfterAction();
};

// A missing data.json (not synced yet) is never saved over with the defaults.
const data = H.data, layouts = JSON.stringify(H.plugin.layouts), before = saves();
H.data = null;
await H.plugin.onExternalSettingsChange();
expect("layouts after a sync with no data.json", JSON.stringify(H.plugin.layouts), layouts);
await H.plugin.loadAll();
expect("saveData calls with no data.json", saves(), before);
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

// A next action from a project without Tasks.md links to the note it is in, so a click can't create an empty Tasks.md.
const folder = "Projects/Sửa Mái Nhà Thờ";
await H.app.vault.delete(H.file(folder + "/Tasks.md"));
await H.app.vault.create(folder + "/Meetings/Họp thêm.md", "# Họp thêm\n\n- [ ] Gọi nhà thầu xác nhận 📅 2026-10-15\n");
await H.settleAfterAction();
const link = H.$$("a.internal-link", H.slot("next-actions")).find((a) => a.textContent.includes("Gọi nhà thầu"));
if (!link) throw new Error("Next actions does not show the meeting note's task");
expect("Next actions link", link.getAttribute("data-href").replace(/\.md$/, ""), folder + "/Meetings/Họp thêm");

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
return "ok";
