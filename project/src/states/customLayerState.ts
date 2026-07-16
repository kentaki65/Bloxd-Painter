import { layerColors } from "../core/constants.js";

export function addCustomLayer(name: string, color: [number, number, number]): { ok: boolean; reason?: string } {
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, reason: "Name is empty" };
  if (layerColors[trimmed]) {
    return { ok: false, reason: "Layer name already exists" };
  }

  layerColors[trimmed] = color;
  return { ok: true };
}

export function deleteCustomLayer(name: string): void {
  delete layerColors[name];
}

export function getAllLayerNames(): string[] {
  return Object.keys(layerColors);
}

export function populateLayerSelect(select: HTMLSelectElement, layers: string[]): void {
  select.innerHTML = "";
  for (const name of layers) {
    const opt = document.createElement("option");
    opt.value = name;
    opt.textContent = name;
    select.appendChild(opt);
  }
}