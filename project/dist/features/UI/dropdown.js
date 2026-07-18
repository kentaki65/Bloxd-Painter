const CLOSE_DELAY_MS = 200;
export function initDropdowns() {
    const options = document.querySelectorAll(".dropdown > .option");
    options.forEach((optionEl) => {
        const menuEl = optionEl.querySelector(".dropdownMenu");
        if (!menuEl)
            return;
        let closeTimer = null;
        function clearCloseTimer() {
            if (closeTimer !== null) {
                clearTimeout(closeTimer);
                closeTimer = null;
            }
        }
        function open() {
            clearCloseTimer();
            menuEl.classList.add("open");
        }
        function scheduleClose() {
            clearCloseTimer();
            closeTimer = window.setTimeout(() => {
                // タイマー発火時点で、マウスが本当にoption/menuの外にいるか再確認する
                const stillInside = optionEl.matches(":hover") || menuEl.matches(":hover");
                if (!stillInside) {
                    menuEl.classList.remove("open");
                }
                closeTimer = null;
            }, CLOSE_DELAY_MS);
        }
        optionEl.addEventListener("mouseenter", open);
        optionEl.addEventListener("mouseleave", scheduleClose);
        menuEl.addEventListener("mouseenter", open);
        menuEl.addEventListener("mouseleave", scheduleClose);
    });
}
//# sourceMappingURL=dropdown.js.map