// src/modules/popupDialog.js
// Step 5: A11Y polish — focus the title on open + aria-describedby
// (keeps Step 4: focus trap, ESC, overlay click; Step 3: inert + focus restore)

function getTabbables(root) {
  const selector = [
    'a[href]',
    'area[href]',
    'button:not([disabled])',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])'
  ].join(', ');
  return Array.from(root.querySelectorAll(selector))
    .filter(el => !el.hasAttribute('inert') && el.offsetParent !== null);
}

function isInDocument(node) {
  return node && node.ownerDocument && node.ownerDocument.contains(node);
}

export function createPopupDialog({
  id = "ap",
  title = "Apartment",
  content = "",
  closeLabel = "Close dialog",
  container = document.body,
  stage = document.querySelector(".stage"),
  // New: initial focus policy. 'title' | 'first' | 'panel'
  initialFocus = "title",
  // New: add aria-describedby that points to body
  withDescribedBy = true,
}) {
  const titleId = `dlg-title-${id}`;
  const bodyId  = `dlg-desc-${id}`;

  // Wrapper
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", titleId);
  if (withDescribedBy) modal.setAttribute("aria-describedby", bodyId);
  modal.dataset.open = "false";

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "modal__backdrop";

  // Sentinels for focus trap
  const startSentinel = document.createElement("div");
  startSentinel.tabIndex = 0;
  startSentinel.setAttribute("aria-hidden", "true");
  Object.assign(startSentinel.style, { position: "fixed", width: "1px", height: "1px", overflow: "hidden", left: "-9999px", top: "0" });

  const endSentinel = document.createElement("div");
  endSentinel.tabIndex = 0;
  endSentinel.setAttribute("aria-hidden", "true");
  Object.assign(endSentinel.style, { position: "fixed", width: "1px", height: "1px", overflow: "hidden", left: "-9999px", top: "0" });

  // Panel
  const panel = document.createElement("div");
  panel.className = "modal__panel";
  panel.setAttribute("tabindex", "-1");

  // Title (make it programmatically focusable for initial announcement)
  const h2 = document.createElement("h2");
  h2.className = "modal__title";
  h2.id = titleId;
  h2.textContent = title;
  h2.tabIndex = -1; // so we can focus it when opening

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.className = "modal__close";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", closeLabel);
  closeBtn.textContent = "×";

  // Body
  const body = document.createElement("div");
  body.className = "modal__body";
  body.id = bodyId;
  if (typeof content === "string") body.innerHTML = content;
  else if (content instanceof Node) body.appendChild(content);

  panel.append(h2, closeBtn, body);
  modal.append(backdrop, startSentinel, panel, endSentinel);
  container.appendChild(modal);

  // --- State
  let opener = null;
  let usedAriaHidden = false;

  // --- Inert helpers
  function setBackgroundInert(on) {
    if (!stage) return;
    if ("inert" in HTMLElement.prototype) {
      stage.inert = !!on;
      usedAriaHidden = false;
    } else {
      if (on) {
        stage.setAttribute("aria-hidden", "true");
        usedAriaHidden = true;
      } else if (usedAriaHidden) {
        stage.removeAttribute("aria-hidden");
        usedAriaHidden = false;
      }
    }
  }

  // --- Focus move helpers
  function getCycleTargets() {
    const tabbables = getTabbables(panel);
    if (tabbables.length === 0) return { first: panel, last: panel, list: [] };
    return { first: tabbables[0], last: tabbables[tabbables.length - 1], list: tabbables };
  }

  function moveFocusIntoDialog() {
    const { list, first } = getCycleTargets();

    if (initialFocus === "title" && h2) {
      h2.focus();
      return;
    }
    if (initialFocus === "panel") {
      panel.focus();
      return;
    }
    // 'first' (or fallback): first tabbable, else panel
    if (list.length > 0) first.focus();
    else panel.focus();
  }

  function restoreFocus() {
    if (isInDocument(opener)) {
      try { opener.focus(); } catch {}
    } else if (stage && isInDocument(stage)) {
      stage.focus?.();
    }
    opener = null;
  }

  // --- Open/Close
  function open() {
    if (modal.dataset.open === "true") return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    modal.dataset.open = "true";
    setBackgroundInert(true);
    Promise.resolve().then(moveFocusIntoDialog);
  }

  function close() {
    if (modal.dataset.open !== "true") return;
    modal.dataset.open = "false";
    setBackgroundInert(false);
    restoreFocus();
  }

  // --- Focus trap & keys
  function handleSentinelFocus(which) {
    if (modal.dataset.open !== "true") return;
    const { first, last, list } = getCycleTargets();
    if (list.length === 0) { panel.focus(); return; }
    if (which === "start") last.focus(); else first.focus();
  }
  startSentinel.addEventListener("focus", () => handleSentinelFocus("start"));
  endSentinel  .addEventListener("focus", () => handleSentinelFocus("end"));

  modal.addEventListener("keydown", (e) => {
    if (modal.dataset.open !== "true") return;

    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      close();
      return;
    }
    if (e.key === "Tab") {
      const { first, last, list } = getCycleTargets();
      if (list.length === 0) { e.preventDefault(); panel.focus(); return; }
      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || active === panel || active === h2) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (active === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }
  });

  // Overlay click closes (clicks inside panel are ignored)
  backdrop.addEventListener("click", () => {
    if (modal.dataset.open === "true") close();
  });

  // Close button
  closeBtn.addEventListener("click", close);

  return {
    el: modal,
    panel,
    open,
    close,
    isOpen() { return modal.dataset.open === "true"; },
    getOpener() { return opener; },
    destroy() { modal.remove(); }
  };
}
