import { state, els, currentCase, gameCase } from "./state.js";
import { AVATARS, COLORS, OBJECTS, TEXTURES, objectAssetForKey, findObject } from "./catalogs.js";
import { cellKey, escapeAttr, escapeHtml, getObjectSize, rotatedSize, splitLines } from "./utils.js";
import { occupiedLineUnavailableCells as computeUnavailableCells, findLineConflicts } from "./rules.js";
import { saveCases } from "./persist.js";
import { updateTimerLabel } from "./game.js";

export function textureUrlFor(id) {
  if (id === "plain") return "";
  const entry = TEXTURES.find((t) => t.id === id);
  if (!entry) return "";
  return `assets/textures/${id}.${entry.png ? "png" : "svg"}`;
}

export function textureBg(id) {
  const url = textureUrlFor(id);
  return url ? `background-image:url(${url})` : "";
}

export function textureName(id) {
  return TEXTURES.find((texture) => texture.id === id)?.name || id;
}

export function applyTexturePreview(el, id) {
  const url = textureUrlFor(id);
  if (id === "plain" || !url) {
    el.style.backgroundImage = "none";
    el.style.backgroundColor = "var(--panel)";
    el.style.backgroundSize = "";
  } else {
    el.style.backgroundImage = `url(${url})`;
    el.style.backgroundColor = "";
    el.style.backgroundSize = "cover";
  }
}

export function regionName(item, index) {
  return item.regionNames[index] || `Zona ${index + 1}`;
}

export function regionTexture(item, index) {
  return item.regionTextures[index] || "plain";
}

export function parseRegionNames(value) {
  const names = splitLines(value);
  return names.length ? names.slice(0, COLORS.length) : ["Zona 1"];
}

