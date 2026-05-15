"use strict";

const STORAGE_KEY = "murdoku-studio-cases-v1";
const PROGRESS_KEY = "murdoku-studio-progress-v1";
const {
  AVATARS,
  COLORS,
  MAX_SIZE,
  MIN_SIZE,
  TEXTURES,
  OBJECTS,
  DEFAULT_OBJECT_RULES,
  DEFAULT_OBJECT_RULES,
  objectAssetForKey,
  sampleCase
} = window.MurdokuCatalogs;
const {
  cellKey,
  clamp,
  escapeAttr,
  escapeHtml,
  formatSeconds,
  makeId,
  readJson
} = window.MurdokuUtils;
const {
  cellBlockedByPlacedLine: ruleCellBlockedByPlacedLine,
  occupiedLineUnavailableCells: ruleOccupiedLineUnavailableCells,
  uniqueBoardPlacements
} = window.MurdokuRules;

const state = {
  cases: [],
  caseId: sampleCase.id,
  mode: "play",
  editorMode: "region",
  selectedSuspect: null,
  eraseMode: false,
  selectedRegion: 0,
  selectedObject: "",
  selectedObjectColor: AVATARS[0],
  selectedObjectRotation: 0,
  selectedObjectW: 1,
  selectedObjectH: 1,
  board: {},
  notes: {},
  victimGuess: "",
  startedAt: null,
  elapsedBeforePause: 0,
  timer: null,
  noteMode: false,
  reveal: false,
  lastCheck: null
};

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  bindEvents();
  loadCases();
  loadCurrentCase(state.caseId);
  renderAll();
});

function bindElements() {
  [
    "caseTitle", "caseSelect", "duplicateCaseBtn", "deleteCaseBtn",
    "playTab", "editorTab", "playPanel", "editorPanel", "difficultyLabel",
    "timerLabel", "sizeLabel", "noteToggle", "verifyBtn", "revealBtn",
    "resetBtn", "zoomRange", "zoneLegend", "objectLegend", "suspectPalette", "clueList", "statusBox",
    "editTitle", "editDifficulty", "editRows", "editCols", "editVictimName",
    "newCaseBtn", "saveCaseBtn", "exportCaseBtn", "importCaseInput",
    "editSuspects", "editClues", "editRegions", "editorTools", "editorStatus",
    "board", "selectedLabel", "clearCellBtn"
  ].forEach((id) => els[id] = document.getElementById(id));
  els.editorModeButtons = Array.from(document.querySelectorAll(".editor-mode"));
}

function bindEvents() {
  els.caseSelect.addEventListener("change", () => {
    persistProgress();
    loadCurrentCase(els.caseSelect.value);
    renderAll();
  });
  els.playTab.addEventListener("click", () => switchMode("play"));
  els.editorTab.addEventListener("click", () => switchMode("editor"));
  els.noteToggle.addEventListener("click", () => {
    state.noteMode = !state.noteMode;
    renderPlayPanel();
  });
  els.verifyBtn.addEventListener("click", verifyBoard);
  els.revealBtn.addEventListener("click", () => {
    state.reveal = !state.reveal;
    state.lastCheck = null;
    renderBoard();
    renderPlayPanel();
  });
  els.resetBtn.addEventListener("click", resetProgress);
  els.zoomRange.addEventListener("input", () => renderBoardSize());
  els.clearCellBtn.addEventListener("click", () => {
    clearBoardPieces();
  });
  els.duplicateCaseBtn.addEventListener("click", duplicateCase);
  els.deleteCaseBtn.addEventListener("click", deleteCase);
  els.newCaseBtn.addEventListener("click", createNewCase);
  els.saveCaseBtn.addEventListener("click", saveEditorCase);
  els.exportCaseBtn.addEventListener("click", exportCurrentCase);
  els.importCaseInput.addEventListener("change", importCase);
  els.editTitle.addEventListener("input", updateCaseTextFields);
  els.editDifficulty.addEventListener("input", updateCaseTextFields);
  els.editVictimName.addEventListener("input", updateCaseTextFields);
  els.editSuspects.addEventListener("input", updateCaseSuspects);
  els.editClues.addEventListener("input", updateCaseClues);
  els.editRegions.addEventListener("input", updateCaseRegions);
  els.editRows.addEventListener("change", updateCaseDimensions);
  els.editCols.addEventListener("change", updateCaseDimensions);
  els.editorModeButtons.forEach((button) => {
    button.addEventListener("click", () => {
      state.editorMode = button.dataset.mode;
      renderEditorTools();
      renderEditorModeButtons();
      renderBoard();
    });
  });
}

function loadCases() {
  const saved = readJson(STORAGE_KEY);
  state.cases = Array.isArray(saved) && saved.length ? saved.map(normalizeCase) : [normalizeCase(sampleCase)];
  const exists = state.cases.some((item) => item.id === state.caseId);
  if (!exists) state.caseId = state.cases[0].id;
}

function saveCases() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cases));
}

function loadCurrentCase(id) {
  state.caseId = id;
  state.selectedSuspect = null;
  state.reveal = false;
  state.lastCheck = null;
  const progress = readJson(PROGRESS_KEY) || {};
  const current = progress[id] || {};
  state.board = uniqueBoardPlacements(current.board || {});
  state.notes = current.notes || {};
  state.victimGuess = current.victimGuess || "";
  state.elapsedBeforePause = current.elapsed || 0;
  state.startedAt = null;
  stopTimer();
}

function currentCase() {
  return state.cases.find((item) => item.id === state.caseId) || state.cases[0];
}

function normalizeCase(input) {
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
  item.suspects = normalizeSuspects(item.suspects || [], Math.min(MAX_SIZE, Math.max(item.rows, item.cols)));
  item.regions = normalizeRegions(item.regions, item.rows, item.cols);
  item.regionNames = normalizeRegionNames(item.regionNames, item.regions);
  item.regionTextures = normalizeRegionTextures(item.regionTextures, item.regionNames.length);
  remapInvalidRegions(item);
  item.objects = item.objects || {};
  item.objectRules = normalizeObjectRules(item.objectRules, item.objects, true);
  item.clues = Array.isArray(item.clues) ? item.clues : [];
  item.solution = item.solution || {};
  item.murderer = item.murderer || item.suspects[0]?.id || "";
  return item;
}

function normalizeSuspects(suspects, size) {
  const base = suspects.length ? suspects : Array.from({ length: size }, (_, i) => ({ name: `Sospechoso ${i + 1}` }));
  return base.slice(0, MAX_SIZE).map((suspect, index) => ({
    id: suspect.id || makeId(suspect.name || `s${index + 1}`),
    name: suspect.name || `Sospechoso ${index + 1}`,
    color: suspect.color || AVATARS[index % AVATARS.length]
  }));
}

