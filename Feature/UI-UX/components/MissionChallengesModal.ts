import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "./ButtonFactory.ts";

export interface MissionChallengeCallbacks {
    onClose: () => void;
    onChallengeAction?: (actionId: string, payload?: any) => void;
    onAdvanceSol?: (nextSol: number) => void;
}

export interface SolChallengeDetail {
    solNumber: number;
    title: string;
    codename: string;
    icon: string;
    hazardBadge: string;
    briefing: string;
    nasaFact: string;
    primaryTarget: string;
    progressMetric: string;
    currentVal: number;
    targetVal: number;
    unit: string;
    actionButtonText: string;
    secondaryActionText?: string;
}

/** Shared modal frame size (the frame is drawn in init(); Sol 3 & Sol 4 lay themselves out inside it). */
const MODAL_W = 1160;
const MODAL_H = 640;
/** Tabs occupy frameY+70 .. frameY+110, so custom Sol briefing areas start below them. */
const SOL4_AREA_TOP = 120;
const SOL4_AREA_BOTTOM_MARGIN = 16;
const SOL4_AREA_SIDE_MARGIN = 16;

type PreviewCmdId = "FORWARD" | "LEFT" | "RIGHT" | "STOP" | "CAPTURE" | "SAMPLE";

export class MissionChallengesModal {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private callbacks: MissionChallengeCallbacks;

    private currentSolTab: number = 1;
    private activeSolData: Record<number, { currentVal: number; completed: boolean }> = {
        1: { currentVal: 0, completed: false },    // 0% water flow
        2: { currentVal: 0, completed: false },    // 0% perchlorate in cabin
        3: { currentVal: 0, completed: false },    // 0 / 3 signal mission stages
        4: { currentVal: 1, completed: false },    // ISRU systems active
        5: { currentVal: 2, completed: false },    // 2 commands queued
    };

    private contentContainer!: Phaser.GameObjects.Container;
    private tabButtons: Phaser.GameObjects.Container[] = [];
    private fullscreenText?: Phaser.GameObjects.Text;

    // Sol 3 interactive preview state
    private sol3PreviewQueue: PreviewCmdId[] = ["FORWARD", "FORWARD", "RIGHT", "CAPTURE", "SAMPLE"];
    private sol3Tweens: Phaser.Tweens.Tween[] = [];

    // Sol 4 briefing state
    private sol4WeatherTitle?: Phaser.GameObjects.Text;
    private sol4WeatherDetail?: Phaser.GameObjects.Text;
    private sol4WeatherRequested = false;
    private sol4WeatherStatus: { detail: string; color: string } = { detail: "Loading NASA data...", color: "#d8efff" };
    private sol4WeatherAbort?: AbortController;
    private sol4Tweens: Phaser.Tweens.Tween[] = [];
    private isClosed = false;

    private readonly challenges: Record<number, SolChallengeDetail> = {
        1: {
            solNumber: 1,
            title: "SOL 1: SPACE-TOMATO GREENHOUSE",
            codename: "WATER THE GARDEN",
            icon: "🍅",
            hazardBadge: "THIRSTY PLANTS ALERT",
            briefing: "Help Cadet! Our space garden is thirsty! Melted ice is ready, but the pipes are disconnected. Connect the pipes to water the plants and sprout yummy space-tomatoes!",
            nasaFact: "NASA astronauts grow yummy fresh salads and cherry tomatoes on the Space Station!",
            primaryTarget: "Rotate pipes to water the garden and sprout tomatoes.",
            progressMetric: "Water Flow",
            currentVal: 0,
            targetVal: 100,
            unit: "%",
            actionButtonText: "🍅 ENTER GREENHOUSE PUZZLE ➔",
            secondaryActionText: "🌱 VIEW TOMATO GARDEN"
        },
        2: {
            solNumber: 2,
            title: "SOL 2: DUST DEVIL CLEANUP",
            codename: "DUST DEVIL CLEANUP",
            icon: "🌪️",
            hazardBadge: "BOUNCY DUST DEVILS",
            briefing: "A playful Martian dust devil covered the solar panels in thick red dust! Use your wind-blower to clean all 4 panels and restore base power before sunset.",
            nasaFact: "Mars dust devils can grow taller than Mount Everest! Blowing air easily lifts the dry dust off solar panels.",
            primaryTarget: "Clean all 4 solar panels with your wind-blower.",
            progressMetric: "Panels Cleaned",
            currentVal: 0,
            targetVal: 4,
            unit: "Panels",
            actionButtonText: "💨 BLAST WIND-BLOWER (SPACE)",
            secondaryActionText: "🛡️ DODGE DUST DEVILS"
        },
        3: {
            solNumber: 3,
            title: "SOL 3: ECHOES FROM MARS",
            codename: "THE SIGNAL MISSION",
            icon: "📡",
            hazardBadge: "INTERPLANETARY SIGNAL DELAY",
            briefing: "Our rover is in a rocky canyon! Link to an orbital relay satellite, plan autonomous rover commands across light-speed delay, collect samples, and transmit data back to the outpost.",
            nasaFact: "Radio signals travel at the speed of light, but Mars is so far away that signals take minutes to arrive—so NASA rovers execute queued commands autonomously!",
            primaryTarget: "Connect orbital relay, navigate canyon, collect samples & transmit data.",
            progressMetric: "Mission Stages",
            currentVal: 0,
            targetVal: 3,
            unit: "Stages",
            actionButtonText: "▶ BEGIN MISSION →",
            secondaryActionText: "🛰️ TEST RELAY SIGNAL"
        },
        4: {
            solNumber: 4,
            title: "SOL 4: AIR, ICE & LED POTATOES",
            codename: "CLOSED-LOOP RESOURCE SEQUENCING",
            icon: "🥔",
            hazardBadge: "OXYGEN & FOOD SUPPLY CRITICAL",
            briefing: "Earth supply drops are months away. Produce oxygen from Mars air, melt buried ice, and grow dwarf potatoes with limited Kilopower electricity.",
            nasaFact: "MOXIE made oxygen from Mars's carbon-dioxide atmosphere at approximately 800°C. Plants still need liquid water before LED light can help them grow.",
            primaryTarget: "Sequence oxygen, water, power, and food production safely.",
            progressMetric: "Mission Completion",
            currentVal: 0,
            targetVal: 1,
            unit: "Mission",
            actionButtonText: "🥔 ENTER AIR, ICE & POTATO MISSION",
            secondaryActionText: "⚡ REVIEW RESOURCE SEQUENCING"
        },
        5: {
            solNumber: 5,
            title: "SOL 5: THE 12-MINUTE SILENCE",
            codename: "SOLAR STORM & COMMS LAG",
            icon: "📡",
            hazardBadge: "CME PROTON FLARE (+85 mSv) & COMMS BLACKOUT",
            briefing: "NASA DONKI space weather reports an X-class solar flare launching an energetic Coronal Mass Ejection (CME) toward Mars. Because radio signals take 12 minutes one-way, you must pre-program autonomous rover actions!",
            nasaFact: "Radio signals between Earth and Mars take 4 to 24 minutes depending on planetary orbits. Mars rovers must execute pre-programmed drive sequences autonomously.",
            primaryTarget: "Shelter crew inside regolith bunker and queue autonomous rover actions.",
            progressMetric: "Command Queue Slots",
            currentVal: 2,
            targetVal: 3,
            unit: "Slots",
            actionButtonText: "🤖 EXECUTE PRE-PROGRAMMED BUFFER",
            secondaryActionText: "🛡️ MOVE CREW TO STORM BUNKER"
        }
    };

