// src/modules/countdown.ts
var import_obsidian6 = require("obsidian");
var def6 = /* @__PURE__ */ (() => {
  const STORE_KEY = "home-countdown-target";
  const TAG2 = "#countdown";
  const UNITS2 = [["d", "day", "days"], ["h", "hour", "hours"], ["m", "minute", "minutes"], ["s", "second", "seconds"]];
  const VARIANTS = [["flip", "Flip clock"], ["rings", "Rings"], ["hourglass", "Hourglass"], ["candle", "Candle"], ["nixie", "Nixie tubes"], ["dots", "Dots"], ["words", "Words"], ["board", "Departures"]];
  const pad = (n2, w = 2) => String(n2).padStart(w, "0");
  const ONES = [
    "zero",
    "one",
    "two",
    "three",
    "four",
    "five",
    "six",
    "seven",
    "eight",
    "nine",
    "ten",
    "eleven",
    "twelve",
    "thirteen",
    "fourteen",
    "fifteen",
    "sixteen",
    "seventeen",
    "eighteen",
    "nineteen"
  ];
  const TENS = ["", "", "twenty", "thirty", "forty", "fifty", "sixty", "seventy", "eighty", "ninety"];
  function say(n2) {
    if (n2 < 20) return ONES[n2];
    if (n2 < 100) return TENS[Math.floor(n2 / 10)] + (n2 % 10 ? "-" + ONES[n2 % 10] : "");
    if (n2 < 1e3) return ONES[Math.floor(n2 / 100)] + " hundred" + (n2 % 100 ? " and " + say(n2 % 100) : "");
    return n2.toLocaleString("en-US");
  }
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
    about: "A live countdown to the dates you tag #countdown in your notes, in eight skins",
    width: 12,
    variants: VARIANTS,
    lineOf: lineOf2,
    // for the harness
    async render(body2, ctx) {
      const { ui, time, act, data, variant, life, store, settings, app, vault, seen, setVariant } = ctx;
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
          const made = DateTime2.isDateTime(p.file.ctime) ? p.file.ctime : null;
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
              at,
              len: 1440,
              allDay: true,
              clock: "",
              start: made && made < at ? made : at.minus({ days: 30 })
            });
          }
        }
        return out.sort((a, b) => a.at - b.at || a.label.localeCompare(b.label));
      }
      function stateOf(t, now2) {
        const left = t.at.toMillis() - now2.toMillis();
        const live = left <= 0 && now2.toMillis() < t.at.toMillis() + t.len * 6e4;
        const total = Math.max(0, Math.ceil(left / 1e3));
        const span = Math.max(1e3, t.at.toMillis() - t.start.toMillis());
        return {
          left,
          total,
          live,
          over: left <= 0 && !live,
          d: Math.floor(total / 86400),
          h: Math.floor(total % 86400 / 3600),
          m: Math.floor(total % 3600 / 60),
          s: total % 60,
          progress: live ? 1 : Math.max(0, Math.min(1, 1 - left / span))
        };
      }
      const liveLabel = (t) => t.allDay ? "Today" : "Happening now";
      const plural = (n2, one, many) => n2 + " " + (n2 === 1 ? one : many);
      const partsOf = (st) => UNITS2.filter(([k]) => (k !== "s" || !st.d && !st.h) && st[k]).map(([k, one, many]) => [st[k], st[k] === 1 ? one : many]);
      const joined = (list2) => list2.length < 2 ? list2.join("") : list2.slice(0, -1).join(", ") + " and " + list2.at(-1);
      const spoken2 = (st) => joined(partsOf(st).map(([n2, u]) => n2 + " " + u));
      const short = (st) => st.d ? st.d + "d " + st.h + "h " + pad(st.m) + "m" : st.h ? st.h + "h " + pad(st.m) + "m " + pad(st.s) + "s" : st.m + "m " + pad(st.s) + "s";
      const whenText = (x) => fmt2(x.at, x.at.year === DateTime2.now().year ? "cccc d LLLL" : "cccc d LLLL yyyy") + (x.allDay ? "" : " · " + x.clock);
      const relText = (x) => time.relLabel(Math.round(x.at.startOf("day").diff(DateTime2.now().startOf("day"), "days").days));
      function caption(parent, t, cls = "") {
        const cap = el(parent, "div", ("m-cd-cap " + cls).trim());
        el(cap, "div", "hp-kicker m-cd-kicker", "Counting down to");
        const title = ui.heading(cap, 3, "m-cd-title");
        if (t.emoji) el(title, "span", "m-cd-emoji", t.emoji);
        if (t.path) ui.link(title, t.path, t.title);
        else title.append(t.title);
        el(cap, "div", "m-cd-when", whenText(t) + " · " + relText(t));
        if (t.sub) el(cap, "div", "m-cd-sub", t.sub);
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
      function flapRow(parent, cls, text) {
        const row = el(parent, "div", cls);
        let cells = [];
        const set = (s2) => {
          const chars = [...s2];
          if (chars.length !== cells.length) {
            row.replaceChildren();
            cells = chars.map((ch) => flap(row, ch, "m-cd-ch"));
            return;
          }
          chars.forEach((ch, i) => cells[i].set(ch));
        };
        set(text);
        return { row, set };
      }
      const bigTime = (parent) => {
        const b = el(parent, "div", "m-cd-big hp-num");
        return (st) => {
          b.textContent = st.live ? "Now" : short(st);
        };
      };
      const progressBar = (parent, t, label) => {
        const wrap = el(parent, "div", "m-cd-prog");
        const head = el(wrap, "div", "m-cd-prog-head");
        const pct = el(head, "b", "");
        el(head, "span", "", label);
        const m = el(wrap, "div", "hp-meter hp-track");
        const fill = el(m, "i", "hp-meter-fill");
        return (st) => {
          const p = Math.round(st.progress * 100);
          pct.textContent = p + "%";
          fill.style.width = p + "%";
        };
      };
      const sinceText = (t) => "of the time gone since " + fmt2(t.start, "d LLL");
      const SKINS = {
        flip(stage2, t) {
          const wrap = el(stage2, "div", "m-cd-flip");
          caption(wrap, t);
          const clock3 = el(wrap, "div", "m-cd-clock");
          const groups = UNITS2.map(([k, , many], i) => {
            if (i) el(clock3, "span", "m-cd-colon" + (i === 1 ? " is-day" : ""), i === 1 ? "" : ":");
            const g = el(clock3, "div", "m-cd-group is-" + k);
            const cards = el(g, "div", "m-cd-cards");
            el(g, "div", "m-cd-unit", many);
            return { k, cards, digits: [] };
          });
          return (st) => {
            for (const g of groups) {
              const text = pad(st[g.k], g.k === "d" && st.d > 99 ? 3 : 2);
              if (g.digits.length !== text.length) {
                g.cards.replaceChildren();
                g.digits = [...text].map((ch) => flap(g.cards, ch, "m-cd-card"));
                continue;
              }
              [...text].forEach((ch, i) => g.digits[i].set(ch));
            }
          };
        },
        rings(stage2, t) {
          const wrap = el(stage2, "div", "m-cd-rings");
          const fig = el(wrap, "div", "m-cd-orbit");
          const s2 = ui.svg(fig, "svg", { viewBox: "0 0 220 220", "aria-hidden": "true" });
          const W = 14, GAP = 5;
          const rings = UNITS2.map(([k], i) => {
            const r = (220 - W) / 2 - i * (W + GAP), c = 2 * Math.PI * r;
            ui.svg(s2, "circle", { cx: 110, cy: 110, r, fill: "none", "stroke-width": W }, "m-cd-ring-track");
            return { k, c, arc: ui.svg(s2, "circle", { cx: 110, cy: 110, r, fill: "none", "stroke-width": W, "stroke-linecap": "round", "stroke-dasharray": "0 " + c }, "m-cd-ring-arc is-" + k) };
          });
          const mid = el(fig, "div", "m-cd-orbit-mid");
          const big = el(mid, "b", "hp-num"), small = el(mid, "span", "");
          const side = el(wrap, "div", "m-cd-side");
          caption(side, t);
          const legend = el(side, "div", "m-cd-legend");
          const rows = UNITS2.map(([k, one, many]) => {
            const r = el(legend, "div", "m-cd-leg is-" + k);
            el(r, "i", "");
            return { k, one, many, b: el(r, "b", "hp-num"), s: el(r, "span", "") };
          });
          const days = Math.max(1, Math.ceil((t.at - t.start) / 864e5));
          return (st) => {
            const f = st.live ? { d: 1, h: 1, m: 1, s: 1 } : { d: Math.min(1, st.total / 86400 / days), h: st.total % 86400 / 86400, m: st.total % 3600 / 3600, s: st.total % 60 / 60 };
            for (const r of rings) {
              const len = f[r.k] * r.c;
              r.arc.setAttribute("stroke-dasharray", len + " " + r.c);
              r.arc.style.opacity = len < 0.5 ? "0" : "";
            }
            big.textContent = st.live ? "Now" : st.d ? String(st.d) : st.h ? st.h + ":" + pad(st.m) : st.m + ":" + pad(st.s);
            small.textContent = st.live ? "" : st.d ? st.d === 1 ? "day" : "days" : st.h ? "hours" : "minutes";
            for (const r of rows) {
              r.b.textContent = String(st[r.k]);
              r.s.textContent = st[r.k] === 1 ? r.one : r.many;
            }
          };
        },
        hourglass(stage2, t) {
          const wrap = el(stage2, "div", "m-cd-glass");
          const fig = el(wrap, "div", "m-cd-fig");
          const s2 = ui.svg(fig, "svg", { viewBox: "0 0 120 200", "aria-hidden": "true" });
          const defs = ui.svg(s2, "defs");
          ui.svg(ui.svg(defs, "clipPath", { id: uid + "t" }), "path", { d: "M30 15C30 60 56 82 57.5 100L62.5 100C64 82 90 60 90 15Z" });
          ui.svg(ui.svg(defs, "clipPath", { id: uid + "b" }), "path", { d: "M57.5 100C56 118 30 140 30 185L90 185C90 140 64 118 62.5 100Z" });
          const turn = ui.svg(s2, "g", {}, "m-cd-turn");
          const glass = "M30 15C30 60 56 82 57.5 100C56 118 30 140 30 185L90 185C90 140 64 118 62.5 100C64 82 90 60 90 15Z";
          ui.svg(turn, "path", { d: glass }, "m-cd-glass-fill");
          const top = ui.svg(turn, "path", { "clip-path": "url(#" + uid + "t)" }, "m-cd-sand");
          const bot = ui.svg(turn, "path", { "clip-path": "url(#" + uid + "b)" }, "m-cd-sand");
          const stream = ui.svg(turn, "line", { x1: 60, x2: 60, y1: 99, y2: 183 }, "m-cd-stream");
          ui.svg(turn, "path", { d: glass, fill: "none" }, "m-cd-glass-line");
          ui.svg(turn, "path", { d: "M36 24C36 54 50 74 54.5 90M36 176C36 150 48 132 54 116", fill: "none" }, "m-cd-shine");
          for (const [x, y, w, h] of [[8, 4, 104, 11], [8, 185, 104, 11], [14, 15, 5, 170], [101, 15, 5, 170]]) ui.svg(turn, "rect", { x, y, width: w, height: h, rx: h > 20 ? 2.5 : 4 }, "m-cd-frame");
          const side = el(wrap, "div", "m-cd-side");
          caption(side, t);
          const big = bigTime(side), prog = progressBar(side, t, sinceText(t));
          return (st) => {
            const r = 1 - st.progress;
            const yT = 100 - 78 * Math.sqrt(r), yB = 185 - 80 * (1 - Math.sqrt(1 - st.progress));
            top.setAttribute("d", r > 2e-3 ? "M20 " + yT + "Q60 " + (yT + 5) + " 100 " + yT + "L100 101L20 101Z" : "");
            bot.setAttribute("d", st.progress > 2e-3 ? "M20 186L20 " + (yB + 7) + "Q60 " + (yB - 7) + " 100 " + (yB + 7) + "L100 186Z" : "");
            stream.setAttribute("y2", String(Math.max(101, yB - 2)));
            stream.style.opacity = r > 2e-3 ? "" : "0";
            big(st);
            prog(st);
          };
        },
        candle(stage2, t) {
          const wrap = el(stage2, "div", "m-cd-candle");
          const fig = el(wrap, "div", "m-cd-fig");
          const s2 = ui.svg(fig, "svg", { viewBox: "0 -34 140 264", "aria-hidden": "true" });
          const defs = ui.svg(s2, "defs");
          const halo = ui.svg(defs, "radialGradient", { id: uid + "h" });
          ui.svg(halo, "stop", { offset: "0" }, "m-cd-halo-a");
          ui.svg(halo, "stop", { offset: "1" }, "m-cd-halo-b");
          const wax = ui.svg(defs, "linearGradient", { id: uid + "w", x1: "0", x2: "1", y1: "0", y2: "0" });
          for (const [o, c] of [["0", "edge"], ["0.3", "mid"], ["0.62", "mid"], ["1", "edge"]]) ui.svg(wax, "stop", { offset: o }, "m-cd-wax-" + c);
          const glow = ui.svg(s2, "circle", { cx: 70, r: 58, fill: "url(#" + uid + "h)" }, "m-cd-halo");
          ui.svg(s2, "ellipse", { cx: 70, cy: 216, rx: 56, ry: 9 }, "m-cd-plate-edge");
          ui.svg(s2, "ellipse", { cx: 70, cy: 212, rx: 56, ry: 9 }, "m-cd-plate");
          const bodyRect = ui.svg(s2, "rect", { x: 48, width: 44, rx: 3, fill: "url(#" + uid + "w)" }, "m-cd-wax");
          const ribbon = ui.svg(s2, "rect", { x: 48, y: 192, width: 44, height: 7 }, "m-cd-ribbon");
          const drips = ui.svg(s2, "path", { fill: "url(#" + uid + "w)" }, "m-cd-wax");
          const pool = ui.svg(s2, "ellipse", { cx: 70, rx: 22, ry: 4.5 }, "m-cd-pool");
          const wick = ui.svg(s2, "line", { x1: 70, x2: 70.6 }, "m-cd-wick");
          const at = ui.svg(s2, "g", {});
          const flame = ui.svg(at, "g", {}, "m-cd-flame");
          ui.svg(flame, "path", { d: "M0 -42C8 -27 13 -15 11 -8C9 1 -9 1 -11 -8C-13 -15 -8 -27 0 -42Z" }, "m-cd-flame-out");
          ui.svg(flame, "path", { d: "M0 -29C5 -19 7 -11 6 -7C4 -1 -4 -1 -6 -7C-7 -11 -5 -19 0 -29Z" }, "m-cd-flame-in");
          ui.svg(flame, "ellipse", { cx: 0, cy: -4, rx: 3.6, ry: 4.6 }, "m-cd-flame-blue");
          const side = el(wrap, "div", "m-cd-side");
          caption(side, t);
          const big = bigTime(side), prog = progressBar(side, t, sinceText(t));
          let lastY = null;
          return (st) => {
            const y = Math.round((212 - (18 + (1 - st.progress) * 150)) * 10) / 10;
            if (y !== lastY) {
              lastY = y;
              bodyRect.setAttribute("y", String(y));
              bodyRect.setAttribute("height", String(212 - y));
              pool.setAttribute("cy", String(y));
              drips.setAttribute("d", "M48.5 " + y + "L48.5 " + (y + 15) + "a3 3 0 0 0 6 0L54.5 " + y + "ZM81 " + y + "L81 " + (y + 24) + "a3.2 3.2 0 0 0 6.4 0L87.4 " + y + "Z");
              ribbon.style.display = y < 184 ? "" : "none";
              wick.setAttribute("y1", String(y));
              wick.setAttribute("y2", String(y - 9));
              at.setAttribute("transform", "translate(70 " + (y - 7) + ")");
              glow.setAttribute("cy", String(y - 26));
            }
            big(st);
            prog(st);
          };
        },
        nixie(stage2, t) {
          const wrap = el(stage2, "div", "m-cd-nixie");
          caption(wrap, t);
          const box = el(wrap, "div", "m-cd-tubes");
          const tubes = [];
          const groups = [["d", "Days"], ["h", "Hours"], ["m", "Min"], ["s", "Sec"]].map(([k, label], i) => {
            if (i) {
              const sep = el(box, "span", "m-cd-neon");
              el(sep, "i", "");
              el(sep, "i", "");
            }
            const g = el(box, "div", "m-cd-tgroup is-" + k);
            const row = el(g, "div", "m-cd-trow");
            el(g, "div", "m-cd-tlabel", label);
            return { k, row, cells: [] };
          });
          const tube = (parent) => {
            const tb = el(parent, "span", "m-cd-tube");
            const ghosts = el(tb, "span", "m-cd-ghosts");
            for (const n2 of "1234567890") el(ghosts, "span", "", n2);
            const lit = el(tb, "span", "m-cd-lit");
            const cell = { set: (ch) => {
              if (lit.textContent !== ch) lit.textContent = ch;
            }, shown: "", lit };
            tubes.push(cell);
            return cell;
          };
          let shuffling = 0, lastMinute = null;
          const shuffle = () => {
            if (still) return;
            const begin = win.performance.now(), run = ++shuffling;
            let lastStep = 0;
            const step = (now2) => {
              if (run !== shuffling || !wrap.isConnected) return;
              if (now2 - begin >= 650) {
                shuffling = 0;
                for (const c of tubes) c.lit.textContent = c.shown;
                return;
              }
              if (now2 - lastStep >= 50) {
                lastStep = now2;
                for (const c of tubes) c.lit.textContent = String(Math.floor(Math.random() * 10));
              }
              win.requestAnimationFrame(step);
            };
            win.requestAnimationFrame(step);
          };
          return (st) => {
            for (const g of groups) {
              const text = pad(st[g.k], g.k === "d" && st.d > 99 ? 3 : 2);
              if (g.cells.length !== text.length) {
                g.row.replaceChildren();
                g.cells = [...text].map(() => tube(g.row));
              }
              [...text].forEach((ch, i) => {
                g.cells[i].shown = ch;
                if (!shuffling) g.cells[i].set(ch);
              });
            }
            const minute = st.d + ":" + st.h + ":" + st.m;
            if (lastMinute !== null && minute !== lastMinute && !st.live) shuffle();
            lastMinute = minute;
          };
        },
        dots(stage2, t) {
          const wrap = el(stage2, "div", "m-cd-dots");
          const side = el(wrap, "div", "m-cd-side");
          caption(side, t);
          const count = el(side, "div", "m-cd-count");
          const num = el(count, "b", "m-cd-big hp-num"), unit = el(count, "span", "");
          const note = el(side, "div", "m-cd-dotnote");
          const field = el(wrap, "div", "m-cd-field");
          let mode = "", key = "", cells = [];
          const kindOf = (a, b, now2) => b <= t.start || a >= t.at.plus({ milliseconds: 1 }) ? "is-out" : a <= t.at && t.at < b ? "is-target" + (now2 >= a ? " is-now" : "") : b <= now2 ? "is-gone" : a <= now2 ? "is-now" : "is-left";
          function build(now2) {
            field.replaceChildren();
            field.className = "m-cd-field is-" + mode;
            cells = [];
            const dot = (row, a, b, title) => {
              const c = el(row, "i", "m-cd-dot");
              c.title = title;
              cells.push({ c, a, b });
            };
            if (mode === "hour") {
              const from = DateTime2.max(t.start, t.at.minus({ days: 7 })).startOf("day");
              const head = el(field, "div", "m-cd-drow is-head");
              el(head, "span", "m-cd-dlabel", "");
              for (let h = 0; h < 24; h++) el(head, "span", "m-cd-hlabel", h % 6 ? "" : String(h));
              for (let day = from; day <= t.at; day = day.plus({ days: 1 })) {
                const row = el(field, "div", "m-cd-drow");
                el(row, "span", "m-cd-dlabel", fmt2(day, "ccc d"));
                for (let h = 0; h < 24; h++) {
                  const a = day.plus({ hours: h });
                  dot(row, a, a.plus({ hours: 1 }), fmt2(a, "ccc d LLL, HH:00"));
                }
              }
            } else if (mode === "day") {
              const from = DateTime2.max(t.start, t.at.minus({ days: 120 })).startOf("week");
              const head = el(field, "div", "m-cd-drow is-head");
              el(head, "span", "m-cd-dlabel", "");
              for (const w of "MTWTFSS") el(head, "span", "m-cd-hlabel", w);
              for (let wk = from; wk <= t.at; wk = wk.plus({ weeks: 1 })) {
                const row = el(field, "div", "m-cd-drow");
                const end = wk.plus({ days: 6 });
                el(row, "span", "m-cd-dlabel", end.day <= 7 ? fmt2(end, "LLL") : wk.equals(from) ? fmt2(wk, "LLL") : "");
                for (let i = 0; i < 7; i++) {
                  const a = wk.plus({ days: i });
                  dot(row, a, a.plus({ days: 1 }), fmt2(a, "ccc d LLL"));
                }
              }
            } else {
              const from = DateTime2.max(t.start, t.at.minus({ weeks: 104 })).startOf("week");
              const row = el(field, "div", "m-cd-wrow");
              for (let wk = from; wk <= t.at; wk = wk.plus({ weeks: 1 })) dot(row, wk, wk.plus({ weeks: 1 }), "Week of " + fmt2(wk, "d LLL yyyy"));
            }
          }
          return (st, now2) => {
            const hours = st.left / 36e5;
            const m = st.live || hours <= 168 ? "hour" : hours <= 24 * 120 ? "day" : "week";
            if (m !== mode) {
              mode = m;
              key = "";
              build(now2);
            }
            const k = mode === "hour" ? now2.toFormat("yyyyMMddHH") : now2.toFormat("yyyyMMdd");
            if (k !== key) {
              key = k;
              for (const x of cells) x.c.className = "m-cd-dot " + kindOf(x.a, x.b, now2);
            }
            const n2 = st.live ? 0 : mode === "hour" ? Math.ceil(st.left / 36e5) : mode === "day" ? Math.ceil(st.left / 864e5) : Math.ceil(st.left / 6048e5);
            const u = mode === "hour" ? ["hour", "hours"] : mode === "day" ? ["day", "days"] : ["week", "weeks"];
            num.textContent = st.live ? "Now" : String(n2);
            unit.textContent = st.live ? liveLabel(t) : (n2 === 1 ? u[0] : u[1]) + " to go";
            note.textContent = "Each dot is " + (mode === "hour" ? "an hour" : mode === "day" ? "a day" : "a week") + ". Filled ones are gone.";
          };
        },
        words(stage2, t) {
          const wrap = el(stage2, "div", "m-cd-words");
          el(wrap, "div", "hp-kicker m-cd-kicker", "Counting down to");
          const line = el(wrap, "p", "m-cd-sentence");
          const until = el(wrap, "p", "m-cd-until");
          const foot = el(wrap, "div", "m-cd-when");
          let last = "";
          const name = (parent) => {
            const span = el(parent, "span", "m-cd-name");
            if (t.path) ui.link(span, t.path, t.title);
            else span.append(t.title);
            return span;
          };
          const untilText = (live) => {
            until.replaceChildren();
            const when = ", " + fmt2(t.at, "cccc d LLLL") + (t.allDay ? "" : " at " + t.clock) + ".";
            if (!live) until.append("until ");
            name(until);
            until.append(live ? " is here." : when);
          };
          return (st) => {
            const parts = st.live ? [] : partsOf(st);
            const text = st.live ? "live" : parts.map((p) => p.join(" ")).join();
            if (text !== last) {
              const liveChanged = last === "" || last === "live" !== st.live;
              last = text;
              line.replaceChildren();
              if (st.live || !parts.length) line.append(st.live ? "It's time." : "Any moment now.");
              parts.forEach(([n2, u], i) => {
                if (i) line.append(i === parts.length - 1 ? " and " : ", ");
                el(line, "em", "", i ? say(n2) : say(n2).replace(/^./, (c) => c.toUpperCase()));
                line.append(" " + u);
              });
              if (liveChanged) untilText(st.live);
            }
            const nights = Math.round(t.at.startOf("day").diff(DateTime2.now().startOf("day"), "days").days);
            const foot2 = st.live ? whenText(t) : ui.plural(Math.ceil(st.left / 36e5), "hour", "hours") + " to go · " + (nights > 0 ? plural(nights, "night", "nights") + " of sleep" : "today");
            if (foot.textContent !== foot2) foot.textContent = foot2;
          };
        },
        board(stage2, t) {
          const wrap = el(stage2, "div", "m-cd-board");
          const head = el(wrap, "div", "m-cd-brow is-head");
          for (const [cls, text] of [["m-cd-blamp", ""], ["m-cd-bname", "Countdown"], ["m-cd-bsub", ""], ["m-cd-bwhen", "When"], ["m-cd-bleft", "Time left"]]) el(head, "span", cls, text);
          const rows = targets.map((x) => {
            const row = el(wrap, "div", "m-cd-brow" + (x === t ? " is-picked" : ""));
            const lamp = el(row, "span", "m-cd-blamp");
            el(lamp, "i", "");
            flapRow(el(row, "div", "m-cd-bname"), "m-cd-flaps", x.label.toLocaleUpperCase("vi").slice(0, 24));
            el(row, "div", "m-cd-bsub", whenText(x));
            flapRow(el(row, "div", "m-cd-bwhen"), "m-cd-flaps", (fmt2(x.at, "ccc d LLL") + (x.allDay ? "" : " " + x.clock)).toUpperCase());
            const left = flapRow(el(row, "div", "m-cd-bleft"), "m-cd-flaps", "");
            if (x.path) ui.asLink(row, "Open " + x.title, (newTab) => act.openNote(x.path, newTab));
            return { x, row, left };
          });
          return (st, now2) => {
            for (const r of rows) {
              const s2 = stateOf(r.x, now2);
              r.left.set((s2.live ? "NOW" : s2.d ? s2.d + "D " + pad(s2.h) + "H " + pad(s2.m) + "M" : pad(s2.h) + ":" + pad(s2.m) + ":" + pad(s2.s)).padStart(11, " "));
              r.row.classList.toggle("is-live", s2.live);
              r.row.classList.toggle("is-soon", !s2.live && s2.left < 864e5);
            }
          };
        }
      };
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
      const aside = ui.bar(card, { float: skin !== "board" }).tools;
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
        update = SKINS[skin](stage, target);
        const now2 = DateTime2.now();
        show(stateOf(target, now2), now2);
      }
      function draw() {
        targets = collect(DateTime2.now());
        const want = store.target ?? readSaved() ?? settings?.target;
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
        if (st.over || skin === "board" && targets.some((x) => stateOf(x, now2).over)) {
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
          for (const k of card.querySelectorAll(".m-cd-kicker")) k.textContent = st.live ? liveLabel(target) : "Counting down to";
        }
        update(st, now2);
        const words = st.live ? liveLabel(target) + ": " + target.title : (spoken2({ ...st, s: 0 }) || "Less than a minute") + " until " + target.title;
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