function normalizeRegions(regions, rows, cols = rows) {
  if (Array.isArray(regions) && regions.length) {
    return Array.from({ length: rows }, (_, row) => (
      Array.from({ length: cols }, (_, col) => Number(regions[row]?.[col]) || 0)
    ));
  }
  return Array.from({ length: rows }, (_, row) => (
    Array.from({ length: cols }, (_, col) => Math.floor(row / Math.max(1, Math.ceil(rows / 4))) * 4 + Math.floor(col / Math.max(1, Math.ceil(cols / 4))))
  ));
}

function normalizeRegionNames(names, regions = null) {
  if (Array.isArray(names) && names.some((name) => String(name || "").trim())) {
    return names.map((name) => String(name || "").trim()).filter(Boolean).slice(0, COLORS.length);
  }
  const maxRegion = Array.isArray(regions)
    ? Math.max(0, ...regions.flat().map((value) => Number(value) || 0))
    : 0;
  return Array.from({ length: Math.min(COLORS.length, maxRegion + 1) }, (_, index) => `Zona ${index + 1}`);
}

function normalizeRegionTextures(textures, count) {
  const valid = new Set(TEXTURES.map((texture) => texture.id));
  const list = Array.isArray(textures) ? textures : [];
  return Array.from({ length: count }, (_, index) => (
    valid.has(list[index]) ? list[index] : TEXTURES[index % TEXTURES.length].id
  ));
}

function normalizeObjectRules(rules, objects, includeDefaults = false) {
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

function renderAll() {
  renderCaseSelect();
  renderHeader();
  renderPlayPanel();
  renderEditorPanel();
  renderBoard();
}

function renderCaseSelect() {
  els.caseSelect.innerHTML = state.cases.map((item) => (
    `<option value="${escapeAttr(item.id)}"${item.id === state.caseId ? " selected" : ""}>${escapeHtml(item.title)}</option>`
  )).join("");
}

function renderHeader() {
  const item = currentCase();
  els.caseTitle.textContent = item.title;
}

function renderPlayPanel() {
  const item = currentCase();
  els.difficultyLabel.textContent = item.difficulty;
  els.sizeLabel.textContent = `${item.rows}x${item.cols}`;
  els.noteToggle.classList.toggle("active", state.noteMode);
  els.revealBtn.textContent = state.reveal ? "Ocultar" : "Solucion";
  renderPalette();
  renderZoneLegend();
  renderObjectLegend();
  renderClues();
  renderSelectedLabel();
  updateTimerLabel();
  if (!state.lastCheck) {
    setStatus(els.statusBox, "Ubica la victima y coloca cada sospechoso una sola vez por fila y columna.", "");
  }
}

function renderPalette() {
  const item = currentCase();
  els.suspectPalette.innerHTML = `
    <button class="suspect-chip victim-chip ${state.selectedSuspect === "__victim__" ? "active" : ""}" data-victim-piece="true" type="button">
      <span class="victim-dot">${escapeHtml((item.victim.name || "V").slice(0, 1))}</span>
      <span class="chip-name">${escapeHtml(item.victim.name || "Victima")}</span>
    </button>
  ` + item.suspects.map((suspect) => `
    <button class="suspect-chip ${state.selectedSuspect === suspect.id ? "active" : ""}" data-suspect="${escapeAttr(suspect.id)}" type="button">
      <span class="swatch" style="background:${escapeAttr(suspect.color)}"></span>
      <span class="chip-name">${escapeHtml(suspect.name)}</span>
    </button>
  `).join("");
  els.suspectPalette.querySelector("[data-victim-piece]")?.addEventListener("click", () => {
    state.selectedSuspect = "__victim__";
    state.eraseMode = false;
    renderBoard();
    renderPalette();
    renderSelectedLabel();
  });
  els.suspectPalette.querySelectorAll("[data-suspect]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSuspect = button.dataset.suspect;
      state.eraseMode = false;
      renderBoard();
      renderPalette();
      renderSelectedLabel();
    });
  });
}

function renderZoneLegend() {
  const item = currentCase();
  const used = new Set(item.regions.flat().map((region) => Number(region) || 0));
  els.zoneLegend.innerHTML = Array.from(used).sort((a, b) => a - b).map((region) => `
      <span class="zone-key">
        <span class="zone-swatch texture-swatch texture-${escapeAttr(regionTexture(item, region))}" style="--region-color:${escapeAttr(COLORS[region % COLORS.length])}"></span>
        <span>${escapeHtml(regionName(item, region))}</span>
        <span class="zone-texture">${escapeHtml(textureName(regionTexture(item, region)))}</span>
      </span>
  `).join("");
}

function renderObjectLegend() {
  const item = currentCase();
  const seen = new Set();
  const used = Object.values(item.objects || {}).filter((v) => {
    if (!v || v.ref) return false;
    const id = typeof v === "string" ? v : v.id;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
  els.objectLegend.innerHTML = used.length ? used.map((obj) => {
    const id = typeof obj === "string" ? obj : obj.id;
    const blocked = !objectCanBeOccupied(item, id);
    return `
      <span class="object-key">
        <span class="legend-object-icon ${blocked ? "blocked-object" : ""}">${objectIcon(id, null)}</span>
        <span>${escapeHtml(objectLabel(item, id))}</span>
        <span class="object-rule">${blocked ? "bloqueado" : "ocupable"}</span>
      </span>
    `;
  }).join("") : `<span class="empty-legend">Sin objetos en este caso.</span>`;
}


function renderClues() {
  const item = currentCase();
  els.clueList.innerHTML = item.clues.length
    ? item.clues.map((clue) => `<li>${escapeHtml(clue)}</li>`).join("")
    : "<li>Sin pistas escritas todavia.</li>";
}

function renderSelectedLabel() {
  const item = currentCase();
  const suspect = item.suspects.find((entry) => entry.id === state.selectedSuspect);
  els.clearCellBtn.classList.toggle("active", state.eraseMode);
  if (state.eraseMode) els.selectedLabel.textContent = "Modo borrar: toca una celda";
  else if (state.selectedSuspect === "__victim__") els.selectedLabel.textContent = `Seleccionado: ${item.victim.name || "Victima"}`;
  else els.selectedLabel.textContent = suspect ? `Seleccionado: ${suspect.name}` : "Selecciona un sospechoso";
}

function clearBoardPieces() {
  state.board = {};
  state.victimGuess = "";
  state.lastCheck = null;
  state.eraseMode = false;
  persistProgress();
  renderBoard();
  renderPlayPanel();
  setStatus(els.statusBox, "Tablero vaciado. Se quitaron sospechosos y victima.", "success");
}

function renderEditorPanel() {
  const item = currentCase();
  els.editTitle.value = item.title;
  els.editDifficulty.value = item.difficulty;
  els.editRows.value = item.rows;
  els.editCols.value = item.cols;
  els.editVictimName.value = item.victim.name;
  els.editSuspects.value = item.suspects.map((suspect) => suspect.name).join("\n");
  els.editClues.value = item.clues.join("\n");
  els.editRegions.value = item.regionNames.join("\n");
  renderEditorModeButtons();
  renderEditorTools();
  setStatus(els.editorStatus, "Elige una herramienta y haz clic en el tablero para editar el caso.", "");
}

function renderEditorModeButtons() {
  els.editorModeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.editorMode);
  });
}

