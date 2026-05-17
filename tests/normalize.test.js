import { describe, it, expect } from "vitest";
import {
  normalizeSuspects,
  normalizeRegions,
  normalizeRegionNames,
  normalizeRegionTextures,
  normalizeObjectRules,
  remapInvalidRegions,
  normalizeCase,
} from "../src/normalize.js";

describe("normalizeSuspects", () => {
  it("generates default suspects for empty input", () => {
    const result = normalizeSuspects([], 6);
    expect(result).toHaveLength(6);
    expect(result[0].name).toBe("Sospechoso 1");
  });

  it("keeps provided suspects", () => {
    const result = normalizeSuspects(
      [{ name: "Ana" }, { name: "Bruno" }],
      6
    );
    expect(result).toHaveLength(2);
    expect(result[0].name).toBe("Ana");
    expect(result[1].name).toBe("Bruno");
  });

  it("assigns ids from names", () => {
    const result = normalizeSuspects([{ name: "El Niño" }], 6);
    expect(result[0].id).toBe("el-nino");
  });

  it("caps at MAX_SIZE", () => {
    const many = Array.from({ length: 20 }, (_, i) => ({ name: `S${i}` }));
    const result = normalizeSuspects(many, 20);
    expect(result.length).toBeLessThanOrEqual(16);
  });

  it("preserves passed gender", () => {
    const result = normalizeSuspects([{ name: "Alex", gender: "female" }], 6);
    expect(result[0].gender).toBe("female");
  });

  it("guesses gender from name when not provided", () => {
    const result = normalizeSuspects([{ name: "Ana" }, { name: "Bruno" }], 6);
    expect(result[0].gender).toBe("female");
    expect(result[1].gender).toBe("male");
  });
});

describe("normalizeRegions", () => {
  it("generates regions for null input", () => {
    const result = normalizeRegions(null, 4, 4);
    expect(result).toHaveLength(4);
    expect(result[0]).toHaveLength(4);
  });

  it("keeps provided regions", () => {
    const regions = [[0, 1], [1, 0]];
    const result = normalizeRegions(regions, 2, 2);
    expect(result).toEqual(regions);
  });

  it("pads short region rows with 0", () => {
    const regions = [[0]];
    const result = normalizeRegions(regions, 2, 3);
    expect(result[0][2]).toBe(0);
  });
});

describe("normalizeRegionNames", () => {
  it("returns provided names", () => {
    const result = normalizeRegionNames(["Zone A", "Zone B"], [[0, 1]]);
    expect(result).toEqual(["Zone A", "Zone B"]);
  });

  it("generates default names for empty input", () => {
    const result = normalizeRegionNames(null, [[0, 1, 2]]);
    expect(result).toContain("Zona 1");
    expect(result).toContain("Zona 2");
    expect(result).toContain("Zona 3");
  });

  it("caps at COLORS length", () => {
    const many = Array.from({ length: 20 }, (_, i) => `Z${i}`);
    const result = normalizeRegionNames(many, null);
    expect(result.length).toBeLessThanOrEqual(12);
  });
});

describe("normalizeRegionTextures", () => {
  it("uses provided textures", () => {
    const result = normalizeRegionTextures(["grass", "wood"], 2);
    expect(result[0]).toBe("grass");
    expect(result[1]).toBe("wood");
  });

  it("fills missing with defaults", () => {
    const result = normalizeRegionTextures(["grass"], 3);
    expect(result[0]).toBe("grass");
    expect(result[1]).toBeTypeOf("string");
    expect(result[2]).toBeTypeOf("string");
  });
});

