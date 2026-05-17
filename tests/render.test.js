import { describe, it, expect, beforeEach } from "vitest";
import { state } from "../src/state.js";
import { cellHtml } from "../src/render.js";

function makeCase() {
  return {
    id: "test-case",
    title: "Test",
    rows: 6,
    cols: 6,
    size: 6,
    victim: { name: "Victima", row: 5, col: 5 },
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
    solution: { ana: { row: 1, col: 1 } },
    murderer: "ana",
  };
}

beforeEach(() => {
  state.cases = [makeCase()];
  state.caseId = "test-case";
  state.mode = "editor";
  state.editorMode = "solution";
  state.reveal = false;
  state.board = {};
  state.victimGuess = "";
  state.selectedSuspect = null;
  state.selectedObject = null;
});

describe("cellHtml — editor solution mode", () => {
  it("shows suspect avatar and name on assigned cell", () => {
    const html = cellHtml(state.cases[0], 1, 1);
    expect(html).toContain("cell-person");
    expect(html).toContain("Ana");
    expect(html).toContain("--avatar:#a00");
  });

  it("shows nothing for unassigned cell", () => {
    const html = cellHtml(state.cases[0], 0, 0);
    expect(html).not.toContain("cell-person");
  });

  it("shows victim marker in any editor mode", () => {
    const html = cellHtml(state.cases[0], 5, 5);
    expect(html).toContain("cell-victim");
  });
});

describe("cellHtml — other editor modes", () => {
  it("does not show suspect avatars in object mode", () => {
    state.editorMode = "object";
    const html = cellHtml(state.cases[0], 1, 1);
    expect(html).not.toContain("cell-person");
  });
});

describe("cellHtml — game mode", () => {
  it("shows placed suspect on the board", () => {
    state.mode = "play";
    state.board["2,2"] = "bruno";
    const html = cellHtml(state.cases[0], 2, 2);
    expect(html).toContain("cell-person");
    expect(html).toContain("Bruno");
  });
});

describe("cellHtml — object rendering", () => {
  it("renders occupiable-object class for default object", () => {
    state.cases[0].objects["3,3"] = { id: "table", color: null, rotation: 0 };
    const html = cellHtml(state.cases[0], 3, 3);
    expect(html).toContain("occupiable-object");
    expect(html).not.toContain("blocked-object");
  });

  it("renders blocked-object class when object is non-occupiable", () => {
    state.cases[0].objects["3,3"] = { id: "table", color: null, rotation: 0 };
    state.cases[0].objectRules["table"] = { name: "table", occupiable: false };
    const html = cellHtml(state.cases[0], 3, 3);
    expect(html).toContain("blocked-object");
    expect(html).not.toContain("occupiable-object");
  });

  it("renders no object span when cell has no object", () => {
    const html = cellHtml(state.cases[0], 3, 3);
    expect(html).not.toContain("cell-object");
  });
});