function renderEditorTools() {
  const item = currentCase();
  if (state.editorMode === "region") {
    els.editorTools.innerHTML = `
      <div class="region-palette">
        ${item.regionNames.map((name, index) => `
          <button class="region-button ${state.selectedRegion === index ? "active" : ""}" data-region="${index}" type="button">
            <span class="swatch" style="background:${COLORS[index % COLORS.length]}"></span> ${escapeHtml(name)}
          </button>
        `).join("")}
      </div>
      <div class="zone-legend editor-zone-legend">
        ${item.regionNames.map((name, index) => `
          <span class="zone-key">
            <span class="zone-swatch texture-swatch texture-${escapeAttr(regionTexture(item, index))}" style="--region-color:${escapeAttr(COLORS[index % COLORS.length])}"></span>
            <span>${escapeHtml(name)}</span>
            <span class="zone-texture">${escapeHtml(textureName(regionTexture(item, index)))}</span>
          </span>
        `).join("")}
      </div>
      <label class="field">
        <span>Textura para ${escapeHtml(regionName(item, state.selectedRegion))}</span>
        <select id="regionTextureSelect">
          ${TEXTURES.map((texture) => `
            <option value="${escapeAttr(texture.id)}"${texture.id === regionTexture(item, state.selectedRegion) ? " selected" : ""}>
              ${escapeHtml(texture.name)}
            </option>
          `).join("")}
        </select>
      </label>
      <p class="label">Para eliminar una zona, borra su linea en el campo Zonas. Sus celdas vuelven a la primera zona.</p>
    `;
    els.editorTools.querySelectorAll("[data-region]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedRegion = Number(button.dataset.region);
        renderEditorTools();
      });
    });
    const textureSelect = document.getElementById("regionTextureSelect");
    textureSelect?.addEventListener("change", () => {
      item.regionTextures[state.selectedRegion] = textureSelect.value;
      saveCases();
      renderBoard();
      renderZoneLegend();
      setStatus(els.editorStatus, "Textura de zona actualizada.", "success");
    });
  } else if (state.editorMode === "object") {
    els.editorTools.innerHTML = `
      <div class="object-palette">
        <button class="object-button ${!state.selectedObject ? "active" : ""}" data-object="" type="button">
          <span class="object-button-icon empty-object-icon"></span>
          <span>sin objeto</span>
        </button>
        ${OBJECTS.map((obj) => {
          const id = obj.id;
          const active = state.selectedObject === id;
          return `
          <button class="object-button ${active ? "active" : ""}" data-object="${escapeAttr(id)}" type="button">
            <span class="object-button-icon"><img src="assets/objects/${escapeAttr(id)}.svg" alt="" draggable="false" class="object-preview-img"></span>
            <span>${escapeHtml(obj.name)}</span>
          </button>
        `}).join("")}
      </div>
      ${state.selectedObject ? `
      <div class="object-controls">
        <label class="field">
          <span>Color</span>
          <div class="color-picker">
            <button class="color-swatch color-swatch-none ${!state.selectedObjectColor ? "active" : ""}" data-color="" type="button" title="Sin color"></button>
            ${AVATARS.map((c) => `
              <button class="color-swatch ${state.selectedObjectColor === c ? "active" : ""}" data-color="${escapeAttr(c)}" type="button" style="background:${escapeAttr(c)}"></button>
            `).join("")}
          </div>
        </label>
        <label class="field">
          <span>Rotacion</span>
          <div class="rotation-controls">
            <button id="rotateLeftBtn" type="button" title="-90°">-90</button>
            <span class="rotation-angle" id="rotationAngle">${state.selectedObjectRotation}°</span>
            <button id="rotateRightBtn" type="button" title="+90°">+90</button>
            <button id="flipBtn" type="button" title="180°">180</button>
          </div>
        </label>
        <label class="field">
          <span>Tamaño (ancho x alto)</span>
          <div class="size-controls">
            <select id="sizeWSelect">
              <option value="1"${state.selectedObjectW === 1 ? " selected" : ""}>1</option>
              <option value="2"${state.selectedObjectW === 2 ? " selected" : ""}>2</option>
            </select>
            <span>x</span>
            <select id="sizeHSelect">
              <option value="1"${state.selectedObjectH === 1 ? " selected" : ""}>1</option>
              <option value="2"${state.selectedObjectH === 2 ? " selected" : ""}>2</option>
            </select>
          </div>
        </label>
        <label class="field-check">
          <input type="checkbox" id="objectBlockedToggle" ${objectCanBeOccupied(item, state.selectedObject) ? "" : "checked"}>
          <span>Bloqueado (no se puede ocupar)</span>
        </label>
      </div>
      ` : ""}
    `;
    els.editorTools.querySelectorAll("[data-object]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedObject = button.dataset.object;
        renderEditorTools();
      });
    });
    const colorSwatches = els.editorTools.querySelectorAll("[data-color]");
    if (colorSwatches.length) {
      colorSwatches.forEach((swatch) => {
        swatch.addEventListener("click", () => {
          state.selectedObjectColor = swatch.dataset.color;
          renderEditorTools();
        });
      });
      const rotateLeft = document.getElementById("rotateLeftBtn");
      const rotateRight = document.getElementById("rotateRightBtn");
      const flipBtn = document.getElementById("flipBtn");
      if (rotateLeft) rotateLeft.addEventListener("click", () => { state.selectedObjectRotation = (state.selectedObjectRotation - 90 + 360) % 360; renderEditorTools(); });
      if (rotateRight) rotateRight.addEventListener("click", () => { state.selectedObjectRotation = (state.selectedObjectRotation + 90) % 360; renderEditorTools(); });
      if (flipBtn) flipBtn.addEventListener("click", () => { state.selectedObjectRotation = (state.selectedObjectRotation + 180) % 360; renderEditorTools(); });
      const blockedToggle = document.getElementById("objectBlockedToggle");
      if (blockedToggle) blockedToggle.addEventListener("change", () => {
        const item = currentCase();
        item.objectRules[state.selectedObject] = item.objectRules[state.selectedObject] || { name: state.selectedObject };
        item.objectRules[state.selectedObject].occupiable = !blockedToggle.checked;
        saveCases();
        renderBoard();
        setStatus(els.editorStatus, "Estado de objeto actualizado.", "success");
      });
      const sizeW = document.getElementById("sizeWSelect");
      const sizeH = document.getElementById("sizeHSelect");
      if (sizeW) sizeW.addEventListener("change", () => { state.selectedObjectW = Number(sizeW.value); });
      if (sizeH) sizeH.addEventListener("change", () => { state.selectedObjectH = Number(sizeH.value); });
    }
  } else if (state.editorMode === "victim") {
    els.editorTools.innerHTML = `
      <div class="solution-help">
        <strong>Victima</strong>
        <p>Define quien es la victima y toca el tablero para ubicar donde fue encontrada. Esta posicion solo se ve en el editor.</p>
      </div>
      <label class="field">
        <span>Nombre de la victima</span>
        <input id="victimToolName" type="text" value="${escapeAttr(item.victim.name)}">
      </label>
      <div class="solution-row">
        <span class="cell-victim mini-victim">${escapeHtml((item.victim.name || "V").slice(0, 1))}</span>
        <span>${escapeHtml(item.victim.name || "Victima")}</span>
        <strong>fila ${item.victim.row + 1}, columna ${item.victim.col + 1}</strong>
      </div>
    `;
    const victimToolName = document.getElementById("victimToolName");
    victimToolName?.addEventListener("input", () => {
      item.victim.name = victimToolName.value.trim() || "Victima";
      els.editVictimName.value = item.victim.name;
      saveCases();
      renderBoard();
      setStatus(els.editorStatus, "Victima actualizada.", "success");
    });
  } else {
    els.editorTools.innerHTML = `
      <div class="solution-help">
        <strong>Como definir la solucion</strong>
        <p>Elige un sospechoso, toca su celda correcta en el tablero y marca quien es el asesino. Esa informacion se usa para verificar la partida.</p>
      </div>
      <div class="suspect-palette">
        ${item.suspects.map((suspect) => `
          <button class="suspect-chip ${state.selectedSuspect === suspect.id ? "active" : ""}" data-editor-suspect="${escapeAttr(suspect.id)}" type="button">
            <span class="swatch" style="background:${escapeAttr(suspect.color)}"></span>
            <span class="chip-name">${escapeHtml(suspect.name)}</span>
          </button>
        `).join("")}
      </div>
      <label class="field">
        <span>Asesino</span>
        <select id="murdererSelect">
          ${item.suspects.map((suspect) => `
            <option value="${escapeAttr(suspect.id)}"${suspect.id === item.murderer ? " selected" : ""}>${escapeHtml(suspect.name)}</option>
          `).join("")}
        </select>
      </label>
      <div class="solution-list">
        ${item.suspects.map((suspect) => {
          const pos = item.solution[suspect.id];
          return `
            <div class="solution-row">
              <span class="swatch" style="background:${escapeAttr(suspect.color)}"></span>
              <span>${escapeHtml(suspect.name)}</span>
              <strong>${pos ? `fila ${pos.row + 1}, columna ${pos.col + 1}` : "sin asignar"}</strong>
            </div>
          `;
        }).join("")}
      </div>
    `;
    els.editorTools.querySelectorAll("[data-editor-suspect]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedSuspect = button.dataset.editorSuspect;
        renderEditorTools();
        renderSelectedLabel();
      });
    });
    const murdererSelect = document.getElementById("murdererSelect");
    murdererSelect?.addEventListener("change", () => {
      item.murderer = murdererSelect.value;
      saveCases();
      setStatus(els.editorStatus, "Asesino actualizado.", "success");
    });
  }
}

