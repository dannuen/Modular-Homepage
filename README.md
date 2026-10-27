# Modular Homepage

An Obsidian plugin that turns one note into a homepage made of modules: your next sermon, a countdown, the Sunday roster, tasks, projects, a calendar, stats and more. You choose which modules show, where, and how wide. A theme changes how they look. Everything is read from Obsidian's own metadata cache, so it needs no Dataview.

Requires Obsidian 1.8.0 or newer. Works on desktop and mobile.

## Show the homepage

Put a code block in any note (the default home note is `Homepage.md`):

````
```modular-homepage
```
````

For a stand-alone top bar in other notes:

````
```modular-homepage-bar
```
````

The page hides the note's title and Properties box. The top bar has your name (opens the home note), the main links, today's note, a new note, a new sermon, and two buttons: **Layout** and **Theme**.

## Themes

A theme only changes how modules are drawn. Each homepage note keeps its theme in its `home_theme` property, and the palette button in the top bar changes it. A note without one uses the default theme from the settings.

| Theme | Look |
| --- | --- |
| Aurora (default) | Glass panels over a soft accent tint |
| Prism | Opaque cards with a hairline and a soft shadow |
| Frosted | Soft pastel cards like frosted acrylic |
| Pulpit | Calm and editorial: serif titles, hairlines instead of boxes |
| Pixel | Pastel pixel art: ink frames, pink, mint and lavender |
| Crystal | Clear glass pills and slabs on soft grey |
| Dune | Warm frosted glass on sand, black pills, a glowing orange orb |
| Golden | Ivory and gold from the Tam Dân 10 Năm design system: double gold frames, Garamond type, square corners |

All themes follow light and dark mode and the note's width.

## Layouts

A layout is a named list of modules with their width (1 to 12 columns) and look. Layouts are yours: you create and name them, and any layout works with any theme. A homepage note shows the layout picked in its layout menu, or the default layout.

