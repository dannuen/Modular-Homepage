#!/usr/bin/env node
// Render a matrix of homepages (themes × light/dark × widths × layouts) in one browser and summarise it: errors,
// sideways scrolling, and per slot the visible controls that sit outside the slot's card. See README.md.
//
//   node matrix.js --main <main.js> --out <dir> [--themes all|a,b] [--modes light,dark] [--widths 1230]
//                  [--also dune:light:420,…] [--layouts 'layouts/all-*.json'] [--slots] [--concurrency 4]
"use strict";
const fs = require("fs");
const path = require("path");
const { renderHomepage, launch, summarize, THEMES } = require("./render");

const HELP = `Usage: node matrix.js --main <main.js> --out <dir> [options]
  --main <file>         the plugin bundle (CommonJS main.js)
  --out <dir>           where to write <theme>-<mode>-<width>/<layout>.png|.json, summary.json and summary.txt
  --themes <list|all>   comma-separated theme ids (default all: ${THEMES.join(",")})
  --modes <list>        light,dark (default both)
  --widths <list>       viewport widths (default 1230)
  --also <list>         extra runs as theme:mode:width, e.g. dune:light:420 (each with every layout)
  --layouts <list>      comma-separated files or globs (default layouts/all-*.json)
  --settings <file|json>, --home <file|json>   passed to every render (see render.js)
  --slots               also write per-slot screenshots (<theme>-<mode>-<width>/<layout>/NN-module-variant.png)
  --concurrency <n>     parallel pages (default 4)
  --quiet               no progress line`;

function parseArgs(argv) {
	const o = {};
	for (let i = 0; i < argv.length; i++) {
		const a = argv[i];
		if (!a.startsWith("--")) throw new Error("Unexpected argument: " + a);
		const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
		if (["slots", "help", "quiet"].includes(key)) { o[key] = true; continue; }
		const v = argv[++i];
		if (v === undefined) throw new Error("Missing value for " + a);
		o[key] = v;
	}
	return o;
}
const list = (s) => String(s).split(",").map((x) => x.trim()).filter(Boolean);
// Files or simple globs (a * in the file name only).
function expandLayouts(spec) {
	const out = [];
	for (const item of list(spec)) {
		const abs = path.resolve(item);
		const base = path.basename(abs);
		if (!base.includes("*")) { out.push(abs); continue; }
		const re = new RegExp("^" + base.split("*").map((p) => p.replace(/[.+?^${}()|[\]\\]/g, "\\$&")).join(".*") + "$");
		const dir = path.dirname(abs);
		for (const f of fs.readdirSync(dir).filter((f) => re.test(f)).sort()) out.push(path.join(dir, f));
	}
	return out;
}

async function runMatrix(o) {
	const themes = !o.themes || o.themes === "all" ? THEMES : list(o.themes);
	const modes = o.modes ? list(o.modes) : ["light", "dark"];
	const widths = o.widths ? list(o.widths).map(Number) : [1230];
	const layouts = expandLayouts(o.layouts || path.join(__dirname, "layouts", "all-*.json"));
	if (!layouts.length) throw new Error("No layouts match " + (o.layouts || "layouts/all-*.json"));
	const combos = [];
	for (const theme of themes) for (const mode of modes) for (const width of widths) combos.push({ theme, mode, width });
	for (const c of o.also ? list(o.also) : []) {
		const [theme, mode = "light", width = "1230"] = c.split(":");
		combos.push({ theme, mode, width: Number(width) });
	}
	const out = path.resolve(o.out);
	fs.mkdirSync(out, { recursive: true });
	const jobs = [];
	for (const c of combos) for (const layout of layouts) {
		const run = c.theme + "-" + c.mode + "-" + c.width;
		const name = path.basename(layout, ".json");
		jobs.push({ ...c, layout, run, name, dir: path.join(out, run) });
	}
	const started = Date.now();
	const browser = await launch();
	const results = [];
	let next = 0, done = 0;
	const worker = async () => {
		while (next < jobs.length) {
			const j = jobs[next++];
			let r;
			try {
				r = await renderHomepage(browser, {
					main: o.main, theme: j.theme, dark: j.mode === "dark", width: j.width, layout: j.layout,
					settings: o.settings, home: o.home,
					out: path.join(j.dir, j.name + ".png"), report: path.join(j.dir, j.name + ".json"),
					slotsDir: o.slots ? path.join(j.dir, j.name) : undefined
				});
			} catch (err) {
				r = { failed: String((err && err.stack) || err) };
			}
			results.push({ job: j, r });
			done++;
			if (!o.quiet) process.stdout.write("\r" + done + "/" + jobs.length + " " + j.run + " " + j.name + (r.failed ? " FAILED" : r.ok ? "" : " PROBLEMS") + "          ");
		}
	};
	try {
		await Promise.all(Array.from({ length: Math.max(1, Number(o.concurrency) || 4) }, worker));
	} finally {
		await browser.close();
	}
	if (!o.quiet) process.stdout.write("\n");
	const order = new Map(jobs.map((j, i) => [j, i]));
	results.sort((a, b) => order.get(a.job) - order.get(b.job));
	const seconds = Math.round((Date.now() - started) / 100) / 10;
	const summary = summarise(results, { seconds, main: path.resolve(o.main), combos, layouts: layouts.map((l) => path.relative(__dirname, l)) });
	fs.writeFileSync(path.join(out, "summary.json"), JSON.stringify(summary, null, 2));
	fs.writeFileSync(path.join(out, "summary.txt"), summaryText(summary, results));
	return summary;
}

