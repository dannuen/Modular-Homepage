// A stand-in for Obsidian's runtime, enough to run a real plugin bundle (CommonJS main.js with require("obsidian"))
// in a plain browser page: Obsidian's DOM helpers, the "obsidian" module (Plugin, Component, Setting, Modal, Notice,
// TFile, MarkdownRenderer, getAllTags…), and an `app` over an in-memory vault whose metadata cache is built from the
// notes' text (frontmatter, tags, headings, list items with parents and task status, links).
// Everything a plugin does to the outside world (opening notes, notices, writes, commands) lands in __harness.log.
(function () {
	"use strict";
	const H = (window.__harness = window.__harness || {});
	const log = (H.log = H.log || { opened: [], notices: [], writes: [], commands: [], missing: [], events: [] });
	const note = (kind, entry) => log[kind].push(entry);
	const define = (proto, name, value) => Object.defineProperty(proto, name, { value, configurable: true, writable: true, enumerable: false });
	const getter = (proto, name, get) => Object.defineProperty(proto, name, { get, configurable: true, enumerable: false });

	// ---------- Obsidian's DOM helpers (Node / Element / HTMLElement / Document / window) ----------
	function applyInfo(el, o) {
		if (o === undefined || o === null) return el;
		if (typeof o === "string") o = { cls: o };
		if (o.cls) el.classList.add(...(Array.isArray(o.cls) ? o.cls : String(o.cls).split(/\s+/)).filter(Boolean));
		if (o.text !== undefined && o.text !== null) {
			if (o.text instanceof Node) el.appendChild(o.text);
			else el.textContent = String(o.text);
		}
		if (o.attr) for (const [k, v] of Object.entries(o.attr)) {
			if (v === null || v === undefined || v === false) continue;
			el.setAttribute(k, v === true ? "" : String(v));
		}
		if (o.title !== undefined) el.setAttribute("title", o.title);
		if (o.value !== undefined && "value" in el) el.value = o.value;
		if (o.type !== undefined) el.setAttribute("type", o.type);
		if (o.placeholder !== undefined) el.setAttribute("placeholder", o.placeholder);
		if (o.href !== undefined) el.setAttribute("href", o.href);
		if (o.parent) {
			if (o.prepend) o.parent.prepend(el);
			else o.parent.appendChild(el);
		}
		return el;
	}
	const docOf = (node) => (node && node.nodeType === 9 ? node : (node && node.ownerDocument) || document);
	function makeEl(doc, tag, o, cb, parent) {
		const el = doc.createElement(tag);
		const info = typeof o === "string" ? { cls: o } : { ...(o || {}) };
		if (parent && parent.nodeType !== 9) info.parent = parent;
		applyInfo(el, info);
		if (cb) cb(el);
		return el;
	}
	function makeSvg(doc, tag, o, cb, parent) {
		const el = doc.createElementNS("http://www.w3.org/2000/svg", tag);
		const info = typeof o === "string" ? { cls: o } : { ...(o || {}) };
		if (info.cls) {
			el.setAttribute("class", (Array.isArray(info.cls) ? info.cls : [info.cls]).join(" "));
			delete info.cls;
		}
		if (parent && parent.nodeType !== 9) info.parent = parent;
		applyInfo(el, info);
		if (cb) cb(el);
		return el;
	}
	define(Node.prototype, "createEl", function (tag, o, cb) { return makeEl(docOf(this), tag, o, cb, this); });
	define(Node.prototype, "createDiv", function (o, cb) { return makeEl(docOf(this), "div", o, cb, this); });
	define(Node.prototype, "createSpan", function (o, cb) { return makeEl(docOf(this), "span", o, cb, this); });
	define(Node.prototype, "createSvg", function (tag, o, cb) { return makeSvg(docOf(this), tag, o, cb, this); });
	define(Node.prototype, "empty", function () { while (this.lastChild) this.removeChild(this.lastChild); });
	define(Node.prototype, "detach", function () { if (this.parentNode) this.parentNode.removeChild(this); });
	define(Node.prototype, "appendText", function (text) { this.appendChild(docOf(this).createTextNode(String(text))); });
	define(Node.prototype, "insertAfter", function (node, child) { this.insertBefore(node, child ? child.nextSibling : this.firstChild); return node; });
	define(Node.prototype, "indexOf", function (other) { return Array.prototype.indexOf.call(this.childNodes, other); });
	define(Node.prototype, "setChildrenInPlace", function (children) { this.replaceChildren(...children); });
	define(Node.prototype, "instanceOf", function (type) { return this instanceof type; });
	getter(Node.prototype, "doc", function () { return docOf(this); });
	getter(Node.prototype, "win", function () { return docOf(this).defaultView || window; });
	getter(Node.prototype, "constructorWin", function () { return window; });
	define(Element.prototype, "getText", function () { return this.textContent || ""; });
	define(Element.prototype, "setText", function (val) {
		if (val instanceof Node) this.replaceChildren(val);
		else this.textContent = val === undefined || val === null ? "" : String(val);
	});
	define(Element.prototype, "addClass", function (...c) { this.classList.add(...c.flat().filter(Boolean)); });
	define(Element.prototype, "addClasses", function (c) { this.classList.add(...c.filter(Boolean)); });
	define(Element.prototype, "removeClass", function (...c) { this.classList.remove(...c.flat().filter(Boolean)); });
	define(Element.prototype, "removeClasses", function (c) { this.classList.remove(...c); });
	define(Element.prototype, "toggleClass", function (c, on) { for (const k of [].concat(c)) this.classList.toggle(k, on); });
	define(Element.prototype, "hasClass", function (c) { return this.classList.contains(c); });
	define(Element.prototype, "setAttr", function (k, v) {
		if (v === null || v === undefined || v === false) this.removeAttribute(k);
		else this.setAttribute(k, v === true ? "" : String(v));
	});
	define(Element.prototype, "setAttrs", function (o) { for (const [k, v] of Object.entries(o)) this.setAttr(k, v); });
	define(Element.prototype, "getAttr", function (k) { return this.getAttribute(k); });
	define(Element.prototype, "matchParent", function (sel, last) {
		for (let el = this; el && el !== last; el = el.parentElement) if (el.matches(sel)) return el;
		return null;
	});
	define(Element.prototype, "getCssPropertyValue", function (prop, pseudo) { return getComputedStyle(this, pseudo).getPropertyValue(prop); });
	define(Element.prototype, "isActiveElement", function () { return docOf(this).activeElement === this; });
	define(Element.prototype, "find", function (sel) { return this.querySelector(sel); });
	define(Element.prototype, "findAll", function (sel) { return Array.from(this.querySelectorAll(sel)); });
	define(Element.prototype, "findAllSelf", function (sel) { return (this.matches(sel) ? [this] : []).concat(Array.from(this.querySelectorAll(sel))); });
	define(HTMLElement.prototype, "show", function () { this.style.display = ""; });
	define(HTMLElement.prototype, "hide", function () { this.style.display = "none"; });
	define(HTMLElement.prototype, "toggle", function (show) { this.style.display = show ? "" : "none"; });
	define(HTMLElement.prototype, "toggleVisibility", function (v) { this.style.visibility = v ? "" : "hidden"; });
	define(HTMLElement.prototype, "isShown", function () { return !!this.offsetParent; });
	define(HTMLElement.prototype, "setCssStyles", function (s) { Object.assign(this.style, s); });
	define(HTMLElement.prototype, "setCssProps", function (p) { for (const [k, v] of Object.entries(p)) this.style.setProperty(k, v); });
	getter(HTMLElement.prototype, "innerWidth", function () { const s = getComputedStyle(this); return this.clientWidth - parseFloat(s.paddingLeft) - parseFloat(s.paddingRight); });
	getter(HTMLElement.prototype, "innerHeight", function () { const s = getComputedStyle(this); return this.clientHeight - parseFloat(s.paddingTop) - parseFloat(s.paddingBottom); });
	define(HTMLElement.prototype, "onClickEvent", function (fn, opts) { this.addEventListener("click", fn, opts); this.addEventListener("auxclick", fn, opts); });
	define(HTMLElement.prototype, "onNodeInserted", function (fn) { queueMicrotask(() => { if (this.isConnected) fn(); }); return () => {}; });
	define(HTMLElement.prototype, "onWindowMigrated", function () { return () => {}; });
	define(HTMLElement.prototype, "trigger", function (type) { this.dispatchEvent(new Event(type, { bubbles: true })); });
	const delegate = function (type, selector, listener, options) {
		const wrapped = (e) => { const t = e.target.closest && e.target.closest(selector); if (t && this.contains(t)) listener.call(this, e, t); };
		listener.__harnessWrapped = wrapped;
		this.addEventListener(type, wrapped, options);
	};
	const undelegate = function (type, selector, listener, options) { if (listener.__harnessWrapped) this.removeEventListener(type, listener.__harnessWrapped, options); };
	for (const proto of [HTMLElement.prototype, Document.prototype]) { define(proto, "on", delegate); define(proto, "off", undelegate); }
	window.createEl = (tag, o, cb) => makeEl(document, tag, o, cb, null);
	window.createDiv = (o, cb) => makeEl(document, "div", o, cb, null);
	window.createSpan = (o, cb) => makeEl(document, "span", o, cb, null);
	window.createSvg = (tag, o, cb) => makeSvg(document, tag, o, cb, null);
	window.createFragment = (cb) => { const f = document.createDocumentFragment(); if (cb) cb(f); return f; };
	window.activeWindow = window;
	window.activeDocument = document;
	window.sleep = (ms) => new Promise((r) => setTimeout(r, ms));
	window.nextFrame = () => new Promise((r) => requestAnimationFrame(() => r()));
	window.isBoolean = (v) => typeof v === "boolean";
	window.fish = (sel) => document.querySelector(sel);
	window.fishAll = (sel) => Array.from(document.querySelectorAll(sel));
	// Obsidian's additions to built-ins (non-enumerable, as there).
	define(Array.prototype, "contains", function (x) { return this.includes(x); });
	define(Array.prototype, "remove", function (x) { const i = this.indexOf(x); if (i >= 0) this.splice(i, 1); });
	define(Array.prototype, "first", function () { return this[0]; });
	define(Array.prototype, "last", function () { return this[this.length - 1]; });
	define(Array.prototype, "unique", function () { return [...new Set(this)]; });
	define(String.prototype, "contains", function (s) { return this.includes(s); });
	Math.clamp = Math.clamp || ((v, lo, hi) => Math.max(lo, Math.min(hi, v)));
	Number.isNumber = Number.isNumber || ((v) => typeof v === "number" && !isNaN(v));
	Object.isEmpty = Object.isEmpty || ((o) => { for (const _ in o) return false; return true; });

	// ---------- Events / Component ----------
	class Events {
		constructor() { this._handlers = {}; }
		on(name, callback, ctx) {
			(this._handlers[name] ||= []).push({ fn: callback, ctx });
			return { e: this, name, fn: callback, ctx };
		}
		off(name, callback) {
			const list = this._handlers[name];
			if (list) this._handlers[name] = list.filter((h) => h.fn !== callback);
		}
		offref(ref) { if (ref && ref.e === this) this.off(ref.name, ref.fn); }
		trigger(name, ...data) {
			for (const h of (this._handlers[name] || []).slice()) {
				try { h.fn.apply(h.ctx, data); } catch (err) { console.error("Harness: an event handler for '" + name + "' threw", err); }
			}
		}
		tryTrigger(evt, args) { try { evt.fn.apply(evt.ctx, args); } catch (err) { console.error(err); } }
		count(name) { return (this._handlers[name] || []).length; }
	}
	class Component {
		constructor() { this._loaded = false; this._events = []; this._children = []; }
		load() {
			if (this._loaded) return;
			this._loaded = true;
			const result = this.onload();
			for (const c of this._children.slice()) c.load();
			return result;
		}
		onload() {}
		unload() {
			if (!this._loaded) return;
			this._loaded = false;
			while (this._children.length) this._children.pop().unload();
			while (this._events.length) {
				try { this._events.pop()(); } catch (err) { console.error("Harness: an unload callback threw", err); }
			}
			this.onunload();
		}
		onunload() {}
		addChild(child) {
			this._children.push(child);
			if (this._loaded) child.load();
			return child;
		}
		removeChild(child) {
			const i = this._children.indexOf(child);
			if (i >= 0) { this._children.splice(i, 1); child.unload(); }
			return child;
		}
		register(cb) { this._events.push(cb); }
		registerEvent(ref) { this.register(() => ref.e.offref(ref)); }
		registerDomEvent(el, type, cb, opts) { el.addEventListener(type, cb, opts); this.register(() => el.removeEventListener(type, cb, opts)); }
		registerInterval(id) { this.register(() => window.clearInterval(id)); return id; }
		registerScopeEvent() {}
	}
	class MarkdownRenderChild extends Component {
		constructor(containerEl) { super(); this.containerEl = containerEl; }
	}

	// ---------- Files ----------
	class TAbstractFile { constructor(vault, path) { this.vault = vault; this.path = path; this.name = path === "/" ? "" : path.split("/").pop(); this.parent = null; } }
	class TFile extends TAbstractFile {
		constructor(vault, path, stat) {
			super(vault, path);
			const dot = this.name.lastIndexOf(".");
			this.basename = dot > 0 ? this.name.slice(0, dot) : this.name;
			this.extension = dot > 0 ? this.name.slice(dot + 1) : "";
			this.stat = stat;
		}
	}
	class TFolder extends TAbstractFile {
		constructor(vault, path) { super(vault, path); this.children = []; }
		isRoot() { return this.path === "/"; }
	}

	// ---------- YAML (the subset frontmatter uses) ----------
	function splitFlow(s) {
		const out = [];
		let cur = "", depth = 0, q = null;
		for (let i = 0; i < s.length; i++) {
			const c = s[i];
			if (q) { cur += c; if (c === q && s[i - 1] !== "\\") q = null; continue; }
			if (c === '"' || c === "'") { q = c; cur += c; continue; }
			if (c === "[" || c === "{") depth++;
			if (c === "]" || c === "}") depth--;
			if (c === "," && depth === 0) { out.push(cur.trim()); cur = ""; continue; }
			cur += c;
		}
		if (cur.trim()) out.push(cur.trim());
		return out;
	}
	function scalar(raw) {
		let s = String(raw).trim();
		if (s === "") return null;
		if (s.startsWith('"')) {
			const end = s.lastIndexOf('"');
			return JSON.parse(s.slice(0, end + 1).replace(/\\'/g, "'"));
		}
		if (s.startsWith("'")) return s.slice(1, s.lastIndexOf("'")).replace(/''/g, "'");
		if (s.startsWith("[") && s.endsWith("]")) return splitFlow(s.slice(1, -1)).map(scalar);
		s = s.replace(/\s+#.*$/, "").trim();
		if (/^(true|True|TRUE)$/.test(s)) return true;
		if (/^(false|False|FALSE)$/.test(s)) return false;
		if (/^(null|Null|NULL|~)$/.test(s)) return null;
		if (/^[-+]?(\d+|\d*\.\d+)([eE][-+]?\d+)?$/.test(s) && !/^0\d/.test(s)) return Number(s);
		return s;
	}
	function parseYaml(text) {
		const out = {};
		const lines = String(text).split(/\r?\n/);
		for (let i = 0; i < lines.length; i++) {
			const line = lines[i];
			if (!line.trim() || /^\s*#/.test(line)) continue;
			const m = line.match(/^([^\s:#][^:]*?)\s*:(?:\s+(.*)|\s*)$/);
			if (!m) continue;
			const key = m[1].trim().replace(/^["']|["']$/g, "");
			const rest = m[2] === undefined ? "" : m[2];
			if (rest.trim() !== "" && !/^[|>][-+]?$/.test(rest.trim())) { out[key] = scalar(rest); continue; }
			// A block: a list ("- x") or a nested map, or a literal block (| / >).
			const block = [];
			while (i + 1 < lines.length && (/^\s+\S/.test(lines[i + 1]) || /^-\s/.test(lines[i + 1]) || !lines[i + 1].trim())) {
				if (!lines[i + 1].trim() && !(i + 2 < lines.length && /^\s+\S/.test(lines[i + 2]))) break;
				block.push(lines[++i]);
			}
			if (/^[|>]/.test(rest.trim())) { out[key] = block.map((l) => l.trim()).join(rest.trim().startsWith("|") ? "\n" : " "); continue; }
			const items = block.filter((l) => l.trim());
			if (!items.length) out[key] = null;
			else if (/^\s*-(\s|$)/.test(items[0])) out[key] = items.filter((l) => /^\s*-(\s|$)/.test(l)).map((l) => scalar(l.replace(/^\s*-\s?/, "")));
			else out[key] = parseYaml(items.map((l) => l.replace(/^\s{2}/, "")).join("\n"));
		}
		return out;
	}
	const needsQuote = (s) => s === "" || /^[\s\-?:,\[\]{}#&*!|>'"%@`]|[:#]\s|:$|\s$|^(true|false|null|~|yes|no|on|off)$/i.test(s) || /^[-+]?(\d+|\d*\.\d+)([eE][-+]?\d+)?$/.test(s);
	function yamlValue(v) {
		if (v === null || v === undefined) return "";
		if (typeof v === "boolean" || typeof v === "number") return String(v);
		if (v instanceof Date) return v.toISOString();
		const s = String(v);
		return needsQuote(s) ? JSON.stringify(s) : s;
	}
	function stringifyYaml(obj) {
		const lines = [];
		for (const [k, v] of Object.entries(obj)) {
			if (Array.isArray(v)) {
				if (!v.length) lines.push(k + ": []");
				else { lines.push(k + ":"); for (const x of v) lines.push("  - " + yamlValue(x)); }
			} else if (v && typeof v === "object" && !(v instanceof Date)) {
				lines.push(k + ":");
				for (const l of stringifyYaml(v).split("\n").filter(Boolean)) lines.push("  " + l);
			} else lines.push(k + ": " + yamlValue(v));
		}
		return lines.join("\n") + "\n";
	}

	// ---------- The metadata cache: what Obsidian would index from a note's text ----------
	const FM = /^---\r?\n([\s\S]*?)\r?\n---[ \t]*(\r?\n|$)/;
	const TAG_RE = /(^|[\s(])#([^\s -⁯⸀-⹿'!"#$%&()*+,.:;<=>?@^`{|}~\[\]\\]+)/gu;
	function lineOffsets(lines) {
		const offs = [];
		let o = 0;
		for (const l of lines) { offs.push(o); o += l.length + 1; }
		return offs;
	}
	function parseMetadata(text) {
		const cache = {};
		const lines = String(text).split("\n").map((l) => l.replace(/\r$/, ""));
		const offs = lineOffsets(lines);
		const pos = (line, col, endLine, endCol) => ({ start: { line, col, offset: offs[line] + col }, end: { line: endLine, col: endCol, offset: offs[endLine] + endCol } });
		let first = 0;
		const fm = String(text).match(FM);
		if (fm) {
			const fmLines = fm[0].replace(/\r?\n$/, "").split("\n").length;
			try { cache.frontmatter = parseYaml(fm[1]); } catch (err) { console.warn("Harness: could not parse frontmatter", err); cache.frontmatter = {}; }
			cache.frontmatterPosition = pos(0, 0, fmLines - 1, 3);
			first = fmLines;
		}
		const headings = [], listItems = [], tags = [], links = [], embeds = [], sections = [];
		let fence = null, comment = false;
		let list = null; // { start, stack: [{indent, line}], last: item, blankSince }
		let prevBlank = true;
		for (let i = first; i < lines.length; i++) {
			const line = lines[i];
			const fenceM = line.match(/^\s*(```+|~~~+)/);
			if (fence) { if (fenceM && fenceM[1][0] === fence[0] && fenceM[1].length >= fence.length) fence = null; prevBlank = false; continue; }
			if (fenceM) { fence = fenceM[1]; list = null; sections.push({ type: "code", position: pos(i, 0, i, line.length) }); prevBlank = false; continue; }
			const blank = !line.trim();
			// %% comments %% hide what is in them from the index.
			let visible = line;
			if (comment) { const end = visible.indexOf("%%"); if (end < 0) { prevBlank = blank; continue; } visible = " ".repeat(end + 2) + visible.slice(end + 2); comment = false; }
			visible = visible.replace(/%%.*?%%/g, (m) => " ".repeat(m.length));
			const open = visible.indexOf("%%");
			if (open >= 0) { visible = visible.slice(0, open); comment = true; }
			const h = visible.match(/^(#{1,6})[ \t]+(.*?)(?:[ \t]+#+)?[ \t]*$/);
			if (h) {
				headings.push({ heading: h[2], level: h[1].length, position: pos(i, 0, i, line.length) });
				sections.push({ type: "heading", position: pos(i, 0, i, line.length) });
				list = null;
			}
			const li = !h && visible.match(/^([ \t>]*)([-*+]|\d+[.)])(?:[ \t]+|$)(?:\[(.)\](?=[ \t]|$))?/);
			if (li) {
				const indent = li[1].replace(/\t/g, "    ").length;
				if (!list) { list = { start: i, stack: [] }; sections.push({ type: "list", position: pos(i, 0, i, line.length) }); }
				while (list.stack.length && list.stack[list.stack.length - 1].indent >= indent) list.stack.pop();
				const parent = list.stack.length ? list.stack[list.stack.length - 1].line : -list.start;
				const item = { position: pos(i, li[1].length, i, line.length), parent };
				if (li[3] !== undefined) item.task = li[3];
				const block = line.match(/\s\^([\w-]+)\s*$/);
				if (block) item.id = block[1];
				listItems.push(item);
				list.stack.push({ indent, line: i, item });
				list.last = item;
				list.lastIndent = indent;
			} else if (list && !h && !blank) {
				const indent = (line.match(/^[ \t]*/)[0] || "").replace(/\t/g, "    ").length;
				const startsBlock = /^\s*(\||>|#|```|~~~|[-*_]{3,}\s*$)/.test(line);
				if (indent > list.lastIndent || (!prevBlank && !startsBlock)) {
					list.last.position.end = { line: i, col: line.length, offset: offs[i] + line.length };
					sections[sections.length - 1].position.end = list.last.position.end;
				} else {
					list = null;
					sections.push({ type: line.startsWith("|") ? "table" : "paragraph", position: pos(i, 0, i, line.length) });
				}
			} else if (!list && !h && !blank) {
				const last = sections[sections.length - 1];
				if (!prevBlank && last && last.type === "paragraph") last.position.end = { line: i, col: line.length, offset: offs[i] + line.length };
				else sections.push({ type: line.startsWith("|") ? "table" : "paragraph", position: pos(i, 0, i, line.length) });
			}
			if (list && li) sections[sections.length - 1].position.end = { line: i, col: line.length, offset: offs[i] + line.length };
			// Tags, links and embeds (not in inline code).
			const noCode = visible.replace(/`[^`]*`/g, (m) => " ".repeat(m.length));
			const noLinks = noCode.replace(/!?\[\[[^\]]*\]\]|\]\([^)]*\)|https?:\/\/\S+/g, (m) => " ".repeat(m.length));
			const tagText = h ? noLinks.replace(/^#{1,6}[ \t]/, (x) => " ".repeat(x.length)) : noLinks;
			TAG_RE.lastIndex = 0;
			for (let m; (m = TAG_RE.exec(tagText)); ) {
				if (/^\d+$/.test(m[2])) continue;
				const col = m.index + m[1].length;
				tags.push({ tag: "#" + m[2], position: pos(i, col, i, col + m[2].length + 1) });
			}
			for (const lm of noCode.matchAll(/(!?)\[\[([^\]]+)\]\]/g)) {
				const [target, ...alias] = lm[2].split("|");
				const entry = { link: target.trim(), original: lm[0], displayText: alias.length ? alias.join("|") : target.trim(), position: pos(i, lm.index, i, lm.index + lm[0].length) };
				(lm[1] ? embeds : links).push(entry);
			}
			prevBlank = blank;
		}
		if (cache.frontmatter) {
			for (const [k, v] of Object.entries(cache.frontmatter)) {
				const vals = Array.isArray(v) ? v : [v];
				vals.forEach((x) => {
					if (typeof x !== "string") return;
					const lm = x.match(/^(!?)\[\[([^\]]+)\]\]$/);
					if (lm) (cache.frontmatterLinks ||= []).push({ key: k, link: lm[2].split("|")[0], original: x, displayText: lm[2].split("|")[1] || lm[2].split("|")[0] });
				});
			}
		}
		if (headings.length) cache.headings = headings;
		if (listItems.length) cache.listItems = listItems;
		if (tags.length) cache.tags = tags;
		if (links.length) cache.links = links;
		if (embeds.length) cache.embeds = embeds;
		if (sections.length) cache.sections = sections;
		return cache;
	}
	function getAllTags(cache) {
		if (!cache) return null;
		const out = [];
		const fm = cache.frontmatter;
		if (fm) for (const key of ["tags", "tag"]) {
			const v = fm[key];
			const list = v === null || v === undefined ? [] : Array.isArray(v) ? v : String(v).split(/[,\s]+/);
			for (const t of list) if (t !== null && t !== undefined && String(t).trim()) out.push("#" + String(t).trim().replace(/^#/, ""));
		}
		for (const t of cache.tags || []) out.push(t.tag);
		return out;
	}

	// ---------- Markdown → HTML (what MarkdownRenderer.render produces, for the inline things a homepage uses) ----------
	const METABIND_LABELS = { newnote: "New note", newothersermon: "Other sermon", "newsermon-s": "New sermon", "newproject-s": "New project" };
	function renderInline(app, parent, text, sourcePath) {
		const doc = docOf(parent);
		const RE = /(\\[\\`*_{}\[\]()#+\-.!|~=])|(`+)([\s\S]*?[^`])\2(?!`)|(!?)\[\[([^\]]+)\]\]|\[([^\]]+)\]\(([^)\s]+)\)|(\*\*|__)([\s\S]+?)\8|(\*|_)([^\s*_][^*_]*?)\10(?![\w])|==([^=]+)==|~~([^~]+)~~|(^|\s)#([^\s -⁯⸀-⹿'!"#$%&()*+,.:;<=>?@^`{|}~\[\]\\]+)|(https?:\/\/[^\s<]+)|(\n)/gu;
		let last = 0, m;
		const textNode = (s) => { if (s) parent.appendChild(doc.createTextNode(s)); };
		while ((m = RE.exec(text))) {
			textNode(text.slice(last, m.index));
			last = m.index + m[0].length;
			if (m[1]) textNode(m[1].slice(1));
			else if (m[2]) {
				const code = m[3].trim();
				const mb = code.match(/^BUTTON\[([^\]]+)\]$/);
				if (mb) {
					// Meta Bind's inline button (as the plugin draws it in reading view).
					const wrap = doc.createElement("div");
					wrap.className = "mb-button mb-button-inline";
					for (const id of mb[1].split(",").map((s) => s.trim())) {
						const b = doc.createElement("button");
						b.className = "mb-button-inner"; // Meta Bind's "default" button style (mod-cta for primary, mod-warning for destructive, mod-plain for plain)
						b.textContent = METABIND_LABELS[id] || id;
						b.addEventListener("click", () => note("commands", "meta-bind-button:" + id));
						wrap.appendChild(b);
					}
					parent.appendChild(wrap);
				} else {
					const c = doc.createElement("code");
					c.textContent = code;
					parent.appendChild(c);
				}
			} else if (m[5] !== undefined) {
				const [targetRaw, ...aliasParts] = m[5].split("|");
				const target = targetRaw.replace(/\\$/, "");
				const alias = aliasParts.length ? aliasParts.join("|") : null;
				const dest = app.metadataCache.getFirstLinkpathDest(target.split("#")[0], sourcePath || "");
				if (m[4]) {
					const span = doc.createElement("span");
					span.className = "internal-embed";
					span.setAttribute("src", target);
					span.setAttribute("alt", alias || target);
					if (dest && /^(png|jpe?g|gif|webp|svg|avif|bmp)$/i.test(dest.extension)) {
						span.classList.add("media-embed", "image-embed", "is-loaded");
						const img = doc.createElement("img");
						img.src = app.vault.getResourcePath(dest);
						img.alt = alias || "";
						span.appendChild(img);
					} else span.textContent = alias || target;
					parent.appendChild(span);
				} else {
					const a = doc.createElement("a");
					a.className = "internal-link" + (dest ? "" : " is-unresolved");
					a.setAttribute("data-href", target);
					a.setAttribute("href", target);
					a.setAttribute("target", "_blank");
					a.setAttribute("rel", "noopener nofollow");
					a.textContent = alias || target.replace(/#\^?/, " > ").replace(/^ > /, "");
					parent.appendChild(a);
				}
			} else if (m[6] !== undefined) {
				const a = doc.createElement("a");
				const internal = !/^[a-z]+:/i.test(m[7]);
				a.className = internal ? "internal-link" : "external-link";
				a.setAttribute(internal ? "data-href" : "href", decodeURIComponent(m[7]));
				if (!internal) { a.setAttribute("target", "_blank"); a.setAttribute("rel", "noopener nofollow"); }
				else a.setAttribute("href", decodeURIComponent(m[7]));
				renderInline(app, a, m[6], sourcePath);
				parent.appendChild(a);
			} else if (m[8]) { const s = doc.createElement("strong"); renderInline(app, s, m[9], sourcePath); parent.appendChild(s); }
			else if (m[10]) { const s = doc.createElement("em"); renderInline(app, s, m[11], sourcePath); parent.appendChild(s); }
			else if (m[12] !== undefined) { const s = doc.createElement("mark"); renderInline(app, s, m[12], sourcePath); parent.appendChild(s); }
			else if (m[13] !== undefined) { const s = doc.createElement("del"); renderInline(app, s, m[13], sourcePath); parent.appendChild(s); }
			else if (m[15] !== undefined) {
				textNode(m[14]);
				if (/^\d+$/.test(m[15])) { textNode("#" + m[15]); continue; }
				const a = doc.createElement("a");
				a.className = "tag";
				a.setAttribute("href", "#" + m[15]);
				a.setAttribute("target", "_blank");
				a.setAttribute("rel", "noopener nofollow");
				a.textContent = "#" + m[15];
				parent.appendChild(a);
			} else if (m[16]) {
				const a = doc.createElement("a");
				a.className = "external-link";
				a.href = m[16];
				a.textContent = m[16];
				a.setAttribute("target", "_blank");
				a.setAttribute("rel", "noopener nofollow");
				parent.appendChild(a);
			} else if (m[17]) parent.appendChild(doc.createElement("br"));
		}
		textNode(text.slice(last));
	}
	function renderBlocks(app, el, markdown, sourcePath) {
		const doc = docOf(el);
		const lines = String(markdown).replace(/\r/g, "").split("\n");
		let para = [], list = null;
		const flush = () => {
			if (para.length) { const p = doc.createElement("p"); renderInline(app, p, para.join("\n"), sourcePath); el.appendChild(p); }
			para = [];
		};
		for (const line of lines) {
			const h = line.match(/^(#{1,6})\s+(.*)$/);
			const li = line.match(/^\s*(?:[-*+]|\d+[.)])\s+(?:\[(.)\]\s+)?(.*)$/);
			if (!line.trim()) { flush(); list = null; continue; }
			if (h) { flush(); list = null; const n = doc.createElement("h" + h[1].length); renderInline(app, n, h[2], sourcePath); el.appendChild(n); continue; }
			if (li && !(line.trim() === "\\-" || line.trim() === "-")) {
				flush();
				if (!list) { list = doc.createElement("ul"); el.appendChild(list); }
				const item = doc.createElement("li");
				if (li[1] !== undefined) {
					item.className = "task-list-item" + (li[1] !== " " ? " is-checked" : "");
					item.dataset.task = li[1];
					const box = doc.createElement("input");
					box.type = "checkbox";
					box.className = "task-list-item-checkbox";
					box.checked = li[1] !== " ";
					item.appendChild(box);
				}
				renderInline(app, item, li[2], sourcePath);
				list.appendChild(item);
				continue;
			}
			list = null;
			para.push(line);
		}
		flush();
	}
	const MarkdownRenderer = {
		render(app, markdown, el, sourcePath, component) {
			try { renderBlocks(app, el, markdown, sourcePath); } catch (err) { console.error("Harness: markdown render failed", err); }
			return Promise.resolve();
		},
		renderMarkdown(markdown, el, sourcePath, component) { return MarkdownRenderer.render(H.app, markdown, el, sourcePath, component); }
	};

	// ---------- Notice / Modal / Setting ----------
	class Notice {
		constructor(message, duration) {
			const text = message instanceof Node ? message.textContent : String(message);
			note("notices", text);
			let box = document.querySelector("body > .notice-container");
			if (!box) box = document.body.createDiv("notice-container");
			this.noticeEl = box.createDiv("notice");
			this.messageEl = this.noticeEl.createDiv("notice-message");
			if (message instanceof Node) this.messageEl.appendChild(message);
			else this.messageEl.textContent = text;
			this.noticeEl.addEventListener("click", () => this.hide());
			if (duration !== 0) setTimeout(() => this.hide(), duration || 4500);
		}
		setMessage(m) { this.messageEl.setText(m); return this; }
		hide() { this.noticeEl.detach(); }
	}
	class Modal {
		constructor(app) {
			this.app = app;
			this.containerEl = createDiv("modal-container mod-dim");
			this.bgEl = this.containerEl.createDiv("modal-bg");
			this.modalEl = this.containerEl.createDiv("modal");
			this.closeButtonEl = this.modalEl.createDiv("modal-close-button");
			this.headerEl = this.modalEl.createDiv("modal-header");
			this.titleEl = this.headerEl.createDiv("modal-title");
			this.contentEl = this.modalEl.createDiv("modal-content");
			this.shouldRestoreSelection = true;
			this.scope = { register() {}, unregister() {} };
			this.bgEl.addEventListener("click", () => this.close());
			this.closeButtonEl.addEventListener("click", () => this.close());
			this._onKey = (e) => { if (e.key === "Escape") this.close(); };
		}
		open() { document.body.appendChild(this.containerEl); document.addEventListener("keydown", this._onKey); note("events", "modal-open"); this.onOpen(); }
		close() { if (!this.containerEl.isConnected) return; document.removeEventListener("keydown", this._onKey); this.containerEl.detach(); this.onClose(); }
		setTitle(t) { this.titleEl.setText(t); return this; }
		setContent(c) { if (c instanceof Node) this.contentEl.replaceChildren(c); else this.contentEl.setText(c); return this; }
		onOpen() {}
		onClose() {}
	}
	class BaseComponent { constructor() { this.disabled = false; } then(cb) { cb(this); return this; } setDisabled(d) { this.disabled = d; return this; } }
	class ValueComponent extends BaseComponent {
		registerOptionListener(listeners, key) { return this; }
	}
	class AbstractTextComponent extends ValueComponent {
		constructor(inputEl) { super(); this.inputEl = inputEl; }
		getValue() { return this.inputEl.value; }
		setValue(v) { this.inputEl.value = v; return this; }
		setPlaceholder(p) { this.inputEl.placeholder = p; return this; }
		setDisabled(d) { super.setDisabled(d); this.inputEl.disabled = d; return this; }
		onChanged() {}
		onChange(cb) { this.inputEl.addEventListener("input", () => cb(this.getValue())); return this; }
	}
	class TextComponent extends AbstractTextComponent { constructor(containerEl) { super(containerEl.createEl("input", { type: "text", attr: { spellcheck: "false" } })); } }
	class SearchComponent extends AbstractTextComponent { constructor(containerEl) { super(containerEl.createDiv("search-input-container").createEl("input", { type: "search" })); } }
	class TextAreaComponent extends AbstractTextComponent { constructor(containerEl) { super(containerEl.createEl("textarea")); } }
	class ButtonComponent extends BaseComponent {
		constructor(containerEl) { super(); this.buttonEl = containerEl.createEl("button"); }
		setButtonText(t) { this.buttonEl.setText(t); return this; }
		setCta() { this.buttonEl.addClass("mod-cta"); return this; }
		removeCta() { this.buttonEl.removeClass("mod-cta"); return this; }
		setWarning() { this.buttonEl.addClass("mod-warning"); return this; }
		setIcon(icon) { setIcon(this.buttonEl, icon); return this; }
		setTooltip(t) { this.buttonEl.setAttribute("aria-label", t); return this; }
		setClass(c) { this.buttonEl.addClass(c); return this; }
		setDisabled(d) { super.setDisabled(d); this.buttonEl.disabled = d; return this; }
		onClick(cb) { this.buttonEl.addEventListener("click", cb); return this; }
	}
	class ExtraButtonComponent extends BaseComponent {
		constructor(containerEl) { super(); this.extraSettingsEl = containerEl.createDiv("clickable-icon extra-setting-button"); }
		setIcon(icon) { setIcon(this.extraSettingsEl, icon); return this; }
		setTooltip(t) { this.extraSettingsEl.setAttribute("aria-label", t); return this; }
		onClick(cb) { this.extraSettingsEl.addEventListener("click", cb); return this; }
	}
	class ToggleComponent extends ValueComponent {
		constructor(containerEl) { super(); this.toggleEl = containerEl.createDiv("checkbox-container"); this.toggleEl.createEl("input", { type: "checkbox" }); this.value = false; this.toggleEl.addEventListener("click", () => this.setValue(!this.value, true)); this.cbs = []; }
		getValue() { return this.value; }
		setValue(v, fire) { this.value = !!v; this.toggleEl.toggleClass("is-enabled", this.value); if (fire) for (const cb of this.cbs) cb(this.value); return this; }
		setTooltip(t) { this.toggleEl.setAttribute("aria-label", t); return this; }
		onChange(cb) { this.cbs.push(cb); return this; }
	}
	class DropdownComponent extends ValueComponent {
		constructor(containerEl) { super(); this.selectEl = containerEl.createEl("select", "dropdown"); }
		addOption(v, d) { this.selectEl.createEl("option", { value: v, text: d }); return this; }
		addOptions(o) { for (const [v, d] of Object.entries(o)) this.addOption(v, d); return this; }
		getValue() { return this.selectEl.value; }
		setValue(v) { this.selectEl.value = v; return this; }
		onChange(cb) { this.selectEl.addEventListener("change", () => cb(this.getValue())); return this; }
	}
	class SliderComponent extends ValueComponent {
		constructor(containerEl) { super(); this.sliderEl = containerEl.createEl("input", { type: "range", cls: "slider" }); }
		setLimits(min, max, step) { Object.assign(this.sliderEl, { min, max, step }); return this; }
		setDynamicTooltip() { return this; }
		showTooltip() {}
		getValue() { return Number(this.sliderEl.value); }
		setValue(v) { this.sliderEl.value = String(v); return this; }
		onChange(cb) { this.sliderEl.addEventListener("input", () => cb(this.getValue())); return this; }
	}
	class ColorComponent extends ValueComponent {
		constructor(containerEl) { super(); this.colorPickerEl = containerEl.createEl("input", { type: "color" }); }
		getValue() { return this.colorPickerEl.value; }
		setValue(v) { this.colorPickerEl.value = v; return this; }
		onChange(cb) { this.colorPickerEl.addEventListener("input", () => cb(this.getValue())); return this; }
	}
	class Setting {
		constructor(containerEl) {
			this.settingEl = containerEl.createDiv("setting-item");
			this.infoEl = this.settingEl.createDiv("setting-item-info");
			this.nameEl = this.infoEl.createDiv("setting-item-name");
			this.descEl = this.infoEl.createDiv("setting-item-description");
			this.controlEl = this.settingEl.createDiv("setting-item-control");
			this.components = [];
		}
		setName(n) { n instanceof Node ? this.nameEl.replaceChildren(n) : this.nameEl.setText(n); return this; }
		setDesc(d) { d instanceof Node ? this.descEl.replaceChildren(d) : this.descEl.setText(d); return this; }
		setClass(c) { this.settingEl.addClass(c); return this; }
		setTooltip(t) { this.nameEl.title = t; return this; }
		setHeading() { this.settingEl.addClass("setting-item-heading"); return this; }
		setDisabled(d) { this.settingEl.toggleClass("is-disabled", d); return this; }
		add(C, cb) { const c = new C(this.controlEl); this.components.push(c); cb && cb(c); return this; }
		addText(cb) { return this.add(TextComponent, cb); }
		addSearch(cb) { return this.add(SearchComponent, cb); }
		addTextArea(cb) { return this.add(TextAreaComponent, cb); }
		addButton(cb) { return this.add(ButtonComponent, cb); }
		addExtraButton(cb) { return this.add(ExtraButtonComponent, cb); }
		addToggle(cb) { return this.add(ToggleComponent, cb); }
		addDropdown(cb) { return this.add(DropdownComponent, cb); }
		addSlider(cb) { return this.add(SliderComponent, cb); }
		addColorPicker(cb) { return this.add(ColorComponent, cb); }
		addMomentFormat(cb) { return this.add(TextComponent, cb); }
		then(cb) { cb(this); return this; }
		clear() { this.controlEl.empty(); this.components = []; return this; }
	}
	class PluginSettingTab {
		constructor(app, plugin) { this.app = app; this.plugin = plugin; this.containerEl = createDiv("vertical-tab-content"); }
		display() {}
		hide() { this.containerEl.empty(); }
	}
	function setIcon(el, iconId) {
		el.empty();
		const svg = el.createSvg("svg", { attr: { xmlns: "http://www.w3.org/2000/svg", width: 24, height: 24, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", "stroke-width": 2, "stroke-linecap": "round", "stroke-linejoin": "round" }, cls: "svg-icon lucide-" + iconId });
		svg.createSvg("circle", { attr: { cx: 12, cy: 12, r: 8 } });
	}
	class Menu {
		constructor() { this.items = []; this.dom = createDiv("menu"); }
		addItem(cb) { const item = { setTitle(t) { this.title = t; return this; }, setIcon() { return this; }, setSection() { return this; }, setChecked() { return this; }, setDisabled() { return this; }, onClick(f) { this.click = f; return this; } }; cb(item); this.items.push(item); return this; }
		addSeparator() { return this; }
		showAtMouseEvent() { note("events", "menu: " + this.items.map((i) => i.title).join(" | ")); return this; }
		showAtPosition() { return this.showAtMouseEvent(); }
		hide() { return this; }
		onHide() {}
	}
	const normalizePath = (p) => String(p).replace(/\\/g, "/").replace(/\/+/g, "/").replace(/^\/|\/$/g, "").normalize("NFC") || "/";
	const debounce = (fn, wait = 0, resetTimer = false) => {
		let t = null, args;
		const d = function (...a) { args = a; if (t && !resetTimer) return d; clearTimeout(t); t = setTimeout(() => { t = null; fn(...args); }, wait); return d; };
		d.cancel = () => { clearTimeout(t); t = null; return d; };
		d.run = () => { if (t) { clearTimeout(t); t = null; fn(...args); } };
		return d;
	};

	// ---------- The vault ----------
	class Vault extends Events {
		constructor(app) {
			super();
			this.app = app;
			this.configDir = ".obsidian";
			this.root = new TFolder(this, "/");
			this.fileMap = { "/": this.root };
			this.contents = new Map(); // path → text (md and other text files)
			this.binaryUrls = new Map(); // path → URL served by the harness
			this.adapterFiles = new Map(); // non-vault files (.obsidian/…)
			const vault = this;
			this.adapter = {
				basePath: "/harness-vault",
				getName: () => "harness",
				async exists(path) { path = normalizePath(path); return !!vault.fileMap[path] || vault.adapterFiles.has(path) || [...vault.adapterFiles.keys()].some((k) => k.startsWith(path + "/")); },
				async read(path) {
					path = normalizePath(path);
					if (vault.contents.has(path)) return vault.contents.get(path);
					if (vault.adapterFiles.has(path)) return vault.adapterFiles.get(path);
					throw new Error("ENOENT: no such file or directory, open '" + vault.adapter.basePath + "/" + path + "'");
				},
				async write(path, data) {
					path = normalizePath(path);
					note("writes", { op: "adapter.write", path, size: String(data).length });
					const f = vault.fileMap[path];
					if (f instanceof TFile) vault._setText(f, String(data));
					else vault.adapterFiles.set(path, String(data));
				},
				async append(path, data) { const old = (await vault.adapter.exists(path)) ? await vault.adapter.read(path) : ""; return vault.adapter.write(path, old + data); },
				async mkdir(path) { note("writes", { op: "adapter.mkdir", path: normalizePath(path) }); },
				async remove(path) { vault.adapterFiles.delete(normalizePath(path)); },
				async list(path) {
					path = normalizePath(path);
					const pre = path === "/" ? "" : path + "/";
					const all = [...vault.adapterFiles.keys(), ...Object.keys(vault.fileMap)].filter((k) => k.startsWith(pre) && k !== "/");
					const files = new Set(), folders = new Set();
					for (const k of all) { const rest = k.slice(pre.length); if (rest.includes("/")) folders.add(pre + rest.split("/")[0]); else if (vault.fileMap[k] instanceof TFolder) folders.add(k); else files.add(k); }
					return { files: [...files], folders: [...folders] };
				},
				async stat(path) { const f = vault.fileMap[normalizePath(path)]; return f instanceof TFile ? { type: "file", ...f.stat } : f ? { type: "folder" } : null; },
				getResourcePath: (path) => vault._url(normalizePath(path), Date.now())
			};
		}
		_url(path, mtime) { return "http://obsidian.local/vault/" + path.split("/").map(encodeURIComponent).join("/") + "?" + mtime; }
		_folder(path) {
			path = normalizePath(path);
			if (path === "/") return this.root;
			let f = this.fileMap[path];
			if (f instanceof TFolder) return f;
			if (f) throw new Error("A file is in the way of folder " + path);
			const parent = this._folder(path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "/");
			f = new TFolder(this, path);
			f.parent = parent;
			parent.children.push(f);
			this.fileMap[path] = f;
			return f;
		}
		// Add a file without events (the vault as it is at startup).
		_add(path, { text, url, ctime, mtime, size }) {
			path = normalizePath(path);
			const parent = this._folder(path.includes("/") ? path.slice(0, path.lastIndexOf("/")) : "/");
			const f = new TFile(this, path, { ctime: ctime ?? Date.now(), mtime: mtime ?? Date.now(), size: size ?? (text !== undefined ? new Blob([text]).size : 0) });
			f.parent = parent;
			parent.children.push(f);
			this.fileMap[path] = f;
			if (text !== undefined) this.contents.set(path, text);
			if (url) this.binaryUrls.set(path, url);
			if (f.extension === "md") this.app.metadataCache._index(f, text || "");
			return f;
		}
		_setText(file, text) {
			this.contents.set(file.path, text);
			file.stat = { ...file.stat, mtime: Math.max(Date.now(), file.stat.mtime + 1), size: new Blob([text]).size };
			this.trigger("modify", file);
			if (file.extension === "md") this.app.metadataCache._reindex(file, text);
		}
		getName() { return "harness-vault"; }
		getRoot() { return this.root; }
		getAbstractFileByPath(path) {
			if (path === null || path === undefined) return null;
			const p = String(path).replace(/^\/+|\/+$/g, "") || "/";
			return this.fileMap[p] || this.fileMap[p.normalize("NFC")] || null;
		}
		getFileByPath(path) { const f = this.getAbstractFileByPath(path); return f instanceof TFile ? f : null; }
		getFolderByPath(path) { const f = this.getAbstractFileByPath(path); return f instanceof TFolder ? f : null; }
		getAllLoadedFiles() { return Object.values(this.fileMap); }
		getAllFolders(includeRoot) { return Object.values(this.fileMap).filter((f) => f instanceof TFolder && (includeRoot || f !== this.root)); }
		getFiles() { return Object.values(this.fileMap).filter((f) => f instanceof TFile); }
		getMarkdownFiles() { return this.getFiles().filter((f) => f.extension === "md"); }
		async read(file) { return this.cachedRead(file); }
		async cachedRead(file) {
			if (!this.contents.has(file.path)) throw new Error("Harness: no text for " + file.path);
			return this.contents.get(file.path);
		}
		async readBinary(file) { const r = await fetch(this.binaryUrls.get(file.path) || this.getResourcePath(file)); return r.arrayBuffer(); }
		getResourcePath(file) { return this._url(file.path, file.stat.mtime); }
		async process(file, fn) {
			const before = this.contents.get(file.path) ?? "";
			const after = fn(before);
			note("writes", { op: "process", path: file.path, changed: after !== before });
			if (after !== before) this._setText(file, after);
			return after;
		}
		async modify(file, data) { note("writes", { op: "modify", path: file.path }); this._setText(file, data); }
		async append(file, data) { return this.modify(file, (this.contents.get(file.path) ?? "") + data); }
		async create(path, data) {
			path = normalizePath(path);
			if (this.fileMap[path]) throw new Error("File already exists.");
			note("writes", { op: "create", path });
			const f = this._add(path, { text: data, ctime: Date.now(), mtime: Date.now() });
			this.trigger("create", f);
			return f;
		}
		async createFolder(path) {
			path = normalizePath(path);
			if (this.fileMap[path]) throw new Error("Folder already exists.");
			note("writes", { op: "createFolder", path });
			const f = this._folder(path);
			this.trigger("create", f);
			return f;
		}
		async delete(file) { note("writes", { op: "delete", path: file.path }); this._remove(file); }
		async trash(file) { note("writes", { op: "trash", path: file.path }); this._remove(file); }
		_remove(file) {
			if (file.parent) file.parent.children = file.parent.children.filter((c) => c !== file);
			delete this.fileMap[file.path];
			this.contents.delete(file.path);
			this.trigger("delete", file);
			if (file.extension === "md") this.app.metadataCache._forget(file);
		}
		async rename(file, newPath) { note("writes", { op: "rename", path: file.path, to: newPath }); const text = this.contents.get(file.path); this._remove(file); return this.create(newPath, text); }
	}

	class MetadataCache extends Events {
		constructor(app) { super(); this.app = app; this.byPath = new Map(); this.resolvedLinks = {}; this.unresolvedLinks = {}; }
		_index(file, text) { this.byPath.set(file.path, parseMetadata(text)); }
		_reindex(file, text) {
			const cache = parseMetadata(text);
			this.byPath.set(file.path, cache);
			setTimeout(() => {
				this.trigger("changed", file, text, cache);
				this.trigger("resolve", file);
				this.trigger("resolved");
			}, 0);
		}
		_forget(file) { const prev = this.byPath.get(file.path); this.byPath.delete(file.path); setTimeout(() => this.trigger("deleted", file, prev), 0); }
		getFileCache(file) { return file ? this.byPath.get(file.path) || null : null; }
		getCache(path) { return this.byPath.get(path) || null; }
		getFirstLinkpathDest(linkpath, sourcePath) {
			let p = String(linkpath ?? "").split("#")[0].split("|")[0].trim().normalize("NFC");
			const vault = this.app.vault;
			if (!p) return vault.getFileByPath(sourcePath) || null;
			p = p.replace(/^\.\//, "").replace(/^\/+/, "");
			const files = vault.getFiles();
			const low = p.toLowerCase();
			const exact = files.find((f) => f.path.toLowerCase() === low) || files.find((f) => f.path.toLowerCase() === low + ".md");
			if (exact) return exact;
			const hits = files.filter((f) => {
				const fp = f.path.toLowerCase();
				return fp.endsWith("/" + low) || fp.endsWith("/" + low + ".md");
			});
			if (!hits.length) return null;
			const srcFolder = String(sourcePath || "").includes("/") ? sourcePath.slice(0, sourcePath.lastIndexOf("/")) : "";
			return hits.find((f) => (f.parent?.path === "/" ? "" : f.parent?.path) === srcFolder) || hits.sort((a, b) => a.path.length - b.path.length)[0];
		}
		fileToLinktext(file, sourcePath, omitMdExtension = true) { return omitMdExtension && file.extension === "md" ? file.basename : file.name; }
		getBacklinksForFile() { return { data: new Map() }; }
		getTags() { const out = {}; for (const c of this.byPath.values()) for (const t of getAllTags(c) || []) out[t] = (out[t] || 0) + 1; return out; }
	}

	class Workspace extends Events {
		constructor(app) { super(); this.app = app; this.layoutReady = true; this.activeLeaf = null; this.containerEl = document.body; }
		onLayoutReady(cb) { cb(); }
		async openLinkText(linktext, sourcePath, newLeaf, state) { note("opened", { linktext, sourcePath, newLeaf: newLeaf || false }); }
		getLeaf(newLeaf) {
			const ws = this;
			return { view: null, async openFile(file, state) { note("opened", { file: file.path, newLeaf: newLeaf || false }); }, async setViewState(s) { note("opened", { viewState: s }); }, getViewState() { return {}; }, detach() {} };
		}
		getActiveFile() { return this.app.vault.getFileByPath(H.homePath || "Homepage.md"); }
		getActiveViewOfType() { return null; }
		getLeavesOfType() { return []; }
		iterateAllLeaves() {}
		iterateRootLeaves() {}
		getMostRecentLeaf() { return null; }
		requestSaveLayout() {}
		revealLeaf() { return Promise.resolve(); }
	}

	class Plugin extends Component {
		constructor(app, manifest) { super(); this.app = app; this.manifest = manifest; this._settingTabs = []; this._commands = []; }
		async loadData() { return H.data === undefined || H.data === null ? null : JSON.parse(JSON.stringify(H.data)); }
		async saveData(data) { H.data = JSON.parse(JSON.stringify(data)); note("writes", { op: "saveData", path: this.manifest.dir + "/data.json" }); }
		addSettingTab(tab) { this._settingTabs.push(tab); H.settingTabs = this._settingTabs; }
		addCommand(cmd) { this._commands.push(cmd); this.app.commands.commands[this.manifest.id + ":" + cmd.id] = cmd; return cmd; }
		addRibbonIcon(icon, title, cb) { const el = createDiv("side-dock-ribbon-action clickable-icon"); el.setAttribute("aria-label", title); el.addEventListener("click", cb); return el; }
		addStatusBarItem() { return createDiv("status-bar-item"); }
		registerMarkdownCodeBlockProcessor(language, handler, sortOrder) {
			const reg = (H.codeBlockProcessors ||= {});
			reg[language] = handler;
			this.register(() => { if (reg[language] === handler) delete reg[language]; });
			return handler;
		}
		registerMarkdownPostProcessor(fn) { (H.postProcessors ||= []).push(fn); return fn; }
		registerView() {}
		registerExtensions() {}
		registerEditorExtension() {}
		registerEditorSuggest() {}
		registerObsidianProtocolHandler() {}
		registerHoverLinkSource() {}
		removeCommand() {}
	}

	function createApp() {
		const app = {};
		app.vault = new Vault(app);
		app.metadataCache = new MetadataCache(app);
		app.workspace = new Workspace(app);
		app.fileManager = {
			async processFrontMatter(file, fn) {
				const text = app.vault.contents.get(file.path) ?? "";
				const m = text.match(FM);
				const fm = m ? parseYaml(m[1]) : {};
				fn(fm);
				const yaml = stringifyYaml(fm);
				const next = m ? "---\n" + yaml + "---\n" + text.slice(m[0].length) : "---\n" + yaml + "---\n" + text;
				note("writes", { op: "processFrontMatter", path: file.path, frontmatter: fm });
				if (next !== text) app.vault._setText(file, next);
			},
			generateMarkdownLink(file) { return "[[" + file.basename + "]]"; },
			getNewFileParent() { return app.vault.root; },
			async renameFile(file, to) { return app.vault.rename(file, to); },
			async trashFile(file) { return app.vault.trash(file); }
		};
		app.plugins = { plugins: {}, manifests: {}, enabledPlugins: new Set(), getPlugin(id) { return this.plugins[id] || null; } };
		app.internalPlugins = { plugins: {}, getPluginById() { return null; }, getEnabledPluginById() { return null; } };
		app.commands = { commands: {}, executeCommandById(id) { note("commands", id); return false; }, listCommands() { return Object.values(this.commands); } };
		const local = (H.localStorage = H.localStorage || {});
		app.loadLocalStorage = (key) => (key in local ? local[key] : null);
		app.saveLocalStorage = (key, value) => { if (value === null || value === undefined) delete local[key]; else local[key] = value; note("writes", { op: "saveLocalStorage", key }); };
		app.setting = { open() { note("events", "settings-open"); }, openTabById() {} };
		app.keymap = { pushScope() {}, popScope() {} };
		app.scope = { register() {}, unregister() {} };
		app.isMobile = false;
		app.appId = "harness";
		// Templater, as far as homepages use it: a new note from a template, in a folder.
		app.plugins.plugins["templater-obsidian"] = {
			templater: {
				async create_new_note_from_template(template, folder, filename, open) {
					const text = template instanceof TFile ? await app.vault.read(template) : String(template || "");
					const base = (folder && folder.path && folder.path !== "/" ? folder.path + "/" : "") + (filename || "Untitled");
					let path = base + ".md";
					for (let i = 1; app.vault.getAbstractFileByPath(path); i++) path = base + " " + i + ".md";
					const f = await app.vault.create(path, text.replace(/<%[\s\S]*?%>/g, ""));
					note("events", "templater: " + path);
					if (open) await app.workspace.getLeaf(false).openFile(f);
					return f;
				}
			}
		};
		app.plugins.enabledPlugins.add("templater-obsidian");
		return app;
	}

	const Platform = { isDesktop: true, isMobile: false, isDesktopApp: true, isMobileApp: false, isIosApp: false, isAndroidApp: false, isPhone: false, isTablet: false, isMacOS: false, isWin: true, isLinux: false, isSafari: false, resourcePathPrefix: "http://obsidian.local/vault/" };
	const apiVersion = "1.8.10";
	const moduleExports = {
		Plugin, PluginSettingTab, Setting, Component, MarkdownRenderChild, MarkdownRenderer, Modal, Notice, Menu, Events,
		TAbstractFile, TFile, TFolder, getAllTags, parseYaml, stringifyYaml, normalizePath, setIcon, debounce, Platform, apiVersion,
		ButtonComponent, TextComponent, TextAreaComponent, ToggleComponent, DropdownComponent, SliderComponent, ExtraButtonComponent, ColorComponent, SearchComponent, ValueComponent, BaseComponent,
		Keymap: { isModEvent: (e) => !!(e && (e.ctrlKey || e.metaKey)), isModifier: (e, m) => !!(e && e[m.toLowerCase() + "Key"]) },
		Scope: class { register() {} unregister() {} },
		requestUrl: async () => { throw new Error("Harness: no network"); },
		sanitizeHTMLToDom: (html) => { const t = document.createElement("template"); t.innerHTML = html; return t.content; },
		htmlToMarkdown: (h) => String(h),
		addIcon() {}, getIcon() { return null; }
	};
	// Anything the plugin asks "obsidian" for that the mock lacks is recorded (and comes back undefined, as it would fail).
	const IGNORED = new Set(["__esModule", "default", "then", "toJSON", "constructor", "prototype", "inspect", "nodeType", "$$typeof"]);
	const obsidian = new Proxy(moduleExports, {
		get(t, k) {
			if (typeof k === "string" && !(k in t) && !IGNORED.has(k) && !log.missing.includes(k)) { log.missing.push(k); console.warn("Harness: the plugin used obsidian." + k + ", which the mock does not provide"); }
			return t[k];
		}
	});
	window.Notice = Notice; // Obsidian exposes it globally too (the top bar and task panel use globalThis.Notice)
	H.obsidian = obsidian;
	H.mock = { createApp, parseMetadata, parseYaml, stringifyYaml, getAllTags, renderBlocks, TFile, TFolder, Component, Events };
})();
