import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import ResourceMeters from "../components/ResourceMeters.ts";
import TelemetryPanel from "../components/TelemetryPanel.ts";
import WarningNotification from "../components/WarningNotification.ts";
import PowerSwitchboard from "../components/PowerSwitchboard.ts";
import MissionModals, { type SolResultsStats } from "../components/MissionModals.ts";
import MissionChallengesModal from "../components/MissionChallengesModal.ts";
import ButtonFactory from "../components/ButtonFactory.ts";
import type { CustomizationData } from "../components/AstronautCustomizer.ts";
import type { GameRole } from "../components/RoleSelector.ts";
import type { LandingSiteId } from "../components/LandingSiteSelector.ts";

interface BaseModuleObject {
    id: string;
    name: string;
    icon: string;
    x: number;
    y: number;
    sprite: Phaser.GameObjects.Image;
    interactRadius: number;
    actionMessage: string;
    onInteract: () => void;
}

export class MarsWorldScene extends Phaser.Scene {
    private readonly W = 1280;
    private readonly H = 720;

    // Player & Rover
    private astronaut!: Phaser.GameObjects.Image;
    private rover!: Phaser.GameObjects.Image;
    private isDriving = false;
    private moveSpeed = 190;
    private roverSpeed = 340;
    private surveyWaypoints: { x: number; y: number; visited: boolean; marker: Phaser.GameObjects.Arc; label: Phaser.GameObjects.Text }[] = [];
    private surveySitesScanned = 0;

