import { STORAGE_KEY, PROGRESS_KEY, state } from "./state.js";
import { readJson } from "./utils.js";

export function saveCases() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cases));
}

export function persistProgress(elapsed) {
  const all = readJson(PROGRESS_KEY) || {};
  all[state.caseId] = {
    board: state.board,
    victimGuess: state.victimGuess,
    elapsed
  };
  localStorage.setItem(PROGRESS_KEY, JSON.stringify(all));
}
