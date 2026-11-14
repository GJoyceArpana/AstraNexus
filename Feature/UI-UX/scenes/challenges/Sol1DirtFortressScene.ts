import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

type PipeType = "STRAIGHT" | "CORNER" | "T_JUNCTION";

interface PipeTileData {
    col: number;
    row: number;
    type: PipeType;
    rot: number; // 0 = 0°, 1 = 90°, 2 = 180°, 3 = 270°
    isPowered: boolean;
    container: Phaser.GameObjects.Container;
    pipeGraphics: Phaser.GameObjects.Graphics;
    waterGraphics: Phaser.GameObjects.Graphics;
    glowGraphic: Phaser.GameObjects.Graphics;
}

export class Sol1DirtFortressScene extends SolChallengeBaseScene {
    // Game States: 1. Intro Animation -> 2. Astronaut Entry -> 3. Protocol Decision -> 4. Pipe Puzzle
    private gameState: "INTRO_DROUGHT" | "ASTRONAUT_ENTRY" | "PROTOCOL_QUESTION" | "PUZZLE_ACTIVE" = "INTRO_DROUGHT";

    // 3x3 Irrigation Grid Constants
    private readonly GRID_COLS = 3;
    private readonly GRID_ROWS = 3;
    private readonly TILE_SIZE = 84;
    private readonly TILE_GAP = 12;

    private grid: PipeTileData[][] = [];
    private isWaterFlowingToGarden = false;
    private isRotating = false;

    // Visual Containers & Panels
    private introAlertBanner!: Phaser.GameObjects.Container;
    private steamVentGraphic!: Phaser.GameObjects.Graphics;
    private astronautContainer!: Phaser.GameObjects.Container;
    private equipmentPanelContainer!: Phaser.GameObjects.Container;
    private protocolModalContainer!: Phaser.GameObjects.Container;
    private taskConsoleContainer!: Phaser.GameObjects.Container;

    // Among Us style Task Console UI elements
    private taskProgressBarFill!: Phaser.GameObjects.Graphics;
    private taskProgressLabel!: Phaser.GameObjects.Text;
    private taskStatusLed!: Phaser.GameObjects.Arc;
    private tankWaterLevel!: Phaser.GameObjects.Graphics;
    private gardenTubesGraphic!: Phaser.GameObjects.Graphics;

    // Space-Tomato Pods
    private tomatoPods: Phaser.GameObjects.Container[] = [];
    private tomatoSprites: Phaser.GameObjects.Container[] = [];
    private taskCompleteStamp!: Phaser.GameObjects.Container;

    // Equipment State
    private hasEquipments = false;

