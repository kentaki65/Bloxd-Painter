import { brushState } from "../../states/index.js";
function createLayerButton(name, color, onDelete) {
    const btn = document.createElement("button");
    btn.className = "BlockButton LayerButton";
    btn.type = "button";
    btn.id = name;
    btn.title = name;
    btn.style.backgroundColor = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
    btn.addEventListener("click", () => {
        brushState.selectedLayer = name;
    });
    const deleteBtn = document.createElement("span");
    deleteBtn.className = "LayerButton-delete";
    deleteBtn.textContent = "✕";
    deleteBtn.title = `Delete layer "${name}"`;
    deleteBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        onDelete(name);
    });
    btn.appendChild(deleteBtn);
    return btn;
}
export function renderLayerButtons(container, colors, onDelete) {
    container.innerHTML = "";
    for (const [name, color] of Object.entries(colors)) {
        if (!color)
            continue;
        const rgb = [color[0] ?? 0, color[1] ?? 0, color[2] ?? 0];
        container.appendChild(createLayerButton(name, rgb, onDelete));
    }
}
//# sourceMappingURL=createLayerBtn.js.map