    constructor(scene: Phaser.Scene, callbacks: MissionChallengeCallbacks, initialSol: number = 1) {
        this.scene = scene;
        this.callbacks = callbacks;
        this.currentSolTab = Math.max(1, Math.min(5, initialSol));
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(210); // Highest priority modal overlay
        this.init();
        this.scene.scale.on("fullscreenchange", this.updateFullscreenLabel, this);
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        const { width, height } = this.scene.scale;

        // Sync completed status for previously accomplished Sols from registry solLevel
        const registrySol = (this.scene.registry?.get("solLevel") as number) || 1;
        for (let s = 1; s < registrySol; s++) {
            if (this.activeSolData[s]) {
                this.activeSolData[s].completed = true;
                this.activeSolData[s].currentVal = this.challenges[s].targetVal;
            }
        }
        if (this.scene.registry?.get("sol3Completed")) {
            this.activeSolData[3].completed = true;
            this.activeSolData[3].currentVal = this.challenges[3].targetVal;
        }

        // 1. Dimmed Modal Backdrop
        const backdrop = this.scene.add.rectangle(0, 0, width, height, 0x040914, 0.94).setOrigin(0);
        backdrop.setInteractive();
        this.container.add(backdrop);

        // A quiet star field and Mars glow keep the modal connected to the game world.
        const spaceDecor = this.scene.add.graphics();
        spaceDecor.fillStyle(UITheme.colors.marsSky, 0.28);
        spaceDecor.fillCircle(width * 0.14, height * 0.22, Math.min(width, height) * 0.2);
        spaceDecor.fillStyle(UITheme.colors.marsSurface, 0.18);
        spaceDecor.fillCircle(width * 0.88, height * 0.82, Math.min(width, height) * 0.25);
        spaceDecor.fillStyle(0xd8f7ff, 0.8);
        for (let i = 0; i < 42; i += 1) {
            const starX = 18 + ((i * 193) % Math.max(20, width - 36));
            const starY = 16 + ((i * 97) % Math.max(20, height - 32));
            spaceDecor.fillCircle(starX, starY, i % 7 === 0 ? 2 : 1);
        }
        this.container.add(spaceDecor);

        // 2. Main High-Tech Frame (1160 x 640)
        const frameW = MODAL_W;
        const frameH = MODAL_H;
        const frameX = (width - frameW) / 2;
        const frameY = (height - frameH) / 2;

        const frameBg = this.scene.add.graphics();
        frameBg.fillStyle(0x000000, 0.38);
        frameBg.fillRoundedRect(frameX + 8, frameY + 10, frameW, frameH, UITheme.layout.cardRadius + 4);
        frameBg.fillStyle(UITheme.colors.panelBg, 0.98);
        frameBg.fillRoundedRect(frameX, frameY, frameW, frameH, UITheme.layout.cardRadius);
        frameBg.lineStyle(2, UITheme.colors.primaryCyan, 0.9);
        frameBg.strokeRoundedRect(frameX, frameY, frameW, frameH, UITheme.layout.cardRadius);

        // Top Header Accent Bar
        frameBg.fillStyle(0x07549a, 0.72);
        frameBg.fillRoundedRect(frameX, frameY, frameW, 64, { tl: 16, tr: 16, bl: 0, br: 0 });
        frameBg.fillStyle(UITheme.colors.primaryCyan, 0.8);
        frameBg.fillRoundedRect(frameX + 22, frameY + 61, frameW - 44, 3, 2);
        this.container.add(frameBg);

        // Header Title
        const headerTitle = this.scene.add.text(frameX + 24, frameY + 10, "ASTRANEXUS – SOL SURVIVOR", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "21px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 1.5
        });
        this.container.add(headerTitle);
        const headerSubtitle = this.scene.add.text(frameX + 25, frameY + 39, "CHOOSE A MISSION • HELP THE CREW • EARN YOUR STAR", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: "#a9efff",
            fontStyle: "bold",
            letterSpacing: 1
        });
        this.container.add(headerSubtitle);

        // Fullscreen Button (Top-Right, left of Close)
        const fsBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: frameX + frameW - 210,
            y: frameY + 30,
            text: "⛶ FULLSCREEN [F]",
            width: 148,
            height: 36,
            primaryColor: 0x0b2a52,
            secondaryColor: UITheme.colors.primaryCyan,
            textColor: "#a9efff",
            fontSize: "11px",
            onClick: () => {
                SoundFX.playClick();
                if (this.scene.scale.isFullscreen) {
                    this.scene.scale.stopFullscreen();
                } else {
                    this.scene.scale.startFullscreen();
                }
            }
        });
        this.fullscreenText = fsBtn.list.find(c => c instanceof Phaser.GameObjects.Text) as Phaser.GameObjects.Text | undefined;
        this.updateFullscreenLabel();
        this.container.add(fsBtn);

        // Close Button (Top-Right)
        const closeBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: frameX + frameW - 74,
            y: frameY + 30,
            text: "✖ CLOSE",
            width: 100,
            height: 36,
            primaryColor: UITheme.colors.cardHover,
            secondaryColor: UITheme.colors.emergencyRed,
            fontSize: "12px",
            onClick: () => {
                SoundFX.playClick();
                this.close();
            }
        });
        this.container.add(closeBtn);

        // 3. Sol Navigation Carousel Tabs (Sols 1 - 5)
        this.createSolTabs(frameX + 24, frameY + 72, frameW - 48);

        // 4. Dynamic Content Container (re-drawn when switching Sols)
        this.contentContainer = this.scene.add.container(0, 0);
        this.container.add(this.contentContainer);

        // Render Initial Active Sol
        this.renderSolChallenge(this.currentSolTab);

        // Keep the frame usable on smaller laptop windows and fullscreen canvases.
        const modalScale = Math.min(1, (width - 24) / MODAL_W, (height - 24) / MODAL_H);
        const offsetX = (width - width * modalScale) / 2;
        const offsetY = (height - height * modalScale) / 2;
        this.container.setScale(modalScale);
        this.container.setPosition(offsetX, offsetY);
        backdrop.setScale(1 / modalScale);
        backdrop.setPosition(-offsetX / modalScale, -offsetY / modalScale);

        this.scene.tweens.add({
            targets: this.container,
            alpha: { from: 0, to: 1 },
            duration: 180,
            ease: "Quad.easeOut"
        });
    }

    private updateFullscreenLabel() {
        if (!this.fullscreenText || !this.fullscreenText.active) return;
        this.fullscreenText.setText(this.scene.scale.isFullscreen ? "⛶ EXIT FULL [F]" : "⛶ FULLSCREEN [F]");
    }

    /**
     * Renders Sol 1 - Sol 5 interactive navigation buttons
     */
    private createSolTabs(startX: number, y: number, totalWidth: number) {
        const tabCount = 5;
        const tabSpacing = 10;
        const tabW = (totalWidth - (tabSpacing * (tabCount - 1))) / tabCount;
        const tabH = 42;

        for (let i = 1; i <= tabCount; i++) {
            const tabX = startX + (i - 1) * (tabW + tabSpacing) + tabW / 2;
            const isSelected = i === this.currentSolTab;
            const data = this.challenges[i];

            const tabContainer = this.scene.add.container(tabX, y + tabH / 2);

            const bg = this.scene.add.graphics();
            this.drawTabBackground(bg, tabW, tabH, isSelected, false, i === 4, this.activeSolData[i].completed);
            tabContainer.add(bg);

            const label = this.scene.add.text(0, 0, `${this.activeSolData[i].completed ? "✓" : data.icon} SOL ${i}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "14px",
                color: isSelected
                    ? (i === 4 ? "#0E1A32" : "#FFFFFF")
                    : UITheme.colors.textSecondary,
                fontStyle: "bold",
                letterSpacing: 1
            }).setOrigin(0.5);
            tabContainer.add(label);

            tabContainer.setSize(tabW, tabH);
            tabContainer.setInteractive({ useHandCursor: true });

            tabContainer.on("pointerover", () => {
                if (i !== this.currentSolTab) {
                    SoundFX.playHover();
                    this.drawTabBackground(bg, tabW, tabH, false, true);
                }
            });

            tabContainer.on("pointerout", () => {
                if (i !== this.currentSolTab) {
                    this.drawTabBackground(bg, tabW, tabH, false, false);
                }
            });

            tabContainer.on("pointerdown", () => {
                SoundFX.playClick();
                this.selectSolTab(i);
            });

            this.tabButtons.push(tabContainer);
            this.container.add(tabContainer);
        }
    }

    private drawTabBackground(
        g: Phaser.GameObjects.Graphics,
        w: number,
        h: number,
        isSelected: boolean,
        isHovered: boolean = false,
        isSol4: boolean = false,
        isCompleted: boolean = false
    ) {
        g.clear();
        if (isSelected) {
            g.fillStyle(isSol4 ? UITheme.colors.solarGold : (isCompleted ? UITheme.colors.bioGreen : 0x0d528a), 0.96);
            g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
            g.lineStyle(2.5, isSol4 ? UITheme.colors.marsAmber : (isCompleted ? UITheme.colors.bioGreen : UITheme.colors.primaryCyan), 1);
            g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        } else if (isHovered) {
            g.fillStyle(UITheme.colors.cardHover, 0.85);
            g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
            g.lineStyle(1.5, UITheme.colors.marsAmber, 0.9);
            g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        } else {
            g.fillStyle(isCompleted ? 0x124b48 : UITheme.colors.cardBg, 0.78);
            g.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
            g.lineStyle(isCompleted ? 1.5 : 1, isCompleted ? UITheme.colors.bioGreen : UITheme.colors.panelBorder, 0.8);
            g.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        }
    }

    private selectSolTab(sol: number) {
        this.currentSolTab = sol;

        // Redraw all tabs
        this.tabButtons.forEach((tabContainer, idx) => {
            const solNum = idx + 1;
            const bg = tabContainer.getAt(0) as Phaser.GameObjects.Graphics;
            const label = tabContainer.getAt(1) as Phaser.GameObjects.Text;
            const isSelected = solNum === this.currentSolTab;

            this.drawTabBackground(bg, tabContainer.width, tabContainer.height, isSelected, false, solNum === 4, this.activeSolData[solNum].completed);
            label.setText(`${this.activeSolData[solNum].completed ? "✓" : this.challenges[solNum].icon} SOL ${solNum}`);
            label.setColor(isSelected
                ? (solNum === 4 ? "#0E1A32" : "#FFFFFF")
                : (this.activeSolData[solNum].completed ? UITheme.colors.textSuccess : UITheme.colors.textSecondary));
        });

        // Re-render Challenge details
        this.renderSolChallenge(sol);
    }

    /**
     * Renders the full detailed view for the active Sol
     */
    private renderSolChallenge(sol: number) {
        this.clearSol3Tweens();
        this.clearSol4Tweens();
        this.sol4WeatherTitle = undefined;
        this.sol4WeatherDetail = undefined;
        this.contentContainer.removeAll(true);

        if (sol === 3) {
            this.renderSol3Briefing();
            this.animateContentIn();
            return;
        }
        if (sol === 4) {
            this.renderSol4Briefing();
            this.animateContentIn();
            return;
        }

        const { width, height } = this.scene.scale;
        const data = this.challenges[sol];
        const stateRecord = this.activeSolData[sol];

        const frameW = 1160;
        const frameX = (width - frameW) / 2;
        const topY = (height - 640) / 2 + 130;

        // -------------------------------------------------------------
        // LEFT COLUMN: NASA BRIEFING & SCIENCE INSIGHT (Width: 540)
        // -------------------------------------------------------------
        const colW = 545;
        const colH = 470;
        const leftX = frameX + 24;

        const leftBg = this.scene.add.graphics();
        leftBg.fillStyle(0x12356a, 0.9);
        leftBg.fillRoundedRect(leftX, topY, colW, colH, 12);
        leftBg.fillStyle(UITheme.colors.primaryCyan, 0.12);
        leftBg.fillRoundedRect(leftX + 4, topY + 4, colW - 8, 36, 8);
        leftBg.lineStyle(1.5, UITheme.colors.panelBorderGlow, 0.9);
        leftBg.strokeRoundedRect(leftX, topY, colW, colH, 12);
        this.contentContainer.add(leftBg);

        // Title & Codename
        const titleText = this.scene.add.text(leftX + 20, topY + 18, data.title, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "22px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 1.5,
            wordWrap: { width: colW - 40 }
        });
        this.contentContainer.add(titleText);

       

        // Hazard Banner
        const hazardBg = this.scene.add.graphics();
        hazardBg.fillStyle(0x380F16, 0.9);
        hazardBg.fillRoundedRect(leftX + 20, topY + 76, colW - 40, 36, 8);
        hazardBg.lineStyle(1.5, UITheme.colors.emergencyRed, 0.9);
        hazardBg.strokeRoundedRect(leftX + 20, topY + 76, colW - 40, 36, 8);
        this.contentContainer.add(hazardBg);

        const hazardText = this.scene.add.text(leftX + 32, topY + 86, `⚠ HAZARD: ${data.hazardBadge}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold",
            letterSpacing: 0.5,
            wordWrap: { width: colW - 64 }
        });
        this.contentContainer.add(hazardText);

        // Mission Operational Briefing
        const briefHeading = this.scene.add.text(leftX + 20, topY + 128, "✦ OPERATIONAL FLIGHT DIRECTIVE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: UITheme.colors.marsAmberStr,
            fontStyle: "bold",
            letterSpacing: 1
        });
        this.contentContainer.add(briefHeading);

        const briefBody = this.scene.add.text(leftX + 20, topY + 152, data.briefing, {
            fontFamily: UITheme.fonts.body,
            fontSize: "16px",
            color: UITheme.colors.textPrimary,
            lineSpacing: 5,
            wordWrap: { width: colW - 40 }
        });
        this.contentContainer.add(briefBody);

        // NASA Real-World Scientific Context Box
        const nasaBoxY = topY + 285;
        const nasaBox = this.scene.add.graphics();
        nasaBox.fillStyle(0x061426, 0.9);
        nasaBox.fillRoundedRect(leftX + 20, nasaBoxY, colW - 40, 160, 10);
        nasaBox.lineStyle(1, UITheme.colors.primaryCyan, 0.7);
        nasaBox.strokeRoundedRect(leftX + 20, nasaBoxY, colW - 40, 160, 10);
        this.contentContainer.add(nasaBox);

        const nasaHeader = this.scene.add.text(leftX + 36, nasaBoxY + 14, "🛰️ NASA SCIENCE & MISSION ARCHITECTURE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            letterSpacing: 1
        });
        this.contentContainer.add(nasaHeader);

        const nasaFact = this.scene.add.text(leftX + 36, nasaBoxY + 40, data.nasaFact, {
            fontFamily: UITheme.fonts.body,
            fontSize: "13px",
            color: UITheme.colors.textSecondary,
            lineSpacing: 4,
            wordWrap: { width: colW - 72 }
        });
        this.contentContainer.add(nasaFact);

        // -------------------------------------------------------------
        // RIGHT COLUMN: INTERACTIVE CHALLENGE GAUGES & BUTTONS (Width: 540)
        // -------------------------------------------------------------
        const rightX = leftX + colW + 20;

        const rightBg = this.scene.add.graphics();
        rightBg.fillStyle(0x12356a, 0.9);
        rightBg.fillRoundedRect(rightX, topY, colW, colH, 12);
        rightBg.fillStyle(UITheme.colors.marsAmber, 0.12);
        rightBg.fillRoundedRect(rightX + 4, topY + 4, colW - 8, 36, 8);
        rightBg.lineStyle(1.5, UITheme.colors.panelBorderGlow, 0.9);
        rightBg.strokeRoundedRect(rightX, topY, colW, colH, 12);
        this.contentContainer.add(rightBg);

        // Challenge Objectives Header
        const rightTitle = this.scene.add.text(rightX + 20, topY + 18, "MISSION CHALLENGE & CONTROLS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 1.2,
            wordWrap: { width: colW - 40 }
        });
        this.contentContainer.add(rightTitle);

        // Primary Target Card
        const targetCard = this.scene.add.graphics();
        targetCard.fillStyle(0x0E213D, 0.9);
        targetCard.fillRoundedRect(rightX + 20, topY + 52, colW - 40, 78, 10);
        targetCard.lineStyle(1.5, UITheme.colors.solarGold, 0.8);
        targetCard.strokeRoundedRect(rightX + 20, topY + 52, colW - 40, 78, 10);
        this.contentContainer.add(targetCard);

        const targetLabel = this.scene.add.text(rightX + 34, topY + 62, "🎯 PRIMARY SOL OBJECTIVE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
        this.contentContainer.add(targetLabel);

        const targetDesc = this.scene.add.text(rightX + 34, topY + 84, data.primaryTarget, {
            fontFamily: UITheme.fonts.body,
            fontSize: "15px",
            color: "#FFFFFF",
            wordWrap: { width: colW - 70 }
        });
        this.contentContainer.add(targetDesc);

        // Live Progress Gauge
        const gaugeY = topY + 150;
        const progressPct = Math.min(1.0, stateRecord.currentVal / data.targetVal);

        const metricTitle = this.scene.add.text(rightX + 20, gaugeY, `${data.progressMetric.toUpperCase()}: ${stateRecord.currentVal} / ${data.targetVal} ${data.unit}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "15px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        this.contentContainer.add(metricTitle);

        const barW = colW - 40;
        const barH = 22;
        const barX = rightX + 20;

        const barBg = this.scene.add.graphics();
        barBg.fillStyle(0x061122, 0.9);
        barBg.fillRoundedRect(barX, gaugeY + 26, barW, barH, 8);
        barBg.lineStyle(1, UITheme.colors.panelBorder, 0.8);
        barBg.strokeRoundedRect(barX, gaugeY + 26, barW, barH, 8);
        this.contentContainer.add(barBg);

        const barFill = this.scene.add.graphics();
        const fillColor = progressPct >= 1.0 ? UITheme.colors.bioGreen : UITheme.colors.primaryCyan;
        barFill.fillStyle(fillColor, 1);
        barFill.fillRoundedRect(barX + 2, gaugeY + 28, Math.max(8, (barW - 4) * progressPct), barH - 4, 6);
        this.contentContainer.add(barFill);

        // Status Tag
        const statusStr = progressPct >= 1.0 ? "✔ CHALLENGE ACCOMPLISHED" : "⏳ IN PROGRESS";
        const statusColor = progressPct >= 1.0 ? UITheme.colors.bioGreenStr : UITheme.colors.solarGoldStr;
        const statusTag = this.scene.add.text(rightX + colW - 24, gaugeY + 2, statusStr, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: statusColor,
            fontStyle: "bold"
        }).setOrigin(1, 0);
        this.contentContainer.add(statusTag);

        // Interactive Engineering Action Buttons
        const buttonY = topY + 215;

        // 1. Full Dedicated Sol Martian Surface Scene Launch Button (Primary CTA)
        const launchSceneBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: rightX + colW / 2,
            y: buttonY + 24,
            text: sol === 2 ? "🚀 START MISSION ➔" : `🚀 DEPLOY TO SOL 0${sol} MARTIAN SURFACE ➔`,
            width: colW - 40,
            height: 46,
            primaryColor: UITheme.colors.solarGold,
            secondaryColor: 0x1A1406,
            textColor: UITheme.colors.solarGoldStr,
            fontSize: "15px",
            icon: "🚀",
            onClick: () => {
                this.launchSolScene(sol);
            }
        });
        this.contentContainer.add(launchSceneBtn);

        // 2. In-Modal Quick Action Button
        const primaryBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: rightX + colW / 2,
            y: buttonY + 78,
            text: data.actionButtonText,
            width: colW - 40,
            height: 42,
            primaryColor: UITheme.colors.primaryCyan,
            fontSize: "13px",
            onClick: () => {
                SoundFX.playClick();
                this.handlePrimaryAction(sol);
            }
        });
        this.contentContainer.add(primaryBtn);

        // 3. Secondary Action Button (if present)
        if (data.secondaryActionText) {
            const secondaryBtn = ButtonFactory.createButton({
                scene: this.scene,
                x: rightX + colW / 2,
                y: buttonY + 128,
                text: data.secondaryActionText,
                width: colW - 40,
                height: 42,
                primaryColor: UITheme.colors.marsAmber,
                fontSize: "12.5px",
                onClick: () => {
                    SoundFX.playClick();
                    this.handleSecondaryAction(sol);
                }
            });
            this.contentContainer.add(secondaryBtn);
        }

        // 4. Complete & Proceed Button
        const completeBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: rightX + colW / 2,
            y: topY + colH - 36,
            text: progressPct >= 1.0 ? "✦ ADVANCE TO NEXT SOL ✦" : "✦ MARK SOL OBJECTIVE COMPLETE ✦",
            width: colW - 40,
            height: 46,
            primaryColor: progressPct >= 1.0 ? UITheme.colors.bioGreen : UITheme.colors.cardHover,
            secondaryColor: UITheme.colors.solarGold,
            fontSize: "14px",
            onClick: () => {
                SoundFX.playClick();
                this.completeCurrentSol(sol);
            }
        });
        this.contentContainer.add(completeBtn);
        this.animateContentIn();
    }

    private animateContentIn() {
        this.contentContainer.setAlpha(0);
        this.contentContainer.y = 8;
        this.scene.tweens.add({
            targets: this.contentContainer,
            alpha: 1,
            y: 0,
            duration: 220,
            ease: "Quad.easeOut"
        });
    }

    // =====================================================================
    // SOL 3 BRIEFING: ECHOES FROM MARS – THE SIGNAL MISSION
    // Matches the visual reference layout with native Phaser GameObjects:
    // - Left canyon scene: Mars planet, canyon cliffs, outpost, orbital relay
    //   satellite, glowing radio signals, rover, Commander Maya & Bleep,
    //   live ROVER TELEMETRY card, and prominent BEGIN MISSION → button.
    // - Right panel: ESTABLISH THE SIGNAL (3 mission stages) + interactive
    //   ROVER COMMANDS (6 controls) & COMMAND QUEUE (MAX 5).
    // =====================================================================

    private clearSol3Tweens() {
        this.sol3Tweens.forEach(t => t.remove());
        this.sol3Tweens = [];
    }

    private renderSol3Briefing() {
        const { width, height } = this.scene.scale;
        const frameX = (width - MODAL_W) / 2;
        const frameY = (height - MODAL_H) / 2;

        const areaX = frameX + SOL4_AREA_SIDE_MARGIN;
        const areaY = frameY + SOL4_AREA_TOP;
        const W = MODAL_W - SOL4_AREA_SIDE_MARGIN * 2;           // 1128
        const H = MODAL_H - SOL4_AREA_TOP - SOL4_AREA_BOTTOM_MARGIN; // 504

        const root = this.scene.add.container(areaX, areaY);
        this.contentContainer.add(root);

        const leftW = 716;
        const rightX = leftW + 14;
        const rightW = W - rightX;

        // ---------- LEFT CANYON MISSION STAGE ----------
        const leftPanel = this.scene.add.graphics();
        leftPanel.fillStyle(0x091936, 1);
        leftPanel.fillRoundedRect(0, 0, leftW, H, 14);
        leftPanel.lineStyle(2, 0x00e5ff, 0.85);
        leftPanel.strokeRoundedRect(0, 0, leftW, H, 14);
        root.add(leftPanel);

        // Starry space backdrop & Mars planet in upper right of canyon view
        const sky = this.scene.add.graphics();
        sky.fillStyle(0xd8f5ff, 0.75);
        for (let i = 0; i < 36; i++) {
            const sx = 18 + ((i * 151) % (leftW - 36));
            const sy = 14 + ((i * 67) % 190);
            sky.fillCircle(sx, sy, i % 4 === 0 ? 1.8 : 1);
        }
        // Mars sphere behind satellite
        sky.fillStyle(0xc44b2b, 0.92);
        sky.fillCircle(535, 118, 92);
        sky.fillStyle(0xe06a3b, 0.55);
        sky.fillCircle(512, 98, 74);
        sky.fillStyle(0x7c2818, 0.45);
        sky.fillEllipse(555, 142, 70, 36);
        sky.fillCircle(505, 130, 14);
        sky.lineStyle(2, 0xff9a62, 0.35);
        sky.strokeCircle(535, 118, 92);
        root.add(sky);

        // Canyon cliffs & Martian floor
        const canyon = this.scene.add.graphics();
        // Distant mesas
        canyon.fillStyle(0x6e2c26, 0.96);
        canyon.beginPath();
        canyon.moveTo(2, 310);
        canyon.lineTo(130, 232);
        canyon.lineTo(250, 244);
        canyon.lineTo(310, 290);
        canyon.lineTo(435, 290);
        canyon.lineTo(500, 224);
        canyon.lineTo(645, 212);
        canyon.lineTo(leftW - 2, 238);
        canyon.lineTo(leftW - 2, H - 2);
        canyon.lineTo(2, H - 2);
        canyon.closePath();
        canyon.fillPath();

        // Midground canyon terrace
        canyon.fillStyle(0x9e422b, 0.98);
        canyon.beginPath();
        canyon.moveTo(2, 352);
        canyon.lineTo(185, 315);
        canyon.lineTo(370, 342);
        canyon.lineTo(540, 304);
        canyon.lineTo(leftW - 2, 326);
        canyon.lineTo(leftW - 2, H - 2);
        canyon.lineTo(2, H - 2);
        canyon.closePath();
        canyon.fillPath();

        // Foreground rust-orange ground
        canyon.fillStyle(0xc65a34, 1);
        canyon.beginPath();
        canyon.moveTo(2, 412);
        canyon.lineTo(220, 385);
        canyon.lineTo(485, 405);
        canyon.lineTo(leftW - 2, 382);
        canyon.lineTo(leftW - 2, H - 2);
        canyon.lineTo(2, H - 2);
        canyon.closePath();
        canyon.fillPath();

        // Scattered canyon boulders
        canyon.fillStyle(0x7c3021, 1);
        canyon.fillEllipse(248, 396, 36, 16);
        canyon.fillEllipse(466, 384, 52, 22);
        canyon.fillEllipse(654, 424, 44, 18);
        root.add(canyon);

        // Mars Outpost Habitat Dome + Dish (mid-right background)
        const outpost = this.scene.add.graphics();
        outpost.fillStyle(0x52657d, 1);
        outpost.fillRoundedRect(546, 290, 114, 16, 6);
        outpost.fillStyle(0xd9e4f0, 1);
        outpost.beginPath();
        outpost.arc(602, 292, 44, Math.PI, 0, false);
        outpost.closePath();
        outpost.fillPath();
        outpost.lineStyle(2, 0x8fa9c4, 1);
        outpost.beginPath();
        outpost.arc(602, 292, 44, Math.PI, 0, false);
        outpost.strokePath();
        // Outpost comms dish
        outpost.lineStyle(3, 0xc9d9eb, 1);
        outpost.lineBetween(576, 252, 576, 232);
        outpost.strokeCircle(576, 226, 11);
        // NASA blue badge on dome
        outpost.fillStyle(0x1653b8, 1);
        outpost.fillCircle(602, 272, 9);
        root.add(outpost);

        // Orbital Relay Satellite (upper center-right)
        const satGroup = this.scene.add.container(442, 118);
        const satGfx = this.scene.add.graphics();
        // Solar wings
        satGfx.fillStyle(0x1f5ca8, 1);
        satGfx.fillRect(-74, -14, 52, 28);
        satGfx.fillRect(22, -14, 52, 28);
        satGfx.lineStyle(1.5, 0x8be9ff, 0.95);
        satGfx.strokeRect(-74, -14, 52, 28);
        satGfx.strokeRect(22, -14, 52, 28);
        satGfx.lineBetween(-48, -14, -48, 14);
        satGfx.lineBetween(48, -14, 48, 14);
        satGfx.lineBetween(-74, 0, -22, 0);
        satGfx.lineBetween(22, 0, 74, 0);
        // Satellite bus & dish
        satGfx.fillStyle(0xe6eef7, 1);
        satGfx.fillRoundedRect(-18, -18, 36, 36, 6);
        satGfx.lineStyle(2, 0x7c97b5, 1);
        satGfx.strokeRoundedRect(-18, -18, 36, 36, 6);
        satGfx.fillStyle(0xffa726, 1);
        satGfx.fillCircle(0, 0, 8);
        satGfx.lineStyle(2.5, 0x00e5ff, 1);
        satGfx.beginPath();
        satGfx.arc(-18, 22, 14, 0.2, Math.PI * 0.9, false);
        satGfx.strokePath();
        satGroup.add(satGfx);
        satGroup.setAngle(-18);
        root.add(satGroup);

        this.sol3Tweens.push(this.scene.tweens.add({
            targets: satGroup,
            y: 111,
            duration: 2400,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        }));

        // Glowing Cyan Radio Signal Waves (Rover <-> Satellite <-> Outpost)
        const signalWaves = this.scene.add.graphics();
        signalWaves.lineStyle(2.5, 0x00f0ff, 0.9);
        [0, 1, 2].forEach(idx => {
            signalWaves.beginPath();
            signalWaves.arc(386 + idx * 14, 240 - idx * 34, 16 + idx * 4, Math.PI * 1.15, Math.PI * 1.75, false);
            signalWaves.strokePath();
        });
        signalWaves.lineStyle(2, 0x5ef6ff, 0.7);
        for (let d = 0; d < 6; d++) {
            signalWaves.fillStyle(0x5ef6ff, 0.85);
            signalWaves.fillCircle(468 + d * 17, 142 + d * 14, 2.5);
        }
        root.add(signalWaves);

        this.sol3Tweens.push(this.scene.tweens.add({
            targets: signalWaves,
            alpha: 0.35,
            duration: 950,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        }));

        // Mars Rover illustration (or existing "rover" texture)
        const roverContainer = this.scene.add.container(338, 355);
        if (this.scene.textures.exists("rover")) {
            const roverImg = this.scene.add.image(0, 0, "rover");
            roverImg.setScale(Math.min(180 / roverImg.width, 130 / roverImg.height));
            roverContainer.add(roverImg);
        } else {
            const rg = this.scene.add.graphics();
            rg.fillStyle(0xf59e2d, 1);
            rg.fillRoundedRect(-54, -22, 108, 34, 8);
            rg.fillStyle(0xe8eff7, 1);
            rg.fillRoundedRect(-36, -54, 58, 30, 8);
            rg.fillStyle(0x0b2239, 1);
            rg.fillRoundedRect(-28, -48, 42, 18, 5);
            rg.fillStyle(0x283240, 1);
            [-40, 0, 40].forEach(wx => {
                rg.fillCircle(wx, 22, 15);
                rg.lineStyle(2.5, 0xff9f2e, 1);
                rg.strokeCircle(wx, 22, 9);
            });
            roverContainer.add(rg);
        }
        root.add(roverContainer);

        // Title Banner: ECHOES FROM MARS / ((( THE SIGNAL MISSION )))
        const missionTitle = this.scene.add.text(218, 28, "ECHOES FROM MARS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "30px",
            fontStyle: "bold",
            color: "#FFD23F",
            stroke: "#1B1026",
            strokeThickness: 5,
            letterSpacing: 1
        }).setOrigin(0.5);
        root.add(missionTitle);

        const subPill = this.scene.add.graphics();
        subPill.fillStyle(0x07264d, 0.94);
        subPill.fillRoundedRect(96, 52, 244, 28, 14);
        subPill.lineStyle(2, 0x00e5ff, 0.95);
        subPill.strokeRoundedRect(96, 52, 244, 28, 14);
        root.add(subPill);

        const missionSub = this.scene.add.text(218, 66, "(((  THE SIGNAL MISSION  )))", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            fontStyle: "bold",
            color: "#FFFFFF",
            letterSpacing: 1
        }).setOrigin(0.5);
        root.add(missionSub);

        // Commander Maya & Bleep Character Cards + Dialogue Bubbles
        this.createCharacterBubble(root, {
            x: 16,
            y: 94,
            speaker: "Commander Maya",
            badgeColor: 0x0d599e,
            borderColor: 0x00e5ff,
            message: "Our rover is in a rocky canyon! Link to the orbital relay, send the right commands, and collect valuable Mars samples!",
            portraitType: "maya"
        });

        this.createCharacterBubble(root, {
            x: 16,
            y: 222,
            speaker: "Bleep",
            badgeColor: 0x5c369c,
            borderColor: 0xb784ff,
            message: "Radio signals travel at the speed of light, but Mars is far away, so there's a delay. Plan your commands carefully!",
            portraitType: "bleep"
        });

        // Bottom-Left ROVER TELEMETRY Card
        const telemX = 16;
        const telemY = 352;
        const telemW = 248;
        const telemH = 138;

        const telemBg = this.scene.add.graphics();
        telemBg.fillStyle(0x081d3d, 0.95);
        telemBg.fillRoundedRect(telemX, telemY, telemW, telemH, 12);
        telemBg.lineStyle(2, 0x00e5ff, 0.9);
        telemBg.strokeRoundedRect(telemX, telemY, telemW, telemH, 12);
        root.add(telemBg);

        const telemHeader = this.scene.add.text(telemX + 14, telemY + 12, "📶 ROVER TELEMETRY", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            fontStyle: "bold",
            color: "#FFFFFF"
        });
        root.add(telemHeader);

        const isCompleted = this.activeSolData[3].completed;
        const signalBars = this.scene.add.graphics();
        for (let b = 0; b < 5; b++) {
            signalBars.fillStyle(b < (isCompleted ? 5 : 4) ? 0x2ee59d : 0x1e3c66, 1);
            signalBars.fillRoundedRect(telemX + 168 + b * 12, telemY + 52 - b * 3, 8, 8 + b * 3, 2);
        }
        root.add(signalBars);

        const row1 = this.scene.add.text(telemX + 14, telemY + 42, "📡 SIGNAL LINK", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            fontStyle: "bold",
            color: "#A8D5FF"
        });
        const row2 = this.scene.add.text(telemX + 14, telemY + 74, "🤖 ROVER STATUS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            fontStyle: "bold",
            color: "#A8D5FF"
        });
        const statusBadge = this.scene.add.text(telemX + telemW - 14, telemY + 74, isCompleted ? "COMPLETE" : "IDLE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            fontStyle: "bold",
            color: isCompleted ? "#2EE59D" : "#7DE8FF"
        }).setOrigin(1, 0);

        const row3 = this.scene.add.text(telemX + 14, telemY + 106, "📦 DATA PACKETS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            fontStyle: "bold",
            color: "#A8D5FF"
        });
        const packetBadge = this.scene.add.text(telemX + telemW - 14, telemY + 106, isCompleted ? "3 / 3" : "0 / 3", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            fontStyle: "bold",
            color: "#FFFFFF"
        }).setOrigin(1, 0);

        root.add([row1, row2, statusBadge, row3, packetBadge]);

        // Prominent Orange BEGIN MISSION -> Button at bottom-center of Canyon Panel
        const beginBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: 486,
            y: H - 38,
            text: "▶  BEGIN MISSION  →",
            width: 340,
            height: 54,
            primaryColor: 0xff8c1a,
            secondaryColor: 0xffe066,
            textColor: "#141008",
            fontSize: "19px",
            onClick: () => {
                this.launchSolScene(3);
            }
        });
        root.add(beginBtn);

        // ---------- RIGHT MISSION CONTROL PANEL ----------
        // Top Card: ESTABLISH THE SIGNAL (3 Stages)
        const topCardH = 188;
        const topCard = this.scene.add.graphics();
        topCard.fillStyle(0x081d3d, 0.96);
        topCard.fillRoundedRect(rightX, 0, rightW, topCardH, 14);
        topCard.lineStyle(2, 0x00e5ff, 0.85);
        topCard.strokeRoundedRect(rightX, 0, rightW, topCardH, 14);
        root.add(topCard);

        const stageHeader = this.scene.add.text(rightX + 18, 14, "🎯 ESTABLISH THE SIGNAL", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            fontStyle: "bold",
            color: "#FFD23F"
        });
        root.add(stageHeader);

        const stages = [
            { icon: "📡", title: "CONNECT\nRELAY", active: true },
            { icon: "📋", title: "PLAN ROVER\nCOMMANDS", active: false },
            { icon: "🗄️", title: "TRANSMIT\nDATA", active: false }
        ];
        const stageBoxW = 108;
        const stageBoxH = 122;
        const stageGap = 16;
        const stageStartX = rightX + 16;

        stages.forEach((st, idx) => {
            const bx = stageStartX + idx * (stageBoxW + stageGap);
            const by = 48;
            const sg = this.scene.add.graphics();
            sg.fillStyle(st.active || isCompleted ? 0x0e3463 : 0x071730, 0.96);
            sg.fillRoundedRect(bx, by, stageBoxW, stageBoxH, 12);
            sg.lineStyle(2, st.active || isCompleted ? 0x00e5ff : 0x244e85, 1);
            sg.strokeRoundedRect(bx, by, stageBoxW, stageBoxH, 12);
            root.add(sg);

            const ic = this.scene.add.text(bx + stageBoxW / 2, by + 34, st.icon, {
                fontSize: "30px"
            }).setOrigin(0.5);
            const lbl = this.scene.add.text(bx + stageBoxW / 2, by + 84, st.title, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "12px",
                fontStyle: "bold",
                color: "#FFFFFF",
                align: "center"
            }).setOrigin(0.5);
            root.add([ic, lbl]);

            if (idx < 2) {
                const arrow = this.scene.add.text(bx + stageBoxW + stageGap / 2, by + stageBoxH / 2, "›", {
                    fontFamily: UITheme.fonts.heading,
                    fontSize: "26px",
                    fontStyle: "bold",
                    color: "#FFD23F"
                }).setOrigin(0.5);
                root.add(arrow);
            }
        });

        // Bottom Card: ROVER COMMANDS + COMMAND QUEUE (MAX 5)
        const botCardY = topCardH + 12;
        const botCardH = H - botCardY;
        const botCard = this.scene.add.graphics();
        botCard.fillStyle(0x081d3d, 0.96);
        botCard.fillRoundedRect(rightX, botCardY, rightW, botCardH, 14);
        botCard.lineStyle(2, 0x00e5ff, 0.85);
        botCard.strokeRoundedRect(rightX, botCardY, rightW, botCardH, 14);
        root.add(botCard);

        const cmdHeader = this.scene.add.text(rightX + 18, botCardY + 14, "🎮 ROVER COMMANDS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            fontStyle: "bold",
            color: "#FFFFFF"
        });
        root.add(cmdHeader);

        const queueContainer = this.scene.add.container(0, 0);
        root.add(queueContainer);

        const redrawPreviewQueue = () => {
            queueContainer.removeAll(true);
            const qLabel = this.scene.add.text(rightX + 18, botCardY + 156, `COMMAND QUEUE (MAX 5)  [${this.sol3PreviewQueue.length}/5]`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "13px",
                fontStyle: "bold",
                color: "#8AD8FF"
            });
            queueContainer.add(qLabel);

            const slotY = botCardY + 184;
            const slotSize = 44;
            const slotGap = 14;
            const cmdGlyphs: Record<PreviewCmdId, { glyph: string; color: number }> = {
                FORWARD: { glyph: "⬆", color: 0x16805a },
                LEFT: { glyph: "↰", color: 0x3b499c },
                RIGHT: { glyph: "↱", color: 0x3b499c },
                STOP: { glyph: "■", color: 0x9c2838 },
                CAPTURE: { glyph: "📷", color: 0xa67314 },
                SAMPLE: { glyph: "🧪", color: 0x16805a }
            };

            for (let s = 0; s < 5; s++) {
                const sx = rightX + 18 + s * (slotSize + slotGap);
                const cmd = this.sol3PreviewQueue[s];
                const slotBg = this.scene.add.graphics();
                slotBg.fillStyle(cmd ? cmdGlyphs[cmd].color : 0x0c2447, 0.95);
                slotBg.fillRoundedRect(sx, slotY, slotSize, slotSize, 10);
                slotBg.lineStyle(1.5, cmd ? 0x6be8ff : 0x264b7d, 0.95);
                slotBg.strokeRoundedRect(sx, slotY, slotSize, slotSize, 10);
                queueContainer.add(slotBg);

                if (cmd) {
                    const gText = this.scene.add.text(sx + slotSize / 2, slotY + slotSize / 2, cmdGlyphs[cmd].glyph, {
                        fontSize: "18px",
                        color: "#FFFFFF",
                        fontStyle: "bold"
                    }).setOrigin(0.5);
                    queueContainer.add(gText);

                    const hit = this.scene.add.rectangle(sx + slotSize / 2, slotY + slotSize / 2, slotSize, slotSize, 0, 0)
                        .setInteractive({ useHandCursor: true });
                    hit.on("pointerdown", () => {
                        SoundFX.playClick();
                        this.sol3PreviewQueue.splice(s, 1);
                        redrawPreviewQueue();
                    });
                    queueContainer.add(hit);
                }

                if (s < 4) {
                    const sep = this.scene.add.text(sx + slotSize + slotGap / 2, slotY + slotSize / 2, "›", {
                        fontSize: "16px",
                        color: "#6BE8FF",
                        fontStyle: "bold"
                    }).setOrigin(0.5);
                    queueContainer.add(sep);
                }
            }

            // Trash / Clear button
            const trashX = rightX + 18 + 5 * (slotSize + slotGap) + 4;
            const trashBg = this.scene.add.graphics();
            trashBg.fillStyle(0x9c2838, 0.95);
            trashBg.fillRoundedRect(trashX, slotY, 44, slotSize, 10);
            trashBg.lineStyle(1.5, 0xff8a98, 0.95);
            trashBg.strokeRoundedRect(trashX, slotY, 44, slotSize, 10);
            const trashIcon = this.scene.add.text(trashX + 22, slotY + slotSize / 2, "🗑️", { fontSize: "18px" }).setOrigin(0.5);
            const trashHit = this.scene.add.rectangle(trashX + 22, slotY + slotSize / 2, 44, slotSize, 0, 0)
                .setInteractive({ useHandCursor: true });
            trashHit.on("pointerdown", () => {
                SoundFX.playClick();
                this.sol3PreviewQueue = [];
                redrawPreviewQueue();
            });
            queueContainer.add([trashBg, trashIcon, trashHit]);
        };

        const commandButtons: Array<{ id: PreviewCmdId; label: string; color: number }> = [
            { id: "FORWARD", label: "⬆ FORWARD", color: 0x136f54 },
            { id: "LEFT", label: "↰ LEFT", color: 0x35428f },
            { id: "RIGHT", label: "↱ RIGHT", color: 0x35428f },
            { id: "STOP", label: "■ STOP", color: 0x8c2432 },
            { id: "CAPTURE", label: "📷 CAPTURE", color: 0x996b14 },
            { id: "SAMPLE", label: "🧪 SAMPLE", color: 0x136f54 }
        ];

        const btnCols = 3;
        const cmdBtnW = 114;
        const cmdBtnH = 42;
        const cmdGapX = 10;
        const cmdGapY = 10;

        commandButtons.forEach((btnDef, idx) => {
            const col = idx % btnCols;
            const row = Math.floor(idx / btnCols);
            const bx = rightX + 18 + col * (cmdBtnW + cmdGapX);
            const by = botCardY + 48 + row * (cmdBtnH + cmdGapY);

            const bg = this.scene.add.graphics();
            bg.fillStyle(btnDef.color, 0.95);
            bg.fillRoundedRect(bx, by, cmdBtnW, cmdBtnH, 10);
            bg.lineStyle(1.5, 0x7be8ff, 0.85);
            bg.strokeRoundedRect(bx, by, cmdBtnW, cmdBtnH, 10);
            root.add(bg);

            const txt = this.scene.add.text(bx + cmdBtnW / 2, by + cmdBtnH / 2, btnDef.label, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "12px",
                fontStyle: "bold",
                color: "#FFFFFF"
            }).setOrigin(0.5);
            root.add(txt);

            const hit = this.scene.add.rectangle(bx + cmdBtnW / 2, by + cmdBtnH / 2, cmdBtnW, cmdBtnH, 0, 0)
                .setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => {
                SoundFX.playClick();
                if (this.sol3PreviewQueue.length < 5) {
                    this.sol3PreviewQueue.push(btnDef.id);
                    redrawPreviewQueue();
                } else {
                    SoundFX.playAlert();
                }
            });
            root.add(hit);
        });

        // Subtle helper prompt inside queue box
        const queueHint = this.scene.add.text(rightX + 18, botCardY + 238, "Test queueing commands here, then press BEGIN MISSION → to drive!", {
            fontFamily: UITheme.fonts.body,
            fontSize: "11.5px",
            color: "#A8D5FF"
        });
        root.add(queueHint);

        redrawPreviewQueue();
    }

    private createCharacterBubble(
        parent: Phaser.GameObjects.Container,
        cfg: {
            x: number;
            y: number;
            speaker: string;
            badgeColor: number;
            borderColor: number;
            message: string;
            portraitType: "maya" | "bleep";
        }
    ) {
        const { x, y, speaker, badgeColor, borderColor, message, portraitType } = cfg;

        // Circular avatar portrait
        const avatarBg = this.scene.add.graphics();
        avatarBg.fillStyle(0x10284c, 1);
        avatarBg.fillCircle(x + 38, y + 48, 36);
        avatarBg.lineStyle(3, borderColor, 1);
        avatarBg.strokeCircle(x + 38, y + 48, 36);
        parent.add(avatarBg);

        if (portraitType === "maya" && this.scene.textures.exists("girl-astronaut")) {
            const img = this.scene.add.image(x + 38, y + 54, "girl-astronaut");
            img.setScale(Math.min(64 / img.width, 64 / img.height));
            parent.add(img);
        } else {
            // Illustrated friendly Bleep / Maya icon fallback
            const face = this.scene.add.graphics();
            if (portraitType === "maya") {
                face.fillStyle(0xffd2b3, 1);
                face.fillCircle(x + 38, y + 48, 20);
                face.fillStyle(0x5c3317, 1);
                face.fillCircle(x + 38, y + 36, 18);
                face.fillStyle(0x1d2d44, 1);
                face.fillCircle(x + 31, y + 48, 2.5);
                face.fillCircle(x + 45, y + 48, 2.5);
            } else {
                face.fillStyle(0xe8f1fa, 1);
                face.fillRoundedRect(x + 18, y + 30, 40, 34, 10);
                face.fillStyle(0x0b2239, 1);
                face.fillRoundedRect(x + 23, y + 36, 30, 20, 6);
                face.lineStyle(2.5, 0x00f0ff, 1);
                face.beginPath();
                face.arc(x + 32, y + 46, 4, Math.PI, 0, false);
                face.strokePath();
                face.beginPath();
                face.arc(x + 44, y + 46, 4, Math.PI, 0, false);
                face.strokePath();
            }
            parent.add(face);
        }

        // Speaker name pill
        const pillX = x + 84;
        const pill = this.scene.add.graphics();
        pill.fillStyle(badgeColor, 0.98);
        pill.fillRoundedRect(pillX, y + 4, 154, 24, 12);
        pill.lineStyle(1.5, borderColor, 1);
        pill.strokeRoundedRect(pillX, y + 4, 154, 24, 12);
        parent.add(pill);

        const speakerTxt = this.scene.add.text(pillX + 14, y + 16, speaker, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            fontStyle: "bold",
            color: "#FFFFFF"
        }).setOrigin(0, 0.5);
        parent.add(speakerTxt);

        // Speech bubble card
        const bubbleW = 248;
        const bubbleH = 74;
        const bubble = this.scene.add.graphics();
        bubble.fillStyle(0xf8fbff, 0.96);
        bubble.fillRoundedRect(pillX, y + 32, bubbleW, bubbleH, 12);
        bubble.lineStyle(2, borderColor, 0.95);
        bubble.strokeRoundedRect(pillX, y + 32, bubbleW, bubbleH, 12);
        parent.add(bubble);

        const msgTxt = this.scene.add.text(pillX + 12, y + 40, message, {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            fontStyle: "bold",
            color: "#11223D",
            lineSpacing: 2,
            wordWrap: { width: bubbleW - 22 }
        });
        parent.add(msgTxt);
    }

    // =====================================================================
    // SOL 4 BRIEFING
    // =====================================================================

    private clearSol4Tweens() {
        this.sol4Tweens.forEach((t) => t.remove());
        this.sol4Tweens = [];
    }

    /** Add an image scaled (aspect preserved) to fit maxW x maxH, anchored bottom-centre. */
    private addFittedImage(
        parent: Phaser.GameObjects.Container,
        key: string,
        x: number,
        bottom: number,
        maxW: number,
        maxH: number
    ): Phaser.GameObjects.Image | undefined {
        if (!this.scene.textures.exists(key)) return undefined;
        const img = this.scene.add.image(x, bottom, key).setOrigin(0.5, 1);
        img.setScale(Math.min(maxW / img.width, maxH / img.height));
        parent.add(img);
        return img;
    }

    /** Add an image that covers a rectangle (CSS "cover") by scaling + cropping — never overflows. */
    private addCoverImage(
        parent: Phaser.GameObjects.Container,
        key: string,
        x: number,
        y: number,
        w: number,
        h: number
    ): Phaser.GameObjects.Image | undefined {
        if (!this.scene.textures.exists(key)) return undefined;
        const img = this.scene.add.image(x + w / 2, y + h / 2, key);
        const tw = img.width;
        const th = img.height;
        const s = Math.max(w / tw, h / th);
        img.setScale(s);
        const cw = w / s;
        const ch = h / s;
        img.setCrop((tw - cw) / 2, (th - ch) / 2, cw, ch);
        parent.add(img);
        return img;
    }

    /** Vertical fade made from stacked strips (avoids gradient APIs that differ between Phaser versions). */
    private addFade(
        parent: Phaser.GameObjects.Container,
        x: number,
        y: number,
        w: number,
        h: number,
        color: number,
        fromAlpha: number,
        toAlpha: number,
        steps = 16
    ) {
        const g = this.scene.add.graphics();
        const stripH = h / steps;
        for (let i = 0; i < steps; i += 1) {
            const a = fromAlpha + (toAlpha - fromAlpha) * (i / (steps - 1));
            g.fillStyle(color, a);
            g.fillRect(x, y + i * stripH, w, Math.ceil(stripH) + 1);
        }
        parent.add(g);
    }

    private renderSol4Briefing() {
        const { width, height } = this.scene.scale;
        const frameX = (width - MODAL_W) / 2;
        const frameY = (height - MODAL_H) / 2;

        const areaX = frameX + SOL4_AREA_SIDE_MARGIN;
        const areaY = frameY + SOL4_AREA_TOP;
        const W = MODAL_W - SOL4_AREA_SIDE_MARGIN * 2;           // 1128
        const H = MODAL_H - SOL4_AREA_TOP - SOL4_AREA_BOTTOM_MARGIN; // 504
        const cx = W / 2;

        const root = this.scene.add.container(areaX, areaY);
        this.contentContainer.add(root);

        // ---------- Background: space, stars, NASA terrain ----------
        const sky = this.scene.add.graphics();
        sky.fillStyle(0x07152e, 1);
        sky.fillRoundedRect(0, 0, W, H, { tl: 10, tr: 10, bl: 14, br: 14 });
        sky.fillStyle(0x0d2147, 0.8);
        sky.fillRect(0, 0, W, 90);
        root.add(sky);

        const stars = this.scene.add.graphics();
        stars.fillStyle(0xc8edff, 0.75);
        for (let i = 0; i < 55; i += 1) {
            const sx = 10 + ((i * 197) % (W - 20));
            const sy = 8 + ((i * 83) % 190);
            stars.fillCircle(sx, sy, i % 5 === 0 ? 1.8 : 1);
        }
        root.add(stars);

        const terrainTop = 150;
        const terrainH = H - terrainTop;
        const terrain = this.addCoverImage(root, "mars_terrain", 0, terrainTop, W, terrainH);
        if (terrain) {
            terrain.setTint(0xe29a78);
            terrain.setAlpha(0.95);
        } else {
            const ground = this.scene.add.graphics();
            ground.fillStyle(0x9e4a38, 1);
            ground.fillRect(0, terrainTop, W, terrainH);
            ground.fillStyle(0xc85a3c, 1);
            ground.fillTriangle(cx - 220, H, cx, terrainTop + 40, cx + 220, H);
            root.add(ground);
        }
        this.addFade(root, 0, terrainTop, W, 70, 0x07152e, 1, 0);
        this.addFade(root, 0, H - 110, W, 110, 0x1a0a14, 0, 0.7);

        // Mars planet
        const planet = this.scene.add.graphics();
        planet.fillStyle(0xd96848, 1);
        planet.fillCircle(92, 66, 34);
        planet.fillStyle(0xa9443e, 0.55);
        planet.fillCircle(80, 56, 7);
        planet.fillCircle(104, 78, 9);
        planet.fillCircle(98, 52, 4);
        planet.lineStyle(2, 0xff9a5c, 0.8);
        planet.strokeCircle(92, 66, 34);
        root.add(planet);

        // ---------- Header: SOL 4 badge, title, subtitle ----------
        const badge = this.scene.add.graphics();
        badge.fillStyle(UITheme.colors.solarGold, 1);
        badge.fillRoundedRect(cx - 56, 6, 112, 32, 16);
        badge.lineStyle(2, UITheme.colors.marsAmber, 1);
        badge.strokeRoundedRect(cx - 56, 6, 112, 32, 16);
        root.add(badge);
        const badgeText = this.scene.add.text(cx, 22, "SOL 4", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "20px",
            fontStyle: "bold",
            color: "#0E1A32"
        }).setOrigin(0.5);
        root.add(badgeText);

        const title = this.scene.add.text(cx, 82, "AIR, ICE & LED POTATOES", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "34px",
            fontStyle: "bold",
            color: "#fff8df",
            stroke: "#ff7347",
            strokeThickness: 4,
            letterSpacing: 1
        }).setOrigin(0.5);
        const maxTitleW = 740;
        if (title.width > maxTitleW) title.setScale(maxTitleW / title.width);
        root.add(title);

        const subtitle = this.scene.add.text(cx, 120, "Make oxygen, melt Martian ice, and grow your own potatoes!", {
            fontFamily: UITheme.fonts.body,
            fontSize: "16px",
            color: "#fff8df",
            align: "center"
        }).setOrigin(0.5);
        if (subtitle.width > 640) subtitle.setScale(640 / subtitle.width);
        root.add(subtitle);

        // ---------- Characters ----------
        const astronaut = this.addFittedImage(root, "girl-astronaut", 118, 440, 200, 300);
        const rover = this.addFittedImage(root, "rover", W - 108, 440, 160, 112);
        [astronaut, rover].forEach((img, i) => {
            if (!img) return;
            const baseY = img.y;
            this.sol4Tweens.push(this.scene.tweens.add({
                targets: img,
                y: baseY - 5,
                duration: 1800 + i * 400,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            }));
        });

        // ---------- Three mission stages ----------
        const stageBottom = 286;
        const stageGap = 240;
        const colX = [cx - stageGap, cx, cx + stageGap];

        const pedestals = this.scene.add.graphics();
        colX.forEach((x) => {
            pedestals.fillStyle(0x6a2f26, 0.9);
            pedestals.fillEllipse(x, stageBottom + 4, 196, 30);
            pedestals.fillStyle(0xb5563a, 0.95);
            pedestals.fillEllipse(x, stageBottom, 190, 24);
        });
        root.add(pedestals);

        this.drawMoxie(root, colX[0], stageBottom - 6);
        this.drawIceAndTank(root, colX[1], stageBottom - 6);
        if (!this.addFittedImage(root, "greenhouse", colX[2], stageBottom - 6, 180, 140)) {
            this.drawFallbackGreenhouse(root, colX[2], stageBottom - 6);
        }

        const arrows = this.scene.add.graphics();
        arrows.lineStyle(7, 0xffc928, 1);
        [cx - stageGap / 2, cx + stageGap / 2].forEach((ax) => {
            const ay = 214;
            arrows.beginPath();
            arrows.moveTo(ax - 8, ay - 18);
            arrows.lineTo(ax + 8, ay);
            arrows.lineTo(ax - 8, ay + 18);
            arrows.strokePath();
        });
        root.add(arrows);

        const pillY = 314;
        const stages: Array<{ label: string; caption: string; icon: "oxygen" | "water" | "food" }> = [
            { label: "OXYGEN", caption: "Make oxygen\nfrom Mars air.", icon: "oxygen" },
            { label: "WATER", caption: "Melt buried ice\nfor water.", icon: "water" },
            { label: "GROW FOOD", caption: "Grow potatoes\nunder LED lights.", icon: "food" }
        ];
        stages.forEach((stage, i) => {
            const x = colX[i];
            const pill = this.scene.add.graphics();
            pill.fillStyle(0x062346, 0.97);
            pill.fillRoundedRect(x - 105, pillY - 19, 210, 38, 19);
            pill.lineStyle(2.5, 0x00dfff, 1);
            pill.strokeRoundedRect(x - 105, pillY - 19, 210, 38, 19);
            this.drawStageIcon(pill, stage.icon, x - 72, pillY);
            root.add(pill);

            const label = this.scene.add.text(x + 14, pillY, stage.label, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "17px",
                fontStyle: "bold",
                color: "#ffffff"
            }).setOrigin(0.5);
            const caption = this.scene.add.text(x, pillY + 30, stage.caption, {
                fontFamily: UITheme.fonts.body,
                fontSize: "15px",
                color: "#fff8df",
                align: "center",
                lineSpacing: 2,
                stroke: "#1a0a14",
                strokeThickness: 3,
                wordWrap: { width: 200 }
            }).setOrigin(0.5, 0);
            root.add([label, caption]);
        });

        // ---------- NASA Space Weather card ----------
        const cardW = 250;
        const cardH = 50;
        const cardX = W - cardW - 14;
        const cardY = 6;
        const weatherCard = this.scene.add.graphics();
        weatherCard.fillStyle(0x09234a, 0.96);
        weatherCard.fillRoundedRect(cardX, cardY, cardW, cardH, 14);
        weatherCard.lineStyle(2, 0x00e5ff, 1);
        weatherCard.strokeRoundedRect(cardX, cardY, cardW, cardH, 14);
        weatherCard.fillStyle(0xffd36b, 1);
        weatherCard.fillCircle(cardX + cardW - 24, cardY + cardH / 2, 8);
        root.add(weatherCard);

        this.sol4WeatherTitle = this.scene.add.text(cardX + 14, cardY + 15, "NASA SPACE WEATHER", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            fontStyle: "bold",
            color: "#ffd36b"
        }).setOrigin(0, 0.5);
        this.sol4WeatherDetail = this.scene.add.text(cardX + 14, cardY + 35, "", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: "#d8efff"
        }).setOrigin(0, 0.5);
        root.add([this.sol4WeatherTitle, this.sol4WeatherDetail]);
        this.applySol4Weather();

        // ---------- Bottom row ----------
        const backButton = ButtonFactory.createButton({
            scene: this.scene,
            x: 14 + 110,
            y: H - 32,
            text: "← BACK TO MARS BASE",
            width: 220,
            height: 40,
            primaryColor: UITheme.colors.cardBg,
            secondaryColor: UITheme.colors.primaryCyan,
            textColor: "#ffffff",
            fontSize: "13px",
            onClick: () => {
                SoundFX.playClick();
                this.close();
            }
        });
        root.add(backButton);

        const deployButton = ButtonFactory.createButton({
            scene: this.scene,
            x: cx,
            y: H - 62,
            text: "🚀 DEPLOY TO SOL 4 MARTIAN SURFACE →",
            width: 540,
            height: 58,
            primaryColor: UITheme.colors.marsAmber,
            secondaryColor: UITheme.colors.solarGold,
            textColor: "#fff6dc",
            fontSize: "17px",
            onClick: () => this.launchSolScene(4)
        });
        root.add(deployButton);

        const attribution = this.scene.add.text(W - 14, H - 8, "NASA Mars Trek terrain mosaic • Jezero Crater, Mars", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: "#9ff0ff",
            stroke: "#1a0a14",
            strokeThickness: 3
        }).setOrigin(1, 1);
        root.add(attribution);

        if (!this.sol4WeatherRequested) {
            this.sol4WeatherRequested = true;
            void this.loadSol4SpaceWeather();
        }
    }

    private drawStageIcon(g: Phaser.GameObjects.Graphics, icon: "oxygen" | "water" | "food", x: number, y: number) {
        if (icon === "oxygen") {
            g.lineStyle(3, 0x75e8ff, 1);
            g.lineBetween(x - 12, y - 7, x + 10, y - 7);
            g.lineBetween(x - 16, y, x + 14, y);
            g.lineBetween(x - 10, y + 7, x + 8, y + 7);
        } else if (icon === "water") {
            g.fillStyle(0x62dfff, 1);
            g.fillCircle(x, y + 3, 8);
            g.fillTriangle(x, y - 13, x - 7, y, x + 7, y);
        } else {
            g.fillStyle(0x52e26a, 1);
            g.fillEllipse(x - 5, y - 3, 14, 9);
            g.fillEllipse(x + 6, y - 6, 14, 9);
            g.lineStyle(2.5, 0x52e26a, 1);
            g.lineBetween(x, y + 10, x, y - 2);
        }
    }

    private drawMoxie(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();
        g.lineStyle(9, 0x9aa7b5, 1);
        g.beginPath();
        g.moveTo(x + 24, bottom - 88);
        g.lineTo(x + 30, bottom - 108);
        g.lineTo(x + 48, bottom - 116);
        g.lineTo(x + 60, bottom - 104);
        g.lineTo(x + 62, bottom - 78);
        g.lineTo(x + 62, bottom - 26);
        g.strokePath();
        g.fillStyle(0xe8742a, 1);
        g.fillRoundedRect(x - 64, bottom - 14, 128, 14, 5);
        g.fillStyle(0xeef2f7, 1);
        g.fillRoundedRect(x - 56, bottom - 92, 112, 80, 10);
        g.lineStyle(3, 0x9fb4c8, 1);
        g.strokeRoundedRect(x - 56, bottom - 92, 112, 80, 10);
        g.lineStyle(2, 0x9fb4c8, 1);
        [0, 1, 2].forEach((i) => g.lineBetween(x - 48, bottom - 78 + i * 7, x - 36, bottom - 78 + i * 7));
        g.fillStyle(0x0b2b40, 1);
        g.fillRoundedRect(x - 32, bottom - 54, 64, 36, 6);
        g.lineStyle(2, 0x22d3ee, 1);
        g.strokeRoundedRect(x - 32, bottom - 54, 64, 36, 6);
        parent.add(g);

        const name = this.scene.add.text(x - 6, bottom - 74, "MOXIE", {
            fontFamily: UITheme.fonts.heading, fontSize: "14px", fontStyle: "bold", color: "#0e1a32"
        }).setOrigin(0.5);
        const o2 = this.scene.add.text(x, bottom - 36, "O₂", {
            fontFamily: UITheme.fonts.heading, fontSize: "20px", fontStyle: "bold", color: "#4de3ff"
        }).setOrigin(0.5);
        parent.add([name, o2]);
    }

    private drawIceAndTank(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();
        const ox = x - 8;
        const crystal = (pts: Array<[number, number]>) => {
            g.fillStyle(0xbfe8ff, 0.95);
            g.fillPoints(pts.map(([px, py]) => new Phaser.Math.Vector2(ox + px, bottom + py)), true);
            g.lineStyle(2, 0xffffff, 0.9);
            g.strokePoints(pts.map(([px, py]) => new Phaser.Math.Vector2(ox + px, bottom + py)), true);
        };
        crystal([[-84, -2], [-76, -26], [-64, -2]]);
        crystal([[-72, -2], [-58, -56], [-42, -72], [-26, -40], [-22, -2]]);
        crystal([[-44, -2], [-30, -32], [-16, -2]]);
        g.fillStyle(0x1e90d8, 0.9);
        g.fillRoundedRect(ox, bottom - 92, 66, 88, 10);
        g.lineStyle(3, 0xbfe8ff, 1);
        g.strokeRoundedRect(ox, bottom - 92, 66, 88, 10);
        g.fillStyle(0x8793a3, 1);
        g.fillRoundedRect(ox + 6, bottom - 104, 54, 14, 5);
        g.fillStyle(0xe8fbff, 1);
        g.fillCircle(ox + 33, bottom - 40, 10);
        g.fillTriangle(ox + 33, bottom - 66, ox + 24, bottom - 46, ox + 42, bottom - 46);
        parent.add(g);
    }

    private drawFallbackGreenhouse(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();
        g.fillStyle(0x9fd8ff, 0.35);
        g.beginPath();
        g.arc(x, bottom - 10, 74, Math.PI, 0, false);
        g.closePath();
        g.fillPath();
        g.lineStyle(3, 0xcfeeff, 0.9);
        g.beginPath();
        g.arc(x, bottom - 10, 74, Math.PI, 0, false);
        g.strokePath();
        g.fillStyle(0x6b3b24, 1);
        g.fillRect(x - 70, bottom - 12, 140, 10);
        g.fillStyle(0x3da94b, 1);
        [-40, -10, 24, 50].forEach((dx) => g.fillCircle(x + dx, bottom - 24, 12));
        g.fillStyle(0xd9a441, 1);
        g.fillEllipse(x + 40, bottom - 10, 24, 14);
        parent.add(g);
    }

    private applySol4Weather() {
        if (this.sol4WeatherTitle?.active) {
            this.sol4WeatherTitle.setText("NASA SPACE WEATHER");
        }
        if (this.sol4WeatherDetail?.active) {
            this.sol4WeatherDetail.setText(this.sol4WeatherStatus.detail).setColor(this.sol4WeatherStatus.color);
        }
    }

    private async loadSol4SpaceWeather() {
        const endpoint = import.meta.env.DEV
            ? "http://localhost:3001/api/nasa/space-weather"
            : "/api/nasa/space-weather";
        const controller = new AbortController();
        this.sol4WeatherAbort = controller;
        const timeout = window.setTimeout(() => controller.abort(), 8_000);

        try {
            const response = await fetch(endpoint, {
                headers: { Accept: "application/json" },
                signal: controller.signal
            });
            if (!response.ok) throw new Error(`NASA proxy returned HTTP ${response.status}`);
            const payload = await response.json() as {
                success?: boolean;
                data?: { totalEvents?: number };
            };
            const total = payload.data?.totalEvents;
            if (!payload.success || typeof total !== "number" || !Number.isFinite(total)) {
                throw new Error("NASA proxy returned an invalid response.");
            }
            this.sol4WeatherStatus = {
                detail: total > 0
                    ? `${total} recent solar event${total === 1 ? "" : "s"} (DONKI)`
                    : "No recent events (DONKI)",
                color: total > 0 ? "#bfffd1" : "#d8efff"
            };
        } catch (error) {
            if (!this.isClosed) {
                this.sol4WeatherStatus = { detail: "Data unavailable", color: "#b8b8b8" };
                console.warn("Sol 4 NASA space-weather status unavailable:", error);
            }
        } finally {
            window.clearTimeout(timeout);
            this.sol4WeatherAbort = undefined;
            if (!this.isClosed) this.applySol4Weather();
        }
    }

    private getSolSceneKey(sol: number): string {
        switch (sol) {
            case 1: return "Sol1DirtFortressScene";
            case 2: return "Sol2PerchlorateBarrierScene";
            case 3: return "Sol3RedGaleScene";
            case 4: return "Sol4ISRUProductionScene";
            case 5: return "Sol5SilenceCommsLagScene";
            default: return "Sol1DirtFortressScene";
        }
    }

    private handlePrimaryAction(sol: number) {
        const stateRecord = this.activeSolData[sol];

        switch (sol) {
            case 1:
                stateRecord.currentVal = Math.min(100, stateRecord.currentVal + 25);
                break;
            case 2:
                stateRecord.currentVal = Math.min(3, stateRecord.currentVal + 1);
                stateRecord.completed = stateRecord.currentVal >= 3;
                break;
            case 3:
                this.launchSolScene(3);
                return;
            case 4:
                stateRecord.currentVal = Math.min(3, stateRecord.currentVal + 1);
                break;
            case 5:
                stateRecord.currentVal = 3;
                break;
        }

        if (this.callbacks.onChallengeAction) {
            this.callbacks.onChallengeAction(`sol_${sol}_action`, stateRecord);
        }

        this.renderSolChallenge(sol);
    }

    private handleSecondaryAction(sol: number) {
        const stateRecord = this.activeSolData[sol];

        switch (sol) {
            case 1:
                SoundFX.playAlert();
                break;
            case 2:
                SoundFX.playClick();
                stateRecord.currentVal = Math.min(3, stateRecord.currentVal + 1);
                stateRecord.completed = stateRecord.currentVal >= 3;
                this.renderSolChallenge(sol);
                break;
            case 3:
                SoundFX.playClick();
                this.launchSolScene(3);
                break;
        }

        if (this.callbacks.onChallengeAction) {
            this.callbacks.onChallengeAction(`sol_${sol}_secondary`, stateRecord);
        }
    }

    private completeCurrentSol(sol: number) {
        this.activeSolData[sol].completed = true;
        this.activeSolData[sol].currentVal = this.challenges[sol].targetVal;

        if (this.callbacks.onAdvanceSol) {
            this.callbacks.onAdvanceSol(sol + 1);
        }

        if (sol < 5) {
            this.selectSolTab(sol + 1);
        } else {
            this.close();
        }
    }

    private launchSolScene(sol: number) {
        SoundFX.playClick();
        const solKey = this.getSolSceneKey(sol);
        this.close();

        const allSolKeys = [
            "Sol1DirtFortressScene",
            "Sol2PerchlorateBarrierScene",
            "Sol3RedGaleScene",
            "Sol4ISRUProductionScene",
            "Sol5SilenceCommsLagScene"
        ];

        for (const key of allSolKeys) {
            if (this.scene.scene.isActive(key) || this.scene.scene.isSleeping(key) || this.scene.scene.isPaused(key)) {
                this.scene.scene.stop(key);
            }
        }

        this.scene.scene.sleep("MarsWorldScene");
        this.scene.scene.launch(solKey);
        this.scene.scene.bringToTop(solKey);
    }

    public close() {
        if (this.isClosed) return;
        this.isClosed = true;
        this.clearSol3Tweens();
        this.clearSol4Tweens();
        this.sol4WeatherAbort?.abort();
        this.sol4WeatherTitle = undefined;
        this.sol4WeatherDetail = undefined;
        this.scene.scale.off("fullscreenchange", this.updateFullscreenLabel, this);
        this.container.destroy();
        this.callbacks.onClose();
    }
}

export default MissionChallengesModal;