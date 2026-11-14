import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import { ButtonFactory, SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

type Sol2GameState =
    | "INTRO_STORM"
    | "ASTRONAUT_ENTRY"
    | "PROTOCOL_QUESTION"
    | "ACTION_GAMEPLAY"
    | "NIGHT_DECISION"
    | "NIGHT_ACTIVE";

interface SolarArrayStation {
    id: number;
    x: number;
    y: number;
    container: Phaser.GameObjects.Container;
    dustLayer: Phaser.GameObjects.Graphics;
    solarCells: Phaser.GameObjects.Graphics;
    glowGraphic: Phaser.GameObjects.Graphics;
    dustProgressText: Phaser.GameObjects.Text;
    cleanPercent: number; // 0 to 100
    isCleaned: boolean;
    promptContainer: Phaser.GameObjects.Container;
}

interface DustDevilItem {
    container: Phaser.GameObjects.Container;
    vx: number;
    vy: number;
    radius: number;
}

export class Sol2PerchlorateBarrierScene extends SolChallengeBaseScene {
    private gameState: Sol2GameState = "INTRO_STORM";

    // Player Astronaut
    private astronautContainer!: Phaser.GameObjects.Container;
    private astronautSprite!: Phaser.GameObjects.Image;
    private astronautSpeed = 220;
    private isMoving = false;
    private targetX: number | null = null;
    private targetY: number | null = null;
    private cursors?: Phaser.Types.Input.Keyboard.CursorKeys;
    private wasdKeys?: {
        W: Phaser.Input.Keyboard.Key;
        A: Phaser.Input.Keyboard.Key;
        S: Phaser.Input.Keyboard.Key;
        D: Phaser.Input.Keyboard.Key;
        SPACE: Phaser.Input.Keyboard.Key;
    };

    // Visual Containers & Panels
    private introAlertBanner!: Phaser.GameObjects.Container;
    private equipmentPanelContainer!: Phaser.GameObjects.Container;
    private protocolModalContainer!: Phaser.GameObjects.Container;
    private nightDecisionModalContainer?: Phaser.GameObjects.Container;
    private powerMeterContainer!: Phaser.GameObjects.Container;
    private powerMeterFill!: Phaser.GameObjects.Graphics;
    private powerMeterText!: Phaser.GameObjects.Text;
    private sunsetOverlay!: Phaser.GameObjects.Graphics;

    // Solar Arrays on Arcadia Planitia
    private solarStations: SolarArrayStation[] = [];
    private cleanedStationsCount = 0;

    // Playful Little Dust Devils bouncing around
    private dustDevils: DustDevilItem[] = [];
    private isKnockedBack = false;

    // Equipment State
    private hasEquipments = false;
    private isBlowingWind = false;

    constructor() {
        super("Sol2PerchlorateBarrierScene", {
            solNumber: 2,
            title: "SOL 2: DUST DEVIL CLEANUP AT ARCADIA PLANITIA",
            codename: "ARCADIA SOLAR RESTORATION",
            hazardBadge: "ELECTROSTATIC DUST DEVIL VORTICES",
            briefing: "Arcadia Planitia is a wide, flat Martian plain ideal for solar arrays—until a mischievous dust devil sweeps through! Dodge playful little dust devils bouncing around the plain, equip your specialized Wind-Blower tool, blast the thick red dust off all solar panels, and establish your Night Shift protocol before sunset.",
            nasaFact: "NASA Spirit and Opportunity rovers tracked Martian dust devils up to 8 km high. Triboelectric charging causes dry basalt dust to cling to solar panels until neutralized by directional gas pulses and ion dissipation.",
            primaryTarget: "Dodge dust devils & blast dust off all 4 solar arrays with Wind-Blower.",
            unit: "Arrays Cleaned",
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

        // 3. Setup Top Equipment Panel (Displays Wind-Blower, Ion Dissipator, Visor Seal)
        this.createTopEquipmentPanel();

        // 4. Setup Base Power Meter Console
        this.createBasePowerMeterHUD();

        // 5. Construct 4 Solar Panel Array Stations across Arcadia Planitia
        this.createSolarPanelStations();

        // 6. Spawn 3 Playful Little Dust Devils bouncing around the plain
        this.createPlayfulDustDevils();

        // 7. Setup Player Astronaut Character & Controls
        this.createPlayerAstronaut();
        this.setupKeyboardControls();

        // 8. Start Stage 1: Main Concept Intro Storm Animation
        this.startDustDevilStrikeIntroAnimation();
    }

    // =========================================================================
    // ARCADIA PLANITIA SURFACE PANORAMA
    // =========================================================================
    private createArcadiaPlanitiaBase() {
        // Sky, distant mountains, and wide flat plain
        this.createMartianSurfaceBase(0x1B0E20, 0xE06F38, 0x984428);

        // Arcadia Planitia Flat Horizon Grid lines (subtle atmospheric perspective)
        const plainDetail = this.add.graphics().setDepth(-23);
        plainDetail.lineStyle(1, 0xC45B32, 0.35);

        for (let y = 430; y <= 660; y += 45) {
            plainDetail.lineBetween(0, y, this.W, y);
        }

        // Arcadia Planitia Landmark Signpost
        const signContainer = this.add.container(105, 420).setDepth(5);
        const signBg = this.add.graphics();
        signBg.fillStyle(0x0E1A2C, 0.9);
        signBg.fillRoundedRect(-75, -16, 150, 32, 6);
        signBg.lineStyle(1.5, UITheme.colors.primaryCyan, 0.8);
        signBg.strokeRoundedRect(-75, -16, 150, 32, 6);
        signContainer.add(signBg);

        const signText = this.add.text(0, 0, "ARCADIA PLANITIA\nSOLAR FIELD 02", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            align: "center"
        }).setOrigin(0.5);
        signContainer.add(signText);
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

        const title = this.add.text(-panelW / 2 + 16, 0, "EVA TOOLKIT:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0, 0.5);
        this.equipmentPanelContainer.add(title);

        this.drawEquipmentSlots(false);
    }

    private drawEquipmentSlots(isUnlocked: boolean) {
        const slotData = [
            { icon: "💨", name: "HIGH-VELOCITY WIND-BLOWER" },
            { icon: "⚡", name: "ION CHARGE DISSIPATOR" },
            { icon: "🛡️", name: "LOW-G TETHER & VISOR SEAL" }
        ];

        const panelW = 960;
        const startX = -panelW / 2 + 130;
        const spacing = 265;

        for (let i = 0; i < 3; i++) {
            const sx = startX + i * spacing;
            const item = slotData[i];

            const slotG = this.add.graphics();
            slotG.fillStyle(isUnlocked ? 0x0E2838 : 0x121724, 1);
            slotG.fillRoundedRect(sx, -13, 250, 26, 4);
            slotG.lineStyle(1, isUnlocked ? UITheme.colors.primaryCyan : 0x243044, 1);
            slotG.strokeRoundedRect(sx, -13, 250, 26, 4);
            this.equipmentPanelContainer.add(slotG);

            const status = isUnlocked ? "✔ EQUIPPED" : "🔒 LOCKED";
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

    private unlockTopEquipments() {
        this.equipmentPanelContainer.removeAll(true);

        const panelW = 960;
        const panelH = 34;

        const bg = this.add.graphics();
        bg.fillStyle(0x092233, 0.98);
        bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        bg.lineStyle(2, UITheme.colors.primaryCyan, 1);
        bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        this.equipmentPanelContainer.add(bg);

        const title = this.add.text(-panelW / 2 + 16, 0, "EVA TOOLKIT:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0, 0.5);
        this.equipmentPanelContainer.add(title);

        this.drawEquipmentSlots(true);

        // Equipment glow flash tween
        this.tweens.add({
            targets: this.equipmentPanelContainer,
            scaleY: 1.15,
            duration: 180,
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
        const fillW = Math.max(6, (meterW * percent) / 100);

        this.powerMeterFill.clear();
        const fillColor = percent >= 100 ? UITheme.colors.bioGreen : percent >= 60 ? UITheme.colors.solarGold : UITheme.colors.emergencyRed;
        this.powerMeterFill.fillStyle(fillColor, 0.9);
        this.powerMeterFill.fillRoundedRect(-meterW / 2, -meterH / 2, fillW, meterH, 4);

        const textColor = percent >= 100 ? UITheme.colors.bioGreenStr : percent >= 60 ? UITheme.colors.solarGoldStr : UITheme.colors.emergencyRedStr;
        this.powerMeterText.setText(`⚡ BASE POWER: ${percent}%`);
        this.powerMeterText.setColor(textColor);

        // Meter pulse tween on power increase
        this.tweens.add({
            targets: this.powerMeterContainer,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 140,
            yoyo: true
        });
    }

    // =========================================================================
    // SOLAR PANEL STATIONS ON ARCADIA PLANITIA
    // =========================================================================
    private createSolarPanelStations() {
        const positions = [
            { x: 230, y: 450 },
            { x: 500, y: 495 },
            { x: 770, y: 455 },
            { x: 1040, y: 510 }
        ];

        positions.forEach((pos, idx) => {
            const container = this.add.container(pos.x, pos.y).setDepth(15);

            // Ground base pad
            const pad = this.add.graphics();
            pad.fillStyle(0x1B2A3D, 0.9);
            pad.fillRoundedRect(-70, 38, 140, 18, 4);
            pad.lineStyle(1.5, 0x364D6C, 1);
            pad.strokeRoundedRect(-70, 38, 140, 18, 4);
            container.add(pad);

            // Support pylons
            const pylon = this.add.graphics();
            pylon.lineStyle(4, 0x485E7D, 1);
            pylon.lineBetween(-30, 40, -15, 10);
            pylon.lineBetween(30, 40, 15, 10);
            pylon.lineBetween(0, 40, 0, 10);
            container.add(pylon);

            // Photovoltaic Silicon Cells (Crystalline Blue Solar Glass)
            const solarCells = this.add.graphics();
            solarCells.fillStyle(0x0C3B66, 1);
            solarCells.fillRoundedRect(-65, -45, 130, 60, 6);
            solarCells.lineStyle(2, 0x00E5FF, 0.9);
            solarCells.strokeRoundedRect(-65, -45, 130, 60, 6);

            // Cell grid lines
            solarCells.lineStyle(1, 0x1A6FA8, 0.7);
            solarCells.lineBetween(-20, -45, -20, 15);
            solarCells.lineBetween(20, -45, 20, 15);
            solarCells.lineBetween(-65, -15, 65, -15);
            container.add(solarCells);

            // Clean Solar Reflection Glow Halo
            const glowGraphic = this.add.graphics();
            glowGraphic.fillStyle(0x00E5FF, 0.25);
            glowGraphic.fillEllipse(0, -15, 150, 75);
            glowGraphic.setAlpha(0);
            container.add(glowGraphic);

            // Red Martian Dust Layer Overlay (Initially coated with thick red dust)
            const dustLayer = this.add.graphics();
            dustLayer.fillStyle(0xB84B28, 0.95);
            dustLayer.fillRoundedRect(-65, -45, 130, 60, 6);
            // Dust texture speckles
            for (let d = 0; d < 18; d++) {
                dustLayer.fillStyle(0xD86638, 0.85);
                dustLayer.fillCircle(-50 + (d * 7) % 110, -35 + (d * 11) % 45, 3.5);
            }
            container.add(dustLayer);

            // Dust Percentage Tag on Station
            const dustProgressText = this.add.text(0, -58, "🔴 DUST: 100%", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: UITheme.colors.emergencyRedStr,
                fontStyle: "bold"
            }).setOrigin(0.5);
            container.add(dustProgressText);

            // Station Number Tag
            const stationTag = this.add.text(0, 46, `SOLAR ARRAY 0${idx + 1}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "8.5px",
                color: UITheme.colors.primaryCyanStr,
                fontStyle: "bold"
            }).setOrigin(0.5);
            container.add(stationTag);

            // Interactive Interaction Prompt Button
            const promptContainer = this.add.container(0, -84);
            promptContainer.setAlpha(0);

            const promptBg = this.add.graphics();
            promptBg.fillStyle(UITheme.colors.solarGold, 1);
            promptBg.fillRoundedRect(-75, -14, 150, 28, 6);
            promptContainer.add(promptBg);

            const promptText = this.add.text(0, 0, "💨 BLAST WIND (SPACE)", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "9px",
                color: "#080F1D",
                fontStyle: "bold"
            }).setOrigin(0.5);
            promptContainer.add(promptText);

            const promptHit = this.add.rectangle(0, 0, 150, 28, 0x000000, 0.001);
            promptHit.setInteractive({ useHandCursor: true });
            promptContainer.add(promptHit);

            promptHit.on("pointerdown", () => {
                this.cleanSolarPanel(idx);
            });

            container.add(promptContainer);

            // Direct Click on panel also cleans
            const panelHit = this.add.rectangle(0, -15, 130, 60, 0x000000, 0.001);
            panelHit.setInteractive({ useHandCursor: true });
            container.add(panelHit);

            panelHit.on("pointerdown", () => {
                this.cleanSolarPanel(idx);
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
                cleanPercent: 0,
                isCleaned: false,
                promptContainer
            });
        });
    }

    // =========================================================================
    // PLAYFUL LITTLE DUST DEVILS BOUNCING AROUND ARCADIA PLANITIA
    // =========================================================================
    private createPlayfulDustDevils() {
        const devilConfigs = [
            { x: 380, y: 480, vx: 75, vy: 50, scale: 0.85 },
            { x: 680, y: 530, vx: -85, vy: 65, scale: 0.95 },
            { x: 920, y: 470, vx: 60, vy: -70, scale: 0.8 }
        ];

        devilConfigs.forEach((cfg, idx) => {
            const container = this.add.container(cfg.x, cfg.y).setDepth(25);
            container.setScale(cfg.scale);

            // Multilayered swirling vortex rings
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

            // Swirling playful dust tail particles
            const nameTag = this.add.text(0, -114, `🌪️ DEVIL ${idx + 1}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "9px",
                color: UITheme.colors.solarGoldStr,
                fontStyle: "bold"
            }).setOrigin(0.5);
            container.add(nameTag);

            // Constant rotation and swaying motion
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
                radius: 36 * cfg.scale
            });
        });
    }

    // =========================================================================
    // PLAYER ASTRONAUT CREATION & CONTROLS
    // =========================================================================
    private createPlayerAstronaut() {
        this.astronautContainer = this.add.container(-60, 520).setDepth(30);

        const custom = this.registry.get("astronautCustomization") as any;
        const avatarKey = custom?.gender === "girl" ? "girl-astronaut" : "boy-astronaut";
        const textureToUse = this.textures.exists(avatarKey) ? avatarKey : "base-station";

        this.astronautSprite = this.add.image(0, 0, textureToUse);
        this.astronautSprite.setScale(0.48);
        this.astronautContainer.add(this.astronautSprite);

        // Low-G ground shadow
        const shadow = this.add.ellipse(0, 48, 60, 16, 0x070E1A, 0.5);
        this.astronautContainer.addAt(shadow, 0);

        // Wind-Blower Tool Sprite in Astronaut's Hand
        const toolG = this.add.graphics();
        toolG.fillStyle(0x0C2B42, 1);
        toolG.fillRoundedRect(18, -10, 32, 14, 3);
        toolG.fillStyle(UITheme.colors.primaryCyan, 1);
        toolG.fillCircle(50, -3, 6);
        toolG.lineStyle(1.5, UITheme.colors.solarGold, 1);
        toolG.strokeRoundedRect(18, -10, 32, 14, 3);
        this.astronautContainer.add(toolG);
    }

    private setupKeyboardControls() {
        if (this.input.keyboard) {
            this.cursors = this.input.keyboard.createCursorKeys();
            this.wasdKeys = {
                W: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W),
                A: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A),
                S: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S),
                D: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D),
                SPACE: this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.SPACE)
            };

            // Spacebar cleans nearest panel
            this.wasdKeys.SPACE.on("down", () => {
                if (this.gameState === "ACTION_GAMEPLAY" && this.hasEquipments) {
                    this.cleanNearestPanel();
                }
            });
        }

        // Pointer click to move astronaut on plain
        this.input.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
            if (this.gameState === "ACTION_GAMEPLAY" && pointer.y >= 400 && pointer.y <= 660) {
                this.targetX = pointer.x;
                this.targetY = pointer.y;
            }
        });
    }

    // =========================================================================
    // STAGE 1: DUST DEVIL STRIKE INTRO ANIMATION
    // =========================================================================
    private startDustDevilStrikeIntroAnimation() {
        this.gameState = "INTRO_STORM";

        // Cinematic Dust Storm Gust sweeping across the screen
        const stormVortex = this.add.container(1320, 480).setDepth(50);
        const stormGfx = this.add.graphics();
        stormGfx.fillStyle(0xDF6B35, 0.6);
        stormGfx.fillEllipse(0, 0, 160, 45);
        stormGfx.fillStyle(0xB84B28, 0.7);
        stormGfx.fillEllipse(0, -60, 110, 32);
        stormGfx.fillStyle(0xEE8A45, 0.85);
        stormGfx.fillEllipse(0, -130, 60, 18);
        stormVortex.add(stormGfx);

        // Fly vortex across Arcadia Planitia over the solar panels
        this.tweens.add({
            targets: stormVortex,
            x: -200,
            duration: 2200,
            ease: "Quad.easeInOut",
            onUpdate: () => {
                // Spawn red dust puffs across solar panels
                if (Phaser.Math.Between(0, 10) > 6) {
                    const dustPuff = this.add.circle(stormVortex.x, stormVortex.y - Phaser.Math.Between(10, 80), Phaser.Math.Between(6, 16), 0xC05220, 0.75).setDepth(52);
                    this.tweens.add({
                        targets: dustPuff,
                        scale: 2.2,
                        alpha: 0,
                        duration: 800,
                        onComplete: () => dustPuff.destroy()
                    });
                }
            },
            onComplete: () => {
                stormVortex.destroy();
            }
        });

        // Critical Warning Banner
        this.introAlertBanner = this.add.container(640, 230).setDepth(60);
        const bW = 680;
        const bH = 76;

        const bG = this.add.graphics();
        bG.fillStyle(0x1F0A0E, 0.95);
        bG.fillRoundedRect(-bW / 2, -bH / 2, bW, bH, 12);
        bG.lineStyle(2.5, UITheme.colors.emergencyRed, 1);
        bG.strokeRoundedRect(-bW / 2, -bH / 2, bW, bH, 12);
        this.introAlertBanner.add(bG);

        const alertTitle = this.add.text(0, -14, "⚠ CRITICAL ALERT: DUST DEVIL STRIKE AT ARCADIA PLANITIA!", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setOrigin(0.5);

        const alertSub = this.add.text(0, 14, "Photovoltaic solar panels buried in electrostatic dust! Base power plunging to 20% before sunset!", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);

        this.introAlertBanner.add([alertTitle, alertSub]);

        // Banner Pulse
        this.tweens.add({
            targets: this.introAlertBanner,
            scaleX: 1.03,
            scaleY: 1.03,
            duration: 600,
            yoyo: true,
            repeat: -1
        });

        SoundFX.playAlert();

        // After 2.5s, astronaut enters
        this.time.delayedCall(2500, () => {
            if (this.gameState === "INTRO_STORM") {
                this.triggerAstronautEntry();
            }
        });
    }

    // =========================================================================
    // STAGE 2: ASTRONAUT ENTRANCE & PROBLEM BRIEFING
    // =========================================================================
    private triggerAstronautEntry() {
        this.gameState = "ASTRONAUT_ENTRY";

        if (this.introAlertBanner) {
            this.tweens.add({
                targets: this.introAlertBanner,
                alpha: 0,
                duration: 350,
                onComplete: () => this.introAlertBanner.destroy()
            });
        }

        // Astronaut walks into the scene with Martian low-G bounce
        this.tweens.add({
            targets: this.astronautContainer,
            x: 160,
            duration: 1200,
            ease: "Quad.easeOut",
            onComplete: () => {
                this.tweens.add({
                    targets: this.astronautContainer,
                    y: 524,
                    duration: 750,
                    yoyo: true,
                    repeat: -1
                });

                this.showAstronautSpeech();
            }
        });
    }

    private showAstronautSpeech() {
        const speechC = this.add.container(280, 440).setDepth(60);

        const bubbleW = 340;
        const bubbleH = 88;

        const bg = this.add.graphics();
        bg.fillStyle(0x061122, 0.96);
        bg.fillRoundedRect(0, -bubbleH / 2, bubbleW, bubbleH, 10);
        bg.lineStyle(2, UITheme.colors.primaryCyan, 0.95);
        bg.strokeRoundedRect(0, -bubbleH / 2, bubbleW, bubbleH, 10);
        bg.fillTriangle(0, 0, -12, 10, 0, 16);
        speechC.add(bg);

        const dialogue = this.add.text(16, -26, "CADET! A playful Martian dust devil choked our solar arrays!\nThe sun is setting fast over Arcadia Planitia.\nWe must select the proper scientific cleaning protocol\nto unlock our Wind-Blower equipment and restore base power!", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9.5px",
            color: "#FFFFFF",
            lineSpacing: 4
        });
        speechC.add(dialogue);

        const btnBg = this.add.graphics();
        btnBg.fillStyle(UITheme.colors.solarGold, 1);
        btnBg.fillRoundedRect(16, 14, 190, 24, 4);
        speechC.add(btnBg);

        const btnText = this.add.text(111, 26, "▶ SELECT PROTOCOL", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#050C1A",
            fontStyle: "bold"
        }).setOrigin(0.5);
        speechC.add(btnText);

        const hit = this.add.rectangle(111, 26, 190, 24, 0x000000, 0.001);
        hit.setInteractive({ useHandCursor: true });
        speechC.add(hit);

        hit.on("pointerdown", () => {
            SoundFX.playClick();
            this.tweens.add({
                targets: speechC,
                alpha: 0,
                duration: 200,
                onComplete: () => {
                    speechC.destroy();
                    this.showScientificProtocolModal();
                }
            });
        });
    }

    // =========================================================================
    // STAGE 3: SCIENTIFIC PROTOCOL QUESTION (Two Options + Warning Panel)
    // =========================================================================
    private showScientificProtocolModal() {
        this.gameState = "PROTOCOL_QUESTION";
        this.protocolModalContainer = this.add.container(640, 365).setDepth(70);

        const modalW = 780;
        const modalH = 430;

        const bg = this.add.graphics();
        const shade = this.add.rectangle(0, 0, this.W * 2, this.H * 2, 0x000000, 0.78);
        this.protocolModalContainer.add(shade);

        bg.fillStyle(0x111726, 0.98);
        bg.fillRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 14);
        bg.lineStyle(2.5, UITheme.colors.primaryCyan, 1);
        bg.strokeRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 14);
        this.protocolModalContainer.add(bg);

        // Header
        const title = this.add.text(0, -modalH / 2 + 28, "🔬 NASA ELECTROSTATIC CLEANING PROTOCOL", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "15px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setOrigin(0.5);

        const question = this.add.text(
            0,
            -modalH / 2 + 66,
            "Martian dust clings to photovoltaic glass through high-voltage triboelectric electrostatic charges in dry 6-millibar air.\nWhat is the scientifically verified method to blast the dust off without destroying the solar cells?",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: "#FFFFFF",
                align: "center",
                lineSpacing: 5
            }
        ).setOrigin(0.5);

        this.protocolModalContainer.add([title, question]);

        // Option A: Apt / Scientifically Correct Solution
        this.createProtocolOptionCard(
            -modalW / 4 - 10,
            32,
            modalW / 2 - 30,
            195,
            "OPTION A: HIGH-VELOCITY WIND-BLOWER & ION DISSIPATOR",
            "Discharge focused 45° gas pulses combined with an electrostatic ion dissipator to neutralize triboelectric surface charges, lifting fine regolith into the wind without scratching optical anti-reflective glass.",
            true
        );

        // Option B: Wrong / Trap Option
        this.createProtocolOptionCard(
            modalW / 4 + 10,
            32,
            modalW / 2 - 30,
            195,
            "OPTION B: MECHANICAL WIRE BRUSH & METAL SCRAPING",
            "Scrape the encrusted dust layer vigorously using stiff steel wire brushes and hard mechanical friction directly across the solar panel glass surfaces.",
            false
        );
    }

    private createProtocolOptionCard(
        x: number,
        y: number,
        w: number,
        h: number,
        title: string,
        desc: string,
        isCorrect: boolean
    ) {
        const c = this.add.container(x, y);
        this.protocolModalContainer.add(c);

        const cardBg = this.add.graphics();
        cardBg.fillStyle(0x1A2234, 1);
        cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
        cardBg.lineStyle(1.5, UITheme.colors.panelBorder, 1);
        cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        c.add(cardBg);

        const optTitle = this.add.text(0, -h / 2 + 24, title, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: w - 24 }
        }).setOrigin(0.5);

        const optDesc = this.add.text(0, 10, desc, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#CFD8DC",
            align: "center",
            wordWrap: { width: w - 28 },
            lineSpacing: 4
        }).setOrigin(0.5);

        const btn = this.add.graphics();
        btn.fillStyle(UITheme.colors.cardHover, 1);
        btn.fillRoundedRect(-70, h / 2 - 36, 140, 26, 6);
        btn.lineStyle(1, UITheme.colors.primaryCyan, 0.9);
        btn.strokeRoundedRect(-70, h / 2 - 36, 140, 26, 6);

        const btnLabel = this.add.text(0, h / 2 - 23, "SELECT PROTOCOL", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9.5px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);

        c.add([optTitle, optDesc, btn, btnLabel]);

        const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0.001);
        hit.setInteractive({ useHandCursor: true });
        c.add(hit);

        hit.on("pointerover", () => {
            this.tweens.add({ targets: c, scale: 1.02, duration: 120 });
            cardBg.clear();
            cardBg.fillStyle(0x222E45, 1);
            cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
            cardBg.lineStyle(2, UITheme.colors.primaryCyan, 1);
            cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        });

        hit.on("pointerout", () => {
            this.tweens.add({ targets: c, scale: 1.0, duration: 120 });
            cardBg.clear();
            cardBg.fillStyle(0x1A2234, 1);
            cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
            cardBg.lineStyle(1.5, UITheme.colors.panelBorder, 1);
            cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        });

        hit.on("pointerdown", () => {
            SoundFX.playClick();
            if (isCorrect) {
                this.handleCorrectProtocolSelected();
            } else {
                this.showScientificFailureWarning();
            }
        });
    }

    /**
     * WRONG OPTION SELECTED: Shows Warning Panel with NASA Scientific Reason
     */
    private showScientificFailureWarning() {
        SoundFX.playAlert();

        const warnC = this.add.container(0, 0).setDepth(85);
        this.protocolModalContainer.add(warnC);

        const w = 660;
        const h = 320;

        const bg = this.add.graphics();
        bg.fillStyle(0x1C090E, 0.98);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
        bg.lineStyle(3, UITheme.colors.emergencyRed, 1);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
        warnC.add(bg);

        const header = this.add.text(0, -h / 2 + 30, "⚠ SCIENTIFIC PROTOCOL ERROR: OPTICAL COATING ABRASION", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0.5);

        const explanation = this.add.text(
            0,
            -10,
            "NASA Mars Exploration Rover Surface Physics:\n\n" +
            "1. Triboelectric Static Charging: Scrubbing dry basalt regolith against metal causes massive friction charging!\n" +
            "The induced electrostatic charge binds fine dust particles even tighter to the glass instead of releasing them.\n\n" +
            "2. Irreversible Optical Abrasion: Martian regolith contains sharp, crystalline quartz and pyroxene shards (Mohs hardness 7).\n" +
            "Mechanical wire scraping permanently scratches and frosts the anti-reflective glass coating,\n" +
            "cutting photovoltaic light transmission by >60% permanently even after the dust is wiped off!",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: "#FFFFFF",
                align: "center",
                lineSpacing: 4
            }
        ).setOrigin(0.5);

        const retryBtn = this.add.graphics();
        retryBtn.fillStyle(UITheme.colors.emergencyRed, 1);
        retryBtn.fillRoundedRect(-95, h / 2 - 46, 190, 32, 6);

        const retryLabel = this.add.text(0, h / 2 - 30, "RE-EVALUATE PROTOCOL", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);

        warnC.add([header, explanation, retryBtn, retryLabel]);

        const retryHit = this.add.rectangle(0, h / 2 - 30, 190, 32, 0x000000, 0.001);
        retryHit.setInteractive({ useHandCursor: true });
        warnC.add(retryHit);

        retryHit.on("pointerdown", () => {
            SoundFX.playClick();
            warnC.destroy();
        });
    }

    /**
     * CORRECT OPTION SELECTED: Unlocks Equipment & Starts Action Gameplay
     */
    private handleCorrectProtocolSelected() {
        SoundFX.playToggle(true);
        this.hasEquipments = true;

        this.tweens.add({
            targets: this.protocolModalContainer,
            scale: 0.9,
            alpha: 0,
            duration: 250,
            onComplete: () => {
                this.protocolModalContainer.destroy();
                this.unlockTopEquipments();
                this.startActionGameplay();
            }
        });
    }

    // =========================================================================
    // STAGE 4: ACTION GAMEPLAY (The Fun Part & The Game Loop)
    // =========================================================================
    private startActionGameplay() {
        this.gameState = "ACTION_GAMEPLAY";
        this.setActionFeedback("✔ WIND-BLOWER EQUIPPED! RUN ACROSS ARCADIA PLANITIA, DODGE DUST DEVILS, AND BLAST DUST OFF ALL 4 ARRAYS!", true);

        // Instruction Pill Banner
        const banner = this.add.container(640, 128).setDepth(35);
        const bG = this.add.graphics();
        bG.fillStyle(0x061426, 0.92);
        bG.fillRoundedRect(-280, -16, 560, 32, 8);
        bG.lineStyle(1.5, UITheme.colors.solarGold, 0.9);
        bG.strokeRoundedRect(-280, -16, 560, 32, 8);
        banner.add(bG);

        const bannerText = this.add.text(0, 0, "MOVE: [W/A/S/D / ARROWS / CLICK] · BLAST: [SPACE / CLICK PANEL]", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
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

    private cleanNearestPanel() {
        let nearestIdx = -1;
        let minDist = 140;

        this.solarStations.forEach((st, idx) => {
            if (!st.isCleaned) {
                const dist = Phaser.Math.Distance.Between(this.astronautContainer.x, this.astronautContainer.y, st.x, st.y);
                if (dist < minDist) {
                    minDist = dist;
                    nearestIdx = idx;
                }
            }
        });

        if (nearestIdx >= 0) {
            this.cleanSolarPanel(nearestIdx);
        } else {
            this.showSurfaceFloatingText(this.astronautContainer.x, this.astronautContainer.y, "MOVE CLOSER TO A SOLAR ARRAY!", UITheme.colors.solarGoldStr);
        }
    }

    private cleanSolarPanel(idx: number) {
        if (this.gameState !== "ACTION_GAMEPLAY" || !this.hasEquipments) return;

        const st = this.solarStations[idx];
        if (st.isCleaned) {
            this.showSurfaceFloatingText(st.x, st.y, "✔ ARRAY ALREADY 100% CLEAN & POWERING BASE", UITheme.colors.bioGreenStr);
            return;
        }

        const dist = Phaser.Math.Distance.Between(this.astronautContainer.x, this.astronautContainer.y, st.x, st.y);
        if (dist > 180) {
            this.showSurfaceFloatingText(st.x, st.y, "MOVE ASTRONAUT CLOSER TO CLEAN!", UITheme.colors.solarGoldStr);
            return;
        }

        // Face astronaut toward panel
        this.astronautSprite.setScale(st.x < this.astronautContainer.x ? -0.48 : 0.48, 0.48);

        // Visual Wind Stream Blast from Astronaut to Solar Array
        this.triggerWindBlastEffect(this.astronautContainer.x, this.astronautContainer.y - 10, st.x, st.y - 15);

        // Increment Cleaning
        st.cleanPercent = Math.min(100, st.cleanPercent + 34);
        SoundFX.playToggle(true);

        // Update Dust Layer Graphic alpha
        const remainingDustAlpha = Math.max(0, 1.0 - (st.cleanPercent / 100));
        st.dustLayer.setAlpha(remainingDustAlpha);

        if (st.cleanPercent >= 100) {
            st.isCleaned = true;
            st.dustProgressText.setText("✔ CLEAN 100%");
            st.dustProgressText.setColor(UITheme.colors.bioGreenStr);
            st.promptContainer.setAlpha(0);

            // Flash solar cells with bright glow
            st.glowGraphic.setAlpha(0.65);
            this.tweens.add({
                targets: st.glowGraphic,
                alpha: 0.35,
                duration: 600,
                yoyo: true,
                repeat: -1
            });

            this.cleanedStationsCount++;
            const newPower = 20 + this.cleanedStationsCount * 20;
            this.updatePowerMeterVisual(newPower);
            this.updateVisorProgress(this.cleanedStationsCount, 4, "Arrays Cleaned");

            this.showSurfaceFloatingText(st.x, st.y, `✔ ARRAY 0${idx + 1} RESTORED (+20% POWER)!`, UITheme.colors.bioGreenStr);

            // Check if all 4 panels are clean
            if (this.cleanedStationsCount >= 4) {
                this.celebrateSolarRestoration();
            }
        } else {
            const dustPct = 100 - st.cleanPercent;
            st.dustProgressText.setText(`DUST: ${dustPct}%`);
            this.showSurfaceFloatingText(st.x, st.y, `💨 BLASTING DUST... ${st.cleanPercent}% CLEAN`, UITheme.colors.primaryCyanStr);
        }
    }

    private triggerWindBlastEffect(fromX: number, fromY: number, toX: number, toY: number) {
        if (this.isBlowingWind) return;
        this.isBlowingWind = true;

        const windG = this.add.graphics().setDepth(45);
        windG.lineStyle(4, UITheme.colors.primaryCyan, 0.9);
        windG.lineBetween(fromX, fromY, toX, toY);

        // High velocity air stream particles
        for (let i = 0; i < 20; i++) {
            const p = this.add.circle(
                fromX + Phaser.Math.Between(-10, 10),
                fromY + Phaser.Math.Between(-10, 10),
                Phaser.Math.Between(3, 7),
                i % 2 === 0 ? 0x00E5FF : 0xFFFFFF,
                0.85
            ).setDepth(46);

            this.tweens.add({
                targets: p,
                x: toX + Phaser.Math.Between(-30, 30),
                y: toY + Phaser.Math.Between(-20, 20),
                alpha: 0,
                scale: 1.8,
                duration: Phaser.Math.Between(250, 450),
                onComplete: () => p.destroy()
            });
        }

        // Dissipating red dust particles flying into the sky
        for (let j = 0; j < 16; j++) {
            const d = this.add.circle(toX, toY, Phaser.Math.Between(3, 6), 0xD86638, 0.8).setDepth(47);
            this.tweens.add({
                targets: d,
                x: toX + Phaser.Math.Between(-80, 80),
                y: toY - Phaser.Math.Between(40, 120),
                alpha: 0,
                duration: 600,
                onComplete: () => d.destroy()
            });
        }

        this.time.delayedCall(200, () => {
            windG.destroy();
            this.isBlowingWind = false;
        });
    }

    private celebrateSolarRestoration() {
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

        // Sunset falls over Arcadia Planitia (gradual darkening to twilight)
        this.tweens.add({
            targets: this.sunsetOverlay,
            alpha: 0.65,
            duration: 1800,
            onUpdate: () => {
                this.sunsetOverlay.clear();
                this.sunsetOverlay.fillStyle(0x0C061C, 0.55);
                this.sunsetOverlay.fillRect(0, 0, this.W, this.H);
            }
        });

        // Trigger Event Radio Comms & Transition to Night Decision
        this.time.delayedCall(2000, () => {
            this.showNightDecisionEvent();
        });
    }

    // =========================================================================
    // STAGE 5: THE NIGHT SHIFT EVENT DECISION (API & State Integration)
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
        const header = this.add.text(0, -modalH / 2 + 28, "⚡ EVENT: DUST DEVIL CONTAMINATION AT SUNSET", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setOrigin(0.5);

        // Exact Event Text requested by User
        const eventText = this.add.text(
            0,
            -modalH / 2 + 65,
            "\"A Martian dust devil just coated our radiator fins in toxic perchlorate salt and jammed the outdoor ice-pipe valve!\"\n" +
            "Night is falling over Arcadia Planitia (-95°C). Choose your survival doctrine for the Night Shift:",
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
            "CHOICE A: SEND ASTRONAUT OUTSIDE TO CLEAR ICE PIPE",
            "BENEFIT:\n• Subsurface Ice Melter stays at 100% EFFICIENCY for the Night Shift.\n\n" +
            "IMMEDIATE COST:\n• Suit gets covered in toxic perchlorate dust.\n" +
            "• Sets lockedSuitportPlug = true and forces modules.suitport = true for the Night Shift.\n" +
            "• Leaves player with only 2 FREE POWER PLUGS to allocate across MOXIE, Ice Melter, and Greenhouse!",
            UITheme.colors.primaryCyan,
            () => this.executeNightChoice("A")
        );

        // Choice B Card
        this.createNightChoiceCard(
            modalW / 4 + 8,
            cardY,
            cardW,
            cardH,
            "CHOICE B: STAY INSIDE & LET ICE PIPE FREEZE",
            "BENEFIT:\n• Nobody gets contaminated with perchlorate dust.\n" +
            "• Keep all 3 POWER PLUGS FREE to allocate for the Night Shift (Suitport can remain unplugged).\n\n" +
            "IMMEDIATE COST:\n• Sets icePipeFrozen = true.\n" +
            "• Subsurface Ice Melter loses 50% EFFICIENCY (+25% water instead of +50%) during the Night Shift.",
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
            fontSize: "10px",
            color: accentColor === UITheme.colors.primaryCyan ? UITheme.colors.primaryCyanStr : UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: w - 24 }
        }).setOrigin(0.5);

        const descText = this.add.text(0, 0, desc, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9.5px",
            color: "#E2EDFC",
            align: "left",
            wordWrap: { width: w - 30 },
            lineSpacing: 4
        }).setOrigin(0.5);

        // CTA Button
        const btn = this.add.graphics();
        btn.fillStyle(accentColor, 1);
        btn.fillRoundedRect(-90, h / 2 - 38, 180, 28, 6);

        const btnLabel = this.add.text(0, h / 2 - 24, "CONFIRM DIRECTIVE", {
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

    private executeNightChoice(choice: "A" | "B") {
        SoundFX.playToggle(true);

        // Store exactly the APIs and states requested by User
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

        // Transition to phase = 'NIGHT'
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

        // Dismiss Modal and Display Night Debrief Card
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

        // Night falls completely across Arcadia Planitia
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

        // 3 Stars
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

        // Summary details plate
        const summaryG = this.add.graphics();
        summaryG.fillStyle(0x111E33, 0.95);
        summaryG.fillRoundedRect(-dW / 2 + 40, -15, dW - 80, 125, 8);
        summaryG.lineStyle(1.5, UITheme.colors.panelBorder, 1);
        summaryG.strokeRoundedRect(-dW / 2 + 40, -15, dW - 80, 125, 8);
        debriefC.add(summaryG);

        const choiceSummary = choice === "A"
            ? "• DIRECTIVE: Astronaut cleared exterior ice-pipe.\n" +
              "• ICE MELTER EFFICIENCY: 100% (+50% Water Production during Night Shift).\n" +
              "• POWER PLUGS: 2 Free Plugs remaining (Suitport locked active for decontam).\n" +
              "• CURRENT PHASE: NIGHT (-95°C Survival Active)."
            : "• DIRECTIVE: Crew stayed inside habitat. Zero perchlorate contamination.\n" +
              "• ICE MELTER EFFICIENCY: 50% (+25% Water Production due to frozen pipe).\n" +
              "• POWER PLUGS: All 3 Plugs completely free to allocate across life support.\n" +
              "• CURRENT PHASE: NIGHT (-95°C Survival Active).";

        const summaryText = this.add.text(-dW / 2 + 65, 45, choiceSummary, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: "#E0ECFF",
            lineSpacing: 8
        }).setOrigin(0, 0.5);

        // Advance to Sol 3 Button
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
    // GAME LOOP: UPDATE (Movement, Dust Devils, Interaction)
    // =========================================================================
    update(_time: number, delta: number) {
        if (this.gameState !== "ACTION_GAMEPLAY") return;

        const dt = delta / 1000;

        // 1. Player Astronaut Movement (WASD / Arrows / Pointer)
        let dx = 0;
        let dy = 0;

        if (this.cursors && this.wasdKeys) {
            if (this.cursors.left.isDown || this.wasdKeys.A.isDown) dx -= 1;
            if (this.cursors.right.isDown || this.wasdKeys.D.isDown) dx += 1;
            if (this.cursors.up.isDown || this.wasdKeys.W.isDown) dy -= 1;
            if (this.cursors.down.isDown || this.wasdKeys.S.isDown) dy += 1;
        }

        if (dx !== 0 || dy !== 0) {
            // Cancel pointer click target if keyboard input active
            this.targetX = null;
            this.targetY = null;
            this.isMoving = true;

            const len = Math.hypot(dx, dy);
            this.astronautContainer.x += (dx / len) * this.astronautSpeed * dt;
            this.astronautContainer.y += (dy / len) * this.astronautSpeed * dt;

            // Flip sprite depending on horizontal movement
            if (dx !== 0) {
                this.astronautSprite.setScale(dx < 0 ? -0.48 : 0.48, 0.48);
            }
        } else if (this.targetX !== null && this.targetY !== null) {
            // Pointer target movement
            const dist = Phaser.Math.Distance.Between(this.astronautContainer.x, this.astronautContainer.y, this.targetX, this.targetY);
            if (dist > 8) {
                this.isMoving = true;
                const angle = Phaser.Math.Angle.Between(this.astronautContainer.x, this.astronautContainer.y, this.targetX, this.targetY);
                this.astronautContainer.x += Math.cos(angle) * this.astronautSpeed * dt;
                this.astronautContainer.y += Math.sin(angle) * this.astronautSpeed * dt;
                this.astronautSprite.setScale(this.targetX < this.astronautContainer.x ? -0.48 : 0.48, 0.48);
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
            this.astronautSprite.y = Math.sin(_time * 0.012) * 2.5;
        } else {
            this.astronautSprite.y = 0;
        }

        // Clamp astronaut to Arcadia Planitia surface plain bounds
        this.astronautContainer.x = Phaser.Math.Clamp(this.astronautContainer.x, 60, this.W - 60);
        this.astronautContainer.y = Phaser.Math.Clamp(this.astronautContainer.y, 410, 650);

        // 2. Playful Dust Devils bouncing around Arcadia Planitia
        this.dustDevils.forEach(devil => {
            devil.container.x += devil.vx * dt;
            devil.container.y += devil.vy * dt;

            // Bounce off boundaries of the plain
            if (devil.container.x < 100) {
                devil.container.x = 100;
                devil.vx *= -1;
            } else if (devil.container.x > this.W - 100) {
                devil.container.x = this.W - 100;
                devil.vx *= -1;
            }

            if (devil.container.y < 420) {
                devil.container.y = 420;
                devil.vy *= -1;
            } else if (devil.container.y > 630) {
                devil.container.y = 630;
                devil.vy *= -1;
            }

            // Check collision with Astronaut (Playful spin-out knockback)
            if (!this.isKnockedBack) {
                const distToPlayer = Phaser.Math.Distance.Between(
                    devil.container.x,
                    devil.container.y,
                    this.astronautContainer.x,
                    this.astronautContainer.y
                );

                if (distToPlayer < devil.radius + 25) {
                    this.triggerDustDevilKnockback(devil);
                }
            }
        });

        // 3. Update Solar Station Prompt Visibility
        this.solarStations.forEach(st => {
            if (!st.isCleaned) {
                const dist = Phaser.Math.Distance.Between(this.astronautContainer.x, this.astronautContainer.y, st.x, st.y);
                st.promptContainer.setAlpha(dist < 140 ? 1 : 0);
            }
        });
    }

    private triggerDustDevilKnockback(devil: DustDevilItem) {
        this.isKnockedBack = true;
        SoundFX.playAlert();

        // Harmless, playful gust knockback
        const pushAngle = Phaser.Math.Angle.Between(devil.container.x, devil.container.y, this.astronautContainer.x, this.astronautContainer.y);
        const pushDist = 55;

        this.tweens.add({
            targets: this.astronautContainer,
            x: Phaser.Math.Clamp(this.astronautContainer.x + Math.cos(pushAngle) * pushDist, 80, this.W - 80),
            y: Phaser.Math.Clamp(this.astronautContainer.y + Math.sin(pushAngle) * pushDist, 420, 640),
            duration: 350,
            ease: "Back.easeOut"
        });

        // Cute 360 spin wobble
        this.tweens.add({
            targets: this.astronautSprite,
            angle: 360,
            duration: 400,
            onComplete: () => {
                this.astronautSprite.setAngle(0);
                this.isKnockedBack = false;
            }
        });

        this.showSurfaceFloatingText(this.astronautContainer.x, this.astronautContainer.y, "🌪️ PLAYFUL DUST GUST!", UITheme.colors.solarGoldStr);
    }

    protected isTargetMet(): boolean {
        return this.cleanedStationsCount >= 4 && (this.gameState === "NIGHT_DECISION" || this.gameState === "NIGHT_ACTIVE");
    }
}

export default Sol2PerchlorateBarrierScene;
