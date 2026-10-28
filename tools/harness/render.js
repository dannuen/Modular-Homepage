#!/usr/bin/env node
// Render the Modular Homepage plugin's real bundle in headless Chromium over the fixture vault, then screenshot it and
// write a DOM report. See README.md.
//
//   node render.js --main <main.js> --theme <id> [--layout <file|json>] [--dark] [--width 1230] [--settings <file|json>]
//                  --out <png> [--slots-dir <dir>] [--report <json>] [--action <js>] [--pw-action <js>] …
"use strict";
const fs = require("fs");
const path = require("path");
const { chromium } = require("playwright");
const { buildVault, binaryFor } = require("./fixture");

const ROOT = __dirname;
const ORIGIN = "http://obsidian.local";
const THEMES = ["aurora", "prism", "frosted", "pulpit", "pixel", "crystal", "dune", "golden"];
const DEFAULTS = {
	theme: "aurora", dark: false, width: 1230, height: 900, scale: 1,
	today: "2026-10-14", now: "2026-10-14T10:00:00+07:00", timezone: "Asia/Ho_Chi_Minh", tz: "+07:00",
	margin: 24, timeout: 30000
};
const HELP = `Usage: node render.js --main <main.js> --theme <id> --out <png> [options]
  --main <file>          the plugin bundle (CommonJS main.js)
  --theme <id>           ${THEMES.join(", ")} (written to Homepage.md's home_theme)
  --layout <file|json>   a layout: [{module,w,variant}…] or {items:[…]}; default: the layouts in fixtures/data.json
  --dark                 Obsidian's dark mode (default light)
  --width <px>           viewport width = the note's width (default 1230); --height <px> (default 900)
  --settings <file|json> merged (deeply) into data.json's settings, e.g. '{"config":{"name":"X"}}'
  --home <file|json>     extra Homepage.md properties, e.g. '{"upnext_effect":"noir"}'
  --out <png>            full-page screenshot of the homepage
  --slots-dir <dir>      one screenshot per module slot: <index>-<module>-<variant>.png (24px margin)
  --report <json>        the DOM report (errors, sideways scroll, per-slot cards and controls)
  --action <js>          run in the page after the first render (async; H = window.__harness), e.g.
                         "H.click(H.slot('countdown').querySelector('.m-cd-gear'))"; --action-file <file> to read it
  --pw-action <js>       run in Node with (page, H) after the first render, e.g. "await page.hover('.hp-tb-brand')"
  --now <iso>            frozen time (default ${DEFAULTS.now}); --timezone <tz> (default ${DEFAULTS.timezone})
  --scale <n>            device scale factor (default 1)
  --body-class <a,b>     extra body classes (e.g. is-mobile,is-phone)
  --quiet                no console summary`;

function parseArgs(argv) {
	const o = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith("--")) throw new Error("Unexpected argument: " + a);
		const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
		if (["dark", "quiet", "help", "light"].includes(key)) { o[key] = true; continue; }
		const v = argv[++i];
		if (v === undefined) throw new Error("Missing value for " + a);
		o[key] = v;
	}
	return o;
}
const readJsonArg = (v) => {
	if (v === undefined || v === null) return undefined;
	if (typeof v !== "string") return v;
	const s = v.trim();
	return JSON.parse(s.startsWith("[") || s.startsWith("{") ? s : fs.readFileSync(path.resolve(s), "utf8"));
};
function deepMerge(a, b) {
	if (Array.isArray(b) || b === null || typeof b !== "object") return b;
	const out = { ...(a && typeof a === "object" && !Array.isArray(a) ? a : {}) };
	for (const [k, v] of Object.entries(b)) out[k] = deepMerge(out[k], v);
	return out;
}
// A layout given as items, {items}, or a whole layouts object ({version:2, list}).
function layoutsFor(spec, base) {
	if (spec === undefined) return base.layouts;
	if (spec && spec.version === 2 && Array.isArray(spec.list)) return spec;
	const items = Array.isArray(spec) ? spec : spec.items;
	if (!Array.isArray(items)) throw new Error("A layout must be a list of {module, w, variant} or {items: [...]}");
	return { version: 2, list: [{ id: "t", name: (spec && spec.name) || "Test", items }], defaultId: "t", chosen: {} };
}

