// src/modules/billboardControls.js
// Wires billboard controls to the audio player, mirrors audio state to the DOM,
// preloads button art, and handles pressed-state visuals for prev/next.

export function initBillboardControls({ stage, controls, audioPlayer, assets = [] }) {
  if (!stage) throw new Error("billboardControls: missing stage");
  if (!controls) throw new Error("billboardControls: missing controls view");
  if (!audioPlayer) throw new Error("billboardControls: missing audio player");

  // Buttons
  const btnPrev = controls.getButton("bb-prev");
  const btnPlay = controls.getButton("bb-play");
  const btnNext = controls.getButton("bb-next");

  // Initial state -> DOM
  const state = audioPlayer.getState();
  if (stage) {
    stage.setAttribute("data-audio", state.isPlaying ? "playing" : "paused");
    stage.setAttribute("data-track-index", String(state.index ?? 0));
  }
  function updatePlayButtonState(isPlaying) {
    if (!btnPlay) return;
    btnPlay.setAttribute("aria-pressed", isPlaying ? "true" : "false");
    btnPlay.setAttribute("aria-label", isPlaying ? "Pause" : "Play");
    btnPlay.dataset.state = isPlaying ? "on" : "off";
  }
  updatePlayButtonState(state.isPlaying);

  // Controls -> audio
  const offControl = controls.onControl(({ action }) => {
    switch (action) {
      case "control-prev":        audioPlayer.prev(); break;
      case "control-next":        audioPlayer.next(); break;
      case "control-play-toggle": audioPlayer.toggle(); break;
    }
  });

  // Audio -> DOM
  const offs = [];
  offs.push(audioPlayer.on("playing", () => {
    stage.setAttribute("data-audio", "playing");
    updatePlayButtonState(true);
  }));
  offs.push(audioPlayer.on("paused", () => {
    stage.setAttribute("data-audio", "paused");
    updatePlayButtonState(false);
  }));
  offs.push(audioPlayer.on("trackchange", ({ index }) => {
    stage.setAttribute("data-track-index", String(index));
  }));
  offs.push(audioPlayer.on("error", ({ error, index }) => {
    // Keep a breadcrumb in dev; safe to remove later
    console.warn("[audio] error (index)", index, error);
  }));

  // Preload images to avoid flicker
  assets.forEach(src => { const im = new Image(); im.decoding = "async"; im.src = src; });

  // Pressed-state handlers for prev/next
  const uninstallers = [];
  function installPressedHandlers(btn, attr /* "prev" | "next" */) {
    if (!btn) return () => {};
    const set = (pressed) => {
      if (pressed) stage.setAttribute(`data-${attr}`, "pressed");
      else stage.removeAttribute(`data-${attr}`);
    };

    const onDown = () => set(true);
    const onUp = () => set(false);
    const onLeave = () => set(false);
    const onCancel = () => set(false);
    const onBlur = () => set(false);
    const onKeyDown = (e) => {
      if (e.key === " " || e.code === "Space" || e.key === "Enter") set(true);
    };
    const onKeyUp = (e) => {
      if (e.key === " " || e.code === "Space" || e.key === "Enter") set(false);
    };

    btn.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);
    btn.addEventListener("pointerleave", onLeave);
    btn.addEventListener("pointercancel", onCancel);
    btn.addEventListener("blur", onBlur);
    btn.addEventListener("keydown", onKeyDown);
    btn.addEventListener("keyup", onKeyUp);

    return () => {
      btn.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      btn.removeEventListener("pointerleave", onLeave);
      btn.removeEventListener("pointercancel", onCancel);
      btn.removeEventListener("blur", onBlur);
      btn.removeEventListener("keydown", onKeyDown);
      btn.removeEventListener("keyup", onKeyUp);
    };
  }
  uninstallers.push(installPressedHandlers(btnPrev, "prev"));
  uninstallers.push(installPressedHandlers(btnNext, "next"));

  return {
    destroy() {
      offControl && offControl();
      offs.forEach((off) => off && off());
      uninstallers.forEach((u) => u && u());
    }
  };
}