    constructor() {
        super("Sol1DirtFortressScene", {
            solNumber: 1,
            title: "SOL 1: SPACE-TOMATO GREENHOUSE",
            codename: "CRYO-WATER IRRIGATION PUZZLE",
            hazardBadge: "HYDROPONIC CROP STARVATION RISK",
            briefing: "Astronauts need fresh food! Underground glacial ice has been melted, but the greenhouse irrigation pipes are disconnected. Resolve the NASA fluid protocol to unlock your tools, then rotate the pipe grid to route water into the plant pods and sprout giant Martian space-tomatoes.",
            nasaFact: "At Mars' surface pressure of 610 Pa (0.6% of Earth), liquid water boils at 0.01°C. NASA habitats use closed pressurized conduits to deliver water without explosive boiling.",
            primaryTarget: "Unlock plumbing equipment and deliver melted water to space-tomato pods.",
            unit: "%",
            targetVal: 100,
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
    }

    protected createChallengeContent() {
        // Deep atmospheric Martian greenhouse backdrop
        this.createMartianSurfaceBase(0x180D1A, 0x48A060, 0x5C2418);

        // Hydroponic Greenhouse Dome silhouette in background
        const domeG = this.add.graphics().setDepth(-22);
        domeG.fillStyle(0x0C2B1E, 0.6);
        domeG.fillEllipse(640, 390, 1100, 480);
        domeG.lineStyle(2, 0x00E5FF, 0.4);
        domeG.strokeEllipse(640, 390, 1100, 480);

        // Greenhouse structural rib trusses
        for (let x = 200; x <= 1080; x += 110) {
            domeG.lineStyle(1.5, 0x1E5C42, 0.5);
            domeG.lineBetween(x, 260, x, 520);
        }

        // 1. Top Equipment Panel (Spans across the top below Visor HUD)
        this.createTopEquipmentPanel();

        // 2. Build Among Us Industrial Task Console (Centered at 640, 385)
        this.createTaskConsole();

        // 3. Stage 1: Main Concept Drought Animation & Warning
        this.startDroughtIntroAnimation();
    }

    // =========================================================================
    // STAGE 1: INTRO DROUGHT ANIMATION (Problem Visuals & Steam Venting)
    // =========================================================================
    private startDroughtIntroAnimation() {
        this.gameState = "INTRO_DROUGHT";

        // Steam venting from disconnected pipe junction
        this.steamVentGraphic = this.add.graphics().setDepth(28);

        // Disconnected pipe burst steam particles
        const ventTimer = this.time.addEvent({
            delay: 100,
            callback: () => {
                if (this.gameState === "PUZZLE_ACTIVE" || this.hasEquipments) {
                    ventTimer.remove();
                    this.steamVentGraphic.clear();
                    return;
                }
                const p = this.add.circle(440 + Phaser.Math.Between(-15, 15), 380, Phaser.Math.Between(4, 9), 0xCFD8DC, 0.7).setDepth(29);
                this.tweens.add({
                    targets: p,
                    y: p.y - 70,
                    x: p.x + Phaser.Math.Between(-30, 30),
                    alpha: 0,
                    scale: 2,
                    duration: 900,
                    onComplete: () => p.destroy()
                });
            },
            loop: true
        });

        // Dramatic Pulsing Drought Warning Banner across the center
        this.introAlertBanner = this.add.container(640, 220).setDepth(50);

        const bannerW = 620;
        const bannerH = 74;
        const bG = this.add.graphics();
        bG.fillStyle(0x1F0A0E, 0.95);
        bG.fillRoundedRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH, 12);
        bG.lineStyle(2.5, UITheme.colors.emergencyRed, 1);
        bG.strokeRoundedRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH, 12);
        this.introAlertBanner.add(bG);

        const alertTitle = this.add.text(0, -14, "⚠ CRITICAL ALERT: GREENHOUSE CROPS WILTING!", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setOrigin(0.5);

        const alertSub = this.add.text(0, 14, "Melted underground ice cannot reach dry plant pods due to pipe disconnects.", {
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

        // After 2.5 seconds of dramatic problem demonstration, trigger Astronaut Entrance
        this.time.delayedCall(2500, () => {
            if (this.gameState === "INTRO_DROUGHT") {
                this.triggerAstronautEntry();
            }
        });
    }

    // =========================================================================
    // STAGE 2: PLAYER ASTRONAUT ENTRANCE & PROBLEM CALLOUT
    // =========================================================================
    private triggerAstronautEntry() {
        this.gameState = "ASTRONAUT_ENTRY";

        // Smoothly fade out the initial drought alert banner
        if (this.introAlertBanner) {
            this.tweens.add({
                targets: this.introAlertBanner,
                alpha: 0,
                duration: 400,
                onComplete: () => this.introAlertBanner.destroy()
            });
        }

        // Astronaut Container
        this.astronautContainer = this.add.container(-60, 520).setDepth(45);

        const custom = this.registry.get("astronautCustomization") as any;
        const avatarKey = custom?.gender === "girl" ? "girl-astronaut" : "boy-astronaut";
        const suitImg = this.add.image(0, 0, this.textures.exists(avatarKey) ? avatarKey : "base-station");
        suitImg.setScale(0.52);
        this.astronautContainer.add(suitImg);

        // Walking entry tween from off-screen left into the greenhouse
        this.tweens.add({
            targets: this.astronautContainer,
            x: 150,
            duration: 1200,
            ease: "Quad.easeOut",
            onComplete: () => {
                // Astronaut bobbing idle breathing
                this.tweens.add({
                    targets: this.astronautContainer,
                    y: 524,
                    duration: 800,
                    yoyo: true,
                    repeat: -1
                });

                // Dialogue Speech Bubble
                this.showAstronautSpeech();
            }
        });
    }

    private showAstronautSpeech() {
        const speechC = this.add.container(260, 440).setDepth(55);

        const bubbleW = 320;
        const bubbleH = 80;

        const bg = this.add.graphics();
        bg.fillStyle(0x061122, 0.95);
        bg.fillRoundedRect(0, -bubbleH / 2, bubbleW, bubbleH, 10);
        bg.lineStyle(2, UITheme.colors.primaryCyan, 0.9);
        bg.strokeRoundedRect(0, -bubbleH / 2, bubbleW, bubbleH, 10);

        // Speech pointer arrow
        bg.fillTriangle(0, 0, -12, 10, 0, 16);
        speechC.add(bg);

        const dialogue = this.add.text(16, -22, "CADET! Our Space-Tomatoes are drying out!\nWe must configure the correct scientific protocol\nto unlock our plumbing equipment and restore water.", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#FFFFFF",
            lineSpacing: 4
        });
        speechC.add(dialogue);

        // "SELECT REPAIR PROTOCOL" button
        const btnBg = this.add.graphics();
        btnBg.fillStyle(UITheme.colors.solarGold, 1);
        btnBg.fillRoundedRect(16, 12, 180, 24, 4);
        speechC.add(btnBg);

        const btnText = this.add.text(106, 24, "▶ CHOOSE PROTOCOL", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#050C1A",
            fontStyle: "bold"
        }).setOrigin(0.5);
        speechC.add(btnText);

        const hit = this.add.rectangle(106, 24, 180, 24, 0x000000, 0.001);
        hit.setInteractive({ useHandCursor: true });
        speechC.add(hit);

        hit.on("pointerdown", () => {
            SoundFX.playClick();
            this.tweens.add({
                targets: speechC,
                alpha: 0,
                duration: 250,
                onComplete: () => {
                    speechC.destroy();
                    this.showScientificProtocolModal();
                }
            });
        });
    }

    // =========================================================================
    // STAGE 3: SCIENTIFIC DECISION PROTOCOL (Two Options + Warning Panel)
    // =========================================================================
    private showScientificProtocolModal() {
        this.gameState = "PROTOCOL_QUESTION";
        this.protocolModalContainer = this.add.container(640, 365).setDepth(60);

        const modalW = 760;
        const modalH = 420;

        const bg = this.add.graphics();
        // Dark backdrop tint
        const shade = this.add.rectangle(0, 0, this.W * 2, this.H * 2, 0x000000, 0.75);
        this.protocolModalContainer.add(shade);

        // Main Dialog Plate
        bg.fillStyle(0x131826, 0.98);
        bg.fillRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 14);
        bg.lineStyle(2.5, UITheme.colors.primaryCyan, 1);
        bg.strokeRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 14);
        this.protocolModalContainer.add(bg);

        // Title Header
        const title = this.add.text(0, -modalH / 2 + 28, "🔬 NASA FLUID ENGINEERING PROTOCOL", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "15px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setOrigin(0.5);

        const question = this.add.text(
            0,
            -modalH / 2 + 65,
            "Martian surface pressure is only 610 Pascals (0.6% of Earth's atmosphere).\nHow must melted cryogenic ice be routed to the greenhouse to prevent catastrophic loss?",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11.5px",
                color: "#FFFFFF",
                align: "center",
                lineSpacing: 5
            }
        ).setOrigin(0.5);

        this.protocolModalContainer.add([title, question]);

        // OPTION 1: APT / SCIENTIFICALLY CORRECT SOLUTION
        this.createOptionCard(
            -modalW / 4 - 10,
            30,
            modalW / 2 - 30,
            190,
            "OPTION A: CLOSED PRESSURIZED PIPING",
            "Transport melted ice through sealed, insulated titanium conduits pressurized to 1.2 atm with heating elements to maintain liquid phase flow.",
            true
        );

