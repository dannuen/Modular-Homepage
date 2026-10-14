# Modular Homepage: guidelines for fixes

Read this before changing the plugin. These rules come from the unified card work (2026-10-14). Dan asked that future fixes follow them.

## How every module looks

1. **One card per module.** The module draws one `hp-card`. The items inside it are tiles (`hp-panel`) or rows. A module must not draw loose cards, and must not put a framed box inside a framed box. If a section inside the card needs separating, use a divider line instead.
2. **No visible titles.** Call `ui.section(body, title)` and nothing else for the title. It stays hidden unless the "Module titles" setting is on. Useful information that used to sit in a title row goes in the card's label: counts such as "4 active", the month name, or a timer status. Plain descriptions such as "Soonest first" are dropped.
3. **Buttons inside the card's top-right corner.** Every button, link, switch or pager goes in `ui.bar(card, { label }).tools`. Nothing sits outside the card or across its edge. Pop-ups (⚙ panels, pickers) open inside or over the card.
   - Round buttons use `hp-knob hp-round`. A switch in the row is exactly as tall as the round buttons (`--hm-tool`).
   - A card with its own header puts it in the row as `.hp-bar-main`. When there isn't room, the buttons stay on top and the label or header drops below them.
   - Use `float` only when the content leaves room for the buttons in the corner (Countdown). Check every look of that module.
4. **All spacing and styling comes from the theme.** Use the tokens:
   - `--hm-pad`: card padding. `--hm-pad-in`: tile padding. `--hm-gap-in`: gap between tiles.
   - `--hm-radius` and `--hm-radius-sm`: corners. `--hm-bar-inset`: distance of the buttons from the card's corner. `--hm-tool`: button size.
   - `--hm-font-display`, `--hm-title-weight` and `--hm-row-weight`: fonts and weights.

   Module CSS uses no fixed padding, corner or font-weight values. Anything specific to one theme goes in that theme's file.
5. **Layout.**
   - Use container queries (`@container slot`), not viewport queries.
   - Nothing may scroll sideways or poke out of a card. Watch negative margins, especially in Pulpit, whose cards have no side padding.
   - When tiles sit side by side, long text is cut to one line with the full text as a tooltip, so the tiles stay level.
   - Shadows fall only below.
   - Never use a MutationObserver to hold elements in place.

## Kept as designed (don't "unify" these)

- The Dune theme, the Event card in Next sermon, and the Glow greeting.
- Pomodoro's pixel art. Its outer box follows the theme.
- Countdown's Nixie and Departures fonts. Next sermon's Photo padding.
- Pulpit is hairline blocks with no side padding, so its buttons line up with the content's right edge.
- Countdown dates come only from note lines like `- Christmas #countdown [[2026-12-24]]`, with no presets.

## How to make a fix

1. **Ask first only when the change is big.** For a styling change across modules, write down how you read the request and confirm it with Dan. Small fixes go straight ahead.
2. **Start from this folder.** Copy it to a scratch folder and edit `parts/` and `styles/`. Run `node build.mjs` to get `dist/main.js`. The git history is in `history.bundle`.
3. **Run one check.** Use the preview harness in `tools/harness`, which runs the real bundle in headless Chromium against a made-up vault. Run it on every theme, light and dark, at 1230 and 420px:

   ```sh
   node tools/harness/matrix.js --main dist/main.js --out /tmp/m --themes all --modes light,dark --widths 1230,420 --layouts 'tools/harness/layouts/*.json'
   ```

   - `summary.txt` must show no errors, no sideways scrolling, nothing poking out, and no controls outside a card. Banner hero, Greeting desk and Next sermon photo are allowed to have controls outside a card, because they have no card by design.
   - If you touched the button row, also run `node tools/checks/geom.js dist/main.js /tmp/g.json`, then `node tools/checks/geom-summary.js /tmp/g.json`.
   - Look at the slot screenshots (`--slots`) of the modules you changed.

   Fix what this check finds, then install. Don't run more review rounds: Dan wants the result quickly.
4. **Install safely.**
   - Back up the installed `main.js` to `/mnt/project-files/<task>/backup/`.
   - Check that its md5 matches the last install recorded in project memory, so another thread's work isn't overwritten.
   - Write the new build with `device_commit_files`, passing `expectedMtimeMs`, then check the md5 on the device.
   - Device path: `D:\Obsidian\dannuenobsidianvault\.obsidian\plugins\modular-homepage\main.js`.
5. **Save the source back here.** Copy the changed `parts/` and `styles/` back to this folder, then refresh `history.bundle` (`git bundle create history.bundle --all`). Update the installed md5 in project memory.
6. **Reply to Dan with the result only.** Send no screenshots and no progress chatter. Tell Dan to turn the plugin off and on to load it, and list any small leftovers in one line each.

## Vault rules

- Edits to existing vault notes need Dan's yes first. New notes can be created freely.
- Never delete, rename or move notes without Dan's explicit yes on the exact list.
- Don't publish vault content anywhere.
