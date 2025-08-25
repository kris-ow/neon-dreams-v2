// src/main.js
import './styles/scaffold.css';
import zonesData from "./data/zones.json";
import { createLayoutAdapter } from "./modules/layoutAdapter.js";
import { createDevOverlay } from "./modules/devOverlay.js";

document.addEventListener("DOMContentLoaded", () => {
    const stage = document.querySelector(".stage");
    const designWidth = zonesData?.meta?.designWidth ?? 800;
    const designHeight = zonesData?.meta?.designHeight ?? 2600;

    const adapter = createLayoutAdapter({ stage, designWidth, designHeight });

    createDevOverlay({ stage, zonesData, adapter, initiallyVisible: true });
})