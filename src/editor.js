import { state, els, currentCase } from "./state.js";
import { renderBoard, renderEditorTools, renderAll, renderHeader, renderCaseSelect, renderPlayPanel, renderZoneLegend, renderSelectedLabel, renderSuspectCards, cellCanBeOccupied, parseRegionNames, setStatus, editorSuccess } from "./render.js";
import { saveCases } from "./persist.js";
import { normalizeCase, normalizeSuspects, normalizeRegions, normalizeRegionNames, normalizeRegionTextures, remapInvalidRegions, guessGender } from "./normalize.js";
import { cellKey, clamp, escapeAttr, escapeHtml, makeId, getObjectSize, rotatedSize, parseCellKey, splitLines, splitLinesRaw, filterObjectEntries } from "./utils.js";
import { AVATARS, COLORS, MAX_SIZE, MIN_SIZE, DEFAULT_OBJECT_RULES } from "./catalogs.js";
import { stopTimer } from "./game.js";
import { uniqueBoardPlacements } from "./rules.js";
import { readJson } from "./utils.js";
import { PROGRESS_KEY } from "./state.js";
import { generateCase } from "./generator.js";

function guardEditorMode() {
  if (state.mode !== "editor") return false;
  return true;
}

function finalizeCaseChange() {
  saveCases();
  loadCurrentCase(state.caseId);
  renderAll();
}

export function editCell(row, col) {
  const item = currentCase();
  const key = cellKey(row, col);
  if (state.editorMode === "region") {
    item.regions[row][col] = state.selectedRegion;
  } else if (state.editorMode === "object") {
    if (state.selectedObject) {
      function clearArea(r, c, sw, sh) {
        for (let dr = 0; dr < sh; dr++) {
          for (let dc = 0; dc < sw; dc++) {
            const k = cellKey(r + dr, c + dc);
            const existing = item.objects[k];
            if (!existing) continue;
            if (existing.ref) {
              const anchorKey = existing.ref;
              for (const [kk, vv] of Object.entries(item.objects)) {
                if (kk === anchorKey || (vv && vv.ref === anchorKey)) delete item.objects[kk];
              }
            } else {
              const { w: ew, h: eh } = getObjectSize(existing);
              const { w: esw, h: esh } = rotatedSize(ew, eh, existing.rotation);
              const { row: er, col: ec } = parseCellKey(k);
              for (let dr2 = 0; dr2 < esh; dr2++) {
                for (let dc2 = 0; dc2 < esw; dc2++) {
                  delete item.objects[cellKey(er + dr2, ec + dc2)];
                }
              }
            }
          }
        }
      }
      const sw = state.selectedObjectW || 1;
      const sh = state.selectedObjectH || 1;
      const { w: fw, h: fh } = rotatedSize(sw, sh, state.selectedObjectRotation);
      if (row + fh > item.rows || col + fw > item.cols) {
        setStatus(els.editorStatus, "El objeto no entra en el tablero.", "warning");
        return;
      }
      clearArea(row, col, fw, fh);
      for (let dr = 0; dr < fh; dr++) {
        for (let dc = 0; dc < fw; dc++) {
          const k = cellKey(row + dr, col + dc);
          if (dr === 0 && dc === 0) {
            item.objects[k] = { id: state.selectedObject, color: null, rotation: state.selectedObjectRotation, w: sw, h: sh };
          } else {
            item.objects[k] = { ref: key };
          }
        }
      }
    } else {
      const raw = item.objects[key];
      if (raw && raw.ref) {
        const anchorKey = raw.ref;
        for (const [k, v] of Object.entries(item.objects)) {
          if (k === anchorKey || (v && v.ref === anchorKey)) delete item.objects[k];
        }
      } else if (raw) {
        const { w, h } = getObjectSize(raw);
        const rot = typeof raw === "object" ? (raw.rotation || 0) : 0;
        const { w: sw, h: sh } = rotatedSize(w, h, rot);
        const { row: ar, col: ac } = parseCellKey(key);
        for (let dr = 0; dr < sh; dr++) {
          for (let dc = 0; dc < sw; dc++) {
            delete item.objects[cellKey(ar + dr, ac + dc)];
          }
        }
      } else {
        delete item.objects[key];
      }
    }
  } else if (state.editorMode === "victim") {
    item.victim.row = row;
    item.victim.col = col;
  } else if (state.editorMode === "solution") {
    if (!state.selectedSuspect) {
      setStatus(els.editorStatus, "Selecciona un sospechoso en la paleta antes de asignar solucion.", "warning");
      return;
    }
    if (!cellCanBeOccupied(item, row, col)) {
      setStatus(els.editorStatus, "No puedes poner la solucion en un objeto bloqueado.", "warning");
      return;
    }
    for (const [id, pos] of Object.entries(item.solution)) {
      if (pos.row === row && pos.col === col && id !== state.selectedSuspect) delete item.solution[id];
    }
    item.solution[state.selectedSuspect] = { row, col };
  }
  saveCases();
  renderBoard();
  if (state.editorMode === "victim" || state.editorMode === "solution") renderEditorTools();
  editorSuccess("Cambio aplicado.");
}

