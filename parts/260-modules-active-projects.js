// src/modules/active-projects.ts
var def10 = /* @__PURE__ */ (() => {
  const PAGE = 6;
  return {
    name: "Active projects",
    about: "Your projects with their next step and shortcuts",
    width: 12,
    variants: [["strip", "Strip"], ["cards", "Cards"], ["list", "List"], ["rings", "Rings"], ["browse", "Browse"], ["panel", "Panel"]],
    async render(body2, ctx) {
      const { ui, data, act, config, variant, store, vault } = ctx;
      const { el } = ui;
      const allProjects = await data.projects();
      const projects = allProjects.filter((p) => p.active);
      const countText = (p) => p.total ? (p.open.length ? p.open.length + " open · " : "All done · ") + p.done + "/" + p.total : "No tasks yet";
      const shortcuts = (parent, p, cls) => {
        if (!p.links.length) return null;
        const nav = el(parent, "nav", cls);
        nav.setAttribute("aria-label", p.name + " shortcuts");
        for (const [path, label] of p.links) ui.link(nav, path, label, "hp-link m-proj-tab");
        return nav;
      };
      if (variant === "browse") return drawBrowse();
      ui.section(body2, projects.length === 1 ? "Active project" : "Active projects");
      const count = projects.length ? projects.length + " active" : "";
      // The module's card, with "N active" and its buttons (All projects →, +) in its top row.
      const card = (cls, tag = "div", label = count) => {
        const box2 = el(body2, tag, cls + " hp-card hp-grow");
        const head = ui.bar(box2, { label });
        ui.link(head.tools, config.projectsIndex, variant === "rings" ? "All →" : "All projects →");
        ui.button(head.tools, "hp-knob hp-round m-proj-new", "plus", "", "New project", () => act.newFrom("project"));
        return box2;
      };
      if (variant === "panel") {
        const panel = el(body2, "section", "m-proj-panel hp-card hp-grow");
        ui.bar(panel, { label: count });
        const list2 = el(panel, "div", "m-proj-scroll");
        list2.setAttribute("role", "region");
        list2.setAttribute("aria-label", "Active projects list");
        list2.tabIndex = 0;
        if (!projects.length) el(list2, "div", "hp-empty", "No projects are currently marked as active.");
        for (const p of projects) {
          const row = el(list2, "article", "m-proj-prow");
          ui.link(el(row, "div", "m-proj-title"), p.page.file.path, p.name);
          if (p.description) ui.render(el(row, "div", "m-proj-sub"), p.page.description);
          shortcuts(row, p, "m-proj-links");
        }
        const foot = el(panel, "div", "m-proj-pfoot");
        ui.link(foot, config.projectsIndex, "All projects →");
        ui.button(foot, "hp-btn hp-pill", "plus", "New project", "Create a new project", () => act.newFrom("project"));
        return;
      }
      if (!projects.length) {
        el(card("m-proj-empty"), "p", "hp-empty", "No project is marked active.");
        return;
      }
      if (variant === "rings") {
        const grid = el(card("m-proj-box is-rings"), "div", "m-proj-rings");
        for (const p of projects) {
          const card2 = el(grid, "article", "m-proj-ring hp-panel");
          const top = el(card2, "div", "m-proj-ring-top");
          ui.ring(top, p.total ? p.done / p.total * 100 : 0, 54, 5, p.total ? p.done + "/" + p.total : "—", p.total && !p.open.length ? "is-done" : "");
          const head = el(top, "div", "m-proj-ring-head");
          ui.link(el(head, "div", "m-proj-title"), p.page.file.path, p.name);
          el(head, "div", "m-proj-sub", p.total ? p.open.length ? ui.plural(p.open.length, "open task", "open tasks") : "All tasks done" : "No tasks yet");
          if (p.description) el(card2, "div", "m-proj-sub m-proj-desc", p.description);
          const foot = el(card2, "div", "m-proj-ring-foot");
          shortcuts(foot, p, "m-proj-links");
          ui.toggle(foot, p.active, "Active", "Untick when this project is finished; it leaves the homepage", (on, input) => act.setActive(p.page, on, input, card2));
        }
        return;
      }
      if (variant === "cards") {
        const grid = el(card("m-proj-box is-cards"), "div", "m-proj-cards");
        for (const p of projects) projectCard(grid, p);
        return;
      }
      function projectCard(grid, p, recent) {
        {
          const card = el(grid, "article", "m-proj-card hp-panel" + (p.active ? "" : " is-inactive"));
          const head = el(card, "div", "");
          ui.link(ui.heading(head, 3, "m-proj-title"), p.page.file.path, p.name);
          if (p.description) el(head, "p", "m-proj-sub", p.description).title = p.description;
          const facts = el(card, "div", "m-proj-facts");
          for (const [n2, label] of [[p.open.length, "open actions"], [p.notes, "notes"], [p.meetings, "meetings"]]) {
            const f = el(facts, "div", "");
            el(f, "b", "hp-num", String(n2));
            el(f, "span", "", label);
          }
          const prog = el(card, "div", "m-proj-progress");
          ui.meter(prog, p.total ? p.done / p.total * 100 : 0);
          el(prog, "span", "", p.total ? p.done + " of " + p.total + " actions done" : "No tracked actions yet");
          const step = el(card, "div", "m-proj-step");
          el(step, "span", "hp-label", "Next step");
          if (ctx.act.present(p.taskPath)) ui.link(step, p.taskPath, p.open[0]?.text || (p.total ? "All tracked actions complete. Plan what comes next →" : "Give this project its first action →"));
          else ui.link(step, p.page.file.path, "Open the project to plan its next step →");
          if (recent?.length) {
            const box2 = el(card, "div", "m-proj-recent");
            el(box2, "span", "hp-label", "Recent");
            for (const q of recent) {
              const row = el(box2, "div", "m-proj-recent-row");
              ui.link(row, q.file.path, q.file.name.replace(data.EMOJI, ""));
              el(row, "span", "", q.document_type === "meeting" ? "Meeting" : "Note");
            }
          }
          const foot = el(card, "div", "m-proj-foot");
          ui.toggle(foot, p.active, "Active", "Untick when this project is finished; it leaves the homepage", (on, input) => act.setActive(p.page, on, input, card));
          shortcuts(foot, p, "m-proj-links");
        }
      }
      function drawBrowse() {
        store.mode ??= "active";
        store.query ??= "";
        store.shown ??= PAGE;
        const all = allProjects;
        const fold = (t) => String(t || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/đ/g, "d");
        const recentOf = (p) => vault.pages(p.folder).filter((q) => q.document_type === "note" || q.document_type === "meeting").sort((a, b) => b.file.mtime.toMillis() - a.file.mtime.toMillis()).slice(0, 2);
        const head = el(body2, "div", "hp-sec");
        const title = ui.heading(head, 2, "hp-sec-title", "");
        el(head, "span", "m-proj-badge", String(all.filter((p) => p.active).length));
        // One card: the filters and search with + Project in its top row, the projects, then Show more.
        const box2 = el(body2, "div", "m-proj-box is-browse hp-card hp-grow");
        const bar = ui.bar(box2);
        ui.button(bar.tools, "hp-knob hp-round m-proj-new", "plus", "", "New project", () => act.newFrom("project"));
        const tools = el(null, "div", "m-proj-tools hp-bar-main");
        bar.row.insertBefore(tools, bar.tools);
        const filters = el(tools, "div", "m-proj-filter hp-track");
        filters.setAttribute("role", "group");
        filters.setAttribute("aria-label", "Project filters");
        const filterBtns = [["active", "Active"], ["all", "All"], ["inactive", "Inactive"]].map(([mode, label]) => {
          const b = ui.button(filters, "m-proj-filter-btn", "", label, "Show " + label.toLowerCase() + " projects", () => {
            store.mode = mode;
            store.shown = PAGE;
            draw();
          });
          b.dataset.mode = mode;
          return b;
        });
        const search = el(tools, "input", "m-proj-search hp-track");
        search.type = "search";
        search.placeholder = "Find a project…";
        search.setAttribute("aria-label", "Search projects");
        search.value = store.query;
        search.addEventListener("input", () => {
          store.query = search.value;
          store.shown = PAGE;
          draw();
        });
        const grid = el(box2, "div", "m-proj-cards is-browse");
        const more = ui.button(box2, "hp-btn hp-pill m-proj-more", "", "Show more projects", "Show more projects", () => {
          store.shown += PAGE;
          draw();
        });
        function draw() {
          title.textContent = store.mode === "active" ? "Active projects" : store.mode === "inactive" ? "Inactive projects" : "All projects";
          for (const b of filterBtns) b.setAttribute("aria-pressed", String(b.dataset.mode === store.mode));
          grid.replaceChildren();
          const q = fold(store.query);
          const list2 = all.filter((p) => (store.mode === "all" || (store.mode === "active" ? p.active : !p.active)) && fold(p.name + " " + p.description).includes(q));
          more.hidden = list2.length <= store.shown;
          if (!list2.length) {
            const empty = el(grid, "div", "m-proj-none hp-panel");
            el(empty, "b", "", q ? "No matching projects." : "A little room to begin.");
            el(empty, "p", "", q ? "Try a different name, or switch the project filter." : "Create a project, or turn on Active in an existing project's Home note.");
            ui.link(empty, config.projectsIndex, "Open all projects →");
          }
          for (const p of list2.slice(0, store.shown)) projectCard(grid, p, recentOf(p));
        }
        draw();
      }
      if (variant === "list") {
        const list2 = card("m-proj-list");
        for (const p of projects) {
          const row = el(list2, "div", "m-proj-row");
          ui.link(el(row, "div", "m-proj-title"), p.page.file.path, p.name);
          el(row, "span", "m-proj-count", countText(p));
          ui.meter(row, p.total ? p.done / p.total * 100 : 0);
          if (p.open[0]) {
            const nx = el(row, "div", "m-proj-next");
            el(nx, "span", "hp-label", "Next");
            el(nx, "span", "", p.open[0].text);
          }
          shortcuts(row, p, "m-proj-links");
        }
        return;
      }
      const box = card("m-proj-strip", "section");
      const pr = projects[0];
      const line = el(box, "div", "m-proj-line");
      const titleBox = el(line, "div", "");
      ui.link(ui.heading(titleBox, 3, "m-proj-title m-proj-title-big"), pr.page.file.path, pr.name);
      el(titleBox, "div", "m-proj-count", countText(pr) + (pr.open[0] ? " · next: " + pr.open[0].text : ""));
      shortcuts(line, pr, "m-proj-tabs hp-pill");
      if (projects.length > 1) ui.link(box, config.projectsIndex, "+" + (projects.length - 1) + " more →", "hp-link m-proj-more");
    }
  };
})();
def10.watch = (paths, { config }) => anyUnder(paths, config.projectsFolder);
var active_projects_default = def10;

