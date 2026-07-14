import { layerColors } from "../core/constants.js";
export function addCustomLayer(name, color) {
    const trimmed = name.trim();
    if (!trimmed)
        return { ok: false, reason: "Name is empty" };
    if (layerColors[trimmed]) {
        return { ok: false, reason: "Layer name already exists" };
    }
    layerColors[trimmed] = color;
    return { ok: true };
}
export function getAllLayerNames() {
    return Object.keys(layerColors);
}
export function populateLayerSelect(select, layers) {
    select.innerHTML = "";
    for (const name of layers) {
        const opt = document.createElement("option");
        opt.value = name;
        opt.textContent = name;
        select.appendChild(opt);
    }
}
//# sourceMappingURL=customLayerState.js.map