The **Layout** button in the top bar opens a menu to pick a layout, **Arrange** it (move, resize, add or hide modules, change a module's look), create a new one, duplicate, rename, make default or delete. The settings tab has the same actions. The last layout can't be deleted.

## Modules

Every module is one card, with its buttons in the card's top-right corner. Titles are hidden unless you turn on **Module titles** in the settings.

| Module | What it shows | Looks |
| --- | --- | --- |
| Greeting | The day and one sentence about the next preaching day | Sentence, Simple, Desk, Masthead, Glow |
| Banner | A photo across the page, from the `banner` property | Photo, Hero |
| Next sermon | Countdown, preparation slider and the sermons in preparation | Hero, Compact, Photo, This week, Event |
| Coming up | The next preaching dates as a timeline | |
| Sunday roster | Who does what this week, church by church, from the roster notes | Table, Tiles |
| Countdown | Live countdown to dates you tag `#countdown` | Flip clock, Rings, Hourglass, Candle, Nixie tubes, Dots, Words, Departures |
| Preaching dial | The next preaching day on a 12-hour clock | |
| Active sermons | Sermons in preparation, with outline and progress | Cards, Agenda, List, Board, Desk, Table, Panel, Carousel, Profile, Photo |
| Tasks | To-dos and events from the daily notes, with the active sermons' dates | List, Month, Week |
| Active projects | Projects with their next step and shortcuts | Strip, Cards, List, Rings, Browse, Panel |
| Next actions | Open tasks from active projects, due first | |
| Calendar | Preaching dates, to-dos and events by day; click a day for its note | Month, Week, Planner |
| Stats | Your preaching in numbers, with charts | Full, Band, Tiles |
| Project numbers | Projects in charts: active, meetings per month, notes | |
| Recently preached | The last sermons you preached, and where | |
| Recently edited | The notes you changed last | |
| Vault at a glance | Note counts for each part of the vault | |
| Pomodoro | A focus timer as pixel art (tomato, avocado or clock) | |

A module switched off in the settings is left out of every page and of **Arrange → Add module**. When a note changes, only the modules that use it are redrawn.

### What the modules read

- **Sermons** are notes with `type: sermon` in the sermons folder. `is_active: true` marks one as in preparation; its `date` and `time` properties feed Next sermon, Coming up, Tasks and Calendar. Church photos in the attachments folder are named after the church (`<Church name>.png`).
- **Projects** are folders whose `Home.md` has `document_type: project-dashboard`, with a `Tasks.md` and a `Meetings/` folder.
- **Daily notes** live in `Daily Notes/yyyy/MM-MMMM/yyyy-MM-dd.md`. The Tasks module reads and writes their `## Tasks` section:
  - a to-do: `- [ ] Write intro #sermon 📅 2026-10-18`
  - an event (no checkbox): `- Elders meeting [time:: 19:00] [duration:: 1h] 📅 2026-10-20`
- **Countdown** dates come only from note lines like `- Christmas #countdown [[2026-12-24]]`. There are no presets.
- **Sunday roster** reads the Church Roster plugin's quarterly exports from the roster folder (one note per quarter). The Table look shows the week the way the note does: a table per service, a column per role and a row per day, leaving out roles nobody fills that week; in a narrow slot each role gets its own line. Names set in **Your names on the roster** are marked as yours.
- **Banner** reads the `banner` property of the home note, for example `![[photo.jpg]]`. The ⚙ button on the banner sets the photo, page colour and fade (`banner_fade_color`, `banner_fade_strength`, `banner_fade_reach`).

### Pomodoro

Presets are Classic (25/5/15 ×4), Quick (15/3/10 ×4) and Deep work (50/10/30 ×2). The ⚙ button edits presets (focus, short and long break, cycles), the chime and auto-start. The timer ignores themes, survives restarts, and is saved in the plugin's `pomodoro.json`.

## Settings

Open **Settings → Modular Homepage**.

- **You:** your name, how the roster writes it, and words per minute (for "≈ min spoken" and the preaching dial).
- **Folders and notes:** sermons folder and archive, projects folder and index, daily notes folder and template, attachments, Bible folder, roster folder, the roster churches in order, and the home note.
- **New notes:** template, folder and name for New sermon, New note and New project.
- **Top bar:** the links, one per line as `note | label`.
- **Themes:** the default theme, and whether module titles show.
- **Layouts:** the default layout, and rename, duplicate, delete or add layouts.
- **Modules:** a switch for each module.

The defaults are set up for the author's vault, so change the name and folders to match yours. Settings and layouts are stored in the plugin's `data.json`; if it changes outside Obsidian (a sync), the plugin reads it again and redraws.

Optional plugins: Templater (the create buttons make notes from templates) and Periodic Notes (opens today's note; without it the plugin opens or creates it itself).

## Install

1. Create the folder `.obsidian/plugins/modular-homepage/` in your vault.
2. Copy `main.js` (the styles are built into it) and `manifest.json` into it.
3. In **Settings → Community plugins**, turn on **Modular Homepage**.
4. Put a `modular-homepage` code block in your home note and set the folders in the plugin's settings.

After replacing `main.js` later, turn the plugin off and on (or restart Obsidian).

## Build from source

The plugin is one JavaScript bundle. The source is split into `parts/NNN-*.js` (joined in name order; `030-virtual-styles.js` holds the `/*@@STYLES@@*/` marker) and `styles/` (joined in the order of `styles/ORDER.txt` and inlined as the stylesheet). Node 22 is enough; nothing needs installing.

```sh
node build.mjs                    # writes dist/main.js
node build.mjs --out main.js      # writes elsewhere
node build.mjs --check main.js    # also compares with an existing build
```

`tools/harness` runs the real bundle in headless Chromium against a made-up vault and writes screenshots and a DOM report for every theme, light and dark, at desktop and phone widths (see its README). `tools/checks` tests the button rows, and `writes.js` tests what the homepage writes to notes and `data.json`.

Read [GUIDELINES.md](GUIDELINES.md) before changing a module. It sets the card rules (one card per module, buttons in the top-right corner, spacing from theme tokens), the check to run, and how to install a fix safely.

## License

MIT, see [LICENSE](LICENSE).
