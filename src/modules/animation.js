// src/modules/animation.js

/**
 * Enable CSS steps() sprite animation.
 * For full-canvas apartment sheets:
 * - Anchor at (0,0)
 * - Size to the whole stage (so each frame fills the stage)
 * - Use longhand animation properties (avoid shorthand conflicts)
 */

function findZoneRect(zonesData, id) {
  const zones = zonesData?.zones || [];
  const meta  = zonesData?.meta || {};
  const DW = Number(meta.designWidth)  || 800;
  const DH = Number(meta.designHeight) || 2600;

  const z = zones.find(o => o?.id === id);
  if (!z) return null;

  // Accept either flat {x,y,w,h} or nested {rect:{...}}
  const r = z.rect || z;

  // Case 1: pixels
  if (Number.isFinite(r.x) && Number.isFinite(r.y)) {
    return { x: r.x, y: r.y, w: r.w ?? 200, h: r.h ?? 650 };
  }

  // Case 2: percents
  if (Number.isFinite(r.xPct) && Number.isFinite(r.yPct)) {
    const toPx = (pct, total) => (Number(pct) / 100) * total;
    return {
      x: toPx(r.xPct, DW),
      y: toPx(r.yPct, DH),
      w: r.wPct ? toPx(r.wPct, DW) : 200,
      h: r.hPct ? toPx(r.hPct, DH) : 650,
    };
  }

  return null;
}

export function enableSpriteStepsBox({
  stage,
  zonesData,
  zoneId,
  frames,
  fps = 6,
  layout = "horizontal",         // "horizontal" or "vertical"
  sprite,                         // URL to the sprite sheet
  frameWidth = 200,               // not used for full-canvas sizing, kept for small-sprite future use
  frameHeight = 650,
  zIndex = 51,                    // above .apartment (50)
}) {
  // Minimal guards
  if (!stage || !frames || !sprite) return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // For full-canvas overlays we ignore the zone; but keep this call for future small-sprite use.
  // const rect = findZoneRect(zonesData, zoneId);

  // === Full-canvas sprite: fill the stage and anchor at (0,0) ===
  const boxW = Math.round(stage.clientWidth);   // expected 800
  const boxH = Math.round(stage.clientHeight);  // expected 2600
  const left = 0;
  const top  = 0;

  // Hide the original static image (avoid double paint)
  if (zoneId) {
    const hostEl = stage.querySelector(`.layer.apartment.${zoneId}`);
    if (hostEl) hostEl.style.visibility = "hidden";
  }

  // Create the sprite container
  const el = document.createElement("div");
  el.className = `ap-sprite ${zoneId || ""}`.trim();
  el.style.position = "absolute";
  el.style.left = `${left}px`;
  el.style.top = `${top}px`;
  el.style.width = `${boxW}px`;
  el.style.height = `${boxH}px`;
  el.style.zIndex = String(zIndex);
  el.style.pointerEvents = "none";             // match .layer behavior
  el.style.imageRendering = "pixelated";
  el.style.backfaceVisibility = "hidden";
  el.style.willChange = "background-position";

  // Sprite sheet setup
  // Each frame should fill the whole stage; total sheet width/height = frames * frame-size on the scrolling axis
  el.style.setProperty("--frame-w", `${boxW}px`);
  el.style.setProperty("--frame-h", `${boxH}px`);
  el.style.setProperty("--frames", String(frames));

  el.style.backgroundImage = `url(${sprite})`;
  el.style.backgroundRepeat = "no-repeat";
  el.style.backgroundPosition = "0 0";

  if (layout === "vertical") {
    // Vertical strip: height grows by frames, width stays 100%
    el.style.backgroundSize = `100% ${boxH * frames}px`;
  } else {
    // Horizontal strip: width grows by frames, height stays 100%
    el.style.backgroundSize = `${boxW * frames}px 100%`;
  }

  // Animation (LONGHAND — no shorthand to avoid conflicts)
  const duration = frames / fps; // seconds per loop
  el.style.animationName = layout === "vertical" ? "sprite-anim-y" : "sprite-anim";
  el.style.animationDuration = `${duration}s`;
  el.style.animationTimingFunction = `steps(${frames})`; // critical: only steps()
  el.style.animationIterationCount = "infinite";
  el.style.animationFillMode = "none";
  el.style.animationDirection = "normal";
  el.style.animationDelay = "0s";
  // NOTE: Do NOT set 'animation' shorthand anywhere else for this element.

  stage.appendChild(el);

  // Teardown helper
  return () => {
    el.remove();
    if (zoneId) {
      const hostEl = stage.querySelector(`.layer.apartment.${zoneId}`);
      if (hostEl) hostEl.style.visibility = "";
    }
  };
}

/**
 * Data-driven init — for now we use full-canvas anchoring for apartment sheets.
 */
export function initAnimations({ stage, config, zonesData }) {
  if (!stage || !config) return;

  for (const [key, entry] of Object.entries(config)) {
    if (!entry || entry.type !== "sprite-steps") continue;

    enableSpriteStepsBox({
      stage,
      zonesData,
      zoneId: key,
      frames: entry.frames,
      fps: entry.fps,
      layout: entry.layout,
      sprite: entry.sprite,
      frameWidth: entry.frameWidth ?? 200,
      frameHeight: entry.frameHeight ?? 650,
      zIndex: 51,
    });
  }
}
