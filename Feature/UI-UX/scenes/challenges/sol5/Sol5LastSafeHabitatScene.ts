import Phaser from "phaser";
import UITheme from "../../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../../components/ButtonFactory.ts";
import { Sol5ResourceManager } from "./Sol5ResourceManager.ts";
import { Sol5InventoryManager } from "./Sol5InventoryManager.ts";
import { Sol5HUD } from "./Sol5HUD.ts";
import { Sol5ResultsModal } from "./Sol5ResultsModal.ts";
import { AirLeakPuzzle } from "./AirLeakPuzzle.ts";
import { CircuitPuzzle } from "./CircuitPuzzle.ts";
import { PressurePuzzle } from "./PressurePuzzle.ts";
import { StructuralRepairPuzzle } from "./StructuralRepairPuzzle.ts";
import type { SubsystemId, Sol5MissionResults } from "./types.ts";

interface DamagedStation {
    id: SubsystemId;
    name: string;
    icon: string;
    x: number;
    y: number;
    interactRadius: number;
    actionHint: string;
    isRepaired: boolean;
    spriteContainer: Phaser.GameObjects.Container;
    statusBadge: Phaser.GameObjects.Text;
    beaconLight: Phaser.GameObjects.Arc;
}

interface SupplyCrate {
    id: string;
    name: string;
    x: number;
    y: number;
    isLooted: boolean;
    interactRadius: number;
    container: Phaser.GameObjects.Container;
    badge: Phaser.GameObjects.Text;
}

export class Sol5LastSafeHabitatScene extends Phaser.Scene {
    private readonly W = 1280;
    private readonly H = 720;

    // Player Astronaut
    private astronaut!: Phaser.GameObjects.Image;
    private callsignBadge?: Phaser.GameObjects.Text;
    private moveSpeed = 220;
    private walkTimer = 0;

    // Persistent Astronaut Suit Details
    private equippedGender: "boy" | "girl" = "boy";
    private equippedSuitName = "ALPHA RECON EVA";
    private equippedSuitFrame = 1;
    private equippedSuitColor = 0xFF7043;
    private equippedCallsign = "Cadet Orion";

