# Modular Homepage preview harness

Runs the **real** plugin bundle (`main.js`, CommonJS with `require("obsidian")`) in headless Chromium, outside
Obsidian. A mock of the Obsidian API stands in for Obsidian, and a made-up vault supplies the notes. The harness
renders `Homepage.md` in Reading view the way Obsidian does, then writes screenshots and a DOM report.

Note: `fixtures/` (copies of the author's `data.json`, `manifest.json` and a real Church Roster export) is not in this repository. Put a `data.json` in the plugin's format, a `manifest.json`, and a roster export named `Lịch HDCT Quý 4 - 2026.md` (with `## LỄ 1` and `## LỄ 2` tables; `fixture.js` builds the other roster notes from it) there before running. The folder is in `.gitignore`: never commit it.

Requirements: Node 22 and Playwright 1.56 with Chromium. Both are already installed here
(`PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers`), so do not run `playwright install`. Nothing else needs installing,
because the harness has no dependencies of its own.

```
render.js            one homepage → full-page PNG, per-slot PNGs, JSON report   (CLI + module)
matrix.js            themes × light/dark × widths × layouts in one browser → summary.json / summary.txt
fixture.js           the made-up vault, every date relative to "today"
png.js               a tiny PNG encoder that paints the vault's "photos" (cached in .cache/attachments)
fixtures/            data.json + manifest.json (copies of the real ones), a real Church Roster export
layouts/all-01..10   together: all 18 modules and every variant, at widths 4/6/8/12
layouts/dan-*.json   Dan's own Aurora, Sunday and Dune layouts (from data.json)
www/page.html        Obsidian's DOM down to .markdown-preview-sizer
www/obsidian-mock.js the "obsidian" module + app (vault, metadata cache, workspace, …)
www/obsidian-base.css Obsidian-like variables and base styles + the vault's Primary-dannuen button rules
www/boot.js          loads the bundle, runs onload, shows Homepage.md, waits for drawing to settle
www/inspect.js       the DOM checks behind the report
out-baseline/        the baseline matrix (see below)
```

## render.js

```
node render.js --main <main.js> --theme <id> --out <png> [options]
  --layout <file|json>   [{module,w,variant}…] or {items:[…]}; default: the layouts in fixtures/data.json
  --dark                 dark mode (default light)
  --width <px>           viewport = note width (default 1230); --height (default 900)
  --settings <file|json> deep-merged into data.json's settings, e.g. '{"config":{"name":"X"}}'
  --home <file|json>     extra Homepage.md properties, e.g. '{"upnext_effect":"noir"}'
  --slots-dir <dir>      one PNG per slot: <index>-<module>-<variant>.png, 24px margin (--margin)
  --report <json>        the DOM report
  --action <js>          async snippet run in the page after the first render (H = window.__harness);
                         --action-file <file> reads it from a file
  --pw-action <js>       async snippet run in Node with (page, H); here H(src) runs a snippet in the page
  --now <iso>            frozen time (default 2026-10-14T10:00:00+07:00); --timezone (default Asia/Ho_Chi_Minh)
  --scale <n>            device scale factor; --body-class is-mobile,is-phone; --quiet
```

The theme is written to `home_theme` in Homepage.md. The layout becomes the only layout in data.json
(`{version:2, list:[{id:"t", name:"Test", items}], defaultId:"t"}`). The process exits with code 0 when the page
booted (check `ok` in the report for errors) and 1 when the boot failed.

Examples:

```sh
M=../baseline/main.js
node render.js --main $M --theme dune --layout layouts/dan-dune.json --out /tmp/x.png --report /tmp/x.json
node render.js --main $M --theme pixel --dark --layout layouts/all-05.json --out p.png --slots-dir p-slots
node render.js --main $M --theme dune --width 420 --body-class is-mobile,is-phone --layout layouts/all-08.json --out phone.png
node render.js --main $M --theme aurora --layout '[{"module":"countdown","w":8,"variant":"flip"}]' --out cd.png \
  --action 'H.click(H.slot("countdown").querySelector("[aria-label=\"Change look\"]")); await H.sleep(50);
            H.click([...H.$$(".m-cd-chip")].find(b => b.textContent.includes("Nixie")))'
node render.js --main $M --theme prism --out hover.png --pw-action 'await page.hover(".hp-slot[data-module=calendar] .hp-card")'
```

The page-side helpers are `H.$`, `H.$$`, `H.slot(module)`, `H.click(el|selector)` (pointerdown, then click),
`H.sleep(ms)`, `H.settle()`, `H.redraw()`, `H.file(path)`, `H.text(path)`, `H.app`, `H.plugin`, and `H.log`
(notes opened, notices, writes, commands). After an action, the harness waits for the plugin's redraw timers and the
drawing to settle before it inspects the page and takes screenshots.

Rendering takes about 2–4 s per homepage. `require("./render")` exports
`{renderHomepage(browser, opts), launch(), summarize(report), THEMES, DEFAULTS}`.

### The report

- `ok`: true when the page booted, every slot drew something, and there were no page errors or console errors.
- `console` (errors and warnings, with where they came from), `page_errors`, `bad_requests`.
- `log.missing_obsidian_exports`: names the bundle asked `obsidian` for that the mock does not provide.
- `log.opened` / `notices` / `writes` / `commands`: what the page did (links, Notices, vault writes, saveData,
  commands).
- `sideways`: horizontal overflow of `document`, `reading_view` and `block`; `scrolls_sideways` is true when any of
  them overflows. The plugin gives the block `overflow-x: auto`, so content that overflows a slot shows up as `block`.
- `hidden_header`: whether the inline title and Properties are hidden, as `:has(.hp-home)` should make them.
- `topbar`: its rect and visible controls.
- `slots[]`, one per slot:
  - `module`, `variant`, `w`, `rect`, `drawn`.
  - `error`: `.hp-error` texts. `empty`: visible `.hp-empty` texts.
  - `sec`: whether the `.hp-sec` title row is present and visible, with its title.
  - `cards`: every `.hp-card` (rect, whether it is outermost, whether it is visible). `outer_cards` counts the
    visible outermost ones.
  - `controls`: every visible `button, a, input, select, textarea, summary, [role=button|link|switch|checkbox|tab|menuitem], [tabindex]`, with:
    - `text`, `aria`, `title`, and `rect` (page px).
    - `visible_rect`, when clipping (overflow, ellipsis) leaves less of it visible.
    - `inside_card`: whether its visible box is within one of the slot's outermost visible `.hp-card`, with a 1px
      tolerance. `card` gives that card's index.
    - `in_card_dom`: whether it has an `.hp-card` ancestor in the DOM.
    - `in_title_row`: whether it is inside `.hp-sec`.
  - `controls_outside_card`: the labels of controls where `inside_card` is false.
  - `scrolls_sideways`: whether the slot body is wider than its box.
  - `pokes_out`: the px by which painted content shows past the slot's edges, after clipping. Painted content means
    boxes with a background, border or shadow, replaced elements, and text glyphs.

Rects are CSS px from the top-left of the document, taken at scroll 0. The page scrolls the document (see Known
gaps), so these are full-page coordinates.

## matrix.js

```sh
node matrix.js --main ../baseline/main.js --out out-baseline --themes all --modes light,dark --widths 1230 \
  --also dune:light:420 --layouts 'layouts/all-*.json' --slots
```

Options:

- `--themes all|a,b`
- `--modes light,dark`
- `--widths 1230,…`
- `--also theme:mode:width,…`: extra runs.
- `--layouts files|globs`
- `--settings` and `--home`: passed through to every render.
- `--slots`: per-slot PNGs.
- `--concurrency 4`
- `--quiet`

Output goes to `<out>/<theme>-<mode>-<width>/<layout>.png|.json`, plus `<layout>/NN-module-variant.png` with
`--slots`. The run also writes:

- `summary.json`: totals, plus every render with its slots.
- `summary.txt`: totals, then errors, sideways scrolling, and slots that poke out. It also lists, for each
  `module:variant`, every visible control drawn outside the slot's outermost card and in which runs it appears.
  Controls in the `.hp-sec` title row are tagged `[title row]`. Controls inside a card's DOM but drawn outside it are
  tagged `[card DOM, drawn outside]`. A slot with no `.hp-card` at all is flagged as well. The file ends with the
  one-line-per-slot summary of every render.

The baseline run covers 7 themes × light/dark at 1230px plus Dune light at 420px, each with all-01…all-10. That is
150 renders, which took about 2 min without `--slots` and about 3 min with them on 4 CPUs.

## The vault (fixture.js)

"Today" is Wednesday 2026-10-14 10:00 Asia/Ho_Chi_Minh. The browser clock is frozen there with
`context.clock.setFixedTime`, and every date in the vault is relative to it (`buildVault({today})`). The notes
follow "Homepage Function Context.md".

- **Sermons** (`Spaces/Sermons`): 17 in all.
  - 4 active ones: two preached on Sunday 18 Oct (Trường Xuân 08:00 and Tam Dân 15:00, with one also on 25 Oct),
    one at Christmas, and one with no date.
  - 1 inactive sermon with an upcoming date.
  - 12 past sermons over the last 300 days.
  - Each has `bible`/`verse` links that resolve into `Bible/<book>/`, `church`, `time`, and `date_created` in the
    Linter's format. Sections have word counts, so the "shape", outline and preparation views have data.
- **Projects**: 3 active and 2 inactive.
  - Each has `Home.md` (`document_type: project-dashboard`), `Tasks.md` (overdue, due, nested and cancelled tasks),
    `Meetings/` and `Notes/`.
  - Meeting notes use an ISO `date_created` (`2026-09-05`); sermons use the Linter's `2026-09-05 09:00 AM`. Both parse.
- **Daily notes** (`Daily Notes/YYYY/MM-Month/YYYY-MM-DD.md`): `## Tasks` holds to-dos, sub-tasks, events with
  `[time::]`/`[duration::]`, tags, ⏫, 🛫/📅/✅, and cancelled tasks.
- **Countdowns**: `#countdown` lines, one of them already past.
- **Church Roster**:
  - The real Q4 2026 export (a verbatim copy).
  - A generated Q3 export.
  - A Trường Xuân Q4 note with a different table.
- **Attachments**: painted photos named after the churches, plus the banner (`Bình minh trên đồi.png`).
- **Other notes**: notes, books, other sermons, courses, cards and AI notes for "Vault at a glance" and "Recently
  edited". Templates for the create buttons.
- **Pomodoro**: the Pomodoro's `pomodoro.json` in the plugin folder, with 2 focus sessions done today.

## What is mocked (www/obsidian-mock.js)

- **DOM helpers:** `createEl/createDiv/createSpan/createSvg`, `empty`, `setText`, `addClass`/`toggleClass`, `setAttr`,
  `on/off` delegation, `instanceOf`, `isShown`, `win`/`doc`, `activeWindow`/`activeDocument`, and the globals
  `createFragment` and `sleep`.
- **Components and events:** `Events`, `Component` (children, `register*`, `registerInterval`), `MarkdownRenderChild`,
  `Plugin` (`loadData`/`saveData` against the in-memory data.json, `registerMarkdownCodeBlockProcessor`, commands,
  setting tabs, ribbon, status bar).
- **Files:**
  - `TFile`/`TFolder`.
  - `Vault`: read, cachedRead, create, modify, process, delete, rename, createFolder, `getResourcePath` → served
    images, `adapter.exists/read/write/list`, and `create`/`modify`/`delete`/`rename` events.
  - `FileManager`: `processFrontMatter`, `renameFile`, `trashFile`.
- **`MetadataCache`:**
  - Frontmatter (a YAML subset), tags, headings, links, embeds, sections, and `listItems` with `task` and `parent` as
    Obsidian sets them.
  - `getFirstLinkpathDest` (shortest-path matching), `resolvedLinks`, and the `changed`/`resolved` events.
- **`MarkdownRenderer.render`** for what homepages render:
  - Paragraphs, headings, lists and task lists, tables, and code.
  - Inline formatting, `[[links]]` (`a.internal-link` with `data-href`, unresolved links marked), image embeds
    (`span.internal-embed.image-embed > img`), tags, and external links.
- **Workspace:** `onLayoutReady`, `getLeaf().openFile`, and `openLinkText`. Opening a note is logged; nothing
  navigates.
- **UI classes:** `Notice` (shown and logged), `Modal`, `Menu`, `Setting` with every component, `PluginSettingTab`,
  `setIcon` (a placeholder svg), `normalizePath`, `debounce`, `parseYaml`/`stringifyYaml`, `getAllTags`, `Platform`
  (desktop), `Keymap`, `requestUrl` (always fails, so there is no network), and `apiVersion`.
- **App:** `app.commands.executeCommandById` (logged; returns false), `app.plugins` (with a Templater stub that
  creates a note from a template), and `app.loadLocalStorage`/`saveLocalStorage`.

Any name the bundle asks `obsidian` for that is missing shows up in `log.missing_obsidian_exports` and as a console
warning. The baseline asks for none.

## Known gaps vs real Obsidian

- **Scrolling:** the document scrolls, while Obsidian scrolls `.markdown-preview-view` inside a fixed workspace.
  Full-page screenshots and rects are therefore page-based, and `position: sticky/fixed` against the view behaves
  differently. There is no tab header, sidebar, ribbon or status bar, so the note fills the viewport, and
  `--width` is the width of the note pane rather than of the window.
- **Reading view structure:** each code block is placed as `div.el-pre > div.block-language-modular-homepage`.
  Obsidian's section virtualisation and lazy rendering are absent, and the properties and inline title are simple
  stand-ins (hidden by the plugin's `:has(.hp-home)` CSS anyway).
- **CSS:** `www/obsidian-base.css` approximates Obsidian 1.8's default theme. It is not app.css. It does include
  Primary-dannuen's `button:not(button.clickable-icon)` rules and the justify snippet, which the plugin has to
  survive.
  - Fonts are Inter, Noto Color Emoji and DejaVu, not Dan's fonts. Glyph widths, and so line breaks, differ a little.
- **Markdown and YAML:** the renderer covers a subset (no callouts, math, footnotes, Dataview, or embeds other than
  images). The frontmatter parser is a YAML subset: block lists, flow lists, quoted strings, numbers and booleans.
  Like Obsidian, it keeps dates as strings.
- **Metadata and events:** the cache is computed synchronously from the text. Vault writes from actions fire
  `modify` and `changed` the way Obsidian does, but without Obsidian's debounce.
- **Hover and touch:** there are no hover previews (the `pw-action` `page.hover` still triggers CSS `:hover`) and no
  touch events. Mobile is only `--body-class is-mobile,is-phone` at a narrow width. `Platform` always says desktop.
- **Time:** time is frozen, not flowing. Intervals and timeouts still run, but `Date.now()` stays at `--now`, so the
  Pomodoro and the flip clock don't tick.
- **Notices** are drawn into `.notice-container` and logged.
- **Plugins:** only Templater's `create_new_note_from_template` exists. Other plugins (Meta Bind, Dataview, Tasks,
  Church Roster) are absent, and `app.internalPlugins` is an empty stub.
- **Animations:** screenshots use `animations: "disabled"`, which finishes CSS animations and transitions. Canvas and
  JS animations are captured at the frame they are on.
