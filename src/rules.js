(function () {
  "use strict";

  function uniqueBoardPlacements(board) {
    const next = {};
    const seen = new Map();
    for (const [key, suspectId] of Object.entries(board)) {
      if (seen.has(suspectId)) delete next[seen.get(suspectId)];
      next[key] = suspectId;
      seen.set(suspectId, key);
    }
    return next;
  }

  function occupiedLineUnavailableCells({ board, victimGuess, rows, cols, cellKey }) {
    const placements = Object.keys(board).map((key) => {
      const [row, col] = key.split(",").map(Number);
      return { key, row, col };
    });
    if (victimGuess) {
      const [row, col] = victimGuess.split(",").map(Number);
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

  function cellBlockedByPlacedLine({ board, victimGuess, row, col, movingPiece, cellKey }) {
    const key = cellKey(row, col);
    const placements = Object.entries(board)
      .filter(([, suspectId]) => suspectId !== movingPiece)
      .map(([placementKey]) => {
        const [placementRow, placementCol] = placementKey.split(",").map(Number);
        return { key: placementKey, row: placementRow, col: placementCol };
      });

    if (victimGuess && movingPiece !== "__victim__") {
      const [victimRow, victimCol] = victimGuess.split(",").map(Number);
      placements.push({ key: victimGuess, row: victimRow, col: victimCol });
    }

    return placements.some((placement) => (
      placement.key !== key && (placement.row === row || placement.col === col)
    ));
  }

  window.MurdokuRules = {
    cellBlockedByPlacedLine,
    occupiedLineUnavailableCells,
    uniqueBoardPlacements
  };
})();