export function cellBorderClasses(item, row, col, region) {
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

export function objectLabel(item, objectId) {
  const obj = findObject(objectId);
  if (obj) return obj.name;
  return item.objectRules[objectId]?.name || objectId;
}

export function objectIcon(id, color) {
  function imgSrc(id) {
    const entry = findObject(id);
    if (entry) return `assets/objects/${escapeAttr(id)}.${entry.png ? "png" : "svg"}`;
    const assetKey = objectAssetForKey(id);
    if (!assetKey) return "";
    const fallback = findObject(assetKey);
    return `assets/objects/${escapeAttr(assetKey)}.${fallback?.png ? "png" : "svg"}`;
  }
  const src = imgSrc(id);
  if (src && color) {
    const maskStyle = `-webkit-mask-image:url(${src});mask-image:url(${src})`;
    return `<span class="obj-color-wrap"><img src="${src}" alt="" draggable="false"><span class="obj-color-overlay" style="background:${escapeAttr(color)};${maskStyle}"></span></span>`;
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

export function solutionAt(item, row, col) {
  const match = Object.entries(item.solution).find(([, pos]) => pos.row === row && pos.col === col);
  return match?.[0] || "";
}

export function shortName(item, suspectId) {
  const suspect = item.suspects.find((entry) => entry.id === suspectId);
  return suspect ? suspect.name.slice(0, 2) : "";
}

export function objectCanBeOccupied(item, objectId) {
  if (!objectId) return true;
  return item.objectRules[objectId]?.occupiable !== false;
}

export function cellCanBeOccupied(item, row, col) {
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

export function cellHtml(item, row, col, zoneLabel, draft) {
  const key = cellKey(row, col);
  const suspectId = state.reveal ? solutionAt(item, row, col) : (state.mode === "editor" && state.editorMode === "solution" ? solutionAt(item, row, col) : draft || state.board[key]);
  const suspect = item.suspects.find((entry) => entry.id === suspectId);
  const rawObject = item.objects[key];
  const object = !rawObject ? null : rawObject.ref ? null : typeof rawObject === "string" ? { id: rawObject, color: null, rotation: 0 } : rawObject;
  const blocked = object && !objectCanBeOccupied(item, object.id);
  const victimKey = state.reveal ? cellKey(item.victim.row, item.victim.col) : state.victimGuess;
  const hasVictim = (state.mode === "editor" && item.victim.row === row && item.victim.col === col) ||
    (state.mode === "play" && victimKey === key);
  const isDraft = !state.reveal && state.mode === "play" && draft && !state.board[key];
  let objStyle = object?.rotation ? `--obj-rotation:${object.rotation}deg;` : "";
  if (object) {
    const { w, h } = getObjectSize(object);
    const { w: sw, h: sh } = rotatedSize(w, h, object.rotation);
    if (sw > 1 || sh > 1) {
      objStyle += `width:calc(var(--cell) * ${sw} - 12px);height:calc(var(--cell) * ${sh} - 12px);right:auto;bottom:auto;z-index:2;`;
    }
    if (sw === 1 && sh === 1 && (object.id.endsWith("_left") || object.id.endsWith("_right"))) {
      objStyle += `inset:6px -6px;`;
    }
  }
  return `
    ${zoneLabel ? `<span class="zone-label">${escapeHtml(zoneLabel)}</span>` : ""}
    ${object ? `<span class="cell-object ${blocked ? "blocked-object" : "occupiable-object"}" title="${escapeAttr(objectLabel(item, object.id))}"${objStyle ? ` style="${objStyle}"` : ""}>${objectIcon(object.id, object.color)}</span>` : ""}
    ${hasVictim ? `<span class="cell-victim">${escapeHtml((item.victim.name || "V").slice(0, 1))}</span>` : ""}
    ${suspect ? `
      <span class="cell-person${isDraft ? " person-draft" : ""}">
        <span class="avatar" style="--avatar:${escapeAttr(suspect.color)}"></span>
        <span class="person-name">${escapeHtml(suspect.name)}</span>
      </span>
    ` : ""}
  `;
}

export function renderBoardSize() {
  const item = currentCase();
  const zoom = Number(els.zoomRange.value) || 68;
  const largest = Math.max(item.rows, item.cols);
  const auto = largest >= 14 ? 46 : largest >= 10 ? 54 : zoom;
  const cellSize = state.mode === "editor" ? Math.min(zoom, 64) : auto;
  els.board.style.setProperty("--cell", `${cellSize}px`);
}

export function renderBoard() {
  const item = gameCase();
  if (!item) return;
  els.board.style.setProperty("--cols", item.cols);
  renderBoardSize();
  const conflicts = findLineConflicts(state.board);
  const unavailable = state.mode !== "play" ? new Set() : computeUnavailableCells({
    board: state.board, cellKey, cols: item.cols, rows: item.rows, victimGuess: state.victimGuess
  });
  const checkMap = state.lastCheck?.cells || {};

  els.board.innerHTML = "";
  const labeledZones = new Set();
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
      { const texId = regionTexture(item, region); if (texId === "plain") { button.classList.add("texture-plain"); } else { const url = textureUrlFor(texId); if (url) button.style.backgroundImage = `url(${url})`; } }
      button.classList.add(...cellBorderClasses(item, row, col, region));
      button.title = regionName(item, region);
      if (!cellCanBeOccupied(item, row, col)) button.classList.add("blocked");
      if (unavailable.has(key)) button.classList.add("unavailable");
      if (conflicts.has(key)) button.classList.add("conflict");
      if (checkMap[key]) button.classList.add(checkMap[key]);
      const draftId = state.mode === "play" && !state.board[key] ? state.draft[key] : null;
      if (draftId) button.classList.add("cell-draft");
      const mainObj = item.objects[key];
      if (mainObj && typeof mainObj === "object" && !mainObj.ref && ((mainObj.w || 1) > 1 || (mainObj.h || 1) > 1)) {
        button.style.zIndex = "2";
      }
      const zoneLabel = labeledZones.has(region) ? "" : (labeledZones.add(region), regionName(item, region));
      button.innerHTML = cellHtml(item, row, col, zoneLabel, draftId);
      els.board.appendChild(button);
    }
  }
}

const MALE_SVG = `<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M12 22Q12 6 40 4Q68 6 68 22Q58 18 40 16Q22 18 12 22Z" fill="currentColor"/>
  <ellipse cx="40" cy="30" rx="26" ry="22" fill="currentColor"/>
  <rect x="12" y="24" width="5" height="9" rx="2" fill="currentColor"/>
  <rect x="63" y="24" width="5" height="9" rx="2" fill="currentColor"/>
  <rect x="36" y="52" width="8" height="8" rx="2" fill="currentColor"/>
  <path d="M4 100Q14 60 36 60L44 60Q66 60 76 100Z" fill="currentColor"/>
</svg>`;

const FEMALE_SVG = `<svg viewBox="0 0 80 100" xmlns="http://www.w3.org/2000/svg">
  <path d="M14 22Q14 6 40 4Q66 6 66 22Q58 18 40 16Q22 18 14 22Z" fill="currentColor"/>
  <path d="M14 24Q8 55 16 80Q22 92 28 94Q24 80 20 60Q18 40 22 26Z" fill="currentColor"/>
  <path d="M66 24Q72 55 64 80Q58 92 52 94Q56 80 60 60Q62 40 58 26Z" fill="currentColor"/>
  <ellipse cx="40" cy="30" rx="24" ry="20" fill="currentColor"/>
  <rect x="36" y="50" width="8" height="6" rx="2" fill="currentColor"/>
  <path d="M12 100Q20 56 36 56L44 56Q60 56 68 100Z" fill="currentColor"/>
</svg>`;

export function renderSuspectCards() {
  const item = currentCase();
  const victimCard = `
    <button class="suspect-card${state.selectedSuspect === "__victim__" ? " active" : ""}" data-victim-piece="true" type="button">
      <div class="card-photo card-photo-victim">${item.victim.gender === "male" ? MALE_SVG : FEMALE_SVG}</div>
      <div class="card-name">${escapeHtml(item.victim.name || "Victima")}</div>
      ${item.victim.clue ? `<div class="card-clue">${escapeHtml(item.victim.clue)}</div>` : ""}
    </button>
  `;
  const suspectCards = item.suspects.map((suspect) => `
    <button class="suspect-card${state.selectedSuspect === suspect.id ? " active" : ""}" data-suspect="${escapeAttr(suspect.id)}" type="button">
      <div class="card-photo" style="color:${escapeAttr(suspect.color)}">${suspect.gender === "female" ? FEMALE_SVG : MALE_SVG}</div>
      <div class="card-name">${escapeHtml(suspect.name)}</div>
      ${suspect.clue ? `<div class="card-clue">${escapeHtml(suspect.clue)}</div>` : ""}
    </button>
  `).join("");
  els.suspectCards.innerHTML = victimCard + suspectCards;
  els.suspectCards.querySelector("[data-victim-piece]")?.addEventListener("click", () => {
    state.selectedSuspect = "__victim__";
    renderBoard();
    renderSuspectCards();
    renderSelectedLabel();
  });
  els.suspectCards.querySelectorAll("[data-suspect]").forEach((button) => {
    button.addEventListener("click", () => {
      state.selectedSuspect = button.dataset.suspect;
      renderBoard();
      renderSuspectCards();
      renderSelectedLabel();
    });
  });
}

export function renderZoneLegend() {
  const item = currentCase();
  const used = new Set(item.regions.flat());
  els.zoneLegend.innerHTML = Array.from(used).sort((a, b) => a - b).map((region) => `
    <span class="zone-key">
      <span class="zone-swatch" style="background:${COLORS[region % COLORS.length]}"></span>
      <span>${escapeHtml(item.regionNames[region] || `Zona ${region + 1}`)}</span>
    </span>
  `).join("");
}

export function renderObjectLegend() {
  const item = currentCase();
  const used = Object.keys(item.objects).map((key) => item.objects[key]);
  const unique = new Map();
  used.forEach((obj) => {
    const id = typeof obj === "string" ? obj : obj.id;
    if (!id) return;
    if (!unique.has(id)) unique.set(id, obj);
  });
  els.objectLegend.innerHTML = unique.size ? Array.from(unique.values()).map((obj) => {
    const id = typeof obj === "string" ? obj : obj.id;
    return `<span class="object-key">
      <span class="legend-object-icon">${objectAssetForKey(id)}</span>
      <span>${escapeHtml(id)}</span>
    </span>`;
  }).join("") : `<span class="empty-legend">Sin objetos en este caso.</span>`;
}

export function renderSelectedLabel() {
  const item = currentCase();
  const suspect = item.suspects.find((entry) => entry.id === state.selectedSuspect);
  if (state.selectedSuspect === "__victim__") els.selectedLabel.textContent = `Seleccionado: ${item.victim.name || "Victima"}`;
  else els.selectedLabel.textContent = suspect ? `Seleccionado: ${suspect.name}` : "Selecciona un sospechoso";
}

export function renderGeneralClues() {
  const item = currentCase();
  const clues = (item.generalClues || "").trim();
  els.generalCluesPanel.innerHTML = clues
    ? `<h2>Pistas</h2><div class="clue-list">${clues.split("\n").map((line) => `<p class="clue-item">${escapeHtml(line)}</p>`).join("")}</div>`
    : "";
}

export function renderPlayPanel() {
  const item = currentCase();
  els.difficultyLabel.textContent = item.difficulty;
  els.sizeLabel.textContent = `${item.rows}x${item.cols}`;
  els.revealBtn.textContent = state.reveal ? "Ocultar" : "Solucion";
  renderSuspectCards();
  renderGeneralClues();
  renderSelectedLabel();
  updateTimerLabel();
  if (!state.lastCheck) {
    setStatus(els.statusBox, "Ubica la victima y coloca cada sospechoso una sola vez por fila y columna.", "");
  }
}

export function renderHeader() {
  const item = currentCase();
  els.caseTitle.textContent = item.title;
}

export function renderCaseSelect() {
  els.caseSelect.innerHTML = state.cases.map((item) => (
    `<option value="${escapeAttr(item.id)}"${item.id === state.caseId ? " selected" : ""}>${escapeHtml(item.title)}</option>`
  )).join("");
}

export function renderAll() {
  renderCaseSelect();
  renderHeader();
  renderPlayPanel();
  renderEditorPanel();
  renderBoard();
}

export function renderEditorPanel() {
  const item = currentCase();
  els.editTitle.value = item.title;
  els.editDifficulty.value = item.difficulty;
  els.editRows.value = item.rows;
  els.editCols.value = item.cols;
  els.editSuspects.value = item.suspects.map((suspect) => suspect.name).join("\n");
  els.editClues.value = item.suspects.map((suspect) => suspect.clue || "").join("\n");
  els.editGenders.value = item.suspects.map((suspect) => suspect.gender || "").join("\n");
  els.editRegions.value = item.regionNames.join("\n");
  renderEditorModeButtons();
  renderEditorTools();
  setStatus(els.editorStatus, "Elige una herramienta y haz clic en el tablero para editar el caso.", "");
}

export function renderEditorModeButtons() {
  els.editorModeButtons.forEach((button) => {
    button.classList.toggle("active", button.dataset.mode === state.editorMode);
  });
  clearRegionHighlight();
}

export function highlightRegion(item, zone) {
  clearRegionHighlight();
  const rows = item.regions.length;
  const cols = item.regions[0]?.length || 0;
  for (const cell of els.board.querySelectorAll(".cell")) {
    const r = Number(cell.dataset.row);
    const c = Number(cell.dataset.col);
    if ((item.regions[r]?.[c] ?? -1) !== zone) continue;
    cell.style.setProperty("--focus-top", r > 0 && (item.regions[r - 1]?.[c] ?? -1) === zone ? "0" : "4px");
    cell.style.setProperty("--focus-right", c < cols - 1 && (item.regions[r]?.[c + 1] ?? -1) === zone ? "0" : "4px");
    cell.style.setProperty("--focus-bottom", r < rows - 1 && (item.regions[r + 1]?.[c] ?? -1) === zone ? "0" : "4px");
    cell.style.setProperty("--focus-left", c > 0 && (item.regions[r]?.[c - 1] ?? -1) === zone ? "0" : "4px");
    cell.classList.add("zone-focus");
  }
}

export function clearRegionHighlight() {
  for (const cell of els.board.querySelectorAll(".cell.zone-focus")) {
    cell.classList.remove("zone-focus");
    cell.style.removeProperty("--focus-top");
    cell.style.removeProperty("--focus-right");
    cell.style.removeProperty("--focus-bottom");
    cell.style.removeProperty("--focus-left");
  }
}

export function editorSuccess(msg) {
  setStatus(els.editorStatus, msg, "success");
}

export function createDropdown(config) {
  const {
    id, options, getId, getLabel, swatchHtml,
    emptyLabel = "", emptySwatchHtml = "",
    value = null, onChange, sortByName = false,
  } = config;

  const sorted = sortByName
    ? [...options].sort((a, b) => getLabel(a).localeCompare(getLabel(b)))
    : options;

  const currentItem = options.find((o) => getId(o) === value);
  const currentLabel = currentItem ? getLabel(currentItem) : emptyLabel;
  const currentSwatch = value ? swatchHtml(value) : emptySwatchHtml;

  const optionHtml = sorted.map((item) => {
    const itemId = getId(item);
    return `
      <button class="texture-option ${value === itemId ? "active" : ""}" data-dd-opt="${escapeAttr(itemId)}" type="button">
        <span class="texture-option-swatch">${swatchHtml(itemId)}</span>
        <span>${escapeHtml(getLabel(item))}</span>
      </button>
    `;
  }).join("");

  const emptyHtml = emptyLabel ? `
    <button class="texture-option ${!value ? "active" : ""}" data-dd-opt="" type="button">
      <span class="texture-option-swatch">${emptySwatchHtml}</span>
      <span>${escapeHtml(emptyLabel)}</span>
    </button>
  ` : "";

  const html = `
    <div class="texture-select-row">
      <span class="texture-preview" id="${id}Preview">${currentSwatch}</span>
      <div class="texture-dropdown-wrap">
        <button class="texture-dropdown-trigger" id="${id}Trigger" type="button">
          <span class="texture-dropdown-trigger-swatch" id="${id}Swatch">${currentSwatch}</span>
          <span id="${id}Label">${escapeHtml(currentLabel)}</span>
          <span class="dropdown-arrow">▼</span>
        </button>
        <div class="texture-dropdown-panel" id="${id}Panel">
          ${emptyHtml}
          ${optionHtml}
        </div>
      </div>
    </div>
  `;

  function mount() {
    const preview = document.getElementById(`${id}Preview`);
    const trigger = document.getElementById(`${id}Trigger`);
    const panel = document.getElementById(`${id}Panel`);
    const swatch = document.getElementById(`${id}Swatch`);
    const label = document.getElementById(`${id}Label`);
    let open = false;

    function apply(id) {
      swatch.innerHTML = id ? swatchHtml(id) : emptySwatchHtml;
      preview.innerHTML = id ? swatchHtml(id) : emptySwatchHtml;
      const item = options.find((o) => getId(o) === id);
      label.textContent = item ? getLabel(item) : emptyLabel;
      panel.querySelectorAll(".texture-option").forEach((opt) => {
        opt.classList.toggle("active", opt.dataset.ddOpt === id);
      });
    }

    function openPanel() {
      open = true;
      panel.classList.add("open");
    }

    function closePanel() {
      open = false;
      panel.classList.remove("open");
    }

    trigger?.addEventListener("click", (e) => {
      e.stopPropagation();
      if (open) closePanel(); else openPanel();
    });

    panel?.querySelectorAll(".texture-option").forEach((opt) => {
      opt.addEventListener("mouseenter", () => {
        preview.innerHTML = opt.dataset.ddOpt ? swatchHtml(opt.dataset.ddOpt) : emptySwatchHtml;
      });
      opt.addEventListener("click", () => {
        const newId = opt.dataset.ddOpt;
        closePanel();
        if (newId !== value) {
          apply(newId);
          onChange(newId);
        }
      });
    });

    return function onContainerClick(e) {
      if (open && !e.target.closest(".texture-dropdown-wrap")) {
        closePanel();
        apply(value);
      }
    };
  }

  return { html, mount };
}

export function renderEditorTools() {
  clearRegionHighlight();
  const item = currentCase();
  els.suspectClueFields.style.display = state.editorMode === "solution" ? "" : "none";
  els.editRegionsField.style.display = state.editorMode === "region" ? "" : "none";
  if (state.editorMode === "region") {
    els.editorRegionBar.innerHTML = `
      <div class="region-palette">
        ${item.regionNames.map((name, index) => `
          <button class="region-button ${state.selectedRegion === index ? "active" : ""}" data-region="${index}" type="button">
            <span class="region-texture-swatch" style="${textureBg(regionTexture(item, index))}"></span>
            <span class="region-button-label">${escapeHtml(name)}</span>
            <span class="zone-texture">${escapeHtml(textureName(regionTexture(item, index)))}</span>
          </button>
        `).join("")}
      </div>
    `;
    els.editorRegionBar.querySelectorAll("[data-region]").forEach((button) => {
      button.addEventListener("click", () => {
        state.selectedRegion = Number(button.dataset.region);
        renderEditorTools();
      });
      button.addEventListener("mouseenter", () => {
        highlightRegion(item, Number(button.dataset.region));
      });
      button.addEventListener("mouseleave", clearRegionHighlight);
    });
    const textureSelector = createDropdown({
      id: "texture",
      options: TEXTURES,
      getId: (t) => t.id,
      getLabel: (t) => t.name,
      swatchHtml: (id) => id === "plain"
        ? `<span style="display:block;width:100%;height:100%;background:var(--panel);border-radius:3px;"></span>`
        : `<span style="display:block;width:100%;height:100%;background-image:url(${textureUrlFor(id)});background-size:cover;border-radius:3px;"></span>`,
      value: regionTexture(item, state.selectedRegion),
      sortByName: true,
      onChange: (id) => {
        item.regionTextures[state.selectedRegion] = id;
        saveCases();
        renderBoard();
        renderZoneLegend();
        editorSuccess("Textura de zona actualizada.");
      },
    });

    els.editorTools.innerHTML = `
      <label class="field texture-select-field">
        <span>Textura para ${state.selectedRegion == null ? "—" : escapeHtml(regionName(item, state.selectedRegion))}</span>
        ${textureSelector.html}
      </label>
      <p class="label">Para eliminar una zona, borra su linea en el campo Zonas. Sus celdas vuelven a la primera zona.</p>
    `;
    const onEditorClick = textureSelector.mount();
    els.editorTools.addEventListener("click", onEditorClick);
  } else if (state.editorMode === "object") {
    els.editorRegionBar.innerHTML = "";
    const objectSelector = createDropdown({
      id: "object",
      options: OBJECTS,
      getId: (o) => o.id,
      getLabel: (o) => o.name,
      swatchHtml: (id) => {
        const obj = findObject(id);
        const e = obj?.png ? "png" : "svg";
        return `<img src="assets/objects/${escapeAttr(id)}.${e}" alt="" style="max-width:100%;max-height:100%;display:block;">`;
      },
      emptyLabel: "sin objeto",
      emptySwatchHtml: `<span style="display:block;width:20px;height:16px;border:1px dashed var(--line);border-radius:3px;"></span>`,
      value: state.selectedObject,
      sortByName: true,
      onChange: (id) => {
        state.selectedObject = id;
        if (id) {
          const obj = findObject(id);
          if (obj) {
            if (obj.w) state.selectedObjectW = obj.w;
            if (obj.h) state.selectedObjectH = obj.h;
          }
        }
        renderEditorTools();
      },
    });

    els.editorTools.innerHTML = `
      <div class="object-controls">
        <div class="field">
          <span>Rotacion</span>
          <div class="rotation-controls">
            <button id="rotateLeftBtn" type="button" title="-90°">-90</button>
            <span class="rotation-angle" id="rotationAngle">${state.selectedObjectRotation}°</span>
            <button id="rotateRightBtn" type="button" title="+90°">+90</button>
            <button id="flipBtn" type="button" title="180°">180</button>
          </div>
        </div>
        <label class="field">
          <span>Tamaño (ancho x alto)</span>
          <div class="size-controls">
            <select id="sizeWSelect">
              ${[1,2,3,4].map((v) => `<option value="${v}"${state.selectedObjectW === v ? " selected" : ""}>${v}</option>`).join("")}
            </select>
            <span>x</span>
            <select id="sizeHSelect">
              ${[1,2,3,4].map((v) => `<option value="${v}"${state.selectedObjectH === v ? " selected" : ""}>${v}</option>`).join("")}
            </select>
          </div>
        </label>
        <label class="field-check">
          <input type="checkbox" id="objectBlockedToggle" ${objectCanBeOccupied(item, state.selectedObject) ? "" : "checked"}>
          <span>Bloqueado (no se puede ocupar)</span>
        </label>
      </div>
      <div class="field">
        <span>Objeto</span>
        ${objectSelector.html}
      </div>
    `;
    const onEditorClick = objectSelector.mount();
    els.editorTools.addEventListener("click", onEditorClick);

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
      editorSuccess("Estado de objeto actualizado.");
    });
    const sizeW = document.getElementById("sizeWSelect");
    const sizeH = document.getElementById("sizeHSelect");
    if (sizeW) sizeW.addEventListener("change", () => { state.selectedObjectW = Number(sizeW.value); });
    if (sizeH) sizeH.addEventListener("change", () => { state.selectedObjectH = Number(sizeH.value); });
  } else if (state.editorMode === "victim") {
    els.editorRegionBar.innerHTML = "";
    els.editorTools.innerHTML = `
      <div class="solution-help">
        <strong>Victima</strong>
        <p>Define quien es la victima y toca el tablero para ubicar donde fue encontrada. Esta posicion solo se ve en el editor.</p>
      </div>
      <label class="field">
        <span>Nombre de la victima</span>
        <input id="victimToolName" type="text" value="${escapeAttr(item.victim.name)}">
      </label>
      <label class="field">
        <span>Pista de la victima</span>
        <input id="victimClueInput" type="text" value="${escapeAttr(item.victim.clue || "")}">
      </label>
      <div class="gender-toggle">
        <span>Genero</span>
        <div class="gender-buttons">
          <button id="victimGenderFemale" class="gender-btn${item.victim.gender !== "male" ? " active" : ""}" type="button">${FEMALE_SVG}</button>
          <button id="victimGenderMale" class="gender-btn${item.victim.gender === "male" ? " active" : ""}" type="button">${MALE_SVG}</button>
        </div>
      </div>
      <div class="solution-row">
        <span class="cell-victim mini-victim">${escapeHtml((item.victim.name || "V").slice(0, 1))}</span>
        <span>${escapeHtml(item.victim.name || "Victima")}</span>
        <strong>fila ${item.victim.row + 1}, columna ${item.victim.col + 1}</strong>
      </div>
    `;
    const victimToolName = document.getElementById("victimToolName");
    victimToolName?.addEventListener("input", () => {
      item.victim.name = victimToolName.value.trim() || "Victima";
      saveCases();
      renderBoard();
      editorSuccess("Victima actualizada.");
    });
    const victimClueInput = document.getElementById("victimClueInput");
    victimClueInput?.addEventListener("input", () => {
      item.victim.clue = victimClueInput.value.trim();
      saveCases();
      renderBoard();
      editorSuccess("Pista de victima actualizada.");
    });
    const victimGenderFemale = document.getElementById("victimGenderFemale");
    const victimGenderMale = document.getElementById("victimGenderMale");
    function setVictimGender(gender) {
      item.victim.gender = gender;
      saveCases();
      renderBoard();
      renderSuspectCards();
      renderEditorTools();
      editorSuccess("Genero de victima actualizado.");
    }
    victimGenderFemale?.addEventListener("click", () => setVictimGender("female"));
    victimGenderMale?.addEventListener("click", () => setVictimGender("male"));
  } else {
    els.editorRegionBar.innerHTML = "";
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
      <label class="field">
        <span>Pistas generales (una por linea)</span>
        <textarea id="editGeneralClues" rows="4">${escapeHtml(item.generalClues || "")}</textarea>
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
      editorSuccess("Asesino actualizado.");
    });
    const editGeneralClues = document.getElementById("editGeneralClues");
    editGeneralClues?.addEventListener("input", () => {
      item.generalClues = editGeneralClues.value;
      saveCases();
    });
  }
}

export function setStatus(element, message, tone) {
  element.textContent = message;
  const staysTop = element.classList.contains("status-top");
  element.className = `status-box ${staysTop ? "status-top " : ""}${tone || ""}`;
}
