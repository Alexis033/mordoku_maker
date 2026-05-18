import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/render.js", () => ({
  renderBoard: vi.fn(),
  renderEditorTools: vi.fn(),
  renderAll: vi.fn(),
  renderHeader: vi.fn(),
  renderCaseSelect: vi.fn(),
  renderPlayPanel: vi.fn(),
  renderZoneLegend: vi.fn(),
  renderSelectedLabel: vi.fn(),
  cellCanBeOccupied: vi.fn(() => true),
  parseRegionNames: vi.fn((val) => val.split("\n").filter(Boolean)),
  setStatus: vi.fn(),
  editorSuccess: vi.fn(),
}));

vi.mock("../src/persist.js", () => ({
  saveCases: vi.fn(),
}));

vi.mock("../src/game.js", () => ({
  stopTimer: vi.fn(),
}));

import { state, currentCase } from "../src/state.js";
import { editCell } from "../src/editor.js";
import { saveCases } from "../src/persist.js";
import { renderBoard } from "../src/render.js";

function makeCase(overrides = {}) {
  return {
    id: "test-case",
    title: "Test",
    rows: 6,
    cols: 6,
    size: 6,
    victim: { name: "V", row: 0, col: 0 },
    suspects: [{ id: "ana", name: "Ana", color: "#fff" }],
    regions: Array.from({ length: 6 }, () => Array(6).fill(0)),
    regionNames: ["Zona 1"],
    regionTextures: ["plain"],
    objects: {},
    objectRules: {},
    clues: [],
    solution: {},
    murderer: "ana",
    ...overrides,
  };
}

beforeEach(() => {
  state.cases = [makeCase()];
  state.caseId = "test-case";
  state.mode = "editor";
  state.editorMode = "object";
  state.selectedObject = null;
  state.selectedObjectW = 1;
  state.selectedObjectH = 1;
  state.selectedObjectRotation = 0;
  vi.clearAllMocks();
});

describe("editCell — object mode", () => {
  describe("placement", () => {
    it("places a 1x1 object anchor at target cell", () => {
      state.selectedObject = "chair";
      editCell(2, 3);
      const obj = currentCase().objects["2,3"];
      expect(obj).toBeDefined();
      expect(obj.id).toBe("chair");
      expect(obj.w).toBe(1);
      expect(obj.h).toBe(1);
    });

    it("places a 2x1 object with ref cell to the right", () => {
      state.selectedObject = "chair";
      state.selectedObjectW = 2;
      state.selectedObjectH = 1;
      editCell(2, 3);
      const obj = currentCase().objects;
      expect(obj["2,3"]).toBeDefined();
      expect(obj["2,3"].id).toBe("chair");
      expect(obj["2,3"].w).toBe(2);
      expect(obj["2,3"].h).toBe(1);
      expect(obj["2,4"]).toEqual({ ref: "2,3" });
    });

    it("places a 1x2 object with ref cell below", () => {
      state.selectedObject = "chair";
      state.selectedObjectW = 1;
      state.selectedObjectH = 2;
      editCell(2, 3);
      const obj = currentCase().objects;
      expect(obj["2,3"].id).toBe("chair");
      expect(obj["2,3"].h).toBe(2);
      expect(obj["3,3"]).toEqual({ ref: "2,3" });
    });

    it("rotates correctly (w=2,h=1,rot=90 → 1 column)", () => {
      state.selectedObject = "chair";
      state.selectedObjectW = 2;
      state.selectedObjectH = 1;
      state.selectedObjectRotation = 90;
      editCell(2, 3);
      const obj = currentCase().objects;
      expect(obj["2,3"].rotation).toBe(90);
      expect(obj["2,3"].w).toBe(2);
      expect(obj["2,3"].h).toBe(1);
      expect(obj["2,3"].id).toBe("chair");
      expect(obj["3,3"]).toEqual({ ref: "2,3" });
    });

    it("rejects object that overflows the board", () => {
      state.selectedObject = "chair";
      state.selectedObjectW = 2;
      editCell(5, 5);
      expect(currentCase().objects).toEqual({});
    });
  });

  describe("removal", () => {
    it("removes single-cell object when clicking anchor with no selection", () => {
      const item = currentCase();
      item.objects["2,3"] = { id: "chair", color: null, rotation: 0, w: 1, h: 1 };
      editCell(2, 3);
      expect(item.objects["2,3"]).toBeUndefined();
    });

    it("removes multi-cell object + its refs when clicking anchor", () => {
      const item = currentCase();
      item.objects["2,3"] = { id: "chair", color: null, rotation: 0, w: 2, h: 1 };
      item.objects["2,4"] = { ref: "2,3" };
      editCell(2, 3);
      expect(item.objects["2,3"]).toBeUndefined();
      expect(item.objects["2,4"]).toBeUndefined();
    });

    it("removes multi-cell object + its refs when clicking ref", () => {
      const item = currentCase();
      item.objects["2,3"] = { id: "chair", color: null, rotation: 0, w: 2, h: 1 };
      item.objects["2,4"] = { ref: "2,3" };
      editCell(2, 4);
      expect(item.objects["2,3"]).toBeUndefined();
      expect(item.objects["2,4"]).toBeUndefined();
    });
  });
});

describe("editCell — victim mode", () => {
  it("sets victim position", () => {
    state.editorMode = "victim";
    editCell(4, 2);
    expect(currentCase().victim.row).toBe(4);
    expect(currentCase().victim.col).toBe(2);
  });
});

describe("editCell — side effects", () => {
  it("persists and re-renders after every edit", () => {
    state.selectedObject = "chair";
    editCell(2, 3);
    expect(saveCases).toHaveBeenCalledOnce();
    expect(renderBoard).toHaveBeenCalledOnce();
  });
});

describe("editCell — solution mode", () => {
  it("places solution for selected suspect", () => {
    state.editorMode = "solution";
    state.selectedSuspect = "ana";
    editCell(1, 1);
    expect(currentCase().solution.ana).toEqual({ row: 1, col: 1 });
  });
});
