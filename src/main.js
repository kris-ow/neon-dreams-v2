// src/main.js
import './styles/scaffold.css';
import zonesData from "./data/zones.json";
import { createLayoutAdapter } from "./modules/layoutAdapter.js";
import { createDevOverlay } from "./modules/devOverlay.js";
import { createControlsView } from "./modules/controlsView.js";
import { createAudioPlayer } from './modules/audioPlayer.js';

document.addEventListener("DOMContentLoaded", () => {
    const stage = document.querySelector(".stage");
    const designWidth = zonesData?.meta?.designWidth ?? 800;
    const designHeight = zonesData?.meta?.designHeight ?? 2600;

    const adapter = createLayoutAdapter({ stage, designWidth, designHeight });

    createDevOverlay({ stage, zonesData, adapter, initiallyVisible: true });

    const controls = createControlsView({ stage, zonesData, adapter });

    controls.onControl(({ id, action }) => {
        console.log("[controls] activated:", { id, action });
    });

    // Audio code
    const playlist = [
        "/assets/audio/highway-of-light.mp3",
        "/assets/audio/dreamscape-nocturne.mp3"
    ];
    const audioPlayer = createAudioPlayer({ playlist, preload: "metadata", loopAll: true });

    // Console hooks so you can see lifecycle without UI
    audioPlayer.on("trackchange", ({ index, track }) =>
        console.log("[audio] trackchange ->", index, track?.src)
    );
    audioPlayer.on("playing", ({ index }) =>
        console.log("[audio] playing (index)", index)
    );
    audioPlayer.on("paused", ({ index }) =>
        console.log("[audio] paused (index)", index)
    );
    audioPlayer.on("ended", ({ index }) =>
        console.log("[audio] ended (index)", index)
    );
    audioPlayer.on("error", ({ error, index }) =>
        console.warn("[audio] error (index)", index, error)
    );
});