// src/vault.ts
var import_obsidian = require("obsidian");
var Link = class _Link {
  path;
  display;
  subpath;
  embed;
  type;
  constructor(fields) {
    this.path = fields.path ?? "";
    this.display = fields.display;
    this.subpath = fields.subpath;
    this.embed = !!fields.embed;
    this.type = fields.type ?? "file";
  }
  static file(path, embed = false, display) {
    return new _Link({ path, embed, display, type: "file" });
  }
  // "Note#Heading", "Note#^block" or "Note" (Dataview's Link.infer).
  static infer(linkpath, embed = false, display) {
    if (linkpath.includes("#^")) {
      const [path, block] = linkpath.split("#^");
      return new _Link({ path, subpath: block, embed, display, type: "block" });
    }
    if (linkpath.includes("#")) {
      const [path, header] = linkpath.split("#");
      return new _Link({ path, subpath: header, embed, display, type: "header" });
    }
    return _Link.file(linkpath, embed, display);
  }
  obsidianLink() {
    const escaped = this.path.replaceAll("|", "\\|");
    if (this.type === "header") return escaped + "#" + (this.subpath ?? "").replaceAll("|", "\\|");
    if (this.type === "block") return escaped + "#^" + (this.subpath ?? "").replaceAll("|", "\\|");
    return escaped;
  }
  // As Dataview writes it: always with a shown text (the alias, else the note's name).
  markdown() {
    let result = (this.embed ? "!" : "") + "[[" + this.obsidianLink();
    if (this.display) result += "|" + this.display;
    else {
      result += "|" + fileTitle(this.path);
      if (this.type === "header" || this.type === "block") result += " > " + this.subpath;
    }
    return result + "]]";
  }
  fileName() {
    return fileTitle(this.path).replace(".md", "");
  }
  toString() {
    return this.markdown();
  }
};
var fileTitle = (path) => {
  const name = path.split("/").pop() ?? path;
  return name.replace(/\.md$/i, "");
};
var isLink = (v) => v instanceof Link;
var DATE = /^\d{4}-\d{2}(?:-\d{2}(?:T\d{2}(?::\d{2}(?::\d{2}(?:\.\d{1,3})?)?)?(?:Z|[+-]\d{2}(?::?\d{2})?)?)?)?$/;
var UNITS = {
  year: "years",
  years: "years",
  yr: "years",
  yrs: "years",
  month: "months",
  months: "months",
  mo: "months",
  mos: "months",
  week: "weeks",
  weeks: "weeks",
  wk: "weeks",
  wks: "weeks",
  w: "weeks",
  day: "days",
  days: "days",
  d: "days",
  hour: "hours",
  hours: "hours",
  hr: "hours",
  hrs: "hours",
  h: "hours",
  minute: "minutes",
  minutes: "minutes",
  min: "minutes",
  mins: "minutes",
  m: "minutes",
  second: "seconds",
  seconds: "seconds",
  sec: "seconds",
  secs: "seconds",
  s: "seconds"
};
var DURATION_PART = /(\d+(?:\.\d+)?)\s*([a-z]+)/gi;
var DURATION = /^\s*(?:\d+(?:\.\d+)?\s*[a-z]+(?:\s*,?\s*(?:and\s+)?|\s*$))+$/i;
function parseDuration(s2) {
  if (!DURATION.test(s2)) return null;
  const parts = {};
  for (const [, n2, unit] of s2.matchAll(DURATION_PART)) {
    const k = UNITS[unit.toLowerCase()];
    if (!k) return null;
    parts[k] = (parts[k] ?? 0) + Number(n2);
  }
  return Object.keys(parts).length ? Duration.fromObject(parts) : null;
}
function parseIsoDate(s2) {
  if (!DATE.test(s2)) return null;
  const d = DateTime.fromISO(s2, { setZone: /(Z|[+-]\d{2}(:?\d{2})?)$/.test(s2) && s2.includes("T") });
  return d.isValid ? d : null;
}
var LINK = /^(!?)\[\[([^\]]*?)\]\]$/;
function parseValue(value, sourcePath, app) {
  if (value === null || value === void 0) return null;
  if (Array.isArray(value)) return value.map((v) => parseValue(v, sourcePath, app));
  if (value instanceof Date) return DateTime.fromJSDate(value);
  if (typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value)) out[k] = parseValue(value[k], sourcePath, app);
    return out;
  }
  if (typeof value !== "string") return value;
  const date = parseIsoDate(value.trim());
  if (date) return date;
  const dur = parseDuration(value);
  if (dur) return dur;
  const m = value.trim().match(LINK);
  if (m) {
    const [target, ...alias] = m[2].split("|");
    const link = Link.infer(target, m[1] === "!", alias.length ? alias.join("|") : void 0);
    const file = app.metadataCache.getFirstLinkpathDest(link.path, sourcePath);
    if (file) link.path = file.path;
    return link;
  }
  return value;
}
function toDateTime(input) {
  if (input === null || input === void 0) return null;
  if (DateTime.isDateTime(input)) return input;
  if (isLink(input)) return toDateTime(input.fileName());
  const s2 = String(input).trim();
  const now2 = DateTime.now();
  switch (s2.toLowerCase()) {
    case "today":
      return now2.startOf("day");
    case "now":
      return now2;
    case "tomorrow":
      return now2.startOf("day").plus({ days: 1 });
    case "yesterday":
      return now2.startOf("day").minus({ days: 1 });
  }
  return parseIsoDate(s2);
}
var canonical = (key) => key.trim().toLowerCase().replace(/\s+/g, "-").replace(/[^\p{L}\p{N}_-]/gu, "");
// The frontmatter key a property is read from (the first with its canonical form, e.g. "Banner"), so a write replaces it.
var fmKey = (fm, key) => Object.keys(fm).find((k) => canonical(k) === canonical(key)) ?? key;
var LIST_ITEM = /^[\s>]*(\d+\.|\d+\)|\*|-|\+)\s*(\[.{0,1}\])?\s*(.*)$/mu;
var TAG = /(?:^|\s)#([^\s#,.;:!?()[\]{}"'`]+)/gu;
var linkableHeading = (h) => h.replace(/[^\p{L}\p{N}_\-\p{Extended_Pictographic}\p{Variation_Selector}‍]/gu, " ").split(/\s+/).join(" ").trim();
var VaultData = class {
  constructor(app) {
    this.app = app;
  }
  pagesByPath = /* @__PURE__ */ new Map();
  listsByPath = /* @__PURE__ */ new Map();
  // A note changed (or went away): its page and list items are built again when next asked for.
  forget(path) {
    this.pagesByPath.delete(path);
    this.listsByPath.delete(path);
  }
  clear() {
    this.pagesByPath.clear();
    this.listsByPath.clear();
  }
  build(file) {
    const app = this.app;
    const cache = app.metadataCache.getFileCache(file);
    const old = this.pagesByPath.get(file.path);
    if (old && old.cache === cache && old.mtime === file.stat.mtime && old.size === file.stat.size) return old.page;
    const fm = { ...cache?.frontmatter ?? {} };
    delete fm.position;
    const tags = cache ? [...new Set((0, import_obsidian.getAllTags)(cache) ?? [])] : [];
    const full = /* @__PURE__ */ new Set();
    for (const t of tags) {
      const parts = t.split("/");
      for (let i = 1; i <= parts.length; i++) full.add(parts.slice(0, i).join("/"));
    }
    const aliases = fm.aliases ?? fm.alias;
    const folder = file.parent && file.parent.path !== "/" ? file.parent.path : "";
    const info = {
      path: file.path,
      name: file.basename,
      folder,
      ext: file.extension,
      size: file.stat.size,
      ctime: DateTime.fromMillis(file.stat.ctime),
      mtime: DateTime.fromMillis(file.stat.mtime),
      link: Link.file(file.path),
      tags: [...full],
      etags: tags,
      aliases: aliases == null ? [] : Array.isArray(aliases) ? aliases.map(String) : [String(aliases)],
      frontmatter: fm,
      file
    };
    const day = file.basename.match(/\d{4}-\d{2}-\d{2}/);
    if (day) {
      const d = DateTime.fromISO(day[0]);
      if (d.isValid) info.day = d;
    }
    const page = { file: info };
    for (const [key, raw] of Object.entries(fm)) {
      const value = parseValue(raw, file.path, app);
      if (!(key in page)) page[key] = value;
      const c = canonical(key);
      if (c && !(c in page)) page[c] = value;
    }
    this.pagesByPath.set(file.path, { cache, mtime: file.stat.mtime, size: file.stat.size, page });
    return page;
  }
  page(pathOrFile) {
    if (!pathOrFile) return null;
    let file = typeof pathOrFile === "string" ? this.app.vault.getAbstractFileByPath(pathOrFile) : pathOrFile;
    if (!file && typeof pathOrFile === "string" && !/\.md$/i.test(pathOrFile)) file = this.app.vault.getAbstractFileByPath(pathOrFile + ".md");
    return file instanceof import_obsidian.TFile && file.extension === "md" ? this.build(file) : null;
  }
  // Every note in a folder and its subfolders ("" = the whole vault), like dv.pages('"Folder"').
  pages(folder) {
    const prefix = folder.replace(/\/+$/, "");
    if (!prefix) return this.app.vault.getMarkdownFiles().map((f) => this.build(f));
    const root = this.app.vault.getAbstractFileByPath(prefix);
    if (!(root instanceof import_obsidian.TFolder)) return [];
    const pages = [];
    const pending = [...root.children].reverse();
    while (pending.length) {
      const file = pending.pop();
      if (file instanceof import_obsidian.TFolder) {
        for (let i = file.children.length - 1; i >= 0; i--) pending.push(file.children[i]);
      } else if (file instanceof import_obsidian.TFile && file.extension === "md") pages.push(this.build(file));
    }
    return pages;
  }
  // Every note with a tag (or one of its subtags), like dv.pages("#tag").
  pagesWithTag(tag) {
    const want = "#" + tag.replace(/^#/, "").toLowerCase();
    return this.app.vault.getMarkdownFiles().filter((f) => {
      const cache = this.app.metadataCache.getFileCache(f);
      return !!cache && ((0, import_obsidian.getAllTags)(cache) ?? []).some((t) => {
        const k = t.toLowerCase();
        return k === want || k.startsWith(want + "/");
      });
    }).map((f) => this.build(f));
  }
  // A note's list items, as Dataview's file.lists: text after the bullet and checkbox (with continuation lines), the
  // heading above it (section), the parent item's line, and for a to-do its status. Read from the note's text.
  lists(page) {
    const file = typeof page === "string" ? this.app.vault.getAbstractFileByPath(page) : page instanceof import_obsidian.TFile ? page : page?.file?.file;
    if (!(file instanceof import_obsidian.TFile)) return Promise.resolve([]);
    const old = this.listsByPath.get(file.path);
    if (old && old.mtime === file.stat.mtime && old.size === file.stat.size) return old.promise;
    const entry = { mtime: file.stat.mtime, size: file.stat.size, promise: null };
    entry.promise = this.readLists(file).catch((err) => {
      if (this.listsByPath.get(file.path) === entry) this.listsByPath.delete(file.path);
      console.error("Modular Homepage: could not read " + file.path, err);
      return [];
    });
    this.listsByPath.set(file.path, entry);
    return entry.promise;
  }
  async tasks(page) {
    return (await this.lists(page)).filter((l2) => l2.task);
  }
  async readLists(file) {
    const cache = this.app.metadataCache.getFileCache(file);
    if (!cache?.listItems?.length) return [];
    const lines = (await this.app.vault.cachedRead(file)).split(/\r?\n/);
    const headings = cache.headings ?? [];
    const items = [];
    const byLine = /* @__PURE__ */ new Map();
    for (const li of cache.listItems) {
      const start = li.position.start.line, end = li.position.end.line;
      const m = (lines[start] ?? "").match(LIST_ITEM);
      if (!m) continue;
      const text = [m[3], ...lines.slice(start + 1, end + 1).map((l2) => l2.trim())].join("\n");
      let heading;
      for (const h of headings) {
        if (h.position.start.line <= start) heading = linkableHeading(h.heading);
        else break;
      }
      const item = {
        text,
        line: start,
        lineCount: end - start + 1,
        path: file.path,
        symbol: m[1],
        section: heading === void 0 ? { path: file.path, type: "file" } : { path: file.path, subpath: heading, type: "header" },
        parent: li.parent < 0 ? void 0 : li.parent,
        children: [],
        task: li.task !== void 0,
        tags: [...m[3].matchAll(TAG)].map((t) => "#" + t[1])
      };
      if (li.task !== void 0) {
        item.status = li.task;
        item.checked = li.task !== "" && li.task !== " ";
        item.completed = li.task === "x" || li.task === "X";
      }
      items.push(item);
      byLine.set(start, item);
    }
    for (const item of items) if (item.parent !== void 0) byLine.get(item.parent)?.children.push(item.line);
    return items;
  }
};

