// Tiny PNG encoder and a few painted "photos" (gradient sky, sun, hills, a church) for the fixture's attachments.
"use strict";
const zlib = require("zlib");

const CRC = (() => {
	const t = new Uint32Array(256);
	for (let n = 0; n < 256; n++) {
		let c = n;
		for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
		t[n] = c >>> 0;
	}
	return t;
})();
function crc32(buf) {
	let c = 0xffffffff;
	for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8);
	return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
	const len = Buffer.alloc(4);
	len.writeUInt32BE(data.length);
	const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
	const crc = Buffer.alloc(4);
	crc.writeUInt32BE(crc32(td));
	return Buffer.concat([len, td, crc]);
}
// pixel(x, y) → [r, g, b] (0..255)
function encodePng(width, height, pixel) {
	const raw = Buffer.alloc((width * 3 + 1) * height);
	let o = 0;
	for (let y = 0; y < height; y++) {
		raw[o++] = 0;
		for (let x = 0; x < width; x++) {
			const [r, g, b] = pixel(x, y);
			raw[o++] = r; raw[o++] = g; raw[o++] = b;
		}
	}
	const ihdr = Buffer.alloc(13);
	ihdr.writeUInt32BE(width, 0);
	ihdr.writeUInt32BE(height, 4);
	ihdr[8] = 8; ihdr[9] = 2; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
	return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk("IHDR", ihdr), chunk("IDAT", zlib.deflateSync(raw, { level: 9 })), chunk("IEND", Buffer.alloc(0))]);
}

const mix = (a, b, t) => a.map((v, i) => Math.round(v + (b[i] - v) * Math.max(0, Math.min(1, t))));
const smooth = (e0, e1, x) => { const t = Math.max(0, Math.min(1, (x - e0) / (e1 - e0))); return t * t * (3 - 2 * t); };
// A deterministic little noise, so the "photo" has some grain.
const grain = (x, y) => { const s = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453; return s - Math.floor(s) - 0.5; };

// A landscape: sky gradient (top → horizon), a sun with glow, two rows of hills, optionally a small church on the ridge.
function landscape({ w, h, skyTop, skyLow, sun, sunAt = [0.7, 0.42], hillFar, hillNear, church = false, churchAt = 0.32 }) {
	const [sx, sy] = [sunAt[0] * w, sunAt[1] * h];
	const ridgeFar = (x) => h * (0.62 + 0.05 * Math.sin(x / w * 5.1 + 0.6) + 0.03 * Math.sin(x / w * 13.7));
	const ridgeNear = (x) => h * (0.76 + 0.06 * Math.sin(x / w * 3.3 + 2.1) + 0.02 * Math.sin(x / w * 17.3 + 1));
	const cx = churchAt * w, cw = w * 0.07, base = ridgeFar(cx) + 2;
	const inChurch = (x, y) => {
		if (!church) return false;
		const bodyTop = base - cw * 0.75;
		if (x > cx - cw / 2 && x < cx + cw / 2 && y > bodyTop && y < base + 4) return true; // nave
		const roofH = cw * 0.45;
		if (y <= bodyTop && y > bodyTop - roofH) { const half = (cw / 2 + 4) * (1 - (bodyTop - y) / roofH); if (Math.abs(x - cx) < half) return true; } // roof
		const tx = cx + cw * 0.28, tw = cw * 0.22, towerTop = bodyTop - cw * 0.9;
		if (x > tx - tw / 2 && x < tx + tw / 2 && y > towerTop && y < base) return true; // tower
		if (y <= towerTop && y > towerTop - cw * 0.35) { const half = (tw / 2 + 2) * (1 - (towerTop - y) / (cw * 0.35)); if (Math.abs(x - tx) < half) return true; } // spire
		if (Math.abs(x - tx) < 1.6 && y > towerTop - cw * 0.62 && y < towerTop - cw * 0.35) return true; // cross
		if (Math.abs(y - (towerTop - cw * 0.52)) < 1.6 && Math.abs(x - tx) < cw * 0.08) return true;
		return false;
	};
	return encodePng(w, h, (x, y) => {
		const n = grain(x, y) * 6;
		let c = mix(skyTop, skyLow, smooth(0, h * 0.62, y));
		const d = Math.hypot(x - sx, y - sy) / Math.min(w, h);
		c = mix(c, sun, Math.max(0, 0.75 - d * 2.2));
		if (d < 0.07) c = mix(c, [255, 250, 235], 1 - d / 0.07 * 0.4);
		if (y > ridgeFar(x)) c = mix(hillFar, mix(hillFar, skyLow, 0.35), 1 - smooth(ridgeFar(x), h, y));
		if (inChurch(x, y)) c = mix(hillFar, [20, 18, 24], 0.55);
		if (y > ridgeNear(x)) c = mix(hillNear, [12, 14, 12], smooth(ridgeNear(x), h * 1.1, y) * 0.6);
		return c.map((v) => Math.max(0, Math.min(255, Math.round(v + n))));
	});
}

const PICTURES = {
	"Tam Dân.png": () => landscape({ w: 960, h: 600, skyTop: [62, 96, 160], skyLow: [242, 178, 120], sun: [255, 214, 150], sunAt: [0.72, 0.5], hillFar: [96, 82, 110], hillNear: [44, 58, 50], church: true, churchAt: 0.34 }),
	"Trường Xuân.png": () => landscape({ w: 960, h: 600, skyTop: [120, 170, 214], skyLow: [218, 236, 240], sun: [255, 246, 214], sunAt: [0.25, 0.3], hillFar: [104, 150, 118], hillNear: [52, 98, 66], church: true, churchAt: 0.62 }),
	"Bình minh trên đồi.png": () => landscape({ w: 1600, h: 560, skyTop: [40, 56, 104], skyLow: [250, 196, 140], sun: [255, 220, 160], sunAt: [0.58, 0.6], hillFar: [88, 74, 104], hillNear: [36, 44, 52] })
};

module.exports = { encodePng, landscape, PICTURES };
