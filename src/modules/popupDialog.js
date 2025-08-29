// src/modules/popupDialog.js
// Step 4: focus trap + ESC + overlay click
// (Still includes Step 3: inert/aria-hidden + focus restore)

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
}) {
  const titleId = `dlg-title-${id}`;

  // Wrapper
  const modal = document.createElement("div");
  modal.className = "modal";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", titleId);
  modal.dataset.open = "false";

  // Backdrop
  const backdrop = document.createElement("div");
  backdrop.className = "modal__backdrop";

  // Focus sentinels (visually hidden; help trap focus)
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

  // Title
  const h2 = document.createElement("h2");
  h2.className = "modal__title";
  h2.id = titleId;
  h2.textContent = title;

  // Close button
  const closeBtn = document.createElement("button");
  closeBtn.className = "modal__close";
  closeBtn.type = "button";
  closeBtn.setAttribute("aria-label", closeLabel);
  closeBtn.textContent = "×";

  // Body
  const body = document.createElement("div");
  body.className = "modal__body";
  if (typeof content === "string") body.innerHTML = content;
  else if (content instanceof Node) body.appendChild(content);

  panel.append(h2, closeBtn, body);
  // Order: backdrop (for clicks), sentinels, panel, sentinel
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

  // --- Focus trap with sentinels and Tab wrapping
  function handleSentinelFocus(e, which) {
    if (modal.dataset.open !== "true") return;
    const { first, last, list } = getCycleTargets();
    if (list.length === 0) {
      panel.focus();
      return;
    }
    if (which === "start") {
      // Shift+Tab from first should land here -> send to last
      last.focus();
    } else {
      // Tab from last should land here -> send to first
      first.focus();
    }
  }

  startSentinel.addEventListener("focus", () => handleSentinelFocus(null, "start"));
  endSentinel.addEventListener("focus", () => handleSentinelFocus(null, "end"));

  // Handle Tab/Shift+Tab inside the modal
  modal.addEventListener("keydown", (e) => {
    if (modal.dataset.open !== "true") return;

    // ESC to close
    if (e.key === "Escape") {
      e.stopPropagation();
      e.preventDefault();
      close();
      return;
    }

    // Trap Tab within the dialog
    if (e.key === "Tab") {
      const { first, last, list } = getCycleTargets();

      if (list.length === 0) {
        e.preventDefault();
        panel.focus();
        return;
      }

      const active = document.activeElement;
      if (e.shiftKey) {
        if (active === first || active === panel) {
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

  // Overlay click to close (ignore clicks inside panel)
  backdrop.addEventListener("click", (e) => {
    if (modal.dataset.open !== "true") return;
    // Click target is backdrop => outside the panel
    close();
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
