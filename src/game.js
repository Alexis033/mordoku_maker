import { state, els, currentCase } from "./state.js";
import { renderBoard, renderPlayPanel, renderSelectedLabel, renderAll, renderHeader, renderCaseSelect, setStatus } from "./render.js";
import { cellCanBeOccupied } from "./render.js";
import { persistProgress, saveCases } from "./persist.js";
import { cellKey, formatSeconds, parseCellKey } from "./utils.js";
import { cellBlockedByPlacedLine, findLineConflicts } from "./rules.js";

export function elapsedSeconds() {
  const running = state.startedAt ? Math.floor((Date.now() - state.startedAt) / 1000) : 0;
  return (state.elapsedBeforePause || 0) + running;
}

export function startTimer() {
  if (state.startedAt) return;
  state.startedAt = Date.now();
  state.timer = window.setInterval(() => {
    updateTimerLabel();
  }, 1000);
}

export function stopTimer() {
  if (state.timer) window.clearInterval(state.timer);
  state.timer = null;
  state.elapsedBeforePause = elapsedSeconds();
  state.startedAt = null;
  updateTimerLabel();
}

export function updateTimerLabel() {
  els.timerLabel.textContent = formatSeconds(elapsedSeconds());
}

function removeExistingPlacement(suspectId) {
  for (const [key, placedSuspect] of Object.entries(state.board)) {
    if (placedSuspect === suspectId) {
      delete state.board[key];
    }
  }
}

function findBlockedPlacements(item) {
  const blocked = new Set();
  for (const key of Object.keys(state.board)) {
    const { row, col } = parseCellKey(key);
    if (!cellCanBeOccupied(item, row, col)) blocked.add(key);
  }
  return blocked;
}

export function handleCellClick(row, col) {
  const item = currentCase();
  const key = cellKey(row, col);
  if (!state.selectedSuspect) {
    if (state.draft[key]) {
      delete state.draft[key];
    } else if (state.board[key]) {
      delete state.board[key];
    } else if (state.victimGuess === key) {
      state.victimGuess = "";
    } else {
      return;
    }
    state.lastCheck = null;
    persistProgress(elapsedSeconds());
    renderBoard();
    renderPlayPanel();
    return;
  }
  if (!cellCanBeOccupied(item, row, col)) {
    setStatus(els.statusBox, "Esa celda tiene un objeto bloqueado y no puede ocuparse.", "warning");
    return;
  }
  startTimer();
  if (state.selectedSuspect === "__victim__") {
    if (cellBlockedByPlacedLine({
      board: state.board, cellKey,
      row, col, movingPiece: "__victim__",
      victimGuess: state.victimGuess
    })) {
      setStatus(els.statusBox, "No puedes ubicar la victima en una fila o columna ya ocupada.", "warning");
      return;
    }
    if (state.board[key] || state.draft[key]) {
      setStatus(els.statusBox, "Primero vacia la celda: la victima no puede compartir posicion con un sospechoso.", "warning");
      return;
    }
    state.victimGuess = state.victimGuess === key ? "" : key;
    if (state.victimGuess) {
      for (const [k, sid] of Object.entries(state.draft)) {
        const { row: r, col: c } = parseCellKey(k);
        if (r === row || c === col) delete state.draft[k];
      }
    }
    state.lastCheck = null;
    persistProgress(elapsedSeconds());
    renderBoard();
    renderPlayPanel();
    return;
  }
  if (state.victimGuess === key) {
    setStatus(els.statusBox, "Esa celda ya tiene la victima. Vaciala antes de colocar un sospechoso.", "warning");
    return;
  }
  if (state.board[key] && state.board[key] !== state.selectedSuspect) {
    setStatus(els.statusBox, "Esa celda tiene un sospechoso fijado. Quitalo antes de colocar otro.", "warning");
    return;
  }
  if (cellBlockedByPlacedLine({
    board: state.board, cellKey,
    row, col, movingPiece: state.selectedSuspect,
    victimGuess: state.victimGuess
  })) {
    setStatus(els.statusBox, "No puedes colocar un sospechoso en una fila o columna ya ocupada.", "warning");
    return;
  }
  if (state.draft[key] === state.selectedSuspect) {
    delete state.draft[key];
  } else {
    removeExistingPlacement(state.selectedSuspect);
    state.draft[key] = state.selectedSuspect;
  }
  state.lastCheck = null;
  persistProgress(elapsedSeconds());
  renderBoard();
  renderPlayPanel();
}

