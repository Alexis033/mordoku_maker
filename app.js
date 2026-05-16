import { state, els, currentCase } from "./src/state.js";
import { renderAll, renderBoard, renderPlayPanel, renderBoardSize, setStatus } from "./src/render.js";
import { renderEditorTools, renderEditorModeButtons } from "./src/render.js";
import { handleCellClick, verifyBoard, resetProgress, clearBoardPieces, elapsedSeconds } from "./src/game.js";
import { updateCaseTextFields, updateCaseSuspects, updateCaseClues, updateCaseRegions, updateCaseDimensions } from "./src/editor.js";
import { saveEditorCase, createNewCase, generateNewCase, duplicateCase, deleteCase, exportCurrentCase, importCase } from "./src/editor.js";
import { editCell, loadCurrentCase, switchMode } from "./src/editor.js";
import { persistProgress } from "./src/persist.js";
import { normalizeCase } from "./src/normalize.js";
import { readJson } from "./src/utils.js";
import { sampleCase } from "./src/catalogs.js";
import { STORAGE_KEY } from "./src/state.js";

function bindElements() {
  [
    "caseTitle", "caseSelect", "duplicateCaseBtn", "deleteCaseBtn",
    "playTab", "editorTab", "playPanel", "editorPanel", "difficultyLabel",
    "timerLabel", "sizeLabel", "verifyBtn", "revealBtn",
    "resetBtn", "zoomRange", "zoneLegend", "objectLegend", "suspectCards", "statusBox",
    "editTitle", "editDifficulty", "editRows", "editCols",
    "generateCaseBtn", "newCaseBtn", "saveCaseBtn", "exportCaseBtn", "importCaseInput",
    "editSuspects", "editClues", "editRegions", "editorTools", "editorRegionBar", "editorStatus",
    "suspectClueFields", "editRegionsField",
    "board", "selectedLabel", "clearCellBtn"
  ].forEach((id) => els[id] = document.getElementById(id));
  els.editorModeButtons = Array.from(document.querySelectorAll(".editor-mode"));
}

function bindEvents() {
  els.caseSelect.addEventListener("change", () => {
    persistProgress(elapsedSeconds());
    loadCurrentCase(els.caseSelect.value);
    renderAll();
  });
  els.playTab.addEventListener("click", () => switchMode("play"));
  els.editorTab.addEventListener("click", () => switchMode("editor"));
  els.verifyBtn.addEventListener("click", verifyBoard);
  els.revealBtn.addEventListener("click", () => {
    state.reveal = !state.reveal;
    state.lastCheck = null;
    renderBoard();
    renderPlayPanel();
  });
  els.resetBtn.addEventListener("click", resetProgress);
  els.zoomRange.addEventListener("input", () => renderBoardSize());
  els.board.addEventListener("click", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell) return;
    const row = Number(cell.dataset.row);
    const col = Number(cell.dataset.col);
    if (state.mode === "editor") {
      editCell(row, col);
    } else {
      handleCellClick(row, col);
    }
  });
  let hoverKey = null;
  function highlightZone(row, col) {
    clearZoneHighlight();
    const item = currentCase();
    if (!item) return;
    const zone = item.regions?.[row]?.[col];
    if (zone === undefined) return;
    hoverKey = `${row},${col}`;
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
  function clearZoneHighlight() {
    hoverKey = null;
    for (const cell of els.board.querySelectorAll(".cell.zone-focus")) {
      cell.classList.remove("zone-focus");
      cell.style.removeProperty("--focus-top");
      cell.style.removeProperty("--focus-right");
      cell.style.removeProperty("--focus-bottom");
      cell.style.removeProperty("--focus-left");
    }
  }
  els.board.addEventListener("mouseover", (e) => {
    const cell = e.target.closest(".cell");
    if (!cell) return;
    const key = `${cell.dataset.row},${cell.dataset.col}`;
    if (key === hoverKey) return;
    highlightZone(Number(cell.dataset.row), Number(cell.dataset.col));
  });
  els.board.addEventListener("mouseleave", clearZoneHighlight);

  els.clearCellBtn.addEventListener("click", clearBoardPieces);
  els.duplicateCaseBtn.addEventListener("click", duplicateCase);
  els.deleteCaseBtn.addEventListener("click", deleteCase);
  els.generateCaseBtn.addEventListener("click", generateNewCase);
  els.newCaseBtn.addEventListener("click", createNewCase);
  els.saveCaseBtn.addEventListener("click", saveEditorCase);
  els.exportCaseBtn.addEventListener("click", exportCurrentCase);
  els.importCaseInput.addEventListener("change", importCase);
  els.editTitle.addEventListener("input", updateCaseTextFields);
  els.editDifficulty.addEventListener("input", updateCaseTextFields);
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
  if (!state.cases.some((item) => item.id === state.caseId)) {
    state.caseId = state.cases[0].id;
  }
}

document.addEventListener("DOMContentLoaded", () => {
  bindElements();
  bindEvents();
  loadCases();
  loadCurrentCase(state.caseId);
  renderAll();
});