const MIME = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".md": "text/markdown; charset=utf-8", ".base": "text/plain; charset=utf-8" };

async function launch(opts = {}) {
	return chromium.launch({ headless: true, args: ["--font-render-hinting=none", "--disable-lcd-text"], ...opts });
}

// Render one homepage. Returns the report (and writes the files asked for).
async function renderHomepage(browser, input) {
	const o = { ...DEFAULTS, ...input };
	if (!o.main) throw new Error("--main <path to main.js> is required");
	if (!THEMES.includes(o.theme)) console.warn("render: unknown theme '" + o.theme + "' (the plugin falls back to its default)");
	const started = Date.now();
	const mainCode = fs.readFileSync(path.resolve(o.main), "utf8");
	const baseData = JSON.parse(fs.readFileSync(path.join(ROOT, "fixtures", "data.json"), "utf8"));
	const manifest = { ...JSON.parse(fs.readFileSync(path.join(ROOT, "fixtures", "manifest.json"), "utf8")), dir: ".obsidian/plugins/modular-homepage" };
	const data = { settings: deepMerge(baseData.settings, readJsonArg(o.settings) || {}), layouts: layoutsFor(readJsonArg(o.layout), baseData) };
	const vault = buildVault({ today: o.today, tz: o.tz, theme: o.theme, homeExtra: readJsonArg(o.home) || {} });
	const binaries = new Map();
	for (const f of vault.files) if (f.binary) binaries.set(f.path, binaryFor(f.binary));
	const inputJson = JSON.stringify({
		dark: !!o.dark,
		bodyClasses: o.bodyClass ? String(o.bodyClass).split(",").map((s) => s.trim()).filter(Boolean) : [],
		homePath: "Homepage.md",
		manifest,
		data,
		files: vault.files.map((f) => (f.binary ? { path: f.path, ctime: f.ctime, mtime: f.mtime, size: binaries.get(f.path).length } : f)),
		adapterFiles: vault.adapterFiles,
		localStorage: o.localStorage || {}
	});

	const context = await browser.newContext({
		viewport: { width: Number(o.width), height: Number(o.height) },
		deviceScaleFactor: Number(o.scale),
		timezoneId: o.timezone,
		locale: "en-US",
		colorScheme: o.dark ? "dark" : "light"
	});
	await context.clock.setFixedTime(new Date(o.now));
	const consoleMessages = [], pageErrors = [], badRequests = [];
	await context.route(ORIGIN + "/**", async (route) => {
		const url = new URL(route.request().url());
		const p = decodeURIComponent(url.pathname);
		const send = (body, type) => route.fulfill({ status: 200, body, headers: { "content-type": type, "cache-control": "no-store" } });
		try {
			if (p === "/" || p === "/index.html") return send(fs.readFileSync(path.join(ROOT, "www", "page.html")), MIME[".html"]);
			if (p.startsWith("/www/")) return send(fs.readFileSync(path.join(ROOT, "www", path.basename(p))), MIME[path.extname(p)] || "text/plain");
			if (p === "/input.json") return send(inputJson, MIME[".json"]);
			if (p === "/plugin/main.js") return send(mainCode, MIME[".js"]);
			if (p.startsWith("/vault/")) {
				const vp = p.slice(7).normalize("NFC");
				if (binaries.has(vp)) return send(binaries.get(vp), MIME[path.extname(vp).toLowerCase()] || "application/octet-stream");
				const f = vault.files.find((x) => x.path === vp);
				if (f) return send(f.text, MIME[path.extname(vp).toLowerCase()] || "text/plain");
			}
			badRequests.push({ url: url.href, status: 404 });
			return route.fulfill({ status: 404, body: "not found" });
		} catch (err) {
			badRequests.push({ url: url.href, status: 500, error: String(err) });
			return route.fulfill({ status: 500, body: String(err) });
		}
	});
	const page = await context.newPage();
	page.on("console", (msg) => {
		const type = msg.type();
		if (type !== "error" && type !== "warning" && type !== "assert") return;
		const loc = msg.location();
		consoleMessages.push({ type, text: msg.text().slice(0, 2000), at: loc && loc.url ? loc.url.replace(ORIGIN, "") + ":" + loc.lineNumber : undefined });
	});
	page.on("pageerror", (err) => pageErrors.push({ message: err.message, stack: String(err.stack || "").split("\n").slice(0, 6).join("\n") }));
	page.on("requestfailed", (req) => badRequests.push({ url: req.url(), error: req.failure() && req.failure().errorText }));

	let report;
	try {
		await page.goto(ORIGIN + "/", { waitUntil: "load" });
		await page.waitForFunction(() => window.__harness && window.__harness.ready, null, { timeout: o.timeout });
		const bootError = await page.evaluate(() => window.__harness.bootError || null);
		// Every module drew something (or timed out trying).
		const drawn = await page.waitForFunction(() => {
			const slots = [...document.querySelectorAll(".hp-grid > .hp-slot")];
			return slots.length > 0 && slots.every((s) => s.querySelector(":scope > .hp-body")?.childElementCount > 0);
		}, null, { timeout: 8000 }).then(() => true, () => false);
		await page.waitForLoadState("networkidle").catch(() => {});
		await page.evaluate(() => window.__harness.settle());
		const actions = [];
		if (o.actionFile) o.action = fs.readFileSync(path.resolve(o.actionFile), "utf8");
		if (o.action) {
			const res = await page.evaluate(async (src) => {
				const H = window.__harness;
				try {
					const value = await new Function("H", "return (async () => {\n" + src + "\n})();")(H);
					await H.settleAfterAction();
					return { ok: true, value: value === undefined ? undefined : String(value) };
				} catch (err) {
					return { ok: false, error: String((err && err.stack) || err) };
				}
			}, o.action);
			actions.push({ action: o.action, ...res });
		}
		if (o.pwAction) {
			try {
				// H(src) runs a snippet in the page, as --action does.
				const H = (src) => page.evaluate((s) => new Function("H", "return (async () => {\n" + s + "\n})();")(window.__harness), src);
				const fn = new Function("page", "H", "return (async () => {\n" + o.pwAction + "\n})();");
				const value = await fn(page, H);
				await page.evaluate(() => window.__harness.settleAfterAction());
				actions.push({ pwAction: o.pwAction, ok: true, value: value === undefined ? undefined : String(value) });
			} catch (err) {
				actions.push({ pwAction: o.pwAction, ok: false, error: String((err && err.stack) || err) });
			}
		}
		await page.evaluate(() => window.scrollTo(0, 0));
		const dom = await page.evaluate(() => window.__harness.inspect());
		const log = await page.evaluate(() => {
			const L = window.__harness.log;
			return { opened: L.opened, notices: L.notices, writes: L.writes, commands: L.commands, missing_obsidian_exports: L.missing };
		});
		report = {
			args: { main: path.resolve(o.main), theme: o.theme, dark: !!o.dark, width: Number(o.width), layout: typeof o.layout === "string" && !o.layout.trim().startsWith("[") && !o.layout.trim().startsWith("{") ? o.layout : o.layout ? "inline" : "fixtures/data.json", now: o.now, timezone: o.timezone },
			ok: !bootError && drawn && !pageErrors.length && !consoleMessages.some((m) => m.type === "error"),
			boot_error: bootError,
			all_slots_drawn: drawn,
			console: consoleMessages,
			console_errors: consoleMessages.filter((m) => m.type === "error").length,
			page_errors: pageErrors,
			bad_requests: badRequests,
			actions,
			...dom,
			log,
			ms: 0
		};
		if (o.out) {
			fs.mkdirSync(path.dirname(path.resolve(o.out)), { recursive: true });
			await page.screenshot({ path: o.out, fullPage: true, animations: "disabled", caret: "hide" });
		}
		if (o.slotsDir) {
			fs.mkdirSync(path.resolve(o.slotsDir), { recursive: true });
			const m = Number(o.margin);
			for (const s of dom.slots) {
				const x = Math.max(0, s.rect.x - m), y = Math.max(0, s.rect.y - m);
				const w = Math.min(dom.page.w - x, s.rect.w + m * 2 + Math.min(0, s.rect.x - m)), h = Math.min(dom.page.h - y, s.rect.h + m * 2 + Math.min(0, s.rect.y - m));
				if (w < 1 || h < 1) continue;
				const name = String(s.index).padStart(2, "0") + "-" + s.module + "-" + (s.variant || "default") + ".png";
				await page.screenshot({ path: path.join(o.slotsDir, name), fullPage: true, clip: { x, y, width: w, height: h }, animations: "disabled", caret: "hide" });
			}
		}
	} finally {
		await context.close();
	}
	report.ms = Date.now() - started;
	if (o.report) {
		fs.mkdirSync(path.dirname(path.resolve(o.report)), { recursive: true });
		fs.writeFileSync(o.report, JSON.stringify(report, null, 2));
	}
	return report;
}

