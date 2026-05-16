import { AVATARS, COLORS, TEXTURES, MAX_SIZE, MIN_SIZE, DEFAULT_OBJECT_RULES } from "./catalogs.js";
import { clamp, makeId } from "./utils.js";

export function guessGender(name) {
  if (!name) return "male";
  const last = name.trim().slice(-1).toLowerCase();
  return "aáà" .includes(last) ? "female" : "male";
}

export function normalizeSuspects(suspects, size) {
  const base = suspects.length ? suspects : Array.from({ length: size }, (_, i) => ({ name: `Sospechoso ${i + 1}` }));
  return base.slice(0, MAX_SIZE).map((suspect, index) => ({
    id: suspect.id || makeId(suspect.name || `s${index + 1}`),
    name: suspect.name || `Sospechoso ${index + 1}`,
    color: suspect.color || AVATARS[index % AVATARS.length],
    clue: suspect.clue || "",
    gender: suspect.gender || guessGender(suspect.name)
  }));
}

export function normalizeRegions(regions, rows, cols = rows) {
  if (Array.isArray(regions) && regions.length) {
    return Array.from({ length: rows }, (_, row) => (
      Array.from({ length: cols }, (_, col) => Number(regions[row]?.[col]) || 0)
    ));
  }
  return Array.from({ length: rows }, (_, row) => (
    Array.from({ length: cols }, (_, col) => Math.floor(row / Math.max(1, Math.ceil(rows / 4))) * 4 + Math.floor(col / Math.max(1, Math.ceil(cols / 4))))
  ));
}

export function normalizeRegionNames(names, regions = null) {
  if (Array.isArray(names) && names.some((name) => String(name || "").trim())) {
    return names.map((name) => String(name || "").trim()).filter(Boolean).slice(0, COLORS.length);
  }
  const maxRegion = Array.isArray(regions)
    ? Math.max(0, ...regions.flat().map((value) => Number(value) || 0))
    : 0;
  return Array.from({ length: Math.min(COLORS.length, maxRegion + 1) }, (_, index) => `Zona ${index + 1}`);
}

export function normalizeRegionTextures(textures, count) {
  const valid = new Set(TEXTURES.map((texture) => texture.id));
  const list = Array.isArray(textures) ? textures : [];
  return Array.from({ length: count }, (_, index) => (
    valid.has(list[index]) ? list[index] : TEXTURES[index % TEXTURES.length].id
  ));
}

export function normalizeObjectRules(rules, objects, includeDefaults = false) {
  const next = includeDefaults ? structuredClone(DEFAULT_OBJECT_RULES) : {};
  if (rules && typeof rules === "object") {
    for (const [key, value] of Object.entries(rules)) {
      const id = makeId(value?.name || key);
      if (!id) continue;
      next[id] = {
        name: value?.name || key,
        occupiable: value?.occupiable !== false
      };
    }
  }
  for (const raw of Object.values(objects || {})) {
    const name = typeof raw === "string" ? raw : (raw.id || "");
    const id = makeId(name);
    if (id && !next[id]) next[id] = { name, occupiable: true };
  }
  return next;
}

export function remapInvalidRegions(item) {
  const maxIndex = Math.max(0, item.regionNames.length - 1);
  item.regions = item.regions.map((row) => row.map((region) => (
    Number(region) > maxIndex ? 0 : clamp(Number(region) || 0, 0, maxIndex)
  )));
}

export function normalizeCase(input) {
  const item = structuredClone(input);
  item.id = item.id || makeId(item.title || "caso");
  const legacySize = Number(item.size) || 6;
  item.rows = clamp(Number(item.rows) || legacySize, MIN_SIZE, MAX_SIZE);
  item.cols = clamp(Number(item.cols) || legacySize, MIN_SIZE, MAX_SIZE);
  item.size = Math.max(item.rows, item.cols);
  item.title = item.title || "Caso sin titulo";
  item.difficulty = item.difficulty || "Personalizado";
  item.victim = item.victim || { name: "Victima", row: 0, col: 0 };
  item.victim.row = clamp(Number(item.victim.row) || 0, 0, item.rows - 1);
  item.victim.col = clamp(Number(item.victim.col) || 0, 0, item.cols - 1);
  item.victim.clue = item.victim.clue || "";
  item.suspects = normalizeSuspects(item.suspects || [], Math.min(MAX_SIZE, Math.max(item.rows, item.cols)));
  const oldClues = Array.isArray(item.clues) ? item.clues : [];
  item.suspects.forEach((suspect, i) => {
    if (!suspect.clue && oldClues[i]) suspect.clue = oldClues[i];
  });
  item.clues = item.suspects.map((s) => s.clue || "");
  item.regions = normalizeRegions(item.regions, item.rows, item.cols);
  item.regionNames = normalizeRegionNames(item.regionNames, item.regions);
  item.regionTextures = normalizeRegionTextures(item.regionTextures, item.regionNames.length);
  remapInvalidRegions(item);
  item.objects = item.objects || {};
  item.objectRules = normalizeObjectRules(item.objectRules, item.objects, true);
  item.solution = item.solution || {};
  item.murderer = item.murderer || item.suspects[0]?.id || "";
  return item;
}
