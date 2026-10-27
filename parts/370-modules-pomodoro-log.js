// src/modules/pomodoro/log.ts
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
async function writeEntry(app, cfg, entry) {
  const file = await dailyNote(app, cfg, DateTime.fromISO(entry.day));
  await app.vault.process(file, (data) => withEntry(data, entry));
}