describe("normalizeObjectRules", () => {
  it("defaults to empty when no input", () => {
    const result = normalizeObjectRules(null, null, false);
    expect(result).toEqual({});
  });

  it("includes defaults when requested", () => {
    const result = normalizeObjectRules(null, null, true);
    expect(result.arbol).toBeDefined();
    expect(result.arbol.occupiable).toBe(false);
    expect(result.mesa.occupiable).toBe(true);
  });

  it("adds objects from the objects map", () => {
    const result = normalizeObjectRules(null, { "0,0": "my_custom_obj" }, false);
    expect(result["my_custom_obj"]).toBeDefined();
    expect(result["my_custom_obj"].name).toBe("my_custom_obj");
  });

  it("preserves underscore IDs from objects map", () => {
    const result = normalizeObjectRules(null, { "0,0": "beach_ball" }, false);
    expect(result["beach_ball"]).toBeDefined();
    expect(result["beach_ball"].name).toBe("beach_ball");
  });

  it("preserves underscore IDs from saved rules", () => {
    const rules = { beach_ball: { name: "beach_ball", occupiable: false } };
    const result = normalizeObjectRules(rules, null, false);
    expect(result["beach_ball"]).toBeDefined();
    expect(result["beach_ball"].occupiable).toBe(false);
  });

  it("merges saved rules on top of defaults with correct keys", () => {
    const rules = { oil_stain: { name: "oil_stain", occupiable: false } };
    const result = normalizeObjectRules(rules, null, true);
    expect(result.oil_stain).toBeDefined();
    expect(result.oil_stain.occupiable).toBe(false);
  });
});

describe("remapInvalidRegions", () => {
  it("remaps regions beyond max index to 0", () => {
    const item = {
      regionNames: ["Zona 1", "Zona 2"],
      regions: [[0, 1, 5]],
    };
    remapInvalidRegions(item);
    expect(item.regions[0][2]).toBe(0);
  });

  it("keeps valid regions", () => {
    const item = {
      regionNames: ["Z1", "Z2", "Z3"],
      regions: [[0, 1, 2]],
    };
    remapInvalidRegions(item);
    expect(item.regions[0]).toEqual([0, 1, 2]);
  });
});

describe("normalizeCase", () => {
  it("fills missing fields", () => {
    const result = normalizeCase({});
    expect(result.id).toBeTypeOf("string");
    expect(result.title).toBe("Caso sin titulo");
    expect(result.rows).toBe(6);
    expect(result.cols).toBe(6);
    expect(result.suspects).toHaveLength(6);
    expect(result.regions).toHaveLength(6);
    expect(result.suspects[0].clue).toBe("");
    expect(result.solution).toEqual({});
    expect(result.murderer).toBe(result.suspects[0].id);
  });

  it("preserves provided data", () => {
    const input = {
      title: "Test Case",
      rows: 4,
      cols: 4,
      suspects: [{ name: "Ana" }, { name: "Bruno" }],
      victim: { name: "Vic", row: 2, col: 1 },
      clues: ["Clue 1"],
      solution: { ana: { row: 0, col: 0 } },
      murderer: "ana",
    };
    const result = normalizeCase(input);
    expect(result.title).toBe("Test Case");
    expect(result.rows).toBe(4);
    expect(result.suspects).toHaveLength(2);
    expect(result.suspects[0].clue).toBe("Clue 1");
    expect(result.suspects[1].clue).toBe("");
    expect(result.victim.row).toBe(2);
    expect(result.victim.col).toBe(1);
    expect(result.clues).toEqual(["Clue 1", ""]);
    expect(result.solution.ana).toEqual({ row: 0, col: 0 });
  });

  it("clamps victim position to board size", () => {
    const result = normalizeCase({
      rows: 4,
      cols: 4,
      victim: { row: 100, col: -1 },
    });
    expect(result.victim.row).toBe(3);
    expect(result.victim.col).toBe(0);
  });

  it("preserves clue on each suspect", () => {
    const result = normalizeCase({
      suspects: [{ name: "Ana", clue: "Viste a Ana" }, { name: "Bruno" }],
    });
    expect(result.suspects[0].clue).toBe("Viste a Ana");
    expect(result.suspects[1].clue).toBe("");
  });

  it("adds gender to victim from guessGender", () => {
    const result = normalizeCase({ victim: { name: "Maria" } });
    expect(result.victim.gender).toBe("female");
  });

  it("preserves explicit victim gender", () => {
    const result = normalizeCase({ victim: { name: "Maria", gender: "male" } });
    expect(result.victim.gender).toBe("male");
  });
});
