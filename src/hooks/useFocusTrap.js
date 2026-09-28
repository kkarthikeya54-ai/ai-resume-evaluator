import { useEffect, useRef } from "react";

/**
 * Custom hook to trap focus within an element (modal, drawer) for WCAG accessibility.
 * @param {boolean} active Whether the focus trap is currently enabled
 * @param {function} onClose Optional callback when Escape key is pressed
 */
export function useFocusTrap(active, onClose) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (!active) return undefined;

    const previousFocus = document.activeElement;
    const container = containerRef.current;

    if (!container) return undefined;

    const getFocusables = () => {
      return Array.from(
        container.querySelectorAll(
          'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )
      ).filter((el) => el.offsetWidth > 0 || el.offsetHeight > 0);
    };

    const focusables = getFocusables();
    if (focusables.length > 0) {
      focusables[0].focus();
    }

    const handleKeyDown = (e) => {
      if (e.key === "Escape" && onClose) {
        e.preventDefault();
        onClose();
        return;
      }

      if (e.key === "Tab") {
        const currentFocusables = getFocusables();
        if (currentFocusables.length === 0) return;

        const firstEl = currentFocusables[0];
        const lastEl = currentFocusables[currentFocusables.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === firstEl) {
            e.preventDefault();
            lastEl.focus();
          }
        } else {
          if (document.activeElement === lastEl) {
            e.preventDefault();
            firstEl.focus();
          }
        }
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      if (previousFocus && typeof previousFocus.focus === "function") {
        previousFocus.focus();
      }
    };
  }, [active, onClose]);

  return containerRef;
}
