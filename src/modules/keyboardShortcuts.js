// src/modules/keyboardShortcuts.js
export function initKeyboardShortcuts({ stage, parallax }) {
  function onKeydown(e) {
    if (e.key.toLowerCase() === "m") {
      const isOn = stage.dataset.parallax === "on";
      parallax.setEnabled(!isOn);
      console.log(`[parallax] ${isOn ? "disabled" : "enabled"}`);
    }
  }
  window.addEventListener("keydown", onKeydown);
  return () => window.removeEventListener("keydown", onKeydown);
}