function renderBoard() {
  const item = currentCase();
  els.board.style.setProperty("--cols", item.cols);
  renderBoardSize();
  const conflicts = findConflicts();
  const unavailable = occupiedLineUnavailableCells();
  const checkMap = state.lastCheck?.cells || {};

  els.board.innerHTML = "";
  for (let row = 0; row < item.rows; row += 1) {
    for (let col = 0; col < item.cols; col += 1) {
      const key = cellKey(row, col);
      const button = document.createElement("button");
      button.type = "button";
      button.className = "cell";
      button.dataset.row = String(row);
      button.dataset.col = String(col);
      const region = item.regions[row]?.[col] || 0;
      button.style.setProperty("--region-color", COLORS[region % COLORS.length]);
      button.classList.add(`texture-${regionTexture(item, region)}`);
      button.classList.add(...cellBorderClasses(item, row, col, region));
      button.title = regionName(item, region);
      if (!cellCanBeOccupied(item, row, col)) button.classList.add("blocked");
      if (unavailable.has(key)) button.classList.add("unavailable");
      if (conflicts.has(key)) button.classList.add("conflict");
      if (checkMap[key]) button.classList.add(checkMap[key]);
      if (state.mode === "editor" && state.editorMode === "solution" && solutionAt(item, row, col)) {
        button.classList.add("solution-mark");
      }
      button.innerHTML = cellHtml(item, row, col);
      button.addEventListener("click", () => handleCellClick(row, col));
      els.board.appendChild(button);
    }
  }
}

function renderBoardSize() {
  const item = currentCase();
  const zoom = Number(els.zoomRange.value) || 68;
  const largest = Math.max(item.rows, item.cols);
  const auto = largest >= 14 ? 46 : largest >= 10 ? 54 : zoom;
  const cellSize = state.mode === "editor" ? Math.min(zoom, 64) : auto;
  els.board.style.setProperty("--cell", `${cellSize}px`);
}

