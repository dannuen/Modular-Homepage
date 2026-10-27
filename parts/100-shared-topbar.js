// src/shared/topbar.ts
function renderTopbar(env, input) {
  const NAME = env.config.name;
  const NAV = env.config.nav;
  const TEMPLATES = { ...env.config.templates, daily: env.config.dailyTemplate };
  const options = input || {};
  const app = env.app;
  const doc = env.container.ownerDocument;
  const make = (parent, tag, cls, text) => {
    const n2 = doc.createElement(tag);
    if (cls) n2.className = cls;
    if (text !== void 0) n2.textContent = text;
    if (parent) parent.append(n2);
    return n2;
  };
  function icon(parent, name) {
    const s2 = make(parent, "span", "hp-tb-ico");
    s2.setAttribute("aria-hidden", "true");
    s2.innerHTML = svgOf(name);
    return s2;
  }
  function button(parent, cls, iconName, label, title, onClick) {
    const b = make(parent, "button", cls);
    b.type = "button";
    icon(b, iconName);
    if (label) make(b, "span", "", label);
    b.title = title;
    b.setAttribute("aria-label", title);
    b.addEventListener("click", onClick);
    return b;
  }
  function link(parent, target, label) {
    return env.render(parent, Link.file(target, false, label), "hp-tb-value");
  }
  function notify(message) {
    new import_obsidian2.Notice(message);
  }
  const dailyFolder = (d) => env.config.dailyFolder + "/" + d.setLocale("en").toFormat("yyyy/MM-LLLL");
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
  async function openToday(newTab) {
    if (!newTab && app.commands.executeCommandById("periodic-notes:open-daily-note")) return;
    try {
      const today = DateTime.now().startOf("day");
      let file = app.vault.getAbstractFileByPath(dailyFolder(today) + "/" + today.toFormat("yyyy-MM-dd") + ".md");
      if (!file) file = await createFromTemplate(TEMPLATES.daily, dailyFolder(today), today.toFormat("yyyy-MM-dd"), false);
      if (file) await app.workspace.getLeaf(newTab ? "tab" : false).openFile(file);
    } catch (err) {
      console.error(err);
      notify("Could not open today's note");
    }
  }
  async function newFrom([template, folder, name], what) {
    try {
      await createFromTemplate(template, folder, name || void 0, true);
    } catch (err) {
      console.error(err);
      notify("Could not create a new " + what);
    }
  }
  const box = make(env.container, "div", "hp-tb-box");
  const bar = make(box, "header", "hp-tb-bar");
  const brand = make(bar, "div", "hp-tb-brand");
  icon(brand, "lighthouse");
  make(brand, "span", "", NAME);
  const here = (env.sourcePath || "").replace(/.(md|base)$/i, "");
  const goHome = (e) => app.workspace.openLinkText(env.homeNote, here, e.ctrlKey || e.metaKey);
  brand.setAttribute("role", "link");
  brand.tabIndex = 0;
  brand.title = "Open the homepage";
  brand.addEventListener("click", goHome);
  brand.addEventListener("keydown", (e) => {
    if (e.key === "Enter") goHome(e);
  });
  const nav = make(bar, "nav", "hp-tb-nav");
  nav.setAttribute("aria-label", "Main navigation");
  const isHere = (target) => {
    const file = app.metadataCache?.getFirstLinkpathDest?.(target, here);
    return (file?.path || target).replace(/.(md|base)$/i, "") === here;
  };
  for (const [target, label] of NAV) {
    const item = link(nav, target, label);
    if (isHere(target)) {
      item.classList.add("is-current");
      item.setAttribute("aria-current", "page");
    }
  }
  const glide = make(nav, "span", "hp-tb-glide");
  function glideTo(item) {
    const a = item.querySelector("a") || item;
    const r = a.getBoundingClientRect(), outer = nav.getBoundingClientRect();
    const fresh = !nav.classList.contains("is-gliding");
    if (fresh) glide.style.transition = "none";
    glide.style.setProperty("--tb-x", r.left - outer.left - nav.clientLeft + "px");
    glide.style.setProperty("--tb-y", r.top - outer.top - nav.clientTop + "px");
    glide.style.setProperty("--tb-w", r.width + "px");
    glide.style.setProperty("--tb-h", r.height + "px");
    if (fresh) {
      void glide.offsetWidth;
      glide.style.transition = "";
    }
    nav.classList.add("is-gliding");
  }
  for (const item of nav.children) {
    if (item === glide) continue;
    item.addEventListener("pointerenter", () => glideTo(item));
    item.addEventListener("focusin", () => glideTo(item));
  }
  nav.addEventListener("pointerleave", () => nav.classList.remove("is-gliding"));
  nav.addEventListener("focusout", (e) => {
    if (!nav.contains(e.relatedTarget)) nav.classList.remove("is-gliding");
  });
  const acts = make(bar, "div", "hp-tb-acts");
  const create = make(acts, "div", "hp-tb-create");
  create.setAttribute("role", "group");
  create.setAttribute("aria-label", "Create and open");
  const more = make(make(create, "div", "hp-tb-more"), "div", "hp-tb-more-in");
  button(more, "hp-tb-icon", "calendar", "", "Today's note", (e) => openToday(e.ctrlKey || e.metaKey));
  button(more, "hp-tb-icon", "note", "", "New note", () => newFrom(TEMPLATES.note, "note"));
  button(create, "hp-tb-primary", "plus", "New sermon", "Create a new sermon", () => newFrom(TEMPLATES.sermon, "sermon"));
  const extra = make(acts, "div", "hp-tb-extra");
  try {
    options.buttons?.(extra);
  } catch (err) {
    console.error("Top bar: extra buttons failed", err);
  }
  if (!extra.childElementCount) extra.remove();
}

