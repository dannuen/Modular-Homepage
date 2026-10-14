// Runs in the page: geometry of every module's outer card, its tool row and paddings.
const px = (el, v) => { const p = document.createElement("div"); p.style.cssText = "position:absolute;visibility:hidden;width:" + v; el.appendChild(p); const w = p.getBoundingClientRect().width; p.remove(); return w; };
const out = [];
for (const slot of document.querySelectorAll(".hp-grid > .hp-slot")) {
  const body = slot.querySelector(":scope > .hp-body");
  const mod = slot.dataset.module, variant = slot.dataset.variant || "";
  const cards = [...body.querySelectorAll(".hp-card")].filter((c) => !c.parentElement.closest(".hp-card") && c.getBoundingClientRect().width > 0);
  const row = { module: mod, variant, cards: [] };
  for (const card of cards) {
    const cs = getComputedStyle(card), r = card.getBoundingClientRect();
    const info = {
      cls: card.className, w: Math.round(r.width), h: Math.round(r.height),
      pad: [cs.paddingTop, cs.paddingRight, cs.paddingBottom, cs.paddingLeft].map(parseFloat),
      radius: cs.borderTopLeftRadius, border: cs.borderTopWidth + " " + cs.borderTopStyle, shadow: cs.boxShadow.slice(0, 60),
      bg: cs.backgroundColor + " " + cs.backgroundImage.slice(0, 40), font: cs.fontFamily.slice(0, 40), fontSize: cs.fontSize,
      tokPad: px(card, "var(--hm-pad)"), inset: px(card, "var(--hm-bar-inset)"), tool: px(card, "var(--hm-tool)"),
    };
    const bar = card.querySelector(":scope > .hp-bar");
    if (bar) {
      const tools = bar.querySelector(".hp-bar-tools"), tr = tools.getBoundingClientRect();
      const bl = parseFloat(cs.borderTopWidth) || 0;
      info.bar = tools.childElementCount ? {
        top: +(tr.top - r.top - bl).toFixed(1), right: +(r.right - tr.right - (parseFloat(cs.borderRightWidth) || 0)).toFixed(1),
        h: Math.round(tr.height), n: tools.childElementCount, float: bar.classList.contains("is-float"),
      } : { empty: true };
      const lab = bar.querySelector(".hp-bar-label");
      if (lab && lab.textContent) { const lr = lab.getBoundingClientRect(); info.bar.label = lab.textContent.slice(0, 40); info.bar.labelLeft = +(lr.left - r.left - (parseFloat(cs.borderLeftWidth) || 0)).toFixed(1); }
    }
    // Every button in the card: inside its box?
    const bad = [];
    for (const b of card.querySelectorAll("button, a, input, [role=button]")) {
      const br = b.getBoundingClientRect();
      if (!br.width || getComputedStyle(b).visibility === "hidden") continue;
      if (br.left < r.left - 1 || br.right > r.right + 1 || br.top < r.top - 1 || br.bottom > r.bottom + 1) bad.push((b.getAttribute("aria-label") || b.textContent || b.className).trim().slice(0, 30));
    }
    info.outside = bad;
    row.cards.push(info);
  }
  row.sec = !!body.querySelector(":scope > .hp-sec") && getComputedStyle(body.querySelector(":scope > .hp-sec")).display !== "none";
  out.push(row);
}
return JSON.stringify(out);
