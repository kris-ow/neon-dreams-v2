// src/modules/popupDialog.js
// Step 1: DOM scaffold + base state only (hidden by default)

export function createPopupDialog({
    id = "ap",
    title = "Apartment",
    content = "",
    closeLabel = "Close dialog",
    container = document.body, // where to append modal
}) {
    // IDs for a11y
    const titleId = `dlg-title-${id}`;

    // Wrapper (covers viewport)
    const modal = document.createElement("div");
    modal.className = "modal";
    modal.setAttribute("role", "dialog");
    modal.setAttribute("aria-modal", "true");
    modal.setAttribute("aria-labelledby", titleId);
    modal.dataset.open = "false";

    // Backdrop
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
    closeBtn.textContent = "x";

    // Body
    const body = document.createElement("div");
    body.className = "modal__body";
    if (typeof content === "string") body.innerHTML = content;
    else if (content instanceof Node) body.appendChild(content);

    panel.append(h2, closeBtn, body);
    modal.append(backdrop, panel);
    container.appendChild(modal);

    // Return minimal API surface
    return {
        el: modal,
        get id() { return id; },
        open() { modal.dataset.open = "true"; },
        close() { modal.dataset.open = "false"; },
        isOpen() { return modal.dataset.open === "true"; },
        destroy() { modal.remove(); }
    };
}