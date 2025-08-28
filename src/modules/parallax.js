// src/modules/parallax.js

import { resolveEnvPrefix } from "vite";

/**
 * Background-only parallax (skeleton).
 * - Gates on prefers-reduced-motion.
 * - Single rAF loop (placeholder; no transforms yet).
 * - Exposes start/stop/setEnabled/setConfig.
 */

export function createParallax({ stage, adapter, config }) {
    if (!stage) throw new Error("[parallax] missing stage");
    if (!adapter) throw new Error("[parallax] missing layout adapter");

    // Config with sane defaults
    let meta = {
        ampX: 10,
        ampY: 6,
        smooth: 0.12,
        ...(config?.meta ?? {})
    };

    let layers = Array.isArray(config?.layers) ? config.layers.slice() : [
        { selector: ".city", depth: 1.0}
    ];

    // Cache layer elements now for fast writes later
    const elCache = new Map();
    const resolveLayers = () => {
        elCache.clear();
        for (const layer of layers) {
            const el = stage.querySelector(layer.selector);
            if (el) elCache.set(layer.selector, { el, depth: layer.depth ?? 1.0 });
        }
    };
    resolveLayers();

    // Reduced motion gate
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    let enabled = !mql.matches;
    let running = false;
    let rafId = 0;

    // Reflect state on the stage for debug CSS
     const reflect = () => {
        stage.dataset.parallax = enabled ? "on" : "off";
     };
     reflect();

     const tick = (t) => {
        // Early out if disabled
        if (!enabled) {
            running = false;
            rafId = 0;
            return;
        }

        // Placeholder render path (no pointer math yet)
        // Keep loop alive to verify gating & single rAF behavior
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
        running = false;
        rafId = 0;
     }

     function setEnabled(value) {
        const next = Boolean(value);
        if (enabled === next) return;
        enabled = next;
        reflect();
        if (enabled && !running) start();
        if (!enabled && running) stop();
     }

     function setConfig(nextConfig = {}) {
        meta = { ...meta, ...(nextConfig.meta ?? {}) };
        if (Array.isArray(nextConfig.layers)) {
            layers = nextConfig.layers.slice();
            resolveLayers();
        }
     }

     // React live to system setting changes
     const onReducedMotionChange = () => {
        setEnabled(!mql.matches);
     };
     mql.addEventListener("change", onReducedMotionChange);
     
     // Start automatically if not reduced-motion
     if (enabled) start();

     return {
         start,
         stop,
         setEnabled,
         setConfig,
         // (optional) expose internals useful for debugging/dev overlay
        _debug: () => ({ enabled, running, layers: [...elCache.keys()], meta })
     };
}