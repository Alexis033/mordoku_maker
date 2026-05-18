export function uniqueBoardPlacements(board) {
  const next = {};
  const seen = new Map();
  for (const [key, suspectId] of Object.entries(board)) {
    if (seen.has(suspectId)) delete next[seen.get(suspectId)];
    next[key] = suspectId;
    seen.set(suspectId, key);
  }
  return next;
}

import { parseCellKey } from "./utils.js";

export function occupiedLineUnavailableCells({ board, victimGuess, rows, cols, cellKey }) {
  const placements = Object.keys(board).map((key) => {
    const { row, col } = parseCellKey(key);
    return { key, row, col };
  });
  if (victimGuess) {
    const { row, col } = parseCellKey(victimGuess);
    placements.push({ key: victimGuess, row, col });
  }
  if (!placements.length) return new Set();

  const occupiedKeys = new Set(placements.map((placement) => placement.key));
  const blocked = new Set();
  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const key = cellKey(row, col);
      if (occupiedKeys.has(key)) continue;
      if (placements.some((placement) => placement.row === row || placement.col === col)) {
        blocked.add(key);
      }
    }
  }
  return blocked;
}

export function findLineConflicts(board) {
  const rows = new Map();
  const cols = new Map();
  const conflicts = new Set();
  for (const [key, suspectId] of Object.entries(board)) {
    const { row, col } = parseCellKey(key);
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

export function cellBlockedByPlacedLine({ board, victimGuess, row, col, movingPiece, cellKey }) {
  const key = cellKey(row, col);
  const placements = Object.entries(board)
    .filter(([, suspectId]) => suspectId !== movingPiece)
    .map(([placementKey]) => {
      const { row, col } = parseCellKey(placementKey);
      return { key: placementKey, row, col };
    });

  if (victimGuess && movingPiece !== "__victim__") {
    const { row, col } = parseCellKey(victimGuess);
    placements.push({ key: victimGuess, row, col });
  }

  return placements.some((placement) => (
    placement.key !== key && (placement.row === row || placement.col === col)
  ));
}
