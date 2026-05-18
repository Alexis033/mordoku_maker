export function cellKey(row, col) {
  return `${row},${col}`;
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

export function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function escapeAttr(value) {
  return escapeHtml(value);
}

export function formatSeconds(seconds) {
  const mins = Math.floor(seconds / 60).toString().padStart(2, "0");
  const secs = (seconds % 60).toString().padStart(2, "0");
  return `${mins}:${secs}`;
}

export function makeId(value) {
  return String(value)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 48) || `id-${Date.now()}`;
}

export function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key) || "null");
  } catch {
    return null;
  }
}

export function getObjectSize(obj) {
  if (obj && typeof obj === "object") {
    return { w: obj.w || 1, h: obj.h || 1 };
  }
  return { w: 1, h: 1 };
}

export function rotatedSize(w, h, rotation) {
  const rot = rotation || 0;
  return (rot % 180 !== 0) ? { w: h, h: w } : { w, h };
}

export function parseCellKey(key) {
  const [row, col] = key.split(",").map(Number);
  return { row, col };
}

export function splitLines(value) {
  return value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
}

export function splitLinesRaw(value) {
  return value.split(/\r?\n/).map((line) => line.trim());
}

export function filterObjectEntries(obj, predicate) {
  return Object.fromEntries(Object.entries(obj || {}).filter(([key, value]) => predicate(key, value)));
}