function cellHtml(item, row, col) {
  const key = cellKey(row, col);
  const suspectId = state.reveal ? solutionAt(item, row, col) : state.board[key];
  const suspect = item.suspects.find((entry) => entry.id === suspectId);
  const rawObject = item.objects[key];
  const object = !rawObject ? null : rawObject.ref ? null : typeof rawObject === "string" ? { id: rawObject, color: null, rotation: 0 } : rawObject;
  const blocked = object && !objectCanBeOccupied(item, object.id);
  const victimKey = state.reveal ? cellKey(item.victim.row, item.victim.col) : state.victimGuess;
  const hasVictim = (state.mode === "editor" && item.victim.row === row && item.victim.col === col) ||
    (state.mode === "play" && victimKey === key);
  const notes = state.notes[key] || [];
  let objStyle = object?.rotation ? `--obj-rotation:${object.rotation}deg;` : "";
  if (object) {
    const { w, h } = getObjectSize(object);
    const rot = object.rotation || 0;
    const sw = (rot % 180 !== 0) ? h : w;
    const sh = (rot % 180 !== 0) ? w : h;
    if (sw > 1 || sh > 1) {
      objStyle += `width:calc(var(--cell) * ${sw} - 12px);height:calc(var(--cell) * ${sh} - 12px);right:auto;bottom:auto;z-index:2;`;
    }
  }
  return `
    ${object ? `<span class="cell-object ${blocked ? "blocked-object" : ""}" title="${escapeAttr(objectLabel(item, object.id))}"${objStyle ? ` style="${objStyle}"` : ""}>${objectIcon(object.id, object.color)}</span>` : ""}
    ${hasVictim ? `<span class="cell-victim">${escapeHtml((item.victim.name || "V").slice(0, 1))}</span>` : ""}
    ${suspect ? `
      <span class="cell-person">
        <span class="avatar" style="--avatar:${escapeAttr(suspect.color)}"></span>
        <span class="person-name">${escapeHtml(suspect.name)}</span>
      </span>
    ` : notes.length ? `
      <span class="notes">${notes.slice(0, 16).map((id) => `<span>${escapeHtml(shortName(item, id))}</span>`).join("")}</span>
    ` : ""}
  `;
}

function cellBorderClasses(item, row, col, region) {
  const rows = item.rows;
  const cols = item.cols;
  const classes = [];
  const checks = [
    ["top", row === 0, row > 0 ? item.regions[row - 1]?.[col] : region],
    ["right", col === cols - 1, col < cols - 1 ? item.regions[row]?.[col + 1] : region],
    ["bottom", row === rows - 1, row < rows - 1 ? item.regions[row + 1]?.[col] : region],
    ["left", col === 0, col > 0 ? item.regions[row]?.[col - 1] : region]
  ];
  for (const [side, isOuter, neighbor] of checks) {
    if (isOuter) classes.push(`edge-${side}`);
    else if ((Number(neighbor) || 0) !== region) classes.push(`zone-${side}`);
  }
  return classes;
}

function occupiedLineUnavailableCells() {
  if (state.mode !== "play" || state.eraseMode) {
    return new Set();
  }
  const item = currentCase();
  return ruleOccupiedLineUnavailableCells({
    board: state.board,
    cellKey,
    cols: item.cols,
    rows: item.rows,
    victimGuess: state.victimGuess
  });
}

function handleCellClick(row, col) {
  if (state.mode === "editor") {
    editCell(row, col);
    return;
  }
  const item = currentCase();
  const key = cellKey(row, col);
  if (state.eraseMode || (!state.selectedSuspect && (state.board[key] || state.victimGuess === key))) {
    delete state.board[key];
    delete state.notes[key];
    if (state.victimGuess === key) state.victimGuess = "";
    state.lastCheck = null;
    persistProgress();
    renderBoard();
    renderPlayPanel();
    return;
  }
  if (!state.selectedSuspect) return;
  if (!cellCanBeOccupied(item, row, col)) {
    setStatus(els.statusBox, "Esa celda tiene un objeto bloqueado y no puede ocuparse.", "warning");
    return;
  }
  startTimer();
  if (state.selectedSuspect === "__victim__") {
    if (cellBlockedByPlacedLine(row, col, "__victim__")) {
      setStatus(els.statusBox, "No puedes ubicar la victima en una fila o columna ya ocupada.", "warning");
      return;
    }
    if (state.board[key]) {
      setStatus(els.statusBox, "Primero vacia la celda: la victima no puede compartir posicion con un sospechoso.", "warning");
      return;
    }
    state.victimGuess = state.victimGuess === key ? "" : key;
    state.lastCheck = null;
    persistProgress();
    renderBoard();
    renderPlayPanel();
    return;
  }
  if (state.victimGuess === key) {
    setStatus(els.statusBox, "Esa celda ya tiene la victima. Vaciala antes de colocar un sospechoso.", "warning");
    return;
  }
  if (!state.noteMode && cellBlockedByPlacedLine(row, col, state.selectedSuspect)) {
    setStatus(els.statusBox, "No puedes colocar ahi: esa fila o columna ya esta ocupada.", "warning");
    return;
  }
  if (state.noteMode) {
    const notes = new Set(state.notes[key] || []);
    if (notes.has(state.selectedSuspect)) notes.delete(state.selectedSuspect);
    else notes.add(state.selectedSuspect);
    state.notes[key] = Array.from(notes);
  } else {
    if (state.board[key] === state.selectedSuspect) {
      delete state.board[key];
    } else {
      removeExistingPlacement(state.selectedSuspect);
      state.board[key] = state.selectedSuspect;
    }
    delete state.notes[key];
  }
  state.lastCheck = null;
  persistProgress();
  renderBoard();
  renderPlayPanel();
}

function getObjectSize(obj) {
  if (obj && typeof obj === "object") {
    return { w: obj.w || 1, h: obj.h || 1 };
  }
  return { w: 1, h: 1 };
}

