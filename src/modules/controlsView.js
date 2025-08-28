// src/modules/controlsView.js
// Renders absolutely-positioned semantic <button>s for zones with type: "control".
// Positions are computed from % rects -> design-space px, then pixel-snapped with adapter scale.

export function createControlsView({ stage, zonesData, adapter }) {
  if (!stage) throw new Error("controlsView: missing stage element");
  if (!zonesData.meta) throw new Error("controlsView: missing zones meta");

  const { designWidth, designHeight } = zonesData.meta;
  const controls = (zonesData.zones || []).filter(z => z.type === "control");

  // Later container
  const layer = document.createElement("div");
  layer.className = "controls-layer";
  layer.style.position = "absolute";
  layer.style.inset = "0";
  layer.style.pointerEvents = "none";
  layer.style.width = `${designWidth}px`;
  layer.style.height = `${designHeight}px`;
  layer.setAttribute("role", "toolbar");
  layer.setAttribute("aria-label", "Billboard controls");
  stage.appendChild(layer);

  // Simple emitter
  const listeners = new Set();
  const emit = (payload) => listeners.forEach(fn => fn(payload));

  // Create buttons
  const btns = new Map();
  for (const zone of controls) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "control-btn";
    btn.dataset.id = zone.id;
    btn.setAttribute("aria-label", zone.label || zone.id);
    btn.setAttribute("data-action", zone.action || "");
    btn.style.position = "absolute";
    btn.style.pointerEvents = "auto";
    btn.style.background = "transparent";
    btn.style.border = "none";
    btn.style.padding = "0";
    btn.style.cursor = "pointer";

    // - Space: prevent scroll on keydown, fire click on keyup (native is inconsistent across browsers)
    // - Enter: fire click on keydown for immediacy
    btn.addEventListener("keydown", (e) => {
        if (e.code === "Space" || e.key === " ") {
            e.preventDefault(); 
        } else if (e.key === "Enter") {
            e.preventDefault();
            btn.click();
        }
    });
    btn.addEventListener("keyup", (e) => {
        if (e.code === "Space" || e.key === " ") {
            e.preventDefault();
            btn.click();
        }
    });

    // Click -> notify
    btn.addEventListener("click", () => {
        emit({ id: zone.id, action: zone.action || "", type: "click" });
    });

    layer.appendChild(btn);
    btns.set(zone.id, { btn, zone });
    }


    function layout() {
        const s = adapter?.getScale ? adapter.getScale() : 1;
        for (const { btn, zone } of btns.values()) {
            const { xPct, yPct, wPct, hPct } = zone.rect;

            const x = (xPct / 100) * designWidth;
            const y = (yPct / 100) * designHeight;
            const w = (wPct / 100) * designWidth;
            const h = (hPct / 100) * designHeight;

            const left = Math.round(x * s) / s;
            const top = Math.round(y * s) / s;
            const width = Math.round(w * s) / s;
            const height = Math.round(h * s) / s;

            btn.style.left = `${left}px`;
            btn.style.top = `${top}px`;
            btn.style.width = `${width}px`;
            btn.style.height = `${height}px`;
        }
    }

    const off = adapter?.onChange ? adapter.onChange(layout) : () => {};
    layout();
    
    return {
        onControl(fn) {listeners.add(fn); return () => listeners.delete(fn); },
        getButton(id) { return btns.get(id)?.btn || null; },
        getContainer() { return layer; },
        destroy() {
            off();
            listeners.clear();
            layer.remove();
        }
    };
}