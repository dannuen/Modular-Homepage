// DOM checks for the report: per slot, its cards, title row, visible controls (and whether each sits inside a card),
// error and empty states, and what pokes out of the slot; plus sideways scrolling of the page, the reading view and
// the block. Rects are in page coordinates (CSS px from the top-left of the document).
(function () {
	"use strict";
	const H = (window.__harness = window.__harness || {});
	const round = (n) => Math.round(n * 10) / 10;
	const CONTROLS = "button, a, input, select, textarea, summary, [role=button], [role=link], [role=switch], [role=checkbox], [role=tab], [role=menuitem], [tabindex], label:has(> input)";
	const TOL = 1;

	function pageRect(r) {
		return { x: round(r.left + window.scrollX), y: round(r.top + window.scrollY), w: round(r.width), h: round(r.height) };
	}
	// The part of an element that can be seen: its box cut by every ancestor that clips (overflow other than visible).
	function visibleBox(el, rect) {
		const r = rect || el.getBoundingClientRect();
		let box = { l: r.left, t: r.top, r: r.right, b: r.bottom };
		const fixed = getComputedStyle(el).position === "fixed";
		// A given rect (painted text) is also clipped by the element itself (overflow hidden + ellipsis).
		for (let a = rect ? el : el.parentElement; a && a !== document.documentElement && !fixed; a = a.parentElement) {
			const s = getComputedStyle(a);
			const clipX = s.overflowX !== "visible", clipY = s.overflowY !== "visible";
			if (!clipX && !clipY) { if (s.position === "fixed") break; continue; }
			const ar = a.getBoundingClientRect();
			const l = ar.left + a.clientLeft, t = ar.top + a.clientTop;
			if (clipX) { box.l = Math.max(box.l, l); box.r = Math.min(box.r, l + a.clientWidth); }
			if (clipY) { box.t = Math.max(box.t, t); box.b = Math.min(box.b, t + a.clientHeight); }
			if (s.position === "fixed") break;
		}
		if (box.r - box.l < 0.5 || box.b - box.t < 0.5) return null;
		return box;
	}
	function isVisible(el) {
		if (el.checkVisibility && !el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true })) return false;
		return !!visibleBox(el);
	}
	const labelOf = (el) => {
		const text = (el.innerText || el.value || "").replace(/\s+/g, " ").trim();
		return { text: text.slice(0, 80), aria: el.getAttribute("aria-label") || "", title: el.getAttribute("title") || "" };
	};
	const contains = (outer, inner) => inner.x >= outer.x - TOL && inner.y >= outer.y - TOL && inner.x + inner.w <= outer.x + outer.w + TOL && inner.y + inner.h <= outer.y + outer.h + TOL;
	function describe(el) {
		const cls = typeof el.className === "string" ? el.className.trim().split(/\s+/).filter(Boolean).slice(0, 3).join(".") : "";
		return el.tagName.toLowerCase() + (cls ? "." + cls : "");
	}

	function controlsIn(root, cardsOf) {
		const out = [];
		for (const el of root.querySelectorAll(CONTROLS)) {
			if (el.matches("input") && el.closest("label") && !isVisible(el)) continue; // the label stands for a hidden switch input
			if (el.matches("a") && el.closest("[role=link], button") && el.closest("[role=link], button") !== el) continue;
			if (!isVisible(el)) continue;
			const rect = pageRect(el.getBoundingClientRect());
			// What can be seen of it (a long link cut off with an ellipsis is judged by its visible part).
			const vb = visibleBox(el);
			const seenRect = pageRect({ left: vb.l, top: vb.t, width: vb.r - vb.l, height: vb.b - vb.t });
			const clipped = Math.abs(seenRect.w - rect.w) > TOL || Math.abs(seenRect.h - rect.h) > TOL;
			const cards = cardsOf ? cardsOf() : [];
			const holder = cards.findIndex((c) => contains(c.rect, seenRect));
			out.push({
				el: describe(el),
				role: el.getAttribute("role") || el.tagName.toLowerCase(),
				...labelOf(el),
				tabindex: el.hasAttribute("tabindex") ? el.getAttribute("tabindex") : undefined,
				rect,
				visible_rect: clipped ? seenRect : undefined,
				inside_card: holder >= 0,
				card: holder >= 0 ? holder : undefined,
				in_card_dom: !!el.closest(".hp-card"),
				in_title_row: !!el.closest(".hp-sec")
			});
		}
		return out;
	}

	// What an element visibly paints: a replaced element or a box with a background, border or shadow → its box; an
	// element holding only text → the text's glyph boxes; anything else → nothing (its children are measured instead).
	const REPLACED = /^(IMG|SVG|CANVAS|VIDEO|INPUT|SELECT|TEXTAREA|IFRAME|svg)$/;
	const seen = (c) => c && c !== "transparent" && !/rgba\([^)]*,\s*0\)$/.test(c);
	function paintedRect(el) {
		if (el instanceof SVGElement && !(el instanceof SVGSVGElement)) return null;
		if (REPLACED.test(el.tagName)) return el.getBoundingClientRect();
		const s = getComputedStyle(el);
		if (s.display === "contents") return null;
		const box = seen(s.backgroundColor) || s.backgroundImage !== "none" || s.boxShadow !== "none" ||
			["Top", "Right", "Bottom", "Left"].some((k) => parseFloat(s["border" + k + "Width"]) > 0 && seen(s["border" + k + "Color"]));
		if (box) return el.getBoundingClientRect();
		const texts = [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim());
		if (!texts.length) return null;
		const range = document.createRange();
		let out = null;
		for (const t of texts) {
			range.selectNodeContents(t);
			for (const r of range.getClientRects()) {
				if (r.width < 1) continue;
				out = out ? { left: Math.min(out.left, r.left), top: Math.min(out.top, r.top), right: Math.max(out.right, r.right), bottom: Math.max(out.bottom, r.bottom) } : { left: r.left, top: r.top, right: r.right, bottom: r.bottom };
			}
		}
		return out && { ...out, width: out.right - out.left, height: out.bottom - out.top };
	}

	function slotReport(slot, index) {
		const rect = pageRect(slot.getBoundingClientRect());
		const all = [...slot.querySelectorAll(".hp-card")];
		const cards = all.map((c) => ({ el: describe(c), rect: pageRect(c.getBoundingClientRect()), outer: !c.parentElement.closest(".hp-card") || !slot.contains(c.parentElement.closest(".hp-card")), visible: isVisible(c) }));
		const outer = cards.filter((c) => c.outer && c.visible);
		const sec = slot.querySelector(".hp-sec");
		const errors = [...slot.querySelectorAll(".hp-error")].map((e) => e.textContent.trim());
		const empties = [...slot.querySelectorAll(".hp-empty")].filter(isVisible).map((e) => e.textContent.trim().slice(0, 160));
		// What pokes out of the slot (visible boxes past its edges).
		const sr = slot.getBoundingClientRect();
		const poke = { left: 0, right: 0, top: 0, bottom: 0 };
		const pokers = [];
		for (const el of slot.querySelectorAll("*")) {
			const painted = paintedRect(el);
			if (!painted || painted.width < 1 || painted.height < 1) continue;
			// Only the part left after clipping ancestors (overflow hidden, ellipsis) can poke out.
			const v = visibleBox(el, painted);
			if (!v) continue;
			const r = { left: v.l, top: v.t, right: v.r, bottom: v.b };
			const d = { left: sr.left - r.left, right: r.right - sr.right, top: sr.top - r.top, bottom: r.bottom - sr.bottom };
			if (Math.max(d.left, d.right, d.top, d.bottom) <= TOL) continue;
			if (!isVisible(el)) continue;
			for (const k of Object.keys(poke)) poke[k] = Math.max(poke[k], round(d[k]));
			if (pokers.length < 6) pokers.push({ el: describe(el), by: Object.fromEntries(Object.entries(d).filter(([, v]) => v > TOL).map(([k, v]) => [k, round(v)])) });
		}
		const body = slot.querySelector(":scope > .hp-body");
		const controls = controlsIn(slot, () => outer);
		return {
			index,
			module: slot.dataset.module,
			variant: slot.dataset.variant || "",
			w: Number(slot.dataset.w),
			rect,
			drawn: !!(body && body.childElementCount),
			error: errors.length ? errors : undefined,
			empty: empties.length ? empties : undefined,
			sec: sec ? { present: true, visible: isVisible(sec), rect: pageRect(sec.getBoundingClientRect()), title: (sec.querySelector(".hp-sec-title")?.textContent || "").trim() } : { present: false, visible: false },
			cards: cards.map(({ el, rect, outer, visible }) => ({ el, rect, outer, visible })),
			outer_cards: outer.length,
			controls,
			controls_outside_card: controls.filter((c) => !c.inside_card).map((c) => c.aria || c.text || c.title || c.el),
			scrolls_sideways: body ? body.scrollWidth > body.clientWidth + TOL : false,
			pokes_out: Object.values(poke).some((v) => v > TOL) ? { ...poke, by: pokers } : undefined
		};
	}

	H.inspect = function () {
		const doc = document.scrollingElement || document.documentElement;
		const view = document.querySelector(".markdown-preview-view");
		const block = document.querySelector(".block-language-modular-homepage");
		const home = document.querySelector(".hp-home");
		const slots = [...document.querySelectorAll(".hp-grid > .hp-slot")];
		const bar = document.querySelector(".hp-tb-box");
		const sideways = {
			document: doc.scrollWidth > doc.clientWidth + TOL ? { scrollWidth: doc.scrollWidth, clientWidth: doc.clientWidth } : false,
			reading_view: view && view.scrollWidth > view.clientWidth + TOL ? { scrollWidth: view.scrollWidth, clientWidth: view.clientWidth } : false,
			block: block && block.scrollWidth > block.clientWidth + TOL ? { scrollWidth: block.scrollWidth, clientWidth: block.clientWidth } : false
		};
		return {
			theme: home?.dataset.theme || null,
			mode: document.body.classList.contains("theme-dark") ? "dark" : "light",
			viewport: { w: window.innerWidth, h: window.innerHeight },
			page: { w: doc.scrollWidth, h: doc.scrollHeight },
			block: block ? pageRect(block.getBoundingClientRect()) : null,
			blockError: block?.querySelector(":scope > pre")?.textContent || null,
			sideways,
			scrolls_sideways: Object.values(sideways).some(Boolean),
			hidden_header: {
				inline_title: !!document.querySelector(".inline-title") && !isVisible(document.querySelector(".inline-title")),
				properties: !!document.querySelector(".metadata-container") && !isVisible(document.querySelector(".metadata-container"))
			},
			topbar: bar ? { rect: pageRect(bar.getBoundingClientRect()), controls: controlsIn(bar, null).map(({ el, text, aria, title, rect }) => ({ el, text, aria, title, rect })) } : null,
			slots: slots.map(slotReport)
		};
	};
})();
