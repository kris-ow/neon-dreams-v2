// src/modules/layoutAdapter.js
export function createLayoutAdapter({ stage, designWidth, designHeight }) {
    if (!stage) throw new Error("layoutAdapter: missing stage element")

    let scale = 1;
    let rafId = null;
    const listeners = new Set();

    stage.style.transformOrigin = "top left";

    function computeScale() {
        const vw = document.documentElement.clientWidth;
        scale = Math.min(vw / designWidth, 1);
    }

    function apply() {
        stage.style.transform = `scale(${scale})`;
        document.documentElement.style.setProperty('--computed-scale', String(scale));
        listeners.forEach((fn) => fn(scale));
    }

    function update() {
        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
            computeScale();
            apply();
        });
    }

    window.addEventListener("resize", update);
    update();

    return {    
        getScale: () => scale,
        onChange(fn) {
            listeners.add(fn);
            return () => listeners.delete(fn);
        },
        destroy() {
            window.removeEventListener("resize", update);
            if (rafId) cancelAnimationFrame(rafId);
            listeners.clear();
        }
    }
}