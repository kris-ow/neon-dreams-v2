// src/modules/parallax.js
/**
 * Background-only parallax for the `.city` layer.
 * - Anchors to the TOP of the stage so any shortfall is clipped at the BOTTOM.
 * - Progress is derived from the stage's own scroll range (robust to any scroller).
 * - Respects prefers-reduced-motion.
 * - Supports smoothing and live scale from your layout adapter.
 *
 * Config (from JSON):
 *   meta.ratioY  ∈ [0..1]    // smaller = farther (moves less)
 *   meta.smooth  ∈ [0..1]    // 0 = snap, 1 = no movement; try 0.15..0.25
 */

export function createParallax({ stage, adapter, config }) {
  if (!stage) throw new Error("[parallax] missing stage");
  if (!adapter) throw new Error("[parallax] missing layout adapter");

  // ----- Config -----
  let meta = { ...(config?.meta ?? {}) };
  let ratioY = isFinite(meta.ratioY) ? Number(meta.ratioY) : 0.6;   // how “far” the city feels
  let smooth = isFinite(meta.smooth) ? Number(meta.smooth) : 0.18;  // easing for lerp

  // Layers
  const city = stage.querySelector(".city");
  if (!city) throw new Error("[parallax] .city layer not found");

  // Reduced motion
  const mql = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  let enabled = !mql?.matches;

  // Animation state
  let rafId = 0;
  let running = false;
  let currentY = 0; // lerped value (px)

  // Helpers
  const clamp01 = (v) => Math.min(1, Math.max(0, v));
  const lerp = (a, b, t) => a + (b - a) * t;

  // Pull current scale from your adapter (it should expose this)
  const getScale = () => {
    if (typeof adapter.getScale === "function") return adapter.getScale();
    // fallback: read CSS var if adapter doesn’t expose it
    const cs = getComputedStyle(document.documentElement);
    const v = parseFloat(cs.getPropertyValue("--computed-scale")) || 1;
    return v;
  };

  // Compute how much the stage can scroll within the viewport (its own range)
  function measure() {
    const rect = stage.getBoundingClientRect();
    const stageHeight = rect.height;           // already includes adapter scale
    const viewH = window.innerHeight || 0;
    const scrollRange = Math.max(0, stageHeight - viewH); // px
    return { rect, stageHeight, viewH, scrollRange };
  }

  // Main step: anchor to top, move city “less” than stage scrolls inside viewport
  function step() {
    const { rect, scrollRange } = measure();

    const progress = scrollRange > 0 ? clamp01((-rect.top) / scrollRange) : 0;
    const s = scrollRange * progress;                 // stage scroll amount (px)

    // NEW: tell CSS how much extra height to shave off so the page ends at the building bottom
    const parallaxSlack = Math.max(0, (1 - ratioY) * scrollRange);
    document.documentElement.style.setProperty("--parallax-cut", `${parallaxSlack.toFixed(2)}px`);

    // Net effect in viewport: city Y = -s (stage) + targetY (this) = -ratioY * s
    const targetY = (1 - ratioY) * s;                 // ← fixed sign

    if (smooth <= 0) {
      currentY = targetY;
    } else {
      currentY = lerp(currentY, targetY, smooth);
      if (Math.abs(currentY - targetY) < 0.1) currentY = targetY;
    }

    city.style.transform = `translate3d(0, ${currentY.toFixed(2)}px, 0)`;
    rafId = running ? requestAnimationFrame(step) : 0;
  }

  function start() {
    if (!enabled || running) return;
    running = true;
    cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(step);
    stage.setAttribute("data-parallax", "on");
  }

  function stop() {
    running = false;
    cancelAnimationFrame(rafId);
    rafId = 0;
    // Reset transform so top is cleanly aligned
    city.style.transform = "translate3d(0, 0, 0)";
    document.documentElement.style.setProperty("--parallax-cut", "0px");
    stage.setAttribute("data-parallax", "off");
  }

  function setEnabled(v) {
    enabled = !!v && !mql?.matches;
    if (enabled) start(); else stop();
  }

  function setConfig(next) {
    if (!next) return;
    const m = next.meta || next;
    if (m && isFinite(m.ratioY)) ratioY = Number(m.ratioY);
    if (m && isFinite(m.smooth)) smooth = Number(m.smooth);
  }

  // Reduced-motion listener
  const onRMChange = () => setEnabled(!mql.matches);
  mql?.addEventListener?.("change", onRMChange);

  // Resize / scale changes (adapter should emit or you can listen to resize)
  const onResize = () => {
    // Force one immediate realign on resize to avoid visible jump
    currentY = 0;
    if (running) {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(step);
    }
  };
  window.addEventListener("resize", onResize);

  // Kick off
  if (enabled) start();

  return {
    start, stop, setEnabled, setConfig,
    destroy() {
      window.removeEventListener("resize", onResize);
      mql?.removeEventListener?.("change", onRMChange);
      stop();
    }
  };
}
