import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import ResourceMeters from "../components/ResourceMeters.ts";
import TelemetryPanel from "../components/TelemetryPanel.ts";
import WarningNotification from "../components/WarningNotification.ts";
import PowerSwitchboard from "../components/PowerSwitchboard.ts";
import MissionModals, { type SolResultsStats } from "../components/MissionModals.ts";
import MissionChallengesModal from "../components/MissionChallengesModal.ts";
import ButtonFactory, { SoundFX } from "../components/ButtonFactory.ts";
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
        F: Phaser.Input.Keyboard.Key;
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
    private baseMaterial: "glass" | "sand" = "glass";
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

    // Mission Objectives
    private objectives: { id: string; text: string; done: boolean }[] = [];
    private objectiveListTexts: Phaser.GameObjects.Text[] = [];

    // Role & Environmental Simulation
    private playerRole: GameRole = "cadet";
    private landingSite: LandingSiteId = "jezero";
    private drainRate = 1.0;
    private drainTimer = 0;

    constructor() {
        super("MarsWorldScene");
    }

    preload() {
        // NASA Jezero CTX mosaic terrain (always needed)
        if (!this.textures.exists("mars_terrain_jezero")) {
            this.load.image("mars_terrain_jezero", "/assets/game/mars/jezero-ctx-mosaic-3x3.png");
        }
        if (!this.textures.exists("mars_terrain")) {
            this.load.image("mars_terrain", "/assets/game/mars/jezero-ctx-mosaic-3x3.png");
        }

        // Arcadia Planitia mosaic: only requested when the player actually landed at Arcadia,
        // so a missing file can never break Jezero runs.
        const selectedSite = (this.registry.get("landingSite") as LandingSiteId) || "jezero";
        if (selectedSite === "arcadia" && !this.textures.exists("arcadia-mosaic")) {
            this.load.image("arcadia-mosaic", "/assets/game/mars/arcadia-planitia-ctx-mosaic-3x3.png");
        }

        // Mars base assets
        this.load.image("base-station", "/assets/game/base/base-station.png");
        this.load.image("sand-base-station", "/assets/game/base/sand-base-station.png");
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
        // Reset active tracking arrays
        this.modules = [];
        this.objectiveListTexts = [];

        // Read configuration from registry
        this.playerRole = (this.registry.get("playerRole") as GameRole) || "cadet";
        this.landingSite = (this.registry.get("landingSite") as LandingSiteId) || "jezero";
        this.drainRate = this.playerRole === "cadet" ? 0.65 : 1.15;
        this.solLevel = (this.registry.get("solLevel") as number) || 1;

        // Listen for Sol progression updates from challenge scenes
        this.events.off("solLevelUpdated");
        this.events.on("solLevelUpdated", (newSol: number) => {
            this.solLevel = newSol;
            this.warningSystem.show({
                type: "INFO",
                title: `SOL 0${this.solLevel} UNLOCKED · MISSION ADVANCED`,
                message: `Congratulations! Mission engineering milestone Sol 0${this.solLevel} validated by NASA flight controllers.`,
                durationMs: 5000
            });
        });

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

        // Load base construction material (Glass Biosphere vs Sintered Sand Vault)
        const regMaterial = this.registry.get("baseConstructionMaterial") as "glass" | "sand" | undefined;
        let savedMaterial: "glass" | "sand" | null = null;
        if (typeof window !== "undefined" && window.localStorage) {
            try {
                const item = localStorage.getItem("astra_base_material");
                if (item === "glass" || item === "sand") savedMaterial = item;
            } catch {
                // Ignore storage errors
            }
        }
        this.baseMaterial = regMaterial || savedMaterial || "glass";

        // Initialize Level Objectives based on Sol Level
        const surveyLocation = this.landingSite === "arcadia" ? "Arcadia Planitia plains" : "Jezero Crater rim";
        if (this.solLevel === 1) {
            this.objectives = [
                { id: "hab", text: "1. Inspect Mars Habitat airlock", done: false },
                { id: "power", text: "2. Engage Power Switchboard (Press P)", done: false },
                { id: "greenhouse", text: "3. Activate Mars Greenhouse crops", done: false },
                { id: "rover", text: `4. Board Rover & survey ${surveyLocation}`, done: false }
            ];
        } else if (this.solLevel === 2) {
            this.objectives = [
                { id: "cryo_drill", text: "1. Deploy Core Ice Drill at Cryo-Well", done: false },
                { id: "power", text: "2. Divert 25 kW to Magnetic Radiation Shield (P)", done: false },
                { id: "greenhouse", text: "3. Harvest cold-tolerant crops in Greenhouse", done: false },
                { id: "rover", text: "4. Pilot Rover to survey subterranean ice plains", done: false }
            ];
        } else if (this.solLevel === 5) {
            this.objectives = [
                { id: "emergency_hab", text: "1. Enter The Last Safe Habitat (Press E / [M])", done: false },
                { id: "air_distribution", text: "2. Repair air distribution pipe leak", done: false },
                { id: "electrical_grid", text: "3. Restore power circuit to heaters & ECLSS", done: false },
                { id: "oxygen_regulation", text: "4. Calibrate pressure valves (56-64 kPa)", done: false }
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

        // 4. Input System
        this.setupInputControls();

        // 5. Initialize HUD Systems (Tasks 5, 6, 7, 9, 10)
        this.setupMarsHUD();

        // 6. Interaction Prompt HUD
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
        const isArcadia = this.landingSite === "arcadia";
        const skyColors = [0x180E1C, 0x0C1826, 0x2A1408];
        const terrainTints = [0xE38656, 0xBC7558, 0x9E4B28];
        const currentSky = isArcadia ? 0x0C1826 : (skyColors[this.solLevel - 1] || skyColors[0]);
        const currentTint = isArcadia ? 0xBC7558 : (terrainTints[this.solLevel - 1] || terrainTints[0]);

        // Deep Atmospheric Sky
        this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, currentSky).setDepth(-20);

        // NASA Jezero / Arcadia CTX Mosaic Backdrop.
        // Falls back to the Jezero mosaic (then to nothing) if the Arcadia file failed to load.
        let terrainKey: string | null = null;
        if (isArcadia && this.textures.exists("arcadia-mosaic")) {
            terrainKey = "arcadia-mosaic";
        } else if (this.textures.exists("mars_terrain_jezero")) {
            terrainKey = "mars_terrain_jezero";
        }

        if (terrainKey) {
            const terrain = this.add.image(this.W / 2, this.H / 2, terrainKey);
            terrain.setDisplaySize(this.W, this.H);
            terrain.setTint(currentTint);
            terrain.setAlpha(0.92);
            terrain.setDepth(-19);
        }

        // Mars Dust Overlay & Horizon Glow
        const horizonColor = (isArcadia || this.solLevel === 2) ? 0x4A709C : 0xC8573E;
        const horizon = this.add.ellipse(640, 360, 1300, 320, horizonColor, 0.28).setDepth(-18);
        this.tweens.add({
            targets: horizon,
            alpha: 0.38,
            duration: 4000,
            yoyo: true,
            repeat: -1
        });

        // Mars Base Surface Pad: Expansive and wide
        const padColor = (isArcadia || this.solLevel === 2) ? 0x6E4238 : 0x8C3F2D;
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
        const isGlass = this.baseMaterial === "glass";
        let habImg: Phaser.GameObjects.Image;

        if (isGlass) {
            // Glass Biosphere Dome
            habImg = this.add.image(660, 440, "base-station");
            habImg.setScale(0.65);
            habImg.setDepth(10);
            habImg.setTint(0xD0F8FF);

            const domeGlow = this.add.ellipse(660, 428, 230, 145, 0x00E5FF, 0.18);
            domeGlow.setDepth(9);
            this.tweens.add({
                targets: domeGlow,
                alpha: 0.32,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 2500,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });
        } else {
            // Sintered Sand Base Station: monolithic architecture made out of Martian sand and covered in dunes
            const sandKey = this.textures.exists("sand-base-station") ? "sand-base-station" : "base-station";
            habImg = this.add.image(660, 440, sandKey);
            habImg.setScale(sandKey === "sand-base-station" ? 0.42 : 0.65);
            habImg.setDepth(10);
            if (sandKey !== "sand-base-station") {
                habImg.setTint(0xE0936C);
            }

            // Realistic Martian sand dunes banked up against the foundation
            const duneBack = this.add.ellipse(660, 470, 390, 105, 0x98411D, 0.55);
            duneBack.setDepth(9);

            const duneFront = this.add.ellipse(660, 486, 335, 72, 0xC46B42, 0.65);
            duneFront.setStrokeStyle(2, 0xE89363, 0.6);
            duneFront.setDepth(9);

            // Fine windblown sand dust particles drifting around the sand station
            for (let i = 0; i < 16; i++) {
                const sandMote = this.add.circle(
                    660 + Phaser.Math.Between(-180, 180),
                    440 + Phaser.Math.Between(-80, 80),
                    Phaser.Math.FloatBetween(1.0, 2.2),
                    0xE0936C,
                    Phaser.Math.FloatBetween(0.25, 0.65)
                );
                sandMote.setDepth(11);
                this.tweens.add({
                    targets: sandMote,
                    x: sandMote.x + Phaser.Math.Between(25, 55),
                    y: sandMote.y + Phaser.Math.Between(-12, 12),
                    alpha: 0.1,
                    duration: Phaser.Math.Between(3000, 5000),
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut"
                });
            }
        }

        const habName = isGlass ? "OUTPOST SOL GLASS BIOSPHERE DOME" : "OUTPOST SOL SINTERED SAND VAULT";
        this.modules.push({
            id: "hab",
            name: habName,
            icon: isGlass ? "🌐" : "🏜️",
            x: 660,
            y: 440,
            sprite: habImg,
            interactRadius: 140,
            actionMessage: "Press [ E ] to Inspect Habitat Airlock",
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
        this.modules.push({
            id: "solar",
            name: "SOLAR CELL ARRAY",
            icon: "⚡",
            x: 1140,
            y: 530,
            sprite: solarImg,
            interactRadius: 130,
            actionMessage: "Press [ E ] to Clean Martian Dust off Solar Cells",
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
            actionMessage: "Press [ E ] to Board Mars Rover",
            onInteract: () => this.toggleRoverDriving()
        });
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
            F: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F),
            ESC: this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
        };

        // Toggle Fullscreen on F
        this.keys.F.on("down", () => {
            SoundFX.playClick();
            if (!document.fullscreenElement) {
                document.documentElement.requestFullscreen().catch(() => {});
            } else {
                document.exitFullscreen().catch(() => {});
            }
        });

        // Open Power Switchboard on P
        this.keys.P.on("down", () => {
            SoundFX.playClick();
            this.openSwitchboard();
        });

        // Open 5-Sol Mission Challenges on M
        this.keys.M.on("down", () => {
            SoundFX.playClick();
            this.toggleMissionChallenges();
        });

        // Pause Menu on ESC
        this.keys.ESC.on("down", () => {
            SoundFX.playClick();
            this.togglePauseMenu();
        });

        // Interact on E
        this.keys.E.on("down", () => {
            SoundFX.playKeyStroke();
            if (this.isDriving) {
                // If driving, pressing E dismounts and jumps out of the rover
                this.dismountRoverWithJump();
            } else if (this.nearbyModule) {
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

        // Top-Right Symmetrical HUD Navigation Controls
        const hudChallengesBtn = ButtonFactory.createButton({
            scene: this,
            x: 760,
            y: 38,
            width: 210,
            height: 38,
            fontSize: "11px",
            text: "5 SOL CHALLENGES [M]",
            primaryColor: UITheme.colors.primaryCyan,
            secondaryColor: 0x061528,
            textColor: UITheme.colors.primaryCyanStr,
            icon: "🎯",
            onClick: () => this.toggleMissionChallenges()
        });
        hudChallengesBtn.setDepth(110);

        // Pause Button (Symmetrically spaced next to Challenges button)
        const pauseBtn = ButtonFactory.createIconButton(
            this,
            895,
            38,
            "⏸",
            18,
            UITheme.colors.primaryCyan,
            () => this.togglePauseMenu()
        );
        pauseBtn.setDepth(110);
    }

    // =========================================================
    // 6. OBJECTIVES CARD (Removed for simplified, kid-friendly HUD)
    // =========================================================
    private createObjectivesCard() {
        // Sol objective tab removed to keep screen spacious and clutter-free for young cadets
    }

    private markObjectiveDone(id: string) {
        const obj = this.objectives.find(o => o.id === id);
        if (obj && !obj.done) {
            obj.done = true;
            const idx = this.objectives.indexOf(obj);
            if (this.objectiveListTexts[idx]) {
                this.objectiveListTexts[idx].setText(`✔ ${obj.text.substring(3)}`);
                this.objectiveListTexts[idx].setColor(UITheme.colors.bioGreenStr);
            }

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
        if (this.nearbyModule) {
            this.promptText.setText(this.nearbyModule.actionMessage.toUpperCase());
            const textW = this.promptText.width + 36;
            this.promptBg.clear();
            this.promptBg.fillStyle(0x061122, 0.9);
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
        if (this.solLevel === 5) {
            this.markObjectiveDone("emergency_hab");
            this.scene.sleep("MarsWorldScene");
            this.scene.launch("Sol5LastSafeHabitatScene");
            this.scene.bringToTop("Sol5LastSafeHabitatScene");
            return;
        }

        this.markObjectiveDone("hab");
        const currentLife = this.resourceMeters.getMeterValue("lifeSupport");
        this.resourceMeters.setMeterValue("lifeSupport", currentLife + 8);

        const isGlass = this.baseMaterial === "glass";
        this.warningSystem.show({
            type: "INFO",
            title: isGlass ? "GLASS BIOSPHERE INSPECTION" : "SINTERED SAND VAULT INSPECTION",
            message: isGlass
                ? "Fused silica dome: 92% daylight transmission. Atmospheric scrubbers nominal at 1.0 ATM."
                : "Monolithic sand structure: 100% sintered regolith walls banked in Martian sand dunes. Cosmic ray defense active (+55%).",
            durationMs: 4500
        });
    }

    private handleGreenhouseInteraction() {
        SoundFX.playSuccess();
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
        SoundFX.playClick();
        const currentPower = this.resourceMeters.getMeterValue("hullPower");
        this.resourceMeters.setMeterValue("hullPower", Math.min(100, currentPower + 12));

        this.warningSystem.show({
            type: "SUCCESS",
            title: "SOLAR CELLS MAINTAINED",
            message: "Martian dust wiped from photovoltaic panels. Solar wattage restored (+12%).",
            durationMs: 4500
        });
    }

    private handleAntennaInteraction() {
        SoundFX.playClick();
        this.warningSystem.show({
            type: "INFO",
            title: "TELEMETRY LINK SYNCHRONIZED",
            message: "Direct link to NASA Houston established via Mars Reconnaissance Orbiter.",
            durationMs: 4500
        });
    }

    private toggleRoverDriving() {
        if (this.isDriving) {
            this.dismountRoverWithJump();
            return;
        }

        // Boarding the rover
        this.isDriving = true;
        SoundFX.playClick();

        // Animate hopping smoothly into the rover seat
        this.tweens.add({
            targets: this.astronaut,
            x: this.rover.x,
            y: this.rover.y - 12,
            scale: 0.20,
            duration: 200,
            ease: "Quad.easeOut",
            onComplete: () => {
                this.astronaut.setVisible(false);
                if (this.callsignBadge) this.callsignBadge.setVisible(false);
            }
        });

        this.markObjectiveDone("rover");
        const roverSiteLabel = this.landingSite === "arcadia" ? "Arcadia Planitia" : "Jezero Crater";
        this.warningSystem.show({
            type: "INFO",
            title: "ROVER ENGAGED",
            message: `You are now driving the exploration rover across ${roverSiteLabel}! Move with WASD. Press [ E ] to Jump Out.`,
            durationMs: 4000
        });
    }

    private dismountRoverWithJump() {
        if (!this.isDriving) return;

        this.isDriving = false;

        // Keep the rover interaction hotspot synced to current rover coordinates
        const roverMod = this.modules.find(m => m.id === "rover");
        if (roverMod) {
            roverMod.x = this.rover.x;
            roverMod.y = this.rover.y;
        }

        // Determine landing position (to the side of the rover, clamped safely on the Martian surface)
        const dir = this.rover.flipX ? -1 : 1;
        const targetX = Phaser.Math.Clamp(this.rover.x + dir * 68, 90, this.W - 90);
        const targetY = Phaser.Math.Clamp(this.rover.y + 12, 380, this.H - 65);

        // Position astronaut at rover seat, visible and angled for the leap
        this.astronaut.setPosition(this.rover.x, this.rover.y - 14);
        this.astronaut.setVisible(true);
        this.astronaut.setDepth(26);
        this.astronaut.setScale(0.26);
        this.astronaut.angle = dir * -22;

        SoundFX.playClick();

        // 1. Horizontal Leap Tween
        this.tweens.add({
            targets: this.astronaut,
            x: targetX,
            duration: 440,
            ease: "Sine.easeOut"
        });

        // 2. Parabolic Vertical Arc (High 0.38g Martian Leap & Landing)
        this.tweens.add({
            targets: this.astronaut,
            y: this.rover.y - 58,
            duration: 220,
            ease: "Quad.easeOut",
            onComplete: () => {
                this.tweens.add({
                    targets: this.astronaut,
                    y: targetY,
                    duration: 220,
                    ease: "Quad.easeIn",
                    onComplete: () => {
                        // Impact Squash & Stretch on Landing
                        this.tweens.add({
                            targets: this.astronaut,
                            scaleX: 0.33,
                            scaleY: 0.22,
                            duration: 90,
                            yoyo: true,
                            ease: "Quad.easeInOut",
                            onComplete: () => {
                                this.astronaut.setScale(0.28);
                                this.astronaut.angle = 0;
                            }
                        });

                        // Martian Sand Dust Puff on landing
                        for (let i = 0; i < 12; i++) {
                            const dust = this.add.circle(
                                targetX + Phaser.Math.Between(-10, 10),
                                targetY + 26,
                                Phaser.Math.FloatBetween(2.0, 4.5),
                                0xD48455,
                                0.85
                            ).setDepth(24);

                            this.tweens.add({
                                targets: dust,
                                x: dust.x + Phaser.Math.Between(-40, 40),
                                y: dust.y + Phaser.Math.Between(-16, 6),
                                alpha: 0,
                                scale: 0.2,
                                duration: 420,
                                ease: "Quad.easeOut",
                                onComplete: () => dust.destroy()
                            });
                        }

                        // Restore and anchor Callsign Badge above astronaut
                        if (this.callsignBadge) {
                            this.callsignBadge.setPosition(targetX, targetY - 84);
                            this.callsignBadge.setVisible(true);
                        }
                    }
                });
            }
        });

        // 3. Aerial Rotation Stabilization
        this.tweens.add({
            targets: this.astronaut,
            angle: 0,
            duration: 440,
            ease: "Sine.easeInOut"
        });

        // Notify Cadet
        this.warningSystem.show({
            type: "SUCCESS",
            title: "CADET DISMOUNTED",
            message: "Astronaut leaped out of the Mars Rover! Surface exploration resumed on foot.",
            durationMs: 3500
        });

        // If dismounting near an interactive module, trigger its action
        if (this.nearbyModule && this.nearbyModule.id !== "rover") {
            const modToInteract = this.nearbyModule;
            this.time.delayedCall(500, () => {
                modToInteract.onInteract();
            });
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

        this.markObjectiveDone("power");

        this.switchboardModal = new PowerSwitchboard(this, {
            onModuleToggled: (moduleId: string, isPowered: boolean) => {
                this.handleSwitchboardChange(moduleId, isPowered);
            },
            onClose: () => {
                if (this.switchboardModal) {
                    this.switchboardModal.destroy();
                    this.switchboardModal = undefined;
                }
            }
        });
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
    // 9B. 5-SOL MISSION CHALLENGES OVERLAY
    // =========================================================
    public toggleMissionChallenges(initialSol?: number) {
        if (this.missionChallengesModal) {
            this.missionChallengesModal.close();
            this.missionChallengesModal = undefined;
            return;
        }

        this.openMissionChallenges(initialSol);
    }

    public openMissionChallenges(initialSol?: number) {
        if (this.missionChallengesModal) {
            this.missionChallengesModal.close();
            this.missionChallengesModal = undefined;
        }

        const solToOpen = initialSol ?? this.solLevel;
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
                    this.solLevel = Math.min(5, nextSol);
                    this.registry.set("solLevel", this.solLevel);
                    this.warningSystem.show({
                        type: "SUCCESS",
                        title: `ADVANCING TO SOL 0${this.solLevel}`,
                        message: `NASA Mission Operations: Flight directive updated for Sol 0${this.solLevel}.`,
                        durationMs: 5000
                    });
                }
            },
            solToOpen
        );
    }

    // =========================================================
    // 10. SPACE WEATHER SIMULATION (Task 7)
    // =========================================================
    private setupDONKIWeatherEvents() {
        // Trigger a simulated solar flare event after 40 seconds
        this.time.delayedCall(38000, () => {
            this.telemetryPanel.setDonkiAlert("SOLAR_STORM");
            this.warningSystem.show({
                type: "DANGER",
                title: "DONKI ALERT: M-CLASS SOLAR FLARE",
                message: "Coronal Mass Ejection approaching Mars! Divert power to the Magnetic Shield immediately.",
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
        if (this.isDriving) {
            this.dismountRoverWithJump();
        }

        const stats: SolResultsStats = {
            stars: 3,
            solLevel: this.solLevel,
            suitName: this.equippedSuitName,
            callsign: this.equippedCallsign,
            lifeSupportScore: Math.round(this.resourceMeters.getMeterValue("lifeSupport")),
            powerEfficiencyScore: Math.round(this.resourceMeters.getMeterValue("hullPower")),
            samplesCollected: this.solLevel * 4,
            insightTitle: this.solLevel === 1
                ? (this.landingSite === "arcadia"
                    ? "Subsurface Water-Ice Sheets in Arcadia Planitia"
                    : "Ancient Water Sediments in Jezero Crater")
                : (this.solLevel === 2
                    ? "Subsurface Permafrost Glaciers in Arcadia Planitia"
                    : "Planetary Dust Devils & Atmospheric Dynamics"),
            insightDesc: this.solLevel === 1
                ? (this.landingSite === "arcadia"
                    ? "Arcadia Planitia features vast sheets of water ice buried just 1 to 2.5 meters below the red dust, making it a prime candidate for future human ISRU landing sites."
                    : "NASA's Perseverance rover discovered fine-grained mudstones in Jezero delta that preserved ancient organic compounds. Outpost Sol's location provides prime access to these scientific treasures.")
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

        // Proximity detection for base modules
        this.checkModuleProximity();

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

            // Bounds limit to Mars terrain
            target.x = Phaser.Math.Clamp(target.x, 80, this.W - 80);
            target.y = Phaser.Math.Clamp(target.y, 380, this.H - 60);

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

    private checkModuleProximity() {
        if (this.isDriving) {
            // Keep rover module hotspot location synced with vehicle
            const roverMod = this.modules.find(m => m.id === "rover");
            if (roverMod) {
                roverMod.x = this.rover.x;
                roverMod.y = this.rover.y;
            }

            // Check if near any other module while driving
            let closest: BaseModuleObject | null = null;
            let minDist = Infinity;
            for (const mod of this.modules) {
                if (mod.id === "rover") continue;
                const dist = Phaser.Math.Distance.Between(this.rover.x, this.rover.y, mod.x, mod.y);
                if (dist < mod.interactRadius && dist < minDist) {
                    minDist = dist;
                    closest = mod;
                }
            }

            this.nearbyModule = closest;
            if (closest) {
                this.promptText.setText(`PRESS [ E ] TO JUMP OUT & INSPECT ${closest.name}`);
            } else {
                this.promptText.setText("PRESS [ E ] TO JUMP OUT OF ROVER");
            }

            const textW = this.promptText.width + 36;
            this.promptBg.clear();
            this.promptBg.fillStyle(0x061122, 0.9);
            this.promptBg.fillRoundedRect(this.W / 2 - textW / 2, this.H - 62, textW, 34, 8);
            this.promptBg.lineStyle(1.5, UITheme.colors.solarGold, 1);
            this.promptBg.strokeRoundedRect(this.W / 2 - textW / 2, this.H - 62, textW, 34, 8);
            return;
        }

        const playerX = this.astronaut.x;
        const playerY = this.astronaut.y;
        let closest: BaseModuleObject | null = null;
        let minDist = Infinity;

        for (const mod of this.modules) {
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