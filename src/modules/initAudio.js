// src/modules/initAudio.js
import { createAudioPlayer } from "./audioPlayer.js";
import { initBillboardControls } from "./billboardControls.js";

export function initAudio({ stage, controls, playlist }) {
  if (!stage || !controls || !Array.isArray(playlist)) {
    throw new Error("initAudio: stage, controls, and playlist[] are required");
  }

  const audioPlayer = createAudioPlayer({
    playlist,
    preload: "metadata",
    loopAll: true,
  });

  // Dev logs (optional)
  audioPlayer.on("trackchange", ({ index, track }) => console.log("[audio] trackchange ->", index, track?.src));
  audioPlayer.on("playing",  ({ index }) => console.log("[audio] playing (index)", index));
  audioPlayer.on("paused",   ({ index }) => console.log("[audio] paused (index)", index));
  audioPlayer.on("ended",    ({ index }) => console.log("[audio] ended (index)", index));
  audioPlayer.on("error",    ({ error, index }) => console.warn("[audio] error (index)", index, error));

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
    ],
  });

  return audioPlayer;
}
