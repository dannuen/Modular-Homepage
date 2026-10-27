// src/modules/pomodoro/log.ts
var import_obsidian7 = require("obsidian");
var SECTION = "Focus";
var clock2 = (t) => {
  const d = new Date(t);
  return String(d.getHours()).padStart(2, "0") + ":" + String(d.getMinutes()).padStart(2, "0");
};
var duration = (ms) => {
  const m = Math.round(ms / 6e4), h = Math.floor(m / 60);
  return h ? h + "h" + (m % 60 ? " " + m % 60 + "m" : "") : m + "m";
};
var lineOf = (e) => "- **" + e.name.replace(/\*/g, "") + "** · " + e.cycles + " chu kỳ · " + duration(e.focusMs) + " · " + clock2(e.start) + "–" + clock2(e.end) + " ^" + e.id;
function withEntry(data, entry) {
  const lines = data.split(/\r?\n/);
  const line = lineOf(entry), tag = " ^" + entry.id;
  const old = lines.findIndex((l2) => l2.trimEnd().endsWith(tag));
  if (old < 0) return intoSection(data, "# " + SECTION, [line]);
  lines[old] = line;
  return lines.join(eolOf(data));
}
async function noteFor(app, cfg, day) {
  const path = cfg.dailyFolder.replace(/\/+$/, "") + "/" + DateTime.fromISO(day).setLocale("en").toFormat("yyyy/MM-LLLL/yyyy-MM-dd") + ".md";
  const found = app.vault.getAbstractFileByPath(path);
  if (found instanceof import_obsidian7.TFile) return found;
  const folder = path.slice(0, path.lastIndexOf("/"));
  if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder);
  const templater = app.plugins?.plugins?.["templater-obsidian"]?.templater;
  const template = app.vault.getAbstractFileByPath(cfg.dailyTemplate);
  if (templater && template instanceof import_obsidian7.TFile) await templater.create_new_note_from_template(template, app.vault.getAbstractFileByPath(folder), day, false);
  const made = app.vault.getAbstractFileByPath(path);
  return made instanceof import_obsidian7.TFile ? made : await app.vault.create(path, "");
}
async function writeEntry(app, cfg, entry) {
  const file = await noteFor(app, cfg, entry.day);
  await app.vault.process(file, (data) => withEntry(data, entry));
}

