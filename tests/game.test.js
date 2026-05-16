import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/render.js", () => ({
  renderBoard: vi.fn(),
  renderPlayPanel: vi.fn(),
  renderSelectedLabel: vi.fn(),
  renderPalette: vi.fn(),
  renderClues: vi.fn(),
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
import { handleCellClick, resetProgress, clearBoardPieces } from "../src/game.js";

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

  it("places suspect on free cell", () => {
    state.selectedSuspect = "ana";
    handleCellClick(1, 1);
    expect(state.board["1,1"]).toBe("ana");
  });

  it("moves suspect when clicking a different cell", () => {
    state.selectedSuspect = "ana";
    state.board["0,0"] = "ana";
    handleCellClick(1, 1);
    expect(state.board["0,0"]).toBeUndefined();
    expect(state.board["1,1"]).toBe("ana");
  });

  it("removes suspect when clicking same cell again", () => {
    state.selectedSuspect = "ana";
    state.board["1,1"] = "ana";
    handleCellClick(1, 1);
    expect(state.board["1,1"]).toBeUndefined();
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
});

describe("resetProgress", () => {
  it("clears all play state", () => {
    state.board = { "0,0": "ana" };
    state.victimGuess = "2,2";
    state.elapsedBeforePause = 500;
    state.lastCheck = { cells: {} };
    state.reveal = true;

    resetProgress();

    expect(state.board).toEqual({});
    expect(state.victimGuess).toBe("");
    expect(state.elapsedBeforePause).toBe(0);
    expect(state.lastCheck).toBeNull();
    expect(state.reveal).toBe(false);
  });
});

describe("clearBoardPieces", () => {
  it("clears board and victim but keeps timer", () => {
    state.board = { "0,0": "ana" };
    state.victimGuess = "2,2";
    state.lastCheck = { cells: {} };

    clearBoardPieces();

    expect(state.board).toEqual({});
    expect(state.victimGuess).toBe("");
    expect(state.lastCheck).toBeNull();
  });
});
