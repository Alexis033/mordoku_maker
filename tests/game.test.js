import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/render.js", () => ({
  renderBoard: vi.fn(),
  renderPlayPanel: vi.fn(),
  renderSelectedLabel: vi.fn(),
  renderSuspectCards: vi.fn(),
  renderAll: vi.fn(),
  renderHeader: vi.fn(),
  renderCaseSelect: vi.fn(),
  cellCanBeOccupied: vi.fn(() => true),
  setStatus: vi.fn(),
}));

vi.mock("../src/persist.js", () => ({
  persistProgress: vi.fn(),
  saveCases: vi.fn(),
}));

import { state, els } from "../src/state.js";
import { handleCellClick, lockCellPlacement, resetProgress, clearBoardPieces } from "../src/game.js";

function makeCase(overrides = {}) {
  return {
    id: "test-case",
    title: "Test",
    rows: 6,
    cols: 6,
    size: 6,
    victim: { name: "V", row: 2, col: 2 },
    suspects: [
      { id: "ana", name: "Ana", color: "#a00" },
      { id: "bruno", name: "Bruno", color: "#0a0" },
    ],
    regions: Array.from({ length: 6 }, () => Array(6).fill(0)),
    regionNames: ["Zona 1"],
    regionTextures: ["plain"],
    objects: {},
    objectRules: {},
    clues: [],
    generalClues: "",
    solution: { ana: { row: 0, col: 0 }, bruno: { row: 1, col: 1 } },
    murderer: "ana",
    ...overrides,
  };
}

beforeEach(() => {
  state.cases = [makeCase()];
  state.caseId = "test-case";
  state.mode = "play";
  state.board = {};
  state.draft = {};
  state.victimGuess = "";
  state.selectedSuspect = null;
  state.lastCheck = null;
  els.timerLabel = { textContent: "" };
});

describe("handleCellClick", () => {
  it("removes placement when clicking occupied cell with no selection", () => {
    state.board["1,1"] = "ana";
    state.selectedSuspect = null;
    handleCellClick(1, 1);
    expect(state.board["1,1"]).toBeUndefined();
  });

  it("does nothing when clicking empty cell with no selection", () => {
    state.selectedSuspect = null;
    handleCellClick(1, 1);
    expect(state.board).toEqual({});
  });

  it("places suspect on free cell as draft", () => {
    state.selectedSuspect = "ana";
    handleCellClick(1, 1);
    expect(state.draft["1,1"]).toBe("ana");
    expect(state.board["1,1"]).toBeUndefined();
  });

  it("places same suspect in multiple draft cells", () => {
    state.selectedSuspect = "ana";
    state.draft["0,0"] = "ana";
    handleCellClick(1, 1);
    expect(state.draft["0,0"]).toBe("ana");
    expect(state.draft["1,1"]).toBe("ana");
  });

  it("removes draft suspect when clicking same cell again", () => {
    state.selectedSuspect = "ana";
    state.draft["1,1"] = "ana";
    handleCellClick(1, 1);
    expect(state.draft["1,1"]).toBeUndefined();
  });

  it("places victim", () => {
    state.selectedSuspect = "__victim__";
    handleCellClick(3, 4);
    expect(state.victimGuess).toBe("3,4");
  });

  it("toggles victim off when clicking same cell", () => {
    state.selectedSuspect = "__victim__";
    state.victimGuess = "3,4";
    handleCellClick(3, 4);
    expect(state.victimGuess).toBe("");
  });

  it("removes victim when clicking victim cell with no selection", () => {
    state.victimGuess = "2,2";
    state.selectedSuspect = null;
    handleCellClick(2, 2);
    expect(state.victimGuess).toBe("");
  });
  it("can lock draft placement", () => {
    lockCellPlacement(1, 1, "ana");
    expect(state.board["1,1"]).toBe("ana");
    expect(state.draft["1,1"]).toBeUndefined();
    expect(state.selectedSuspect).toBeNull();
  });

  it("lock clears same row and column suspects from board", () => {
    state.board["1,0"] = "bruno";
    state.board["0,1"] = "bruno";
    lockCellPlacement(1, 1, "ana");
    expect(state.board["1,1"]).toBe("ana");
    expect(state.board["1,0"]).toBeUndefined();
    expect(state.board["0,1"]).toBeUndefined();
  });

  it("lock removes victim from same row", () => {
    state.victimGuess = "1,0";
    lockCellPlacement(1, 1, "ana");
    expect(state.victimGuess).toBe("");
    expect(state.board["1,1"]).toBe("ana");
  });

  it("lock removes other drafts of same suspect", () => {
    state.draft["0,0"] = "ana";
    state.draft["2,2"] = "ana";
    lockCellPlacement(1, 1, "ana");
    expect(state.board["1,1"]).toBe("ana");
    expect(state.draft["0,0"]).toBeUndefined();
    expect(state.draft["2,2"]).toBeUndefined();
  });

  it("lock removes drafts on same row or column", () => {
    state.draft["1,0"] = "bruno";
    state.draft["0,1"] = "bruno";
    lockCellPlacement(1, 1, "ana");
    expect(state.board["1,1"]).toBe("ana");
    expect(state.draft["1,0"]).toBeUndefined();
    expect(state.draft["0,1"]).toBeUndefined();
  });

  it("does nothing when locking with no suspectId", () => {
    lockCellPlacement(2, 2);
    expect(state.board).toEqual({});
    expect(state.draft).toEqual({});
  });

  it("locks selected suspect, not draft at cell", () => {
    state.draft["1,1"] = "bruno";
    lockCellPlacement(1, 1, "ana");
    expect(state.board["1,1"]).toBe("ana");
    expect(state.draft["1,1"]).toBeUndefined();
  });
});

describe("resetProgress", () => {
  it("clears all play state", () => {
    state.board = { "0,0": "ana" };
    state.draft = { "1,1": "bruno" };
    state.victimGuess = "2,2";
    state.elapsedBeforePause = 500;
    state.lastCheck = { cells: {} };
    state.reveal = true;

    resetProgress();

    expect(state.board).toEqual({});
    expect(state.draft).toEqual({});
    expect(state.victimGuess).toBe("");
    expect(state.elapsedBeforePause).toBe(0);
    expect(state.lastCheck).toBeNull();
    expect(state.reveal).toBe(false);
  });
});

describe("clearBoardPieces", () => {
  it("clears board, draft, and victim but keeps timer", () => {
    state.board = { "0,0": "ana" };
    state.draft = { "1,1": "bruno" };
    state.victimGuess = "2,2";
    state.lastCheck = { cells: {} };

    clearBoardPieces();

    expect(state.board).toEqual({});
    expect(state.draft).toEqual({});
    expect(state.victimGuess).toBe("");
    expect(state.lastCheck).toBeNull();
  });
});
