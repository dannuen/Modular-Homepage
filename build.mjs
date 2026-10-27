// Modular Homepage build: joins parts/*.js in name order, with styles/ (in styles/ORDER.txt order) inlined as the
// styles_default string, and writes dist/main.js.   node build.mjs [--check <main.js>] [--out <file>]
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const root = dirname(fileURLToPath(import.meta.url));
const arg = (k) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : null; };
const escape = (s) => s.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${").replace(/\r/g, "\\r");
const order = readFileSync(join(root, "styles/ORDER.txt"), "utf8").split("\n").map((l) => l.trim()).filter(Boolean);
const css = order.map((f) => "/* ===== " + f + " ===== */\n" + readFileSync(join(root, "styles", f), "utf8")).join("");
const styles = "var styles_default = `" + escape(css) + "`;\n";
const parts = readdirSync(join(root, "parts")).filter((f) => f.endsWith(".js")).sort();
const out = parts.map((f) => readFileSync(join(root, "parts", f), "utf8").replace(/\/\*@@STYLES@@\*\/\r?\n/, () => styles)).join("");
if (!out.includes("var styles_default")) throw new Error("styles marker /*@@STYLES@@*/ not found in parts/");
const md5 = (b) => createHash("md5").update(b).digest("hex");
const target = arg("--out") || join(root, "dist/main.js");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, out);
console.log("built " + target + " (" + Buffer.byteLength(out) + " bytes, md5 " + md5(out) + ")");
const check = arg("--check");
if (check) {
  const ref = readFileSync(check, "utf8");
  console.log(ref === out ? "identical to " + check : "DIFFERS from " + check);
  if (ref !== out) process.exitCode = 1;
}
