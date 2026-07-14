export const schemState = {
    selected: null,
    settings: {
        density: 0.5,
        minSpacing: 5,
        targetLayer: null,
    },
};
export function setSelectedSchem(parsed) {
    schemState.selected = parsed;
}
export function setSchemSettings(density, minSpacing, targetLayer) {
    schemState.settings.density = density;
    schemState.settings.minSpacing = minSpacing;
    schemState.settings.targetLayer = targetLayer;
}
export function clearSchemState() {
    schemState.selected = null;
}
//# sourceMappingURL=schemState.js.map