        // OPTION 2: SCIENTIFIC ERROR / TRAP OPTION
        this.createOptionCard(
            modalW / 4 + 10,
            30,
            modalW / 2 - 30,
            190,
            "OPTION B: OPEN SURFACE GRAVITY DITCHES",
            "Dig unsealed surface trenches to allow natural capillary flow, cooling the water via direct exposure to the cold ambient Martian atmosphere.",
            false
        );
    }

    private createOptionCard(
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
        cardBg.fillStyle(0x1B2335, 1);
        cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
        cardBg.lineStyle(1.5, UITheme.colors.panelBorder, 1);
        cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        c.add(cardBg);

        const optTitle = this.add.text(0, -h / 2 + 24, title, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: w - 24 }
        }).setOrigin(0.5);

        const optDesc = this.add.text(0, 10, desc, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: "#CFD8DC",
            align: "center",
            wordWrap: { width: w - 28 },
            lineSpacing: 4
        }).setOrigin(0.5);

        // Select CTA Pill Button
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
            cardBg.fillStyle(0x1B2335, 1);
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

        const warnC = this.add.container(0, 0).setDepth(80);
        this.protocolModalContainer.add(warnC);

        const w = 640;
        const h = 300;

        const bg = this.add.graphics();
        bg.fillStyle(0x1A0A0E, 0.98);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
        bg.lineStyle(3, UITheme.colors.emergencyRed, 1);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
        warnC.add(bg);

        const header = this.add.text(0, -h / 2 + 30, "⚠ SCIENTIFIC PROTOCOL ERROR: FLASH SUBLIMATION", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13.5px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0.5);

        const explanation = this.add.text(
            0,
            -10,
            "NASA Phase Diagram Physics Violation:\n\n" +
            "At Martian atmospheric pressure of 610 Pa (6.1 mbar), water hits its thermodynamic triple point!\n" +
            "In an open trench, liquid water boils at only 0.01°C. Direct exposure to the near-vacuum\n" +
            "causes instantaneous FLASH EVAPORATION (sublimation): 100% of the water boils into vapor\n" +
            "and escapes into space, leaving the greenhouse completely dry and destroying the crop seeds!",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10.5px",
                color: "#FFFFFF",
                align: "center",
                lineSpacing: 4
            }
        ).setOrigin(0.5);

        // Try Again Button
        const retryBtn = this.add.graphics();
        retryBtn.fillStyle(UITheme.colors.emergencyRed, 1);
        retryBtn.fillRoundedRect(-90, h / 2 - 46, 180, 32, 6);

        const retryLabel = this.add.text(0, h / 2 - 30, "RE-EVALUATE PROTOCOL", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);

        warnC.add([header, explanation, retryBtn, retryLabel]);

        const retryHit = this.add.rectangle(0, h / 2 - 30, 180, 32, 0x000000, 0.001);
        retryHit.setInteractive({ useHandCursor: true });
        warnC.add(retryHit);

        retryHit.on("pointerdown", () => {
            SoundFX.playClick();
            warnC.destroy();
        });
    }

    /**
     * CORRECT OPTION SELECTED: Unlocks Equipment Panel & Enters Puzzle Stage
     */
    private handleCorrectProtocolSelected() {
        SoundFX.playToggle(true);
        this.hasEquipments = true;

        // Dismiss Modal with Success animation
        this.tweens.add({
            targets: this.protocolModalContainer,
            scale: 0.9,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                this.protocolModalContainer.destroy();

                // Unlock the Top Equipment Panel with glowing animation
                this.unlockTopEquipments();

                // Shift to Pipe Puzzle stage
                this.gameState = "PUZZLE_ACTIVE";
                this.setActionFeedback("✔ EQUIPMENT UNLOCKED! ROTATE TILES TO CONNECT WATER PIPELINE.", true);
            }
        });
    }

    // =========================================================================
    // TOP EQUIPMENT PANEL (Displaying Required Tools)
    // =========================================================================
    private createTopEquipmentPanel() {
        this.equipmentPanelContainer = this.add.container(640, 85).setDepth(25);

        const panelW = 920;
        const panelH = 34;

        const bg = this.add.graphics();
        bg.fillStyle(0x0C121D, 0.95);
        bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        bg.lineStyle(1.5, 0x223048, 1);
        bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        this.equipmentPanelContainer.add(bg);

        // Label
        const title = this.add.text(-panelW / 2 + 16, 0, "TOOLKIT:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0, 0.5);
        this.equipmentPanelContainer.add(title);

        // 3 Equipment Slots
        this.drawEquipmentSlots(false);
    }

    private drawEquipmentSlots(isUnlocked: boolean) {
        const slotData = [
            { icon: "🔧", name: "TITANIUM PIPE WRENCH" },
            { icon: "🧲", name: "CRYO-PRESSURE SEALS" },
            { icon: "📡", name: "FLUID LOGIC KEY" }
        ];

        const panelW = 920;
        const startX = -panelW / 2 + 110;
        const spacing = 260;

        for (let i = 0; i < 3; i++) {
            const sx = startX + i * spacing;
            const item = slotData[i];

            const slotG = this.add.graphics();
            slotG.fillStyle(isUnlocked ? 0x142B36 : 0x121622, 1);
            slotG.fillRoundedRect(sx, -13, 240, 26, 4);
            slotG.lineStyle(1, isUnlocked ? UITheme.colors.primaryCyan : 0x2B3548, 1);
            slotG.strokeRoundedRect(sx, -13, 240, 26, 4);
            this.equipmentPanelContainer.add(slotG);

            const status = isUnlocked ? "✔ EQUIPPED" : "🔒 LOCKED";
            const statusColor = isUnlocked ? UITheme.colors.bioGreenStr : UITheme.colors.textSecondary;

            const text = this.add.text(sx + 10, 0, `${item.icon} ${item.name}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "9px",
                color: isUnlocked ? "#FFFFFF" : UITheme.colors.textSecondary,
                fontStyle: "bold"
            }).setOrigin(0, 0.5);

            const tag = this.add.text(sx + 230, 0, status, {
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

        const panelW = 920;
        const panelH = 34;

        const bg = this.add.graphics();
        bg.fillStyle(0x0C1C29, 0.98);
        bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        bg.lineStyle(2, UITheme.colors.primaryCyan, 1);
        bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 6);
        this.equipmentPanelContainer.add(bg);

        const title = this.add.text(-panelW / 2 + 16, 0, "TOOLKIT:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.bioGreenStr,
            fontStyle: "bold"
        }).setOrigin(0, 0.5);
        this.equipmentPanelContainer.add(title);

        this.drawEquipmentSlots(true);

        // Flash tween
        this.tweens.add({
            targets: this.equipmentPanelContainer,
            scaleY: 1.15,
            duration: 180,
            yoyo: true
        });
    }

    // =========================================================================
    // STAGE 4: AMONG US PIPE TASK CONSOLE (The Rotating Grid Puzzle)
    // =========================================================================
    private createTaskConsole() {
        const consoleX = 640;
        const consoleY = 385;
        const consoleW = 920;
        const consoleH = 480;

        this.taskConsoleContainer = this.add.container(0, 0).setDepth(10);

        const consoleG = this.add.graphics();

        // Heavy Outer Slate Bezel with Among Us style black outline
        consoleG.fillStyle(0x1B1F2A, 1);
        consoleG.fillRoundedRect(consoleX - consoleW / 2, consoleY - consoleH / 2, consoleW, consoleH, 16);
        consoleG.lineStyle(5, 0x0E1118, 1);
        consoleG.strokeRoundedRect(consoleX - consoleW / 2, consoleY - consoleH / 2, consoleW, consoleH, 16);

        // Subtle inner metallic bevel
        consoleG.lineStyle(2, 0x364056, 1);
        consoleG.strokeRoundedRect(consoleX - consoleW / 2 + 6, consoleY - consoleH / 2 + 6, consoleW - 12, consoleH - 12, 12);

        // Industrial corner bolts
        const boltOffsets = [
            [-consoleW / 2 + 18, -consoleH / 2 + 18],
            [consoleW / 2 - 18, -consoleH / 2 + 18],
            [-consoleW / 2 + 18, consoleH / 2 - 18],
            [consoleW / 2 - 18, consoleH / 2 - 18]
        ];
        consoleG.fillStyle(0x4C5975, 1);
        for (const [bx, by] of boltOffsets) {
            consoleG.fillCircle(consoleX + bx, consoleY + by, 6);
            consoleG.lineStyle(1.5, 0x1A212E, 1);
            consoleG.lineBetween(consoleX + bx - 4, consoleY + by, consoleX + bx + 4, consoleY + by);
        }
        this.taskConsoleContainer.add(consoleG);

        // Header Bar
        this.createConsoleHeader(consoleX, consoleY - consoleH / 2 + 35, consoleW - 40);

        // Left Section: Subterranean Melted Ice Tank
        this.createWaterTank(280, 405);

        // Center Section: 3x3 Pipe Grid
        this.createPipeGrid(580, 405);

        // Right Section: Hydroponic Space-Tomato Pods
        this.createTomatoPods(880, 405);

        // Connecting Gantry Tubes
        this.gardenTubesGraphic = this.add.graphics().setDepth(12);
        this.drawManifoldTubes(false);

        // Initial Water Flow check
        this.evaluateWaterFlow(false);
    }

    private createConsoleHeader(cx: number, cy: number, w: number) {
        const hG = this.add.graphics().setDepth(14);

        // Header Background plate
        hG.fillStyle(0x131720, 1);
        hG.fillRoundedRect(cx - w / 2, cy - 22, w, 44, 8);
        hG.lineStyle(1.5, 0x2A3345, 1);
        hG.strokeRoundedRect(cx - w / 2, cy - 22, w, 44, 8);

        // Left Tag
        this.add.text(cx - w / 2 + 18, cy, "HYDRO-BAY // SECTOR 01", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0, 0.5).setDepth(15);

        // Center Task Progress Bar (Among Us Green/Grey Task Meter)
        const barW = 340;
        const barH = 18;
        const barX = cx - barW / 2 + 20;

        hG.fillStyle(0x090D14, 1);
        hG.fillRoundedRect(barX, cy - barH / 2, barW, barH, 4);
        hG.lineStyle(1.5, 0x3E4B66, 1);
        hG.strokeRoundedRect(barX, cy - barH / 2, barW, barH, 4);

        this.taskProgressBarFill = this.add.graphics().setDepth(15);

        this.taskProgressLabel = this.add.text(cx + 20, cy, "TASK: IRRIGATE GREENHOUSE PODS (0%)", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9.5px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(16);

        // Right Status Indicator LED
        this.taskStatusLed = this.add.circle(cx + w / 2 - 30, cy, 6, UITheme.colors.emergencyRed).setDepth(15);
        this.tweens.add({
            targets: this.taskStatusLed,
            alpha: 0.3,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        this.add.text(cx + w / 2 - 45, cy, "FLOW:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.textSecondary,
            fontStyle: "bold"
        }).setOrigin(1, 0.5).setDepth(15);

        this.updateTaskProgressBar(0);
    }

    private createWaterTank(x: number, y: number) {
        const c = this.add.container(x, y).setDepth(13);

        const tankW = 120;
        const tankH = 290;

        const g = this.add.graphics();
        g.fillStyle(0x0C121D, 0.95);
        g.fillRoundedRect(-tankW / 2, -tankH / 2, tankW, tankH, 12);
        g.lineStyle(3, 0x243248, 1);
        g.strokeRoundedRect(-tankW / 2, -tankH / 2, tankW, tankH, 12);

        this.tankWaterLevel = this.add.graphics();
        this.tankWaterLevel.fillStyle(0x00B0FF, 0.7);
        this.tankWaterLevel.fillRoundedRect(-tankW / 2 + 8, -tankH / 2 + 30, tankW - 16, tankH - 60, 8);
        this.tankWaterLevel.lineStyle(1.5, 0x80D8FF, 0.9);
        this.tankWaterLevel.strokeRoundedRect(-tankW / 2 + 8, -tankH / 2 + 30, tankW - 16, tankH - 60, 8);
        c.add(this.tankWaterLevel);

        // Rising Bubbles
        for (let i = 0; i < 6; i++) {
            const b = this.add.circle(
                Phaser.Math.Between(-tankW / 2 + 20, tankW / 2 - 20),
                Phaser.Math.Between(-tankH / 2 + 40, tankH / 2 - 40),
                Phaser.Math.Between(3, 6),
                0xFFFFFF,
                0.7
            );
            c.add(b);
            this.tweens.add({
                targets: b,
                y: -tankH / 2 + 35,
                alpha: 0.1,
                duration: Phaser.Math.Between(1600, 2600),
                repeat: -1,
                delay: i * 350
            });
        }

        // Metal Collars
        g.fillStyle(0x2A364C, 1);
        g.fillRoundedRect(-tankW / 2 - 6, -tankH / 2 - 8, tankW + 12, 28, 6);
        g.fillRoundedRect(-tankW / 2 - 6, tankH / 2 - 20, tankW + 12, 28, 6);

        // Pressure Dial
        g.fillStyle(0x1B2332, 1);
        g.fillCircle(0, -tankH / 2 + 65, 22);
        g.lineStyle(2, 0x00E5FF, 1);
        g.strokeCircle(0, -tankH / 2 + 65, 22);

        g.lineStyle(2, 0x00E676, 1);
        g.lineBetween(0, -tankH / 2 + 65, 12, -tankH / 2 + 55);

        c.add(g);

        const lbl1 = this.add.text(0, -tankH / 2 + 105, "MELTED ICE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);

        const lbl2 = this.add.text(0, -tankH / 2 + 120, "CRYO-H2O (100%)", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        const nozzle = this.add.graphics();
        nozzle.fillStyle(0x3B4A63, 1);
        nozzle.fillRoundedRect(tankW / 2 - 2, -12, 24, 24, 4);
        nozzle.lineStyle(2, 0x00E5FF, 1);
        nozzle.strokeRoundedRect(tankW / 2 - 2, -12, 24, 24, 4);
        c.add([lbl1, lbl2, nozzle]);

        const arrow = this.add.text(tankW / 2 + 8, 0, "▶", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        c.add(arrow);
        this.tweens.add({
            targets: arrow,
            x: tankW / 2 + 14,
            duration: 400,
            yoyo: true,
            repeat: -1
        });
    }

    private createPipeGrid(startX: number, startY: number) {
        const initialSetup: { type: PipeType; rot: number }[][] = [
            [
                { type: "CORNER", rot: 1 },
                { type: "STRAIGHT", rot: 1 },
                { type: "CORNER", rot: 0 }
            ],
            [
                { type: "T_JUNCTION", rot: 3 },
                { type: "T_JUNCTION", rot: 1 },
                { type: "T_JUNCTION", rot: 2 }
            ],
            [
                { type: "CORNER", rot: 0 },
                { type: "STRAIGHT", rot: 1 },
                { type: "CORNER", rot: 3 }
            ]
        ];

        this.grid = [];

        for (let r = 0; r < this.GRID_ROWS; r++) {
            this.grid[r] = [];
            for (let c = 0; c < this.GRID_COLS; c++) {
                const cellX = startX + (c - 1) * (this.TILE_SIZE + this.TILE_GAP);
                const cellY = startY + (r - 1) * (this.TILE_SIZE + this.TILE_GAP);
                const setup = initialSetup[r][c];

                const container = this.add.container(cellX, cellY).setDepth(15);

                const tray = this.add.graphics();
                tray.fillStyle(0x131722, 1);
                tray.fillRoundedRect(-this.TILE_SIZE / 2, -this.TILE_SIZE / 2, this.TILE_SIZE, this.TILE_SIZE, 8);
                tray.lineStyle(2, 0x2A354A, 1);
                tray.strokeRoundedRect(-this.TILE_SIZE / 2, -this.TILE_SIZE / 2, this.TILE_SIZE, this.TILE_SIZE, 8);
                container.add(tray);

                const notches = this.add.graphics();
                notches.fillStyle(0x0C0E14, 1);
                notches.fillRect(-8, -this.TILE_SIZE / 2 - 2, 16, 4);
                notches.fillRect(this.TILE_SIZE / 2 - 2, -8, 4, 16);
                notches.fillRect(-8, this.TILE_SIZE / 2 - 2, 16, 4);
                notches.fillRect(-this.TILE_SIZE / 2 - 2, -8, 4, 16);
                container.add(notches);

                const glowGraphic = this.add.graphics();
                glowGraphic.lineStyle(2.5, UITheme.colors.primaryCyan, 0);
                glowGraphic.strokeRoundedRect(-this.TILE_SIZE / 2 - 2, -this.TILE_SIZE / 2 - 2, this.TILE_SIZE + 4, this.TILE_SIZE + 4, 10);
                container.add(glowGraphic);

                const pipeRotateContainer = this.add.container(0, 0);
                pipeRotateContainer.setAngle(setup.rot * 90);
                container.add(pipeRotateContainer);

                const pipeGraphics = this.add.graphics();
                const waterGraphics = this.add.graphics();
                pipeRotateContainer.add([pipeGraphics, waterGraphics]);

                const hitZone = this.add.rectangle(0, 0, this.TILE_SIZE, this.TILE_SIZE, 0x000000, 0.001);
                hitZone.setInteractive({ useHandCursor: true });
                container.add(hitZone);

                const tileData: PipeTileData = {
                    col: c,
                    row: r,
                    type: setup.type,
                    rot: setup.rot,
                    isPowered: false,
                    container: pipeRotateContainer,
                    pipeGraphics: pipeGraphics,
                    waterGraphics: waterGraphics,
                    glowGraphic: glowGraphic
                };

                this.drawPipeBody(tileData);

                hitZone.on("pointerover", () => {
                    this.tweens.add({ targets: container, scale: 1.05, duration: 120 });
                    glowGraphic.clear();
                    glowGraphic.lineStyle(2.5, UITheme.colors.primaryCyan, 0.9);
                    glowGraphic.strokeRoundedRect(-this.TILE_SIZE / 2 - 2, -this.TILE_SIZE / 2 - 2, this.TILE_SIZE + 4, this.TILE_SIZE + 4, 10);
                });

                hitZone.on("pointerout", () => {
                    this.tweens.add({ targets: container, scale: 1.0, duration: 120 });
                    glowGraphic.clear();
                });

                hitZone.on("pointerdown", () => {
                    if (!this.hasEquipments) {
                        SoundFX.playAlert();
                        this.setActionFeedback("⚠ UNLOCK PLUMBING EQUIPMENT FIRST IN PROTOCOL SELECTION!", false);
                        return;
                    }
                    this.rotateTile(tileData);
                });

                this.grid[r][c] = tileData;
            }
        }
    }

    private drawPipeBody(tile: PipeTileData) {
        const pG = tile.pipeGraphics;
        const wG = tile.waterGraphics;
        const half = this.TILE_SIZE / 2;
        const outerW = 22;
        const innerW = 12;

        pG.clear();
        wG.clear();

        const casingColor = 0x2A374C;
        const casingStroke = 0x0D121B;
        const waterColor = tile.isPowered ? 0x00E5FF : 0x161C26;
        const waterCore = tile.isPowered ? 0xE0F7FA : 0x0D121B;

        if (tile.type === "STRAIGHT") {
            pG.fillStyle(casingColor, 1);
            pG.fillRoundedRect(-half, -outerW / 2, this.TILE_SIZE, outerW, 4);
            pG.lineStyle(2.5, casingStroke, 1);
            pG.strokeRoundedRect(-half, -outerW / 2, this.TILE_SIZE, outerW, 4);

            pG.fillStyle(0x455A75, 1);
            pG.fillRect(-half, -outerW / 2 - 2, 6, outerW + 4);
            pG.fillRect(half - 6, -outerW / 2 - 2, 6, outerW + 4);

            wG.fillStyle(waterColor, 1);
            wG.fillRect(-half, -innerW / 2, this.TILE_SIZE, innerW);
            if (tile.isPowered) {
                wG.fillStyle(waterCore, 0.95);
                wG.fillRect(-half, -2, this.TILE_SIZE, 4);
            }
        } else if (tile.type === "CORNER") {
            pG.fillStyle(casingColor, 1);
            pG.fillRect(-outerW / 2, -half, outerW, half);
            pG.fillRect(0, -outerW / 2, half, outerW);
            pG.fillCircle(0, 0, outerW / 2);

            pG.lineStyle(2.5, casingStroke, 1);
            pG.strokeRect(-outerW / 2, -half, outerW, half);
            pG.strokeRect(0, -outerW / 2, half, outerW);
            pG.strokeCircle(0, 0, outerW / 2);

            pG.fillStyle(0x455A75, 1);
            pG.fillRect(-outerW / 2 - 2, -half, outerW + 4, 6);
            pG.fillRect(half - 6, -outerW / 2 - 2, 6, outerW + 4);

            wG.fillStyle(waterColor, 1);
            wG.fillRect(-innerW / 2, -half, innerW, half);
            wG.fillRect(0, -innerW / 2, half, innerW);
            wG.fillCircle(0, 0, innerW / 2);

            if (tile.isPowered) {
                wG.fillStyle(waterCore, 0.95);
                wG.fillRect(-2, -half, 4, half);
                wG.fillRect(0, -2, half, 4);
            }
        } else if (tile.type === "T_JUNCTION") {
            pG.fillStyle(casingColor, 1);
            pG.fillRect(-half, -outerW / 2, this.TILE_SIZE, outerW);
            pG.fillRect(-outerW / 2, -half, outerW, half);
            pG.fillCircle(0, 0, outerW / 2);

            pG.lineStyle(2.5, casingStroke, 1);
            pG.strokeRect(-half, -outerW / 2, this.TILE_SIZE, outerW);
            pG.strokeRect(-outerW / 2, -half, outerW, half);

            pG.fillStyle(0x455A75, 1);
            pG.fillRect(-half, -outerW / 2 - 2, 6, outerW + 4);
            pG.fillRect(half - 6, -outerW / 2 - 2, 6, outerW + 4);
            pG.fillRect(-outerW / 2 - 2, -half, outerW + 4, 6);

            wG.fillStyle(waterColor, 1);
            wG.fillRect(-half, -innerW / 2, this.TILE_SIZE, innerW);
            wG.fillRect(-innerW / 2, -half, innerW, half);
            wG.fillCircle(0, 0, innerW / 2);

            if (tile.isPowered) {
                wG.fillStyle(waterCore, 0.95);
                wG.fillRect(-half, -2, this.TILE_SIZE, 4);
                wG.fillRect(-2, -half, 4, half);
            }
        }
    }

    private rotateTile(tile: PipeTileData) {
        if (this.isRotating || this.isCompleted) return;
        this.isRotating = true;

        SoundFX.playClick();

        tile.rot = (tile.rot + 1) % 4;
        const targetAngle = tile.container.angle + 90;

        this.tweens.add({
            targets: tile.container,
            angle: targetAngle,
            duration: 160,
            ease: "Back.easeOut",
            onComplete: () => {
                this.isRotating = false;
                this.evaluateWaterFlow(true);
            }
        });
    }

    private getTileConnections(tile: PipeTileData): number[] {
        let base: number[] = [];
        if (tile.type === "STRAIGHT") {
            base = [3, 1];
        } else if (tile.type === "CORNER") {
            base = [0, 1];
        } else if (tile.type === "T_JUNCTION") {
            base = [3, 0, 1];
        }
        return base.map(d => (d + tile.rot) % 4);
    }

    private evaluateWaterFlow(playEffects = false) {
        for (let r = 0; r < this.GRID_ROWS; r++) {
            for (let c = 0; c < this.GRID_COLS; c++) {
                this.grid[r][c].isPowered = false;
            }
        }

        const startTile = this.grid[1][0];
        const startConnections = this.getTileConnections(startTile);

        const visited: boolean[][] = [
            [false, false, false],
            [false, false, false],
            [false, false, false]
        ];

        let pathCompletesToGarden = false;

        if (startConnections.includes(3)) {
            startTile.isPowered = true;
            visited[1][0] = true;

            const queue: [number, number][] = [[0, 1]];
            const opposite = (dir: number) => (dir + 2) % 4;

            while (queue.length > 0) {
                const [curC, curR] = queue.shift()!;
                const curTile = this.grid[curR][curC];
                const curDirs = this.getTileConnections(curTile);

                const deltas: [number, number][] = [
                    [0, -1],
                    [1, 0],
                    [0, 1],
                    [-1, 0]
                ];

                for (const d of curDirs) {
                    const nextC = curC + deltas[d][0];
                    const nextR = curR + deltas[d][1];

                    if (curC === 2 && curR === 1 && d === 1) {
                        pathCompletesToGarden = true;
                    }

                    if (nextC >= 0 && nextC < this.GRID_COLS && nextR >= 0 && nextR < this.GRID_ROWS) {
                        if (!visited[nextR][nextC]) {
                            const nextTile = this.grid[nextR][nextC];
                            const nextDirs = this.getTileConnections(nextTile);

                            if (nextDirs.includes(opposite(d))) {
                                nextTile.isPowered = true;
                                visited[nextR][nextC] = true;
                                queue.push([nextC, nextR]);
                            }
                        }
                    }
                }
            }
        }

        for (let r = 0; r < this.GRID_ROWS; r++) {
            for (let c = 0; c < this.GRID_COLS; c++) {
                this.drawPipeBody(this.grid[r][c]);
            }
        }

        this.drawManifoldTubes(pathCompletesToGarden);

        if (pathCompletesToGarden) {
            this.isWaterFlowingToGarden = true;
            this.updateTaskProgressBar(1.0);
            if (this.taskStatusLed) this.taskStatusLed.setFillStyle(UITheme.colors.bioGreen);

            if (playEffects && !this.isCompleted) {
                this.celebrateTomatoSprout();
            }
        } else {
            let poweredCount = 0;
            for (let r = 0; r < this.GRID_ROWS; r++) {
                for (let c = 0; c < this.GRID_COLS; c++) {
                    if (this.grid[r][c].isPowered) poweredCount++;
                }
            }
            const partialPct = Math.min(0.85, (poweredCount / 6) * 0.85);
            this.updateTaskProgressBar(partialPct);
            if (this.taskStatusLed) this.taskStatusLed.setFillStyle(UITheme.colors.emergencyRed);
            this.updateVisorProgress(Math.round(partialPct * 100), 100, "%");
        }
    }

    private updateTaskProgressBar(pct: number) {
        const barW = 340;
        const barH = 18;
        const barX = 640 - barW / 2 + 20;
        const barY = 385 - 240 + 35 - barH / 2;

        if (this.taskProgressBarFill) {
            this.taskProgressBarFill.clear();
            this.taskProgressBarFill.fillStyle(pct >= 1.0 ? 0x00E676 : 0x00E5FF, 1);
            this.taskProgressBarFill.fillRoundedRect(barX + 2, barY + 2, Math.max(6, (barW - 4) * pct), barH - 4, 3);
        }

        const pctInt = Math.round(pct * 100);
        if (this.taskProgressLabel) {
            if (pct >= 1.0) {
                this.taskProgressLabel.setText("✔ TASK COMPLETED: WATER FLOW 100%");
                this.taskProgressLabel.setColor("#00E676");
            } else {
                this.taskProgressLabel.setText(`TASK: IRRIGATE GREENHOUSE PODS (${pctInt}%)`);
                this.taskProgressLabel.setColor("#FFFFFF");
            }
        }
    }

    private createTomatoPods(x: number, y: number) {
        this.tomatoPods = [];
        this.tomatoSprites = [];

        const podYs = [-95, 0, 95];

        for (let i = 0; i < 3; i++) {
            const py = y + podYs[i];
            const podC = this.add.container(x, py).setDepth(13);

            const podG = this.add.graphics();
            podG.fillStyle(0x0C1924, 0.95);
            podG.fillRoundedRect(-55, -42, 110, 84, 10);
            podG.lineStyle(2.5, 0x2A3E56, 1);
            podG.strokeRoundedRect(-55, -42, 110, 84, 10);

            podG.fillStyle(0x3E1C12, 1);
            podG.fillRoundedRect(-48, 16, 96, 20, 6);

            podG.lineStyle(1.5, 0x80D8FF, 0.4);
            podG.lineBetween(-44, -32, -18, -32);
            podC.add(podG);

            const tomatoC = this.add.container(0, 15).setDepth(14);
            this.drawSpaceTomato(tomatoC, false);
            podC.add(tomatoC);

            this.tomatoPods.push(podC);
            this.tomatoSprites.push(tomatoC);
        }

        this.add.text(x, y - 160, "🌱 MARTIAN HYDROPONIC BEDS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.bioGreenStr,
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(14);
    }

    private drawSpaceTomato(c: Phaser.GameObjects.Container, isSprouted: boolean) {
        c.removeAll(true);
        const g = this.add.graphics();

        if (!isSprouted) {
            g.fillStyle(0x3B6846, 1);
            g.fillCircle(0, 0, 5);
            g.lineStyle(1.5, 0x00E676, 0.8);
            g.lineBetween(0, 0, 0, -8);
            c.add(g);
            return;
        }

        g.fillStyle(0x00C853, 1);
        g.fillEllipse(-18, -2, 18, 8);
        g.fillEllipse(18, -2, 18, 8);

        g.fillStyle(0xE52538, 1);
        g.fillEllipse(0, -18, 52, 46);

        g.fillStyle(0xFFFFFF, 0.75);
        g.fillEllipse(-12, -26, 14, 8);
        g.fillCircle(-16, -20, 3);

        g.fillStyle(0x00E5FF, 0.9);
        g.fillCircle(12, -14, 3.5);
        g.fillCircle(16, -24, 2.5);
        g.fillCircle(-8, -8, 2.5);

        g.fillStyle(0x111622, 1);
        g.fillEllipse(-8, -18, 8, 11);
        g.fillEllipse(8, -18, 8, 11);

        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(-9, -20, 2.5);
        g.fillCircle(7, -20, 2.5);

        g.fillStyle(0xFF6B8B, 0.7);
        g.fillCircle(-14, -11, 4);
        g.fillCircle(14, -11, 4);

        g.lineStyle(2, 0x111622, 1);
        g.beginPath();
        g.arc(0, -13, 5, 0.2, Math.PI - 0.2, false);
        g.strokePath();

        g.fillStyle(0x00E676, 1);
        g.fillTriangle(0, -42, -14, -36, 14, -36);
        g.fillTriangle(-12, -38, -22, -30, -6, -34);
        g.fillTriangle(12, -38, 22, -30, 6, -34);

        g.fillStyle(0xFFD600, 1);
        g.fillCircle(0, -45, 5);

        c.add(g);
    }

    private drawManifoldTubes(isFlowing: boolean) {
        this.gardenTubesGraphic.clear();

        const exitX = 580 + (this.TILE_SIZE + this.TILE_GAP);
        const exitEdgeX = exitX + this.TILE_SIZE / 2;
        const gardenX = 880 - 55;
        const midY = 405;

        const color = isFlowing ? 0x00E5FF : 0x2A374C;
        const core = isFlowing ? 0xE0F7FA : 0x141A24;

        this.gardenTubesGraphic.lineStyle(16, 0x18202D, 1);
        this.gardenTubesGraphic.lineBetween(exitEdgeX, midY, 775, midY);

        this.gardenTubesGraphic.lineStyle(8, color, 1);
        this.gardenTubesGraphic.lineBetween(exitEdgeX, midY, 775, midY);

        if (isFlowing) {
            this.gardenTubesGraphic.lineStyle(3, core, 1);
            this.gardenTubesGraphic.lineBetween(exitEdgeX, midY, 775, midY);
        }

        this.gardenTubesGraphic.lineStyle(14, 0x18202D, 1);
        this.gardenTubesGraphic.lineBetween(775, 310, 775, 500);

        this.gardenTubesGraphic.lineStyle(7, color, 1);
        this.gardenTubesGraphic.lineBetween(775, 310, 775, 500);

        const podYs = [310, 405, 500];
        for (const py of podYs) {
            this.gardenTubesGraphic.lineStyle(12, 0x18202D, 1);
            this.gardenTubesGraphic.lineBetween(775, py, gardenX, py);

            this.gardenTubesGraphic.lineStyle(6, color, 1);
            this.gardenTubesGraphic.lineBetween(775, py, gardenX, py);

            if (isFlowing) {
                this.gardenTubesGraphic.lineStyle(2, core, 1);
                this.gardenTubesGraphic.lineBetween(775, py, gardenX, py);
            }
        }
    }

    private celebrateTomatoSprout() {
        SoundFX.playToggle(true);

        for (let i = 0; i < 20; i++) {
            const p = this.add.circle(
                720 + Phaser.Math.Between(0, 100),
                405 + Phaser.Math.Between(-100, 100),
                Phaser.Math.Between(3, 7),
                0x00E5FF,
                0.9
            ).setDepth(25);

            this.tweens.add({
                targets: p,
                x: 880,
                alpha: 0,
                duration: Phaser.Math.Between(400, 700),
                onComplete: () => p.destroy()
            });
        }

        this.tomatoSprites.forEach((tomatoC, idx) => {
            this.time.delayedCall(idx * 160, () => {
                this.drawSpaceTomato(tomatoC, true);

                tomatoC.setScale(0);
                this.tweens.add({
                    targets: tomatoC,
                    scaleX: 1.35,
                    scaleY: 1.35,
                    duration: 320,
                    ease: "Back.easeOut",
                    onComplete: () => {
                        this.tweens.add({
                            targets: tomatoC,
                            scaleX: 0.92,
                            scaleY: 1.08,
                            duration: 180,
                            yoyo: true,
                            repeat: 1,
                            onComplete: () => {
                                tomatoC.setScale(1.0);
                            }
                        });
                    }
                });

                for (let s = 0; s < 8; s++) {
                    const spark = this.add.text(
                        880 + Phaser.Math.Between(-30, 30),
                        tomatoC.y + Phaser.Math.Between(-30, 10),
                        "✨",
                        { fontSize: "14px" }
                    ).setOrigin(0.5).setDepth(30);

                    this.tweens.add({
                        targets: spark,
                        y: spark.y - 40,
                        alpha: 0,
                        scaleX: 1.5,
                        scaleY: 1.5,
                        duration: 700,
                        onComplete: () => spark.destroy()
                    });
                }
            });
        });

        this.updateVisorProgress(100, 100, "%");
        this.showSurfaceFloatingText(880, 240, "🍅 SPACE-TOMATOES SPROUTED! +100% FRESH FOOD AUTONOMY!", UITheme.colors.bioGreenStr);

        this.time.delayedCall(450, () => {
            this.createTaskCompletedStamp();
        });
    }

    private createTaskCompletedStamp() {
        this.taskCompleteStamp = this.add.container(640, 385).setDepth(40);
        this.taskCompleteStamp.setScale(2.5);
        this.taskCompleteStamp.setAlpha(0);

        const stampW = 420;
        const stampH = 90;

        const stampG = this.add.graphics();
        stampG.fillStyle(0x00E676, 0.95);
        stampG.fillRoundedRect(-stampW / 2, -stampH / 2, stampW, stampH, 12);
        stampG.lineStyle(4, 0xFFFFFF, 1);
        stampG.strokeRoundedRect(-stampW / 2, -stampH / 2, stampW, stampH, 12);

        stampG.fillStyle(0x00B248, 1);
        stampG.fillRect(-stampW / 2 + 10, -stampH / 2 + 6, 20, stampH - 12);
        stampG.fillRect(stampW / 2 - 30, -stampH / 2 + 6, 20, stampH - 12);
        this.taskCompleteStamp.add(stampG);

        const stampTitle = this.add.text(0, -12, "✔ TASK COMPLETED!", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "24px",
            color: "#051A10",
            fontStyle: "bold",
            letterSpacing: 2
        }).setOrigin(0.5);

        const stampSub = this.add.text(0, 18, "SPACE-TOMATO GREENHOUSE IRRIGATED · FOOD SECURE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#051A10",
            fontStyle: "bold"
        }).setOrigin(0.5);

        this.taskCompleteStamp.add([stampTitle, stampSub]);

        this.tweens.add({
            targets: this.taskCompleteStamp,
            scaleX: 1.0,
            scaleY: 1.0,
            alpha: 1,
            angle: -3,
            duration: 250,
            ease: "Back.easeOut",
            onComplete: () => {
                SoundFX.playToggle(true);
            }
        });
    }

    protected isTargetMet(): boolean {
        return this.isWaterFlowingToGarden && this.hasEquipments;
    }
}

export default Sol1DirtFortressScene;
