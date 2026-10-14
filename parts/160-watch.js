// src/watch.ts
var under = (path, folder) => !!folder && (path === folder || path.startsWith(folder.replace(/\/+$/, "") + "/"));
var anyUnder = (paths, ...folders) => paths.some((p) => folders.some((f) => under(p, f)));