// One record per render, plus, per module:variant, every control seen outside its card and where.
function summarise(results, meta) {
	const renders = results.map(({ job, r }) => {
		if (r.failed) return { run: job.run, layout: job.name, failed: r.failed };
		return {
			run: job.run, layout: job.name, ok: r.ok, ms: r.ms,
			boot_error: r.boot_error || undefined,
			all_slots_drawn: r.all_slots_drawn,
			console_errors: r.console.filter((m) => m.type === "error").map((m) => m.text.split("\n")[0].slice(0, 300)),
			console_warnings: r.console.filter((m) => m.type !== "error").length,
			page_errors: r.page_errors.map((e) => e.message),
			bad_requests: r.bad_requests.map((b) => b.url + " " + (b.status || b.error)),
			missing_obsidian_exports: r.log.missing_obsidian_exports,
			scrolls_sideways: r.scrolls_sideways ? r.sideways : false,
			slots: r.slots.map((s) => ({
				index: s.index, module: s.module, variant: s.variant, w: s.w,
				drawn: s.drawn, error: s.error, empty: s.empty,
				outer_cards: s.outer_cards, sec: s.sec.present ? (s.sec.visible ? "visible" : "hidden") : "none",
				controls: s.controls.length,
				// Each label with where it is: the module's title row (.hp-sec), or inside a card's DOM yet drawn outside it.
				controls_outside_card: s.controls.filter((c) => !c.inside_card).map((c) => (c.aria || c.text || c.title || c.el) + (c.in_title_row ? " [title row]" : c.in_card_dom ? " [card DOM, drawn outside]" : "")),
				scrolls_sideways: s.scrolls_sideways || undefined,
				pokes_out: s.pokes_out ? Object.fromEntries(["left", "right", "top", "bottom"].filter((k) => s.pokes_out[k] > 1).map((k) => [k, s.pokes_out[k]])) : undefined
			}))
		};
	});
	const byModule = {};
	for (const rd of renders) {
		if (rd.failed) continue;
		for (const s of rd.slots) {
			const key = s.module + (s.variant ? ":" + s.variant : "");
			const m = (byModule[key] = byModule[key] || { renders: 0, without_card: 0, controls: 0, outside: {} });
			m.renders++;
			m.controls += s.controls;
			if (!s.outer_cards) m.without_card++;
			for (const label of new Set(s.controls_outside_card)) (m.outside[label] = m.outside[label] || []).push(rd.run);
		}
	}
	const ok = renders.filter((r) => r.ok).length;
	return {
		main: meta.main, seconds: meta.seconds, renders: renders.length, ok, problems: renders.length - ok,
		combos: meta.combos.map((c) => c.theme + "-" + c.mode + "-" + c.width), layouts: meta.layouts,
		totals: {
			console_errors: renders.reduce((n, r) => n + (r.console_errors?.length || 0), 0),
			page_errors: renders.reduce((n, r) => n + (r.page_errors?.length || 0), 0),
			bad_requests: renders.reduce((n, r) => n + (r.bad_requests?.length || 0), 0),
			failed: renders.filter((r) => r.failed).length,
			sideways: renders.filter((r) => r.scrolls_sideways).map((r) => r.run + "/" + r.layout),
			slot_errors: renders.flatMap((r) => (r.slots || []).filter((s) => s.error).map((s) => r.run + "/" + r.layout + " " + s.module + ": " + s.error.join(" | "))),
			slots_not_drawn: renders.flatMap((r) => (r.slots || []).filter((s) => !s.drawn).map((s) => r.run + "/" + r.layout + " " + s.module)),
			slots_scrolling_sideways: renders.flatMap((r) => (r.slots || []).filter((s) => s.scrolls_sideways).map((s) => r.run + "/" + r.layout + " " + s.module)),
			slots_poking_out: renders.flatMap((r) => (r.slots || []).filter((s) => s.pokes_out && Object.keys(s.pokes_out).length).map((s) => r.run + "/" + r.layout + " " + s.module + (s.variant ? ":" + s.variant : "") + " " + JSON.stringify(s.pokes_out)))
		},
		controls_outside_card: Object.fromEntries(Object.entries(byModule).sort(([a], [b]) => a.localeCompare(b)).map(([k, m]) => [k, {
			renders: m.renders,
			slot_without_hp_card: m.without_card ? m.without_card + "/" + m.renders : undefined,
			outside: Object.fromEntries(Object.entries(m.outside).sort((a, b) => b[1].length - a[1].length).map(([label, runs]) => [label, runs.length === m.renders ? "all " + m.renders : runs.length + "/" + m.renders + ": " + [...new Set(runs)].join(", ")]))
		}])),
		renders_detail: renders
	};
}

