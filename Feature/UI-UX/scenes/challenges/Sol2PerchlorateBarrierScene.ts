import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import { ButtonFactory, SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

type Sol2GameState =
    | "ACTION_GAMEPLAY"
    | "ARRAY_PUZZLE"
    | "MISSION_COMPLETE"
    | "NIGHT_DECISION"
    | "NIGHT_ACTIVE";

interface ArrayChallenge {
    stationId: number;
    title: string;
    subTitle: string;
    question: string;
    optionA: {
        icon: string;
        title: string;
        desc: string;
        isCorrect: boolean;
        whyWrong?: string;
    };
    optionB: {
        icon: string;
        title: string;
        desc: string;
        isCorrect: boolean;
        whyWrong?: string;
    };
}

interface SolarArrayStation {
    id: number;
    x: number;
    y: number;
    container: Phaser.GameObjects.Container;
    dustLayer: Phaser.GameObjects.Graphics;
    solarCells: Phaser.GameObjects.Graphics;
    glowGraphic: Phaser.GameObjects.Graphics;
    dustProgressText: Phaser.GameObjects.Text;
    isCleaned: boolean;
    questionSolved: boolean;
}

interface DustDevilItem {
    container: Phaser.GameObjects.Container;
    vx: number;
    vy: number;
    radius: number;
}

export class Sol2PerchlorateBarrierScene extends SolChallengeBaseScene {
    private gameState: Sol2GameState = "ACTION_GAMEPLAY";

    // Player Cadet - Compact scale (0.24) placed BELOW the grid lane
    private readonly PLAYER_SCALE = 0.24;
    private astronautContainer!: Phaser.GameObjects.Container;
    private astronautSprite!: Phaser.GameObjects.Image;
    private astronautSpeed = 220;
    private isMoving = false;
    private isEnteringScene = false;
    private targetX: number | null = null;
    private targetY: number | null = null;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys?: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
    };

    // Continuous Dust Storm System
    private isDustStormActive = true;
    private dustStormHaze!: Phaser.GameObjects.Rectangle;
    private ambientDustTimer?: Phaser.Time.TimerEvent;
    private activeDustSpecks: Phaser.GameObjects.Arc[] = [];

    // Visual Containers & Panels
    private equipmentPanelContainer!: Phaser.GameObjects.Container;
    private puzzleModalContainer?: Phaser.GameObjects.Container;
    private missionCompleteModalContainer?: Phaser.GameObjects.Container;
    private nightDecisionModalContainer?: Phaser.GameObjects.Container;
    private powerMeterContainer!: Phaser.GameObjects.Container;
    private powerMeterFill!: Phaser.GameObjects.Graphics;
    private powerMeterText!: Phaser.GameObjects.Text;
    private sunsetOverlay!: Phaser.GameObjects.Graphics;
    private nasaTelemetryPill?: Phaser.GameObjects.Container;

    // Solar Arrays on Arcadia Planitia (Positioned at y = 390, Cadet walks at y = 570 BELOW the grid)
    private solarStations: SolarArrayStation[] = [];
    private cleanedStationsCount = 0;
    private isPuzzleModalOpen = false;
    private activePuzzleStationIdx: number | null = null;

    // Playful Little Dust Devils bouncing around
    private dustDevils: DustDevilItem[] = [];
    private isKnockedBack = false;
    private isBlowingWind = false;

    // 4 Distinct Kid-Friendly Science Challenges for Each Solar Array
    private readonly arrayChallenges: ArrayChallenge[] = [
        {
            stationId: 0,
            title: "SOLAR ARRAY 01: STICKY DUST PUZZLE",
            subTitle: "Sticky Red Dust Problem",
            question: "Red dust is sticking tight to the solar glass like a static balloon! How do we loosen it without scratching?",
            optionA: {
                icon: "💨",
                title: "WIND-BLOWER + ION ZAP",
                desc: "Shoot clean air pulses with an ion zap to cancel static cling so dust flies right off!",
                isCorrect: true
            },
            optionB: {
                icon: "🪥",
                title: "STEEL WIRE BRUSH",
                desc: "Scrape the glass hard with metal wire bristles to scrub the sand off.",
                isCorrect: false,
                whyWrong: "Uh-oh, Cadet! Scraping glass with metal scratches the solar cells forever and makes more static cling! Air blowing is much safer!"
            }
        },
        {
            stationId: 1,
            title: "SOLAR ARRAY 02: SAND CRUST PUZZLE",
            subTitle: "Heavy Sand Wave Problem",
            question: "A thick layer of heavy red sand is piled on this panel! Which angle should we blow the wind?",
            optionA: {
                icon: "🎯",
                title: "BLOW FROM 45° SIDE ANGLE",
                desc: "Air slides underneath the sand grains like a surfboard and sweeps them off!",
                isCorrect: true
            },
            optionB: {
                icon: "⬇️",
                title: "BLAST STRAIGHT DOWN",
                desc: "Shoot the air blower straight down into the middle of the glass.",
                isCorrect: false,
                whyWrong: "Uh-oh, Cadet! Shooting straight down pushes the sand deeper into the corners! Blow from the side so it lifts off!"
            }
        },
        {
            stationId: 2,
            title: "SOLAR ARRAY 03: SALT GRAINS PUZZLE",
            subTitle: "Toxic Perchlorate Salt Problem",
            question: "Sneaky white salt crystals are stuck to the metal edges! Mars salt is harsh chemicals. How do we clean it?",
            optionA: {
                icon: "🛡️",
                title: "SHORT AIR PUFFS WITH SEALED SUIT",
                desc: "Quick air bursts blow the salt into the wind while keeping our spacesuit safe!",
                isCorrect: true
            },
            optionB: {
                icon: "🧤",
                title: "WIPE WITH SUIT GLOVE",
                desc: "Rub the white salt off using your spacesuit fingers.",
                isCorrect: false,
                whyWrong: "Warning, Cadet! Mars perchlorate salt is toxic! Never touch it with your gloves — blow it away safely with air puffs!"
            }
        },
        {
            stationId: 3,
            title: "SOLAR ARRAY 04: SUNLIGHT POLISH PUZZLE",
            subTitle: "Final Optical Clean Problem",
            question: "Last panel! The sun is setting fast! How do we give the glass a final clean so it catches maximum sunlight?",
            optionA: {
                icon: "✨",
                title: "WIDE GENTLE FAN BREEZE",
                desc: "A wide fan of clean air clears every corner so the solar glass sparkles blue!",
                isCorrect: true
            },
            optionB: {
                icon: "🔥",
                title: "USE A FIRE TORCH",
                desc: "Blast hot fire at the glass to burn off the sand and melt the dust.",
                isCorrect: false,
                whyWrong: "Uh-oh! Fire will crack the delicate space glass! Use a gentle air breeze to polish it clean!"
            }
        }
    ];

    constructor() {
        super("Sol2PerchlorateBarrierScene", {
            solNumber: 2,
            title: "SOL 2: DUST DEVIL CLEANUP AT ARCADIA PLANITIA",
            codename: "ARCADIA SOLAR RESTORATION",
            hazardBadge: "PLAYFUL DUST DEVIL WHIRLWINDS",
            briefing: "A cheeky Martian whirlwind covered our solar panels in sticky red sand! Walk across Arcadia Planitia below the panels, dodge the bouncy dust devils, solve the science puzzle at each array, and restore 100% base power!",
            nasaFact: "Did you know? Dust devils on Mars can grow taller than Mount Everest! The dry red sand sticks like static cling until neutral gas blows it clean.",
            primaryTarget: "Solve puzzles & blast dust off all 4 solar panels before dark!",
            unit: "Panels Cleaned",
            targetVal: 4,
            initialVal: 0
        });
    }

    preload() {
        super.preload();
        if (!this.textures.exists("boy-astronaut")) {
            this.load.image("boy-astronaut", "/assets/game/characters/boy-astronaut.png");
        }
        if (!this.textures.exists("girl-astronaut")) {
            this.load.image("girl-astronaut", "/assets/game/characters/girl-astronaut.png");
        }
        if (!this.textures.exists("solar-panels")) {
            this.load.image("solar-panels", "/assets/game/base/solar-panels.png");
        }
    }

    protected createChallengeContent() {
        // 1. Build Arcadia Planitia Panoramic Surface (Wide, flat plain)
        this.createArcadiaPlanitiaBase();

        // 2. Setup Sunset Twilight Atmosphere Layer
        this.sunsetOverlay = this.add.graphics().setDepth(35);

        // 3. Continuous Dust Storm Atmosphere (Keeps blowing until all 4 arrays fixed!)
        this.createContinuousDustStorm();

        // 4. Setup Top Equipment Panel (Displays Wind-Blower, Ion Dissipator, Visor Seal)
        this.createTopEquipmentPanel();

        // 5. Setup Base Power Meter Console
        this.createBasePowerMeterHUD();

        // 6. Construct 4 Solar Panel Array Stations in a clear upper row (y = 390)
        this.createSolarPanelStations();

        // 7. Spawn 3 Playful Little Dust Devils bouncing around
        this.createPlayfulDustDevils();

        // 8. Setup Player Cadet strictly BELOW the grid (y = 570)
        this.createPlayerAstronaut();
        this.setupKeyboardControls();

        // 9. Fetch Live NASA InSight Weather & Dust Telemetry from Backend
        this.fetchNasaDustTelemetry();

        // 10. Start directly in ACTION_GAMEPLAY (No blocking pop-ups on launch!)
        this.startDirectActionGameplay();
    }

    // =========================================================================
    // ARCADIA PLANITIA SURFACE PANORAMA
    // =========================================================================
    private createArcadiaPlanitiaBase() {
        this.createMartianSurfaceBase(0x1B0E20, 0xE06F38, 0x984428);

        // Arcadia Planitia Flat Horizon Grid lines (subtle atmospheric perspective)
        const plainDetail = this.add.graphics().setDepth(-23);
        plainDetail.lineStyle(1, 0xC45B32, 0.35);

        for (let y = 430; y <= 660; y += 45) {
            plainDetail.lineBetween(0, y, this.W, y);
        }

        // Dedicated Cadet Walking Lane Guide Line (distinctly BELOW the solar array grid)
        const walkLane = this.add.graphics().setDepth(10);
        walkLane.lineStyle(1.5, 0xC45B32, 0.25);
        walkLane.lineBetween(40, 570, this.W - 40, 570);

        // Landmark Signpost
        const signContainer = this.add.container(95, 370).setDepth(5);
        const signBg = this.add.graphics();
        signBg.fillStyle(0x0E1A2C, 0.9);
        signBg.fillRoundedRect(-70, -14, 140, 28, 6);
        signBg.lineStyle(1.5, UITheme.colors.primaryCyan, 0.8);
        signBg.strokeRoundedRect(-70, -14, 140, 28, 6);
        signContainer.add(signBg);

        const signText = this.add.text(0, 0, "ARCADIA SOLAR FIELD", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "8.5px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            align: "center"
        }).setOrigin(0.5);
        signContainer.add(signText);
    }

    // =========================================================================
    // CONTINUOUS DUST STORM SYSTEM
    // =========================================================================
    private createContinuousDustStorm() {
        this.isDustStormActive = true;

        this.dustStormHaze = this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0xD05A2A, 0.16).setDepth(20);

        this.tweens.add({
            targets: this.dustStormHaze,
            alpha: 0.26,
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        this.ambientDustTimer = this.time.addEvent({
            delay: 160,
            loop: true,
            callback: () => {
                if (this.isDustStormActive) {
                    this.spawnDustStormParticle();
                }
            }
        });
    }

    private spawnDustStormParticle() {
        if (!this.isDustStormActive) return;

        const startY = Phaser.Math.Between(340, 660);
        const color = Phaser.Utils.Array.GetRandom([0xD86638, 0xC05220, 0xEE8A45, 0xB84B28]);
        const radius = Phaser.Math.FloatBetween(2, 5.5);

        const p = this.add.circle(this.W + 20, startY, radius, color, Phaser.Math.FloatBetween(0.4, 0.75)).setDepth(21);
        this.activeDustSpecks.push(p);

        this.tweens.add({
            targets: p,
            x: -40,
            y: startY + Phaser.Math.Between(-35, 35),
            duration: Phaser.Math.Between(1300, 2300),
            ease: "Linear",
            onComplete: () => {
                const idx = this.activeDustSpecks.indexOf(p);
                if (idx >= 0) this.activeDustSpecks.splice(idx, 1);
                p.destroy();
            }
        });
    }

    private stopDustStorm() {
        this.isDustStormActive = false;

        if (this.ambientDustTimer) {
            this.ambientDustTimer.destroy();
        }

        this.tweens.add({
            targets: this.dustStormHaze,
            alpha: 0,
            duration: 1500
        });

        this.activeDustSpecks.forEach(p => {
            this.tweens.add({
                targets: p,
                alpha: 0,
                duration: 600,
                onComplete: () => p.destroy()
            });
        });
        this.activeDustSpecks = [];

        this.dustDevils.forEach(d => {
            this.tweens.add({
                targets: d.container,
                scale: 0,
                alpha: 0,
                duration: 1000,
                ease: "Back.easeIn",
                onComplete: () => d.container.destroy()
            });
        });
        this.dustDevils = [];
    }

    // =========================================================================
    // TOP EQUIPMENT PANEL (Tools & Instruments)
    // =========================================================================
    private createTopEquipmentPanel() {
        this.equipmentPanelContainer = this.add.container(640, 85).setDepth(40);

        const panelW = 960;
        const panelH = 34;

        const bg = this.add.graphics();
        bg.fillStyle(0x0A1322, 0.95);
        bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        bg.lineStyle(1.5, 0x223552, 1);
        bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        this.equipmentPanelContainer.add(bg);

        const title = this.add.text(-panelW / 2 + 16, 0, "CADET TOOLKIT:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0, 0.5);
        this.equipmentPanelContainer.add(title);

        this.drawEquipmentSlots(0);
    }

    private drawEquipmentSlots(unlockedCount: number) {
        const slotData = [
            { icon: "💨", name: "AIR WIND-BLOWER" },
            { icon: "⚡", name: "STATIC ION ZAPPER" },
            { icon: "🛡️", name: "SAFETY VISOR SEAL" }
        ];

        const panelW = 960;
        const startX = -panelW / 2 + 140;
        const spacing = 265;

        for (let i = 0; i < 3; i++) {
            const sx = startX + i * spacing;
            const item = slotData[i];
            const isUnlocked = i < unlockedCount || unlockedCount >= 1;

            const slotG = this.add.graphics();
            slotG.fillStyle(isUnlocked ? 0x0E2838 : 0x121724, 1);
            slotG.fillRoundedRect(sx, -13, 250, 26, 4);
            slotG.lineStyle(1, isUnlocked ? UITheme.colors.primaryCyan : 0x243044, 1);
            slotG.strokeRoundedRect(sx, -13, 250, 26, 4);
            this.equipmentPanelContainer.add(slotG);

            const status = isUnlocked ? "✔ READY" : "🔒 LOCKED";
            const statusColor = isUnlocked ? UITheme.colors.bioGreenStr : UITheme.colors.textSecondary;

            const text = this.add.text(sx + 10, 0, `${item.icon} ${item.name}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "9px",
                color: isUnlocked ? "#FFFFFF" : UITheme.colors.textSecondary,
                fontStyle: "bold"
            }).setOrigin(0, 0.5);

            const tag = this.add.text(sx + 240, 0, status, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "8.5px",
                color: statusColor,
                fontStyle: "bold"
            }).setOrigin(1, 0.5);

            this.equipmentPanelContainer.add([text, tag]);
        }
    }

    private refreshEquipmentPanel() {
        this.equipmentPanelContainer.removeAll(true);

        const panelW = 960;
        const panelH = 34;

        const bg = this.add.graphics();
        bg.fillStyle(0x092233, 0.98);
        bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        bg.lineStyle(2, UITheme.colors.primaryCyan, 1);
        bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        this.equipmentPanelContainer.add(bg);

        const title = this.add.text(-panelW / 2 + 16, 0, "CADET TOOLKIT:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0, 0.5);
        this.equipmentPanelContainer.add(title);

        const solvedCount = this.solarStations.filter(s => s.questionSolved).length;
        this.drawEquipmentSlots(solvedCount > 0 ? 3 : 0);

        this.tweens.add({
            targets: this.equipmentPanelContainer,
            scaleY: 1.12,
            duration: 150,
            yoyo: true
        });
    }

    // =========================================================================
    // BASE POWER METER HUD
    // =========================================================================
    private createBasePowerMeterHUD() {
        this.powerMeterContainer = this.add.container(1150, 42).setDepth(110);

        const meterW = 200;
        const meterH = 34;

        const bg = this.add.graphics();
        bg.fillStyle(0x061122, 0.95);
        bg.fillRoundedRect(-meterW / 2, -meterH / 2, meterW, meterH, 6);
        bg.lineStyle(1.5, UITheme.colors.primaryCyan, 0.9);
        bg.strokeRoundedRect(-meterW / 2, -meterH / 2, meterW, meterH, 6);
        this.powerMeterContainer.add(bg);

        this.powerMeterFill = this.add.graphics();
        this.powerMeterContainer.add(this.powerMeterFill);

        this.powerMeterText = this.add.text(0, 0, "⚡ POWER: 20%", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        this.powerMeterContainer.add(this.powerMeterText);

        this.updatePowerMeterVisual(20);
    }

    private updatePowerMeterVisual(percent: number) {
        const meterW = 192;
        const meterH = 26;

        this.powerMeterFill.clear();
        const fillW = (meterW * percent) / 100;

        let color = UITheme.colors.emergencyRed;
        let colorStr = UITheme.colors.emergencyRedStr;
        if (percent >= 80) {
            color = UITheme.colors.bioGreen;
            colorStr = UITheme.colors.bioGreenStr;
        } else if (percent >= 50) {
            color = UITheme.colors.solarGold;
            colorStr = UITheme.colors.solarGoldStr;
        }

        this.powerMeterFill.fillStyle(color, 0.85);
        this.powerMeterFill.fillRoundedRect(-meterW / 2, -meterH / 2, fillW, meterH, 4);

        if (this.powerMeterText) {
            this.powerMeterText.setText(`⚡ POWER: ${percent}%`);
            this.powerMeterText.setColor(colorStr);
        }
    }

    // =========================================================================
    // SOLAR PANEL ARRAY STATIONS (All 4 in a clear upper row: y = 390)
    // =========================================================================
    private createSolarPanelStations() {
        // Arranged horizontally across the upper plain so they are NEVER blocked by the cadet!
        const positions = [
            { x: 220, y: 390 },
            { x: 490, y: 390 },
            { x: 760, y: 390 },
            { x: 1030, y: 390 }
        ];

        positions.forEach((pos, idx) => {
            const container = this.add.container(pos.x, pos.y).setDepth(15);

            // Ground base pad
            const pad = this.add.graphics();
            pad.fillStyle(0x1B2A3D, 0.9);
            pad.fillRoundedRect(-65, 34, 130, 16, 4);
            pad.lineStyle(1.5, 0x364D6C, 1);
            pad.strokeRoundedRect(-65, 34, 130, 16, 4);
            container.add(pad);

            // Support pylons
            const pylon = this.add.graphics();
            pylon.lineStyle(4, 0x485E7D, 1);
            pylon.lineBetween(-28, 36, -14, 10);
            pylon.lineBetween(28, 36, 14, 10);
            pylon.lineBetween(0, 36, 0, 10);
            container.add(pylon);

            // Photovoltaic Silicon Cells (Crystalline Blue Solar Glass)
            const solarCells = this.add.graphics();
            solarCells.fillStyle(0x0C3B66, 1);
            solarCells.fillRoundedRect(-65, -45, 130, 58, 6);
            solarCells.lineStyle(2, 0x00E5FF, 0.9);
            solarCells.strokeRoundedRect(-65, -45, 130, 58, 6);

            // Grid lines
            solarCells.lineStyle(1, 0x1A6FA8, 0.7);
            solarCells.lineBetween(-20, -45, -20, 13);
            solarCells.lineBetween(20, -45, 20, 13);
            solarCells.lineBetween(-65, -16, 65, -16);
            container.add(solarCells);

            // Clean Solar Reflection Glow Halo
            const glowGraphic = this.add.graphics();
            glowGraphic.fillStyle(0x00E5FF, 0.35);
            glowGraphic.fillEllipse(0, -16, 145, 70);
            glowGraphic.setAlpha(0);
            container.add(glowGraphic);

            // Red Martian Dust Layer Overlay (Initially coated with thick red dust)
            const dustLayer = this.add.graphics();
            dustLayer.fillStyle(0xB84B28, 0.95);
            dustLayer.fillRoundedRect(-65, -45, 130, 58, 6);
            for (let d = 0; d < 18; d++) {
                dustLayer.fillStyle(0xD86638, 0.85);
                dustLayer.fillCircle(-50 + (d * 7) % 110, -35 + (d * 11) % 45, 3.5);
            }
            container.add(dustLayer);

            // Status Tag on Station (Above panel)
            const dustProgressText = this.add.text(0, -58, "🔴 DUST: 100%", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: UITheme.colors.emergencyRedStr,
                fontStyle: "bold"
            }).setOrigin(0.5);
            container.add(dustProgressText);

            // Station Number Tag (Below panel)
            const stationTag = this.add.text(0, 42, `SOLAR ARRAY 0${idx + 1}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "8.5px",
                color: UITheme.colors.primaryCyanStr,
                fontStyle: "bold"
            }).setOrigin(0.5);
            container.add(stationTag);

            // Direct Click on panel initiates problem puzzle
            const panelHit = this.add.rectangle(0, -16, 130, 58, 0x000000, 0.001);
            panelHit.setInteractive({ useHandCursor: true });
            container.add(panelHit);

            panelHit.on("pointerdown", () => {
                if (!this.isPuzzleModalOpen && !this.solarStations[idx].isCleaned) {
                    this.openArrayPuzzleModal(idx);
                }
            });

            this.solarStations.push({
                id: idx,
                x: pos.x,
                y: pos.y,
                container,
                dustLayer,
                solarCells,
                glowGraphic,
                dustProgressText,
                isCleaned: false,
                questionSolved: false
            });
        });
    }

    // =========================================================================
    // PLAYFUL LITTLE DUST DEVILS BOUNCING AROUND
    // =========================================================================
    private createPlayfulDustDevils() {
        const devilConfigs = [
            { x: 360, y: 470, vx: 75, vy: 40, scale: 0.75 },
            { x: 640, y: 510, vx: -80, vy: 55, scale: 0.8 },
            { x: 910, y: 470, vx: 60, vy: -55, scale: 0.7 }
        ];

        devilConfigs.forEach((cfg, idx) => {
            const container = this.add.container(cfg.x, cfg.y).setDepth(25);
            container.setScale(cfg.scale);

            const vortexGfx = this.add.graphics();
            vortexGfx.fillStyle(0xDF6B35, 0.45);
            vortexGfx.fillEllipse(0, 0, 70, 22);
            vortexGfx.fillStyle(0xC05220, 0.55);
            vortexGfx.fillEllipse(0, -28, 52, 17);
            vortexGfx.fillStyle(0xDF8558, 0.65);
            vortexGfx.fillEllipse(0, -62, 38, 13);
            vortexGfx.fillStyle(0xF0A272, 0.75);
            vortexGfx.fillEllipse(0, -96, 24, 9);
            container.add(vortexGfx);

            const nameTag = this.add.text(0, -114, `🌪️ DEVIL ${idx + 1}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "9px",
                color: UITheme.colors.solarGoldStr,
                fontStyle: "bold"
            }).setOrigin(0.5);
            container.add(nameTag);

            this.tweens.add({
                targets: container,
                scaleX: cfg.scale * 1.15,
                scaleY: cfg.scale * 1.1,
                duration: 650 + idx * 80,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            });

            this.dustDevils.push({
                container,
                vx: cfg.vx,
                vy: cfg.vy,
                radius: 32 * cfg.scale
            });
        });
    }

    // =========================================================================
    // PLAYER CADET CREATION (BELOW THE GRID: y = 570, NO ROTATION!)
    // =========================================================================
    private createPlayerAstronaut() {
        // Starts offscreen on the left at x = -60, y = 570 - strictly BELOW the solar arrays (y = 390)
        this.astronautContainer = this.add.container(-60, 570).setDepth(30);

        const custom = this.registry.get("astronautCustomization") as any;
        const avatarKey = custom?.gender === "girl" ? "girl-astronaut" : "boy-astronaut";
        const textureToUse = this.textures.exists(avatarKey) ? avatarKey : "base-station";

        this.astronautSprite = this.add.image(0, 0, textureToUse);
        this.astronautSprite.setScale(this.PLAYER_SCALE);
        this.astronautSprite.setAngle(0); // STRICTLY 0 ROTATION
        this.astronautContainer.add(this.astronautSprite);

        // Ground shadow below cadet feet
        const shadow = this.add.ellipse(0, 24, 34, 10, 0x070E1A, 0.45);
        this.astronautContainer.addAt(shadow, 0);

        // Wind-Blower Tool in Cadet's Hand
        const toolG = this.add.graphics();
        toolG.fillStyle(0x0C2B42, 1);
        toolG.fillRoundedRect(10, -5, 18, 8, 2);
        toolG.fillStyle(UITheme.colors.primaryCyan, 1);
        toolG.fillCircle(28, -1, 3.5);
        toolG.lineStyle(1, UITheme.colors.solarGold, 1);
        toolG.strokeRoundedRect(10, -5, 18, 8, 2);
        this.astronautContainer.add(toolG);
    }

    private setupKeyboardControls() {
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.wasdKeys = {
                W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
                A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
                S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
                D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D)
            };
        }

        // Pointer click to move cadet along the walking path below the grids
        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (this.gameState === "ACTION_GAMEPLAY" && !this.isEnteringScene && !this.isPuzzleModalOpen && pointer.y >= 460) {
                this.targetX = pointer.x;
                this.targetY = pointer.y;
            }
        });
    }

    // =========================================================================
    // DIRECT GAMEPLAY START: CADET ENTERS THE SCENE FIRST!
    // =========================================================================
    private startDirectActionGameplay() {
        this.gameState = "ACTION_GAMEPLAY";
        this.isEnteringScene = true;
        this.isMoving = true;

        // Smoothly walk the cadet into the scene from the left to x = 70
        this.tweens.add({
            targets: this.astronautContainer,
            x: 70,
            duration: 1100,
            ease: "Quad.easeOut",
            onComplete: () => {
                this.isEnteringScene = false;
                this.isMoving = false;
                this.setActionFeedback("🏃 MOVE RIGHT TOWARDS SOLAR ARRAY 01 TO SOLVE ITS SCIENCE PUZZLE!", true);
                this.showSurfaceFloatingText(70, 520, "👉 MOVE RIGHT TOWARDS SOLAR ARRAY 01!", UITheme.colors.solarGoldStr);
            }
        });

        // Clean guidance pill banner at top
        const banner = this.add.container(640, 128).setDepth(35);
        const bG = this.add.graphics();
        bG.fillStyle(0x061426, 0.92);
        bG.fillRoundedRect(-280, -16, 560, 32, 8);
        bG.lineStyle(1.5, UITheme.colors.solarGold, 0.9);
        bG.strokeRoundedRect(-280, -16, 560, 32, 8);
        banner.add(bG);

        const bannerText = this.add.text(0, 0, "WALK TO EACH SOLAR ARRAY TO UNLOCK & CLEAN IT! [W/A/S/D / CLICK]", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        banner.add(bannerText);

        this.time.delayedCall(4500, () => {
            this.tweens.add({
                targets: banner,
                alpha: 0,
                duration: 500,
                onComplete: () => banner.destroy()
            });
        });
    }

    // =========================================================================
    // AUTOMATIC PROBLEM POP-UP AS CADET APPROACHES AN ARRAY
    // =========================================================================
    private openArrayPuzzleModal(stationIdx: number) {
        if (this.isPuzzleModalOpen) return;
        this.isPuzzleModalOpen = true;
        this.activePuzzleStationIdx = stationIdx;

        // Stop cadet walking while solving
        this.targetX = null;
        this.targetY = null;
        this.isMoving = false;

        const challenge = this.arrayChallenges[stationIdx];
        this.puzzleModalContainer = this.add.container(640, 365).setDepth(75);

        const modalW = 760;
        const modalH = 410;

        const shade = this.add.rectangle(0, 0, this.W * 2, this.H * 2, 0x000000, 0.78);
        this.puzzleModalContainer.add(shade);

        const bg = this.add.graphics();
        bg.fillStyle(0x0E1726, 0.98);
        bg.fillRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 14);
        bg.lineStyle(2.5, UITheme.colors.primaryCyan, 1);
        bg.strokeRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 14);
        this.puzzleModalContainer.add(bg);

        // Header
        const header = this.add.text(0, -modalH / 2 + 28, `🔬 ${challenge.title}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setOrigin(0.5);

        const questionText = this.add.text(0, -modalH / 2 + 65, challenge.question, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#FFFFFF",
            align: "center",
            wordWrap: { width: modalW - 60 },
            lineSpacing: 4
        }).setOrigin(0.5);

        this.puzzleModalContainer.add([header, questionText]);

        // Option A Card
        this.createOptionCard(
            -modalW / 4 - 8,
            35,
            modalW / 2 - 30,
            195,
            challenge.optionA.icon,
            challenge.optionA.title,
            challenge.optionA.desc,
            challenge.optionA.isCorrect,
            challenge.optionA.whyWrong
        );

        // Option B Card
        this.createOptionCard(
            modalW / 4 + 8,
            35,
            modalW / 2 - 30,
            195,
            challenge.optionB.icon,
            challenge.optionB.title,
            challenge.optionB.desc,
            challenge.optionB.isCorrect,
            challenge.optionB.whyWrong
        );
    }

    private createOptionCard(
        x: number,
        y: number,
        w: number,
        h: number,
        icon: string,
        title: string,
        desc: string,
        isCorrect: boolean,
        whyWrong?: string
    ) {
        const c = this.add.container(x, y);
        this.puzzleModalContainer?.add(c);

        const cardBg = this.add.graphics();
        cardBg.fillStyle(0x152238, 1);
        cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
        cardBg.lineStyle(1.5, UITheme.colors.panelBorder, 1);
        cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        c.add(cardBg);

        const iconText = this.add.text(0, -h / 2 + 28, icon, { fontSize: "24px" }).setOrigin(0.5);

        const titleText = this.add.text(0, -h / 2 + 62, title, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: w - 24 }
        }).setOrigin(0.5);

        const descText = this.add.text(0, 10, desc, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9.5px",
            color: "#CFD8DC",
            align: "center",
            wordWrap: { width: w - 28 },
            lineSpacing: 4
        }).setOrigin(0.5);

        const btn = this.add.graphics();
        btn.fillStyle(UITheme.colors.cardHover, 1);
        btn.fillRoundedRect(-70, h / 2 - 34, 140, 26, 6);
        btn.lineStyle(1, UITheme.colors.primaryCyan, 0.9);
        btn.strokeRoundedRect(-70, h / 2 - 34, 140, 26, 6);

        const btnLabel = this.add.text(0, h / 2 - 21, "SELECT TOOL", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9.5px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);

        c.add([iconText, titleText, descText, btn, btnLabel]);

        const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0.001);
        hit.setInteractive({ useHandCursor: true });
        c.add(hit);

        hit.on("pointerover", () => {
            this.tweens.add({ targets: c, scale: 1.02, duration: 120 });
            cardBg.clear();
            cardBg.fillStyle(0x1E3050, 1);
            cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
            cardBg.lineStyle(2, UITheme.colors.primaryCyan, 1);
            cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        });

        hit.on("pointerout", () => {
            this.tweens.add({ targets: c, scale: 1.0, duration: 120 });
            cardBg.clear();
            cardBg.fillStyle(0x152238, 1);
            cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
            cardBg.lineStyle(1.5, UITheme.colors.panelBorder, 1);
            cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        });

        hit.on("pointerdown", () => {
            SoundFX.playClick();
            if (isCorrect) {
                this.handleCorrectArrayPuzzleSolved();
            } else {
                this.showKidFriendlyFailureWarning(whyWrong || "Uh-oh Cadet! That tool won't work on Mars regolith. Try again!");
            }
        });
    }

    private showKidFriendlyFailureWarning(reason: string) {
        SoundFX.playAlert();

        const warnC = this.add.container(0, 0).setDepth(85);
        this.puzzleModalContainer?.add(warnC);

        const w = 620;
        const h = 280;

        const bg = this.add.graphics();
        bg.fillStyle(0x1F0A0E, 0.98);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
        bg.lineStyle(2.5, UITheme.colors.emergencyRed, 1);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
        warnC.add(bg);

        const header = this.add.text(0, -h / 2 + 28, "⚠ OOPS! TRY AGAIN CADET!", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0.5);

        const explanation = this.add.text(0, -10, reason, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#FFFFFF",
            align: "center",
            wordWrap: { width: w - 50 },
            lineSpacing: 5
        }).setOrigin(0.5);

        const retryBtn = this.add.graphics();
        retryBtn.fillStyle(UITheme.colors.emergencyRed, 1);
        retryBtn.fillRoundedRect(-90, h / 2 - 44, 180, 32, 6);

        const retryLabel = this.add.text(0, h / 2 - 28, "↺ TRY AGAIN", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);

        warnC.add([header, explanation, retryBtn, retryLabel]);

        const retryHit = this.add.rectangle(0, h / 2 - 28, 180, 32, 0x000000, 0.001);
        retryHit.setInteractive({ useHandCursor: true });
        warnC.add(retryHit);

        retryHit.on("pointerdown", () => {
            SoundFX.playClick();
            warnC.destroy();
        });
    }

    private handleCorrectArrayPuzzleSolved() {
        SoundFX.playToggle(true);

        const stationIdx = this.activePuzzleStationIdx;
        if (stationIdx !== null) {
            const st = this.solarStations[stationIdx];
            st.questionSolved = true;

            // Trigger Wind blast from cadet to the solar panel
            this.triggerWindBlastEffect(this.astronautContainer.x, this.astronautContainer.y - 10, st.x, st.y);

            // Clean the grid immediately! Remove red dust and illuminate in glowing blue!
            st.dustLayer.setAlpha(0); // Dust disappears
            st.glowGraphic.setAlpha(0.7); // Crystalline clean cyan glow
            this.tweens.add({
                targets: st.glowGraphic,
                alpha: 0.35,
                duration: 650,
                yoyo: true,
                repeat: -1
            });

            st.isCleaned = true;
            st.dustProgressText.setText("✔ CLEAN 100%");
            st.dustProgressText.setColor(UITheme.colors.bioGreenStr);

            this.cleanedStationsCount++;
            const newPower = 20 + this.cleanedStationsCount * 20;
            this.updatePowerMeterVisual(newPower);
            this.updateVisorProgress(this.cleanedStationsCount, 4, "Panels Cleaned");

            this.refreshEquipmentPanel();

            const nextNum = stationIdx + 2;
            const guidance = nextNum <= 4
                ? `✨ ARRAY 0${stationIdx + 1} CLEAN! WALK TO ARRAY 0${nextNum} ➔`
                : "🌟 ALL ARRAYS CLEAN! 100% POWER RESTORED!";

            this.showSurfaceFloatingText(st.x, st.y, guidance, UITheme.colors.bioGreenStr);
        }

        this.tweens.add({
            targets: this.puzzleModalContainer,
            scale: 0.9,
            alpha: 0,
            duration: 220,
            onComplete: () => {
                this.puzzleModalContainer?.destroy();
                this.isPuzzleModalOpen = false;
                this.activePuzzleStationIdx = null;

                // Check if all 4 panels are now clean!
                if (this.cleanedStationsCount >= 4) {
                    this.handleAllArraysFixed();
                }
            }
        });
    }

    private triggerWindBlastEffect(fromX: number, fromY: number, toX: number, toY: number) {
        if (this.isBlowingWind) return;
        this.isBlowingWind = true;

        const windG = this.add.graphics().setDepth(45);
        windG.lineStyle(4, UITheme.colors.primaryCyan, 0.9);
        windG.lineBetween(fromX, fromY, toX, toY);

        for (let i = 0; i < 20; i++) {
            const p = this.add.circle(
                fromX + Phaser.Math.Between(-10, 10),
                fromY + Phaser.Math.Between(-10, 10),
                Phaser.Math.Between(3, 6),
                i % 2 === 0 ? 0x00E5FF : 0xFFFFFF,
                0.85
            ).setDepth(46);

            this.tweens.add({
                targets: p,
                x: toX + Phaser.Math.Between(-25, 25),
                y: toY + Phaser.Math.Between(-15, 15),
                alpha: 0,
                scale: 1.6,
                duration: Phaser.Math.Between(250, 400),
                onComplete: () => p.destroy()
            });
        }

        // Dissipating red dust particles flying away
        for (let j = 0; j < 16; j++) {
            const d = this.add.circle(toX, toY, Phaser.Math.Between(3, 6), 0xD86638, 0.8).setDepth(47);
            this.tweens.add({
                targets: d,
                x: toX + Phaser.Math.Between(-70, 70),
                y: toY - Phaser.Math.Between(40, 100),
                alpha: 0,
                duration: 550,
                onComplete: () => d.destroy()
            });
        }

        this.time.delayedCall(220, () => {
            windG.destroy();
            this.isBlowingWind = false;
        });
    }

    // =========================================================================
    // DUST STORM STOPS & MISSION COMPLETE CELEBRATION
    // =========================================================================
    private handleAllArraysFixed() {
        // 1. DUST STORM STOPS COMPLETELY!
        this.stopDustStorm();

        SoundFX.playToggle(true);
        this.setActionFeedback("🌟 ALL SOLAR PANELS CLEANED! 100% BASE POWER RESTORED!", true);

        // Celebration Confetti
        for (let i = 0; i < 40; i++) {
            const star = this.add.text(
                640 + Phaser.Math.Between(-400, 400),
                Phaser.Math.Between(200, 500),
                i % 2 === 0 ? "⚡" : "✨",
                { fontSize: `${Phaser.Math.Between(16, 26)}px` }
            ).setDepth(90);

            this.tweens.add({
                targets: star,
                y: star.y - 120,
                alpha: 0,
                scale: 1.4,
                duration: 1200,
                onComplete: () => star.destroy()
            });
        }

        // Sky clears into warm sunset
        this.tweens.add({
            targets: this.sunsetOverlay,
            alpha: 0.55,
            duration: 1800,
            onUpdate: () => {
                this.sunsetOverlay.clear();
                this.sunsetOverlay.fillStyle(0x0C061C, 0.45);
                this.sunsetOverlay.fillRect(0, 0, this.W, this.H);
            }
        });

        // Show Big Kid-Friendly Mission Complete Modal!
        this.time.delayedCall(1200, () => {
            this.showMissionCompleteModal();
        });
    }

    private showMissionCompleteModal() {
        this.gameState = "MISSION_COMPLETE";
        SoundFX.playToggle(true);

        this.missionCompleteModalContainer = this.add.container(640, 360).setDepth(80);

        const modalW = 720;
        const modalH = 390;

        const shade = this.add.rectangle(0, 0, this.W * 2, this.H * 2, 0x000000, 0.82);
        this.missionCompleteModalContainer.add(shade);

        const bg = this.add.graphics();
        bg.fillStyle(0x091424, 0.98);
        bg.fillRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 16);
        bg.lineStyle(3, UITheme.colors.bioGreen, 1);
        bg.strokeRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 16);
        this.missionCompleteModalContainer.add(bg);

        // Victory Stamp
        const title = this.add.text(0, -modalH / 2 + 35, "🎉 MISSION COMPLETE! 🎉", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "20px",
            color: UITheme.colors.bioGreenStr,
            fontStyle: "bold",
            letterSpacing: 2
        }).setOrigin(0.5);

        const subtitle = this.add.text(0, -modalH / 2 + 70, "ARCADIA PLANITIA SOLAR FIELD RESTORED!", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0.5);

        // 3 Bouncing Stars
        for (let s = 0; s < 3; s++) {
            const star = this.add.text(-70 + s * 70, -modalH / 2 + 115, "⭐", { fontSize: "36px" }).setOrigin(0.5);
            this.missionCompleteModalContainer.add(star);
            this.tweens.add({
                targets: star,
                scale: 1.3,
                duration: 400,
                yoyo: true,
                delay: s * 160
            });
        }

        // Summary details card
        const cardG = this.add.graphics();
        cardG.fillStyle(0x101D33, 0.95);
        cardG.fillRoundedRect(-modalW / 2 + 40, -10, modalW - 80, 120, 8);
        cardG.lineStyle(1.5, UITheme.colors.panelBorder, 1);
        cardG.strokeRoundedRect(-modalW / 2 + 40, -10, modalW - 80, 120, 8);
        this.missionCompleteModalContainer.add(cardG);

        const summaryText = this.add.text(
            0,
            50,
            "✔ 100% Base Power Restored Before Sunset!\n" +
            "✔ The Dust Storm has been cleared away from the plain!\n" +
            "✔ All 4 solar arrays are sparkling clean and online!",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: "#E2EEFF",
                align: "center",
                lineSpacing: 8
            }
        ).setOrigin(0.5);

        // Proceed to Night Shift Button
        const nextBtn = ButtonFactory.createButton({
            scene: this,
            x: 0,
            y: modalH / 2 - 44,
            width: 320,
            height: 44,
            text: "PROCEED TO NIGHT SHIFT ➔",
            fontSize: "13px",
            primaryColor: UITheme.colors.solarGold,
            textColor: "#050C18",
            icon: "🌙",
            onClick: () => {
                SoundFX.playClick();
                this.missionCompleteModalContainer?.destroy();
                this.showNightDecisionEvent();
            }
        });

        this.missionCompleteModalContainer.add([title, subtitle, summaryText, nextBtn]);
    }

    // =========================================================================
    // THE NIGHT SHIFT EVENT DECISION (Simple, Kid-Friendly Words)
    // =========================================================================
    private showNightDecisionEvent() {
        this.gameState = "NIGHT_DECISION";
        SoundFX.playAlert();

        this.nightDecisionModalContainer = this.add.container(640, 365).setDepth(80);

        const modalW = 860;
        const modalH = 470;

        const shade = this.add.rectangle(0, 0, this.W * 2, this.H * 2, 0x000000, 0.82);
        this.nightDecisionModalContainer.add(shade);

        const bg = this.add.graphics();
        bg.fillStyle(0x0C1220, 0.98);
        bg.fillRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 16);
        bg.lineStyle(3, UITheme.colors.solarGold, 1);
        bg.strokeRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 16);
        this.nightDecisionModalContainer.add(bg);

        // Header Title
        const header = this.add.text(0, -modalH / 2 + 28, "⚡ NIGHT SHIFT SURVIVAL EVENT ⚡", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setOrigin(0.5);

        const eventText = this.add.text(
            0,
            -modalH / 2 + 66,
            "\"A Martian dust devil just coated our radiator fins in toxic perchlorate salt and jammed the outdoor ice-pipe valve!\"\n" +
            "Night is falling over Mars (-95°C freezing cold!). Choose your plan for the night:",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: "#FFFFFF",
                align: "center",
                lineSpacing: 5
            }
        ).setOrigin(0.5);

        this.nightDecisionModalContainer.add([header, eventText]);

        const cardW = 385;
        const cardH = 290;
        const cardY = 40;

        // Choice A Card
        this.createNightChoiceCard(
            -modalW / 4 - 8,
            cardY,
            cardW,
            cardH,
            "CHOICE A: GO OUTSIDE TO CLEAR ICE PIPE",
            "THE GOOD:\n• Subsurface Ice Melter stays at 100% FULL SPEED (+50% Water Production)!\n\n" +
            "THE CATCH:\n• Your space suit gets covered in salty red dust!\n" +
            "• Must keep 1 power plug locked to clean your suit.\n" +
            "• Leaves you with 2 FREE POWER PLUGS for MOXIE, Melter, and Greenhouse!",
            UITheme.colors.primaryCyan,
            () => this.executeNightChoice("A")
        );

        // Choice B Card
        this.createNightChoiceCard(
            modalW / 4 + 8,
            cardY,
            cardW,
            cardH,
            "CHOICE B: STAY INSIDE & KEEP WARM",
            "THE GOOD:\n• Stay cozy inside! Nobody gets covered in dust.\n" +
            "• Keep all 3 POWER PLUGS FREE for your habitat systems!\n\n" +
            "THE CATCH:\n• The outdoor ice pipe freezes solid!\n" +
            "• Subsurface Ice Melter runs at HALF SPEED (+25% water instead of +50%).",
            UITheme.colors.solarGold,
            () => this.executeNightChoice("B")
        );
    }

    private createNightChoiceCard(
        x: number,
        y: number,
        w: number,
        h: number,
        title: string,
        desc: string,
        accentColor: number,
        onSelect: () => void
    ) {
        const c = this.add.container(x, y);
        this.nightDecisionModalContainer?.add(c);

        const bg = this.add.graphics();
        bg.fillStyle(0x131C2D, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
        bg.lineStyle(2, accentColor, 0.9);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        c.add(bg);

        const titleText = this.add.text(0, -h / 2 + 24, title, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: accentColor === UITheme.colors.primaryCyan ? UITheme.colors.primaryCyanStr : UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: w - 24 }
        }).setOrigin(0.5);

        const descText = this.add.text(0, 5, desc, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#E2EDFC",
            align: "left",
            wordWrap: { width: w - 30 },
            lineSpacing: 5
        }).setOrigin(0.5);

        const btn = this.add.graphics();
        btn.fillStyle(accentColor, 1);
        btn.fillRoundedRect(-90, h / 2 - 38, 180, 28, 6);

        const btnLabel = this.add.text(0, h / 2 - 24, "CHOOSE THIS PLAN ➔", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#050B14",
            fontStyle: "bold"
        }).setOrigin(0.5);

        c.add([titleText, descText, btn, btnLabel]);

        const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0.001);
        hit.setInteractive({ useHandCursor: true });
        c.add(hit);

        hit.on("pointerover", () => {
            this.tweens.add({ targets: c, scale: 1.02, duration: 120 });
            bg.clear();
            bg.fillStyle(0x1B263D, 1);
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
            bg.lineStyle(2.5, accentColor, 1);
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        });

        hit.on("pointerout", () => {
            this.tweens.add({ targets: c, scale: 1.0, duration: 120 });
            bg.clear();
            bg.fillStyle(0x131C2D, 1);
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
            bg.lineStyle(2, accentColor, 0.9);
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        });

        hit.on("pointerdown", () => {
            SoundFX.playClick();
            onSelect();
        });
    }

    private fetchNasaDustTelemetry() {
        const apiUrl = "http://localhost:3001/api/nasa/dust-event";

        fetch(apiUrl)
            .then(res => res.json())
            .then(data => {
                if (data && data.success) {
                    const t = data.telemetry;
                    const w = data.weather;
                    const text = `📡 NASA InSight: ${w.atmosphericPressurePa} Pa · Gusts ${w.wind.maxGustMps} m/s · Dust Opacity (τ): ${t.opticalDepthTau} (${t.dustDevilRisk})`;
                    this.showNasaTelemetryBadge(text);
                }
            })
            .catch(() => {
                this.showNasaTelemetryBadge("📡 NASA InSight Telemetry: 743.6 Pa · Gusts 18.6 m/s · Dust Opacity (τ): 0.88 (ELEVATED)");
            });
    }

    private showNasaTelemetryBadge(text: string) {
        if (this.nasaTelemetryPill) {
            this.nasaTelemetryPill.destroy();
        }

        const pill = this.add.container(640, 118).setDepth(38);
        this.nasaTelemetryPill = pill;

        const pW = 680;
        const pH = 24;

        const bg = this.add.graphics();
        bg.fillStyle(0x061122, 0.9);
        bg.fillRoundedRect(-pW / 2, -pH / 2, pW, pH, 5);
        bg.lineStyle(1, UITheme.colors.primaryCyan, 0.7);
        bg.strokeRoundedRect(-pW / 2, -pH / 2, pW, pH, 5);
        pill.add(bg);

        const lbl = this.add.text(0, 0, text, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            letterSpacing: 0.5
        }).setOrigin(0.5);
        pill.add(lbl);
    }

    private executeNightChoice(choice: "A" | "B") {
        SoundFX.playToggle(true);

        fetch("http://localhost:3001/api/nasa/sol2/event-decision", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ choice })
        }).catch(err => {
            console.warn("Backend API sync offline, running in local fallback mode:", err);
        });

        if (choice === "A") {
            this.registry.set("lockedSuitportPlug", true);
            this.registry.set("modules_suitport_locked", true);
            this.registry.set("modules_suitport", true);
            this.registry.set("freePowerPlugs", 2);
            this.registry.set("iceMelterEfficiency", 1.0);
            this.registry.set("icePipeFrozen", false);
            this.registry.set("sol2Choice", "CLEAR_ICE_PIPE");
        } else {
            this.registry.set("lockedSuitportPlug", false);
            this.registry.set("modules_suitport_locked", false);
            this.registry.set("freePowerPlugs", 3);
            this.registry.set("iceMelterEfficiency", 0.5);
            this.registry.set("icePipeFrozen", true);
            this.registry.set("sol2Choice", "LET_PIPE_FREEZE");
        }

        this.registry.set("phase", "NIGHT");

        if (typeof window !== "undefined" && window.localStorage) {
            try {
                localStorage.setItem("astra_sol2_event", JSON.stringify({
                    choice,
                    lockedSuitportPlug: this.registry.get("lockedSuitportPlug"),
                    freePowerPlugs: this.registry.get("freePowerPlugs"),
                    icePipeFrozen: this.registry.get("icePipeFrozen"),
                    phase: "NIGHT"
                }));
            } catch {
                // Ignore storage limits
            }
        }

        if (this.nightDecisionModalContainer) {
            this.tweens.add({
                targets: this.nightDecisionModalContainer,
                scale: 0.9,
                alpha: 0,
                duration: 250,
                onComplete: () => {
                    this.nightDecisionModalContainer?.destroy();
                    this.showNightShiftCompleteCelebration(choice);
                }
            });
        }
    }

    private showNightShiftCompleteCelebration(choice: "A" | "B") {
        this.gameState = "NIGHT_ACTIVE";

        this.sunsetOverlay.clear();
        this.sunsetOverlay.fillStyle(0x060312, 0.78);
        this.sunsetOverlay.fillRect(0, 0, this.W, this.H);

        const debriefC = this.add.container(640, 360).setDepth(90);
        const dW = 680;
        const dH = 380;

        const bg = this.add.graphics();
        bg.fillStyle(0x0A1424, 0.98);
        bg.fillRoundedRect(-dW / 2, -dH / 2, dW, dH, 16);
        bg.lineStyle(3, UITheme.colors.bioGreen, 1);
        bg.strokeRoundedRect(-dW / 2, -dH / 2, dW, dH, 16);
        debriefC.add(bg);

        const stamp = this.add.text(0, -dH / 2 + 35, "⭐ SOL 02 ACCOMPLISHED: NIGHT SHIFT COMMENCED ⭐", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "15px",
            color: UITheme.colors.bioGreenStr,
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setOrigin(0.5);

        const sub = this.add.text(0, -dH / 2 + 70, "Arcadia Planitia solar arrays restored to 100% power. Night phase engineering state active.", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#FFFFFF"
        }).setOrigin(0.5);

        for (let s = 0; s < 3; s++) {
            const star = this.add.text(-60 + s * 60, -dH / 2 + 115, "⭐", { fontSize: "32px" }).setOrigin(0.5);
            debriefC.add(star);
            this.tweens.add({
                targets: star,
                scale: 1.25,
                duration: 400,
                yoyo: true,
                delay: s * 150
            });
        }

        const summaryG = this.add.graphics();
        summaryG.fillStyle(0x111E33, 0.95);
        summaryG.fillRoundedRect(-dW / 2 + 40, -15, dW - 80, 125, 8);
        summaryG.lineStyle(1.5, UITheme.colors.panelBorder, 1);
        summaryG.strokeRoundedRect(-dW / 2 + 40, -15, dW - 80, 125, 8);
        debriefC.add(summaryG);

        const choiceSummary = choice === "A"
            ? "• DIRECTIVE: Astronaut cleared exterior ice-pipe.\n" +
              "• ICE MELTER: 100% full speed (+50% Water Production during Night Shift).\n" +
              "• POWER PLUGS: 2 Free Plugs remaining (Suitport locked active for suit cleaning).\n" +
              "• CURRENT PHASE: NIGHT (-95°C Survival Active)."
            : "• DIRECTIVE: Crew stayed cozy inside habitat. Zero suit contamination.\n" +
              "• ICE MELTER: 50% speed (+25% Water Production due to frozen pipe).\n" +
              "• POWER PLUGS: All 3 Plugs completely free to allocate across life support.\n" +
              "• CURRENT PHASE: NIGHT (-95°C Survival Active).";

        const summaryText = this.add.text(-dW / 2 + 65, 45, choiceSummary, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: "#E0ECFF",
            lineSpacing: 8
        }).setOrigin(0, 0.5);

        const advanceBtn = ButtonFactory.createButton({
            scene: this,
            x: 0,
            y: dH / 2 - 42,
            width: 320,
            height: 44,
            text: "✦ ADVANCE TO SOL 03 ➔",
            fontSize: "13px",
            primaryColor: UITheme.colors.solarGold,
            textColor: "#08101E",
            icon: "🚀",
            onClick: () => {
                SoundFX.playClick();
                debriefC.destroy();
                this.completeChallengeAndAdvance();
            }
        });

        debriefC.add([stamp, sub, summaryText, advanceBtn]);
    }

    // =========================================================================
    // GAME LOOP: UPDATE (Movement, Proximity Check, No Rotation!)
    // =========================================================================
    update(_time: number, delta: number) {
        if (this.gameState !== "ACTION_GAMEPLAY" || this.isEnteringScene) return;

        const dt = delta / 1000;

        // 1. Cadet Movement along the Walking Path (Strictly NO Rotation!)
        let dx = 0;
        let dy = 0;

        if (this.cursors && this.wasdKeys) {
            if (this.cursors.left.isDown || this.wasdKeys.A.isDown) dx -= 1;
            if (this.cursors.right.isDown || this.wasdKeys.D.isDown) dx += 1;
            if (this.cursors.up.isDown || this.wasdKeys.W.isDown) dy -= 1;
            if (this.cursors.down.isDown || this.wasdKeys.S.isDown) dy += 1;
        }

        if (dx !== 0 || dy !== 0) {
            this.targetX = null;
            this.targetY = null;
            this.isMoving = true;

            const len = Math.hypot(dx, dy);
            this.astronautContainer.x += (dx / len) * this.astronautSpeed * dt;
            this.astronautContainer.y += (dy / len) * this.astronautSpeed * dt;

            // Flip horizontally, STRICTLY 0 rotation
            if (dx !== 0) {
                this.astronautSprite.setScale(dx < 0 ? -this.PLAYER_SCALE : this.PLAYER_SCALE, this.PLAYER_SCALE);
            }
            this.astronautSprite.setAngle(0);
        } else if (this.targetX !== null && this.targetY !== null) {
            const dist = Phaser.Math.Distance.Between(this.astronautContainer.x, this.astronautContainer.y, this.targetX, this.targetY);
            if (dist > 8) {
                this.isMoving = true;
                const angle = Phaser.Math.Angle.Between(this.astronautContainer.x, this.astronautContainer.y, this.targetX, this.targetY);
                this.astronautContainer.x += Math.cos(angle) * this.astronautSpeed * dt;
                this.astronautContainer.y += Math.sin(angle) * this.astronautSpeed * dt;
                this.astronautSprite.setScale(this.targetX < this.astronautContainer.x ? -this.PLAYER_SCALE : this.PLAYER_SCALE, this.PLAYER_SCALE);
                this.astronautSprite.setAngle(0);
            } else {
                this.targetX = null;
                this.targetY = null;
                this.isMoving = false;
            }
        } else {
            this.isMoving = false;
        }

        // Low-G Walking bob
        if (this.isMoving) {
            this.astronautSprite.y = Math.sin(_time * 0.012) * 2;
        } else {
            this.astronautSprite.y = 0;
        }
        this.astronautSprite.setAngle(0); // Guarantees zero rotation

        // CLAMP: Keep cadet strictly on the walking path BELOW the solar array grid!
        // Arrays are at y = 390 (bottom at ~436). Cadet is clamped between 520 and 640!
        this.astronautContainer.x = Phaser.Math.Clamp(this.astronautContainer.x, 60, this.W - 60);
        this.astronautContainer.y = Phaser.Math.Clamp(this.astronautContainer.y, 520, 640);

        // 2. Proximity Check: ONLY as cadet is made to walk near an unsolved grid (distH < 75), the problem pops up!
        if (!this.isEnteringScene && !this.isPuzzleModalOpen) {
            for (let idx = 0; idx < this.solarStations.length; idx++) {
                const st = this.solarStations[idx];
                if (!st.questionSolved && !st.isCleaned) {
                    const distH = Math.abs(this.astronautContainer.x - st.x);
                    if (distH < 75) {
                        this.openArrayPuzzleModal(idx);
                        break;
                    }
                }
            }
        }

        // 3. Playful Dust Devils bouncing around (active until all arrays fixed)
        if (this.isDustStormActive) {
            this.dustDevils.forEach(devil => {
                devil.container.x += devil.vx * dt;
                devil.container.y += devil.vy * dt;

                if (devil.container.x < 100) {
                    devil.container.x = 100;
                    devil.vx *= -1;
                } else if (devil.container.x > this.W - 100) {
                    devil.container.x = this.W - 100;
                    devil.vx *= -1;
                }

                if (devil.container.y < 430) {
                    devil.container.y = 430;
                    devil.vy *= -1;
                } else if (devil.container.y > 630) {
                    devil.container.y = 630;
                    devil.vy *= -1;
                }

                if (!this.isKnockedBack && !this.isPuzzleModalOpen) {
                    const distToPlayer = Phaser.Math.Distance.Between(
                        devil.container.x,
                        devil.container.y,
                        this.astronautContainer.x,
                        this.astronautContainer.y
                    );

                    if (distToPlayer < devil.radius + 18) {
                        this.triggerDustDevilKnockback(devil);
                    }
                }
            });
        }
    }

    private triggerDustDevilKnockback(devil: DustDevilItem) {
        this.isKnockedBack = true;
        SoundFX.playAlert();

        const pushAngle = Phaser.Math.Angle.Between(devil.container.x, devil.container.y, this.astronautContainer.x, this.astronautContainer.y);
        const pushDist = 45;

        // Push away slightly, but NO ROTATION!
        this.tweens.add({
            targets: this.astronautContainer,
            x: Phaser.Math.Clamp(this.astronautContainer.x + Math.cos(pushAngle) * pushDist, 80, this.W - 80),
            y: Phaser.Math.Clamp(this.astronautContainer.y + Math.sin(pushAngle) * pushDist, 520, 640),
            duration: 300,
            ease: "Back.easeOut",
            onComplete: () => {
                this.isKnockedBack = false;
            }
        });

        this.astronautSprite.setAngle(0); // Never rotate!
        this.showSurfaceFloatingText(this.astronautContainer.x, this.astronautContainer.y - 20, "🌪️ DUST GUST!", UITheme.colors.solarGoldStr);
    }

    protected isTargetMet(): boolean {
        return this.cleanedStationsCount >= 4;
    }
}

export default Sol2PerchlorateBarrierScene;
