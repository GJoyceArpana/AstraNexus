
import Phaser from "phaser";

import BootScene from "./scenes/BootScene";
import OutpostSolScene from "../Feature/UI-UX/scenes/OutpostSolScene.ts";
import MarsWorldScene from "../Feature/UI-UX/scenes/MarsWorldScene.ts";
import SwitchboardModalScene from "../Feature/UI-UX/scenes/SwitchboardModalScene.ts";
import StartScene from "./scenes/StartScene";
import StoryScene from "./scenes/StoryScene";
import CustomizationScene from "./scenes/CustomizationScene";
import LunarWorldScene from "./scenes/LunarWorldScene";

// =============================================
// ASTRA NEXUS - GAME CONFIGURATION
// =============================================

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;

// Wait for the requested fonts before creating Phaser.
await Promise.all([
    document.fonts.load('700 24px "Orbitron"'),
    document.fonts.load('700 20px "Nunito"'),
    document.fonts.ready
]);

// =============================================
// GLOBAL FULLSCREEN SYSTEM (Hotkeys F & F11 + Button)
// =============================================

function toggleFullscreen() {
    if (!document.fullscreenElement) {
        const el = document.documentElement;
        if (el.requestFullscreen) {
            el.requestFullscreen().catch(() => {});
        } else if ((el as any).webkitRequestFullscreen) {
            (el as any).webkitRequestFullscreen();
        } else if ((el as any).msRequestFullscreen) {
            (el as any).msRequestFullscreen();
        }
    } else {
        if (document.exitFullscreen) {
            document.exitFullscreen().catch(() => {});
        } else if ((document as any).webkitExitFullscreen) {
            (document as any).webkitExitFullscreen();
        } else if ((document as any).msExitFullscreen) {
            (document as any).msExitFullscreen();
        }
    }
}

function updateFullscreenVisuals() {
    const fsBtn = document.getElementById("fullscreen-btn");
    const fsIcon = document.getElementById("fs-icon");
    const fsText = document.getElementById("fs-text");

    const isFs = Boolean(document.fullscreenElement);
    if (fsIcon) fsIcon.textContent = isFs ? "🗗" : "⛶";
    if (fsText) fsText.textContent = isFs ? "EXIT FULLSCREEN [F]" : "FULLSCREEN [F]";
    if (fsBtn) {
        fsBtn.style.borderColor = isFs ? "#FFD600" : "#00E5FF";
        fsBtn.style.color = isFs ? "#FFD600" : "#00E5FF";
        fsBtn.style.boxShadow = isFs ? "0 0 16px rgba(255, 214, 0, 0.4)" : "0 0 16px rgba(0, 229, 255, 0.35)";
    }
}

const fsBtn = document.getElementById("fullscreen-btn");
if (fsBtn) {
    fsBtn.addEventListener("click", () => {
        toggleFullscreen();
    });
}

document.addEventListener("fullscreenchange", updateFullscreenVisuals);
document.addEventListener("webkitfullscreenchange", updateFullscreenVisuals);

window.addEventListener("keydown", (e) => {
    if ((e.key === "f" || e.key === "F") && !e.ctrlKey && !e.metaKey && !e.altKey) {
        const active = document.activeElement;
        if (active && (active.tagName === "INPUT" || active.tagName === "TEXTAREA")) return;
        toggleFullscreen();
    }
});

// =============================================
// GLOBAL PAGE STYLING
// =============================================

document.documentElement.style.cssText = `
    margin: 0;
    padding: 0;
    width: 100%;
    height: 100%;
    overflow: hidden;
`;

document.body.style.cssText = `
    margin: 0;
    padding: 0;
    width: 100%;
    min-height: 100vh;
    overflow: hidden;
    background: #15172D;
    font-family: "Nunito", sans-serif;
`;

const app = document.getElementById("app");

if (app) {
    Object.assign(app.style, {
        width: "100%",
        height: "100vh",
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
        background: "#15172D",
        position: "relative"
    });
}

// =============================================
// PHASER CONFIGURATION
// =============================================

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,

    parent: "app",

    width: GAME_WIDTH,
    height: GAME_HEIGHT,

    backgroundColor: "#15172D",

    render: {
        antialias: true,
        pixelArt: false,
        roundPixels: false,
        powerPreference: "high-performance",
        transparent: false
    },

    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
        width: GAME_WIDTH,
        height: GAME_HEIGHT,
        fullscreenTarget: "app",
        expandParent: true,
        min: {
            width: 320,
            height: 180
        }
    },

    physics: {
        default: "arcade",
        arcade: {
            debug: false
        }
    },

    input: {
        activePointers: 3,
        smoothFactor: 0.2
    },

    disableContextMenu: true,

    fps: {
        target: 60,
        forceSetTimeOut: false
    },

    scene: [
        BootScene,
        OutpostSolScene,
        MarsWorldScene,
        SwitchboardModalScene,
        StartScene,
        StoryScene,
        CustomizationScene,
        LunarWorldScene
    ],

    loader: {
        maxParallelDownloads: 8,
        crossOrigin: "anonymous"
    },

    dom: {
        createContainer: true
    },

    audio: {
        disableWebAudio: false
    },

    title: "ASTRA NEXUS | MarsBase Mission",

    banner: false
};

// =============================================
// INITIALIZE GAME
// =============================================

const game = new Phaser.Game(config);

// =============================================
// CANVAS STYLING
// =============================================

game.events.once("ready", () => {
    const canvas = game.canvas;

    if (canvas) {
        Object.assign(canvas.style, {
            display: "block",
            width: "100%",
            height: "100%",
            objectFit: "contain",
            borderRadius: "0px",
            outline: "none"
        });
    }
});

// =============================================
// RESPONSIVE RESIZE
// =============================================

window.addEventListener("resize", () => {
    game.scale.refresh();
});

// =============================================
// KEYBOARD BEHAVIOUR
// =============================================

window.addEventListener("keydown", (event) => {
    const blockedKeys = [
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        " "
    ];

    if (blockedKeys.includes(event.key)) {
        event.preventDefault();
    }
});

// =============================================
// DEBUGGING
// =============================================

if (import.meta.env.DEV) {
    console.log(
        "%c🚀 ASTRA NEXUS INITIALIZED",
        "color:#65E5FF;font-size:18px;font-weight:bold;background:#07172E;padding:10px;"
    );

    console.log(
        "%cMISSION: MARSBASE EXPLORATION",
        "color:#FF9B70;font-size:13px;"
    );

    console.log(
        "%cSTATUS: SYSTEMS ONLINE",
        "color:#40FFAA;font-size:12px;"
    );

    console.log(
        "Orbitron loaded:",
        document.fonts.check('700 24px "Orbitron"')
    );

    console.log(
        "Nunito loaded:",
        document.fonts.check('700 20px "Nunito"')
    );
}

export default game;
