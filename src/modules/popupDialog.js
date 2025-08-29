// src/modules/popupDialog.js
// Step 3: open/close API with background inert/aria-hidden + focus restore.
// Focus trap + ESC/overlay close will be added in Step 4.

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
  // Pass the background container to inert (your .stage element):
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

  // Backdrop (overlay) — wired in Step 4
  const backdrop = document.createElement("div");
  backdrop.className = "modal__backdrop";

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
  modal.append(backdrop, panel);
  container.appendChild(modal);

  // --- State
  let opener = null;        // element that triggered open()
  let usedAriaHidden = false;

  // --- Inert helpers
  function setBackgroundInert(on) {
    if (!stage) return;
    // Prefer the inert attribute if supported
    if ("inert" in HTMLElement.prototype) {
      stage.inert = !!on;
      usedAriaHidden = false;
    } else {
      // Fallback: aria-hidden on the non-dialog content
      if (on) {
        stage.setAttribute("aria-hidden", "true");
        usedAriaHidden = true;
      } else if (usedAriaHidden) {
        stage.removeAttribute("aria-hidden");
        usedAriaHidden = false;
      }
    }
  }

  // --- Focus helpers
  function moveFocusIntoDialog() {
    // Prefer focusing the title, then first focusable; fallback to panel
    const tabbables = getTabbables(panel);
    // If the title is focusable by default? (h2 isn't) -> keep fallback behavior.
    if (tabbables.length > 0) {
      tabbables[0].focus();
    } else {
      panel.focus();
    }
  }

  function restoreFocus() {
    if (isInDocument(opener)) {
      try { opener.focus(); } catch {}
    } else {
      // Fallback: focus the stage so keyboard users have a sane target
      if (stage && isInDocument(stage)) {
        stage.focus?.();
      }
    }
    opener = null;
  }

  // --- Public API
  function open() {
    if (modal.dataset.open === "true") return;
    opener = document.activeElement instanceof HTMLElement ? document.activeElement : null;

    // Show dialog
    modal.dataset.open = "true";

    // Inert background
    setBackgroundInert(true);

    // Move focus into dialog
    // Delay to ensure it's in the tree and display style is applied.
    // (No rAF loop; a microtask is enough.)
    Promise.resolve().then(moveFocusIntoDialog);
  }

  function close() {
    if (modal.dataset.open !== "true") return;

    // Hide dialog
    modal.dataset.open = "false";

    // Restore background
    setBackgroundInert(false);

    // Restore focus to opener (if still around)
    restoreFocus();
  }

  // Wire the ✕ button (overlay/ESC will be added in Step 4)
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