function editCell(row, col) {
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
              const erot = existing.rotation || 0;
              const esw = (erot % 180 !== 0) ? eh : ew;
              const esh = (erot % 180 !== 0) ? ew : eh;
              const [er, ec] = k.split(",").map(Number);
              for (let dr2 = 0; dr2 < esh; dr2++) {
                for (let dc2 = 0; dc2 < esw; dc2++) {
                  delete item.objects[cellKey(er + dr2, ec + dc2)];
                }
              }
            }
          }
        }
      }
      const sw = state.selectedObjectW;
      const sh = state.selectedObjectH;
      const { w: _w, h: _h } = getObjectSize({ w: sw, h: sh });
      const fw = (state.selectedObjectRotation % 180 !== 0) ? _h : _w;
      const fh = (state.selectedObjectRotation % 180 !== 0) ? _w : _h;
      if (row + fh > item.rows || col + fw > item.cols) {
        setStatus(els.editorStatus, "El objeto no entra en el tablero.", "warning");
        return;
      }
      clearArea(row, col, fw, fh);
      for (let dr = 0; dr < fh; dr++) {
        for (let dc = 0; dc < fw; dc++) {
          const k = cellKey(row + dr, col + dc);
          if (dr === 0 && dc === 0) {
            item.objects[k] = { id: state.selectedObject, color: state.selectedObjectColor || null, rotation: state.selectedObjectRotation, w: sw, h: sh };
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
        const { w, h } = getObjectSize(raw.id);
        const rot = raw.rotation || 0;
        const sw = (rot % 180 !== 0) ? h : w;
        const sh = (rot % 180 !== 0) ? w : h;
        const [ar, ac] = key.split(",").map(Number);
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
  if (state.editorMode === "victim") renderEditorTools();
  if (state.editorMode === "solution") renderEditorTools();
  setStatus(els.editorStatus, "Cambio aplicado.", "success");
}

function verifyBoard() {
  const item = currentCase();
  const conflicts = findConflicts();
  const blocked = findBlockedPlacements(item);
  const cells = {};
  const expectedVictimKey = cellKey(item.victim.row, item.victim.col);
  const victimCorrect = state.victimGuess === expectedVictimKey;
  let placed = 0;
  let correct = 0;

  for (const [key, suspectId] of Object.entries(state.board)) {
    placed += 1;
    const [row, col] = key.split(",").map(Number);
    const expected = item.solution[suspectId];
    const isCorrect = expected && expected.row === row && expected.col === col && !blocked.has(key);
    cells[key] = isCorrect ? "correct" : "wrong";
    if (isCorrect) correct += 1;
  }
  if (state.victimGuess) cells[state.victimGuess] = victimCorrect ? "correct" : "wrong";

  state.lastCheck = { cells };
  renderBoard();

  if (blocked.size) {
    setStatus(els.statusBox, "Hay sospechosos en objetos bloqueados.", "error");
  } else if (conflicts.size) {
    setStatus(els.statusBox, "Hay conflictos: algun sospechoso comparte fila o columna.", "error");
  } else if (!state.victimGuess) {
    setStatus(els.statusBox, `Falta ubicar la victima. Sospechosos correctos: ${correct} de ${item.suspects.length}.`, "warning");
  } else if (correct === item.suspects.length && placed === item.suspects.length && victimCorrect) {
    stopTimer();
    const murderer = item.suspects.find((suspect) => suspect.id === item.murderer);
    state.reveal = true;
    setStatus(els.statusBox, `Caso resuelto correctamente. El asesino es ${murderer?.name || "desconocido"}. Tiempo final: ${formatSeconds(elapsedSeconds())}.`, "success");
    renderBoard();
  } else {
    setStatus(els.statusBox, `${correct} de ${item.suspects.length} sospechosos correctos. Victima: ${victimCorrect ? "correcta" : "incorrecta"}.`, "warning");
  }
}

function findConflicts() {
  const rows = new Map();
  const cols = new Map();
  const conflicts = new Set();
  for (const [key, suspectId] of Object.entries(state.board)) {
    const [row, col] = key.split(",").map(Number);
    const rowKey = `${suspectId}:r:${row}`;
    const colKey = `${suspectId}:c:${col}`;
    if (rows.has(rowKey)) {
      conflicts.add(key);
      conflicts.add(rows.get(rowKey));
    } else rows.set(rowKey, key);
    if (cols.has(colKey)) {
      conflicts.add(key);
      conflicts.add(cols.get(colKey));
    } else cols.set(colKey, key);
  }
  return conflicts;
}

function removeExistingPlacement(suspectId) {
  for (const [key, placedSuspect] of Object.entries(state.board)) {
    if (placedSuspect === suspectId) {
      delete state.board[key];
      delete state.notes[key];
    }
  }
}

function cellBlockedByPlacedLine(row, col, movingPiece) {
  return ruleCellBlockedByPlacedLine({
    board: state.board,
    cellKey,
    col,
    movingPiece,
    row,
    victimGuess: state.victimGuess
  });
}

function findBlockedPlacements(item) {
  const blocked = new Set();
  for (const key of Object.keys(state.board)) {
    const [row, col] = key.split(",").map(Number);
    if (!cellCanBeOccupied(item, row, col)) blocked.add(key);
  }
  return blocked;
}

function resetProgress() {
  state.board = {};
  state.notes = {};
  state.victimGuess = "";
  state.startedAt = null;
  state.elapsedBeforePause = 0;
  state.lastCheck = null;
  state.reveal = false;
  stopTimer();
  persistProgress();
  renderAll();
}

function persistProgress() {
  const all = readJson(PROGRESS_KEY) || {};
  all[state.caseId] = {
    board: state.board,
    notes: state.notes,
    victimGuess: state.victimGuess,
    elapsed: elapsedSeconds()
  };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
}

function switchMode(mode) {
  state.mode = mode;
  els.playTab.classList.toggle("active", mode === "play");
  els.editorTab.classList.toggle("active", mode === "editor");
  els.playPanel.classList.toggle("active", mode === "play");
  els.editorPanel.classList.toggle("active", mode === "editor");
  renderBoard();
}

function createNewCase() {
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
      color: AVATARS[index % AVATARS.length]
    })),
    clues: ["Cada sospechoso ocupa una fila y una columna distintas."],
    regionNames: normalizeRegionNames(null, null),
    regionTextures: normalizeRegionTextures(null, 1),
    objectRules: DEFAULT_OBJECT_RULES,
    solution: {}
  });
  state.cases.push(newCase);
  state.caseId = newCase.id;
  saveCases();
  loadCurrentCase(newCase.id);
  renderAll();
}

function saveEditorCase() {
  const item = currentCase();
  const nextRows = clamp(Number(els.editRows.value) || item.rows, MIN_SIZE, MAX_SIZE);
  const nextCols = clamp(Number(els.editCols.value) || item.cols, MIN_SIZE, MAX_SIZE);
  item.title = els.editTitle.value.trim() || "Caso sin titulo";
  item.difficulty = els.editDifficulty.value.trim() || "Personalizado";
  item.victim.name = els.editVictimName.value.trim() || "Victima";
  if (nextRows !== item.rows || nextCols !== item.cols) resizeCase(item, nextRows, nextCols);
  const names = els.editSuspects.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  item.suspects = normalizeSuspects(names.map((name, index) => ({
    id: item.suspects[index]?.id || makeId(name),
    name,
    color: item.suspects[index]?.color || AVATARS[index % AVATARS.length]
  })), Math.min(MAX_SIZE, Math.max(nextRows, nextCols)));
  item.clues = els.editClues.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  item.regionNames = parseRegionNames(els.editRegions.value);
  item.solution = Object.fromEntries(Object.entries(item.solution).filter(([id, pos]) => (
    item.suspects.some((suspect) => suspect.id === id) && pos.row < item.rows && pos.col < item.cols
  )));
  if (!item.suspects.some((suspect) => suspect.id === item.murderer)) item.murderer = item.suspects[0]?.id || "";
  saveCases();
  renderAll();
  setStatus(els.editorStatus, "Caso guardado.", "success");
}

