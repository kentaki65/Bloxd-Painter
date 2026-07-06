import { StackState } from "../core/types.js";

export const stackState:StackState = {
  undoStack: [],
  redoStack: [],
  MAX_HISTORY: 10,
}