// node geom-summary.js <geom.json> — what to look at after geom.js: failed renders, sideways scrolling,
// and tool rows that are not at --hm-bar-inset from the card's top and right or not --hm-tool tall.
// Pulpit's right edge is 0 by design (its cards have no side padding), and a tool row pushed down by a wrapped
// header (calendar month at narrow widths) shows a larger top; check those in the screenshots.
const d = require(require("path").resolve(process.argv[2]));
const bad = d.filter((r) => !r.ok || r.errors || r.sideways || !Array.isArray(r.slots));
console.log(d.length + " renders, " + bad.length + " with errors, sideways scrolling or no report");
for (const r of bad) console.log("  " + [r.theme, r.dark ? "dark" : "light", r.width, r.layout, "errors " + r.errors, r.sideways ? "sideways" : ""].join(" "));
const seen = new Set();
for (const r of d) {
  if (!Array.isArray(r.slots)) continue;
  for (const s of r.slots) for (const c of s.cards) {
    const b = c.bar;
    if (!b || b.top === undefined) continue;
    const off = Math.abs(b.top - c.inset) > 0.6 || (Math.abs(b.right - c.inset) > 0.6 && r.theme !== "pulpit") || b.h !== c.tool;
    const key = [r.theme, r.width, s.module, s.variant].join(" ");
    if (off && !seen.has(key)) { seen.add(key); console.log("  tool row: " + key + "  top " + b.top + " right " + b.right + " h " + b.h + "  (inset " + Math.round(c.inset * 10) / 10 + ", tool " + c.tool + ")"); }
  }
}
