// src/main.js
import "./styles/scaffold.css";
import zonesData from "./data/zones.json";
import parallaxConfig from "./data/parallax.json";
import animations from "./data/animations.json";

import { createLayoutAdapter } from "./modules/layoutAdapter.js";
import { createDevOverlay } from "./modules/devOverlay.js";
import { createControlsView } from "./modules/controlsView.js";
import { createParallax } from "./modules/parallax.js";

import { initAudio } from "./modules/initAudio.js";
import { initApartmentDialogs } from "./modules/initApartmentDialogs.js";
import { initKeyboardShortcuts } from "./modules/keyboardShortcuts.js";
import { enableArrowNavigation } from "./modules/hotspotArrowNav.js";
import { initAnimations } from "./modules/animation.js";


// === CONTENT LIVES HERE ===============================================
// Audio playlist
const PLAYLIST = [
  "/assets/audio/highway-of-light.mp3",
  "/assets/audio/dreamscape-nocturne.mp3",
];

// Apartment dialogs
const DIALOGS_REGISTRY = {
  "ap-00": {
    title: "Welcome to Apartment 0",
    content: `<p>Here will an image of the interior of Apartment 0</p>`,
    closeLabel: "Close dialog",
  },
  "ap-03": {
    title: "Welcome to Apartment 3",
    content: `
      <figure class="modal__figure">
        <img
          class="modal__img"
          src="/assets/images/apartments/ap-03/apartment-3-inside.png"
          alt="Interior of Apartment 3"
          loading="eager"
        />
      </figure>
    `,
    closeLabel: "Close dialog",
  },
};
// ======================================================================

document.addEventListener("DOMContentLoaded", () => {
  const stage = document.querySelector(".stage");
  const designWidth  = zonesData?.meta?.designWidth  ?? 800;
  const designHeight = zonesData?.meta?.designHeight ?? 2600;

  const adapter = createLayoutAdapter({ stage, designWidth, designHeight });
  createDevOverlay({ stage, zonesData, adapter, initiallyVisible: false });

  // Only make apartments clickable that have content defined here
  const enabledApartmentIds = Object.keys(DIALOGS_REGISTRY);

  const controls = createControlsView({
    stage,
    zonesData,
    adapter,
    enabledApartments: enabledApartmentIds,
  });

  const parallax = createParallax({ stage, adapter, config: parallaxConfig });
  initKeyboardShortcuts({ stage, parallax });

  // Audio + billboard (playlist from main.js)
  initAudio({ stage, controls, playlist: PLAYLIST });

  // Arrow-key navigation across enabled apartment buttons
  enableArrowNavigation({ container: controls.getContainer(), selector: ".apartment-btn" });

  // Apartment dialogs (registry from main.js)
  initApartmentDialogs({ stage, controls, registry: DIALOGS_REGISTRY });

  // Optional: keep your debug log
  controls.onControl((payload) => console.log("[controls] activated:", payload));

  // Animations (data-driven)
  initAnimations({ stage, config: animations, zonesData });
});
