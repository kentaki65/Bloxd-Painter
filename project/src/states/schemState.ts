import type { ParsedResult } from "../core/types.js";

export interface SchemStampSettings {
  density: number;     // 0〜1
  minSpacing: number;   // グリッド間隔
  targetLayer: string | null; // このレイヤーに塗られたセルにのみスタンプする
}

export interface SchemState {
  selected: ParsedResult | null;
  settings: SchemStampSettings;
}

export const schemState: SchemState = {
  selected: null,
  settings: {
    density: 0.5,
    minSpacing: 5,
    targetLayer: null,
  },
};

export function setSelectedSchem(parsed: ParsedResult): void {
  schemState.selected = parsed;
}

export function setSchemSettings(density: number, minSpacing: number, targetLayer: string): void {
  schemState.settings.density = density;
  schemState.settings.minSpacing = minSpacing;
  schemState.settings.targetLayer = targetLayer;
}

export function clearSchemState(): void {
  schemState.selected = null;
}