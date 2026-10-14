// src/modules/project-stats.ts
var def14 = /* @__PURE__ */ (() => {
  return {
    name: "Project numbers",
    about: "Projects in charts: active, meetings per month, notes",
    width: 12,
    variants: [],
    async render(body2, { ui, time, data, vault, config }) {
      const { el, svg } = ui;
      const all = await data.projects();
      const inProjects = vault.pages(config.projectsFolder);
      const meetings = inProjects.filter((q) => q.document_type === "meeting");
      const noteCount = inProjects.filter((q) => q.document_type === "note").length;
      ui.section(body2, "In numbers");
      const box = el(body2, "div", "m-pstats-box hp-card hp-grow");
      ui.bar(box, { label: "All " + ui.plural(all.length, "project", "projects") });
      const grid = el(box, "div", "m-pstats");
      const card = (title, note) => {
        const c = el(grid, "article", "m-pstats-card hp-panel");
        ui.heading(c, 3, "m-pstats-title", title);
        el(c, "p", "m-pstats-note", note);
        return c;
      };
      const chart = (parent, label, box) => {
        const node = svg(parent, "svg", { viewBox: box, role: "img", "aria-label": label }, "m-pstats-svg");
        svg(node, "title").textContent = label;
        return node;
      };
      const legend = (parent, label, value, cls) => {
        const item = el(parent, "div", "m-pstats-legend-item");
        el(item, "span", "m-pstats-dot " + cls);
        el(item, "span", "", label);
        el(item, "strong", "", String(value));
      };
      const count = all.filter((p) => p.active).length;
      const balance = card("Projects", "Active out of all projects");
      const ring = chart(balance, count + " active projects; " + (all.length - count) + " inactive projects.", "0 0 300 175");
      svg(ring, "circle", { cx: 150, cy: 82, r: 62, fill: "none", "stroke-width": 14 }, "m-pstats-track");
      if (all.length) svg(ring, "circle", { cx: 150, cy: 82, r: 62, fill: "none", "stroke-width": 14, pathLength: 100, "stroke-dasharray": count / all.length * 100 + " 100", transform: "rotate(-90 150 82)" }, "m-pstats-open");
      svg(ring, "text", { x: 150, y: 88, "text-anchor": "middle" }, "m-pstats-value").textContent = String(count);
      svg(ring, "text", { x: 150, y: 108, "text-anchor": "middle" }, "m-pstats-label").textContent = "active";
      const lg = el(balance, "div", "m-pstats-legend");
      legend(lg, "Active", count, "is-accent");
      legend(lg, "Inactive", all.length - count, "is-track");
      if (!all.length) el(balance, "p", "hp-empty", "No project records yet.");
      const monthStart = time.today.startOf("month");
      const meetingDates = meetings.map((q) => time.toDate(q.date_created));
      const months2 = Array.from({ length: 6 }, (_, i) => {
        const m = monthStart.minus({ months: 5 - i });
        return { label: m.setLocale("en").toFormat("LLL"), year: m.year, count: meetingDates.filter((d) => d && d.year === m.year && d.month === m.month).length };
      });
      const undated = meetingDates.filter((d) => !d).length;
      const rhythm = card("Meetings", "Added per month, " + months2[0].label + " – " + months2[5].label + " " + months2[5].year + (undated ? " · " + undated + " undated left out" : ""));
      const bars = chart(rhythm, months2.map((m) => m.label + " " + m.year + ": " + m.count + " meetings").join("; "), "0 0 300 175");
      const max = Math.max(1, ...months2.map((m) => m.count));
      svg(bars, "line", { x1: 10, x2: 290, y1: 140, y2: 140 }, "m-pstats-grid");
      months2.forEach((m, i) => {
        const h = m.count / max * 110, x = 20 + i * 46, last = i === months2.length - 1;
        const rect = svg(bars, "rect", { x, y: 140 - h, width: 26, height: h, rx: 5 }, last ? "m-pstats-bar-accent" : "m-pstats-bar-soft");
        svg(rect, "title").textContent = m.label + " " + m.year + ": " + m.count;
        svg(bars, "text", { x: x + 13, y: 131 - h, "text-anchor": "middle" }, "m-pstats-label").textContent = String(m.count);
        svg(bars, "text", { x: x + 13, y: 160, "text-anchor": "middle" }, "m-pstats-label" + (last ? " is-now" : "")).textContent = m.label;
      });
      const library = card("Notes & meetings", "Written inside all projects");
      const hb = el(library, "div", "m-pstats-hbars");
      hb.setAttribute("role", "img");
      hb.setAttribute("aria-label", meetings.length + " meeting records and " + noteCount + " project notes across all projects.");
      const largest = Math.max(1, meetings.length, noteCount);
      for (const [label, n2, cls] of [["Meetings", meetings.length, "is-accent"], ["Notes", noteCount, "is-soft"]]) {
        const row = el(hb, "div", "m-pstats-hbar");
        el(row, "span", "", label);
        el(el(row, "div", "m-pstats-hbar-track hp-track"), "i", cls).style.width = n2 / largest * 100 + "%";
        el(row, "b", "hp-num", String(n2));
      }
    }
  };
})();
def14.watch = (paths, { config }) => anyUnder(paths, config.projectsFolder);
var project_stats_default = def14;

