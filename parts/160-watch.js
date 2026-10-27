// src/watch.ts
// "" or "/" is the whole vault, as VaultData.pages() reads it.
var under = (path, folder) => {
  const f = String(folder ?? "").replace(/^\/+|\/+$/g, "");
  return !f || path === f || path.startsWith(f + "/");
};
var anyUnder = (paths, ...folders) => paths.some((p) => folders.some((f) => under(p, f)));