function updateCaseTextFields() {
  if (state.mode !== "editor") return;
  const item = currentCase();
  item.title = els.editTitle.value.trim() || "Caso sin titulo";
  item.difficulty = els.editDifficulty.value.trim() || "Personalizado";
  item.victim.name = els.editVictimName.value.trim() || "Victima";
  saveCases();
  renderHeader();
  renderCaseSelect();
  setStatus(els.editorStatus, "Texto actualizado.", "success");
}

function updateCaseSuspects() {
  if (state.mode !== "editor") return;
  const item = currentCase();
  const names = els.editSuspects.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  if (!names.length) {
    setStatus(els.editorStatus, "Debe existir al menos un sospechoso.", "warning");
    return;
  }
  item.suspects = normalizeSuspects(names.map((name, index) => ({
    id: item.suspects[index]?.id || makeId(name),
    name,
    color: item.suspects[index]?.color || AVATARS[index % AVATARS.length]
  })), Math.min(MAX_SIZE, Math.max(item.rows, item.cols)));
  item.solution = Object.fromEntries(Object.entries(item.solution).filter(([id]) => (
    item.suspects.some((suspect) => suspect.id === id)
  )));
  if (!item.suspects.some((suspect) => suspect.id === state.selectedSuspect)) {
    state.selectedSuspect = null;
  }
  if (!item.suspects.some((suspect) => suspect.id === item.murderer)) {
    item.murderer = item.suspects[0]?.id || "";
  }
  saveCases();
  renderBoard();
  renderEditorTools();
  setStatus(els.editorStatus, "Sospechosos actualizados.", "success");
}

function updateCaseClues() {
  if (state.mode !== "editor") return;
  const item = currentCase();
  item.clues = els.editClues.value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  saveCases();
  setStatus(els.editorStatus, "Pistas actualizadas.", "success");
}

function updateCaseRegions() {
  if (state.mode !== "editor") return;
  const item = currentCase();
  item.regionNames = parseRegionNames(els.editRegions.value);
  item.regionTextures = normalizeRegionTextures(item.regionTextures, item.regionNames.length);
  remapInvalidRegions(item);
  state.selectedRegion = clamp(state.selectedRegion, 0, item.regionNames.length - 1);
  saveCases();
  renderBoard();
  renderEditorTools();
  setStatus(els.editorStatus, "Zonas actualizadas.", "success");
}

function updateCaseDimensions() {
  if (state.mode !== "editor") return;
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
    setStatus(els.editorStatus, `Tablero cambiado a ${nextRows}x${nextCols}.`, "success");
  }
}

function resizeCase(item, rows, cols = rows) {
  item.rows = rows;
  item.cols = cols;
  item.size = Math.max(rows, cols);
  item.regions = normalizeRegions(item.regions, rows, cols);
  item.victim.row = clamp(item.victim.row, 0, rows - 1);
  item.victim.col = clamp(item.victim.col, 0, cols - 1);
  item.objects = Object.fromEntries(Object.entries(item.objects).filter(([key]) => {
    const [row, col] = key.split(",").map(Number);
    return row < rows && col < cols;
  }));
  const validAnchors = new Set(Object.keys(item.objects));
  for (const [key, raw] of Object.entries(item.objects)) {
    if (raw && raw.ref && !validAnchors.has(raw.ref)) delete item.objects[key];
  }
  item.solution = Object.fromEntries(Object.entries(item.solution || {}).filter(([, pos]) => (
    pos.row < rows && pos.col < cols
  )));
  state.board = Object.fromEntries(Object.entries(state.board || {}).filter(([key]) => {
    const [row, col] = key.split(",").map(Number);
    return row < rows && col < cols;
  }));
  state.notes = Object.fromEntries(Object.entries(state.notes || {}).filter(([key]) => {
    const [row, col] = key.split(",").map(Number);
    return row < rows && col < cols;
  }));
  if (state.victimGuess) {
    const [row, col] = state.victimGuess.split(",").map(Number);
    if (row >= rows || col >= cols) state.victimGuess = "";
  }
}

function regionName(item, index) {
  return item.regionNames[index] || `Zona ${index + 1}`;
}

function regionTexture(item, index) {
  return item.regionTextures[index] || "plain";
}

function textureName(id) {
  return TEXTURES.find((texture) => texture.id === id)?.name || id;
}

function parseRegionNames(value) {
  const names = value.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  return names.length ? names.slice(0, COLORS.length) : ["Zona 1"];
}

function remapInvalidRegions(item) {
  const maxIndex = Math.max(0, item.regionNames.length - 1);
  item.regions = item.regions.map((row) => row.map((region) => (
    Number(region) > maxIndex ? 0 : clamp(Number(region) || 0, 0, maxIndex)
  )));
}

function objectOptions(item) {
  return [
    { id: "", label: "sin objeto", occupiable: true },
    ...Object.entries(item.objectRules).map(([id, rule]) => ({
      id,
      label: rule.name,
      occupiable: rule.occupiable !== false
    }))
  ];
}

function objectLabel(item, objectId) {
  const obj = OBJECTS.find((o) => o.id === objectId);
  if (obj) return obj.name;
  return item.objectRules[objectId]?.name || objectId;
}

