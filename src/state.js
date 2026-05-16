export const STORAGE_KEY = "murdoku-studio-cases-v1";
export const PROGRESS_KEY = "murdoku-studio-progress-v1";

export const state = {
  cases: [],
  caseId: null,
  mode: "play",
  selectedSuspect: null,
  selectedObject: null,
  selectedObjectRotation: 0,
  selectedObjectW: 1,
  selectedObjectH: 1,
  editorMode: "region",
  board: {},
  victimGuess: "",
  lastCheck: null,
  lastSavedCases: null,
  reveal: false,
  startedAt: null,
  elapsedBeforePause: 0,
  timer: null
};

export const els = {};

export function currentCase() {
  return state.cases.find(item => item.id === state.caseId) || state.cases[0];
}

export function gameCase() {
  const caze = currentCase();
  if (!caze) return null;
  return { ...caze, objects: { ...caze.objects } };
}
