// src/modules/countdown.ts
var import_obsidian6 = require("obsidian");
var def6 = /* @__PURE__ */ (() => {
  const STORE_KEY = "home-countdown-target";
  const TAG2 = "#countdown";
  const UNITS2 = [["d", "day", "days"], ["h", "hour", "hours"], ["m", "minute", "minutes"], ["s", "second", "seconds"]];
  // The flip clock is the only countdown; these are its styles. A saved look that is gone falls back to the first.
  const VARIANTS = [["flip", "Classic"], ["dark", "Dark flaps"], ["poster", "Big digits"], ["odometer", "Odometer"]];
  const pad = (n2, w = 2) => String(n2).padStart(w, "0");
  const plain = (s2) => String(s2 ?? "").replace(/\[\[([^\]|]*\|)?([^\]]*)\]\]/g, "$2").replace(/\[([^\]]*)\]\([^)]*\)/g, "$1").replace(/(\*\*|__|~~|==|`)/g, "").replace(/\s+/g, " ").trim();
  const TAG_RE = /(^|\s)#countdown(?![\p{L}\p{N}_/-])/iu;
  const DAY_RE = /\[\[(?:[^\]|#]*\/)?(\d{4}-\d{2}-\d{2})(?:[|#][^\]]*)?\]\]/;
  function lineOf2(text) {
    const line = String(text ?? "").split("\n")[0];
    const tag = line.match(TAG_RE), day = line.match(DAY_RE);
    if (!tag || !day) return null;
    const before = plain(line.slice(0, tag.index));
    const rest = plain(line.slice(tag.index + tag[0].length).replace(DAY_RE, " "));
    return { name: before || rest || day[1], iso: day[1] };
  }
  return {
    name: "Countdown",
    about: "A live countdown to the dates you tag #countdown in your notes, as a flip clock in four styles",
    width: 12,
    variants: VARIANTS,
    lineOf: lineOf2,
    // for the harness
    async render(body2, ctx) {
      const { ui, time, data, variant, life, store, app, vault, seen, setVariant } = ctx;
      const { el } = ui;
      const { DateTime: DateTime2 } = time;
      const doc = body2.ownerDocument, win = doc.defaultView || window;
      const still = !!win.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      const skin = VARIANTS.some(([k]) => k === variant) ? variant : "flip";
      const fmt2 = (d, f) => d.setLocale("en").toFormat(f);
      const uid = "cd" + Math.random().toString(36).slice(2, 8);
      const tagged = await Promise.all(vault.pagesWithTag(TAG2).map(async (p) => ({ p, lists: await vault.lists(p) })));
      seen.clear();
      for (const { p } of tagged) seen.add(p.file.path);
      function collect(now2) {
        const out = [], seen2 = /* @__PURE__ */ new Set();
        for (const { p, lists } of tagged) {
          for (const item of lists) {
            const x = lineOf2(item.text);
            const at = x && DateTime2.fromISO(x.iso);
            if (!at?.isValid || at.plus({ days: 1 }) <= now2) continue;
            const id = x.name + "|" + x.iso;
            if (seen2.has(id)) continue;
            seen2.add(id);
            const m = x.name.match(data.EMOJI), name = m ? x.name.slice(m[0].length) || x.name : x.name;
            out.push({
              id,
              label: name,
              title: name,
              emoji: m && name !== x.name ? m[1] : "",
              path: p.file.path,
              at
            });
          }
        }
        return out.sort((a, b) => a.at - b.at || a.label.localeCompare(b.label));
      }
      function stateOf(t, now2) {
        const left = t.at.toMillis() - now2.toMillis();
        const live = left <= 0 && now2 < t.at.plus({ days: 1 }); // the whole day, 23 or 25 hours on a DST change
        const total = Math.max(0, Math.ceil(left / 1e3));
        return {
          left,
          total,
          live,
          over: left <= 0 && !live,
          d: Math.floor(total / 86400),
          h: Math.floor(total % 86400 / 3600),
          m: Math.floor(total % 3600 / 60),
          s: total % 60
        };
      }
      const partsOf = (st) => UNITS2.filter(([k]) => (k !== "s" || !st.d && !st.h) && st[k]).map(([k, one, many]) => [st[k], st[k] === 1 ? one : many]);
      const joined = (list2) => list2.length < 2 ? list2.join("") : list2.slice(0, -1).join(", ") + " and " + list2.at(-1);
      const spoken2 = (st) => joined(partsOf(st).map(([n2, u]) => n2 + " " + u));
      const whenText = (x) => fmt2(x.at, x.at.year === DateTime2.now().year ? "cccc d LLLL" : "cccc d LLLL yyyy");
      function caption(parent, t, cls = "") {
        const cap = el(parent, "div", ("m-cd-cap " + cls).trim());
        el(cap, "div", "hp-kicker m-cd-kicker", "Counting down to");
        const title = ui.heading(cap, 3, "m-cd-title");
        if (t.emoji) el(title, "span", "m-cd-emoji", t.emoji);
        if (t.path) ui.link(title, t.path, t.title);
        else title.append(t.title);
        el(cap, "div", "m-cd-when", whenText(t)); // the clock carries the count
        return cap;
      }
      const half = (parent, cls, text) => {
        const h = el(parent, "span", cls);
        el(h, "span", "", text);
        return h;
      };
      function flap(parent, ch, cls) {
        const c = el(parent, "span", cls);
        const top = half(c, "m-cd-half is-top", ch).firstChild, bottom = half(c, "m-cd-half is-bottom", ch).firstChild;
        let cur = ch;
        return {
          node: c,
          set(next) {
            if (next === cur) return;
            const old = cur;
            cur = next;
            for (const n2 of c.querySelectorAll(":scope > .m-cd-leaf")) n2.remove();
            top.textContent = next;
            if (still || doc.hidden) {
              bottom.textContent = next;
              return;
            }
            bottom.textContent = old;
            const fold = half(c, "m-cd-leaf is-fold", old), unfold = half(c, "m-cd-leaf is-unfold", next);
            unfold.addEventListener("animationend", () => {
              bottom.textContent = cur;
              fold.remove();
              unfold.remove();
            }, { once: true });
          }
        };
      }
      // Odometer and Big digits roll each digit up a strip of 0-9 instead of folding a flap.
      function roll(parent, ch, cls) {
        const c = el(parent, "span", cls + " is-roll");
        const strip = el(c, "span", "m-cd-roll");
        for (const n2 of "0123456789") el(strip, "span", "", n2);
        let cur = ch;
        strip.style.setProperty("--n", ch);
        return {
          node: c,
          set(next) {
            // 0 to 9 (the digit wrapping) jumps instead of rolling back over every digit.
            const jump = next > cur;
            cur = next;
            if (jump) strip.style.transition = "none";
            strip.style.setProperty("--n", next);
            if (jump) {
              void strip.offsetHeight;
              strip.style.transition = "";
            }
          }
        };
      }
      // Big digits: the first image in the countdown's note, else a photo named like it in the attachments, else a mesh.
      function photo(parent, t) {
        const meta = app.metadataCache, file = t.path && app.vault.getAbstractFileByPath(t.path);
        const embed = file && meta?.getFileCache?.(file)?.embeds?.find((e) => /\.(png|jpe?g|webp|gif|avif)$/i.test(e.link));
        const img = embed && meta.getFirstLinkpathDest(embed.link, t.path);
        if (!img) return ui.cover(parent, t.label, "m-cd-photo");
        const node = el(parent, "img", "hp-cover m-cd-photo");
        node.src = app.vault.getResourcePath(img);
        node.alt = "";
        return node;
      }
      function clock(stage2, t) {
        if (skin === "poster") {
          photo(stage2, t);
          el(stage2, "div", "m-cd-tint");
        }
        const wrap = el(stage2, "div", "m-cd-flip");
        caption(wrap, t);
        const clock3 = el(wrap, "div", "m-cd-clock");
        clock3.setAttribute("aria-hidden", "true");
        const cell = skin === "poster" || skin === "odometer" ? roll : flap;
        const groups = UNITS2.map(([k, , many], i) => {
          if (i) el(clock3, "span", "m-cd-colon" + (i === 1 ? " is-day" : ""), i === 1 && skin !== "poster" ? "" : ":");
          const g = el(clock3, "div", "m-cd-group is-" + k);
          const cards = el(g, "div", "m-cd-cards");
          el(g, "div", "m-cd-unit", many).dataset.short = many[0];
          return { k, cards, digits: [] };
        });
        return (st) => {
          for (const g of groups) {
            const text = pad(st[g.k], g.k === "d" && st.d > 99 ? 3 : 2);
            if (g.digits.length !== text.length) {
              g.cards.replaceChildren();
              g.digits = [...text].map((ch) => cell(g.cards, ch, "m-cd-card"));
              continue;
            }
            [...text].forEach((ch, i) => g.digits[i].set(ch));
          }
        };
      }
      const readSaved = () => {
        try {
          return app.loadLocalStorage ? app.loadLocalStorage(STORE_KEY) : win.localStorage.getItem(STORE_KEY);
        } catch {
          return null;
        }
      };
      const save = (id) => {
        try {
          if (app.saveLocalStorage) app.saveLocalStorage(STORE_KEY, id);
          else win.localStorage.setItem(STORE_KEY, id);
        } catch {
        }
      };
      const HINT = "Write a line like “- Christmas #countdown [[2026-12-24]]” in any note.";
      ui.section(body2, "Countdown");
      const card = el(body2, "div", "m-cd hp-card hp-grow is-" + skin);
      const aside = ui.bar(card, { float: true }).tools;
      const panels = /* @__PURE__ */ new Map();
      const syncPanels = () => {
        for (const [key, [button, strip]] of panels) {
          const on = store.panel === key;
          strip.hidden = !on;
          button.classList.toggle("is-open", on);
          button.setAttribute("aria-expanded", String(on));
        }
      };
      const panel = (key, button, strip) => {
        strip.id = uid + key;
        button.setAttribute("aria-controls", strip.id);
        button.addEventListener("click", () => {
          store.panel = store.panel === key ? null : key;
          syncPanels();
        });
        panels.set(key, [button, strip]);
      };
      if (typeof setVariant === "function") {
        const looks = el(card, "div", "m-cd-strip m-cd-looks");
        el(looks, "span", "hp-label", "Look");
        for (const [key, label] of VARIANTS) {
          const b = ui.button(looks, "hp-chip hp-pill m-cd-chip" + (key === skin ? " is-on" : ""), "", label, "Show the countdown as " + label.toLowerCase(), () => {
            if (key !== skin) setVariant(key);
          });
          b.setAttribute("aria-pressed", String(key === skin));
        }
        panel("looks", ui.button(aside, "hp-round hp-knob m-cd-look", "palette", "", "Change look"), looks);
      }
      const dates = el(card, "div", "m-cd-strip m-cd-dates");
      panel("dates", ui.button(aside, "hp-round hp-knob m-cd-gear", "gear", "", "Choose the date"), dates);
      syncPanels();
      const stage = el(card, "div", "m-cd-stage");
      stage.setAttribute("role", "timer");
      let targets = [], target = null, update = null, said = "", liveShown = null;
      function drawDates() {
        dates.replaceChildren();
        el(dates, "span", "hp-label", "Count down to");
        if (!targets.length) {
          el(dates, "span", "m-cd-hint", HINT);
          return;
        }
        for (const x of targets) {
          const b = ui.button(dates, "hp-chip hp-pill m-cd-chip" + (x === target ? " is-on" : ""), "", x.label, "Count down to " + x.title + ", " + whenText(x), () => {
            target = x;
            store.target = x.id;
            save(x.id);
            drawDates();
            drawStage();
          });
          el(b, "small", "m-cd-chip-date", fmt2(x.at, x.at.year === DateTime2.now().year ? "d LLL" : "d LLL yyyy"));
          b.setAttribute("aria-pressed", String(x === target));
        }
      }
      function drawStage() {
        stage.replaceChildren();
        liveShown = null;
        said = "";
        update = clock(stage, target);
        const now2 = DateTime2.now();
        show(stateOf(target, now2), now2);
      }
      function draw() {
        targets = collect(DateTime2.now());
        const want = store.target ?? readSaved();
        target = targets.find((x) => x.id === want || x.label === want) || targets[0] || null;
        drawDates();
        if (!target) {
          update = null;
          stage.replaceChildren();
          el(stage, "div", "hp-empty m-cd-empty", "Nothing to count down to yet. " + HINT);
          return;
        }
        drawStage();
      }
      function tick() {
        if (!update || !card.isConnected) return;
        const now2 = DateTime2.now();
        const st = stateOf(target, now2);
        if (st.over) {
          try {
            draw();
          } catch (err) {
            update = null;
            console.error("Homepage: countdown failed", err);
          }
          return;
        }
        show(st, now2);
      }
      function show(st, now2) {
        if (liveShown !== st.live) {
          liveShown = st.live;
          card.classList.toggle("is-live", st.live);
          for (const k of card.querySelectorAll(".m-cd-kicker")) k.textContent = st.live ? "Today" : "Counting down to";
        }
        update(st, now2);
        const words = st.live ? "Today: " + target.title : (spoken2({ ...st, s: 0 }) || "Less than a minute") + " until " + target.title;
        if (words !== said) {
          said = words;
          stage.setAttribute("aria-label", words);
        }
      }
      draw();
      life.interval(tick, 1e3);
    }
  };
})();
def6.watch = (paths, { app, seen }) => paths.some((p) => {
  if (seen.has(p)) return true;
  const file = app.vault.getAbstractFileByPath(p);
  const cache = file instanceof import_obsidian6.TFile ? app.metadataCache.getFileCache(file) : null;
  return !!cache && ((0, import_obsidian6.getAllTags)(cache) || []).some((t) => /^#countdown(\/|$)/i.test(t));
});
var countdown_default = def6;

