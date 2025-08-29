// src/modules/parallax.js
/**
 * Scroll-based, background-only parallax for `.city`.
 * Robust approach: derive scroll progress from stage.getBoundingClientRect().top
 * every frame. No dependency on scrollTop / events / specific scrollers.
 *
 * Net visual speed of .city = document scroll * ratioY  (0..1, smaller = farther)
 * Respects prefers-reduced-motion and uses translate3d with scale-aware snapping.
 */

export function createParallax({ stage, adapter, config }) {
  if (!stage) throw new Error("[parallax] missing stage");
  if (!adapter) throw new Error("[parallax] missing layout adapter");

  // Single source of truth: JSON config
  let meta = { ...(config?.meta ?? {}) };
  let ratioY = isFinite(meta.ratioY) ? Number(meta.ratioY) : 0.6;
  let smooth = isFinite(meta.smooth) ? Number(meta.smooth) : 1;

  // Layers (keep future flexibility, but only .city registered now)
  let layers = Array.isArray(config?.layers) ? config.layers.slice() : [
    { selector: ".city", depth: 1 }
  ];

  // Cache elements
  const elCache = [];
  const resolveLayers = () => {
    elCache.length = 0;
    for (const layer of layers) {
      const el = stage.querySelector(layer.selector);
      if (el) elCache.push({ el, depth: layer.depth ?? 1 });
    }
  };
  resolveLayers();

  // Reduced motion
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  let enabled = !mql.matches;
  let running = false;
  let rafId = 0;

  const reflect = () => {
    stage.dataset.parallax = enabled ? "on" : "off";
  };
  reflect();

  // Safe scale + snap
  const getScale = () => {
    const s = Number(typeof adapter?.getScale === "function" ? adapter.getScale() : 1);
    return Number.isFinite(s) && s > 0 ? s : 1;
  };
  const snap = (v) => {
    const s = getScale();
    return Math.round(v * s) / s;
  };

  // Model
  let baseTop = null;   // stage top at first paint
  let targetY = 0;      // desired compensation
  let currentY = 0;     // applied compensation after smoothing

  // Compute target from stage rect each frame
  const computeFromRect = () => {
    const rectTop = stage.getBoundingClientRect().top;
    if (baseTop === null) baseTop = rectTop;      // lock baseline on first read
    const scrolled = baseTop - rectTop;           // >0 when page scrolled down
    targetY = scrolled * (1 - ratioY);            // move city down to slow it
    stage.dataset.parallaxY = String(Math.round(targetY)); // debug
  };

  // Apply to all layers
  const apply = () => {
    const y = snap(currentY);
    for (const { el, depth } of elCache) {
      el.style.transform = `translate3d(0, ${y * depth}px, 0)`;
    }
  };

  // Initial compute + apply (before first rAF)
  computeFromRect();
  currentY = smooth >= 1 ? targetY : 0;
  apply();

  // Main loop (no reliance on scroll events)
  const tick = () => {
    if (!enabled) { running = false; rafId = 0; return; }

    computeFromRect();

    if (smooth >= 1) {
      currentY = targetY;
    } else {
      const s = Math.max(0, Math.min(1, smooth));
      currentY += (targetY - currentY) * s;
    }

    apply();
    rafId = requestAnimationFrame(tick);
  };

  // Public API
  function start() {
    if (!enabled || running) return;
    running = true;
    rafId = requestAnimationFrame(tick);
  }
  function stop() {
    if (rafId) cancelAnimationFrame(rafId);
    rafId = 0;
    running = false;
  }
  function setEnabled(value) {
    const next = Boolean(value);
    if (enabled === next) return;
    enabled = next;
    reflect();
    if (enabled && !running) {
      baseTop = null;           // re-baseline on re-enable
      computeFromRect();
      start();
    } else if (!enabled && running) {
      stop();
      for (const { el } of elCache) el.style.transform = "";
      delete stage.dataset.parallaxY;
    }
  }
  function setConfig(next) {
    if (next?.meta) {
      if (isFinite(next.meta.ratioY)) ratioY = Number(next.meta.ratioY);
      if (isFinite(next.meta.smooth)) smooth = Number(next.meta.smooth);
      meta = { ...meta, ...next.meta };
    }
    if (Array.isArray(next?.layers)) {
      layers = next.layers.slice();
      resolveLayers();
    }
    baseTop = null;           // re-baseline if geometry changed
    computeFromRect();
    apply();
  }

  // Reduced motion live updates
  const onReducedMotionChange = () => setEnabled(!mql.matches);
  mql.addEventListener?.("change", onReducedMotionChange);

  if (enabled) start();

  return {
    start, stop, setEnabled, setConfig,
    _debug: () => ({
      enabled, running, ratioY, smooth,
      baseTop, currentY, targetY, scale: getScale(),
      layers: layers.map(l => l.selector)
    })
  };
}
