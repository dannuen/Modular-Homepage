// src/modules/banner.ts
var def2 = /* @__PURE__ */ (() => {
  const FADE_DEFAULT = { color: "page", strength: 100, reach: 100 };
  function imageFor(ctx, setting) {
    const path = typeof setting === "string" ? setting.match(/^!?\[\[([^|\]]+)(?:\|[^\]]*)?\]\]$/)?.[1] || setting : setting?.path;
    return path ? ctx.app.metadataCache.getFirstLinkpathDest(path, ctx.self.file.path) : null;
  }
  function fadeOf({ color, strength, reach }) {
    const base = color === "page" ? "var(--background-primary)" : color === "accent" ? "var(--interactive-accent)" : color;
    const r = (x) => Math.round(x * 100) / 100;
    const stop = (alpha, at) => "color-mix(in srgb, " + base + " " + r(alpha * strength / 100) + "%, transparent) " + r(at * reach / 100) + "%";
    return "linear-gradient(180deg, " + [stop(100, 30), stop(94, 45), stop(55, 70), stop(10, 100)].join(", ") + ")";
  }
  return {
    name: "Banner",
    about: "A photo across the page, from Homepage's properties",
    width: 12,
    variants: [["photo", "Photo"], ["hero", "Hero"]],
    settings: { property: "banner" },
    async render(body2, ctx) {
      const { ui, settings, variant, app, self } = ctx;
      const file = imageFor(ctx, self?.[settings.property]);
      if (variant === "hero") return hero(body2, ctx, file);
      if (!file) {
        ui.el(body2, "div", "hp-empty hp-card m-banner-empty", "No picture yet: set “" + settings.property + "” in Homepage's properties to an image, e.g. ![[photo.jpg]].");
        return;
      }
      const img = ui.el(body2, "img", "m-banner-photo");
      img.src = app.vault.getResourcePath(file);
      img.alt = "";
      img.decoding = "async";
    }
  };
  async function hero(body2, ctx, savedFile) {
    const { ui, time, data, act, app, self, config, settings, page, life, redraw } = ctx;
    const { el } = ui;
    const box = el(body2, "div", "m-banner-hero");
    const said = time.greeting();
    life.interval(() => time.greeting() !== said && redraw(), 6e4); // "Good morning" turns to afternoon at 12:00, evening at 18:00
    const img = el(box, "img", "m-banner-img");
    img.alt = "";
    img.decoding = "async";
    const showPhoto = (f) => {
      if (f) {
        img.src = app.vault.getResourcePath(f);
        img.hidden = false;
      } else {
        img.removeAttribute("src");
        img.hidden = true;
      }
    };
    ui.icon(el(box, "div", "m-banner-mark"), "lighthouse");
    el(box, "div", "m-banner-greet", time.greeting() + ", " + config.name);
    ui.heading(box, 1, "m-banner-title hp-num", time.today.setLocale("en").toFormat("cccc, d LLLL"));
    const next = data.upcoming()[0];
    const sub = el(box, "div", "m-banner-sub");
    if (next) {
      const n2 = time.daysUntil(next.date), t = next.time, where = data.churchesOf(next.page)[0];
      el(sub, "span", "", "Next preaching ");
      el(sub, "strong", "", time.relLabel(n2).toLowerCase() + (n2 > 1 ? ", " + next.date.setLocale("en").toFormat("cccc d LLL") : "") + (t ? " " + time.PERIODS[t.period].label.toLowerCase() + (t.clock ? " (" + t.clock + ")" : "") : ""));
      if (where) el(sub, "span", "", " at " + where);
      ui.link(el(box, "div", "m-banner-sermon"), next.page.file.path, next.page.file.name);
    } else el(sub, "span", "", "No preaching dates are scheduled.");
    const weekStart = time.today.startOf("week"), weekEnd = weekStart.plus({ days: 6 });
    const stats = el(box, "div", "m-banner-stats");
    for (const [n2, label] of [
      [data.entries().filter((e) => data.isActive(e.page) && e.date >= weekStart && e.date <= weekEnd).length, "this week"],
      [data.sermons().filter(data.isActive).length, "active sermons"],
      [(await data.projects()).filter((p) => p.active).length, "active projects"]
    ]) {
      const s2 = el(stats, "div", "m-banner-stat");
      el(s2, "b", "", String(n2));
      el(s2, "span", "", label);
    }
    const read = () => {
      const c = String(self?.banner_fade_color ?? FADE_DEFAULT.color).trim();
      return {
        color: c.toLowerCase() === "accent" ? "accent" : !c || c.toLowerCase() === "page" || !CSS.supports("color", c) ? "page" : c,
        strength: data.clampPct(self?.banner_fade_strength, FADE_DEFAULT.strength),
        reach: data.clampPct(self?.banner_fade_reach, FADE_DEFAULT.reach),
        photo: savedFile ? savedFile.path : null
      };
    };
    let cfg = read();
    const gear = ui.button(box, "m-banner-gear", "sliders", "", "Banner photo and fade");
    const set = ui.settings(box, gear, life, "Banner", () => {
      cfg = read();
      sync();
    });
    const shows = [];
    const photoName = el(null, "span", "hp-set-value");
    set.row("Photo").append(photoName);
    const tiles = set.tiles();
    const photoTiles = [[null, set.tile(tiles, "None", null, () => {
      cfg.photo = null;
      sync();
    })]];
    for (const f of data.images()) photoTiles.push([f.path, set.tile(tiles, f.name, app.vault.getResourcePath(f), () => {
      cfg.photo = f.path;
      sync();
    })]);
    if (photoTiles.length === 1) el(set.box, "div", "hp-empty", "No images in " + config.attachments);
    const colorCtl = set.row("Fade colour");
    shows.push(set.chips(colorCtl, [["page", "Page", "Follow the page background"], ["accent", "Accent", "The theme's accent colour"]], () => cfg.color, (v) => {
      cfg.color = v;
      sync();
    }));
    const showColor = set.color(colorCtl, "Pick a fade colour", page.themeHex(), (v) => {
      cfg.color = v;
      sync();
    });
    const showStrength = set.slider("Strength", (v) => {
      cfg.strength = v;
      sync();
    });
    const showReach = set.slider("Reach", (v) => {
      cfg.reach = v;
      sync();
    });
    set.actions(() => {
      cfg = { ...FADE_DEFAULT, photo: read().photo };
      sync();
    }, async () => {
      const fields = { banner_fade_color: cfg.color, banner_fade_strength: cfg.strength, banner_fade_reach: cfg.reach, [settings.property]: cfg.photo ? "![[" + cfg.photo + "]]" : "" };
      if (await act.saveProps(fields, "Banner")) set.close(false);
    });
    function sync() {
      box.style.setProperty("--m-fade", fadeOf(cfg));
      showPhoto(cfg.photo ? app.vault.getAbstractFileByPath(cfg.photo) : null);
      for (const [path, t] of photoTiles) t.classList.toggle("is-on", path === cfg.photo);
      photoName.textContent = cfg.photo ? cfg.photo.split("/").pop() : "None";
      shows.forEach((fn) => fn());
      showColor(cfg.color);
      showStrength(cfg.strength);
      showReach(cfg.reach);
    }
    sync();
  }
})();
def2.watch = (paths, { config }) => anyUnder(paths, config.sermonFolder, config.projectsFolder, config.attachments);
var banner_default = def2;

