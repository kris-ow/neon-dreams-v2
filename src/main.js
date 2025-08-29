// src/main.js
import './styles/scaffold.css';
import zonesData from "./data/zones.json";
import parallaxConfig from "./data/parallax.json";
import { createLayoutAdapter } from "./modules/layoutAdapter.js";
import { createDevOverlay } from "./modules/devOverlay.js";
import { createControlsView } from "./modules/controlsView.js";
import { createAudioPlayer } from './modules/audioPlayer.js';
import { initBillboardControls } from './modules/billboardControls.js';
import { createParallax } from "./modules/parallax.js";
import { createPopupDialog } from './modules/popupDialog.js';

const DIALOGS_REGISTRY = {
    "ap-00": {
        title: "Apartment 0",
        content: `
            <p>Welcome to Apartment 0!</p>
        `,
        closeLabel: "Close dialog"
    },
    "ap-03": {
        title: "Apartment 3",
        content: `
            <p>Welcome to Apartment 3!</p>
            <p>This is a classy space with a beautiful view.</p>
        `,
        closeLabel: "Close dialog"
    },
}

document.addEventListener("DOMContentLoaded", () => {
    const stage = document.querySelector(".stage");
    const designWidth = zonesData?.meta?.designWidth ?? 800;
    const designHeight = zonesData?.meta?.designHeight ?? 2600;

    const adapter = createLayoutAdapter({ stage, designWidth, designHeight });

    createDevOverlay({ stage, zonesData, adapter, initiallyVisible: true });

    // Create controls with enabled apartments derived from the registry keys
    const enabledApartmentIds = Object.keys(DIALOGS_REGISTRY);

    const controls = createControlsView({ stage, zonesData, adapter, enabledApartments: enabledApartmentIds });
    controls.onControl(({ id, action }) => {
        console.log("[controls] activated:", { id, action });
    });

    const parallax = createParallax({ stage, adapter, config: parallaxConfig });
    // Dev toggle: press "M" to flip parallax on/off at runtime
    window.addEventListener("keydown", (e) => {
        if (e.key.toLowerCase() === "m") {
            const isOn = stage.dataset.parallax === "on";
            parallax.setEnabled(!isOn);
            console.log(`[parallax] ${isOn ? "disabled" : "enabled"}`);
        }
    });
    
    // Audio code
    const playlist = [
        "/assets/audio/highway-of-light.mp3",
        "/assets/audio/dreamscape-nocturne.mp3"
    ];
    const audioPlayer = createAudioPlayer({ playlist, preload: "metadata", loopAll: true });

    // Console hooks
    audioPlayer.on("trackchange", ({ index, track }) => console.log("[audio] trackchange ->", index, track?.src));
    audioPlayer.on("playing", ({ index }) => console.log("[audio] playing (index)", index));
    audioPlayer.on("paused", ({ index }) => console.log("[audio] paused (index)", index));
    audioPlayer.on("ended", ({ index }) => console.log("[audio] ended (index)", index));
    audioPlayer.on("error", ({ error, index }) => console.warn("[audio] error (index)", index, error));

    // Wire billboard controls (and preload art + pressed visuals)
    initBillboardControls({
        stage,
        controls,
        audioPlayer,
        assets: [
            "/assets/images/billboard/building-billboard-back-off.png",
            "/assets/images/billboard/building-billboard-back-on.png",
            "/assets/images/billboard/building-billboard-play-off.png",
            "/assets/images/billboard/building-billboard-play-on.png",
            "/assets/images/billboard/building-billboard-next-off.png",
            "/assets/images/billboard/building-billboard-next-on.png",
        ]
    });

    // Lazy dialog cache
    const dialogs = new Map();
    function ensureDialog(apId) {
        if (dialogs.has(apId)) return dialogs.get(apId);
        const cfg = DIALOGS_REGISTRY[apId];
        if (!cfg) return null;

        const dlg = createPopupDialog({
            id: apId.replace("ap-", "ap"), // unique id namespace for aria/title ids
            title: cfg.title,
            content: cfg.content,
            closeLabel: "Close dialog",
            stage, // so background can be made inert
        });

        dialogs.set(apId, dlg);
        return dlg;
    }

    // Open matching dialog for any enabled apartment
    controls.onControl(({ id, action }) => {
    // Example: action === "open-ap3" and id === "ap-03" (zones.json)
    if (id in DIALOGS_REGISTRY && action?.startsWith("open-ap")) {
        const dlg = ensureDialog(id);
        dlg?.open();
    }
    });

});