// src/registry.ts
var DEFAULT_CONFIG = {
  name: "Nguyễn Hải Đăng",
  // in greetings, the banner and the top bar
  sermonFolder: "Spaces/Sermons",
  sermonArchive: "Spaces/Sermons/Sermons MOC.base",
  projectsFolder: "Projects",
  projectsIndex: "Projects/Projects MOC",
  dailyFolder: "Daily Notes",
  dailyTemplate: "_data_/templates/dailynote_template.md",
  attachments: "_data_/attachments",
  // church photos: "<Church name>.png|jpg|…"
  bibleFolder: "Bible",
  rosterFolder: "Church Roster",
  // the Church Roster plugin's exports, one note per quarter (Sunday roster)
  rosterChurches: ["Tam Dân", "Trường Xuân"],
  // roster notes are grouped by these churches, in this order
  rosterMe: ["MSNC", "Nguyễn Hải Đăng"],
  // how the roster writes your name: those rows are marked as yours
  spokenWpm: 140,
  // words per minute, for "≈ min spoken" and the preaching dial
  templates: {
    // [template, folder, file name]
    sermon: ["_data_/templates/sermon_template.md", "Spaces/Sermons"],
    note: ["_data_/templates/note_template.md", "Notes"],
    project: ["_data_/templates/project/Project setup.md", "Projects", "untitled project"]
  },
  nav: [
    // the top bar's links: [note, label]
    ["Bible/Bible MOC", "Bible"],
    ["Spaces/Sermons/Sermons MOC.md", "Sermons"],
    ["Projects/Projects MOC", "Projects"],
    ["Spaces/Books/Books MOC", "Books"],
    ["Spaces/Osermons/Osermons MOC", "Other sermons"]
  ]
};
var MODULES = [
  ["greeting", greeting_default],
  ["banner", banner_default],
  ["next-sermon", next_sermon_default],
  ["coming-up", coming_up_default],
  ["roster", roster_default],
  ["countdown", countdown_default],
  ["preaching-dial", preaching_dial_default],
  ["active-sermons", active_sermons_default],
  ["tasks", tasks_default],
  ["active-projects", active_projects_default],
  ["next-actions", next_actions_default],
  ["calendar", calendar_default],
  ["stats", stats_default],
  ["project-stats", project_stats_default],
  ["recently-preached", recently_preached_default],
  ["recently-edited", recently_edited_default],
  ["vault-glance", vault_glance_default],
  ["pomodoro", pomodoro_default]
];
var THEMES = [
  {
    id: "aurora",
    name: "Aurora",
    about: "Glass panels over a soft accent tint",
    classes: ["header-nolink"]
  },
  {
    id: "prism",
    name: "Prism",
    about: "Opaque cards with a hairline and a soft shadow",
    classes: []
  },
  {
    id: "frosted",
    name: "Frosted",
    about: "Soft pastel cards like frosted acrylic",
    classes: []
  },
  {
    id: "pulpit",
    name: "Pulpit",
    about: "Calm and editorial: serif titles, hairlines instead of boxes",
    classes: ["header-nolink"]
  },
  {
    id: "pixel",
    name: "Pixel",
    about: "The Pomodoro's pastel pixel art: ink frames, pink, mint and lavender",
    classes: []
  },
  {
    id: "crystal",
    name: "Crystal",
    about: "Clear glass pills and slabs on soft grey, with a steel-blue accent",
    classes: []
  },
  {
    id: "dune",
    name: "Dune",
    about: "Warm frosted glass on sand, black pills and a glowing orange orb",
    classes: [],
    variants: { "next-sermon": "event" }
    // Next sermon as the event card while Dune shows
  },
  {
    id: "golden",
    name: "Golden",
    about: "Ivory and gold: double gold frames, Garamond type, square corners",
    classes: []
  }
];
var DEFAULT_THEME = "aurora";
var FIRST_LAYOUT = [
  { module: "preaching-dial", w: 12, variant: "" },
  { module: "countdown", w: 12, variant: "flip" },
  { module: "roster", w: 12, variant: "table" },
  { module: "active-sermons", w: 12, variant: "cards" },
  { module: "tasks", w: 12, variant: "" },
  { module: "stats", w: 12, variant: "full" }
];

