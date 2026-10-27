import { useEffect } from "react";

/**
 * Keep the fixed bottom navigation out of the on-screen keyboard.
 *
 * Android's `interactive-widget=overlays-content` viewport mode lets the
 * keyboard overlay the page. Focus tracking then hides the nav while typing.
 * iOS ignores that meta option, so the visualViewport inset is used as a
 * fallback.
 */
export function useKeyboardViewport(): void {
  useEffect(() => {
    const root = document.documentElement;
    let frame = 0;
    let blurTimer = 0;

    const isTyping = () => {
      const active = document.activeElement;
      if (!(active instanceof HTMLElement)) return false;
      if (
        active.matches(
          "textarea, select, [contenteditable='true'], [contenteditable='']",
        )
      ) {
        return true;
      }
      if (active instanceof HTMLInputElement) {
        return !["file", "checkbox", "radio", "button", "submit"].includes(
          active.type,
        );
      }
      return false;
    };

    const update = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const viewport = window.visualViewport;
        const inset = viewport
          ? Math.max(
              0,
              window.innerHeight - viewport.height - viewport.offsetTop,
            )
          : 0;
        root.classList.toggle("keyboard-open", isTyping() || inset > 120);
      });
    };

    const handleFocus = () => update();
    const handleBlur = () => {
      window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(update, 80);
    };

    const viewport = window.visualViewport;
    window.addEventListener("resize", update);
    viewport?.addEventListener("resize", update);
    viewport?.addEventListener("scroll", update);
    document.addEventListener("focusin", handleFocus, true);
    document.addEventListener("focusout", handleBlur, true);
    update();

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.clearTimeout(blurTimer);
      window.removeEventListener("resize", update);
      viewport?.removeEventListener("resize", update);
      viewport?.removeEventListener("scroll", update);
      document.removeEventListener("focusin", handleFocus, true);
      document.removeEventListener("focusout", handleBlur, true);
      root.classList.remove("keyboard-open");
    };
  }, []);
}
