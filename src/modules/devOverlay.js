// src/modules/devOverlay.js
// Draws dashed boxes from zones.json on top of the scaled stage.
// Toggle with the "D" key.

export function createDevOverlay({ stage, zonesData, adapter, initiallyVisible = true }) {
  const { meta: { designWidth, designHeight }, zones} = zonesData;

  const overlay = document.createElement("div");
  overlay.className = "zone-overlay";
  overlay.style.position = "absolute";
  overlay.style.inset = "0";
  overlay.style.pointerEvents = "none";
  overlay.style.width = `${designWidth}px`;
  overlay.style.height = `${designHeight}px`;
  stage.appendChild(overlay);

  const boxes = zones.map(zone => {
    const el = document.createElement("div");
    el.className = "zone-box";
    el.dataset.id = zone.id;
    el.style.position = "absolute";
    el.style.boxSizing = "border-box";
    el.style.pointerEvents = "none";

    const label = document.createElement("div");
    label.className = "zone-label";
    label.textContent = zone.id;
    el.appendChild(label);

    overlay.appendChild(el);
    return { el, zone };
  });

  function layout() {
    const s = adapter?.getScale ? adapter.getScale() : 1;

    boxes.forEach(({ el, zone }) => {
      const { xPct, yPct, wPct, hPct } = zone.rect;

      // Conver % -> design-space px
      const x = (xPct / 100) * designWidth;
      const y = (yPct / 100) * designHeight;
      const w = (wPct / 100) * designWidth;
      const h = (hPct / 100) * designHeight;

      // Pixel snapping to reduce subpixel fuzz during scaling
      const left = Math.round(x * s) / s;
      const top = Math.round(y * s) / s;
      const width = Math.round(w * s) / s;
      const height = Math.round(h * s) / s;

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
    });
  }

  const off = adapter?.onChange ? adapter.onChange(layout) : () => {};
  layout();

  // Toggle with "D"
  let visible = initiallyVisible;
  overlay.style.display = visible ? "block" : "none";

  function toggle() {
    visible = !visible;
    overlay.style.display = visible ? "block" : "none";
  }

  function onKey(e) {
    if ((e.key === "d" || e.key === "D") && !e.repeat) toggle();
  }

  window.addEventListener("keydown", onKey);

  return {
    toggle,
    destroy() {
        window.removeEventListener("keydown", onKey);
        off();
        overlay.remove();
    }
  };
}