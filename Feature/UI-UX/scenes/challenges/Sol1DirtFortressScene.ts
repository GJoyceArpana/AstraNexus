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
            codename: "CRYO-WATER IRRIGATION",
            hazardBadge: "THIRSTY PLANTS ALERT",
            briefing: "Help Cadet! The greenhouse plants are thirsty. Melted ice is ready, but the pipes are disconnected! Answer the science question to get your tools, then rotate the pipes to water the garden and grow giant space-tomatoes!",
            nasaFact: "NASA astronauts grow yummy fresh salads and dwarf tomatoes on the Space Station using special watering tubes!",
            primaryTarget: "Unlock tools and connect water pipes to sprout space-tomatoes.",
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

        // 1. Top Equipment Panel (Simple & vibrant kid-friendly tool bar)
        this.createTopEquipmentPanel();

        // 2. Build Among Us Industrial Task Console (Centered at 640, 385)
        this.createTaskConsole();

        // 3. Stage 1: Main Concept Drought Animation & Warning
        this.startDroughtIntroAnimation();
    }

    // =========================================================================
    // STAGE 1: INTRO DROUGHT ANIMATION (Simple, Big, Vibrant Warning)
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

        // Big, Colorful, Friendly Alert Banner
        this.introAlertBanner = this.add.container(640, 220).setDepth(50);

        const bannerW = 680;
        const bannerH = 86;
        const bG = this.add.graphics();
        bG.fillStyle(0x1F0A0E, 0.96);
        bG.fillRoundedRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH, 16);
        bG.lineStyle(3.5, UITheme.colors.emergencyRed, 1);
        bG.strokeRoundedRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH, 16);
        this.introAlertBanner.add(bG);

        const alertTitle = this.add.text(0, -16, "🚨 HELP! THE SPACE-TOMATOES ARE THIRSTY! 🚨", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "18px",
            color: "#FF5252",
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0.5);

        const alertSub = this.add.text(0, 16, "The water pipes broke! Tap anywhere to help fix them!", {
            fontFamily: "Nunito",
            fontSize: "14px",
            color: "#FFF59D",
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

        // Fast, snappy intro: after 900ms trigger Astronaut Entrance (or click to skip)
        const entryTimer = this.time.delayedCall(900, () => {
            if (this.gameState === "INTRO_DROUGHT") {
                this.triggerAstronautEntry();
            }
        });

        this.introAlertBanner.setSize(bannerW, bannerH);
        this.introAlertBanner.setInteractive({ useHandCursor: true });
        this.introAlertBanner.on("pointerdown", () => {
            entryTimer.remove();
            if (this.gameState === "INTRO_DROUGHT") {
                this.triggerAstronautEntry();
            }
        });
    }

    // =========================================================================
    // STAGE 2: PLAYER ASTRONAUT ENTRANCE & FRIENDLY CALLOUT
    // =========================================================================
    private triggerAstronautEntry() {
        this.gameState = "ASTRONAUT_ENTRY";

        if (this.introAlertBanner) {
            this.tweens.add({
                targets: this.introAlertBanner,
                alpha: 0,
                duration: 300,
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

        // Brisk walking entry tween from off-screen left into the greenhouse
        this.tweens.add({
            targets: this.astronautContainer,
            x: 150,
            duration: 550,
            ease: "Quad.easeOut",
            onComplete: () => {
                this.tweens.add({
                    targets: this.astronautContainer,
                    y: 524,
                    duration: 600,
                    yoyo: true,
                    repeat: -1
                });

                this.showAstronautSpeech();
            }
        });
    }

    private showAstronautSpeech() {
        const speechC = this.add.container(260, 440).setDepth(55);

        const bubbleW = 380;
        const bubbleH = 92;

        const bg = this.add.graphics();
        bg.fillStyle(0x0A1424, 0.98);
        bg.fillRoundedRect(0, -bubbleH / 2, bubbleW, bubbleH, 12);
        bg.lineStyle(2.5, UITheme.colors.primaryCyan, 1);
        bg.strokeRoundedRect(0, -bubbleH / 2, bubbleW, bubbleH, 12);

        // Speech pointer arrow
        bg.fillTriangle(0, 0, -12, 10, 0, 16);
        speechC.add(bg);

        // Friendly text for 8-year-old
        const dialogue = this.add.text(
            18,
            -26,
            "Hey Cadet! Our space garden needs water fast!\nPick the right science gear to fix the pipes!",
            {
                fontFamily: "Nunito",
                fontSize: "13.5px",
                color: "#FFFFFF",
                fontStyle: "bold",
                lineSpacing: 5
            }
        );
        speechC.add(dialogue);

        // Big, Bright "GET YOUR TOOLS!" Button
        const btnBg = this.add.graphics();
        btnBg.fillStyle(0xFFD600, 1);
        btnBg.fillRoundedRect(18, 14, 210, 28, 6);
        speechC.add(btnBg);

        const btnText = this.add.text(123, 28, "🚀 GET YOUR TOOLS! ➔", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: "#050C1A",
            fontStyle: "bold"
        }).setOrigin(0.5);
        speechC.add(btnText);

        const hit = this.add.rectangle(123, 28, 210, 28, 0x000000, 0.001);
        hit.setInteractive({ useHandCursor: true });
        speechC.add(hit);

        hit.on("pointerdown", () => {
            SoundFX.playClick();

            // Smoothly exit the astronaut immediately
            if (this.astronautContainer) {
                this.tweens.killTweensOf(this.astronautContainer);
                this.tweens.add({
                    targets: this.astronautContainer,
                    x: -120,
                    alpha: 0,
                    duration: 400,
                    ease: "Quad.easeIn",
                    onComplete: () => {
                        this.astronautContainer.destroy();
                    }
                });
            }

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
    // STAGE 3: SIMPLE, VIBRANT SCIENCE QUESTION (Two Big Options + Kid Warning)
    // =========================================================================
    private showScientificProtocolModal() {
        this.gameState = "PROTOCOL_QUESTION";
        this.protocolModalContainer = this.add.container(640, 365).setDepth(60);

        const modalW = 780;
        const modalH = 430;

        const bg = this.add.graphics();
        const shade = this.add.rectangle(0, 0, this.W * 2, this.H * 2, 0x000000, 0.75);
        this.protocolModalContainer.add(shade);

        // Main Dialog Plate
        bg.fillStyle(0x131A28, 0.98);
        bg.fillRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 16);
        bg.lineStyle(3, UITheme.colors.primaryCyan, 1);
        bg.strokeRoundedRect(-modalW / 2, -modalH / 2, modalW, modalH, 16);
        this.protocolModalContainer.add(bg);

        // Title Header (Big & Clear)
        const title = this.add.text(0, -modalH / 2 + 32, "🤔 ASTRONAUT SCIENCE QUIZ!", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "20px",
            color: "#00E5FF",
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setOrigin(0.5);

        // Simple, intuitive question for an 8-year-old
        const question = this.add.text(
            0,
            -modalH / 2 + 75,
            "Mars has almost NO AIR! How should we send water to our hungry garden?",
            {
                fontFamily: "Nunito",
                fontSize: "15px",
                color: "#FFFFFF",
                align: "center",
                fontStyle: "bold"
            }
        ).setOrigin(0.5);

        this.protocolModalContainer.add([title, question]);

        // OPTION 1: THE GOOD CHOICE (Sealed Pipes)
        this.createOptionCard(
            -modalW / 4 - 10,
            38,
            modalW / 2 - 32,
            195,
            "🔒 IN SEALED PIPES!",
            "Keep water locked inside strong, cozy pipes so it stays warm and liquid!",
            true
        );

        // OPTION 2: THE SILLY TRAP CHOICE (Open Ditches)
        this.createOptionCard(
            modalW / 4 + 10,
            38,
            modalW / 2 - 32,
            195,
            "🕳️ IN OPEN MUD DITCHES!",
            "Just pour water on the open ground like an outdoor garden puddle!",
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
        const borderColor = isCorrect ? 0x00E676 : 0xFFB300;
        cardBg.fillStyle(0x1B2436, 1);
        cardBg.fillRoundedRect(-w / 2, -h / 2, w, h, 12);
        cardBg.lineStyle(2, borderColor, 0.9);
        cardBg.strokeRoundedRect(-w / 2, -h / 2, w, h, 12);
        c.add(cardBg);

        const optTitle = this.add.text(0, -h / 2 + 28, title, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "15px",
            color: isCorrect ? "#00E676" : "#FFD54F",
            fontStyle: "bold",
            align: "center"
        }).setOrigin(0.5);

        const optDesc = this.add.text(0, 10, desc, {
            fontFamily: "Nunito",
            fontSize: "13px",
            color: "#E0F2F1",
            align: "center",
            wordWrap: { width: w - 30 },
            lineSpacing: 4
        }).setOrigin(0.5);

        // Big, Clear CTA Button
        const btn = this.add.graphics();
        btn.fillStyle(isCorrect ? 0x00E676 : 0xFFB300, 1);
        btn.fillRoundedRect(-85, h / 2 - 40, 170, 30, 8);

        const btnLabel = this.add.text(0, h / 2 - 25, isCorrect ? "CHOOSE THIS! 👍" : "CHOOSE THIS! 🤔", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: "#051A10",
            fontStyle: "bold"
        }).setOrigin(0.5);

        c.add([optTitle, optDesc, btn, btnLabel]);

        const hit = this.add.rectangle(0, 0, w, h, 0x000000, 0.001);
        hit.setInteractive({ useHandCursor: true });
        c.add(hit);

        hit.on("pointerover", () => {
            this.tweens.add({ targets: c, scale: 1.03, duration: 120 });
        });

        hit.on("pointerout", () => {
            this.tweens.add({ targets: c, scale: 1.0, duration: 120 });
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
     * WRONG OPTION: Simple, Fun, 8-Year-Old Friendly Warning Panel
     */
    private showScientificFailureWarning() {
        SoundFX.playAlert();

        const warnC = this.add.container(0, 0).setDepth(80);
        this.protocolModalContainer.add(warnC);

        const w = 660;
        const h = 310;

        const bg = this.add.graphics();
        bg.fillStyle(0x1F0A10, 0.98);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 16);
        bg.lineStyle(3.5, UITheme.colors.emergencyRed, 1);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 16);
        warnC.add(bg);

        const header = this.add.text(0, -h / 2 + 35, "💨 WHOOSH! THE WATER VANISHED!", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "18px",
            color: "#FF5252",
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0.5);

        const explanation = this.add.text(
            0,
            -6,
            "Because Mars air is so super thin, open water boils away into steam\n" +
            "and floats into space in two seconds! Poof! 💨\n\n" +
            "Always keep your water sealed tight inside cozy pipes on Mars!",
            {
                fontFamily: "Nunito",
                fontSize: "14px",
                color: "#FFFFFF",
                align: "center",
                fontStyle: "bold",
                lineSpacing: 6
            }
        ).setOrigin(0.5);

        // Big, Friendly "TRY AGAIN" Button
        const retryBtn = this.add.graphics();
        retryBtn.fillStyle(0xFF5252, 1);
        retryBtn.fillRoundedRect(-95, h / 2 - 50, 190, 36, 8);

        const retryLabel = this.add.text(0, h / 2 - 32, "🔁 LET'S TRY AGAIN!", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);

        warnC.add([header, explanation, retryBtn, retryLabel]);

        const retryHit = this.add.rectangle(0, h / 2 - 32, 190, 36, 0x000000, 0.001);
        retryHit.setInteractive({ useHandCursor: true });
        warnC.add(retryHit);

        retryHit.on("pointerdown", () => {
            SoundFX.playClick();
            warnC.destroy();
        });
    }

    /**
     * CORRECT OPTION: Unlocks Equipment Panel & Enters Puzzle Stage
     */
    private handleCorrectProtocolSelected() {
        SoundFX.playToggle(true);
        this.hasEquipments = true;

        if (this.astronautContainer) {
            this.tweens.killTweensOf(this.astronautContainer);
            this.astronautContainer.destroy();
        }

        // Dismiss Modal with Success animation
        this.tweens.add({
            targets: this.protocolModalContainer,
            scale: 0.9,
            alpha: 0,
            duration: 300,
            onComplete: () => {
                this.protocolModalContainer.destroy();
                this.unlockTopEquipments();
                this.gameState = "PUZZLE_ACTIVE";
                this.setActionFeedback("🎉 TOOLS READY! CLICK THE PIPES TO CONNECT THE WATER!", true);
            }
        });
    }

    // =========================================================================
    // TOP EQUIPMENT PANEL (Large, Clear, Vibrant Badges)
    // =========================================================================
    private createTopEquipmentPanel() {
        this.equipmentPanelContainer = this.add.container(640, 88).setDepth(25);

        const panelW = 920;
        const panelH = 40;

        const bg = this.add.graphics();
        bg.fillStyle(0x0C1422, 0.96);
        bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 8);
        bg.lineStyle(2, 0x24354F, 1);
        bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 8);
        this.equipmentPanelContainer.add(bg);

        const title = this.add.text(-panelW / 2 + 16, 0, "🎒 YOUR TOOLS:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: "#FFD600",
            fontStyle: "bold"
        }).setOrigin(0, 0.5);
        this.equipmentPanelContainer.add(title);

        this.drawEquipmentSlots(false);
    }

    private drawEquipmentSlots(isUnlocked: boolean) {
        const slotData = [
            { icon: "🔧", name: "Super Wrench" },
            { icon: "🧲", name: "Pipe Tape" },
            { icon: "💧", name: "Water Valve" }
        ];

        const panelW = 920;
        const startX = -panelW / 2 + 150;
        const spacing = 250;

        for (let i = 0; i < 3; i++) {
            const sx = startX + i * spacing;
            const item = slotData[i];

            const slotG = this.add.graphics();
            slotG.fillStyle(isUnlocked ? 0x113328 : 0x141A28, 1);
            slotG.fillRoundedRect(sx, -15, 230, 30, 6);
            slotG.lineStyle(1.5, isUnlocked ? 0x00E676 : 0x2B384F, 1);
            slotG.strokeRoundedRect(sx, -15, 230, 30, 6);
            this.equipmentPanelContainer.add(slotG);

            const status = isUnlocked ? "⭐ READY!" : "🔒 LOCKED";
            const statusColor = isUnlocked ? "#00E676" : "#78909C";

            const text = this.add.text(sx + 10, 0, `${item.icon} ${item.name}`, {
                fontFamily: "Nunito",
                fontSize: "12px",
                color: isUnlocked ? "#FFFFFF" : "#90A4AE",
                fontStyle: "bold"
            }).setOrigin(0, 0.5);

            const tag = this.add.text(sx + 220, 0, status, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: statusColor,
                fontStyle: "bold"
            }).setOrigin(1, 0.5);

            this.equipmentPanelContainer.add([text, tag]);
        }
    }

    private unlockTopEquipments() {
        this.equipmentPanelContainer.removeAll(true);

        const panelW = 920;
        const panelH = 40;

        const bg = this.add.graphics();
        bg.fillStyle(0x0C251C, 0.98);
        bg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 8);
        bg.lineStyle(2.5, 0x00E676, 1);
        bg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 8);
        this.equipmentPanelContainer.add(bg);

        const title = this.add.text(-panelW / 2 + 16, 0, "🎒 YOUR TOOLS:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: "#00E676",
            fontStyle: "bold"
        }).setOrigin(0, 0.5);
        this.equipmentPanelContainer.add(title);

        this.drawEquipmentSlots(true);

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

        // Left Tag: Simple & Friendly
        this.add.text(cx - w / 2 + 18, cy, "🌱 TOMATO GREENHOUSE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12.5px",
            color: "#FFD600",
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0, 0.5).setDepth(15);

        // Center Task Progress Bar (Among Us Green/Grey Task Meter)
        const barW = 340;
        const barH = 22;
        const barX = cx - barW / 2 + 20;

        hG.fillStyle(0x090D14, 1);
        hG.fillRoundedRect(barX, cy - barH / 2, barW, barH, 5);
        hG.lineStyle(1.5, 0x3E4B66, 1);
        hG.strokeRoundedRect(barX, cy - barH / 2, barW, barH, 5);

        this.taskProgressBarFill = this.add.graphics().setDepth(15);

        this.taskProgressLabel = this.add.text(cx + 20, cy, "TASK: WATER THE TOMATOES (0%)", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(16);

        // Right Status Indicator LED
        this.taskStatusLed = this.add.circle(cx + w / 2 - 26, cy, 7, UITheme.colors.emergencyRed).setDepth(15);
        this.tweens.add({
            targets: this.taskStatusLed,
            alpha: 0.3,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        this.add.text(cx + w / 2 - 42, cy, "WATER:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#FFFFFF",
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

        const lbl1 = this.add.text(0, -tankH / 2 + 105, "🧊 MELTED ICE", {
            fontFamily: "Nunito",
            fontSize: "12px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);

        const lbl2 = this.add.text(0, -tankH / 2 + 124, "💧 FRESH WATER", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: "#00E5FF",
            fontStyle: "bold"
        }).setOrigin(0.5);

        const nozzle = this.add.graphics();
        nozzle.fillStyle(0x3B4A63, 1);
        nozzle.fillRoundedRect(tankW / 2 - 2, -12, 24, 24, 4);
        nozzle.lineStyle(2, 0x00E5FF, 1);
        nozzle.strokeRoundedRect(tankW / 2 - 2, -12, 24, 24, 4);
        c.add([lbl1, lbl2, nozzle]);

        const arrow = this.add.text(tankW / 2 + 10, 0, "▶▶", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: "#00E5FF",
            fontStyle: "bold"
        }).setOrigin(0.5);
        c.add(arrow);
        this.tweens.add({
            targets: arrow,
            x: tankW / 2 + 16,
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
                        this.setActionFeedback("⚠ GET YOUR TOOLS FIRST BY ANSWERING THE QUESTION!", false);
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
        const outerW = 24;
        const innerW = 14;

        pG.clear();
        wG.clear();

        const casingColor = 0x2A374C;
        const casingStroke = 0x0D121B;
        const waterColor = tile.isPowered ? 0x00E5FF : 0x161C26;
        const waterCore = tile.isPowered ? 0xFFFFFF : 0x0D121B;

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
        const barH = 22;
        const barX = 640 - barW / 2 + 20;
        const barY = 385 - 240 + 35 - barH / 2;

        if (this.taskProgressBarFill) {
            this.taskProgressBarFill.clear();
            this.taskProgressBarFill.fillStyle(pct >= 1.0 ? 0x00E676 : 0x00E5FF, 1);
            this.taskProgressBarFill.fillRoundedRect(barX + 2, barY + 2, Math.max(6, (barW - 4) * pct), barH - 4, 4);
        }

        const pctInt = Math.round(pct * 100);
        if (this.taskProgressLabel) {
            if (pct >= 1.0) {
                this.taskProgressLabel.setText("🎉 TASK COMPLETE: WATER IS FLOWING! (100%)");
                this.taskProgressLabel.setColor("#00E676");
            } else {
                this.taskProgressLabel.setText(`TASK: WATER THE TOMATOES (${pctInt}%)`);
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

            // Rich Mars Hydroponic Soil Base
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

        this.add.text(x, y - 160, "🍅 SPACE-TOMATO PODS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: "#00E676",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(14);
    }

    private drawSpaceTomato(c: Phaser.GameObjects.Container, isSprouted: boolean) {
        c.removeAll(true);
        const g = this.add.graphics();

        if (!isSprouted) {
            // Dormant seed with little sprout
            g.fillStyle(0x3B6846, 1);
            g.fillCircle(0, 0, 6);
            g.lineStyle(2, 0x00E676, 0.9);
            g.lineBetween(0, 0, 0, -10);
            c.add(g);
            return;
        }

        // GIANT CUTE CARTOON ALIEN SPACE-TOMATO
        g.fillStyle(0x00C853, 1);
        g.fillEllipse(-20, -2, 20, 9);
        g.fillEllipse(20, -2, 20, 9);

        // Body
        g.fillStyle(0xF42B42, 1);
        g.fillEllipse(0, -20, 56, 50);

        // Specular Shine
        g.fillStyle(0xFFFFFF, 0.8);
        g.fillEllipse(-14, -28, 16, 9);
        g.fillCircle(-18, -22, 3.5);

        // Glowing Bioluminescent Spots
        g.fillStyle(0x00E5FF, 0.95);
        g.fillCircle(14, -16, 4);
        g.fillCircle(18, -26, 3);
        g.fillCircle(-10, -10, 3);

        // Big Cartoon Expressive Eyes
        g.fillStyle(0x111622, 1);
        g.fillEllipse(-9, -20, 9, 12);
        g.fillEllipse(9, -20, 9, 12);

        // Eye Sparkles
        g.fillStyle(0xFFFFFF, 1);
        g.fillCircle(-10, -22, 3);
        g.fillCircle(8, -22, 3);

        // Blushing Cheeks
        g.fillStyle(0xFF6B8B, 0.8);
        g.fillCircle(-16, -12, 4.5);
        g.fillCircle(16, -12, 4.5);

        // Smiling Mouth
        g.lineStyle(2.5, 0x111622, 1);
        g.beginPath();
        g.arc(0, -14, 6, 0.2, Math.PI - 0.2, false);
        g.strokePath();

        // Curly Green Antenna Crown
        g.fillStyle(0x00E676, 1);
        g.fillTriangle(0, -46, -16, -39, 16, -39);
        g.fillTriangle(-14, -42, -24, -32, -8, -37);
        g.fillTriangle(14, -42, 24, -32, 8, -37);

        // Golden Star Flower
        g.fillStyle(0xFFD600, 1);
        g.fillCircle(0, -49, 6);

        c.add(g);
    }

    private drawManifoldTubes(isFlowing: boolean) {
        this.gardenTubesGraphic.clear();

        const exitX = 580 + (this.TILE_SIZE + this.TILE_GAP);
        const exitEdgeX = exitX + this.TILE_SIZE / 2;
        const gardenX = 880 - 55;
        const midY = 405;

        const color = isFlowing ? 0x00E5FF : 0x2A374C;
        const core = isFlowing ? 0xFFFFFF : 0x141A24;

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
                        { fontSize: "16px" }
                    ).setOrigin(0.5).setDepth(30);

                    this.tweens.add({
                        targets: spark,
                        y: spark.y - 45,
                        alpha: 0,
                        scaleX: 1.6,
                        scaleY: 1.6,
                        duration: 700,
                        onComplete: () => spark.destroy()
                    });
                }
            });
        });

        this.updateVisorProgress(100, 100, "%");
        this.showSurfaceFloatingText(880, 240, "🍅 YUM! SPACE-TOMATOES SPROUTED! YOU DID IT!", UITheme.colors.bioGreenStr);

        this.time.delayedCall(450, () => {
            this.createTaskCompletedStamp();
        });
    }

    private createTaskCompletedStamp() {
        this.taskCompleteStamp = this.add.container(640, 385).setDepth(40);
        this.taskCompleteStamp.setScale(2.5);
        this.taskCompleteStamp.setAlpha(0);

        const stampW = 440;
        const stampH = 92;

        const stampG = this.add.graphics();
        stampG.fillStyle(0x00E676, 0.96);
        stampG.fillRoundedRect(-stampW / 2, -stampH / 2, stampW, stampH, 14);
        stampG.lineStyle(4, 0xFFFFFF, 1);
        stampG.strokeRoundedRect(-stampW / 2, -stampH / 2, stampW, stampH, 14);

        stampG.fillStyle(0x00B248, 1);
        stampG.fillRect(-stampW / 2 + 10, -stampH / 2 + 6, 20, stampH - 12);
        stampG.fillRect(stampW / 2 - 30, -stampH / 2 + 6, 20, stampH - 12);
        this.taskCompleteStamp.add(stampG);

        const stampTitle = this.add.text(0, -14, "⭐ TASK COMPLETED! ⭐", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "24px",
            color: "#051A10",
            fontStyle: "bold",
            letterSpacing: 2
        }).setOrigin(0.5);

        const stampSub = this.add.text(0, 18, "🍅 YUMMY SPACE-TOMATOES HARVESTED! 🍅", {
            fontFamily: "Nunito",
            fontSize: "14px",
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
