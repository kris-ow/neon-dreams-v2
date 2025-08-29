// src/modules/hotspotArrowNav.js
// Arrow-key navigation between apartment hotspot buttons.
// Doesn't change Tab behavior; only handles Arrow keys (and Home/End) when
// focus is on an .apartment-btn inside the given container.

export function enableArrowNavigation({ container, selector = ".apartment-btn" } = {}) {
  if (!container) throw new Error("enableArrowNavigation: container is required");

  function getButtons() {
    // live snapshot; respects any runtime changes to enabled apartments
    return Array.from(container.querySelectorAll(selector))
      .filter(btn => !btn.disabled && btn.offsetParent !== null);
  }

  function moveFocus(current, delta) {
    const buttons = getButtons();
    if (buttons.length === 0) return;

    let index = Math.max(0, buttons.indexOf(current));
    if (index === -1) index = 0;

    const next = (index + delta + buttons.length) % buttons.length;
    buttons[next]?.focus();
  }

  function moveToEdge(toStart) {
    const buttons = getButtons();
    const target = toStart ? buttons[0] : buttons[buttons.length - 1];
    target?.focus();
  }

  function onKeyDown(e) {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    if (!t.matches(selector)) return; // only when an apartment button has focus
    if (e.altKey || e.ctrlKey || e.metaKey) return;

    switch (e.key) {
      case "ArrowRight":
      case "ArrowDown":
        e.preventDefault();
        moveFocus(t, +1);
        break;
      case "ArrowLeft":
      case "ArrowUp":
        e.preventDefault();
        moveFocus(t, -1);
        break;
      case "Home":
        e.preventDefault();
        moveToEdge(true);
        break;
      case "End":
        e.preventDefault();
        moveToEdge(false);
        break;
      default:
        break;
    }
  }

  container.addEventListener("keydown", onKeyDown);
  return () => container.removeEventListener("keydown", onKeyDown);
}
