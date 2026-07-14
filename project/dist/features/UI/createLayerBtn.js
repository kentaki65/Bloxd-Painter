import { brushState } from "../../states/index.js";
function createLayerButton(name, color) {
    const btn = document.createElement("button");
    btn.className = "BlockButton LayerButton";
    btn.type = "button";
    btn.id = name;
    btn.title = name;
    btn.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    btn.addEventListener("click", () => {
        brushState.selectedLayer = name;
    });
    return btn;
}
export function renderLayerButtons(container, colors) {
    container.innerHTML = "";
    for (const [name, color] of Object.entries(colors)) {
        if (!color)
            continue;
        const rgb = [color[0] ?? 0, color[1] ?? 0, color[2] ?? 0];
        container.appendChild(createLayerButton(name, rgb));
    }
}
//# sourceMappingURL=createLayerBtn.js.map