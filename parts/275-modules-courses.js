// src/modules/courses.ts
var defCourses = /* @__PURE__ */ (() => {
  const COUNT = 6;
  const DATE_LINE = /Date:\s*\[\[(\d{4}-\d{2}-\d{2})\]\]/;
  const OPEN = /^(\s*[-*+]\s+\[) (\])/;
  const clean = (text) => String(text).split("\n")[0].replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2").trim();
  return {
    name: "Courses",
    about: "Your active courses with their open tasks and latest class",
    width: 12,
    variants: [],
    async render(body2, { ui, app, vault, time, data, act, config }) {
      const { el } = ui;
      const say = (m) => new import_obsidian2.Notice(m);
      const courses = vault.pages(config.coursesFolder).filter((p) => p.document_type === "course-dashboard" && data.isActive(p)).sort((a, b) => ui.textOf(a.course).localeCompare(ui.textOf(b.course)));
      ui.section(body2, "Courses");
      const card = el(body2, "div", "m-courses-card hp-card hp-grow");
      const head = ui.bar(card, { label: courses.length ? courses.length + " active" : "" });
      ui.link(head.tools, config.coursesIndex, "All courses →");
      ui.button(head.tools, "hp-knob hp-round", "plus", "", "New course", () => act.newFrom("course"));
      if (!courses.length) {
        const empty = el(card, "div", "hp-empty", "No active courses. ");
        ui.link(empty, config.coursesIndex, "All courses →");
        return;
      }
      const list2 = el(card, "div", "m-courses");
      for (const p of courses) {
        const folder = p.file.folder, name = ui.textOf(p.course) || folder.split("/").pop(), taskPath = folder + "/Tasks.md";
        const row = el(list2, "article", "m-courses-row hp-panel");
        const top = el(row, "div", "m-courses-top");
        const copy = el(top, "div", "m-courses-copy");
        ui.link(el(copy, "div", "m-courses-name"), p.file.path, name);
        const meta = el(copy, "div", "m-courses-meta", ui.textOf(p.teacher));
        ui.button(top, "hp-btn hp-pill", "plus", "Class", "Add a class to " + name, () => act.newFrom("class", folder + "/Classes"));
        const classes = await Promise.all(vault.pages(folder + "/Classes").filter((c) => c.document_type === "class").map(async (c) => {
          const line = (await app.vault.cachedRead(c.file.file).catch(() => "")).match(DATE_LINE);
          return { c, at: (line && time.toDate(line[1])) || c.file.ctime };
        }));
        const last = classes.sort((a, b) => b.at.toMillis() - a.at.toMillis())[0];
        if (last) {
          if (meta.textContent) meta.append(" · ");
          meta.append("Latest class ");
          ui.link(meta, last.c.file.path, last.c.file.name.replace(data.EMOJI, ""));
          meta.append(", " + last.at.setLocale("en").toFormat("d LLL"));
        }
        const open = (await Promise.all(vault.pages(folder).map((q) => vault.tasks(q)))).flat().filter((t) => !t.completed && t.status !== "-" && clean(t.text));
        const tasks = el(row, "div", "m-courses-tasks");
        for (const t of open.slice(0, COUNT)) {
          const item = el(tasks, "div", "m-courses-task");
          const tick = ui.button(item, "hp-knob hp-round m-courses-tick", "check", "", "Done: " + clean(t.text), async () => {
            tick.disabled = true;
            const file = app.vault.getAbstractFileByPath(t.path);
            let ok = false;
            try {
              await app.vault.process(file, (text) => {
                const eol = text.includes("\r\n") ? "\r\n" : "\n", lines = text.split(/\r?\n/);
                // only tick the line if it is still this open task; the note may have changed since it was drawn
                if (OPEN.test(lines[t.line] ?? "") && clean(lines[t.line]).endsWith(clean(t.text))) {
                  lines[t.line] = toggled(lines[t.line], true);
                  ok = true;
                }
                return lines.join(eol);
              });
            } catch (err) {
              console.error(err);
            }
            if (!ok) {
              tick.disabled = false;
              say("That task changed in its note, so nothing was saved.");
            }
          });
          ui.link(item, t.path, clean(t.text), "hp-link m-courses-text");
        }
        if (open.length > COUNT) ui.link(tasks, taskPath, open.length - COUNT + " more →", "hp-link m-courses-meta");
        const box2 = el(row, "input", "m-courses-add");
        box2.type = "text";
        box2.placeholder = "Add a task…";
        box2.setAttribute("aria-label", "New task for " + name);
        box2.addEventListener("keydown", async (e) => {
          const words = box2.value.replace(/\s+/g, " ").trim();
          if (e.key !== "Enter" || !words || box2.disabled) return;
          box2.disabled = true;
          try {
            const file = app.vault.getAbstractFileByPath(taskPath);
            if (file) await app.vault.process(file, (text) => {
              const eol = text.includes("\r\n") ? "\r\n" : "\n";
              return text.replace(/\s*$/, "") + eol + "- [ ] " + words + eol;
            });
            else await app.vault.create(taskPath, "- [ ] " + words + "\n");
            box2.value = "";
          } catch (err) {
            console.error(err);
            say("Could not add the task to " + taskPath);
          }
          box2.disabled = false;
        });
      }
    }
  };
})();
defCourses.watch = (paths, { config }) => anyUnder(paths, config.coursesFolder);
var courses_default = defCourses;

