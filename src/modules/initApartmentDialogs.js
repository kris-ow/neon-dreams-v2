// src/modules/initApartmentDialogs.js
// Wires apartment hotspots to popup dialogs, using a registry provided by main.js.

import { createPopupDialog } from "./popupDialog.js";

export function initApartmentDialogs({ stage, controls, registry }) {
  if (!stage || !controls || !registry) {
    throw new Error("initApartmentDialogs: stage, controls, and registry are required");
  }

  // Lazy cache of created dialogs
  const cache = new Map();

  function ensureDialog(apId) {
    if (cache.has(apId)) return cache.get(apId);

    const cfg = registry[apId];
    if (!cfg) return null;

    const dlg = createPopupDialog({
      id: apId.replace("ap-", "ap"),           // compact id for aria hooks
      title: cfg.title,
      content: cfg.content,
      closeLabel: cfg.closeLabel || "Close dialog",
      stage,                                    // so background can be inerted
    });

    cache.set(apId, dlg);
    return dlg;
  }

  // Open on control activation
  const off = controls.onControl(({ id, action }) => {
    // zones.json typically: id "ap-03", action "open-ap3"
    const isRegistered = Object.prototype.hasOwnProperty.call(registry, id);
    const looksLikeOpen = !action || action.startsWith("open-ap");
    if (isRegistered && looksLikeOpen) {
      ensureDialog(id)?.open();
    }
  });

  return {
    open(apId) { ensureDialog(apId)?.open(); },
    get(apId) { return cache.get(apId) || null; },
    destroy() { off?.(); cache.clear(); }
  };
}