    // Input Controls
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private keys!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
        E: Phaser.Input.Keyboard.Key;
        H: Phaser.Input.Keyboard.Key;
    };

    // Core Mission Managers & Systems
    private resourceManager!: Sol5ResourceManager;
    private inventoryManager!: Sol5InventoryManager;
    private hud!: Sol5HUD;

    // Active Modals & Puzzles
    private activePuzzle?: AirLeakPuzzle | CircuitPuzzle | PressurePuzzle | StructuralRepairPuzzle;
    private resultsModal?: Sol5ResultsModal;
    private pauseModal?: Phaser.GameObjects.Container;
    private guideModal?: Phaser.GameObjects.Container;
    private introModal?: Phaser.GameObjects.Container;
    private tutorialModal?: Phaser.GameObjects.Container;

    // Interactive Stations & Crates
    private stations: DamagedStation[] = [];
    private crates: SupplyCrate[] = [];
    private nearbyStation: DamagedStation | null = null;
    private nearbyCrate: SupplyCrate | null = null;
    private missionEnded = false;

    // Interaction Prompt on ground
    private promptContainer!: Phaser.GameObjects.Container;
    private promptText!: Phaser.GameObjects.Text;

    // Environmental Effects
    private emergencyLightingGraphics!: Phaser.GameObjects.Graphics;
    private dustParticles: { x: number; y: number; speed: number; size: number }[] = [];
    private dustGraphics!: Phaser.GameObjects.Graphics;

    constructor() {
        super("Sol5LastSafeHabitatScene");
    }

    preload() {
        // Base structures & gadgets
        if (!this.textures.exists("base-station")) {
            this.load.image("base-station", "/assets/game/base/base-station.png");
        }
        if (!this.textures.exists("greenhouse")) {
            this.load.image("greenhouse", "/assets/game/base/greenhouse.png");
        }
        if (!this.textures.exists("solar-panels")) {
            this.load.image("solar-panels", "/assets/game/base/solar-panels.png");
        }
        if (!this.textures.exists("oxygen-cylinder")) {
            this.load.image("oxygen-cylinder", "/assets/game/base/oxygen-cylinder.png");
        }
        if (!this.textures.exists("sol5-air-manifold")) {
            this.load.image("sol5-air-manifold", "/assets/game/base/sol5-air-distribution-manifold.png");
        }
        if (!this.textures.exists("sol5-electrical-junction")) {
            this.load.image("sol5-electrical-junction", "/assets/game/base/sol5-electrical-grid-junction.png");
        }
        if (!this.textures.exists("sol5-pressure-regulator")) {
            this.load.image("sol5-pressure-regulator", "/assets/game/base/sol5-oxygen-pressure-regulator.png");
        }
        if (!this.textures.exists("sol5-hull-breaches")) {
            this.load.image("sol5-hull-breaches", "/assets/game/base/sol5-exterior-hull-breaches.png");
        }
        if (!this.textures.exists("mars_terrain")) {
            this.load.image("mars_terrain", "/assets/game/mars/jezero-ctx-mosaic-3x3.png");
        }
        if (!this.textures.exists("tool-box")) {
            this.load.image("tool-box", "/assets/gadgets/tool box.png");
        }
        if (!this.textures.exists("spanner")) {
            this.load.image("spanner", "/assets/gadgets/spanner.png");
        }
        if (!this.textures.exists("first-aid-kit")) {
            this.load.image("first-aid-kit", "/assets/gadgets/first aid kit.png");
        }
        if (!this.textures.exists("wires")) {
            this.load.image("wires", "/assets/gadgets/wires.png");
        }

        // Preload Astronaut avatar frames
        for (let i = 1; i <= 5; i++) {
            if (!this.textures.exists(`boy_avatar_${i}`)) {
                this.load.image(`boy_avatar_${i}`, `/assets/customization/boy_avatar_${i}.png`);
            }
            if (!this.textures.exists(`girl_avatar_${i}`)) {
                this.load.image(`girl_avatar_${i}`, `/assets/customization/girl_avatar_${i}.png`);
            }
        }
    }

    create() {
        this.cameras.main.setBackgroundColor("#050914");

        // Scene.restart() reuses the scene instance. Clear all transient
        // references so a closed results modal cannot keep blocking input.
        this.activePuzzle = undefined;
        this.resultsModal = undefined;
        this.pauseModal = undefined;
        this.guideModal = undefined;
        this.stations = [];
        this.crates = [];
        this.nearbyStation = null;
        this.nearbyCrate = null;
        this.missionEnded = false;

        // 1. Read player's persistent suit customization
        this.loadPersistentCustomization();

        // 2. Initialize Core Mission Managers
        this.inventoryManager = new Sol5InventoryManager({
            onInventoryChanged: (inv) => {
                this.hud.updateInventory(inv);
            },
            onItemLooted: (text) => {
                SoundFX.playToggle(true);
                this.hud.showAlertToast(text, false);
            }
        });

        this.resourceManager = new Sol5ResourceManager({
            onResourceUpdate: (state) => {
                this.hud.updateResources(state);
            },
            onCriticalAlert: (msg, isHazard) => {
                this.hud.showAlertToast(msg, isHazard);
            },
            onMissionFail: (results) => {
                this.handleMissionEnd(results);
            },
            onMissionVictory: (results) => {
                this.handleMissionEnd(results);
            }
        });

        // 3. Build Damaged Habitat Environment
        this.createHabitatEnvironment();

        // 4. Create Damaged Repair Stations & Supply Crates
        this.createRepairStations();
        this.createSupplyCrates();

        // 5. Create Player Astronaut
        this.createPlayerAstronaut();

        // 6. Setup Controls
        this.setupInputControls();

        // 7. Interaction Prompt HUD
        this.createInteractionPrompt();

        // 8. Top & Bottom Visor HUD
        this.hud = new Sol5HUD(this, {
            onPause: () => this.togglePauseMenu(),
            onOpenGuide: () => this.showMissionGuide()
        });

        // Initial HUD values
        this.hud.updateResources(this.resourceManager.getState());
        this.hud.updateInventory(this.inventoryManager.getInventory());

        this.showMissionIntroduction();

        // 9. Initial Emergency Dispatch Warning Toast
        this.time.delayedCall(800, () => {
            this.hud.showAlertToast("⚠ EMERGENCY PROTOCOL: DUST GALE DAMAGED CRITICAL HABITAT SYSTEMS! INVESTIGATE STATIONS.", true);
        });

        this.cameras.main.fadeIn(600, 10, 5, 15);
    }

    private loadPersistentCustomization() {
        let custom = this.registry.get("astronautCustomization") as any;
        if (!custom && typeof window !== "undefined" && window.localStorage) {
            try {
                const raw = localStorage.getItem("astra_astronaut_suit");
                if (raw) custom = JSON.parse(raw);
            } catch {
                // Ignore
            }
        }
        if (custom) {
            this.equippedGender = custom.gender === "girl" ? "girl" : "boy";
            this.equippedSuitName = custom.suitName || (this.equippedGender === "girl" ? "NEKO COSMIC EVA" : "ALPHA RECON EVA");
            this.equippedSuitFrame = custom.avatarFrame || 1;
            this.equippedSuitColor = custom.suitColor || 0xFF7043;
            this.equippedCallsign = custom.callsign || "Cadet Orion";
        }
    }

    private createHabitatEnvironment() {
        // Deep background: Martian dust gale swirling outside panoramic habitat windows
        const bgSky = this.add.graphics().setDepth(-30);
        bgSky.fillGradientStyle(0x1B070A, 0x1B070A, 0x36120C, 0x36120C, 1);
        bgSky.fillRect(0, 0, this.W, this.H);

        // Outside Terrain (visible through windows)
        if (this.textures.exists("mars_terrain")) {
            const terrain = this.add.image(this.W / 2, 280, "mars_terrain");
            terrain.setDisplaySize(this.W, 360);
            terrain.setTint(0x9E3B20);
            terrain.setAlpha(0.65);
            terrain.setDepth(-29);
        }

        // Swirling Dust Gale Particles
        this.dustGraphics = this.add.graphics().setDepth(-28);
        for (let i = 0; i < 50; i++) {
            this.dustParticles.push({
                x: Math.random() * this.W,
                y: Math.random() * 380,
                speed: 120 + Math.random() * 200,
                size: 1 + Math.random() * 2.5
            });
        }

        // Habitat Interior Structural Floor & Bulkhead Walls
        const floorG = this.add.graphics().setDepth(-20);
        // Heavy pressurized titanium/composite floor tiles (y = 280 to 720)
        floorG.fillStyle(0x0C182A, 1);
        floorG.fillRect(40, 280, this.W - 80, this.H - 310);
        floorG.lineStyle(3, UITheme.colors.panelBorder, 1);
        floorG.strokeRect(40, 280, this.W - 80, this.H - 310);

        // Floor Grid Lines
        floorG.lineStyle(1, 0x142842, 0.6);
        for (let x = 120; x < this.W - 80; x += 120) {
            floorG.lineBetween(x, 280, x, this.H - 30);
        }
        for (let y = 340; y < this.H - 30; y += 60) {
            floorG.lineBetween(40, y, this.W - 40, y);
        }

        // Habitat Wall Frames & Panoramic Observation Windows (y = 120 to 280)
        const wallG = this.add.graphics().setDepth(-22);
        wallG.fillStyle(0x060E1A, 0.98);
        wallG.fillRect(40, 120, this.W - 80, 160);

        // Window Cutouts showing the red Mars storm outside
        const windowRects = [
            [120, 140, 220, 120],
            [400, 140, 220, 120],
            [680, 140, 220, 120],
            [960, 140, 200, 120]
        ];
        wallG.lineStyle(3, UITheme.colors.panelBorder, 1);
        for (const [wx, wy, ww, wh] of windowRects) {
            wallG.fillStyle(0x1F0A0E, 0.4);
            wallG.fillRoundedRect(wx, wy, ww, wh, 8);
            wallG.strokeRoundedRect(wx, wy, ww, wh, 8);
        }

        // Warning Hazard Stripes on Habitat Foundation
        const hazardG = this.add.graphics().setDepth(-18);
        hazardG.fillStyle(UITheme.colors.solarGold, 0.25);
        for (let x = 60; x < this.W - 80; x += 30) {
            hazardG.fillTriangle(x, 280, x + 15, 280, x + 5, 290);
        }

        // Emergency Revolving Red Alarm Beacons & Floor LED Strips
        this.emergencyLightingGraphics = this.add.graphics().setDepth(-15);
    }

    private createRepairStations() {
        const stationConfigs = [
            {
                id: "air_distribution" as SubsystemId,
                name: "AIR DISTRIBUTION MANIFOLD",
                icon: "💨",
                x: 210,
                y: 420,
                interactRadius: 110,
                actionHint: "Press [ E ] to Repair Leaking Air Pipes"
            },
            {
                id: "electrical_grid" as SubsystemId,
                name: "MAIN ELECTRICAL GRID JUNCTION",
                icon: "⚡",
                x: 480,
                y: 360,
                interactRadius: 110,
                actionHint: "Press [ E ] to Restore Power Circuit"
            },
            {
                id: "oxygen_regulation" as SubsystemId,
                name: "O₂ PRESSURE REGULATION CONSOLE",
                icon: "🎛️",
                x: 780,
                y: 370,
                interactRadius: 110,
                actionHint: "Press [ E ] to Calibrate Pressure Valves"
            },
            {
                id: "structural_hull" as SubsystemId,
                name: "COMPROMISED EXTERIOR HULL WALL",
                icon: "🛡️",
                x: 1080,
                y: 440,
                interactRadius: 120,
                actionHint: "Press [ E ] to Seal Structural Breaches"
            }
        ];

        const machineTextures: Record<SubsystemId, string> = {
            air_distribution: "sol5-air-manifold",
            electrical_grid: "sol5-electrical-junction",
            oxygen_regulation: "sol5-pressure-regulator",
            structural_hull: "sol5-hull-breaches"
        };
        const stationAccents: Record<SubsystemId, number> = {
            air_distribution: 0x35D9E8,
            electrical_grid: 0xFFC857,
            oxygen_regulation: 0x61D8A6,
            structural_hull: 0xFF827D
        };

        for (const cfg of stationConfigs) {
            const c = this.add.container(cfg.x, cfg.y).setDepth(15);
            const accent = stationAccents[cfg.id];

            // A compact habitat service bay frames each machine without covering its controls.
            const surround = this.add.graphics();
            surround.fillStyle(0x08182B, 0.96);
            surround.fillRoundedRect(-104, -91, 208, 190, 14);
            surround.lineStyle(2, accent, 0.72);
            surround.strokeRoundedRect(-104, -91, 208, 190, 14);
            surround.fillStyle(accent, 0.13);
            surround.fillRoundedRect(-94, -81, 188, 5, 2);
            surround.lineStyle(1, 0x294766, 0.85);
            surround.lineBetween(-88, 68, 88, 68);
            c.add(surround);

            // Low cyan floor glow visually anchors the machine to the habitat deck.
            const floorGlow = this.add.ellipse(0, 84, 178, 24, accent, 0.2);
            c.add(floorGlow);

            const machine = this.add.image(0, -14, machineTextures[cfg.id]);
            machine.setDisplaySize(174, 136);
            c.add(machine);

            // Beacon LED and status remain readable above the sprite.
            const beaconLight = this.add.circle(88, -71, 5, UITheme.colors.emergencyRed);
            c.add(beaconLight);

            const nameTag = this.add.text(0, 49, cfg.name, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "8.5px",
                color: "#E8F3FC",
                align: "center",
                fontStyle: "bold",
                wordWrap: { width: 188, useAdvancedWrap: true }
            }).setOrigin(0.5);
            c.add(nameTag);

            const statusBadge = this.add.text(0, -72, "⚠ OFFLINE", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "8.5px",
                color: UITheme.colors.emergencyRedStr,
                fontStyle: "bold",
                backgroundColor: "#030B18EE",
                padding: { x: 6, y: 2 }
            }).setOrigin(0.5);
            c.add(statusBadge);

            const stationData: DamagedStation = {
                id: cfg.id,
                name: cfg.name,
                icon: cfg.icon,
                x: cfg.x,
                y: cfg.y,
                interactRadius: cfg.interactRadius,
                actionHint: cfg.actionHint,
                isRepaired: false,
                spriteContainer: c,
                statusBadge,
                beaconLight
            };

            this.stations.push(stationData);
        }
    }

    private createSupplyCrates() {
        const crateConfigs = [
            { id: "crate_pipes", name: "PIPE CONDUIT LOCKER", x: 130, y: 580 },
            { id: "crate_circuits", name: "RELAY & FUSE CRATE", x: 420, y: 610 },
            { id: "crate_valves", name: "VALVE SPARES BIN", x: 700, y: 600 },
            { id: "crate_patches", name: "COMPOSITE PATCH CACHE", x: 1180, y: 590 }
        ];

        for (const cfg of crateConfigs) {
            const c = this.add.container(cfg.x, cfg.y).setDepth(14);

            const box = this.add.graphics();
            box.fillStyle(0x132C48, 1);
            box.fillRoundedRect(-30, -20, 60, 40, 6);
            box.lineStyle(1.5, UITheme.colors.solarGold, 0.9);
            box.strokeRoundedRect(-30, -20, 60, 40, 6);
            c.add(box);

            const icon = this.add.text(0, -2, "📦", {
                fontSize: "16px"
            }).setOrigin(0.5);
            c.add(icon);

            const badge = this.add.text(0, -32, cfg.name, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "8px",
                color: UITheme.colors.solarGoldStr,
                fontStyle: "bold",
                backgroundColor: "#030A14EE",
                padding: { x: 4, y: 2 }
            }).setOrigin(0.5);
            c.add(badge);

            const crateData: SupplyCrate = {
                id: cfg.id,
                name: cfg.name,
                x: cfg.x,
                y: cfg.y,
                isLooted: false,
                interactRadius: 85,
                container: c,
                badge
            };

            this.crates.push(crateData);
        }
    }

    private createPlayerAstronaut() {
        const suitKey = `${this.equippedGender}_avatar_${this.equippedSuitFrame}`;
        const avatarKey = this.textures.exists(suitKey) ? suitKey : `${this.equippedGender}_walk_1`;

        // Start player near Central Command
        this.astronaut = this.add.image(620, 480, avatarKey);
        this.astronaut.setScale(0.28);
        this.astronaut.setDepth(25);

        // Callsign Badge
        this.callsignBadge = this.add.text(
            620,
            480 - 84,
            `${this.equippedCallsign.toUpperCase()} · ${this.equippedSuitName}`,
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: `#${this.equippedSuitColor.toString(16).padStart(6, "0")}`,
                fontStyle: "bold",
                backgroundColor: "#051120EE",
                padding: { x: 7, y: 2 }
            }
        ).setOrigin(0.5).setDepth(26);
    }

    private setupInputControls() {
        if (!this.input.keyboard) return;

        this.input.enabled = true;
        this.input.keyboard.enabled = true;
        this.input.keyboard.manager.enabled = true;
        this.input.keyboard.resetKeys();
        this.game.canvas?.focus();
        this.cursors = this.input.keyboard.createCursorKeys();
        this.keys = {
            W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            E: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
            H: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.H)
        };

        // Interact on E
        this.keys.E.on("down", () => {
            if (this.activePuzzle || this.pauseModal || this.resultsModal || this.guideModal || this.introModal || this.tutorialModal) return;

            if (this.nearbyStation && !this.nearbyStation.isRepaired) {
                this.launchStationPuzzle(this.nearbyStation.id);
            } else if (this.nearbyCrate && !this.nearbyCrate.isLooted) {
                this.lootSupplyCrate(this.nearbyCrate);
            }
        });

        // Pause Menu or puzzle close on ESC. Use the scene keyboard event so
        // the handler remains reliable while a modal container has focus.
        this.input.keyboard.on("keydown-ESC", () => {
            if (this.activePuzzle) {
                this.activePuzzle.close();
                this.activePuzzle = undefined;
            } else {
                this.togglePauseMenu();
            }
        });

        // Guide Manual on H
        this.keys.H.on("down", () => {
            this.showMissionGuide();
        });
    }

    private showMissionIntroduction() {
        const briefings = [
            "Houston CAPCOM, we've got a serious emergency at the Mars habitat!",
            "A dust gale ruptured the air-distribution manifold. Oxygen is leaking out of the habitat.",
            "The electrical grid is shorted, pressure regulation is unstable, and the exterior hull has several breaches.",
            "Reach the four damaged stations and solve their repair challenges. Search supply lockers for spare pipes, relays, valves, and hull patches.",
            "Restore all four systems before the emergency countdown reaches zero. Critical resource readings are warnings; the countdown is the mission deadline."
        ];

        const renderPage = (page: number) => {
            this.introModal?.destroy();
            const modal = this.add.container(0, 0).setDepth(300);
            this.introModal = modal;

            const shade = this.add.rectangle(0, 0, this.W, this.H, 0x030611, 0.84).setOrigin(0);
            shade.setInteractive();
            modal.add(shade);

            const cardW = 960;
            const cardH = 420;
            const cardX = (this.W - cardW) / 2;
            const cardY = (this.H - cardH) / 2;
            const frame = this.add.graphics();
            frame.fillStyle(UITheme.colors.panelBg, 0.99);
            frame.fillRoundedRect(cardX, cardY, cardW, cardH, 16);
            frame.lineStyle(2, UITheme.colors.primaryCyan, 1);
            frame.strokeRoundedRect(cardX, cardY, cardW, cardH, 16);
            modal.add(frame);

            const portraitX = cardX + 24;
            const portraitY = cardY + 38;
            const portraitFrame = this.add.graphics();
            portraitFrame.fillStyle(0x0A1B30, 1);
            portraitFrame.fillRoundedRect(portraitX, portraitY, 220, 320, 12);
            portraitFrame.lineStyle(2, UITheme.colors.solarGold, 1);
            portraitFrame.strokeRoundedRect(portraitX, portraitY, 220, 320, 12);
            modal.add(portraitFrame);

            const suitKey = `${this.equippedGender}_avatar_${this.equippedSuitFrame}`;
            const portrait = this.add.image(portraitX + 110, portraitY + 142,
                this.textures.exists(suitKey) ? suitKey : `${this.equippedGender}_avatar_1`);
            portrait.setDisplaySize(164, 218);
            modal.add(portrait);

            const callsign = this.add.text(portraitX + 110, portraitY + 286, this.equippedCallsign.toUpperCase(), {
                fontFamily: UITheme.fonts.heading,
                fontSize: "12px",
                color: UITheme.colors.solarGoldStr,
                fontStyle: "bold"
            }).setOrigin(0.5);
            modal.add(callsign);

            const bodyX = cardX + 254;
            const bodyY = cardY + 42;
            const bodyW = cardW - 278;
            const bodyH = 282;
            const body = this.add.graphics();
            body.fillStyle(0x0B1E34, 1);
            body.fillRoundedRect(bodyX, bodyY, bodyW, bodyH, 12);
            body.lineStyle(1.5, UITheme.colors.panelBorder, 1);
            body.strokeRoundedRect(bodyX, bodyY, bodyW, bodyH, 12);
            modal.add(body);

            const heading = this.add.text(bodyX + 30, bodyY + 28, "EMERGENCY COMMAND BRIEFING", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "18px",
                color: UITheme.colors.primaryCyanStr,
                fontStyle: "bold"
            });
            modal.add(heading);

            const message = this.add.text(bodyX + 30, bodyY + 92, briefings[page], {
                fontFamily: UITheme.fonts.body,
                fontSize: "17px",
                color: "#E2EDF8",
                wordWrap: { width: bodyW - 60 },
                lineSpacing: 8
            });
            modal.add(message);

            const pageCount = this.add.text(bodyX + bodyW - 28, bodyY + bodyH - 24, `${page + 1} / ${briefings.length}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: UITheme.colors.textMuted
            }).setOrigin(1, 0.5);
            modal.add(pageCount);

            const skip = this.add.text(cardX + cardW - 22, cardY + 15, "SKIP INTRODUCTION", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "9px",
                color: UITheme.colors.textSecondary,
                fontStyle: "bold"
            }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
            skip.on("pointerdown", () => this.showMissionTutorial(true, 0));
            modal.add(skip);

            const next = ButtonFactory.createButton({
                scene: this,
                x: bodyX + bodyW / 2,
                y: cardY + cardH - 40,
                width: 210,
                height: 42,
                text: page === briefings.length - 1 ? "LEARN REPAIR STEPS  ➔" : "CONTINUE  ➔",
                primaryColor: UITheme.colors.primaryCyan,
                onClick: () => {
                    SoundFX.playClick();
                    if (page === briefings.length - 1) this.showMissionTutorial(true, 0);
                    else renderPage(page + 1);
                }
            });
            modal.add(next);

            this.tweens.add({
                targets: modal,
                alpha: { from: 0, to: 1 },
                scale: { from: 0.98, to: 1 },
                duration: 180,
                ease: "Quad.easeOut"
            });
        };

        renderPage(0);
    }

    private showMissionTutorial(startMissionFromEnd: boolean, page = 0, isGuide = false) {
        const lessons: { id: SubsystemId; title: string; icon: string; description: string; tip: string }[] = [
            {
                id: "air_distribution",
                title: "AIR DISTRIBUTION",
                icon: "💨",
                description: "Reconnect the pipe network from the air source to the habitat target to stop the oxygen leak.",
                tip: "FIELD TIP: Rotate each pipe tile until one continuous path is complete."
            },
            {
                id: "electrical_grid",
                title: "ELECTRICAL GRID",
                icon: "⚡",
                description: "Route power through the damaged circuit and reconnect the habitat's critical systems.",
                tip: "FIELD TIP: Follow the circuit from the power source to every required system without creating a short."
            },
            {
                id: "oxygen_regulation",
                title: "OXYGEN REGULATION",
                icon: "🎛️",
                description: "Calibrate the pressure valves to stabilize the habitat atmosphere in the safe zone.",
                tip: "FIELD TIP: Balance inflow and bleed, then hold pressure between 56 and 64 kPa."
            },
            {
                id: "structural_hull",
                title: "STRUCTURAL HULL",
                icon: "🛡️",
                description: "Seal each exterior breach with the correct composite patch from your repair inventory.",
                tip: "FIELD TIP: Match the patch material to the breach, then secure its locking anchors."
            }
        ];

        const renderPage = (pageIndex: number) => {
            this.introModal?.destroy();
            this.introModal = undefined;
            this.tutorialModal?.destroy();

            const modal = this.add.container(0, 0).setDepth(300);
            this.tutorialModal = modal;
            if (isGuide) this.guideModal = modal;

            const shade = this.add.rectangle(0, 0, this.W, this.H, 0x030611, 0.84).setOrigin(0);
            shade.setInteractive();
            modal.add(shade);

            const cardW = 880;
            const cardH = 400;
            const cardX = (this.W - cardW) / 2;
            const cardY = (this.H - cardH) / 2;
            const frame = this.add.graphics();
            frame.fillStyle(UITheme.colors.panelBg, 0.99);
            frame.fillRoundedRect(cardX, cardY, cardW, cardH, 16);
            frame.lineStyle(2, UITheme.colors.primaryCyan, 1);
            frame.strokeRoundedRect(cardX, cardY, cardW, cardH, 16);
            modal.add(frame);

            const lesson = lessons[pageIndex];
            const header = this.add.text(this.W / 2, cardY + 34, "LEARN BEFORE PLAYING", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "13px",
                color: UITheme.colors.solarGoldStr,
                fontStyle: "bold",
                letterSpacing: 1
            }).setOrigin(0.5);
            modal.add(header);

            const title = this.add.text(this.W / 2, cardY + 76, lesson.title, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "22px",
                color: UITheme.colors.primaryCyanStr,
                fontStyle: "bold",
                letterSpacing: 1
            }).setOrigin(0.5);
            modal.add(title);

            const icon = this.add.text(this.W / 2, cardY + 132, lesson.icon, {
                fontFamily: UITheme.fonts.body,
                fontSize: "34px",
                color: "#FFFFFF"
            }).setOrigin(0.5);
            modal.add(icon);

            const description = this.add.text(this.W / 2, cardY + 200, lesson.description, {
                fontFamily: UITheme.fonts.body,
                fontSize: "16px",
                color: "#E2EDF8",
                align: "center",
                wordWrap: { width: cardW - 120 },
                lineSpacing: 6
            }).setOrigin(0.5, 0);
            modal.add(description);

            const tip = this.add.text(this.W / 2, cardY + 275, lesson.tip, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: UITheme.colors.solarGoldStr,
                fontStyle: "bold",
                align: "center",
                wordWrap: { width: cardW - 100 }
            }).setOrigin(0.5, 0);
            modal.add(tip);

            const pageText = this.add.text(cardX + 28, cardY + cardH - 30, `CHECK ${pageIndex + 1} / ${lessons.length}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: UITheme.colors.textMuted
            }).setOrigin(0, 0.5);
            modal.add(pageText);

            const finish = () => {
                this.tutorialModal?.destroy();
                this.tutorialModal = undefined;
                if (isGuide) this.guideModal = undefined;
                if (startMissionFromEnd) this.resourceManager.start();
            };

            const skip = this.add.text(cardX + cardW - 22, cardY + 14, "SKIP TUTORIAL", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "9px",
                color: UITheme.colors.textSecondary,
                fontStyle: "bold"
            }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
            skip.on("pointerdown", finish);
            modal.add(skip);

            const next = ButtonFactory.createButton({
                scene: this,
                x: cardX + cardW - 130,
                y: cardY + cardH - 38,
                width: 210,
                height: 42,
                text: pageIndex === lessons.length - 1
                    ? (startMissionFromEnd ? "BEGIN REPAIRS  ➔" : "CLOSE MANUAL  ✓")
                    : "NEXT STEP  ➔",
                primaryColor: UITheme.colors.primaryCyan,
                onClick: () => {
                    SoundFX.playClick();
                    if (pageIndex === lessons.length - 1) finish();
                    else renderPage(pageIndex + 1);
                }
            });
            modal.add(next);

            this.tweens.add({
                targets: modal,
                alpha: { from: 0, to: 1 },
                scale: { from: 0.98, to: 1 },
                duration: 180,
                ease: "Quad.easeOut"
            });
        };

        renderPage(page);
    }

    private createInteractionPrompt() {
        this.promptContainer = this.add.container(this.W / 2, this.H - 100).setDepth(140);
        this.promptContainer.setVisible(false);

        const bg = this.add.graphics();
        bg.fillStyle(0x060E1A, 0.95);
        bg.fillRoundedRect(-220, -18, 440, 36, 8);
        bg.lineStyle(1.5, UITheme.colors.primaryCyan, 0.9);
        bg.strokeRoundedRect(-220, -18, 440, 36, 8);
        this.promptContainer.add(bg);

        this.promptText = this.add.text(0, 0, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        this.promptContainer.add(this.promptText);
    }

    override update(_time: number, delta: number) {
        // The emergency countdown pauses only for the explicit pause menu.
        if (!this.pauseModal && !this.missionEnded) {
            this.resourceManager.update(delta);
        }

        // Animate Martian Dust Gale particles
        this.updateDustGale(delta);

        // Animate Emergency Red Warning Strobes
        this.updateEmergencyLighting();

        // Player Movement (disabled during interactive puzzle or pause modal)
        if (!this.missionEnded && !this.activePuzzle && !this.pauseModal && !this.resultsModal && !this.guideModal && !this.introModal && !this.tutorialModal) {
            this.handlePlayerMovement(delta);
            this.checkProximities();
        }
    }

    private handlePlayerMovement(delta: number) {
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.keys.A.isDown) vx -= 1;
        if (this.cursors.right.isDown || this.keys.D.isDown) vx += 1;
        if (this.cursors.up.isDown || this.keys.W.isDown) vy -= 1;
        if (this.cursors.down.isDown || this.keys.S.isDown) vy += 1;

        const isMoving = vx !== 0 || vy !== 0;

        if (isMoving) {
            const mag = Math.sqrt(vx * vx + vy * vy);
            this.astronaut.x += (vx / mag) * this.moveSpeed * (delta / 1000);
            this.astronaut.y += (vy / mag) * this.moveSpeed * (delta / 1000);

            // Habitat Bounds Limits
            this.astronaut.x = Phaser.Math.Clamp(this.astronaut.x, 80, this.W - 80);
            this.astronaut.y = Phaser.Math.Clamp(this.astronaut.y, 310, this.H - 55);

            if (vx < 0) this.astronaut.setFlipX(true);
            else if (vx > 0) this.astronaut.setFlipX(false);

            // Low-Gravity Stride Bobbing
            this.walkTimer += delta;
            const strideStep = this.walkTimer * 0.012;
            this.astronaut.angle = Math.sin(strideStep) * 5;
            const squish = Math.sin(strideStep * 1.5);
            this.astronaut.setScale(
                0.28 * (1 - Math.abs(squish) * 0.04),
                0.28 * (1 + Math.abs(squish) * 0.04)
            );

            if (this.callsignBadge) {
                this.callsignBadge.setPosition(this.astronaut.x, this.astronaut.y - 84);
            }
        } else {
            this.astronaut.angle = 0;
            this.astronaut.setScale(0.28);
            if (this.callsignBadge) {
                this.callsignBadge.setPosition(this.astronaut.x, this.astronaut.y - 84);
            }
        }
    }

    private checkProximities() {
        const px = this.astronaut.x;
        const py = this.astronaut.y;

        // Check Stations
        let closestStation: DamagedStation | null = null;
        let minDist = Infinity;

        for (const st of this.stations) {
            const dist = Phaser.Math.Distance.Between(px, py, st.x, st.y);
            if (dist < st.interactRadius && dist < minDist) {
                minDist = dist;
                closestStation = st;
            }
        }
        this.nearbyStation = closestStation;

        // Check Crates
        let closestCrate: SupplyCrate | null = null;
        let minCrateDist = Infinity;

        for (const cr of this.crates) {
            const dist = Phaser.Math.Distance.Between(px, py, cr.x, cr.y);
            if (dist < cr.interactRadius && dist < minCrateDist) {
                minCrateDist = dist;
                closestCrate = cr;
            }
        }
        this.nearbyCrate = closestCrate;

        // Update Ground Prompt
        if (this.nearbyStation && !this.nearbyStation.isRepaired) {
            this.promptText.setText(this.nearbyStation.actionHint);
            this.promptContainer.setVisible(true);
        } else if (this.nearbyCrate && !this.nearbyCrate.isLooted) {
            this.promptText.setText(`Press [ E ] to Loot ${this.nearbyCrate.name}`);
            this.promptContainer.setVisible(true);
        } else {
            this.promptContainer.setVisible(false);
        }
    }

    private launchStationPuzzle(id: SubsystemId) {
        if (this.activePuzzle || this.missionEnded) return;

        SoundFX.playClick();
        const station = this.stations.find((candidate) => candidate.id === id);
        if (station && !station.isRepaired) {
            station.statusBadge.setText("◉ REPAIRING");
            station.statusBadge.setColor(UITheme.colors.solarGoldStr);
            station.beaconLight.setFillStyle(UITheme.colors.solarGold);
        }

        switch (id) {
            case "air_distribution":
                this.activePuzzle = new AirLeakPuzzle(this, {
                    onComplete: () => this.handlePuzzleComplete("air_distribution"),
                    onClose: () => this.handlePuzzleClosed("air_distribution")
                });
                break;
            case "electrical_grid":
                this.activePuzzle = new CircuitPuzzle(this, {
                    onComplete: () => this.handlePuzzleComplete("electrical_grid"),
                    onClose: () => this.handlePuzzleClosed("electrical_grid")
                });
                break;
            case "oxygen_regulation":
                this.activePuzzle = new PressurePuzzle(this, {
                    onComplete: () => this.handlePuzzleComplete("oxygen_regulation"),
                    onClose: () => this.handlePuzzleClosed("oxygen_regulation")
                });
                break;
            case "structural_hull":
                this.activePuzzle = new StructuralRepairPuzzle(this, this.inventoryManager, {
                    onComplete: () => this.handlePuzzleComplete("structural_hull"),
                    onClose: () => this.handlePuzzleClosed("structural_hull")
                });
                break;
        }
    }

    private handlePuzzleClosed(id: SubsystemId) {
        this.activePuzzle = undefined;

        const station = this.stations.find((candidate) => candidate.id === id);
        if (station && !station.isRepaired) {
            station.statusBadge.setText("⚠ OFFLINE");
            station.statusBadge.setColor(UITheme.colors.emergencyRedStr);
            station.beaconLight.setFillStyle(UITheme.colors.emergencyRed);
        }

    }

    private handlePuzzleComplete(id: SubsystemId) {
        this.activePuzzle = undefined;
        this.resourceManager.markSystemRepaired(id);
        this.hud.markObjectiveComplete(id);

        const st = this.stations.find(s => s.id === id);
        if (st) {
            st.isRepaired = true;
            st.statusBadge.setText("✔ OPERATIONAL");
            st.statusBadge.setColor(UITheme.colors.bioGreenStr);
            st.beaconLight.setFillStyle(UITheme.colors.bioGreen);
        }

    }

    private lootSupplyCrate(crate: SupplyCrate) {
        crate.isLooted = true;
        crate.badge.setText("✔ EMPTY");
        crate.badge.setColor("#7E95B8");
        this.inventoryManager.lootCrate(crate.id);
    }

    private updateDustGale(delta: number) {
        this.dustGraphics.clear();
        this.dustGraphics.fillStyle(UITheme.colors.marsAmber, 0.45);

        for (const p of this.dustParticles) {
            p.x += p.speed * (delta / 1000);
            if (p.x > this.W) {
                p.x = 0;
                p.y = Math.random() * 380;
            }
            this.dustGraphics.fillCircle(p.x, p.y, p.size);
        }
    }

    private updateEmergencyLighting() {
        this.emergencyLightingGraphics.clear();

        const allRepaired = this.resourceManager.getRepairsCount() >= 4;
        const color = allRepaired ? UITheme.colors.bioGreen : UITheme.colors.emergencyRed;
        const pulse = 0.08 + Math.sin(Date.now() * 0.005) * 0.05;

        this.emergencyLightingGraphics.fillStyle(color, pulse);
        this.emergencyLightingGraphics.fillRect(0, 0, this.W, this.H);
    }

    private handleMissionEnd(results: Sol5MissionResults) {
        if (this.missionEnded) return;
        this.missionEnded = true;
        this.promptContainer?.setVisible(false);
        this.nearbyStation = null;
        this.nearbyCrate = null;

        SoundFX.playToggle(results.isSuccess);

        if (results.isSuccess) {
            this.cameras.main.flash(500, 0, 230, 118);
        } else {
            this.cameras.main.flash(500, 255, 23, 68);
        }

        this.time.delayedCall(600, () => {
            this.resultsModal = new Sol5ResultsModal(this, results, {
                onRetry: () => {
                    this.scene.restart();
                },
                onAdvanceOrReturn: () => {
                    this.returnToMarsBase();
                }
            });
        });
    }

    private togglePauseMenu() {
        if (this.pauseModal) {
            this.pauseModal.destroy();
            this.pauseModal = undefined;
            return;
        }

        const modal = this.add.container(0, 0).setDepth(250);
        const bg = this.add.rectangle(0, 0, this.W, this.H, 0x030611, 0.90).setOrigin(0);
        bg.setInteractive();
        modal.add(bg);

        const cardW = 440;
        const cardH = 320;
        const box = this.add.graphics();
        box.fillStyle(UITheme.colors.panelBg, 0.98);
        box.fillRoundedRect((this.W - cardW) / 2, (this.H - cardH) / 2, cardW, cardH, 16);
        box.lineStyle(2, UITheme.colors.primaryCyan, 0.9);
        box.strokeRoundedRect((this.W - cardW) / 2, (this.H - cardH) / 2, cardW, cardH, 16);
        modal.add(box);

        const title = this.add.text(this.W / 2, (this.H - cardH) / 2 + 40, "EMERGENCY PROTOCOL PAUSED", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        modal.add(title);

        const resumeBtn = ButtonFactory.createButton({
            scene: this,
            x: this.W / 2,
            y: (this.H - cardH) / 2 + 105,
            width: 260,
            height: 42,
            text: "▶ RESUME REPAIRS",
            primaryColor: UITheme.colors.bioGreen,
            onClick: () => {
                SoundFX.playClick();
                this.togglePauseMenu();
            }
        });

        const restartBtn = ButtonFactory.createButton({
            scene: this,
            x: this.W / 2,
            y: (this.H - cardH) / 2 + 165,
            width: 260,
            height: 42,
            text: "🔄 RESTART SOL 5",
            primaryColor: UITheme.colors.marsAmber,
            onClick: () => {
                SoundFX.playClick();
                this.scene.restart();
            }
        });

        const abortBtn = ButtonFactory.createButton({
            scene: this,
            x: this.W / 2,
            y: (this.H - cardH) / 2 + 225,
            width: 260,
            height: 42,
            text: "← RETURN TO BASE",
            primaryColor: UITheme.colors.cardHover,
            onClick: () => {
                SoundFX.playClick();
                this.returnToMarsBase();
            }
        });

        modal.add([resumeBtn, restartBtn, abortBtn]);
        this.pauseModal = modal;
    }

    private showMissionGuide() {
        if (this.introModal) return;

        if (this.tutorialModal) {
            this.tutorialModal.destroy();
            this.tutorialModal = undefined;
            this.guideModal = undefined;
            return;
        }
        const firstUnrepaired = ([
            "air_distribution",
            "electrical_grid",
            "oxygen_regulation",
            "structural_hull"
        ] as SubsystemId[]).find((id) => !this.resourceManager.isRepaired(id));
        const page = firstUnrepaired
            ? (["air_distribution", "electrical_grid", "oxygen_regulation", "structural_hull"] as SubsystemId[]).indexOf(firstUnrepaired)
            : 0;
        this.showMissionTutorial(false, page, true);
    }

    private returnToMarsBase() {
        const marsScene = this.scene.get("MarsWorldScene");

        this.scene.stop();

        if (marsScene?.scene.isSleeping()) {
            marsScene.scene.wake();
            marsScene.scene.bringToTop();
            return;
        }

        if (marsScene?.scene.isActive()) {
            marsScene.scene.bringToTop();
            return;
        }

        if (marsScene?.scene.isPaused()) {
            marsScene.scene.resume();
            marsScene.scene.bringToTop();
            return;
        }

        this.scene.start("MarsWorldScene");
    }
}

export default Sol5LastSafeHabitatScene;
