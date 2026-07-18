const CLOSE_DELAY_MS = 200;

export function initDropdowns(): void {
  const options = document.querySelectorAll<HTMLElement>(".dropdown > .option");

  options.forEach((optionEl) => {
    const menuEl = optionEl.querySelector<HTMLElement>(".dropdownMenu");
    if (!menuEl) return;

    let closeTimer: number | null = null;

    function clearCloseTimer(): void {
      if (closeTimer !== null) {
        clearTimeout(closeTimer);
        closeTimer = null;
      }
    }

    function open(): void {
      clearCloseTimer();
      menuEl!.classList.add("open");
    }

    function scheduleClose(): void {
      clearCloseTimer();
      closeTimer = window.setTimeout(() => {
        const stillInside =
          optionEl.matches(":hover") || menuEl!.matches(":hover");
        if (!stillInside) {
          menuEl!.classList.remove("open");
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