function objectIcon(id, color) {
  function imgSrc(id) {
    const known = OBJECTS.some((o) => o.id === id);
    if (known) return `assets/objects/${escapeAttr(id)}.svg`;
    const assetKey = objectAssetForKey(id);
    return assetKey ? `assets/objects/${escapeAttr(assetKey)}.svg` : "";
  }
  const src = imgSrc(id);
  if (src && color) {
    return `<span class="obj-color-wrap"><img src="${src}" alt="" draggable="false"><span class="obj-color-overlay" style="background:${escapeAttr(color)}"></span></span>`;
  }
  if (src) {
    return `<img src="${src}" alt="" draggable="false">`;
  }
  const common = `viewBox="0 0 32 32" aria-hidden="true" focusable="false"`;
  if (id.includes("arbol")) {
    return `<svg ${common}><path d="M16 4 7 17h6l-4 7h14l-4-7h6L16 4Z"/><path d="M16 22v6"/></svg>`;
  }
  if (id.includes("banco")) {
    return `<svg ${common}><path d="M7 13h18v6H7z"/><path d="M9 9h14v4H9z"/><path d="M10 19v7M22 19v7"/></svg>`;
  }
  if (id.includes("agua") || id.includes("lago") || id.includes("estanque")) {
    return `<svg ${common}><path d="M6 18c3-4 5-4 8 0s5 4 8 0 5-4 8 0"/><path d="M3 24c3-4 5-4 8 0s5 4 8 0 5-4 8 0"/></svg>`;
  }
  if (id.includes("mesa")) {
    return `<svg ${common}><path d="M6 12h20v5H6z"/><path d="M10 17v9M22 17v9"/></svg>`;
  }
  if (id.includes("silla")) {
    return `<svg ${common}><path d="M10 7v12h12v-7"/><path d="M10 19v7M22 19v7"/></svg>`;
  }
  if (id.includes("flor")) {
    return `<svg ${common}><circle cx="16" cy="11" r="3"/><circle cx="11" cy="15" r="3"/><circle cx="21" cy="15" r="3"/><path d="M16 17v10"/><path d="M16 22c-4-3-7-2-9 2"/></svg>`;
  }
  if (id.includes("caja")) {
    return `<svg ${common}><path d="M7 11h18v15H7z"/><path d="M7 11l4-5h10l4 5"/><path d="M16 11v15"/></svg>`;
  }
  if (id.includes("puerta")) {
    return `<svg ${common}><path d="M10 5h13v22H10z"/><circle cx="20" cy="16" r="1.5"/></svg>`;
  }
  if (id.includes("ventana")) {
    return `<svg ${common}><path d="M7 7h18v18H7z"/><path d="M16 7v18M7 16h18"/></svg>`;
  }
  if (id.includes("piedra")) {
    return `<svg ${common}><path d="M6 22c2-7 6-11 11-11 5 0 8 4 9 11-3 3-15 4-20 0Z"/></svg>`;
  }
  if (id.includes("lampara")) {
    return `<svg ${common}><path d="M12 5h8l4 11H8l4-11Z"/><path d="M16 16v10M11 26h10"/></svg>`;
  }
  return `<svg ${common}><circle cx="16" cy="16" r="9"/><path d="M16 10v12M10 16h12"/></svg>`;
}

function objectCanBeOccupied(item, objectId) {
  if (!objectId) return true;
  return item.objectRules[objectId]?.occupiable !== false;
}

function cellCanBeOccupied(item, row, col) {
  const raw = item.objects[cellKey(row, col)];
  if (!raw) return true;
  if (raw.ref) {
    const anchor = item.objects[raw.ref];
    if (anchor) {
      const id = typeof anchor === "string" ? anchor : anchor.id;
      return objectCanBeOccupied(item, id);
    }
    return true;
  }
  const id = typeof raw === "string" ? raw : raw.id;
  return objectCanBeOccupied(item, id);
}

function removeInvalidObjectCells(item) {
  const valid = new Set();
  for (const [key, raw] of Object.entries(item.objects)) {
    if (!raw || raw.ref) continue;
    const id = typeof raw === "string" ? raw : raw.id;
    if (item.objectRules[id] || OBJECTS.some((o) => o.id === id)) valid.add(key);
  }
  for (const [key, raw] of Object.entries(item.objects)) {
    if (!raw) { delete item.objects[key]; continue; }
    if (raw.ref) {
      if (!valid.has(raw.ref)) delete item.objects[key];
    } else {
      if (!valid.has(key)) {
        const id = typeof raw === "string" ? raw : raw.id;
        const { w, h } = getObjectSize(raw);
        const rot = raw.rotation || 0;
        const sw = (rot % 180 !== 0) ? h : w;
        const sh = (rot % 180 !== 0) ? w : h;
        const [ar, ac] = key.split(",").map(Number);
        for (let dr = 0; dr < sh; dr++) {
          for (let dc = 0; dc < sw; dc++) {
            delete item.objects[cellKey(ar + dr, ac + dc)];
          }
        }
      }
    }
  }
}

function duplicateCase() {
  const copy = structuredClone(currentCase());
  copy.id = makeId(`${copy.title}-${Date.now()}`);
  copy.title = `${copy.title} copia`;
  state.cases.push(normalizeCase(copy));
  state.caseId = copy.id;
  saveCases();
  loadCurrentCase(copy.id);
  renderAll();
}

function deleteCase() {
  if (state.cases.length <= 1) {
    setStatus(els.statusBox, "Debe quedar al menos un caso.", "warning");
    return;
  }
  const index = state.cases.findIndex((item) => item.id === state.caseId);
  state.cases.splice(index, 1);
  state.caseId = state.cases[0].id;
  saveCases();
  loadCurrentCase(state.caseId);
  renderAll();
}

function exportCurrentCase() {
  const blob = new Blob([JSON.stringify(currentCase(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${makeId(currentCase().title)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}

function importCase(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    try {
      const imported = normalizeCase(JSON.parse(String(reader.result)));
      imported.id = makeId(`${imported.title}-${Date.now()}`);
      state.cases.push(imported);
      state.caseId = imported.id;
      saveCases();
      loadCurrentCase(imported.id);
      renderAll();
      switchMode("editor");
    } catch {
      setStatus(els.editorStatus, "No se pudo importar el JSON.", "error");
    } finally {
      event.target.value = "";
    }
  };
  reader.readAsText(file);
}

function startTimer() {
  if (state.startedAt) return;
  state.startedAt = Date.now();
  state.timer = window.setInterval(() => {
    updateTimerLabel();
    persistProgress();
  }, 1000);
}

function stopTimer() {
  if (state.timer) window.clearInterval(state.timer);
  state.timer = null;
  state.elapsedBeforePause = elapsedSeconds();
  state.startedAt = null;
  updateTimerLabel();
}

function elapsedSeconds() {
  const running = state.startedAt ? Math.floor((Date.now() - state.startedAt) / 1000) : 0;
  return state.elapsedBeforePause + running;
}

function updateTimerLabel() {
  els.timerLabel.textContent = formatSeconds(elapsedSeconds());
}

function solutionAt(item, row, col) {
  const match = Object.entries(item.solution).find(([, pos]) => pos.row === row && pos.col === col);
  return match?.[0] || "";
}

function shortName(item, suspectId) {
  const suspect = item.suspects.find((entry) => entry.id === suspectId);
  return suspect ? suspect.name.slice(0, 2) : "";
}

function setStatus(element, message, tone) {
  element.textContent = message;
  const staysTop = element.classList.contains("status-top");
  element.className = `status-box ${staysTop ? "status-top " : ""}${tone || ""}`;
}
