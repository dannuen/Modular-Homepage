// Boot: build the vault and app from /input.json, load the real plugin bundle (CommonJS, require("obsidian") → the mock),
// run its onload, then show Homepage.md in Reading view the way Obsidian does: the note's code blocks handed to the
// registered code-block processors, each child added to the view's component.
(function () {
	"use strict";
	const H = window.__harness;
	const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
	const frame = () => new Promise((r) => requestAnimationFrame(() => r()));
	H.ready = false;
	H.sleep = sleep;

	// Wait until every homepage block has finished drawing (its draw chain), fonts and images are in, and two frames passed.
	H.settle = async function ({ quiet = 150 } = {}) {
		const blocks = () => [...(H.plugin?.blocks || [])];
		for (let i = 0; i < 3; i++) {
			await Promise.all(blocks().map((b) => b.drawing).filter(Boolean));
			await sleep(0);
		}
		await document.fonts.ready;
		const pending = [...document.images].filter((img) => !img.complete);
		await Promise.all(pending.map((img) => new Promise((r) => {
			img.addEventListener("load", r, { once: true });
			img.addEventListener("error", r, { once: true });
			setTimeout(r, 3000);
		})));
		await frame();
		await frame();
		await sleep(quiet);
		await Promise.all(blocks().map((b) => b.drawing).filter(Boolean));
	};
	// After an action: let the vault events and the plugin's redraw timers (150 ms / 600 ms) run, then settle.
	H.settleAfterAction = async function () {
		await sleep(900);
		await H.settle();
	};
	H.redraw = async function () {
		await Promise.all([...(H.plugin?.blocks || [])].map((b) => b.redraw()));
		await H.settle();
	};
	// Helpers for --action snippets.
	H.$ = (sel, root = document) => root.querySelector(sel);
	H.$$ = (sel, root = document) => [...root.querySelectorAll(sel)];
	H.slot = (module) => document.querySelector(".hp-slot[data-module='" + module + "']");
	H.click = (target) => {
		const el = typeof target === "string" ? document.querySelector(target) : target;
		if (!el) throw new Error("H.click: nothing matches " + target);
		el.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, composed: true }));
		el.click();
		return el;
	};
	H.file = (path) => H.app.vault.getAbstractFileByPath(path);
	H.text = (path) => H.app.vault.contents.get(path);

	function renderProperties(container, fm) {
		const box = container.createDiv("metadata-container");
		box.createDiv({ cls: "metadata-properties-heading", text: "Properties" });
		const props = box.createDiv("metadata-properties");
		for (const [k, v] of Object.entries(fm || {})) {
			const row = props.createDiv("metadata-property");
			row.createDiv({ cls: "metadata-property-key", text: k });
			row.createDiv({ cls: "metadata-property-value", text: Array.isArray(v) ? v.join(", ") : String(v ?? "") });
		}
	}

	async function showNote(app, path) {
		const file = app.vault.getFileByPath(path);
		if (!file) throw new Error("Harness: no note at " + path);
		const text = await app.vault.read(file);
		const cache = app.metadataCache.getFileCache(file) || {};
		const view = document.querySelector(".markdown-preview-view");
		const sizer = view.querySelector(".markdown-preview-sizer");
		sizer.replaceChildren();
		sizer.createDiv("markdown-preview-pusher");
		const header = sizer.createDiv("mod-header");
		header.createDiv({ cls: "inline-title", text: file.basename, attr: { tabindex: "-1" } });
		if (cache.frontmatter) renderProperties(header, cache.frontmatter);
		// The note's view component: code-block children are added to it (and unloaded with it).
		const viewComponent = (H.viewComponent = new H.mock.Component());
		viewComponent.load();
		// Internal links in Reading view open notes (Obsidian handles this on the view, not on each link).
		view.addEventListener("click", (e) => {
			const a = e.target.closest && e.target.closest("a");
			if (!a || !view.contains(a)) return;
			if (a.classList.contains("internal-link")) {
				e.preventDefault();
				app.workspace.openLinkText(a.getAttribute("data-href") || a.getAttribute("href"), path, e.ctrlKey || e.metaKey);
			} else if (a.classList.contains("tag")) {
				e.preventDefault();
				H.log.opened.push({ tagSearch: a.textContent });
			} else if (a.classList.contains("external-link")) e.preventDefault();
		});
		const body = text.replace(/^---\r?\n[\s\S]*?\r?\n---[ \t]*(\r?\n|$)/, "");
		const offset = text.slice(0, text.length - body.length).split("\n").length - 1;
		const lines = body.split("\n");
		let para = [];
		const flushPara = () => {
			if (!para.join("").trim()) { para = []; return; }
			const div = sizer.createDiv();
			H.mock.renderBlocks(app, div, para.join("\n"), path);
			para = [];
		};
		for (let i = 0; i < lines.length; i++) {
			const open = lines[i].match(/^(```+|~~~+)\s*([\w-]*)/);
			if (!open) { para.push(lines[i]); continue; }
			flushPara();
			const start = i, src = [];
			for (i++; i < lines.length && !lines[i].startsWith(open[1]); i++) src.push(lines[i]);
			const lang = open[2];
			const handler = (H.codeBlockProcessors || {})[lang];
			const pre = sizer.createDiv("el-pre");
			if (!handler) {
				pre.createEl("pre").createEl("code", { text: src.join("\n") });
				continue;
			}
			const el = pre.createDiv("block-language-" + lang);
			const ctx = {
				docId: "harness-" + path,
				sourcePath: path,
				frontmatter: cache.frontmatter,
				addChild: (child) => viewComponent.addChild(child),
				getSectionInfo: () => ({ text, lineStart: start + offset, lineEnd: i + offset })
			};
			await handler(src.join("\n"), el, ctx);
		}
		flushPara();
		sizer.createDiv("mod-footer");
	}

	(async function boot() {
		try {
			const input = (H.input = await (await fetch("/input.json")).json());
			document.body.classList.add(input.dark ? "theme-dark" : "theme-light");
			for (const c of input.bodyClasses || []) document.body.classList.add(c);
			H.data = input.data;
			H.homePath = input.homePath;
			H.localStorage = Object.assign({}, input.localStorage || {});
			const app = (H.app = H.mock.createApp());
			for (const f of input.files) app.vault._add(f.path, f);
			for (const [p, t] of Object.entries(input.adapterFiles || {})) app.vault.adapterFiles.set(p, t);
			// The plugin bundle, as Obsidian loads it: CommonJS with require("obsidian").
			const code = await (await fetch("/plugin/main.js")).text();
			const module = { exports: {} };
			const require = (name) => {
				if (name === "obsidian") return H.obsidian;
				throw new Error("Cannot find module '" + name + "'");
			};
			new Function("module", "exports", "require", code + "\n//# sourceURL=plugin:///" + input.manifest.id + "/main.js")(module, module.exports, require);
			const PluginClass = module.exports.default || module.exports;
			const plugin = (H.plugin = new PluginClass(app, input.manifest));
			app.plugins.plugins[input.manifest.id] = plugin;
			app.plugins.manifests[input.manifest.id] = input.manifest;
			app.plugins.enabledPlugins.add(input.manifest.id);
			await plugin.load();
			app.metadataCache.trigger("resolved"); // indexing finished before the note opened
			await showNote(app, input.homePath);
			await H.settle();
		} catch (err) {
			H.bootError = String((err && err.stack) || err);
			console.error("Harness: boot failed", err);
		} finally {
			H.ready = true;
		}
	})();
})();