    // Input Controls
    private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
    private keys!: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
        E: Phaser.Input.Keyboard.Key;
        P: Phaser.Input.Keyboard.Key;
        M: Phaser.Input.Keyboard.Key;
        ESC: Phaser.Input.Keyboard.Key;
    };

    // UI Systems
    private resourceMeters!: ResourceMeters;
    private telemetryPanel!: TelemetryPanel;
    private warningSystem!: WarningNotification;
    private switchboardModal?: PowerSwitchboard;
    private missionChallengesModal?: MissionChallengesModal;
    private pauseModal?: Phaser.GameObjects.Container;
    private resultsModal?: Phaser.GameObjects.Container;

    // Walking Animation State
    private walkTimer = 0;

    // Sol Level & Persistent Customization (Suits in next levels)
    private solLevel = 1;
    private equippedGender: "boy" | "girl" = "boy";
    private equippedSuitName = "ALPHA RECON EVA";
    private equippedSuitFrame = 1;
    private equippedSuitColor = 0xFF7043;
    private equippedCallsign = "Cadet Orion";
    private equippedToolId = "drill";
    private callsignBadge?: Phaser.GameObjects.Text;

    // Mars Outpost Modules
    private modules: BaseModuleObject[] = [];
    private nearbyModule: BaseModuleObject | null = null;
    private promptText!: Phaser.GameObjects.Text;
    private promptBg!: Phaser.GameObjects.Graphics;
    private solarArraySprite?: Phaser.GameObjects.Image;
    private solarDamageLabel?: Phaser.GameObjects.Text;
    private solarArrayDamaged = false;

    // Mission Objectives
    private objectives: { id: string; text: string; done: boolean }[] = [];
    private objectiveListTexts: Phaser.GameObjects.Text[] = [];
    private objectiveProgressLabel?: Phaser.GameObjects.Text;
    private objectiveProgressBar?: Phaser.GameObjects.Graphics;

    // Role & Environmental Simulation
    private playerRole: GameRole = "cadet";
    private landingSite: LandingSiteId = "jezero";
    private poweredModules = new Set<string>();
    private drainRate = 1.0;
    private drainTimer = 0;

    constructor() {
        super("MarsWorldScene");
    }

    preload() {
        // NASA Jezero Mosaic terrain
        this.load.image("mars_terrain", "/assets/game/mars/jezero-ctx-mosaic-3x3.png");
        this.load.image("jezero_dtm_iso", "/assets/game/mars/dtm/terrain-isometric.png");

        // Mars base assets
        this.load.image("base-station", "/assets/game/base/base-station.png");
        this.load.image("greenhouse", "/assets/game/base/greenhouse.png");
        this.load.image("solar-panels", "/assets/game/base/solar-panels.png");
        this.load.image("dish-antenna", "/assets/game/base/dish-antenna.png");
        this.load.image("rover", "/assets/game/base/rover.png");
        this.load.image("oxygen-cylinder", "/assets/game/base/oxygen-cylinder.png");

        // Astronauts
        this.load.image("boy-astronaut", "/assets/game/characters/boy-astronaut.png");
        this.load.image("girl-astronaut", "/assets/game/characters/girl-astronaut.png");

        // Preload individual avatar frames and walking animation frames
        for (let i = 1; i <= 5; i++) {
            if (!this.textures.exists(`boy_avatar_${i}`)) {
                this.load.image(`boy_avatar_${i}`, `/assets/customization/boy_avatar_${i}.png`);
            }
            if (!this.textures.exists(`girl_avatar_${i}`)) {
                this.load.image(`girl_avatar_${i}`, `/assets/customization/girl_avatar_${i}.png`);
            }
        }

        // Walking frames
        for (let i = 1; i <= 4; i++) {
            if (!this.textures.exists(`boy_walk_${i}`)) {
                this.load.image(`boy_walk_${i}`, `/assets/game/characters/boy_walk_${i}.png`);
            }
            if (!this.textures.exists(`girl_walk_${i}`)) {
                this.load.image(`girl_walk_${i}`, `/assets/game/characters/girl_walk_${i}.png`);
            }
        }
    }

    create() {
        // Read configuration from registry
        this.playerRole = (this.registry.get("playerRole") as GameRole) || "cadet";
        this.landingSite = (this.registry.get("landingSite") as LandingSiteId) || "jezero";
        this.drainRate = this.playerRole === "cadet" ? 0.65 : 1.15;
        this.solLevel = (this.registry.get("solLevel") as number) || 1;
        this.poweredModules = new Set([
            "hab_life_support",
            "comms_dish",
            ...(this.solLevel === 1 ? [] : ["greenhouse"])
        ]);
        this.solarArrayDamaged = false;

        // Load persistent suit customization (from registry or localStorage)
        let custom = this.registry.get("astronautCustomization") as CustomizationData | undefined;
        if (!custom && typeof window !== "undefined" && window.localStorage) {
            try {
                const raw = localStorage.getItem("astra_astronaut_suit");
                if (raw) custom = JSON.parse(raw);
            } catch {
                // Ignore storage errors
            }
        }
        if (custom) {
            this.equippedGender = custom.gender === "girl" ? "girl" : "boy";
            this.equippedSuitName = custom.suitName || (this.equippedGender === "girl" ? "NEKO COSMIC EVA" : "ALPHA RECON EVA");
            this.equippedSuitFrame = custom.avatarFrame || 1;
            this.equippedSuitColor = custom.suitColor || 0xFF7043;
            this.equippedCallsign = custom.callsign || "Cadet Orion";
            this.equippedToolId = custom.toolId || "drill";
        }

        // Initialize Level Objectives based on Sol Level
        if (this.solLevel === 1) {
            this.objectives = [
                { id: "hab", text: "1. Inspect Mars Habitat airlock", done: false },
                { id: "power", text: "2. Route power to the greenhouse (Press P)", done: false },
                { id: "greenhouse", text: "3. Activate Mars Greenhouse crops", done: false },
                { id: "rover", text: "4. Board Rover & survey Jezero Crater rim", done: false }
            ];
        } else if (this.solLevel === 2) {
            this.objectives = [
                { id: "cryo_drill", text: "1. Deploy Core Ice Drill at Cryo-Well", done: false },
                { id: "power", text: "2. Power the Magnetic Radiation Shield (P)", done: false },
                { id: "greenhouse", text: "3. Harvest cold-tolerant crops in Greenhouse", done: false },
                { id: "rover", text: "4. Pilot Rover to survey subterranean ice plains", done: false }
            ];
        } else {
            this.objectives = [
                { id: "solar", text: "1. Repair storm-damaged Solar Panels (Press E)", done: false },
                { id: "antenna", text: "2. Align Deep Space Comms to NASA Houston", done: false },
                { id: "hab", text: "3. Stabilize Habitat Life Support to 100%", done: false },
                { id: "rover", text: "4. Dock Rover safely at Habitat storm shelter", done: false }
            ];
        }

        // 1. Build Mars Jezero / Arcadia Environment
        this.createMarsEnvironment();

        // 2. Build Outpost Sol Base Structures
        this.createBaseStructures();

        // 3. Create Player Astronaut & Mars Rover (with equipped suit!)
        this.createAstronautAndRover();
        this.createSurveyWaypoints();

        // 4. Input System
        this.setupInputControls();

        // 5. Initialize HUD Systems (Tasks 5, 6, 7, 9, 10)
        this.setupMarsHUD();

        // 6. Objective Checklist Box
        this.createObjectivesCard();

        // 7. Interaction Prompt HUD
        this.createInteractionPrompt();

        // 8. Welcome Notification Toast
        const siteName = this.solLevel === 1
            ? (this.landingSite === "arcadia" ? "Arcadia Planitia Plains" : "Jezero Crater Delta")
            : (this.solLevel === 2 ? "Arcadia Planitia Ice Extraction" : "Olympus Mons Rim");

        this.time.delayedCall(800, () => {
            this.warningSystem.show({
                type: "INFO",
                title: `TOUCHDOWN CONFIRMED · SOL 0${this.solLevel}`,
                message: `Outpost Sol operational at ${siteName}. Suit: ${this.equippedSuitName} (SUIT 0${this.equippedSuitFrame}). Role: ${this.playerRole.toUpperCase()}.`,
                durationMs: 5500
            });
        });

        // 9. Periodic NASA DONKI Weather Simulation
        this.setupDONKIWeatherEvents();

        this.cameras.main.fadeIn(600, 10, 5, 15);
    }

    // =========================================================
    // 1. MARS JEZERO / ARCADIA ENVIRONMENT
    // =========================================================
    private createMarsEnvironment() {
        const skyColors = [0x180E1C, 0x0C1826, 0x2A1408];
        const terrainTints = [0xE38656, 0xBC7558, 0x9E4B28];
        const currentSky = skyColors[this.solLevel - 1] || skyColors[0];
        const currentTint = terrainTints[this.solLevel - 1] || terrainTints[0];

        // Deep Atmospheric Sky
        this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, currentSky).setDepth(-20);

        // Use the Jezero source mosaic only in its matching Sol 1 location.
        // Other sites use a procedural surface because no matching image is loaded.
        if (this.solLevel === 1 && this.landingSite === "jezero" && this.textures.exists("mars_terrain")) {
            const terrain = this.add.image(this.W / 2, this.H / 2, "mars_terrain");
            terrain.setDisplaySize(this.W, this.H);
            terrain.setTint(currentTint);
            terrain.setAlpha(0.92);
            terrain.setDepth(-19);
        } else {
            const plains = this.add.graphics().setDepth(-19);
            plains.fillStyle(this.solLevel === 2 ? 0x5E5360 : 0x795044, 0.96);
            plains.fillRect(0, 300, this.W, this.H - 300);
            plains.fillStyle(this.solLevel === 2 ? 0x877E86 : 0xA56A4E, 0.58);
            plains.fillEllipse(640, 335, 1500, 210);
            plains.fillStyle(this.solLevel === 2 ? 0x514B58 : 0x603C36, 0.46);
            plains.fillEllipse(220, 380, 850, 230);
            plains.fillEllipse(1110, 395, 980, 250);

            for (let row = 0; row < 4; row++) {
                const y = 365 + row * 55;
                plains.lineStyle(1.5, this.solLevel === 2 ? 0xB4AAB0 : 0xD28A65, 0.18);
                plains.beginPath();
                for (let x = 0; x <= this.W; x += 80) {
                    const waveY = y + Math.sin((x + row * 73) * 0.008) * (7 + row * 2);
                    if (x === 0) plains.moveTo(x, waveY);
                    else plains.lineTo(x, waveY);
                }
                plains.strokePath();
            }
        }

        // NASA elevation-derived Jezero surface. Restrict this DTM to the matching landing site.
        if (this.solLevel === 1 && this.landingSite === "jezero" && this.textures.exists("jezero_dtm_iso")) {
            const displayW = 1240;
            const displayH = 620;
            const clippedKey = "jezero_dtm_iso_clipped";
            const clippedTexture = this.textures.exists(clippedKey)
                ? this.textures.get(clippedKey) as Phaser.Textures.CanvasTexture
                : this.textures.createCanvas(clippedKey, displayW, displayH);

            if (clippedTexture) {
                const context = clippedTexture.getContext();
                context.clearRect(0, 0, displayW, displayH);
                context.save();
                context.beginPath();
                context.moveTo(displayW * 0.53, 0);
                context.lineTo(displayW, displayH * 0.465);
                context.lineTo(displayW * 0.468, displayH);
                context.lineTo(0, displayH * 0.529);
                context.closePath();
                context.clip();
                context.drawImage(
                    this.textures.get("jezero_dtm_iso").getSourceImage() as CanvasImageSource,
                    0,
                    0,
                    displayW,
                    displayH
                );
                // Feather the elevation tile perimeter into the surrounding Mars plain.
                // The source is a rectangular raster; this diamond follows its projected footprint.
                const pixels = context.getImageData(0, 0, displayW, displayH);
                const points = [
                    [displayW * 0.53, 0],
                    [displayW, displayH * 0.465],
                    [displayW * 0.468, displayH],
                    [0, displayH * 0.529]
                ] as const;
                const featherWidth = 52;
                for (let y = 0; y < displayH; y++) {
                    for (let x = 0; x < displayW; x++) {
                        let minDistance = Number.POSITIVE_INFINITY;
                        let inside = true;
                        for (let i = 0; i < points.length; i++) {
                            const [ax, ay] = points[i];
                            const [bx, by] = points[(i + 1) % points.length];
                            const edgeX = bx - ax;
                            const edgeY = by - ay;
                            const cross = edgeX * (y - ay) - edgeY * (x - ax);
                            if (i === 0) inside = cross >= 0;
                            else if ((cross >= 0) !== inside) inside = false;
                            const lengthSquared = edgeX * edgeX + edgeY * edgeY;
                            const projection = Phaser.Math.Clamp(((x - ax) * edgeX + (y - ay) * edgeY) / lengthSquared, 0, 1);
                            const dx = x - (ax + projection * edgeX);
                            const dy = y - (ay + projection * edgeY);
                            minDistance = Math.min(minDistance, Math.sqrt(dx * dx + dy * dy));
                        }
                        const index = (y * displayW + x) * 4 + 3;
                        if (!inside) pixels.data[index] = 0;
                        else {
                            const t = Phaser.Math.Clamp(minDistance / featherWidth, 0, 1);
                            pixels.data[index] = Math.round(pixels.data[index] * t * t * (3 - 2 * t));
                        }
                    }
                }
                context.putImageData(pixels, 0, 0);
                context.restore();
                clippedTexture.refresh();

                this.add.image(this.W / 2, 430, clippedKey)
                    .setDisplaySize(displayW, displayH)
                    .setAlpha(0.92)
                    .setDepth(-16);
            }
        }
        // Mars Dust Overlay & Horizon Glow
        const horizonColor = this.solLevel === 2 ? 0x4A709C : 0xC8573E;
        const horizon = this.add.ellipse(640, 360, 1300, 320, horizonColor, 0.28).setDepth(-18);
        this.tweens.add({
            targets: horizon,
            alpha: 0.38,
            duration: 4000,
            yoyo: true,
            repeat: -1
        });

        // Mars Base Surface Pad: Expansive and wide
        const padColor = this.solLevel === 2 ? 0x6E4238 : 0x8C3F2D;
        const pad = this.add.ellipse(640, 560, 1220, 290, padColor, 0.85).setDepth(-15);
        pad.setStrokeStyle(2, 0xB8573E, 0.6);
    }

    // =========================================================
    // 2. MARS BASE STRUCTURES & AIRLOCKS (Spaced Far Apart)
    // =========================================================
    private createBaseStructures() {
        // Module 1: Mars Greenhouse (Far Left Sector: x=180, y=510)
        const greenImg = this.add.image(180, 510, "greenhouse");
        greenImg.setScale(0.52);
        greenImg.setDepth(10);
        this.modules.push({
            id: "greenhouse",
            name: "MARS HYDROPONIC GREENHOUSE",
            icon: "🌱",
            x: 180,
            y: 510,
            sprite: greenImg,
            interactRadius: 130,
            actionMessage: "Press [ E ] to Harvest Crops & Boost O₂",
            onInteract: () => this.handleGreenhouseInteraction()
        });

        // Module 2: Mars Habitat Dome (Center: x=660, y=440)
        const habImg = this.add.image(660, 440, "base-station");
        habImg.setScale(0.65);
        habImg.setDepth(10);
        this.modules.push({
            id: "hab",
            name: "OUTPOST SOL HABITAT DOME",
            icon: "🏠",
            x: 660,
            y: 440,
            sprite: habImg,
            interactRadius: 140,
            actionMessage: this.solLevel >= 3
                ? "Press [ E ] to Stabilize Life Support toward 100%"
                : "Press [ E ] to Inspect Habitat Airlock",
            onInteract: () => this.handleHabitatInteraction()
        });

        // Module 3: Deep Space Comms Antenna (Upper Crater Rim: x=960, y=360)
        const dishImg = this.add.image(960, 360, "dish-antenna");
        dishImg.setScale(0.46);
        dishImg.setDepth(10);
        this.modules.push({
            id: "antenna",
            name: "DEEP SPACE TELEMETRY DISH",
            icon: "📡",
            x: 960,
            y: 360,
            sprite: dishImg,
            interactRadius: 120,
            actionMessage: "Press [ E ] to Ping NASA Houston Orbiters",
            onInteract: () => this.handleAntennaInteraction()
        });

        // Module 4: Solar Array Farm (Far Right Sector: x=1140, y=530)
        const solarImg = this.add.image(1140, 530, "solar-panels");
        solarImg.setScale(0.56);
        solarImg.setDepth(10);
        this.solarArraySprite = solarImg;
        this.solarDamageLabel = this.add.text(1140, 480, "⚠ SOLAR ARRAY DAMAGED", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold",
            backgroundColor: "#07162CEE",
            padding: { x: 7, y: 4 }
        }).setOrigin(0.5).setDepth(30).setVisible(false);
        this.modules.push({
            id: "solar",
            name: "SOLAR CELL ARRAY",
            icon: "⚡",
            x: 1140,
            y: 530,
            sprite: solarImg,
            interactRadius: 130,
            actionMessage: this.solLevel >= 3
                ? "Press [ E ] to Repair Storm-Damaged Solar Array"
                : "Press [ E ] to Clean Martian Dust off Solar Cells",
            onInteract: () => this.handleSolarInteraction()
        });

        // Module 5 (Sol 02+): Subsurface Cryo-Well Drilling Station
        if (this.solLevel >= 2) {
            const cryoImg = this.add.image(820, 560, "oxygen-cylinder");
            cryoImg.setScale(0.75);
            cryoImg.setDepth(10);
            this.modules.push({
                id: "cryo_drill",
                name: "CRYO-ICE EXTRACTION WELL",
                icon: "❄",
                x: 820,
                y: 560,
                sprite: cryoImg,
                interactRadius: 130,
                actionMessage: "Press [ E ] to Drill Subsurface Water-Ice Core",
                onInteract: () => this.handleCryoDrillInteraction()
            });
        }
    }

    // =========================================================
    // 3. ASTRONAUT & ROVER (Persistent Equipped Suit)
    // =========================================================
    private createAstronautAndRover() {
        const suitKey = `${this.equippedGender}_avatar_${this.equippedSuitFrame}`;
        const avatarKey = this.textures.exists(suitKey) ? suitKey : `${this.equippedGender}_walk_1`;

        // Astronaut: Visible, cute, properly proportioned (scale 0.28)
        this.astronaut = this.add.image(520, 560, avatarKey);
        this.astronaut.setScale(0.28);
        this.astronaut.setDepth(25);

        // Callsign & Equipped Suit Badge
        this.callsignBadge = this.add.text(520, 560 - 86, `${this.equippedCallsign.toUpperCase()} [SUIT 0${this.equippedSuitFrame}]`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            backgroundColor: "#07162CEE",
            padding: { x: 8, y: 3 }
        }).setOrigin(0.5).setDepth(26);
        this.callsignBadge.setShadow(0, 0, `#${this.equippedSuitColor.toString(16).padStart(6, "0")}`, 4);

        // Rover: Waypoint between Greenhouse & Habitat (x=390, y=590)
        this.rover = this.add.image(390, 590, "rover");
        this.rover.setScale(0.42);
        this.rover.setDepth(20);

        // Rover interaction
        this.modules.push({
            id: "rover",
            name: "MARS EXPLORATION ROVER",
            icon: "🚜",
            x: 390,
            y: 590,
            sprite: this.rover,
            interactRadius: 110,
            actionMessage: "Press [ E ] to Board / Exit Rover",
            onInteract: () => this.toggleRoverDriving()
        });
    }

    private createSurveyWaypoints() {
        if (this.solLevel >= 3) return;

        const sites = [
            // Keep the first beacon clear of the mission tracker so its marker and label are visible.
            { x: 350, y: 470, label: "SURVEY SITE A" },
            { x: 1110, y: 420, label: "SURVEY SITE B" }
        ];

        this.surveyWaypoints = sites.map((site, index) => {
            const isNext = index === 0;
            const marker = this.add.circle(site.x, site.y, 42, isNext ? 0x07192A : 0x26303A, isNext ? 0.28 : 0.12)
                .setStrokeStyle(3, isNext ? 0x58DDF2 : 0x71808B, isNext ? 0.95 : 0.42)
                .setDepth(6);
            const label = this.add.text(site.x, site.y - 56, `${site.label} · ${isNext ? "ACTIVE · DRIVE HERE" : "STANDBY · SITE A FIRST"}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: isNext ? "#BDF7FF" : "#A0AAB0",
                fontStyle: "bold",
                backgroundColor: "#061122DD",
                padding: { x: 7, y: 4 }
            }).setOrigin(0.5).setDepth(7);

            if (isNext) {
                this.tweens.add({
                    targets: marker,
                    scale: 1.28,
                    alpha: 0.35,
                    duration: 1100,
                    yoyo: true,
                    repeat: -1
                });
            }

            return { ...site, visited: false, marker, label };
        });
    }

    private checkSurveyProgress() {
        if (!this.isDriving) return;

        if (this.solLevel >= 3) {
            if (Phaser.Math.Distance.Between(this.rover.x, this.rover.y, 660, 440) < 90) {
                this.markObjectiveDone("rover");
            }
            return;
        }

        const nextIndex = this.surveySitesScanned;
        const reached = this.surveyWaypoints[nextIndex];
        if (!reached || reached.visited
            || Phaser.Math.Distance.Between(this.rover.x, this.rover.y, reached.x, reached.y) >= 58) return;

        reached.visited = true;
        this.surveySitesScanned += 1;
        reached.marker.setFillStyle(0x35C99A, 0.22).setStrokeStyle(3, 0x35C99A, 1);
        reached.label.setText(`${reached.label.text.split(" · ")[0]} · SCANNED`)
            .setColor("#A7FFD8");
        const nextSite = this.surveyWaypoints[this.surveySitesScanned];
        if (nextSite) {
            nextSite.marker.setFillStyle(0x07192A, 0.28).setStrokeStyle(3, 0x58DDF2, 0.95).setAlpha(1);
            nextSite.label.setText(`${nextSite.label.text.split(" · ")[0]} · ACTIVE · DRIVE HERE`)
                .setColor("#BDF7FF");
            this.tweens.add({
                targets: nextSite.marker,
                scale: 1.28,
                alpha: 0.35,
                duration: 1100,
                yoyo: true,
                repeat: -1
            });
        }

        if (this.surveySitesScanned === this.surveyWaypoints.length) {
            this.markObjectiveDone("rover");
            this.warningSystem.show({
                type: "SUCCESS",
                title: "FIELD SURVEY COMPLETE",
                message: "Both survey sites are mapped. Terrain samples logged to Outpost Sol.",
                durationMs: 5200
            });
        } else {
            this.warningSystem.show({
                type: "SUCCESS",
                title: `SURVEY BEACON ${this.surveySitesScanned}/2 SCANNED`,
                message: "Sample logged. Follow the remaining glowing beacon to finish the rover survey.",
                durationMs: 4200
            });
        }
    }
    // =========================================================
    // 4. INPUT CONTROLS
    // =========================================================
    private setupInputControls() {
        this.cursors = this.input.keyboard!.createCursorKeys();
        this.keys = {
            W: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.W),
            A: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A),
            S: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.S),
            D: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D),
            E: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.E),
            P: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.P),
            M: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.M),
            ESC: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
        };

        // Open Power Switchboard on P
        this.keys.P.on("down", () => {
            this.openSwitchboard();
        });

        // Open 7-Sol Mission Challenges on M
        this.keys.M.on("down", () => {
            this.toggleMissionChallenges();
        });

        // Pause Menu on ESC
        this.keys.ESC.on("down", () => {
            this.togglePauseMenu();
        });

        // Interact on E
        this.keys.E.on("down", () => {
            if (this.isDriving) {
                this.toggleRoverDriving();
                return;
            }

            if (this.nearbyModule) {
                this.nearbyModule.onInteract();
            }
        });
    }

    // =========================================================
    // 5. MARS HUD (Resource Meters, Telemetry, Notifications)
    // =========================================================
    private setupMarsHUD() {
        // Top-Left: The Three Resource Meters (Task 5)
        this.resourceMeters = new ResourceMeters({
            scene: this,
            x: 24,
            y: 18,
            onOpenSwitchboard: () => this.openSwitchboard()
        });

        // Top-Right: NASA Telemetry Feed (Task 7)
        this.telemetryPanel = new TelemetryPanel({
            scene: this,
            x: this.W - 344,
            y: 18,
            onOpenInsights: () => this.showScienceInsights()
        });

        // Top-Center: Warning System (Task 7)
        this.warningSystem = new WarningNotification(this);

        // Pause Button (Top Center-Right)
        const pauseBtn = ButtonFactory.createIconButton(
            this,
            this.W - 380,
            38,
            "⏸",
            18,
            UITheme.colors.primaryCyan,
            () => this.togglePauseMenu()
        );
        pauseBtn.setDepth(110);
        // Prominent HUD 7-Sol Mission Challenges Button
        const hudChallengesBtn = ButtonFactory.createButton({
            scene: this,
            x: this.W - 500,
            y: 38,
            width: 200,
            height: 38,
            fontSize: "12px",
            text: "7 SOL CHALLENGES [M]",
            primaryColor: UITheme.colors.primaryCyan,
            secondaryColor: 0x061528,
            textColor: UITheme.colors.primaryCyanStr,
            icon: "🎯",
            onClick: () => this.toggleMissionChallenges()
        });
        hudChallengesBtn.setDepth(110);

        const controlsHintBg = this.add.graphics().setDepth(110);
        controlsHintBg.fillStyle(0x061122, 0.78);
        controlsHintBg.fillRoundedRect(500, this.H - 23, this.W - 520, 19, 5);
        this.add.text(
            this.W - 30,
            this.H - 13,
            "WASD / ARROWS  MOVE     E  INTERACT     P  SWITCHBOARD     M  CHALLENGES     ESC  PAUSE",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "9px",
                color: "#B9C9D5",
                fontStyle: "bold"
            }
        ).setOrigin(1, 0.5).setDepth(111);
    }

    // =========================================================
    // 6. OBJECTIVES CARD
    // =========================================================
    private createObjectivesCard() {
        const cardW = 360;
        const cardH = 208;
        const cardX = 24;
        const cardY = 190;

        const container = this.add.container(cardX, cardY).setDepth(100);

        const bg = this.add.graphics();
        bg.fillStyle(0x07111F, 0.99);
        bg.fillRoundedRect(0, 0, cardW, cardH, 12);
        bg.lineStyle(1.5, UITheme.colors.primaryCyan, 0.76);
        bg.strokeRoundedRect(0, 0, cardW, cardH, 12);
        bg.fillStyle(UITheme.colors.primaryCyan, 0.9);
        bg.fillRoundedRect(0, 0, 4, cardH, { tl: 12, bl: 12, tr: 0, br: 0 });
        bg.fillStyle(0x102339, 0.95);
        bg.fillRoundedRect(9, 7, cardW - 18, 30, 7);
        container.add(bg);

        const title = this.add.text(18, 13, "MISSION TRACKER", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: "#F4FAFF",
            fontStyle: "bold"
        });
        container.add(title);

        const solBadge = this.add.text(cardW - 62, 14, `SOL 0${this.solLevel}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(1, 0);
        container.add(solBadge);

        this.objectiveProgressBar = this.add.graphics();
        container.add(this.objectiveProgressBar);
        this.objectiveProgressLabel = this.add.text(cardW - 14, 43, "0/4 COMPLETE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "8px",
            color: "#91A9BA",
            fontStyle: "bold"
        }).setOrigin(1, 0);
        container.add(this.objectiveProgressLabel);

        this.objectives.forEach((obj, idx) => {
            const isCurrent = idx === this.objectives.findIndex(item => !item.done);
            const rowY = 58 + idx * 25;
            const rowBg = this.add.graphics();
            if (isCurrent) {
                rowBg.fillStyle(0x16314A, 0.95);
                rowBg.fillRoundedRect(10, rowY - 3, cardW - 20, 22, 5);
            } else if (idx < this.objectives.length - 1) {
                rowBg.lineStyle(1, 0x263A4A, 0.62);
                rowBg.lineBetween(18, rowY + 20, cardW - 18, rowY + 20);
            }
            container.add(rowBg);

            const marker = this.add.circle(21, rowY + 7, 4,
                obj.done ? UITheme.colors.bioGreen : (isCurrent ? UITheme.colors.solarGold : 0x667A89));
            if (isCurrent) marker.setStrokeStyle(3, UITheme.colors.solarGold, 0.22);
            container.add(marker);

            const line = this.add.text(32, rowY, obj.done ? obj.text.substring(3) : obj.text, {
                fontFamily: UITheme.fonts.body,
                fontSize: "11px",
                color: obj.done ? UITheme.colors.bioGreenStr : (isCurrent ? UITheme.colors.solarGoldStr : "#AEBBC2"),
                fontStyle: isCurrent ? "bold" : "normal"
            });

            // Make Switchboard objective directly clickable
            if (obj.id === "power") {
                line.setInteractive({ useHandCursor: true });
                line.on("pointerover", () => {
                    line.setColor(UITheme.colors.solarGoldStr);
                });
                line.on("pointerout", () => {
                    line.setColor(obj.done ? UITheme.colors.bioGreenStr : (this.objectives.findIndex(item => !item.done) === idx ? UITheme.colors.solarGoldStr : "#AEBBC2"));
                });
                line.on("pointerdown", () => {
                    this.openSwitchboard();
                });
            }

            this.objectiveListTexts.push(line);
            container.add(line);
        });

        this.refreshObjectiveProgress();
        const suitTag = this.add.text(18, 177, `CREW LOADOUT  /  ${this.equippedSuitName.replace("ASTRONAUT ", "")}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: "#90A7B7",
            fontStyle: "bold"
        });
        container.add(suitTag);
    }

    private refreshObjectiveProgress() {
        const completed = this.objectives.filter(objective => objective.done).length;
        const currentIndex = this.objectives.findIndex(objective => !objective.done);
        this.objectiveProgressLabel?.setText(`${completed}/${this.objectives.length}`);
        this.objectiveProgressBar?.clear();
        this.objectiveProgressBar?.fillStyle(0x34434A, 1);
        this.objectiveProgressBar?.fillRoundedRect(18, 46, 260, 3, 2);
        if (completed > 0) {
            this.objectiveProgressBar?.fillStyle(UITheme.colors.bioGreen, 1);
            this.objectiveProgressBar?.fillRoundedRect(18, 46, 260 * completed / this.objectives.length, 3, 2);
        }

        this.objectiveListTexts.forEach((line, index) => {
            const objective = this.objectives[index];
            if (objective.done) {
                line.setColor(UITheme.colors.bioGreenStr).setFontStyle("normal");
            } else if (index === currentIndex) {
                line.setColor(UITheme.colors.solarGoldStr).setFontStyle("bold");
            } else {
                line.setColor("#AEBBC2").setFontStyle("normal");
            }
        });
    }
    private markObjectiveDone(id: string) {
        const obj = this.objectives.find(o => o.id === id);
        if (obj && !obj.done) {
            obj.done = true;
            const idx = this.objectives.indexOf(obj);
            if (this.objectiveListTexts[idx]) {
                this.objectiveListTexts[idx].setText(`✔ ${obj.text.substring(3)}`);
                this.objectiveListTexts[idx].setColor(UITheme.colors.bioGreenStr);
                this.objectiveListTexts[idx].setFontStyle("normal");
            }
            this.refreshObjectiveProgress();

            this.warningSystem.show({
                type: "SUCCESS",
                title: "OBJECTIVE ACCOMPLISHED",
                message: obj.text.substring(3),
                durationMs: 4000
            });

            // Check if all objectives complete!
            if (this.objectives.every(o => o.done)) {
                this.time.delayedCall(1200, () => {
                    this.triggerSolCompletion();
                });
            }
        }
    }

    // =========================================================
    // 7. INTERACTION PROMPT
    // =========================================================
    private createInteractionPrompt() {
        this.promptBg = this.add.graphics().setDepth(50);
        this.promptText = this.add.text(this.W / 2, this.H - 45, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(51);
    }

    private updateInteractionPrompt() {
        const prompt = this.isDriving
            ? (this.solLevel >= 3
                ? "DRIVE TO THE HABITAT DOCKING MARKER  ·  [ E ] EXIT ROVER"
                : this.surveyWaypoints[this.surveySitesScanned]
                    ? `NEXT TARGET: ${this.surveyWaypoints[this.surveySitesScanned].label.text.split(" · ")[0]}  ·  [ E ] EXIT ROVER`
                    : "SURVEY COMPLETE  ·  [ E ] EXIT ROVER")
            : this.nearbyModule?.id === "solar" && this.solLevel >= 3 && !this.solarArrayDamaged
                ? "SOLAR ARRAY NOMINAL  ·  RESPOND TO THE INCOMING STORM ALERT"
                : this.nearbyModule?.actionMessage.toUpperCase() ?? "";

        if (prompt) {
            this.promptText.setText(prompt);
            const textW = Math.min(this.W - 48, this.promptText.width + 36);
            this.promptBg.clear();
            this.promptBg.fillStyle(0x061122, 0.94);
            this.promptBg.fillRoundedRect(this.W / 2 - textW / 2, this.H - 62, textW, 34, 8);
            this.promptBg.lineStyle(1.5, UITheme.colors.primaryCyan, 1);
            this.promptBg.strokeRoundedRect(this.W / 2 - textW / 2, this.H - 62, textW, 34, 8);
        } else {
            this.promptText.setText("");
            this.promptBg.clear();
        }
    }

    // =========================================================
    // 8. INTERACTIVE MODULE ACTIONS
    // =========================================================
    private handleHabitatInteraction() {
        const currentLife = this.resourceMeters.getMeterValue("lifeSupport");
        const updatedLife = Math.min(100, currentLife + (this.solLevel >= 3 ? 10 : 8));
        this.resourceMeters.setMeterValue("lifeSupport", updatedLife);
        if (this.solLevel >= 3) {
            if (updatedLife >= 100) this.markObjectiveDone("hab");
        } else {
            this.markObjectiveDone("hab");
        }

        this.warningSystem.show({
            type: updatedLife >= 100 ? "SUCCESS" : "INFO",
            title: this.solLevel >= 3 ? "LIFE SUPPORT STABILIZATION" : "HABITAT INSPECTION",
            message: this.solLevel >= 3
                ? `Life support stability is now ${Math.round(updatedLife)}%. Reach 100% to complete the habitat objective.`
                : "Atmospheric scrubbers nominal. Pressure: 1.0 ATM. Oxygen mix balanced.",
            durationMs: 4500
        });
    }

    private handleGreenhouseInteraction() {
        if (!this.poweredModules.has("greenhouse")) {
            this.warningSystem.show({
                type: "CAUTION",
                title: "GREENHOUSE OFFLINE",
                message: "Route power to the greenhouse through the switchboard before harvesting crops.",
                actionLabel: "OPEN SWITCHBOARD",
                onAction: () => this.openSwitchboard(),
                durationMs: 5000
            });
            return;
        }

        this.markObjectiveDone("greenhouse");
        const currentLife = this.resourceMeters.getMeterValue("lifeSupport");
        this.resourceMeters.setMeterValue("lifeSupport", Math.min(100, currentLife + 15));

        this.warningSystem.show({
            type: "SUCCESS",
            title: "GREENHOUSE HARVEST",
            message: "Hydroponic crops harvested! Fresh O₂ injected into life support loop (+15%).",
            durationMs: 4500
        });
    }

    private handleSolarInteraction() {
        if (this.solLevel >= 3 && !this.solarArrayDamaged) {
            this.warningSystem.show({
                type: "INFO",
                title: "SOLAR ARRAY NOMINAL",
                message: "Wait for the incoming storm to damage the array, then return here to repair it.",
                durationMs: 4000
            });
            return;
        }

        if (this.objectives.some(objective => objective.id === "solar" && !objective.done)) {
            this.markObjectiveDone("solar");
        }
        const currentPower = this.resourceMeters.getMeterValue("hullPower");
        this.resourceMeters.setMeterValue("hullPower", Math.min(100, currentPower + (this.solLevel >= 3 ? 28 : 12)));
        if (this.solLevel >= 3) {
            this.solarArrayDamaged = false;
            this.solarArraySprite?.clearTint();
            this.solarDamageLabel?.setVisible(false);
        }

        this.warningSystem.show({
            type: "SUCCESS",
            title: this.solLevel >= 3 ? "STORM DAMAGE REPAIRED" : "SOLAR CELLS MAINTAINED",
            message: this.solLevel >= 3
                ? "Photovoltaic array restored after the storm. Hull power recovered (+28%)."
                : "Martian dust wiped from photovoltaic panels. Solar wattage restored (+12%).",
            durationMs: 4500
        });
    }

    private handleAntennaInteraction() {
        if (this.objectives.some(objective => objective.id === "antenna" && !objective.done)) {
            this.markObjectiveDone("antenna");
        }
        this.warningSystem.show({
            type: "INFO",
            title: "TELEMETRY LINK SYNCHRONIZED",
            message: "Direct link to NASA Houston established via Mars Reconnaissance Orbiter.",
            durationMs: 4500
        });
    }

    private toggleRoverDriving() {
        this.isDriving = !this.isDriving;

        if (this.isDriving) {
            this.astronaut.setVisible(false);
            if (this.callsignBadge) this.callsignBadge.setVisible(false);
            this.warningSystem.show({
                type: "INFO",
                title: "ROVER ENGAGED",
                message: this.solLevel >= 3
                    ? "Drive to the habitat marker to complete a safe storm-shelter docking."
                    : "Drive to both glowing survey beacons to finish the field survey. Press E to disembark.",
                durationMs: 4000
            });
        } else {
            this.astronaut.setVisible(true);
            this.astronaut.setPosition(this.rover.x + 35, this.rover.y);
            if (this.callsignBadge) {
                this.callsignBadge.setVisible(true);
                this.callsignBadge.setPosition(this.astronaut.x, this.astronaut.y - 84);
            }
        }
    }

    private handleCryoDrillInteraction() {
        this.markObjectiveDone("cryo_drill");
        const currentLife = this.resourceMeters.getMeterValue("lifeSupport");
        this.resourceMeters.setMeterValue("lifeSupport", Math.min(100, currentLife + 25));

        this.warningSystem.show({
            type: "SUCCESS",
            title: "CRYO-ICE CORE EXTRACTED",
            message: `Subsurface water ice harvested via ${this.equippedToolId === "drill" ? "Core Drill (+25% yield)" : "Thermal Drill"}! Filtered into life support (+25%).`,
            durationMs: 5000
        });
    }

    // =========================================================
    // 9. POWER SWITCHBOARD CONSOLE (Task 6)
    // =========================================================
    public openSwitchboard() {
        if (this.switchboardModal) return;

        this.switchboardModal = new PowerSwitchboard(this, {
            onModuleToggled: (moduleId: string, isPowered: boolean) => {
                if (isPowered) this.poweredModules.add(moduleId);
                else this.poweredModules.delete(moduleId);
                this.handleSwitchboardChange(moduleId, isPowered);
            },
            onApply: (poweredModuleIds: string[]) => {
                this.poweredModules = new Set(poweredModuleIds);
                const requiredModule = this.solLevel === 1
                    ? "greenhouse"
                    : this.solLevel === 2
                        ? "shield_generator"
                        : undefined;
                if (requiredModule && !this.poweredModules.has(requiredModule)) {
                    return this.solLevel === 1
                        ? "MISSION REQUIREMENT: ROUTE POWER TO THE GREENHOUSE BEFORE APPLYING."
                        : "MISSION REQUIREMENT: POWER THE MAGNETIC SHIELD BEFORE APPLYING.";
                }
                this.markObjectiveDone("power");
                return undefined;
            },
            onClose: () => {
                if (this.switchboardModal) {
                    this.switchboardModal.destroy();
                    this.switchboardModal = undefined;
                }
            }
        }, this.poweredModules);
    }

    private handleSwitchboardChange(moduleId: string, isPowered: boolean) {
        if (moduleId === "shield_generator") {
            const health = this.resourceMeters.getMeterValue("crewHealth");
            this.resourceMeters.setMeterValue("crewHealth", isPowered ? 100 : Math.max(30, health - 20));
            this.warningSystem.show({
                type: isPowered ? "SUCCESS" : "CAUTION",
                title: isPowered ? "MAGNETIC SHIELD ONLINE" : "MAGNETIC SHIELD OFFLINE",
                message: isPowered ? "Deflecting solar storm radiation!" : "Habitat exposed to ambient Martian cosmic rays.",
                durationMs: 4000
            });
        } else if (moduleId === "hab_life_support" && !isPowered) {
            this.warningSystem.show({
                type: "DANGER",
                title: "LIFE SUPPORT UNPOWERED",
                message: "Airlock scrubbers unpowered! Oxygen will rapidly drain unless restored.",
                actionLabel: "SWITCHBOARD",
                onAction: () => this.openSwitchboard(),
                durationMs: 6000
            });
        }
    }

    // =========================================================
    // 9B. 7-SOL MISSION CHALLENGES OVERLAY
    // =========================================================
    public toggleMissionChallenges() {
        if (this.missionChallengesModal) {
            this.missionChallengesModal.close();
            this.missionChallengesModal = undefined;
            return;
        }

        this.missionChallengesModal = new MissionChallengesModal(
            this,
            {
                onClose: () => {
                    this.missionChallengesModal = undefined;
                },
                onChallengeAction: (actionId: string, _payload?: any) => {
                    this.warningSystem.show({
                        type: "INFO",
                        title: "CHALLENGE DIRECTIVE EXECUTED",
                        message: `Action recorded: ${actionId.toUpperCase()}`,
                        durationMs: 3500
                    });
                },
                onAdvanceSol: (nextSol: number) => {
                    this.solLevel = Math.min(7, nextSol);
                    this.registry.set("solLevel", this.solLevel);
                    this.warningSystem.show({
                        type: "SUCCESS",
                        title: `ADVANCING TO SOL 0${this.solLevel}`,
                        message: `NASA Mission Operations: Flight directive updated for Sol 0${this.solLevel}.`,
                        durationMs: 5000
                    });
                }
            },
            this.solLevel
        );
    }

    // =========================================================
    // 10. SPACE WEATHER SIMULATION (Task 7)
    // =========================================================
    private setupDONKIWeatherEvents() {
        // Trigger a simulated solar flare event after 40 seconds
        this.time.delayedCall(38000, () => {
            this.telemetryPanel.setDonkiAlert("SOLAR_STORM");
            if (this.solLevel >= 3) {
                this.solarArrayDamaged = true;
                this.solarArraySprite?.setTint(0xFF7A69);
                this.solarDamageLabel?.setVisible(true);
                const currentPower = this.resourceMeters.getMeterValue("hullPower");
                this.resourceMeters.setMeterValue("hullPower", Math.max(10, currentPower - 24));
            }
            this.warningSystem.show({
                type: "DANGER",
                title: "DONKI ALERT: M-CLASS SOLAR FLARE",
                message: this.solLevel >= 3
                    ? "Coronal Mass Ejection damaged the solar array! Repair the panels and divert power to the Magnetic Shield."
                    : "Coronal Mass Ejection approaching Mars! Divert power to the Magnetic Shield immediately.",
                actionLabel: "OPEN SWITCHBOARD",
                onAction: () => this.openSwitchboard(),
                durationMs: 8000
            });
        });
    }

    // =========================================================
    // 11. PAUSE & SOL RESULTS MODALS (Task 8)
    // =========================================================
    private togglePauseMenu() {
        if (this.pauseModal) {
            this.pauseModal.destroy();
            this.pauseModal = undefined;
            return;
        }

        this.pauseModal = MissionModals.createPauseModal(this, {
            onResume: () => {
                this.pauseModal = undefined;
            },
            onRestart: () => {
                this.pauseModal = undefined;
                this.scene.restart();
            },
            onAbort: () => {
                this.pauseModal = undefined;
                this.scene.start("OutpostSolScene");
            }
        });
    }

    private triggerSolCompletion() {
        const stats: SolResultsStats = {
            stars: 3,
            solLevel: this.solLevel,
            suitName: this.equippedSuitName,
            callsign: this.equippedCallsign,
            lifeSupportScore: Math.round(this.resourceMeters.getMeterValue("lifeSupport")),
            powerEfficiencyScore: Math.round(this.resourceMeters.getMeterValue("hullPower")),
            samplesCollected: this.solLevel * 4,
            insightTitle: this.solLevel === 1
                ? "Ancient Water Sediments in Jezero Crater"
                : (this.solLevel === 2
                    ? "Subsurface Permafrost Glaciers in Arcadia Planitia"
                    : "Planetary Dust Devils & Atmospheric Dynamics"),
            insightDesc: this.solLevel === 1
                ? "NASA's Perseverance rover discovered fine-grained mudstones in Jezero delta that preserved ancient organic compounds. Outpost Sol's location provides prime access to these scientific treasures."
                : (this.solLevel === 2
                    ? "Arcadia Planitia features vast sheets of water ice buried just 1 to 2.5 meters below the red dust, accessible by simple core drills for astronaut drinking water and rocket fuel propellant."
                    : "Global Martian dust storms can shroud the entire planet for months. Outpost Sol's automated solar array wiper systems and shielded domes safeguard the expedition against extreme electrostatic dust.")
        };

        this.resultsModal = MissionModals.createResultsModal(this, stats, {
            onNextSol: () => {
                this.resultsModal?.destroy();
                this.resultsModal = undefined;
                if (this.solLevel < 3) {
                    this.registry.set("solLevel", this.solLevel + 1);
                    this.scene.restart();
                } else {
                    this.registry.set("solLevel", 1);
                    this.scene.start("OutpostSolScene");
                }
            },
            onReturnHome: () => {
                this.resultsModal?.destroy();
                this.resultsModal = undefined;
                this.registry.set("solLevel", 1);
                this.scene.start("OutpostSolScene");
            }
        });
    }

    private showScienceInsights() {
        this.warningSystem.show({
            type: "INFO",
            title: "NASA OSDR SCIENCE INSIGHT",
            message: "Martian gravity is 38% of Earth's. Astronauts use resistance tools to maintain bone mineral density.",
            durationMs: 6000
        });
    }

    // =========================================================
    // 12. GAME LOOP (Update)
    // =========================================================
    override update(_time: number, delta: number) {
        if (this.pauseModal || this.resultsModal || this.missionChallengesModal) return;

        // Player Movement
        this.handleMovement(delta);
        this.checkSurveyProgress();

        // Proximity detection for base modules
        this.checkModuleProximity();

        // Sort sprites by their ground contact point so the astronaut can pass behind structures.
        for (const module of this.modules) {
            module.sprite.setDepth(8 + module.y / 100);
        }
        const actorY = this.isDriving ? this.rover.y : this.astronaut.y;
        this.astronaut.setDepth(8 + actorY / 100);
        this.rover.setDepth(8 + this.rover.y / 100);
        this.callsignBadge?.setDepth(9 + actorY / 100);

        // Passive Resource Drain (Simulated Mars Environment)
        this.drainTimer += delta;
        if (this.drainTimer > 2000) {
            this.drainTimer = 0;
            const currentLife = this.resourceMeters.getMeterValue("lifeSupport");
            const currentPower = this.resourceMeters.getMeterValue("hullPower");

            // Drain slightly
            this.resourceMeters.setMeterValue("lifeSupport", Math.max(10, currentLife - 0.4 * this.drainRate), 1500);
            this.resourceMeters.setMeterValue("hullPower", Math.max(10, currentPower - 0.3 * this.drainRate), 1500);
        }
    }

    private handleMovement(delta: number) {
        let vx = 0;
        let vy = 0;

        if (this.cursors.left.isDown || this.keys.A.isDown) vx -= 1;
        if (this.cursors.right.isDown || this.keys.D.isDown) vx += 1;
        if (this.cursors.up.isDown || this.keys.W.isDown) vy -= 1;
        if (this.cursors.down.isDown || this.keys.S.isDown) vy += 1;

        const isMoving = vx !== 0 || vy !== 0;
        const target = this.isDriving ? this.rover : this.astronaut;
        const speed = this.isDriving ? this.roverSpeed : this.moveSpeed;

        if (isMoving) {
            const mag = Math.sqrt(vx * vx + vy * vy);
            target.x += (vx / mag) * speed * (delta / 1000);
            target.y += (vy / mag) * speed * (delta / 1000);

            // Bounds limit to Mars terrain; resolve structure collisions per axis for smooth sliding.
            const nextX = Phaser.Math.Clamp(target.x + (vx / mag) * speed * (delta / 1000), 80, this.W - 80);
            const nextY = Phaser.Math.Clamp(target.y + (vy / mag) * speed * (delta / 1000), 380, this.H - 60);
            if (!this.isInsideBaseStructure(nextX, nextY)) {
                target.setPosition(nextX, nextY);
            } else {
                if (!this.isInsideBaseStructure(nextX, target.y)) target.x = nextX;
                if (!this.isInsideBaseStructure(target.x, nextY)) target.y = nextY;
            }

            if (vx < 0) target.setFlipX(true);
            else if (vx > 0) target.setFlipX(false);

            // Astronaut walking animation motion - keeping equipped suit!
            if (!this.isDriving) {
                this.walkTimer += delta;

                const suitKey = `${this.equippedGender}_avatar_${this.equippedSuitFrame}`;
                if (this.textures.exists(suitKey) && this.astronaut.texture.key !== suitKey) {
                    this.astronaut.setTexture(suitKey);
                }

                // Low-gravity Martian stride bobbing & tilt sway
                const strideStep = this.walkTimer * 0.012;
                this.astronaut.angle = Math.sin(strideStep) * 6;
                const squish = Math.sin(strideStep * 1.5);
                this.astronaut.setScale(
                    0.28 * (1 - Math.abs(squish) * 0.04),
                    0.28 * (1 + Math.abs(squish) * 0.04)
                );

                if (this.callsignBadge) {
                    this.callsignBadge.setPosition(this.astronaut.x, this.astronaut.y - 84);
                    this.callsignBadge.setVisible(true);
                }
            }
        } else {
            // Idle standing stance when stopped
            if (!this.isDriving) {
                this.astronaut.angle = 0;
                this.astronaut.setScale(0.28);
                if (this.callsignBadge) {
                    this.callsignBadge.setPosition(this.astronaut.x, this.astronaut.y - 84);
                    this.callsignBadge.setVisible(true);
                }
            }
        }
    }

    private isInsideBaseStructure(x: number, y: number) {
        const collisionRadii: Record<string, number> = {
            greenhouse: 82,
            hab: 108,
            antenna: 58,
            solar: 68,
            cryo_drill: 48
        };
        return this.modules.some(module => {
            const radius = collisionRadii[module.id];
            return radius !== undefined && Phaser.Math.Distance.Between(x, y, module.x, module.y) < radius;
        });
    }

    private checkModuleProximity() {
        const playerX = this.isDriving ? this.rover.x : this.astronaut.x;
        const playerY = this.isDriving ? this.rover.y : this.astronaut.y;

        let closest: BaseModuleObject | null = null;
        let minDist = Infinity;

        for (const mod of this.modules) {
            // Ignore rover proximity when driving it
            if (this.isDriving && mod.id === "rover") continue;

            const dist = Phaser.Math.Distance.Between(playerX, playerY, mod.x, mod.y);
            if (dist < mod.interactRadius && dist < minDist) {
                minDist = dist;
                closest = mod;
            }
        }

        this.nearbyModule = closest;
        this.updateInteractionPrompt();
    }
}

export default MarsWorldScene;
