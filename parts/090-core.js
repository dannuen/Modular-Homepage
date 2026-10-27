// src/core.ts
var NS = "http://www.w3.org/2000/svg";
var ICONS = {
  plus: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  arrow: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
  left: '<path d="m15 18-6-6 6-6"/>',
  right: '<path d="m9 18 6-6-6-6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  book: '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/>',
  church: '<path d="M10 9h4"/><path d="M12 7v5"/><path d="M14 22v-4a2 2 0 0 0-4 0v4"/><path d="M18 22V5.618a1 1 0 0 0-.553-.894l-4.553-2.277a2 2 0 0 0-1.788 0L6.553 4.724A1 1 0 0 0 6 5.618V22"/><path d="m18 7 3.447 1.724a1 1 0 0 1 .553.894V20a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2v-10.382a1 1 0 0 1 .553-.894L6 7"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h18"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  note: '<path d="M16 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V8Z"/><path d="M15 3v4a2 2 0 0 0 2 2h4"/>',
  sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2"/><path d="M12 20v2"/><path d="m4.93 4.93 1.41 1.41"/><path d="m17.66 17.66 1.41 1.41"/><path d="M2 12h2"/><path d="M20 12h2"/><path d="m6.34 17.66-1.41 1.41"/><path d="m19.07 4.93-1.41 1.41"/>',
  sunset: '<path d="M12 10V2"/><path d="m4.93 10.93 1.41 1.41"/><path d="M2 18h2"/><path d="M20 18h2"/><path d="m19.07 10.93-1.41 1.41"/><path d="M22 22H2"/><path d="m16 6-4 4-4-4"/><path d="M16 18a4 4 0 0 0-8 0"/>',
  moon: '<path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  grip: '<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
  eyeOff: '<path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49"/><path d="M14.084 14.158a3 3 0 0 1-4.242-4.242"/><path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143"/><path d="m2 2 20 20"/>',
  layout: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  palette: '<circle cx="13.5" cy="6.5" r=".5" fill="currentColor"/><circle cx="17.5" cy="10.5" r=".5" fill="currentColor"/><circle cx="8.5" cy="7.5" r=".5" fill="currentColor"/><circle cx="6.5" cy="12.5" r=".5" fill="currentColor"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/>',
  reset: '<path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/>',
  x: '<path d="M18 6 6 18"/><path d="m6 6 12 12"/>',
  gear: '<path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>',
  copy: '<rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/>',
  pencil: '<path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"/><path d="m15 5 4 4"/>',
  trash: '<path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/>',
  star: '<path d="M11.525 2.295a.53.53 0 0 1 .95 0l2.31 4.679a2.123 2.123 0 0 0 1.595 1.16l5.166.756a.53.53 0 0 1 .294.904l-3.736 3.638a2.123 2.123 0 0 0-.611 1.878l.882 5.14a.53.53 0 0 1-.771.56l-4.618-2.428a2.122 2.122 0 0 0-1.973 0L6.396 21.01a.53.53 0 0 1-.77-.56l.881-5.139a2.122 2.122 0 0 0-.611-1.879L2.16 9.795a.53.53 0 0 1 .294-.906l5.165-.755a2.122 2.122 0 0 0 1.597-1.16z"/>',
  sliders: '<path d="M21 4h-7"/><path d="M10 4H3"/><path d="M21 12h-9"/><path d="M8 12H3"/><path d="M21 20h-5"/><path d="M12 20H3"/><path d="M14 2v4"/><path d="M8 10v4"/><path d="M16 18v4"/>',
  burst: '<path d="M15.00 12.00L23.00 12.00M14.85 12.93L22.46 15.40M14.43 13.76L20.90 18.47M13.76 14.43L18.47 20.90M12.93 14.85L15.40 22.46M12.00 15.00L12.00 23.00M11.07 14.85L8.60 22.46M10.24 14.43L5.53 20.90M9.57 13.76L3.10 18.47M9.15 12.93L1.54 15.40M9.00 12.00L1.00 12.00M9.15 11.07L1.54 8.60M9.57 10.24L3.10 5.53M10.24 9.57L5.53 3.10M11.07 9.15L8.60 1.54M12.00 9.00L12.00 1.00M12.93 9.15L15.40 1.54M13.76 9.57L18.47 3.10M14.43 10.24L20.90 5.53M14.85 11.07L22.46 8.60"/>',
  lighthouse: '<path d="m9 5 3-2.5L15 5"/><rect x="9" y="5" width="6" height="4" rx="0.5"/><path d="M9.6 9 8.2 21h7.6L14.4 9"/><path d="M8.9 15h6.2"/><path d="M5 21h14"/><path d="M6 6 3 5"/><path d="M6 8 3 9"/><path d="m18 6 3-1"/><path d="m18 8 3 1"/>',
  start: '<path d="M3 5v14"/><path d="M21 12H7"/><path d="m15 18 6-6-6-6"/>',
  timer: '<path d="M10 2h4"/><path d="m12 14 3-3"/><circle cx="12" cy="14" r="8"/>',
  hash: '<path d="M4 9h16"/><path d="M4 15h16"/><path d="M10 3 8 21"/><path d="m16 3-2 18"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  list: '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
  todo: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="m9 12 2 2 4-4"/>',
  event: '<path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/>'
};
var svgOf = (name, w = 2) => '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="' + w + '" stroke-linecap="round" stroke-linejoin="round">' + (ICONS[name] || "") + "</svg>";
var DATE_FORMAT = "MMMM dd, yyyy";
var DATETIME_FORMAT = "h:mm a - MMMM dd, yyyy";
var NULL_AS = "\\-";
async function compactMarkdown(app, markdown, container, sourcePath, component) {
  const sub = container.createSpan();
  await import_obsidian2.MarkdownRenderer.render(app, markdown, sub, sourcePath, component);
  const paragraph = sub.querySelector(":scope > p");
  if (sub.children.length === 1 && paragraph) {
    while (paragraph.firstChild) sub.appendChild(paragraph.firstChild);
    sub.removeChild(paragraph);
  }
}
async function renderValue(app, value, container, sourcePath, component, context = "root", depth = 0) {
  if (depth > 4) {
    container.appendText("...");
    return;
  }
  if (value === null || value === void 0) await compactMarkdown(app, NULL_AS, container, sourcePath, component);
  else if (DateTime.isDateTime(value)) container.appendText(value.toLocal().toFormat(value.second === 0 && value.minute === 0 && value.hour === 0 ? DATE_FORMAT : DATETIME_FORMAT, { locale: navigator.language }));
  else if (Duration.isDuration(value)) container.appendText(value.shiftTo("years", "months", "weeks", "days", "hours", "minutes", "seconds").normalize().toHuman());
  else if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") await compactMarkdown(app, "" + value, container, sourcePath, component);
  else if (isLink(value)) await compactMarkdown(app, value.markdown(), container, sourcePath, component);
  else if (value instanceof HTMLElement) container.appendChild(value);
  else if (Array.isArray(value)) {
    const list2 = container.createEl("ul", { cls: ["dataview", "dataview-ul", context === "list" ? "dataview-result-list-ul" : "dataview-result-list-root-ul"] });
    for (const child of value) await renderValue(app, child, list2.createEl("li", { cls: "dataview-result-list-li" }), sourcePath, component, "list", depth + 1);
  } else if (typeof value === "object") {
    const list2 = container.createEl("ul", { cls: ["dataview", "dataview-ul", "dataview-result-object-ul"] });
    for (const [key, v] of Object.entries(value)) {
      const li = list2.createEl("li", { cls: ["dataview", "dataview-li", "dataview-result-object-li"] });
      li.appendText(key + ": ");
      await renderValue(app, v, li, sourcePath, component, "list", depth + 1);
    }
  } else container.appendText(String(value));
}
// render(parent, md, cls) tied to one component, so the markdown it draws is released with it (core and the top bar).
var renderWith = (app, doc, sourcePath, component) => (parent, md, cls = "hp-value") => {
  const node = doc.createElement("span");
  node.classList.add(...cls.split(/\s+/).filter(Boolean));
  renderValue(app, md, node, sourcePath, component).catch((err) => console.error("Modular Homepage: could not draw a value", err));
  if (parent) parent.append(node);
  return node;
};
// The one way Calendar, the top bar, Tasks and the focus log find or make a day's note: Templater is optional (empty note).
var dailyNotePath = (cfg, d) => cfg.dailyFolder.replace(/\/+$/, "") + "/" + d.setLocale("en").toFormat("yyyy/MM-LLLL/yyyy-MM-dd") + ".md";
async function dailyNote(app, cfg, d) {
  const path = dailyNotePath(cfg, d), folder = path.slice(0, path.lastIndexOf("/"));
  let file = app.vault.getAbstractFileByPath(path);
  if (file) return file;
  if (!app.vault.getAbstractFileByPath(folder)) await app.vault.createFolder(folder);
  const templater = app.plugins?.plugins?.["templater-obsidian"]?.templater;
  const template = app.vault.getAbstractFileByPath(cfg.dailyTemplate);
  if (templater && template instanceof import_obsidian2.TFile) file = await templater.create_new_note_from_template(template, app.vault.getAbstractFileByPath(folder), d.toFormat("yyyy-MM-dd"), false);
  return app.vault.getAbstractFileByPath(path) || file || await app.vault.create(path, "");
}
function makeCore(env) {
  const { app, vault } = env;
  const doc = env.doc;
  const C = env.config;
  function el(parent, tag, cls, text) {
    const node = doc.createElement(tag);
    if (cls) node.className = cls;
    if (text !== void 0 && text !== null) node.textContent = text;
    if (parent) parent.append(node);
    return node;
  }
  function svg(parent, tag, attrs = {}, cls) {
    const node = doc.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    if (cls) node.setAttribute("class", cls);
    if (parent) parent.append(node);
    return node;
  }
  function icon(parent, name, cls = "hp-ico") {
    const s2 = el(parent, "span", cls);
    s2.setAttribute("aria-hidden", "true");
    s2.innerHTML = svgOf(name);
    return s2;
  }
  function button(parent, cls, iconName, label, title, onClick) {
    const b = el(parent, "button", cls);
    b.type = "button";
    if (iconName) icon(b, iconName);
    if (label) el(b, "span", "", label);
    if (title) {
      b.title = title;
      b.setAttribute("aria-label", title);
    }
    if (onClick) b.addEventListener("click", onClick);
    return b;
  }
  const linkWith = (render2) => (parent, target, label, cls = "hp-link") => render2(parent, Link.file(target, false, label), cls);
  function heading(parent, level, cls, text) {
    const h = el(parent, "div", cls, text);
    h.setAttribute("role", "heading");
    h.setAttribute("aria-level", String(level));
    return h;
  }
  function section(parent, title, note) {
    const head = el(parent, "div", "hp-sec");
    heading(head, 2, "hp-sec-title", title);
    if (note) el(head, "span", "hp-sec-note", note);
    return el(head, "div", "hp-sec-aside");
  }
  // A module's tool row, the first thing inside its card: a short label on the left (a count, the month, a status) and
  // the module's buttons on the right, so nothing sits outside the card. With float, the buttons lie over the card's
  // top-right corner instead of taking a row (for cards whose corner is free). Returns { row, label, tools }.
  function bar(card, { label = "", float = false } = {}) {
    card.classList.add("hp-has-bar");
    const row = el(null, "div", "hp-bar" + (float ? " is-float" : ""));
    card.prepend(row);
    const text = el(row, "span", "hp-bar-label", label || "");
    const tools = el(row, "div", "hp-bar-tools");
    return { row, label: text, tools };
  }
  function textOf(v) {
    if (v === null || v === void 0) return "";
    if (Array.isArray(v)) return v.map(textOf).filter(Boolean).join(" · ");
    if (typeof v === "object" && typeof v.path === "string") return v.display || v.path.split("/").pop().replace(/\.md$/i, "");
    return String(v).trim();
  }
  function asLink(node, label, onOpen) {
    node.setAttribute("role", "link");
    node.setAttribute("tabindex", "0");
    node.setAttribute("aria-label", label);
    node.addEventListener("click", (e) => {
      if (e.target.closest("a")) return;
      e.stopPropagation();
      onOpen(e.ctrlKey || e.metaKey);
    });
    node.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target === node) onOpen(e.ctrlKey || e.metaKey);
    });
  }
  function toggle(parent, checked, label, title, onChange) {
    const sw = el(parent, "label", "hp-switch");
    const input = el(sw, "input", "");
    input.type = "checkbox";
    input.checked = checked;
    el(sw, "span", "hp-switch-track");
    el(sw, "span", "", label);
    if (title) sw.title = title;
    input.addEventListener("change", () => onChange(input.checked, input));
    return input;
  }
  function meter(parent, pct, cls = "") {
    const m = el(parent, "div", ("hp-meter hp-track " + cls).trim());
    el(m, "i", "hp-meter-fill").style.width = Math.max(0, Math.min(100, pct)) + "%";
    return m;
  }
  function ring(parent, pct, size, stroke, label = "", cls = "", sub = "") {
    const wrap = el(parent, "div", ("hp-ring " + cls).trim());
    wrap.style.width = wrap.style.height = size + "px";
    const s2 = svg(wrap, "svg", { width: size, height: size, viewBox: "0 0 " + size + " " + size });
    const r = (size - stroke) / 2, c = 2 * Math.PI * r, p = Math.max(0, Math.min(100, pct || 0));
    for (const [k, dash] of [["hp-ring-track", c], ["hp-ring-fill", c * p / 100]]) {
      if (!dash) continue;
      svg(s2, "circle", { cx: size / 2, cy: size / 2, r, fill: "none", "stroke-width": stroke, "stroke-linecap": "round", "stroke-dasharray": dash + " " + c }, k);
    }
    if (label || sub) {
      const l2 = el(wrap, "div", "hp-ring-label");
      if (label) el(l2, "b", "", label);
      if (sub) el(l2, "span", "", sub);
    }
    return wrap;
  }
  function mesh(node, seed, dark = true) {
    let h = 0;
    for (const ch of seed || "?") h = h * 31 + ch.charCodeAt(0) >>> 0;
    const spot = (k) => [(h >>> k * 3) % 100, (h >>> k * 5 + 1) % 100];
    const [x1, y1] = spot(1), [x2, y2] = spot(2), [x3, y3] = spot(3);
    const shift = h % 20 - 10;
    node.style.backgroundImage = [
      "radial-gradient(at " + x1 + "% " + y1 + "%, hsl(calc(var(--accent-h) + " + shift + ") 80% 62%) 0, transparent 55%)",
      "radial-gradient(at " + x2 + "% " + y2 + "%, hsl(calc(var(--accent-h) + " + (12 + shift) + ") 60% 42%) 0, transparent 55%)",
      dark ? "linear-gradient(135deg, hsl(var(--accent-h) 45% 22%), hsl(var(--accent-h) 40% 10%))" : "radial-gradient(at " + x3 + "% " + y3 + "%, hsl(calc(var(--accent-h) - " + (12 - shift) + ") 45% 26%) 0, transparent 60%)"
    ].join(", ");
    return node;
  }
  function cover(parent, church, cls = "", dark = true) {
    const src = photoOf(church);
    if (src) {
      const img = el(parent, "img", ("hp-cover " + cls).trim());
      img.src = src;
      img.alt = "";
      img.decoding = "async";
      return img;
    }
    return mesh(el(parent, "div", ("hp-cover hp-mesh " + cls).trim()), church, dark);
  }
  function tip(node, text) {
    const box = env.tipBox, root = env.root;
    if (!box || !root) {
      node.title = typeof text === "function" ? text() : text;
      return;
    }
    const move = (e) => {
      const r = root.getBoundingClientRect(), half = Math.min(130, r.width / 2);
      box.style.left = Math.max(half, Math.min(r.width - half, e.clientX - r.left)) + "px";
      box.style.top = e.clientY - r.top + "px";
    };
    node.addEventListener("pointerenter", (e) => {
      box.textContent = typeof text === "function" ? text() : text;
      box.classList.add("is-on");
      move(e);
    });
    node.addEventListener("pointermove", move);
    node.addEventListener("pointerleave", () => box.classList.remove("is-on"));
  }
  function settings(parent, gear, life, title, onClose) {
    const box = el(parent, "div", "hp-set");
    box.hidden = true;
    box.setAttribute("role", "dialog");
    box.setAttribute("aria-label", title);
    el(box, "div", "hp-set-title", title);
    gear.setAttribute("aria-expanded", "false");
    const show = (open) => {
      box.hidden = !open;
      gear.classList.toggle("is-open", open);
      gear.setAttribute("aria-expanded", String(open));
    };
    const close = (revert = true) => {
      if (box.hidden) return;
      show(false);
      if (revert) onClose();
      box.dispatchEvent(new Event("hp-set-closed", { bubbles: true }));
    };
    gear.addEventListener("click", () => box.hidden ? show(true) : close());
    life.on(doc, "pointerdown", (e) => {
      if (!box.hidden && !box.contains(e.target) && !gear.contains(e.target)) close();
    }, true);
    life.on(doc, "keydown", (e) => {
      if (e.key === "Escape" && !box.hidden) {
        close();
        gear.focus();
      }
    });
    const row = (label, hint) => {
      const r = el(box, "div", "hp-set-row");
      const l2 = el(r, "span", "hp-set-label", label);
      if (hint) l2.title = hint;
      return el(r, "div", "hp-set-ctl");
    };
    function chips(ctl, options, get, set) {
      const list2 = options.map(([v, label, hint]) => [v, button(ctl, "hp-set-chip", "", label, hint || label, () => set(v))]);
      return () => {
        for (const [v, b] of list2) {
          b.classList.toggle("is-on", get() === v);
          b.setAttribute("aria-pressed", String(get() === v));
        }
      };
    }
    function color(ctl, label, start, set) {
      const i = el(ctl, "input", "hp-set-color");
      i.type = "color";
      i.title = label;
      i.setAttribute("aria-label", label);
      i.value = start;
      i.addEventListener("input", () => set(i.value));
      return (v) => {
        if (/^#[0-9a-f]{6}$/i.test(v)) i.value = v;
      };
    }
    function slider(label, set) {
      const wrap = el(box, "div", "hp-set-slider");
      const head = el(wrap, "div", "hp-set-row");
      el(head, "span", "hp-set-label", label);
      const out = el(head, "span", "hp-set-value");
      const i = el(wrap, "input", "hp-set-range");
      Object.assign(i, { type: "range", min: "0", max: "100", step: "1" });
      i.setAttribute("aria-label", label);
      i.addEventListener("input", () => set(Number(i.value)));
      return (v) => {
        i.value = String(v);
        out.textContent = v + "%";
      };
    }
    function tile(grid, label, src, onPick, filter) {
      const b = button(grid, "hp-set-tile", "", "", label, onPick);
      if (src) {
        const img = el(b, "img", "");
        Object.assign(img, { src, alt: "", loading: "lazy", decoding: "async" });
        if (filter) img.style.filter = filter;
      }
      if (!src || filter) el(b, "span", "", label);
      return b;
    }
    function actions(onReset, onSave) {
      const a = el(box, "div", "hp-set-acts");
      button(a, "hp-btn hp-pill", "", "Reset", "Back to the default look", onReset);
      button(a, "hp-btn hp-accent", "", "Save", "Save to Homepage's properties", onSave);
    }
    return { box, close, row, chips, color, slider, tiles: (cls) => el(box, "div", ("hp-set-tiles " + (cls || "")).trim()), tile, actions };
  }
  const IMAGE_EXT = ["png", "jpg", "jpeg", "webp", "gif", "avif", "bmp", "svg"];
  const fmtNum = (n2) => Number(n2).toLocaleString("en-US");
  const plural = (n2, one, many) => fmtNum(n2) + " " + (n2 === 1 ? one : many);
  function toDate(field) {
    if (field === null || field === void 0 || field === "") return null;
    try {
      let input = field;
      if (typeof field.path === "string") input = field.path.split("/").pop().replace(/\.md$/i, "");
      else if (typeof field === "string") {
        const wiki = field.match(/^\[\[([^|\]]+)(?:\|[^\]]*)?\]\]$/);
        if (wiki) input = wiki[1].split("/").pop().replace(/\.md$/i, "");
        else if (/^\d{4}-\d{2}-\d{2}\s/.test(field)) input = field.slice(0, 10); // the Linter's "2026-10-02 09:00 AM"
      }
      const parsed = DateTime.isDateTime(input) ? input : toDateTime(input);
      return parsed && parsed.isValid ? parsed.toLocal().startOf("day") : null;
    } catch {
      return null;
    }
  }
  const todayNow = () => toDate(toDateTime("today"));
  const today = todayNow();
  const daysUntil = (d) => Math.round(d.diff(today, "days").days);
  const nowMinutes = () => {
    const n2 = /* @__PURE__ */ new Date();
    return n2.getHours() * 60 + n2.getMinutes();
  };
  const PERIODS = {
    morning: { label: "Morning", minutes: 8 * 60, icon: "sun" },
    afternoon: { label: "Afternoon", minutes: 14 * 60, icon: "sunset" },
    evening: { label: "Evening", minutes: 19 * 60, icon: "moon" }
  };
  const PERIOD_WORDS = { morning: "morning", "sáng": "morning", afternoon: "afternoon", "chiều": "afternoon", "trưa": "afternoon", evening: "evening", night: "evening", "tối": "evening" };
  function parseTime(raw) {
    if (typeof raw === "string") {
      const parts = raw.split(/\s*[-–—]\s*/);
      if (parts.length === 2) {
        const a = parseTime(parts[0]), b = parseTime(parts[1]);
        if (!a?.clock || !b?.clock || b.minutes <= a.minutes) return null;
        return { ...a, end: b.minutes, endClock: b.clock, length: b.minutes - a.minutes };
      }
    }
    if (raw === null || raw === void 0 || raw === "") return null;
    let minutes = null;
    if (typeof raw === "number") {
      // Unquoted YAML: 9 or 19.30 is an hour (19.3), 19:30 can arrive as minutes (1170).
      if (raw >= 0 && raw < 24) return parseTime(raw.toFixed(2));
      if (Number.isInteger(raw) && raw < 1440) minutes = raw;
    } else if (typeof raw === "object" && typeof raw.as === "function") minutes = Math.round(raw.as("minutes"));
    else {
      const s2 = String(raw).normalize("NFC").trim().toLowerCase().replace(/^buổi\s+/, "");
      const word = PERIOD_WORDS[s2];
      if (word) return { period: word, minutes: PERIODS[word].minutes, clock: null };
      const m = s2.match(/^(\d{1,2})(?:[:h.](\d{2})?)?\s*(am|pm|sa|ch)?$/);
      if (m) {
        let h = Number(m[1]);
        const min = Number(m[2] || 0);
        if ((m[3] === "pm" || m[3] === "ch") && h < 12) h += 12;
        if ((m[3] === "am" || m[3] === "sa") && h === 12) h = 0;
        if (h <= 23 && min <= 59) minutes = h * 60 + min;
      }
    }
    if (minutes === null || minutes < 0 || minutes >= 1440) return null;
    const period = minutes < 12 * 60 ? "morning" : minutes < 17 * 60 ? "afternoon" : "evening";
    const clock3 = String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
    return { period, minutes, clock: clock3 };
  }
  const timeText = (t) => !t ? "" : t.clock ? t.clock + (t.endClock ? "–" + t.endClock : "") : PERIODS[t.period].label;
  function entriesFor(p) {
    const dates = p.date === null || p.date === void 0 ? [] : Array.isArray(p.date) ? p.date : [p.date];
    const times = Array.isArray(p.time) ? p.time : null;
    return dates.map((raw, i) => ({ page: p, date: toDate(raw), time: parseTime(times ? times[i] : p.time) })).filter((e) => e.date);
  }
  const sortKey = (e) => e.date.toMillis() + (e.time ? e.time.minutes : 1440) * 6e4;
  const byTime = (a, b) => sortKey(a) - sortKey(b);
  const relLabel = (n2) => n2 === 0 ? "Today" : n2 === 1 ? "Tomorrow" : n2 > 1 ? "In " + n2 + " days" : plural(-n2, "day", "days") + " ago";
  const urgency = (n2) => n2 === null || n2 === void 0 || n2 < 0 ? "" : n2 <= 2 ? "is-urgent" : n2 <= 7 ? "is-soon" : "";
  const inLabel = (mins) => mins < 60 ? "in " + mins + " min" : "in " + Math.floor(mins / 60) + "h " + mins % 60 + "m";
  const greeting = () => {
    const h = (/* @__PURE__ */ new Date()).getHours();
    return h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening";
  };
  const dailyPath = (d) => dailyNotePath(C, d);
  const minutesOf = (words) => Math.max(1, Math.round(words / C.spokenWpm));
  function notify(message) {
    new import_obsidian2.Notice(message);
  }
  const present = (path) => Boolean(app.vault.getAbstractFileByPath(path));
  const openNote = (target, newTab) => app.workspace.openLinkText(target, env.sourcePath, !!newTab);
  async function createFromTemplate(templatePath, folderPath, name, open) {
    const templater = app.plugins.plugins["templater-obsidian"]?.templater;
    const template = app.vault.getAbstractFileByPath(templatePath);
    if (!templater || !template) {
      notify("Templater or template not found: " + templatePath);
      return null;
    }
    if (!app.vault.getAbstractFileByPath(folderPath)) await app.vault.createFolder(folderPath);
    return templater.create_new_note_from_template(template, app.vault.getAbstractFileByPath(folderPath), name, open);
  }
  async function newFrom(kind) {
    const t = C.templates[kind];
    if (!t) return;
    try {
      await createFromTemplate(t[0], t[1], t[2] || void 0, true);
    } catch (err) {
      console.error(err);
      notify("Could not create a new " + kind);
    }
  }
  async function openDaily(d, newTab) {
    try {
      await app.workspace.getLeaf(newTab ? "tab" : false).openFile(await dailyNote(app, C, d));
    } catch (err) {
      console.error(err);
      notify("Could not open the daily note for " + d.toFormat("yyyy-MM-dd"));
    }
  }
  async function setActive(page2, active2, input, card) {
    const file = app.vault.getAbstractFileByPath(page2.file.path);
    if (!(file instanceof import_obsidian2.TFile)) return;
    input.disabled = true;
    card?.classList.toggle("is-inactive", !active2);
    try {
      await app.fileManager.processFrontMatter(file, (fm) => {
        fm[fmKey(fm, "is_active")] = active2;
      });
    } catch (err) {
      console.error("Modular Homepage: could not update is_active", err);
      input.checked = !active2;
      card?.classList.toggle("is-inactive", active2);
      notify("Could not update " + page2.file.name);
    } finally {
      input.disabled = false;
    }
  }
  const pageHost = () => env.host.closest(".workspace-leaf-content") || env.host.closest(".view-content") || env.host.parentElement || env.host;
  function rgbOf(color) {
    const probe = el(doc.body, "span", "");
    probe.style.cssText = "position:absolute;visibility:hidden";
    probe.style.color = color;
    // The span resolves var(); the canvas turns what Chromium keeps as oklch(), lab(), color() or color-mix() into sRGB bytes.
    const c = doc.createElement("canvas").getContext("2d");
    c.fillStyle = getComputedStyle(probe).color;
    probe.remove();
    c.fillRect(0, 0, 1, 1);
    return [...c.getImageData(0, 0, 1, 1).data].slice(0, 3);
  }
  const hexOf = (color) => "#" + rgbOf(color).map((v) => Math.round(v).toString(16).padStart(2, "0")).join("");
  const isDark = (color) => {
    const lin = (v) => {
      v /= 255;
      return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
    };
    const [r, g, b] = rgbOf(color);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b) <= 0.35;
  };
  const clampPct = (v, d) => {
    const n2 = Number(v);
    return v === null || v === void 0 || v === "" || !Number.isFinite(n2) ? d : Math.max(0, Math.min(100, Math.round(n2)));
  };
  const page = {
    // Obsidian's own background, as #rrggbb: where the fade colour picker starts.
    themeHex: () => hexOf(getComputedStyle(pageHost().parentElement || doc.body).getPropertyValue("--background-primary").trim() || "#ffffff")
  };
  async function saveProps(fields, what) {
    const file = app.vault.getAbstractFileByPath(env.sourcePath);
    if (!(file instanceof import_obsidian2.TFile)) return false;
    try {
      await app.fileManager.processFrontMatter(file, (fm) => {
        for (const [k, v] of Object.entries(fields)) fm[fmKey(fm, k)] = v;
      });
      notify(what + " saved");
      return true;
    } catch (err) {
      console.error("Modular Homepage: could not save " + what, err);
      notify("Could not save " + what);
      return false;
    }
  }
  const attachments = () => {
    const f = app.vault.getAbstractFileByPath(C.attachments);
    return f instanceof import_obsidian2.TFolder ? f.children : [];
  };
  const images = () => attachments().filter((f) => f instanceof import_obsidian2.TFile && IMAGE_EXT.includes(f.extension.toLowerCase())).sort((a, b) => a.name.localeCompare(b.name));
  const isActive = (p) => p.is_active === true;
  const once = (fn) => {
    let v, done = false;
    return () => {
      if (!done) {
        v = fn();
        done = true;
      }
      return v;
    };
  };
  const EMOJI2 = /^(\p{Extended_Pictographic}️?(?:‍\p{Extended_Pictographic}️?)*)\s*/u;
  const norm = (t) => String(t).normalize("NFC").trim().toLowerCase();
  const sermons = once(() => vault.pages(C.sermonFolder).filter((p) => p.type === "sermon"));
  const entries = once(() => sermons().flatMap(entriesFor).sort(byTime));
  const upcoming = once(() => entries().filter((e) => isActive(e.page) && daysUntil(e.date) >= 0));
  const past = once(() => entries().filter((e) => daysUntil(e.date) < 0));
  const entriesByPath = once(() => {
    const grouped = /* @__PURE__ */ new Map();
    for (const entry of entries()) {
      const path = entry.page.file.path;
      if (!grouped.has(path)) grouped.set(path, []);
      grouped.get(path).push(entry);
    }
    return grouped;
  });
  function churchesOf(p) {
    const list2 = p.church === null || p.church === void 0 ? [] : Array.isArray(p.church) ? p.church : [p.church];
    return list2.map(textOf).filter(Boolean);
  }
  const churchPhotos = once(() => {
    const map = /* @__PURE__ */ new Map();
    for (const f of attachments())
      if (f instanceof import_obsidian2.TFile && IMAGE_EXT.includes(f.extension.toLowerCase())) map.set(norm(f.basename), f);
    return map;
  });
  const photoOf = (church) => {
    const f = church ? churchPhotos().get(norm(church)) : null;
    return f ? app.vault.getResourcePath(f) : null;
  };
  function avatar(parent, church) {
    const src = photoOf(church);
    if (src) {
      const img = el(parent, "img", "hp-avatar");
      img.src = src;
      img.alt = "";
      return img;
    }
    let h = 0;
    for (const ch of church || "?") h = h * 31 + ch.charCodeAt(0) >>> 0;
    const dot = el(parent, "span", "hp-avatar");
    dot.style.background = "linear-gradient(135deg, hsl(calc(var(--accent-h) + " + (h % 40 - 20) + ") 80% 64%), hsl(calc(var(--accent-h) - " + h % 30 + ") 60% 38%))";
    return dot;
  }
  function countWords(s2) {
    const clean2 = s2.replace(/%%[\s\S]*?%%/g, "").replace(/<!--[\s\S]*?-->/g, "").replace(/!\[\[[^\]]*\]\]/g, "").replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1");
    return (clean2.normalize("NFC").match(/[\p{L}\p{N}]+/gu) || []).length; // NFC: decomposed (NFD) accents would split a word
  }
  function analyse(body2) {
    let fence = false;
    const rows = body2.split(/\r?\n/).map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        fence = !fence;
        return null;
      }
      if (fence) return null;
      const h = line.match(/^(#{1,6})\s+(.*?)\s*#*\s*$/);
      return h ? { level: h[1].length, heading: h[2] } : { words: countWords(line) };
    }).filter(Boolean);
    const top = Math.min(7, ...rows.filter((r) => r.level).map((r) => r.level));
    const sections = [];
    let total = 0, cur = null;
    for (const r of rows) {
      if (r.level === top) {
        cur = { heading: r.heading.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, "$1"), raw: r.heading, words: 0 };
        sections.push(cur);
      } else if (!r.level) {
        total += r.words;
        if (cur) cur.words += r.words;
      }
    }
    return { total, sections, filled: sections.filter((s2) => s2.words).length };
  }
  const manuscripts = env.manuscripts;
  const fileRevision = (file) => Number.isFinite(file?.stat?.mtime) && Number.isFinite(file?.stat?.size) ? file.stat.mtime + ":" + file.stat.size : null;
  async function manuscript(path) {
    const file = app.vault.getAbstractFileByPath(path);
    if (!(file instanceof import_obsidian2.TFile)) {
      manuscripts.delete(path);
      return analyse("");
    }
    const revision = fileRevision(file);
    const old = manuscripts.get(path);
    if (revision !== null && old?.file === file && old.revision === revision) return old.promise;
    const entry = { file, revision, promise: null };
    entry.promise = Promise.resolve().then(async () => {
      try {
        const body2 = (await app.vault.cachedRead(file)).replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, "");
        const result = analyse(body2);
        if (fileRevision(file) !== revision && manuscripts.get(path) === entry) manuscripts.delete(path);
        return result;
      } catch {
        if (manuscripts.get(path) === entry) manuscripts.delete(path);
        return analyse("");
      }
    });
    if (revision !== null) manuscripts.set(path, entry);
    return entry.promise;
  }
  function preparation(p, next) {
    const start = toDate(p.date_created) || toDate(p.file.ctime);
    if (!next || !start) return null;
    const total = next.date.diff(start, "days").days;
    const elapsed = today.diff(start, "days").days;
    const pct = total <= 0 ? 100 : Math.max(0, Math.min(100, elapsed / total * 100));
    return { start, pct: Math.round(pct) };
  }
  const active = once(async () => {
    const list2 = sermons().filter(isActive).map((p) => {
      const m = p.file.name.match(EMOJI2);
      const own = entriesByPath().get(p.file.path) || [];
      const next = own.find((e) => daysUntil(e.date) >= 0) || null;
      return {
        p,
        next,
        n: next ? daysUntil(next.date) : null,
        church: churchesOf(p)[0] || "",
        emoji: m ? m[1] : "",
        title: m ? p.file.name.slice(m[0].length) : p.file.name,
        later: own.filter((e) => daysUntil(e.date) >= 0 && e !== next),
        last: own.filter((e) => daysUntil(e.date) < 0).at(-1) || null,
        prep: preparation(p, next)
      };
    }).sort((a, b) => (a.next ? sortKey(a.next) : Infinity) - (b.next ? sortKey(b.next) : Infinity) || b.p.file.mtime.toMillis() - a.p.file.mtime.toMillis());
    const wanted = new Set(list2.map((c) => c.p.file.path));
    for (const path of manuscripts.keys()) if (!wanted.has(path)) manuscripts.delete(path);
    await Promise.all(list2.map(async (c) => {
      c.ms = await manuscript(c.p.file.path);
    }));
    return list2;
  });
  const PROJECT_LINKS = [["Tasks.md", "Tasks"], ["Meetings/All Meetings.md", "Meetings"], ["Notes/All Notes.md", "Notes"]];
  const projects = once(() => Promise.all(vault.pages(C.projectsFolder).filter((p) => p.document_type === "project-dashboard").sort((a, b) => b.file.mtime.toMillis() - a.file.mtime.toMillis()).map(async (p) => {
    const folder = p.file.folder;
    const taskFile = vault.page(folder + "/Tasks.md");
    const inFolder = vault.pages(folder);
    const source = taskFile ? [taskFile] : inFolder;
    const tasks = (await Promise.all(source.map((q) => vault.tasks(q)))).flat().filter((t) => t.text && String(t.text).trim() !== "" && t.status !== "-");
    const dueOf = (t) => toDate(t.due) || toDate(String(t.text).match(/📅\s*(\d{4}-\d{2}-\d{2})/u)?.[1]);
    const open = tasks.filter((t) => !t.completed).map((t) => ({ text: String(t.text).split("\n")[0].replace(/\s*[📅🛫⏳➕✅]\s*\d{4}-\d{2}-\d{2}/gu, "").replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2").trim(), due: dueOf(t), line: t.line ?? 0, path: t.path })).sort((a, b) => (a.due?.toMillis() ?? Infinity) - (b.due?.toMillis() ?? Infinity) || a.line - b.line);
    return {
      page: p,
      folder,
      active: isActive(p),
      name: textOf(p.project) || folder.split("/").pop(),
      description: textOf(p.description),
      taskPath: folder + "/Tasks.md",
      total: tasks.length,
      done: tasks.length - open.length,
      open,
      notes: inFolder.filter((q) => q.document_type === "note").length,
      meetings: inFolder.filter((q) => q.document_type === "meeting").length,
      links: PROJECT_LINKS.map(([suffix, label]) => [folder + "/" + suffix, label]).filter(([path]) => present(path))
    };
  })));
  const ui = { el, svg, icon, button, heading, section, bar, textOf, asLink, toggle, meter, ring, mesh, cover, tip, avatar, settings, fmtNum, plural };
  return {
    // The ui with render() and link() tied to one module's life, so its markdown is released with it.
    uiFor(component) {
      const render2 = renderWith(app, doc, env.sourcePath, component);
      return { ...ui, render: render2, link: linkWith(render2) };
    },
    page,
    time: { DateTime, today, todayNow, toDate, parseTime, timeText, entriesFor, daysUntil, nowMinutes, relLabel, urgency, inLabel, greeting, dailyPath, minutesOf, PERIODS },
    act: { present, openNote, openDaily, newFrom, setActive, saveProps },
    data: { isActive, sermons, entries, upcoming, past, active, projects, churchesOf, photoOf, images, preparation, countWords, clampPct, isDark, EMOJI: EMOJI2, norm }
  };
}