function summaryText(s, results) {
	const L = [];
	L.push("Matrix: " + s.renders + " renders in " + s.seconds + " s  (" + s.ok + " ok, " + s.problems + " with problems)");
	L.push("main.js: " + s.main);
	L.push("runs: " + s.combos.join(", "));
	L.push("layouts: " + s.layouts.join(", "));
	const t = s.totals;
	L.push("", "Totals: console errors " + t.console_errors + ", page errors " + t.page_errors + ", bad requests " + t.bad_requests + ", failed renders " + t.failed);
	L.push("Page scrolls sideways: " + (t.sideways.length ? t.sideways.join(", ") : "never"));
	L.push("Slots with an error: " + (t.slot_errors.length ? "\n  " + t.slot_errors.join("\n  ") : "none"));
	L.push("Slots that drew nothing: " + (t.slots_not_drawn.length ? t.slots_not_drawn.join(", ") : "none"));
	L.push("Slots that scroll sideways: " + (t.slots_scrolling_sideways.length ? "\n  " + t.slots_scrolling_sideways.join("\n  ") : "none"));
	L.push("Slots with something poking out (px): " + (t.slots_poking_out.length ? "\n  " + t.slots_poking_out.join("\n  ") : "none"));
	L.push("", "Visible controls outside the slot's outermost .hp-card, per module:variant (“all N” = in every render of it):");
	for (const [k, m] of Object.entries(s.controls_outside_card)) {
		const labels = Object.entries(m.outside);
		L.push("  " + k + "  (" + m.renders + " renders" + (m.slot_without_hp_card ? ", no .hp-card in the slot in " + m.slot_without_hp_card : "") + ")" + (labels.length ? "" : "  none"));
		for (const [label, where] of labels.slice(0, 14)) L.push("      " + JSON.stringify(label.slice(0, 70)) + "  " + where);
		if (labels.length > 14) L.push("      … and " + (labels.length - 14) + " more");
	}
	L.push("", "Per render:");
	for (const { job, r } of results) L.push(job.name + "  " + (r.failed ? job.run + "  FAILED: " + r.failed.split("\n")[0] : summarize(r)));
	return L.join("\n") + "\n";
}

module.exports = { runMatrix };

if (require.main === module) {
	let o;
	try {
		o = parseArgs(process.argv.slice(2));
	} catch (err) {
		console.error(err.message + "\n\n" + HELP);
		process.exit(2);
	}
	if (o.help) { console.log(HELP); process.exit(0); }
	if (!o.main || !o.out) { console.error("--main and --out are required\n\n" + HELP); process.exit(2); }
	runMatrix(o).then((s) => {
		console.log("Matrix: " + s.renders + " renders in " + s.seconds + " s, " + s.ok + " ok, " + s.problems + " with problems → " + path.join(path.resolve(o.out), "summary.txt"));
		process.exitCode = s.totals.failed ? 1 : 0;
	}, (err) => {
		console.error(err);
		process.exit(1);
	});
}