export function updateCaseTextFields() {
  if (!guardEditorMode()) return;
  const item = currentCase();
  item.title = els.editTitle.value.trim() || "Caso sin titulo";
  item.difficulty = els.editDifficulty.value.trim() || "Personalizado";
  saveCases();
  renderHeader();
  renderCaseSelect();
  editorSuccess("Texto actualizado.");
}

export function updateCaseSuspects() {
  if (!guardEditorMode()) return;
  const item = currentCase();
  const names = splitLines(els.editSuspects.value);
  if (!names.length) {
    setStatus(els.editorStatus, "Debe existir al menos un sospechoso.", "warning");
    return;
  }
  item.suspects = normalizeSuspects(names.map((name, index) => ({
    id: item.suspects[index]?.id || makeId(name),
    name,
    color: item.suspects[index]?.color || AVATARS[index % AVATARS.length],
    clue: item.suspects[index]?.clue || "",
    gender: item.suspects[index]?.gender
  })), Math.min(MAX_SIZE, Math.max(item.rows, item.cols)));
  els.editClues.value = item.suspects.map((s) => s.clue || "").join("\n");
  els.editGenders.value = item.suspects.map((s) => s.gender || "").join("\n");
  item.solution = filterObjectEntries(item.solution, (id) => (
    item.suspects.some((suspect) => suspect.id === id)
  ));
  if (!item.suspects.some((suspect) => suspect.id === state.selectedSuspect)) {
    state.selectedSuspect = null;
  }
  if (!item.suspects.some((suspect) => suspect.id === item.murderer)) {
    item.murderer = item.suspects[0]?.id || "";
  }
  saveCases();
  renderBoard();
  renderEditorTools();
  editorSuccess("Sospechosos actualizados.");
}

export function updateCaseClues() {
  if (!guardEditorMode()) return;
  const item = currentCase();
  const clueLines = splitLinesRaw(els.editClues.value);
  item.suspects.forEach((suspect, i) => {
    suspect.clue = clueLines[i] || "";
  });
  saveCases();
  editorSuccess("Pistas actualizadas.");
}

export function updateCaseGenders() {
  if (!guardEditorMode()) return;
  const item = currentCase();
  const genderLines = splitLinesRaw(els.editGenders.value).map((l) => l.toLowerCase());
  item.suspects.forEach((suspect, i) => {
    const raw = genderLines[i];
    if (raw === "m" || raw === "male") suspect.gender = "male";
    else if (raw === "f" || raw === "female") suspect.gender = "female";
    else suspect.gender = guessGender(suspect.name);
  });
  saveCases();
  renderBoard();
  renderSuspectCards();
  editorSuccess("Generos actualizados.");
}

export function updateCaseRegions() {
  if (!guardEditorMode()) return;
  const item = currentCase();
  item.regionNames = parseRegionNames(els.editRegions.value);
  item.regionTextures = normalizeRegionTextures(item.regionTextures, item.regionNames.length);
  remapInvalidRegions(item);
  state.selectedRegion = clamp(state.selectedRegion, 0, item.regionNames.length - 1);
  saveCases();
  renderBoard();
  renderEditorTools();
  editorSuccess("Zonas actualizadas.");
}

export function updateCaseDimensions() {
  if (!guardEditorMode()) return;
  const item = currentCase();
  const nextRows = clamp(Number(els.editRows.value) || item.rows, MIN_SIZE, MAX_SIZE);
  const nextCols = clamp(Number(els.editCols.value) || item.cols, MIN_SIZE, MAX_SIZE);
  els.editRows.value = nextRows;
  els.editCols.value = nextCols;
  if (nextRows !== item.rows || nextCols !== item.cols) {
    resizeCase(item, nextRows, nextCols);
    saveCases();
    renderBoard();
    renderPlayPanel();
    editorSuccess(`Tablero cambiado a ${nextRows}x${nextCols}.`);
  }
}

export function resizeCase(item, rows, cols = rows) {
  item.rows = rows;
  item.cols = cols;
  item.size = Math.max(rows, cols);
  item.regions = normalizeRegions(item.regions, rows, cols);
  item.victim.row = clamp(item.victim.row, 0, rows - 1);
  item.victim.col = clamp(item.victim.col, 0, cols - 1);
  item.objects = filterObjectEntries(item.objects, (key) => {
    const { row, col } = parseCellKey(key);
    return row < rows && col < cols;
  });
  const validAnchors = new Set(Object.keys(item.objects));
  for (const [key, raw] of Object.entries(item.objects)) {
    if (raw && raw.ref && !validAnchors.has(raw.ref)) delete item.objects[key];
  }
  item.solution = filterObjectEntries(item.solution, (_, pos) => (
    pos.row < rows && pos.col < cols
  ));
  state.board = filterObjectEntries(state.board, (key) => {
    const { row, col } = parseCellKey(key);
    return row < rows && col < cols;
  });
  if (state.victimGuess) {
    const { row, col } = parseCellKey(state.victimGuess);
    if (row >= rows || col >= cols) state.victimGuess = "";
  }
}

