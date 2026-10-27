// src/modules/stats.ts
var def13 = /* @__PURE__ */ (() => {
  const TOPIC_FIELDS = ["topic", "topics", "description"];
  const TOPIC_SKIP = [/^chi\s*ph[áả]i/i, /^nhà\s/i, /^lễ\s*\d+$/i];
  return {
    name: "Stats",
    about: "Your preaching in numbers, with charts",
    width: 12,
    variants: [["full", "Full"], ["band", "Band"], ["tiles", "Tiles"]],
    async render(body2, ctx) {
      const { ui, time, data, config, variant, store, app } = ctx;
      const { el } = ui;
      const today = time.today;
      const all = data.sermons(), entries = data.entries(), past = data.past();
      if (variant === "band" || variant === "tiles") {
        const active = await data.active();
        const weekStart = today.startOf("week"), weekEnd = weekStart.plus({ weeks: 1 });
        const projects = (await data.projects()).filter((p) => p.active);
        const band = el(body2, "div", (variant === "tiles" ? "m-stats-tiles" : "m-stats-band") + " hp-card hp-grow");
        for (const [n2, label] of [
          [active.length, active.length === 1 ? "active sermon" : "active sermons"],
          [entries.filter((e) => data.isActive(e.page) && e.date >= weekStart && e.date < weekEnd).length, "preaching this week"],
          [active.reduce((s2, c) => s2 + c.ms.total, 0), "words drafted"],
          variant === "tiles" ? [projects.reduce((s2, p) => s2 + p.open.length, 0), "open project tasks"] : [projects.length, "active projects"]
        ]) {
          const s2 = el(band, "div", "m-stats-num" + (variant === "tiles" ? " hp-panel" : ""));
          el(s2, "b", "hp-num", ui.fmtNum(n2));
          el(s2, "span", "", label);
        }
        return;
      }
      ui.section(body2, "In numbers");
      const stats = el(body2, "div", "m-stats hp-card hp-grow");
      ui.bar(stats, { label: "All " + ui.plural(all.length, "sermon", "sermons") + " in " + config.sermonFolder });
      const firstChurch = (e) => data.churchesOf(e.page)[0] || "—";
      const big = el(stats, "div", "m-stats-big");
      for (const [n2, label] of [
        [all.length, "sermons written"],
        [past.length, "times preached"],
        [past.filter((e) => e.date.year === today.year).length, "preached in " + today.year],
        [new Set(past.map((e) => data.churchesOf(e.page)[0]).filter(Boolean)).size, "churches & groups"]
      ]) {
        const s2 = el(big, "div", "m-stats-num");
        el(s2, "b", "hp-num", ui.fmtNum(n2));
        el(s2, "span", "", label);
      }
      const moreBtn = ui.button(big, "m-stats-more-btn hp-knob", "chevron", "More statistics", "");
      const more = el(stats, "div", "m-stats-more");
      more.id = "m-stats-more-" + Math.random().toString(36).slice(2, 8);
      moreBtn.setAttribute("aria-controls", more.id);
      const grid = el(el(el(more, "div", "m-stats-clip"), "div", "m-stats-in"), "div", "m-stats-grid");
      more.inert = true;
      let detailsBuilt = false;
      const setMore = (open) => {
        if (open && !detailsBuilt) {
          buildDetails();
          detailsBuilt = true;
        }
        store.open = open;
        more.classList.toggle("is-open", open);
        more.inert = !open;
        moreBtn.setAttribute("aria-expanded", String(open));
        moreBtn.title = open ? "Hide the other statistics" : "Show more statistics";
        moreBtn.setAttribute("aria-label", moreBtn.title);
      };
      moreBtn.addEventListener("click", () => setMore(!store.open));
      setMore(!!store.open);
      function buildDetails() {
        const tile = (title, note, span) => {
          const t = el(grid, "div", "m-stats-tile hp-panel m-span-" + span);
          const h = el(t, "div", "m-stats-tile-head");
          ui.heading(h, 3, "m-stats-tile-title", title);
          el(h, "span", "m-stats-tile-note", note);
          return t;
        };
        const monthStart = today.startOf("month");
        const months2 = Array.from({ length: 12 }, (_, i) => monthStart.minus({ months: 11 - i }));
        const perMonth = months2.map((m) => {
          const end = m.plus({ months: 1 });
          return entries.filter((e) => e.date >= m && e.date < end).length;
        });
        const topMonth = Math.max(1, ...perMonth);
        const mt = tile("Preaching dates per month", "Last 12 months", 7);
        const cols = el(mt, "div", "m-stats-cols");
        const colAxis = el(mt, "div", "m-stats-col-axis");
        months2.forEach((m, i) => {
          const col = el(cols, "div", "m-stats-col");
          el(col, "b", "", perMonth[i] === topMonth || i === 11 ? String(perMonth[i]) : "");
          el(col, "i", "").style.height = (perMonth[i] ? Math.max(3, perMonth[i] / topMonth * 85) : 1) + "%";
          ui.tip(col, m.setLocale("en").toFormat("LLLL yyyy") + "\n" + ui.plural(perMonth[i], "preaching date", "preaching dates"));
          el(colAxis, "span", i === 11 ? "is-now" : "", m.setLocale("en").toFormat("LLL"));
        });
        const ht = tile("Weekly rhythm", "Last 52 weeks · a row per quarter", 5);
        const thisWeek = today.startOf("week");
        const weeks = Array.from({ length: 52 }, (_, i) => thisWeek.minus({ weeks: 51 - i }));
        const perWeek = weeks.map((w) => {
          const end = w.plus({ weeks: 1 });
          return entries.filter((e) => e.date >= w && e.date < end).length;
        });
        const heat = el(ht, "div", "m-stats-heat");
        weeks.forEach((w, i) => {
          const n2 = perWeek[i];
          ui.tip(el(heat, "i", (n2 >= 3 ? "l3" : n2 === 2 ? "l2" : n2 === 1 ? "l1" : "") + (i === 51 ? " is-now" : "")), "Week of " + w.setLocale("en").toFormat("d LLL") + "\n" + ui.plural(n2, "preaching date", "preaching dates"));
        });
        let streak = 0;
        for (let i = perWeek[51] ? 51 : 50; i >= 0 && perWeek[i]; i--) streak++;
        const hf = el(ht, "div", "m-stats-heat-foot");
        const st = el(hf, "div", "m-stats-streak");
        el(st, "b", "hp-num", String(streak));
        st.append(" " + (streak === 1 ? "week" : "weeks") + " in a row");
        const scale = el(hf, "div", "m-stats-scale");
        scale.append("0");
        for (const lv of ["", "l1", "l2", "l3"]) el(scale, "i", lv);
        scale.append("3+");
        const barsTile = (title, note, rows, span, cls = "") => {
          const t = tile(title, note, span);
          const bars = el(t, "div", "m-stats-bars " + cls);
          const most = Math.max(1, ...rows.map((r) => r[1]));
          for (const [label, n2, hint] of rows) {
            const row = el(bars, "div", "m-stats-bar");
            el(row, "span", "", label);
            el(el(row, "span", "m-stats-bar-track"), "i", "").style.width = Math.max(2, n2 / most * 100) + "%";
            el(row, "b", "", ui.fmtNum(n2));
            ui.tip(row, hint || label + "\n" + ui.fmtNum(n2));
          }
          if (!rows.length) el(bars, "div", "hp-empty", "Nothing yet.");
        };
        const groupOf = (name) => /^chi\s*ph[áả]i/i.test(name) ? "Chi phái · home groups" : /^ban\s/i.test(name) ? "Ban · ministries" : name;
        const byChurch = /* @__PURE__ */ new Map();
        for (const e of past) {
          const g = groupOf(firstChurch(e));
          byChurch.set(g, (byChurch.get(g) || 0) + 1);
        }
        const churchRows = [...byChurch].sort((a, b) => b[1] - a[1]);
        const keep = churchRows.slice(0, 5);
        const rest = churchRows.slice(5).reduce((s2, r) => s2 + r[1], 0);
        if (rest) keep.push(["Other places", rest]);
        barsTile("Where you preach", "Past preaching dates", keep.map(([k, n2]) => [k, n2, k + "\n" + ui.plural(n2, "preaching date", "preaching dates")]), 6);
        const bookFromPath = (path) => path.split("/").slice(-2, -1)[0].replace(/^\d+\s*/, "");
        const bookOf = (p) => {
          const v = Array.isArray(p.bible) ? p.bible[0] : p.bible;
          if (!v) return "";
          if (typeof v === "object" && typeof v.path === "string") {
            const file = app.metadataCache.getFirstLinkpathDest(v.path, p.file.path);
            if (file && file.path.startsWith(config.bibleFolder + "/")) return bookFromPath(file.path);
            return String(v.display || "").replace(/\s+\d.*$/, "").trim();
          }
          return String(v).replace(/\[\[[^|\]]*\|?/, "").replace(/\s+\d.*$/, "").trim();
        };
        const byBook = /* @__PURE__ */ new Map();
        for (const p of all) {
          const b = bookOf(p);
          if (b) byBook.set(b, (byBook.get(b) || 0) + 1);
        }
        barsTile("Books you preach from", "Top 8 · by sermon", [...byBook].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([k, n2]) => [k, n2, k + "\n" + ui.plural(n2, "sermon", "sermons")]), 6);
        const churchNames = [...new Set(all.flatMap(data.churchesOf))].sort((a, b) => b.length - a.length);
        const escapeRe = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const churchTails = churchNames.map((ch) => new RegExp("\\s" + escapeRe(ch) + "$", "i"));
        const cleanTopic = (raw) => {
          let t = String(raw).replace(data.EMOJI, "").replace(/^[\s\-–—]+|[\s\-–—|,;:]+$/g, "").replace(/(\s*[|,]?\s*\d{4})+$/, "").trim();
          for (const tail of churchTails) {
            if (tail.test(t)) {
              t = t.replace(tail, "").trim();
              break;
            }
          }
          return !t || TOPIC_SKIP.some((re) => re.test(t)) ? "" : t.charAt(0).toLocaleUpperCase("vi") + t.slice(1);
        };
        const topicsOf = (p) => {
          for (const field of TOPIC_FIELDS) {
            const v = p[field];
            const names = (v === null || v === void 0 ? [] : Array.isArray(v) ? v : [v]).map(ui.textOf).map(cleanTopic).filter(Boolean);
            if (names.length) return [...new Set(names)];
          }
          return [];
        };
        const lastByPath = /* @__PURE__ */ new Map();
        for (const e of past) {
          const path = e.page.file.path, last = lastByPath.get(path);
          if (!last || e.date > last) lastByPath.set(path, e.date);
        }
        const topics = /* @__PURE__ */ new Map();
        let untopical = 0;
        for (const p of all) {
          const names = topicsOf(p);
          if (!names.length) {
            untopical++;
            continue;
          }
          const last = lastByPath.get(p.file.path) || null;
          for (const name of names) {
            const k = name.toLocaleLowerCase("vi");
            if (!topics.has(k)) topics.set(k, { name, sermons: 0, last: null, active: false });
            const t = topics.get(k);
            t.sermons++;
            if (last && (!t.last || last > t.last)) t.last = last;
            if (data.isActive(p)) t.active = true;
          }
        }
        const topicRows = [...topics.values()].sort((a, b) => b.sermons - a.sermons || (b.last || 0) - (a.last || 0)).slice(0, 12);
        barsTile(
          "Topics",
          "Series & occasions · " + ui.fmtNum(all.length - untopical) + " of " + ui.fmtNum(all.length) + " sermons have one · ● = an active sermon",
          topicRows.map((t) => [t.name + (t.active ? " ●" : ""), t.sermons, t.name + "\n" + ui.plural(t.sermons, "sermon", "sermons") + (t.last ? " · last preached " + t.last.setLocale("en").toFormat("d LLL yyyy") : " · not preached yet")]),
          12,
          "is-two"
        );
      }
    }
  };
})();
def13.watch = (paths, { config }) => anyUnder(paths, config.sermonFolder, config.projectsFolder);
var stats_default = def13;

