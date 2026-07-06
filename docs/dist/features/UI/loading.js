import { getElement } from "../../core/utils.js";
export async function runLoading(fn) {
    showLoading();
    await new Promise(r => setTimeout(r, 0));
    try {
        await fn();
    }
    finally {
        hideLoading();
    }
}
export function showLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (!overlay)
        return;
    overlay.style.display = "flex";
}
export function hideLoading() {
    const overlay = document.getElementById("loadingOverlay");
    if (!overlay)
        return;
    overlay.style.display = "none";
}
export function showPopup(text, time) {
    const popup = getElement("sevedLog");
    const replacedText = getElement("replacedText");
    popup.classList.add("show");
    replacedText.textContent = text;
    setTimeout(() => {
        popup.classList.remove("show");
    }, time);
}
//# sourceMappingURL=loading.js.map