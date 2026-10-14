// src/modules/pomodoro/sprites.ts
var SIZE = 19;
var INK = "#4a2c40";
var COLORS = {
  o: INK,
  e: INK,
  // outline; e = the top half of an eye (it blinks)
  r: "#ff6f7d",
  R: "#e2505f",
  h: "#ffc0c6",
  // tomato
  g: "#86d98f",
  G: "#3fa55c",
  // leaves
  k: "#6a9a45",
  K: "#4b7530",
  f: "#ecf8b8",
  F: "#cbe684",
  p: "#b9784a",
  P: "#8f5634",
  q: "#e2a777",
  // avocado
  y: "#ffd36e",
  Y: "#f0a94f",
  w: "#fffaf0",
  W: "#f3e6cc",
  b: "#ffa3c0",
  B: "#e7789c",
  // clock
  c: "#ff9fb4",
  t: "#e0475d",
  s: "#ffffff"
  // cheeks, mouth, sparkle
};
var blank = (w, h) => Array.from({ length: h }, () => Array(w).fill("."));
var put = (g, x, y, key) => {
  if (key !== "." && g[y] && x >= 0 && x < g[y].length) g[y][x] = key;
};
var stamp = (g, x, y, rows) => rows.forEach((row, j) => [...row].forEach((key, i) => put(g, x + i, y + j, key)));
var inside = (x, y, [cx, cy, rx, ry]) => ((x + 0.5 - cx) / rx) ** 2 + ((y + 0.5 - cy) / ry) ** 2 <= 1;
function body(g, shapes, paint) {
  const n2 = g.length;
  const on = (x, y) => x >= 0 && y >= 0 && x < n2 && y < n2 && shapes.some((s2) => inside(x, y, s2));
  const edge = (x, y) => on(x, y) && (!on(x - 1, y) || !on(x + 1, y) || !on(x, y - 1) || !on(x, y + 1));
  const ring = (x, y) => {
    for (let d = 1; d < n2; d++)
      for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) if (edge(x + dx, y + dy)) return d - 1;
    return n2;
  };
  for (let y = 0; y < n2; y++) for (let x = 0; x < n2; x++) {
    if (!on(x, y)) continue;
    put(g, x, y, edge(x, y) ? "o" : paint(ring(x, y), !on(x + 1, y + 2) || !on(x + 2, y + 1)));
  }
}
var FACE_AT = { tomato: [5, 10, 9], avocado: [6, 5, 7], clock: [5, 11, 9] };
function face(mood, w) {
  const r = Array.from({ length: 4 }, () => Array(w).fill("."));
  const L = 1, R = w - 2, M = (w - 1) / 2;
  const eyes = () => {
    r[0][L] = r[0][R] = "e";
    r[1][L] = r[1][R] = "o";
  };
  if (mood === "idle") {
    eyes();
    r[2][M - 1] = r[2][M + 1] = "o";
    r[3][M] = "o";
  }
  if (mood === "focus") {
    eyes();
    r[3][M - 1] = r[3][M] = r[3][M + 1] = "o";
  }
  if (mood === "happy") {
    r[0][L] = r[0][R] = "o";
    r[1][L - 1] = r[1][L + 1] = r[1][R - 1] = r[1][R + 1] = "o";
    r[2][M - 1] = r[2][M + 1] = "o";
    r[2][M] = "t";
    r[3][M] = "o";
  }
  if (mood === "sleep") {
    r[1][L - 1] = r[1][L] = r[1][R] = r[1][R + 1] = "o";
    r[3][M] = "o";
  }
  r[2][0] = r[2][w - 1] = "c";
  return r.map((row) => row.join(""));
}
function tomato() {
  const g = blank(SIZE, SIZE);
  body(g, [[9.5, 11.2, 8.1, 7.3]], (ring, shaded) => shaded ? "R" : "r");
  stamp(g, 0, 1, [
    ".........o.........",
    "........oGo........",
    "...ooo..oGo..ooo...",
    "..oggGooGGGooGggo..",
    "...ooggGGGGGggoo...",
    ".....ooogggooo....."
  ]);
  stamp(g, 4, 7, ["hh", "h.", "h."]);
  return g;
}
function avocado() {
  const g = blank(SIZE, SIZE);
  body(g, [[9.5, 6.4, 5.3, 5.6], [9.5, 11.4, 7.4, 6.6]], (ring, shaded) => ring === 0 ? shaded ? "K" : "k" : ring === 1 ? "F" : "f");
  body(g, [[9.5, 12.5, 2.9, 2.9]], (_ring, shaded) => shaded ? "P" : "p");
  stamp(g, 8, 11, ["q"]);
  return g;
}
function clock() {
  const g = blank(SIZE, SIZE);
  for (const cx of [4.2, 14.8]) body(g, [[cx, 3.9, 2.8, 2.6]], (_ring, shaded) => shaded ? "B" : "b");
  stamp(g, 0, 1, ["........ooo........", ".........o........."]);
  body(g, [[9.5, 10.7, 7.7, 7.4]], (ring, shaded) => ring === 0 ? shaded ? "Y" : "y" : "w");
  stamp(g, 0, 18, ["...oo.........oo..."]);
  return g;
}
var BODIES = { tomato: tomato(), avocado: avocado(), clock: clock() };
var PIVOT = [9, 7];
var HAND = 2.4;
function hand(g, turn) {
  const a = turn * 2 * Math.PI, len = HAND;
  let [x0, y0] = PIVOT;
  const x1 = Math.round(PIVOT[0] + Math.sin(a) * len), y1 = Math.round(PIVOT[1] - Math.cos(a) * len);
  const dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  for (; ; ) {
    put(g, x0, y0, "o");
    if (x0 === x1 && y0 === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x0 += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y0 += sy;
    }
  }
}
function character(who, mood, turn = 0) {
  const g = BODIES[who].map((row) => row.slice());
  if (who === "clock") hand(g, turn);
  const [fx, fy, fw] = FACE_AT[who];
  stamp(g, fx, fy, face(mood, fw));
  return g;
}
var MINI = {
  tomato: ["...G...", ".oGgGo.", "orhrrro", "orrrrro", "orrrrRo", ".oRRRo.", "..ooo.."],
  avocado: ["..ooo..", ".okfko.", "okfffko", "okfpfko", "okpppKo", ".oKKKo.", "..ooo.."],
  clock: ["bb...bb", "booooob", "oywowyo", "oywooyo", "oywwwYo", ".oyyYo.", ".o...o."]
};
var miniGrid = (who) => MINI[who].map((row) => [...row]);
var FONT = {
  "0": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
  "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", ".###."],
  "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
  "3": [".###.", "#...#", "....#", "..##.", "....#", "#...#", ".###."],
  "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
  "5": ["#####", "#....", "####.", "....#", "....#", "#...#", ".###."],
  "6": ["..##.", ".#...", "#....", "####.", "#...#", "#...#", ".###."],
  "7": ["#####", "....#", "...#.", "..#..", ".#...", ".#...", ".#..."],
  "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
  "9": [".###.", "#...#", "#...#", ".####", "....#", "...#.", ".##.."],
  ":": [".", ".", "#", ".", "#", ".", "."]
};
function digits(text) {
  const glyphs = [...text].map((ch) => FONT[ch] || FONT["0"]);
  const width = glyphs.reduce((w, glyph) => w + glyph[0].length, 0) + glyphs.length - 1;
  const g = blank(width, 7);
  let x = 0;
  for (const glyph of glyphs) {
    stamp(g, x, 0, glyph);
    x += glyph[0].length + 1;
  }
  return g;
}

