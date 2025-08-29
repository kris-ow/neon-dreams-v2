// src/modules/controlsView.js
// Renders absolutely-positioned semantic <button>s for zones.
// - Keeps existing behavior for type: "control" (billboard controls)
// - Adds accessible buttons for type: "apartment" (hotspots)
// Positions are computed from % rects -> design-space px, then pixel-snapped with adapter scale.

export function createControlsView({ stage, zonesData, adapter, enabledApartments }) {
  if (!stage) throw new Error("controlsView: missing stage element");
  if (!zonesData?.meta) throw new Error("controlsView: missing zones meta");

  const { designWidth, designHeight } = zonesData.meta;
  const zones = zonesData.zones || [];

  // Only these apartments get interactive buttons (Phase 5 exemplar)
  const enabledSet = new Set(
    Array.isArray(enabledApartments) ? enabledApartments : (enabledApartments ?? [])
  );

  const controlZones = zones.filter(z => z.type === "control");
  const apartmentZones = zones.filter(z => z.type === "apartment" && enabledSet.has(z.id));

  // Root container (keeps old className & semantics so nothing upstream breaks)
  const root = document.createElement("div");
  root.className = "controls-layer";
  root.style.position = "absolute";
  root.style.inset = "0";
  root.style.pointerEvents = "none";
  root.style.width = `${designWidth}px`;
  root.style.height = `${designHeight}px`;
  stage.appendChild(root);

  // Sub-layer: billboard controls (toolbar semantics preserved)
  const controlsLayer = document.createElement("div");
  controlsLayer.className = "controls-layer__controls";
  controlsLayer.style.position = "absolute";
  controlsLayer.style.inset = "0";
  controlsLayer.style.pointerEvents = "none";
  controlsLayer.setAttribute("role", "toolbar");
  controlsLayer.setAttribute("aria-label", "Billboard controls");
  root.appendChild(controlsLayer);

  // Sub-layer: apartment hotspots (group semantics)
  const apartmentsLayer = document.createElement("div");
  apartmentsLayer.className = "controls-layer__apartments";
  apartmentsLayer.style.position = "absolute";
  apartmentsLayer.style.inset = "0";
  apartmentsLayer.style.pointerEvents = "none";
  apartmentsLayer.setAttribute("role", "group");
  apartmentsLayer.setAttribute("aria-label", "Apartment hotspots");
  root.appendChild(apartmentsLayer);

  // Simple emitter
  const listeners = new Set();
  const emit = (payload) => listeners.forEach(fn => fn(payload));

  // Helpers
  function applyButtonBaseStyles(el) {
    el.style.position = "absolute";
    el.style.pointerEvents = "auto";
    el.style.background = "transparent";
    el.style.border = "none";
    el.style.padding = "0";
    el.style.margin = "0";
    el.style.cursor = "pointer";
  }

  function attachKeyboardActivation(el) {
    // Space: prevent page scroll (keydown), trigger click on keyup
    // Enter: trigger click on keydown for immediacy
    el.addEventListener("keydown", (e) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
      } else if (e.key === "Enter") {
        e.preventDefault();
        el.click();
      }
    });
    el.addEventListener("keyup", (e) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        el.click();
      }
    });
  }

  // Create maps to track elements for layout
  const controlBtns = new Map();   // id -> { btn, zone }
  const apartmentBtns = new Map(); // id -> { btn, zone }

  // Build control buttons (unchanged behavior)
  for (const zone of controlZones) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "control-btn";
    btn.dataset.id = zone.id;
    btn.setAttribute("aria-label", zone.label || zone.id);
    if (zone.action) btn.setAttribute("data-action", zone.action);
    applyButtonBaseStyles(btn);
    attachKeyboardActivation(btn);

    btn.addEventListener("click", () => {
      emit({ id: zone.id, action: zone.action || "", type: "click" });
    });

    controlsLayer.appendChild(btn);
    controlBtns.set(zone.id, { btn, zone });
  }

  // Build apartment buttons (new, accessible, keyboard + mouse)
  for (const zone of apartmentZones) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "apartment-btn";
    btn.dataset.id = zone.id;
    // A11Y: clear label for SR; keep invisible visually (dev overlay can show bounds)
    const srLabel = zone.label ? `Open ${zone.label} details` : `Open ${zone.id} details`;
    btn.setAttribute("aria-label", srLabel);
    if (zone.action) btn.setAttribute("data-action", zone.action);

    applyButtonBaseStyles(btn);
    attachKeyboardActivation(btn);

    btn.addEventListener("click", () => {
      emit({ id: zone.id, action: zone.action || "", type: "click" });
    });

    apartmentsLayer.appendChild(btn);
    apartmentBtns.set(zone.id, { btn, zone });
  }

  // Layout all buttons
  function layout() {
    const s = adapter?.getScale ? adapter.getScale() : 1;

    function place(el, rect) {
      const { xPct, yPct, wPct, hPct } = rect;
      const x = (xPct / 100) * designWidth;
      const y = (yPct / 100) * designHeight;
      const w = (wPct / 100) * designWidth;
      const h = (hPct / 100) * designHeight;

      // Pixel-snap in scaled space, then divide back
      const left = Math.round(x * s) / s;
      const top = Math.round(y * s) / s;
      const width = Math.round(w * s) / s;
      const height = Math.round(h * s) / s;

      el.style.left = `${left}px`;
      el.style.top = `${top}px`;
      el.style.width = `${width}px`;
      el.style.height = `${height}px`;
    }

    for (const { btn, zone } of controlBtns.values()) {
      place(btn, zone.rect);
    }
    for (const { btn, zone } of apartmentBtns.values()) {
      place(btn, zone.rect);
    }
  }

  const off = adapter?.onChange ? adapter.onChange(layout) : () => {};
  layout();

  return {
    onControl(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    getButton(id) {
      return controlBtns.get(id)?.btn || apartmentBtns.get(id)?.btn || null;
    },
    // Keep method name but now returns the root container (backward compatible for callers using it)
    getContainer() { return root; },
    destroy() {
      off();
      listeners.clear();
      root.remove();
      controlBtns.clear();
      apartmentBtns.clear();
    }
  };
}