export function saveEditorCase() {
  const item = currentCase();
  const nextRows = clamp(Number(els.editRows.value) || item.rows, MIN_SIZE, MAX_SIZE);
  const nextCols = clamp(Number(els.editCols.value) || item.cols, MIN_SIZE, MAX_SIZE);
  item.title = els.editTitle.value.trim() || "Caso sin titulo";
  item.difficulty = els.editDifficulty.value.trim() || "Personalizado";
  if (nextRows !== item.rows || nextCols !== item.cols) resizeCase(item, nextRows, nextCols);
  const names = splitLines(els.editSuspects.value);
  const clueLines = splitLinesRaw(els.editClues.value);
  item.suspects = normalizeSuspects(names.map((name, index) => ({
    id: item.suspects[index]?.id || makeId(name),
    name,
    color: item.suspects[index]?.color || AVATARS[index % AVATARS.length],
    clue: clueLines[index] || "",
    gender: item.suspects[index]?.gender
  })), Math.min(MAX_SIZE, Math.max(nextRows, nextCols)));
  item.regionNames = parseRegionNames(els.editRegions.value);
  item.solution = filterObjectEntries(item.solution, (id, pos) => (
    item.suspects.some((suspect) => suspect.id === id) && pos.row < item.rows && pos.col < item.cols
  ));
  if (!item.suspects.some((suspect) => suspect.id === item.murderer)) item.murderer = item.suspects[0]?.id || "";
  saveCases();
  renderAll();
  editorSuccess("Caso guardado.");
}

export function generateNewCase() {
  const rows = clamp(Number(els.editRows.value) || 6, MIN_SIZE, MAX_SIZE);
  const cols = clamp(Number(els.editCols.value) || rows, MIN_SIZE, MAX_SIZE);
  const newCase = generateCase(rows, cols);
  state.cases.push(newCase);
  state.caseId = newCase.id;
  finalizeCaseChange();
}

export function createNewCase() {
  const rows = clamp(Number(els.editRows.value) || 6, MIN_SIZE, MAX_SIZE);
  const cols = clamp(Number(els.editCols.value) || rows, MIN_SIZE, MAX_SIZE);
  const suspectCount = Math.min(MAX_SIZE, Math.max(rows, cols));
  const newCase = normalizeCase({
    id: makeId(`caso-${Date.now()}`),
    title: "Caso nuevo",
    difficulty: "Personalizado",
    rows,
    cols,
    size: Math.max(rows, cols),
    victim: { name: "Victima", row: 0, col: 0 },
    suspects: Array.from({ length: suspectCount }, (_, index) => ({
      id: `s${index + 1}`,
      name: `Sospechoso ${index + 1}`,
      color: AVATARS[index % AVATARS.length],
      clue: index === 0 ? "Cada sospechoso ocupa una fila y una columna distintas." : ""
    })),
    regionNames: normalizeRegionNames(null, null),
    regionTextures: normalizeRegionTextures(null, 1),
    objectRules: DEFAULT_OBJECT_RULES,
    solution: {}
  });
  state.cases.push(newCase);
  state.caseId = newCase.id;
  finalizeCaseChange();
}

export function duplicateCase() {
  const copy = structuredClone(currentCase());
  copy.id = makeId(`${copy.title}-${Date.now()}`);
  copy.title = `${copy.title} copia`;
  state.cases.push(normalizeCase(copy));
  state.caseId = copy.id;
  finalizeCaseChange();
}

export function deleteCase() {
  if (state.cases.length <= 1) {
    setStatus(els.statusBox, "Debe quedar al menos un caso.", "warning");
    return;
  }
  const index = state.cases.findIndex((item) => item.id === state.caseId);
  state.cases.splice(index, 1);
  state.caseId = state.cases[0].id;
  finalizeCaseChange();
}

export function exportCurrentCase() {
  const blob = new Blob([JSON.stringify(currentCase(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${makeId(currentCase().title)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

export function importCase(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = normalizeCase(JSON.parse(String(reader.result)));
      imported.id = makeId(`${imported.title}-${Date.now()}`);
      state.cases.push(imported);
      state.caseId = imported.id;
      finalizeCaseChange();
      switchMode("editor");
    } catch {
      setStatus(els.editorStatus, "No se pudo importar el JSON.", "error");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

export function loadCurrentCase(id) {
  state.caseId = id;
  state.selectedSuspect = null;
  state.reveal = false;
  state.lastCheck = null;
  const progress = readJson(PROGRESS_KEY) || {};
  const current = progress[id] || {};
  state.board = uniqueBoardPlacements(current.board || {});
  state.victimGuess = current.victimGuess || "";
  state.elapsedBeforePause = current.elapsed || 0;
  state.startedAt = null;
  stopTimer();
}

export function switchMode(mode) {
  state.mode = mode;
  els.playTab.classList.toggle("active", mode === "play");
  els.editorTab.classList.toggle("active", mode === "editor");
  els.playPanel.classList.toggle("active", mode === "play");
  els.editorPanel.classList.toggle("active", mode === "editor");
  renderBoard();
}