// One line per slot: problems first.
function summarize(r) {
	const lines = [];
	const head = [r.args.theme, r.args.dark ? "dark" : "light", r.args.width + "px"].join(" ");
	lines.push(head + (r.ok ? "  ok" : "  PROBLEMS") + "  (" + r.ms + " ms)");
	if (r.boot_error) lines.push("  boot error: " + r.boot_error.split("\n")[0]);
	if (!r.all_slots_drawn) lines.push("  not every slot drew something");
	for (const e of r.page_errors) lines.push("  page error: " + e.message);
	for (const m of r.console) lines.push("  console " + m.type + ": " + m.text.split("\n")[0].slice(0, 220));
	for (const b of r.bad_requests) lines.push("  request: " + b.url + " " + (b.status || b.error));
	if (r.log && r.log.missing_obsidian_exports.length) lines.push("  missing obsidian exports: " + r.log.missing_obsidian_exports.join(", "));
	if (r.scrolls_sideways) lines.push("  scrolls sideways: " + JSON.stringify(r.sideways));
	for (const s of r.slots || []) {
		const bits = [];
		if (s.error) bits.push("ERROR " + s.error.join(" | "));
		if (!s.drawn) bits.push("EMPTY");
		if (s.empty) bits.push("empty-state: " + s.empty.join(" | ").slice(0, 120));
		if (s.controls_outside_card.length) bits.push("outside card: " + s.controls_outside_card.join(", ").slice(0, 160));
		if (s.scrolls_sideways) bits.push("slot scrolls sideways");
		if (s.pokes_out) bits.push("pokes out " + ["left", "right", "top", "bottom"].filter((k) => s.pokes_out[k] > 1).map((k) => k + " " + s.pokes_out[k]).join(" "));
		lines.push("  " + String(s.index).padStart(2, "0") + " " + (s.module + (s.variant ? ":" + s.variant : "")).padEnd(30) + " w" + String(s.w).padEnd(3) + " " + (bits.join("; ") || "ok"));
	}
	return lines.join("\n");
}

module.exports = { renderHomepage, launch, summarize, THEMES, DEFAULTS, parseArgs, readJsonArg };

if (require.main === module) {
	(async () => {
		let o;
		try {
			o = parseArgs(process.argv.slice(2));
		} catch (err) {
			console.error(err.message + "\n\n" + HELP);
			process.exit(2);
		}
		if (o.help) { console.log(HELP); return; }
		if (!o.main || !o.theme) { console.error("--main and --theme are required\n\n" + HELP); process.exit(2); }
		const browser = await launch();
		try {
			const r = await renderHomepage(browser, o);
			if (!o.quiet) console.log(summarize(r));
			process.exitCode = r.boot_error ? 1 : 0;
		} finally {
			await browser.close();
		}
	})().catch((err) => {
		console.error(err);
		process.exit(1);
	});
}
