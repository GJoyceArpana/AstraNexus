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
    private introductionModal?: Phaser.GameObjects.Container;
    private introductionIndex = 0;
    private introductionActive = false;
    private tutorialModal?: Phaser.GameObjects.Container;
    private tutorialIndex = 0;
    private tutorialActive = false;

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
        this.introductionModal = undefined;
        this.introductionIndex = 0;
        this.introductionActive = false;
        this.tutorialModal = undefined;
        this.tutorialIndex = 0;
        this.tutorialActive = false;
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

        // Character introduction and repair tutorial start the mission timer only after the player is ready.
        this.showCharacterIntroduction();

        // Initial Emergency Dispatch Warning Toast
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
            if (this.activePuzzle || this.pauseModal || this.resultsModal || this.guideModal || this.introductionActive || this.tutorialActive) return;

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
        if (!this.introductionActive && !this.tutorialActive && !this.missionEnded && !this.activePuzzle && !this.pauseModal && !this.resultsModal && !this.guideModal) {
            this.handlePlayerMovement(delta);
            this.checkProximities();
        }
    }

    private showCharacterIntroduction() {
        const dialogue = [
            "Hey Cadet! We've got a serious emergency at the Mars habitat!",
            "A powerful Martian storm has damaged our critical life-support systems. We're losing oxygen pressure, and several essential systems are offline.",
            "We need to repair four critical systems: air distribution pipes, the electrical grid, oxygen pressure regulators and the damaged exterior habitat walls.",
            "The countdown is the mission deadline. Low oxygen, pressure, hull, or power readings are warnings, not separate game-over triggers.",
            "Complete all four repairs and stabilize the habitat. Our survival depends on you!",
            "Ready, Cadet? Let's save the habitat!"
        ];

        this.introductionActive = true;
        this.introductionIndex = 0;

        const modal = this.add.container(this.W / 2, this.H / 2).setDepth(300);
        this.introductionModal = modal;

        const scrim = this.add.rectangle(0, 0, this.W, this.H, 0x020713, 0.78)
            .setInteractive();
        modal.add(scrim);

        const card = this.add.graphics();
        card.fillStyle(0x07172A, 0.98);
        card.fillRoundedRect(-555, -275, 1110, 550, 20);
        card.lineStyle(2, UITheme.colors.primaryCyan, 0.9);
        card.strokeRoundedRect(-555, -275, 1110, 550, 20);
        modal.add(card);

        const portraitFrame = this.add.graphics();
        portraitFrame.fillStyle(0x0C2942, 1);
        portraitFrame.fillRoundedRect(-525, -225, 300, 410, 16);
        portraitFrame.lineStyle(2, UITheme.colors.solarGold, 0.9);
        portraitFrame.strokeRoundedRect(-525, -225, 300, 410, 16);
        modal.add(portraitFrame);

        const suitKey = `${this.equippedGender}_avatar_${this.equippedSuitFrame}`;
        const portrait = this.add.image(-375, -18, suitKey);
        portrait.setDisplaySize(250, 365);
        portrait.setDepth(1);
        modal.add(portrait);

        const portraitLabel = this.add.text(-375, 210, this.equippedCallsign.toUpperCase(), {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setOrigin(0.5);
        modal.add(portraitLabel);

        const panel = this.add.graphics();
        panel.fillStyle(0x0B2038, 1);
        panel.fillRoundedRect(-185, -225, 700, 410, 16);
        panel.lineStyle(1.5, 0x3E6C91, 0.9);
        panel.strokeRoundedRect(-185, -225, 700, 410, 16);
        modal.add(panel);

        const heading = this.add.text(-145, -190, "EMERGENCY COMMAND BRIEFING", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "18px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            letterSpacing: 1.2
        });
        modal.add(heading);

        const speaker = this.add.text(-145, -145, "MISSION CONTROL · OUTPOST SOL", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 1
        });
        modal.add(speaker);

        const dialogueText = this.add.text(-145, -88, "", {
            fontFamily: UITheme.fonts.body,
            fontSize: "20px",
            color: "#E8F7FF",
            lineSpacing: 10,
            wordWrap: { width: 610 },
            maxLines: 5
        });
        modal.add(dialogueText);

        const progress = this.add.text(480, 155, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#8FAFC8",
            fontStyle: "bold"
        }).setOrigin(1, 0.5);
        modal.add(progress);

        const renderDialogue = () => {
            dialogueText.setText(dialogue[this.introductionIndex]);
            progress.setText(`${this.introductionIndex + 1} / ${dialogue.length}`);
            this.tweens.add({
                targets: dialogueText,
                alpha: { from: 0.35, to: 1 },
                duration: 220,
                ease: "Quad.easeOut"
            });
        };

        const advanceDialogue = () => {
            SoundFX.playClick();
            if (this.introductionIndex >= dialogue.length - 1) {
                this.closeCharacterIntroduction();
            } else {
                this.introductionIndex++;
                renderDialogue();
            }
        };

        const continueButton = ButtonFactory.createButton({
            scene: this,
            x: 265,
            y: 205,
            width: 210,
            height: 44,
            text: "CONTINUE  ➜",
            primaryColor: UITheme.colors.primaryCyan,
            secondaryColor: 0x103B59,
            fontSize: "13px",
            onClick: advanceDialogue
        });
        modal.add(continueButton);

        const skipButton = this.add.text(480, -250, "SKIP INTRODUCTION", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#A9C3D7",
            fontStyle: "bold",
            backgroundColor: "#061322",
            padding: { x: 10, y: 7 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        skipButton.on("pointerdown", () => {
            SoundFX.playClick();
            this.closeCharacterIntroduction();
        });
        modal.add(skipButton);

        this.input.keyboard?.on("keydown-ENTER", advanceDialogue, this);
        this.input.keyboard?.on("keydown-SPACE", advanceDialogue, this);
        renderDialogue();

        modal.setAlpha(0);
        modal.y += 24;
        this.tweens.add({
            targets: modal,
            alpha: 1,
            y: this.H / 2,
            duration: 420,
            ease: "Back.easeOut"
        });
    }

    private closeCharacterIntroduction() {
        if (!this.introductionActive || !this.introductionModal) return;

        this.introductionActive = false;
        this.input.keyboard?.off("keydown-ENTER", undefined, this);
        this.input.keyboard?.off("keydown-SPACE", undefined, this);
        const modal = this.introductionModal;
        this.introductionModal = undefined;

        this.tweens.add({
            targets: modal,
            alpha: 0,
            y: this.H / 2 + 24,
            duration: 260,
            ease: "Quad.easeIn",
            onComplete: () => {
                modal.destroy();
                this.showRepairTutorial();
            }
        });
    }

    private showRepairTutorial() {
        const cards = [
            {
                title: "AIR DISTRIBUTION",
                icon: "💨",
                body: "Reconnect the pipe network from the air source to the habitat target to stop the oxygen leak.",
                tip: "Rotate each pipe tile until one continuous path is complete."
            },
            {
                title: "POWER GRID",
                icon: "⚡",
                body: "Restore the electrical circuit so heaters, life support and habitat systems receive stable power.",
                tip: "Build a valid connection from the source through the relay matrix."
            },
            {
                title: "OXYGEN REGULATION",
                icon: "🎛️",
                body: "Tune the pressure valves and keep the habitat inside its safe operating range.",
                tip: "Small valve adjustments are safer than large corrections."
            },
            {
                title: "STRUCTURAL INTEGRITY",
                icon: "🛡️",
                body: "Seal every exterior breach with the correct composite repair material.",
                tip: "Use the supplied patches wisely; all four systems must be restored."
            }
        ];

        this.tutorialActive = true;
        this.tutorialIndex = 0;

        const modal = this.add.container(this.W / 2, this.H / 2).setDepth(300);
        this.tutorialModal = modal;

        const scrim = this.add.rectangle(0, 0, this.W, this.H, 0x020713, 0.78).setInteractive();
        modal.add(scrim);

        const cardBg = this.add.graphics();
        cardBg.fillStyle(0x07172A, 0.98);
        cardBg.fillRoundedRect(-450, -245, 900, 490, 20);
        cardBg.lineStyle(2, UITheme.colors.primaryCyan, 0.9);
        cardBg.strokeRoundedRect(-450, -245, 900, 490, 20);
        modal.add(cardBg);

        const eyebrow = this.add.text(0, -200, "LEARN BEFORE PLAYING", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 2
        }).setOrigin(0.5);
        modal.add(eyebrow);

        const title = this.add.text(0, -155, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "25px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            letterSpacing: 1.4
        }).setOrigin(0.5);
        modal.add(title);

        const icon = this.add.text(0, -78, "", { fontSize: "54px" }).setOrigin(0.5);
        modal.add(icon);

        const body = this.add.text(0, 5, "", {
            fontFamily: UITheme.fonts.body,
            fontSize: "18px",
            color: "#E8F7FF",
            align: "center",
            lineSpacing: 8,
            wordWrap: { width: 720 }
        }).setOrigin(0.5);
        modal.add(body);

        const tip = this.add.text(0, 92, "", {
            fontFamily: UITheme.fonts.body,
            fontSize: "14px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: 720 }
        }).setOrigin(0.5);
        modal.add(tip);

        const progress = this.add.text(-390, 196, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#8FAFC8",
            fontStyle: "bold"
        });
        modal.add(progress);

        const nextButton = ButtonFactory.createButton({
            scene: this,
            x: 255,
            y: 195,
            width: 230,
            height: 44,
            text: "NEXT CARD  ➜",
            primaryColor: UITheme.colors.primaryCyan,
            secondaryColor: 0x103B59,
            fontSize: "13px",
            onClick: () => {
                SoundFX.playClick();
                if (this.tutorialIndex === cards.length - 1) {
                    this.closeRepairTutorial();
                } else {
                    this.tutorialIndex++;
                    renderCard();
                }
            }
        });
        modal.add(nextButton);

        const skip = this.add.text(390, -220, "SKIP TUTORIAL", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#A9C3D7",
            fontStyle: "bold",
            backgroundColor: "#061322",
            padding: { x: 10, y: 7 }
        }).setOrigin(1, 0).setInteractive({ useHandCursor: true });
        skip.on("pointerdown", () => {
            SoundFX.playClick();
            this.closeRepairTutorial();
        });
        modal.add(skip);

        const renderCard = () => {
            const card = cards[this.tutorialIndex];
            title.setText(card.title);
            icon.setText(card.icon);
            body.setText(card.body);
            tip.setText(`FIELD TIP: ${card.tip}`);
            progress.setText(`CARD ${this.tutorialIndex + 1} / ${cards.length}`);
            nextButton.getAll().forEach((child) => {
                if (child instanceof Phaser.GameObjects.Text) {
                    child.setText(this.tutorialIndex === cards.length - 1 ? "BEGIN MISSION  ➜" : "NEXT CARD  ➜");
                }
            });
        };

        renderCard();
        modal.setAlpha(0);
        modal.y += 24;
        this.tweens.add({
            targets: modal,
            alpha: 1,
            y: this.H / 2,
            duration: 360,
            ease: "Back.easeOut"
        });
    }

    private closeRepairTutorial() {
        if (!this.tutorialActive || !this.tutorialModal) return;

        this.tutorialActive = false;
        const modal = this.tutorialModal;
        this.tutorialModal = undefined;
        this.tweens.add({
            targets: modal,
            alpha: 0,
            y: this.H / 2 + 24,
            duration: 260,
            ease: "Quad.easeIn",
            onComplete: () => modal.destroy()
        });

        this.resourceManager.start();
        this.input.enabled = true;
        if (this.input.keyboard) {
            this.input.keyboard.enabled = true;
            this.input.keyboard.manager.enabled = true;
            this.input.keyboard.resetKeys();
        }
        this.game.canvas?.focus();
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
        if (this.guideModal) {
            this.guideModal.destroy();
            this.guideModal = undefined;
            return;
        }

        const modal = this.add.container(0, 0).setDepth(260);
        const bg = this.add.rectangle(0, 0, this.W, this.H, 0x030713, 0.92).setOrigin(0);
        bg.setInteractive();
        modal.add(bg);

        const cardW = 680;
        const cardH = 460;
        const box = this.add.graphics();
        box.fillStyle(UITheme.colors.panelBg, 0.98);
        box.fillRoundedRect((this.W - cardW) / 2, (this.H - cardH) / 2, cardW, cardH, 16);
        box.lineStyle(2, UITheme.colors.solarGold, 0.9);
        box.strokeRoundedRect((this.W - cardW) / 2, (this.H - cardH) / 2, cardW, cardH, 16);
        modal.add(box);

        const title = this.add.text(this.W / 2, (this.H - cardH) / 2 + 38, "ENGINEERING EMERGENCY PROTOCOL MANUAL", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        const manualText =
            "1. EXPLORE & IDENTIFY DAMAGE:\n" +
            "Walk through the 4 damaged research habitat wings using W, A, S, D or Arrow Keys. Walk up to broken stations and press [ E ] to enter technical repair consoles.\n\n" +
            "2. THE 4 ENGINEERING CHALLENGES:\n" +
            "• AIR LEAK REPAIR: Rotate pipe segments to form an airtight conduit from Cryo Air Source to ECLSS Intake.\n" +
            "• POWER GRID CIRCUIT: Route 480V power through step-down transformers to power Life Support, Heaters & Turbine without tripping circuit breakers!\n" +
            "• OXYGEN PRESSURE REGULATION: Adjust the Inflow, Bleed, and Equalizer valves to stabilize pressure inside the 56–64 kPa NASA safe zone for 5 seconds.\n" +
            "• STRUCTURAL HULL SEALING: Select matching Aerogel, Carbon Fiber, or Titanium patches to weld hull fissures.\n\n" +
            "3. EMERGENCY BUFFER & MATERIAL LOOTING:\n" +
            "The mission fails only when the emergency countdown reaches 00:00. Low oxygen, pressure, hull, or power readings warn you and may affect gameplay, but never end the mission by themselves. Search supply lockers for spare pipes, relays, valves, and patches.";

        const desc = this.add.text(
            (this.W - cardW) / 2 + 36,
            (this.H - cardH) / 2 + 75,
            manualText,
            {
                fontFamily: UITheme.fonts.body,
                fontSize: "11px",
                color: "#E2EDF8",
                wordWrap: { width: cardW - 72 },
                lineSpacing: 4
            }
        );

        const closeBtn = ButtonFactory.createButton({
            scene: this,
            x: this.W / 2,
            y: (this.H - cardH) / 2 + cardH - 38,
            width: 200,
            height: 38,
            text: "DISMISS MANUAL ✔",
            primaryColor: UITheme.colors.primaryCyan,
            onClick: () => {
                SoundFX.playClick();
                modal.destroy();
                this.guideModal = undefined;
            }
        });

        modal.add([title, desc, closeBtn]);
        this.guideModal = modal;
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