export function lockCellPlacement(row, col, suspectId) {
  const key = cellKey(row, col);
  if (!suspectId) return;
  const item = currentCase();
  if (!cellCanBeOccupied(item, row, col)) {
    setStatus(els.statusBox, "Esa celda tiene un objeto bloqueado y no puede ocuparse.", "warning");
    return;
  }

  // Remove all drafts of this suspect
  for (const [k, sid] of Object.entries(state.draft)) {
    if (sid === suspectId) delete state.draft[k];
  }

  // Remove this suspect from board if placed elsewhere
  removeExistingPlacement(suspectId);

  // Remove any suspect on the same row or column
  for (const [k, sid] of Object.entries(state.board)) {
    const { row: r, col: c } = parseCellKey(k);
    if (r === row || c === col) {
      delete state.board[k];
    }
  }

  // Remove any drafts on the same row or column
  for (const [k, sid] of Object.entries(state.draft)) {
    const { row: r, col: c } = parseCellKey(k);
    if (r === row || c === col) {
      delete state.draft[k];
    }
  }

  // Remove victim if on the same row or column
  if (state.victimGuess) {
    const { row: vr, col: vc } = parseCellKey(state.victimGuess);
    if (vr === row || vc === col) {
      state.victimGuess = "";
    }
  }

  state.board[key] = suspectId;
  state.selectedSuspect = null;
  state.lastCheck = null;
  persistProgress(elapsedSeconds());
  renderBoard();
  renderPlayPanel();
  setStatus(els.statusBox, "Sospechoso fijado.", "success");
}

export function verifyBoard() {
  const item = currentCase();
  const conflicts = findLineConflicts(state.board);
  const blocked = findBlockedPlacements(item);
  const cells = {};
  let placed = 0;
  let correct = 0;

  for (const [key, suspectId] of Object.entries(state.board)) {
    placed += 1;
    const { row, col } = parseCellKey(key);
    const expected = item.solution[suspectId];
    const isCorrect = expected && expected.row === row && expected.col === col && !blocked.has(key);
    cells[key] = isCorrect ? "correct" : "wrong";
    if (isCorrect) correct += 1;
  }
  if (state.victimGuess) {
    const expectedVictimKey = cellKey(item.victim.row, item.victim.col);
    cells[state.victimGuess] = state.victimGuess === expectedVictimKey ? "correct" : "wrong";
  }

  state.lastCheck = { cells };
  renderBoard();

  const draftCount = Object.keys(state.draft).length;
  if (blocked.size) {
    setStatus(els.statusBox, "Hay sospechosos en objetos bloqueados.", "error");
  } else if (conflicts.size) {
    setStatus(els.statusBox, "Hay conflictos: algun sospechoso comparte fila o columna.", "error");
  } else if (!state.victimGuess) {
    setStatus(els.statusBox, `Falta ubicar la victima. Sospechosos fijados: ${correct} de ${item.suspects.length}${draftCount ? ` (${draftCount} en borrador)` : ""}.`, "warning");
  } else if (correct === item.suspects.length && placed === item.suspects.length && !draftCount) {
    stopTimer();
    const murderer = item.suspects.find((suspect) => suspect.id === item.murderer);
    state.reveal = true;
    setStatus(els.statusBox, `Caso resuelto correctamente. El asesino es ${murderer?.name || "desconocido"}. Tiempo final: ${formatSeconds(elapsedSeconds())}.`, "success");
    renderBoard();
  } else {
    const remaining = draftCount ? ` (${draftCount} en borrador sin fijar)` : "";
    setStatus(els.statusBox, `${correct} de ${item.suspects.length} sospechosos correctos${remaining}. Victima: ${state.victimGuess ? "correcta" : "incorrecta"}.`, "warning");
  }
}

export function resetProgress() {
  state.board = {};
  state.draft = {};
  state.victimGuess = "";
  state.startedAt = null;
  state.elapsedBeforePause = 0;
  state.lastCheck = null;
  state.reveal = false;
  stopTimer();
  persistProgress(elapsedSeconds());
  renderAll();
}

export function clearBoardPieces() {
  state.board = {};
  state.draft = {};
  state.victimGuess = "";
  state.lastCheck = null;
  persistProgress(elapsedSeconds());
  renderBoard();
  renderPlayPanel();
  setStatus(els.statusBox, "Tablero vaciado. Se quitaron sospechosos y victima.", "success");
}
