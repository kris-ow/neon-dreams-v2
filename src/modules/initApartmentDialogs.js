// src/modules/initApartmentDialogs.js
// Wire apartment hotspots to dialogs and size the dialog *panel*
// relative to the stage width (overlay stays full-screen so backdrop clicks work).

import { createPopupDialog } from "./popupDialog.js";

export function initApartmentDialogs({
  stage,
  controls,
  registry,
  // Tuning knobs (feel free to tweak in main.js call if you want):
  widthFraction = 0.94,   // panel is 94% of stage width
  minWidth = 360,         // never smaller than this
  maxWidth = 1100,        // never larger than this
  gutter = 24,            // extra margin subtracted from computed width
}) {
  if (!stage || !controls || !registry) {
    throw new Error("initApartmentDialogs: stage, controls, and registry are required");
  }

  const cache = new Map(); // apId -> dialog

  function sizePanelToStage(panel) {
    const r = stage.getBoundingClientRect();
    // compute target width from stage width
    const target = Math.max(
      minWidth,
      Math.min(
        maxWidth,
        Math.floor(r.width * widthFraction) - gutter * 2
      )
    );

    // Ensure inline styles override CSS max-width/min(90vw,720px)
    panel.style.maxWidth = "none";
    panel.style.width = `${target}px`;
    // let max-height come from your CSS (85vh); overflow:auto already set
  }

  function attachSizing(dlg) {
    const panel = dlg.panel;

    const doUpdate = () => sizePanelToStage(panel);
    const onResize = () => requestAnimationFrame(doUpdate);
    const onScroll = () => requestAnimationFrame(doUpdate);

    // Wrap open/close to attach listeners only while open
    const origOpen = dlg.open;
    const origClose = dlg.close;
    let listening = false;

    dlg.open = () => {
      origOpen();
      requestAnimationFrame(doUpdate);
      if (!listening) {
        window.addEventListener("resize", onResize);
        window.addEventListener("scroll", onScroll, { passive: true });
        listening = true;
      }
    };

    dlg.close = () => {
      origClose();
      if (listening) {
        window.removeEventListener("resize", onResize);
        window.removeEventListener("scroll", onScroll);
        listening = false;
      }
    };
  }

  function ensureDialog(apId) {
    if (cache.has(apId)) return cache.get(apId);
    const cfg = registry[apId];
    if (!cfg) return null;

    const dlg = createPopupDialog({
      id: apId.replace("ap-", "ap"),
      title: cfg.title,
      content: cfg.content,
      closeLabel: cfg.closeLabel || "Close dialog",
      stage, // inert background while open
    });

    // Size the panel relative to the stage (overlay remains full-screen)
    attachSizing(dlg);

    cache.set(apId, dlg);
    return dlg;
  }

  // Open on control activation
  const off = controls.onControl(({ id, action }) => {
    const isRegistered = Object.prototype.hasOwnProperty.call(registry, id);
    const looksLikeOpen = !action || action.startsWith("open-ap");
    if (isRegistered && looksLikeOpen) {
      ensureDialog(id)?.open();
    }
  });

  return {
    open(apId) { ensureDialog(apId)?.open(); },
    get(apId) { return cache.get(apId) || null; },
    destroy() { off?.(); cache.clear(); },
  };
}
