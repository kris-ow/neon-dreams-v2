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

    // Console hooks
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

    //  Wire controls -> audio, and reflect audio state -> UI hooks
    const btnPrev = controls.getButton("bb-prev");
    const btnPlay = controls.getButton("bb-play");
    const btnNext = controls.getButton("bb-next");

    // Initialize ARIA and data hooks
    function updatePlayButtonState(isPlaying) {
        if (!btnPlay) return;
        btnPlay.setAttribute("aria-pressed", isPlaying ? "true" : "false");
        btnPlay.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
        btnPlay.dataset.state = isPlaying ? "on" : "off";
    }
    updatePlayButtonState(false);
    if (stage) {
        stage.setAttribute("data-audio", "paused");
        stage.setAttribute("data-track-index", String(audioPlayer.getState().index ?? 0));
    }

    // Controls -> audio
    controls.onControl(({ action }) => {
        switch (action) {
            case "control-prev":
                audioPlayer.prev();
                break;
            case "control-next":
                audioPlayer.next();
                break;
            case "control-play-toggle":
                audioPlayer.toggle();
                break;
        }
    })

    // Audio -> UI hooks (for visuals and general state)
    audioPlayer.on("playing", () => {
        if (stage) stage.setAttribute("data-audio", "playing");
        updatePlayButtonState(true);
    });

    audioPlayer.on("paused", () => {
        if (stage) stage.setAttribute("data-audio", "paused");
        updatePlayButtonState(false);
    });

    audioPlayer.on("trackchange", ({ index }) => {
        if (stage) stage.setAttribute("data-track-index", String(index));
    })

    audioPlayer.on("error", ({ error, index }) =>
     console.warn("[audio] error (index)", index, error)
    );

    // --- Preload button art to avoid first-swap flicker
    const btnArt = [
    "/assets/images/billboard/building-billboard-back-off.png",
    "/assets/images/billboard/building-billboard-back-on.png",
    "/assets/images/billboard/building-billboard-play-off.png",
    "/assets/images/billboard/building-billboard-play-on.png",
    "/assets/images/billboard/building-billboard-next-off.png",
    "/assets/images/billboard/building-billboard-next-on.png",
    ];
    (function preloadImages(urls) {
    urls.forEach(src => { const im = new Image(); im.decoding = "async"; im.src = src; });
    })(btnArt);

    function installPressedHandlers(btn, attr /* "prev" | "next" */) {
    if (!btn || !stage) return;
    const set = (pressed) => {
        if (pressed) stage.setAttribute(`data-${attr}`, "pressed");
        else stage.removeAttribute(`data-${attr}`);
    };
    // Pointer
    btn.addEventListener("pointerdown", () => set(true));
    window.addEventListener("pointerup",   () => set(false));
    btn.addEventListener("pointerleave",   () => set(false));
    btn.addEventListener("pointercancel",  () => set(false));
    btn.addEventListener("blur",           () => set(false));
    // Keyboard
    btn.addEventListener("keydown", (e) => {
        if (e.key === " " || e.code === "Space" || e.key === "Enter") set(true);
    });
    btn.addEventListener("keyup", (e) => {
        if (e.key === " " || e.code === "Space" || e.key === "Enter") set(false);
    });
    }
    installPressedHandlers(btnPrev, "prev");
    installPressedHandlers(btnNext, "next");

    // Play art is driven by audio events we already emit (data-audio="playing/paused")
});