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

/** Shared modal frame size (the frame is drawn in init(); Sol 1–5 lay themselves out inside it). */
const MODAL_W = 1160;
const MODAL_H = 640;
/** Tabs occupy frameY+70 .. frameY+110, so custom Sol briefing areas start below them. */
const SOL_AREA_TOP = 120;
const SOL_AREA_BOTTOM_MARGIN = 16;
const SOL_AREA_SIDE_MARGIN = 16;

type StagePillIcon =
    | "oxygen"
    | "water"
    | "food"
    | "pipe"
    | "blower"
    | "solar"
    | "dustdevil"
    | "relay"
    | "roverCmd"
    | "transmit"
    | "inspectHabitat"
    | "repairSystems"
    | "saveColony";

export class MissionChallengesModal {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private callbacks: MissionChallengeCallbacks;

    private currentSolTab: number = 1;
    private activeSolData: Record<number, { currentVal: number; completed: boolean }> = {
        1: { currentVal: 0, completed: false },    // 0% water flow
        2: { currentVal: 0, completed: false },    // 0 / 4 solar panels cleaned
        3: { currentVal: 0, completed: false },    // 0 / 3 signal mission stages
        4: { currentVal: 1, completed: false },    // ISRU systems active
        5: { currentVal: 0, completed: false },    // 0 / 4 habitat systems repaired
    };

    private contentContainer!: Phaser.GameObjects.Container;
    private tabButtons: Phaser.GameObjects.Container[] = [];
    private fullscreenText?: Phaser.GameObjects.Text;

    // Sol 1, Sol 2, Sol 3 & Sol 5 briefing tweens
    private sol1Tweens: Phaser.Tweens.Tween[] = [];
    private sol2Tweens: Phaser.Tweens.Tween[] = [];
    private sol3Tweens: Phaser.Tweens.Tween[] = [];
    private sol5Tweens: Phaser.Tweens.Tween[] = [];

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
            briefing: "Connect to the orbital relay, command your rover, and transmit discoveries from the Martian canyon!",
            nasaFact: "Radio signals travel at the speed of light, but Mars is so far away that signals take minutes to arrive—so NASA rovers execute queued commands autonomously!",
            primaryTarget: "Connect orbital relay, navigate canyon, collect samples & transmit data.",
            progressMetric: "Mission Stages",
            currentVal: 0,
            targetVal: 3,
            unit: "Stages",
            actionButtonText: "🚀 BEGIN MISSION – SOL 3 →",
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
            title: "SOL 5: THE LAST SAFE HABITAT",
            codename: "MARS HABITAT EMERGENCY REPAIR",
            icon: "🏠",
            hazardBadge: "CRITICAL LIFE-SUPPORT FAILURE",
            briefing: "A powerful Martian storm has damaged the colony habitat! Oxygen is leaking, electrical systems are offline, and pressure is unstable. Explore the habitat, solve engineering repair puzzles, and save the crew before oxygen pressure reaches a critical level!",
            nasaFact: "Human missions to Mars will require reliable life-support systems that regulate cabin pressure, oxygen, electrical power, and habitat integrity. These systems must continue operating even in harsh Martian conditions.",
            primaryTarget: "Repair all four critical habitat systems and restore safe operating conditions.",
            progressMetric: "REPAIRS COMPLETED",
            currentVal: 0,
            targetVal: 4,
            unit: "Systems",
            actionButtonText: "🚀 ENTER HABITAT REPAIR MISSION",
            secondaryActionText: "🛠️ INSPECT HABITAT SYSTEMS"
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
                    this.drawTabBackground(bg, tabW, tabH, false, false, false, this.activeSolData[i].completed);
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
        this.clearSol1Tweens();
        this.clearSol2Tweens();
        this.clearSol3Tweens();
        this.clearSol4Tweens();
        this.clearSol5Tweens();
        this.sol4WeatherTitle = undefined;
        this.sol4WeatherDetail = undefined;
        this.contentContainer.removeAll(true);

        if (sol === 1) {
            this.renderSol1Briefing();
            this.animateContentIn();
            return;
        }
        if (sol === 2) {
            this.renderSol2Briefing();
            this.animateContentIn();
            return;
        }
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
        if (sol === 5) {
            this.renderSol5Briefing();
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
    // SHARED ILLUSTRATED STAGE BRIEFING SHELL (SOL 1, SOL 2, SOL 3, SOL 4, SOL 5)
    // =====================================================================

    private buildThreeStageBriefingBase(opts: {
        solNumber: number;
        titleText: string;
        subtitleText: string;
        deployText: string;
        attributionText: string;
        tweensList: Phaser.Tweens.Tween[];
    }): {
        root: Phaser.GameObjects.Container;
        W: number;
        H: number;
        cx: number;
        colX: number[];
        stageBottom: number;
        pillY: number;
    } {
        const { width, height } = this.scene.scale;
        const frameX = (width - MODAL_W) / 2;
        const frameY = (height - MODAL_H) / 2;

        const areaX = frameX + SOL_AREA_SIDE_MARGIN;
        const areaY = frameY + SOL_AREA_TOP;
        const W = MODAL_W - SOL_AREA_SIDE_MARGIN * 2;            // 1128
        const H = MODAL_H - SOL_AREA_TOP - SOL_AREA_BOTTOM_MARGIN; // 504
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

        // Cyan inner border framing the briefing stage
        const border = this.scene.add.graphics();
        border.lineStyle(2, 0x00e5ff, 0.85);
        border.strokeRoundedRect(1, 1, W - 2, H - 2, { tl: 10, tr: 10, bl: 14, br: 14 });
        root.add(border);

        // Mars planet (top-left)
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

        // ---------- Header: SOL badge, title, subtitle ----------
        const badge = this.scene.add.graphics();
        badge.fillStyle(UITheme.colors.solarGold, 1);
        badge.fillRoundedRect(cx - 56, 6, 112, 32, 16);
        badge.lineStyle(2, UITheme.colors.marsAmber, 1);
        badge.strokeRoundedRect(cx - 56, 6, 112, 32, 16);
        root.add(badge);
        const badgeText = this.scene.add.text(cx, 22, `SOL ${opts.solNumber}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "20px",
            fontStyle: "bold",
            color: "#0E1A32"
        }).setOrigin(0.5);
        root.add(badgeText);

        const title = this.scene.add.text(cx, 82, opts.titleText, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "34px",
            fontStyle: "bold",
            color: "#fff8df",
            stroke: "#ff7347",
            strokeThickness: 4,
            letterSpacing: 1
        }).setOrigin(0.5);
        const maxTitleW = 760;
        if (title.width > maxTitleW) title.setScale(maxTitleW / title.width);
        root.add(title);

        const subtitle = this.scene.add.text(cx, 120, opts.subtitleText, {
            fontFamily: UITheme.fonts.body,
            fontSize: "16px",
            color: "#fff8df",
            align: "center"
        }).setOrigin(0.5);
        if (subtitle.width > 740) subtitle.setScale(740 / subtitle.width);
        root.add(subtitle);

        // ---------- Characters (Astronaut on left, Mars Rover on bottom-right) ----------
        const astronaut = this.addFittedImage(root, "girl-astronaut", 118, 440, 200, 300);
        const rover = this.addFittedImage(root, "rover", W - 108, 440, 160, 112);
        [astronaut, rover].forEach((img, i) => {
            if (!img) return;
            const baseY = img.y;
            opts.tweensList.push(this.scene.tweens.add({
                targets: img,
                y: baseY - 5,
                duration: 1800 + i * 400,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            }));
        });

        // ---------- Three stage pedestals & yellow connecting arrows ----------
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

        // ---------- Bottom action row ----------
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
            text: opts.deployText,
            width: 540,
            height: 58,
            primaryColor: UITheme.colors.marsAmber,
            secondaryColor: UITheme.colors.solarGold,
            textColor: "#fff6dc",
            fontSize: "17px",
            onClick: () => this.launchSolScene(opts.solNumber)
        });
        root.add(deployButton);

        const attribution = this.scene.add.text(W - 14, H - 8, opts.attributionText, {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: "#9ff0ff",
            stroke: "#1a0a14",
            strokeThickness: 3
        }).setOrigin(1, 1);
        root.add(attribution);

        return { root, W, H, cx, colX, stageBottom, pillY: 314 };
    }

    private renderStagePillsAndCaptions(
        root: Phaser.GameObjects.Container,
        colX: number[],
        pillY: number,
        stages: Array<{ label: string; caption: string; icon: StagePillIcon }>
    ) {
        stages.forEach((stage, i) => {
            const x = colX[i];
            const pill = this.scene.add.graphics();
            pill.fillStyle(0x062346, 0.97);
            pill.fillRoundedRect(x - 108, pillY - 19, 216, 38, 19);
            pill.lineStyle(2.5, 0x00dfff, 1);
            pill.strokeRoundedRect(x - 108, pillY - 19, 216, 38, 19);
            this.drawStageIcon(pill, stage.icon, x - 78, pillY);
            root.add(pill);

            const label = this.scene.add.text(x + 14, pillY, stage.label, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "14px",
                fontStyle: "bold",
                color: "#ffffff"
            }).setOrigin(0.5);
            if (label.width > 148) label.setScale(148 / label.width);

            const caption = this.scene.add.text(x, pillY + 30, stage.caption, {
                fontFamily: UITheme.fonts.body,
                fontSize: "15px",
                color: "#fff8df",
                align: "center",
                lineSpacing: 2,
                stroke: "#1a0a14",
                strokeThickness: 3,
                wordWrap: { width: 210 }
            }).setOrigin(0.5, 0);
            root.add([label, caption]);
        });
    }

    // =====================================================================
    // SOL 1 BRIEFING: SPACE-TOMATO GREENHOUSE
    // =====================================================================

    private clearSol1Tweens() {
        this.sol1Tweens.forEach((t) => t.remove());
        this.sol1Tweens = [];
    }

    private renderSol1Briefing() {
        const { root, colX, stageBottom, pillY } = this.buildThreeStageBriefingBase({
            solNumber: 1,
            titleText: "SPACE-TOMATO GREENHOUSE",
            subtitleText: "Connect the pipes, water the plants, and grow space-tomatoes!",
            deployText: "🚀 DEPLOY TO SOL 1 MARTIAN SURFACE →",
            attributionText: "NASA Mars Trek terrain • Veggie & Tomatosphere Space Garden",
            tweensList: this.sol1Tweens
        });

        // Step 1: Ice extraction station + water droplet tank
        this.drawIceAndTank(root, colX[0], stageBottom - 6);

        // Step 2: Disconnected water pipes illustration
        this.drawDisconnectedPipes(root, colX[1], stageBottom - 6);

        // Step 3: Transparent greenhouse dome containing tomato plants
        this.drawTomatoGreenhouseDome(root, colX[2], stageBottom - 6);

        this.renderStagePillsAndCaptions(root, colX, pillY, [
            { label: "MELT ICE", caption: "Melt Martian ice\nfor water", icon: "water" },
            { label: "CONNECT PIPES", caption: "Connect disconnected\npipes", icon: "pipe" },
            { label: "GROW TOMATOES", caption: "Water the plants to\nsprout tomatoes", icon: "food" }
        ]);
    }

    private drawDisconnectedPipes(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();

        // Left pipe assembly (connected to water inlet)
        g.fillStyle(0x4a6b88, 1);
        g.fillRoundedRect(x - 74, bottom - 58, 42, 18, 4);
        g.fillStyle(0x6d96b8, 1);
        g.fillRoundedRect(x - 36, bottom - 62, 10, 26, 3);
        g.lineStyle(2, 0xbfe8ff, 0.9);
        g.strokeRoundedRect(x - 74, bottom - 58, 42, 18, 4);
        g.strokeRoundedRect(x - 36, bottom - 62, 10, 26, 3);
        // Blue water flow stripe inside left pipe
        g.fillStyle(0x38d6ff, 1);
        g.fillRect(x - 70, bottom - 52, 32, 6);

        // Center disconnected elbow segment (tilted / unaligned)
        g.fillStyle(0xd97724, 1);
        g.fillRoundedRect(x - 16, bottom - 86, 32, 18, 5);
        g.fillRoundedRect(x - 9, bottom - 86, 18, 34, 5);
        g.lineStyle(2, 0xffd25a, 1);
        g.strokeRoundedRect(x - 16, bottom - 86, 32, 18, 5);
        g.strokeRoundedRect(x - 9, bottom - 86, 18, 34, 5);

        // Right pipe assembly (leading to greenhouse)
        g.fillStyle(0x4a6b88, 1);
        g.fillRoundedRect(x + 32, bottom - 58, 42, 18, 4);
        g.fillStyle(0x6d96b8, 1);
        g.fillRoundedRect(x + 26, bottom - 62, 10, 26, 3);
        g.lineStyle(2, 0xbfe8ff, 0.9);
        g.strokeRoundedRect(x + 32, bottom - 58, 42, 18, 4);
        g.strokeRoundedRect(x + 26, bottom - 62, 10, 26, 3);

        // Water drip & rotation indicator arcs showing disconnected gap
        g.fillStyle(0x62dfff, 1);
        g.fillCircle(x - 24, bottom - 28, 5);
        g.fillTriangle(x - 24, bottom - 39, x - 29, bottom - 30, x - 19, bottom - 30);

        g.lineStyle(2.5, 0xffc928, 0.95);
        g.beginPath();
        g.arc(x, bottom - 70, 24, Math.PI * 1.15, Math.PI * 1.85, false);
        g.strokePath();

        parent.add(g);
    }

    private drawTomatoGreenhouseDome(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();

        // Dome base tray
        g.fillStyle(0x3a526b, 1);
        g.fillRoundedRect(x - 76, bottom - 16, 152, 14, 5);
        g.fillStyle(0x6b3b24, 1);
        g.fillRect(x - 68, bottom - 20, 136, 8);

        // Transparent glass dome
        g.fillStyle(0x9fd8ff, 0.28);
        g.beginPath();
        g.arc(x, bottom - 16, 72, Math.PI, 0, false);
        g.closePath();
        g.fillPath();

        // Outer dome arch
        g.lineStyle(2.5, 0xcfeeff, 0.95);
        g.beginPath();
        g.arc(x, bottom - 16, 72, Math.PI, 0, false);
        g.strokePath();

        // Inner geodesic semi-ellipse rib
        g.lineStyle(1.5, 0x8be2ff, 0.65);
        g.beginPath();
        const ribRx = 36;
        const ribRy = 72;
        const steps = 24;
        for (let s = 0; s <= steps; s += 1) {
            const theta = Math.PI + (Math.PI * s) / steps;
            const px = x + Math.cos(theta) * ribRx;
            const py = (bottom - 16) + Math.sin(theta) * ribRy;
            if (s === 0) {
                g.moveTo(px, py);
            } else {
                g.lineTo(px, py);
            }
        }
        g.strokePath();

        // Leafy tomato vines inside dome
        [-34, 0, 34].forEach((dx, idx) => {
            const stemH = idx === 1 ? 46 : 36;
            g.lineStyle(3.5, 0x3da94b, 1);
            g.lineBetween(x + dx, bottom - 20, x + dx, bottom - 20 - stemH);
            g.fillStyle(0x52e26a, 1);
            g.fillEllipse(x + dx - 10, bottom - 20 - stemH * 0.55, 16, 9);
            g.fillEllipse(x + dx + 10, bottom - 20 - stemH * 0.72, 16, 9);

            // Ripe red cherry tomatoes
            g.fillStyle(0xff4238, 1);
            g.fillCircle(x + dx - 7, bottom - 20 - stemH * 0.42, 6);
            g.fillCircle(x + dx + 8, bottom - 20 - stemH * 0.6, 6);
            g.fillStyle(0xff9e99, 0.85);
            g.fillCircle(x + dx - 9, bottom - 22 - stemH * 0.42, 2);
            g.fillCircle(x + dx + 6, bottom - 22 - stemH * 0.6, 2);
        });

        parent.add(g);
    }

    // =====================================================================
    // SOL 2 BRIEFING: DUST DEVIL CLEANUP
    // =====================================================================

    private clearSol2Tweens() {
        this.sol2Tweens.forEach((t) => t.remove());
        this.sol2Tweens = [];
    }

    private renderSol2Briefing() {
        const { root, colX, stageBottom, pillY } = this.buildThreeStageBriefingBase({
            solNumber: 2,
            titleText: "DUST DEVIL CLEANUP",
            subtitleText: "Dodging dust devils to clean the solar panels before sunset!",
            deployText: "🚀 DEPLOY TO SOL 2 MARTIAN SURFACE →",
            attributionText: "NASA Mars Solar Array & Dust Devil Atmospheric Dynamics",
            tweensList: this.sol2Tweens
        });

        // Step 1: Industrial wind-blower illustration
        this.drawWindBlower(root, colX[0], stageBottom - 6);

        // Step 2: Mars solar panel partly dusty & partly clean
        this.drawSolarPanelCleanup(root, colX[1], stageBottom - 6);

        // Step 3: Martian dust devil / tornado
        this.drawDustDevilVortex(root, colX[2], stageBottom - 6);

        this.renderStagePillsAndCaptions(root, colX, pillY, [
            { label: "USE BLOWER", caption: "Blast the red dust\nwith air", icon: "blower" },
            { label: "CLEAN PANELS", caption: "Restore power to\nthe base", icon: "solar" },
            { label: "DODGE DEVILS", caption: "Avoid bouncy\ndust devils", icon: "dustdevil" }
        ]);
    }

    private drawWindBlower(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();

        // Support stand
        g.fillStyle(0x3a4a5e, 1);
        g.fillRoundedRect(x - 54, bottom - 16, 68, 12, 4);
        g.fillRect(x - 32, bottom - 34, 14, 20);

        // Turbine motor housing (yellow/orange industrial casing)
        g.fillStyle(0xf59e0b, 1);
        g.fillCircle(x - 28, bottom - 56, 26);
        g.lineStyle(3, 0xfff3b0, 0.95);
        g.strokeCircle(x - 28, bottom - 56, 26);

        // Fan intake grille
        g.fillStyle(0x162840, 1);
        g.fillCircle(x - 28, bottom - 56, 15);
        g.lineStyle(2, 0x7be8ff, 0.9);
        g.strokeCircle(x - 28, bottom - 56, 15);
        g.lineBetween(x - 40, bottom - 56, x - 16, bottom - 56);
        g.lineBetween(x - 28, bottom - 68, x - 28, bottom - 44);

        // Tapered air nozzle pointing right
        g.fillStyle(0xe2e8f0, 1);
        g.beginPath();
        g.moveTo(x - 10, bottom - 72);
        g.lineTo(x + 36, bottom - 64);
        g.lineTo(x + 36, bottom - 48);
        g.lineTo(x - 10, bottom - 40);
        g.closePath();
        g.fillPath();
        g.lineStyle(2, 0x64748b, 1);
        g.strokePath();

        // Cyan wind gust streams blasting from nozzle
        g.lineStyle(3, 0x67e8f9, 0.95);
        g.beginPath();
        g.moveTo(x + 42, bottom - 62);
        g.lineTo(x + 76, bottom - 68);
        g.moveTo(x + 44, bottom - 56);
        g.lineTo(x + 84, bottom - 56);
        g.moveTo(x + 42, bottom - 50);
        g.lineTo(x + 76, bottom - 44);
        g.strokePath();

        parent.add(g);
    }

    private drawSolarPanelCleanup(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();

        // Mounting pedestal
        g.fillStyle(0x475569, 1);
        g.fillRect(x - 8, bottom - 34, 16, 30);
        g.fillRoundedRect(x - 28, bottom - 10, 56, 8, 3);

        // Angled solar array frame
        const px = x - 66;
        const py = bottom - 92;
        const pw = 132;
        const ph = 64;

        g.fillStyle(0x1e3a8a, 1);
        g.fillRoundedRect(px, py, pw, ph, 6);

        // Photovoltaic grid lines
        g.lineStyle(1.5, 0x60a5fa, 0.9);
        for (let c = 1; c < 4; c += 1) {
            g.lineBetween(px + (pw / 4) * c, py + 2, px + (pw / 4) * c, py + ph - 2);
        }
        g.lineBetween(px + 2, py + ph / 2, px + pw - 2, py + ph / 2);

        // Left half clean gleam
        g.fillStyle(0x38bdf8, 0.35);
        g.fillRect(px + 4, py + 4, pw / 2 - 6, ph - 8);

        // Right half coated in Martian red dust
        g.fillStyle(0xc85a32, 0.88);
        g.fillRoundedRect(px + pw / 2, py + 2, pw / 2 - 2, ph - 4, { tl: 0, tr: 5, bl: 0, br: 5 });
        g.fillStyle(0x9a3412, 0.75);
        g.fillCircle(px + pw * 0.72, py + 22, 10);
        g.fillCircle(px + pw * 0.84, py + 44, 12);
        g.fillCircle(px + pw * 0.62, py + 46, 8);

        // Outer metallic bezel
        g.lineStyle(3, 0xe2e8f0, 1);
        g.strokeRoundedRect(px, py, pw, ph, 6);

        // Sparkle star on cleaned left side
        g.fillStyle(0xfffbeb, 1);
        g.fillCircle(px + 24, py + 18, 4);
        g.lineStyle(2, 0x7dd3fc, 1);
        g.lineBetween(px + 16, py + 18, px + 32, py + 18);
        g.lineBetween(px + 24, py + 10, px + 24, py + 26);

        parent.add(g);
    }

    private drawDustDevilVortex(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const vortex = this.scene.add.container(x, 0);
        const g = this.scene.add.graphics();

        // Swirling conical Martian dust funnel (wide top -> narrow base)
        const tiers = [
            { y: bottom - 92, w: 92, h: 16, color: 0xe07a4f },
            { y: bottom - 76, w: 74, h: 15, color: 0xc85a32 },
            { y: bottom - 61, w: 58, h: 14, color: 0xde7245 },
            { y: bottom - 47, w: 44, h: 13, color: 0xb84a27 },
            { y: bottom - 34, w: 32, h: 12, color: 0xd96b3e },
            { y: bottom - 22, w: 22, h: 11, color: 0xa63e20 },
            { y: bottom - 11, w: 14, h: 9, color: 0xc85a32 }
        ];

        tiers.forEach((t, idx) => {
            const offset = idx % 2 === 0 ? -3 : 3;
            g.fillStyle(t.color, 0.94);
            g.fillEllipse(offset, t.y, t.w, t.h);
            g.lineStyle(1.5, 0xffb088, 0.65);
            g.strokeEllipse(offset, t.y, t.w, t.h);
        });

        // Kicked-up dust pebbles swirling around funnel
        g.fillStyle(0xffb088, 0.9);
        g.fillCircle(-48, bottom - 74, 3.5);
        g.fillCircle(46, bottom - 64, 3);
        g.fillCircle(-34, bottom - 40, 3);
        g.fillCircle(30, bottom - 28, 3.5);

        vortex.add(g);
        parent.add(vortex);

        this.sol2Tweens.push(this.scene.tweens.add({
            targets: vortex,
            x: x + 6,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        }));
    }

    // =====================================================================
    // SOL 3 BRIEFING: ECHOES FROM MARS (3-STAGE VISUAL BRIEFING)
    // =====================================================================

    private clearSol3Tweens() {
        this.sol3Tweens.forEach((t) => t.remove());
        this.sol3Tweens = [];
    }

    private renderSol3Briefing() {
        const { root, colX, stageBottom, pillY } = this.buildThreeStageBriefingBase({
            solNumber: 3,
            titleText: "ECHOES FROM MARS",
            subtitleText: "Connect to the orbital relay, command your rover, and transmit discoveries from the Martian canyon!",
            deployText: "🚀 DEPLOY TO SOL 3 MARTIAN SURFACE ➔",
            attributionText: "NASA Mars Relay Network • Autonomous Canyon Rover Telemetry",
            tweensList: this.sol3Tweens
        });

        // Stage 1: Orbital Relay Satellite + Glowing Radio Waves + Rover Transceiver Indicator
        this.drawOrbitalRelayStage(root, colX[0], stageBottom - 6);

        // Stage 2: Autonomous Mars Rover in Rocky Canyon + 5-Slot Command Queue Strip
        this.drawRoverCommandStage(root, colX[1], stageBottom - 6);

        // Stage 3: Geological Sample Collection + Data Packet Transmission to Orbit
        this.drawSampleTransmitStage(root, colX[2], stageBottom - 6);

        this.renderStagePillsAndCaptions(root, colX, pillY, [
            {
                label: "1. ESTABLISH SIGNAL",
                caption: "Connect the rover to\nthe orbital relay.",
                icon: "relay"
            },
            {
                label: "2. COMMAND ROVER",
                caption: "Queue commands and\nnavigate the canyon.",
                icon: "roverCmd"
            },
            {
                label: "3. TRANSMIT DATA",
                caption: "Collect samples and send\ndiscoveries to base.",
                icon: "transmit"
            }
        ]);
    }

    /**
     * Sol 3 Stage 1: Orbital relay satellite above Mars with glowing radio waves and signal link indicator
     */
    private drawOrbitalRelayStage(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        // Surface receiver beacon / transceiver base on pedestal
        const baseGfx = this.scene.add.graphics();
        baseGfx.fillStyle(0x1e3a5f, 1);
        baseGfx.fillRoundedRect(x - 38, bottom - 16, 76, 14, 5);
        baseGfx.lineStyle(2, 0x38bdf8, 0.9);
        baseGfx.strokeRoundedRect(x - 38, bottom - 16, 76, 14, 5);

        // Dish mast & receiver dish
        baseGfx.lineStyle(3, 0xcbe4ff, 1);
        baseGfx.lineBetween(x - 14, bottom - 16, x - 14, bottom - 30);
        baseGfx.beginPath();
        baseGfx.arc(x - 14, bottom - 32, 12, Math.PI * 1.1, Math.PI * 1.9, false);
        baseGfx.strokePath();

        // Signal strength indicator bars on right side of receiver unit
        const barColors = [0x2ee59d, 0x2ee59d, 0x2ee59d, 0x00e5ff];
        barColors.forEach((col, idx) => {
            baseGfx.fillStyle(col, 1);
            baseGfx.fillRoundedRect(x + 8 + idx * 6, bottom - 22 - idx * 3, 4, 6 + idx * 3, 1.5);
        });
        parent.add(baseGfx);

        // Pulsing cyan radio wave arcs linking receiver to orbital satellite
        const waves = this.scene.add.graphics();
        [0, 1, 2].forEach((idx) => {
            waves.lineStyle(2.5, 0x00f0ff, 0.92 - idx * 0.15);
            waves.beginPath();
            waves.arc(x - 8, bottom - 40 - idx * 14, 14 + idx * 6, Math.PI * 1.2, Math.PI * 1.8, false);
            waves.strokePath();
        });
        parent.add(waves);

        this.sol3Tweens.push(this.scene.tweens.add({
            targets: waves,
            alpha: { from: 1, to: 0.35 },
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        }));

        // Orbital relay satellite floating above
        const sat = this.scene.add.container(x + 6, bottom - 94);
        const sg = this.scene.add.graphics();

        // Solar array wings
        sg.fillStyle(0x1d4ed8, 1);
        sg.fillRoundedRect(-62, -10, 42, 20, 3);
        sg.fillRoundedRect(20, -10, 42, 20, 3);
        sg.lineStyle(1.5, 0x7dd3fc, 0.95);
        sg.strokeRoundedRect(-62, -10, 42, 20, 3);
        sg.strokeRoundedRect(20, -10, 42, 20, 3);
        sg.lineBetween(-41, -10, -41, 10);
        sg.lineBetween(41, -10, 41, 10);
        sg.lineBetween(-62, 0, -20, 0);
        sg.lineBetween(20, 0, 62, 0);

        // Satellite bus & gold parabolic dish
        sg.fillStyle(0xe2e8f0, 1);
        sg.fillRoundedRect(-15, -14, 30, 28, 6);
        sg.lineStyle(2, 0x64748b, 1);
        sg.strokeRoundedRect(-15, -14, 30, 28, 6);
        sg.fillStyle(0xf59e0b, 1);
        sg.fillCircle(0, 0, 7);

        // Downward dish emitter
        sg.lineStyle(2.5, 0x00e5ff, 1);
        sg.beginPath();
        sg.arc(-6, 18, 10, 0.15 * Math.PI, 0.85 * Math.PI, false);
        sg.strokePath();

        sat.add(sg);
        sat.setAngle(-16);
        parent.add(sat);

        this.sol3Tweens.push(this.scene.tweens.add({
            targets: sat,
            y: sat.y - 5,
            duration: 1900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        }));
    }

    /**
     * Sol 3 Stage 2: Mars rover navigating rocky canyon with visible 5-slot command queue
     */
    private drawRoverCommandStage(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();

        // Canyon rock formations flanking the rover path
        g.fillStyle(0x7c2d12, 0.95);
        g.fillTriangle(x - 78, bottom - 2, x - 62, bottom - 44, x - 42, bottom - 2);
        g.fillTriangle(x + 44, bottom - 2, x + 64, bottom - 48, x + 80, bottom - 2);
        g.fillStyle(0x9a3412, 0.95);
        g.fillTriangle(x - 64, bottom - 2, x - 50, bottom - 30, x - 34, bottom - 2);
        g.fillTriangle(x + 36, bottom - 2, x + 52, bottom - 32, x + 68, bottom - 2);

        // Dashed navigation trajectory arc in front of rover
        g.lineStyle(2, 0xffd23f, 0.9);
        g.lineBetween(x + 18, bottom - 14, x + 36, bottom - 18);
        g.fillStyle(0xffd23f, 1);
        g.fillTriangle(x + 42, bottom - 19, x + 34, bottom - 23, x + 35, bottom - 14);

        // Compact Mars Rover body in center
        g.fillStyle(0xf59e0b, 1);
        g.fillRoundedRect(x - 28, bottom - 34, 54, 18, 5);
        g.lineStyle(1.5, 0xfef3c7, 0.95);
        g.strokeRoundedRect(x - 28, bottom - 34, 54, 18, 5);

        // Camera mast & optical head
        g.fillStyle(0xe2e8f0, 1);
        g.fillRect(x + 8, bottom - 50, 5, 16);
        g.fillRoundedRect(x + 2, bottom - 58, 20, 11, 3);
        g.fillStyle(0x0ea5e9, 1);
        g.fillCircle(x + 16, bottom - 52, 3);

        // Three rocker-bogie wheels
        g.fillStyle(0x1e293b, 1);
        [-20, 0, 20].forEach((wx) => {
            g.fillCircle(x + wx, bottom - 11, 8);
            g.lineStyle(2, 0xfbbf24, 1);
            g.strokeCircle(x + wx, bottom - 11, 4.5);
        });

        // Floating 5-slot autonomous command queue strip above rover
        const queueW = 146;
        const queueH = 30;
        const qx = x - queueW / 2;
        const qy = bottom - 104;
        g.fillStyle(0x071d3d, 0.96);
        g.fillRoundedRect(qx, qy, queueW, queueH, 8);
        g.lineStyle(1.5, 0x00e5ff, 0.95);
        g.strokeRoundedRect(qx, qy, queueW, queueH, 8);

        const slotColors = [0x16805a, 0x16805a, 0x3b499c, 0xa67314, 0x16805a];
        const slotSymbols = ["⬆", "⬆", "↱", "📷", "🧪"];
        slotColors.forEach((sc, idx) => {
            const sx = qx + 7 + idx * 27;
            const sy = qy + 4;
            g.fillStyle(sc, 1);
            g.fillRoundedRect(sx, sy, 22, 22, 5);
        });

        parent.add(g);

        slotSymbols.forEach((sym, idx) => {
            const sx = qx + 18 + idx * 27;
            const sy = qy + 15;
            const txt = this.scene.add.text(sx, sy, sym, {
                fontSize: idx >= 3 ? "11px" : "13px",
                color: "#FFFFFF",
                fontStyle: "bold"
            }).setOrigin(0.5);
            parent.add(txt);
        });
    }

    /**
     * Sol 3 Stage 3: Geological sample collection + data packet transmitting up to orbital relay
     */
    private drawSampleTransmitStage(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();

        // Martian rock outcrop with glowing mineral vein on left
        g.fillStyle(0x8c3822, 1);
        g.fillRoundedRect(x - 68, bottom - 34, 48, 30, 10);
        g.lineStyle(2, 0xc2593f, 0.9);
        g.strokeRoundedRect(x - 68, bottom - 34, 48, 30, 10);
        g.fillStyle(0x38bdf8, 0.95);
        g.fillCircle(x - 46, bottom - 20, 6);
        g.fillCircle(x - 36, bottom - 15, 4);

        // Robotic sample arm reaching from canister to mineral rock
        g.lineStyle(4, 0xcbd5e1, 1);
        g.beginPath();
        g.moveTo(x - 10, bottom - 34);
        g.lineTo(x - 26, bottom - 44);
        g.lineTo(x - 42, bottom - 25);
        g.strokePath();
        g.fillStyle(0xf59e0b, 1);
        g.fillCircle(x - 26, bottom - 44, 4.5);

        // Geological Sample Containment Tube / Cylinder
        g.fillStyle(0x1e3a5f, 1);
        g.fillRoundedRect(x - 14, bottom - 54, 32, 50, 7);
        g.lineStyle(2, 0x7dd3fc, 1);
        g.strokeRoundedRect(x - 14, bottom - 54, 32, 50, 7);

        // Glowing cyan core sample inside canister
        g.fillStyle(0x00f0ff, 0.85);
        g.fillRoundedRect(x - 8, bottom - 42, 20, 28, 4);
        g.fillStyle(0xf59e0b, 1);
        g.fillRoundedRect(x - 16, bottom - 60, 36, 8, 3);

        // Orbital relay icon at top-right receiving the transmission
        g.fillStyle(0x1d4ed8, 1);
        g.fillRect(x + 28, bottom - 106, 16, 10);
        g.fillRect(x + 56, bottom - 106, 16, 10);
        g.fillStyle(0xe2e8f0, 1);
        g.fillRoundedRect(x + 44, bottom - 108, 12, 14, 3);

        // Dashed uplink beam from sample canister to satellite
        g.lineStyle(2, 0x5ef6ff, 0.85);
        g.lineBetween(x + 12, bottom - 62, x + 44, bottom - 92);

        parent.add(g);

        // Animated scientific DATA packet traveling along the uplink beam
        const packet = this.scene.add.container(x + 20, bottom - 70);
        const pktBg = this.scene.add.graphics();
        pktBg.fillStyle(0x06284d, 0.96);
        pktBg.fillRoundedRect(-22, -11, 44, 22, 6);
        pktBg.lineStyle(1.5, 0xffd23f, 1);
        pktBg.strokeRoundedRect(-22, -11, 44, 22, 6);
        const pktTxt = this.scene.add.text(0, 0, "DATA", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            fontStyle: "bold",
            color: "#FFD23F"
        }).setOrigin(0.5);
        packet.add([pktBg, pktTxt]);
        parent.add(packet);

        this.sol3Tweens.push(this.scene.tweens.add({
            targets: packet,
            x: x + 36,
            y: bottom - 86,
            duration: 1300,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        }));
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

        const areaX = frameX + SOL_AREA_SIDE_MARGIN;
        const areaY = frameY + SOL_AREA_TOP;
        const W = MODAL_W - SOL_AREA_SIDE_MARGIN * 2;            // 1128
        const H = MODAL_H - SOL_AREA_TOP - SOL_AREA_BOTTOM_MARGIN; // 504
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

    // =====================================================================
    // SOL 5 BRIEFING: THE LAST SAFE HABITAT (3-STAGE VISUAL BRIEFING)
    // =====================================================================

    private clearSol5Tweens() {
        this.sol5Tweens.forEach((t) => t.remove());
        this.sol5Tweens = [];
    }

    private renderSol5Briefing() {
        const { root, colX, stageBottom, pillY } = this.buildThreeStageBriefingBase({
            solNumber: 5,
            titleText: "THE LAST SAFE HABITAT",
            subtitleText: "Repair the damaged habitat, restore life-support systems, and save the Mars colony!",
            deployText: "🚀 DEPLOY TO SOL 5 – SAVE THE HABITAT →",
            attributionText: "NASA Mars Habitat Life-Support & Structural Integrity Protocol",
            tweensList: this.sol5Tweens
        });

        // Stage 1: Storm-damaged Mars habitat with hull cracks, leaking O2 pipe, red warning lights & astronaut inspector
        this.drawDamagedHabitat(root, colX[0], stageBottom - 6);

        // Stage 2: Four-system engineering repair station (pipes, circuit board, pressure valve, hull patches)
        this.drawHabitatRepairStation(root, colX[1], stageBottom - 6);

        // Stage 3: Fully restored habitat dome with green status lights, flowing O2, stable pressure & celebrating astronaut
        this.drawRestoredHabitat(root, colX[2], stageBottom - 6);

        this.renderStagePillsAndCaptions(root, colX, pillY, [
            {
                label: "INSPECT HABITAT",
                caption: "Identify damaged systems\nand locate critical failures.",
                icon: "inspectHabitat"
            },
            {
                label: "REPAIR SYSTEMS",
                caption: "Fix air leaks, reconnect\ncircuits, regulate pressure,\nand repair structural damage.",
                icon: "repairSystems"
            },
            {
                label: "SAVE THE COLONY",
                caption: "Restore life support and\nstabilize the Mars habitat.",
                icon: "saveColony"
            }
        ]);
    }

    /**
     * Sol 5 Stage 1: Storm-damaged Mars habitat with hull cracks, leaking O2 pipe, red emergency lights & inspecting astronaut
     */
    private drawDamagedHabitat(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();

        // Dust storm debris & wind-blown Martian regolith around habitat base
        g.fillStyle(0xb4532a, 0.72);
        g.fillEllipse(x - 52, bottom - 6, 44, 14);
        g.fillEllipse(x + 48, bottom - 5, 50, 14);
        g.fillStyle(0xd97742, 0.55);
        g.fillEllipse(x - 10, bottom - 4, 88, 12);

        // Damaged habitat dome & reinforced lower bulkhead
        g.fillStyle(0x2a3b52, 1);
        g.beginPath();
        g.arc(x - 10, bottom - 18, 52, Math.PI, 0, false);
        g.closePath();
        g.fillPath();
        g.lineStyle(2.5, 0x94a3b8, 0.9);
        g.beginPath();
        g.arc(x - 10, bottom - 18, 52, Math.PI, 0, false);
        g.strokePath();

        // Habitat metallic base ring & airlock door
        g.fillStyle(0x475569, 1);
        g.fillRoundedRect(x - 64, bottom - 22, 108, 18, 5);
        g.lineStyle(2, 0x64748b, 1);
        g.strokeRoundedRect(x - 64, bottom - 22, 108, 18, 5);

        // Damaged airlock window (dim / flickering)
        g.fillStyle(0x1e293b, 1);
        g.fillRoundedRect(x - 24, bottom - 44, 24, 22, 4);
        g.lineStyle(1.5, 0xf87171, 0.9);
        g.strokeRoundedRect(x - 24, bottom - 44, 24, 22, 4);

        // Jagged structural cracks across habitat dome walls
        g.lineStyle(2.5, 0x0f172a, 1);
        g.beginPath();
        g.moveTo(x - 42, bottom - 46);
        g.lineTo(x - 32, bottom - 36);
        g.lineTo(x - 37, bottom - 27);
        g.lineTo(x - 28, bottom - 20);
        g.strokePath();

        g.beginPath();
        g.moveTo(x + 12, bottom - 54);
        g.lineTo(x + 4, bottom - 42);
        g.lineTo(x + 11, bottom - 34);
        g.lineTo(x + 3, bottom - 24);
        g.strokePath();

        // Ruptured external oxygen pipe on left wall
        g.fillStyle(0x64748b, 1);
        g.fillRect(x - 74, bottom - 40, 14, 8);
        g.fillRect(x - 74, bottom - 40, 7, 22);
        g.lineStyle(2, 0x38bdf8, 0.9);
        g.lineBetween(x - 74, bottom - 36, x - 62, bottom - 36);

        // Damaged sparking electrical panel on right side of habitat
        g.fillStyle(0x1e293b, 1);
        g.fillRoundedRect(x + 24, bottom - 42, 20, 22, 3);
        g.lineStyle(1.5, 0xf59e0b, 1);
        g.strokeRoundedRect(x + 24, bottom - 42, 20, 22, 3);
        // Loose dangling wire
        g.lineStyle(1.5, 0xfacc15, 1);
        g.beginPath();
        g.moveTo(x + 34, bottom - 28);
        g.lineTo(x + 42, bottom - 22);
        g.lineTo(x + 38, bottom - 15);
        g.strokePath();

        // Compact astronaut figure inspecting the habitat on the right
        const ax = x + 62;
        // Backpack & spacesuit torso
        g.fillStyle(0xcbd5e1, 1);
        g.fillRoundedRect(ax - 9, bottom - 32, 6, 14, 2);
        g.fillStyle(0xf8fafc, 1);
        g.fillRoundedRect(ax - 5, bottom - 34, 13, 18, 4);
        // Legs
        g.fillRect(ax - 4, bottom - 16, 5, 13);
        g.fillRect(ax + 2, bottom - 16, 5, 13);
        // Helmet & gold visor facing left toward habitat
        g.fillCircle(ax + 1, bottom - 41, 8);
        g.fillStyle(0xf59e0b, 1);
        g.fillRoundedRect(ax - 6, bottom - 44, 9, 6, 2);
        // Scanner beam from astronaut's hand toward crack
        g.lineStyle(1.5, 0x38bdf8, 0.75);
        g.lineBetween(ax - 6, bottom - 26, x + 28, bottom - 32);

        parent.add(g);

        // Animated red emergency warning beacon + glow
        const alertGlow = this.scene.add.circle(x - 10, bottom - 73, 12, 0xff3b30, 0.35);
        const alertLight = this.scene.add.circle(x - 10, bottom - 73, 5, 0xff3b30, 1);
        parent.add([alertGlow, alertLight]);

        this.sol5Tweens.push(this.scene.tweens.add({
            targets: [alertGlow, alertLight],
            alpha: { from: 1, to: 0.2 },
            scale: { from: 1.15, to: 0.8 },
            duration: 550,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        }));

        // Animated escaping oxygen gas puffs from ruptured pipe
        const leakCloud = this.scene.add.graphics();
        leakCloud.fillStyle(0x7dd3fc, 0.78);
        leakCloud.fillCircle(x - 78, bottom - 44, 4);
        leakCloud.fillCircle(x - 84, bottom - 52, 5.5);
        leakCloud.fillCircle(x - 76, bottom - 60, 4.5);
        parent.add(leakCloud);

        this.sol5Tweens.push(this.scene.tweens.add({
            targets: leakCloud,
            y: -7,
            alpha: { from: 0.9, to: 0.2 },
            duration: 950,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        }));
    }

    /**
     * Sol 5 Stage 2: Engineering repair station with 4 visible subsystems:
     * 1) Oxygen pipes, 2) Circuit board, 3) Pressure control valve, 4) Structural repair patches
     */
    private drawHabitatRepairStation(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();

        // Engineering repair console frame
        const bx = x - 78;
        const by = bottom - 98;
        const bw = 156;
        const bh = 90;

        g.fillStyle(0x0b1f3a, 0.96);
        g.fillRoundedRect(bx, by, bw, bh, 9);
        g.lineStyle(2, 0x00e5ff, 0.95);
        g.strokeRoundedRect(bx, by, bw, bh, 9);

        // Center divider cross separating the 4 engineering subsystems
        g.lineStyle(1, 0x1e4976, 0.9);
        g.lineBetween(x, by + 6, x, by + bh - 6);
        g.lineBetween(bx + 6, by + bh / 2, bx + bw - 6, by + bh / 2);

        // --- Quadrant 1 (Top-Left): Oxygen Pipes & Coupler ---
        const q1x = bx + 39;
        const q1y = by + 23;
        g.fillStyle(0x475569, 1);
        g.fillRoundedRect(q1x - 28, q1y - 5, 22, 10, 2);
        g.fillRoundedRect(q1x + 6, q1y - 5, 22, 10, 2);
        // Glowing cyan O2 flow inside pipes
        g.fillStyle(0x38bdf8, 1);
        g.fillRect(q1x - 25, q1y - 2, 16, 4);
        g.fillRect(q1x + 9, q1y - 2, 16, 4);
        // Yellow repair connector collar in middle
        g.fillStyle(0xf59e0b, 1);
        g.fillRoundedRect(q1x - 7, q1y - 8, 14, 16, 3);
        g.lineStyle(1.5, 0xfef08a, 1);
        g.strokeRoundedRect(q1x - 7, q1y - 8, 14, 16, 3);

        // --- Quadrant 2 (Top-Right): Electrical Circuit Board ---
        const q2x = bx + 117;
        const q2y = by + 23;
        g.fillStyle(0x064e3b, 1);
        g.fillRoundedRect(q2x - 26, q2y - 14, 52, 28, 4);
        g.lineStyle(1.5, 0x34d399, 0.9);
        g.strokeRoundedRect(q2x - 26, q2y - 14, 52, 28, 4);
        // Gold circuit traces & microchip
        g.lineStyle(1.5, 0xfbbf24, 1);
        g.lineBetween(q2x - 20, q2y - 6, q2x - 6, q2y - 6);
        g.lineBetween(q2x + 6, q2y + 6, q2x + 20, q2y + 6);
        g.lineBetween(q2x - 16, q2y + 7, q2x - 6, q2y + 7);
        g.fillStyle(0x1e293b, 1);
        g.fillRect(q2x - 7, q2y - 7, 14, 14);
        g.lineStyle(1, 0x38bdf8, 1);
        g.strokeRect(q2x - 7, q2y - 7, 14, 14);

        // --- Quadrant 3 (Bottom-Left): Oxygen Pressure Control Valve ---
        const q3x = bx + 39;
        const q3y = by + 67;
        // Pipe & circular pressure gauge + red/amber valve wheel
        g.fillStyle(0x64748b, 1);
        g.fillRect(q3x - 26, q3y + 4, 52, 7);
        g.fillStyle(0x0f172a, 1);
        g.fillCircle(q3x - 10, q3y - 4, 11);
        g.lineStyle(2, 0x38bdf8, 1);
        g.strokeCircle(q3x - 10, q3y - 4, 11);
        // Gauge needle pointing to green zone
        g.lineStyle(2, 0x22c55e, 1);
        g.lineBetween(q3x - 10, q3y - 4, q3x - 4, q3y - 10);
        // Valve handwheel
        g.lineStyle(2.5, 0xf97316, 1);
        g.strokeCircle(q3x + 15, q3y - 3, 9);
        g.lineBetween(q3x + 6, q3y - 3, q3x + 24, q3y - 3);
        g.lineBetween(q3x + 15, q3y - 12, q3x + 15, q3y + 6);

        // --- Quadrant 4 (Bottom-Right): Structural Repair Patches & Wrench ---
        const q4x = bx + 117;
        const q4y = by + 67;
        // Metal hull patch plate with corner rivets
        g.fillStyle(0x94a3b8, 1);
        g.fillRoundedRect(q4x - 24, q4y - 12, 34, 24, 3);
        g.lineStyle(1.5, 0xe2e8f0, 1);
        g.strokeRoundedRect(q4x - 24, q4y - 12, 34, 24, 3);
        g.fillStyle(0x1e293b, 1);
        [[-19, -8], [5, -8], [-19, 8], [5, 8]].forEach(([rx, ry]) => {
            g.fillCircle(q4x + rx, q4y + ry, 1.8);
        });
        // Repair wrench beside patch
        g.lineStyle(3.5, 0xfbbf24, 1);
        g.lineBetween(q4x + 16, q4y + 10, q4x + 24, q4y - 8);
        g.fillStyle(0xfbbf24, 1);
        g.fillCircle(q4x + 24, q4y - 9, 4.5);

        parent.add(g);

        // Subtle animated cyan electrical spark on circuit board
        const spark = this.scene.add.graphics();
        spark.lineStyle(2, 0x00f0ff, 1);
        spark.lineBetween(q2x + 10, q2y - 10, q2x + 16, q2y - 4);
        spark.lineBetween(q2x + 16, q2y - 10, q2x + 10, q2y - 4);
        parent.add(spark);

        this.sol5Tweens.push(this.scene.tweens.add({
            targets: spark,
            alpha: { from: 1, to: 0.15 },
            duration: 420,
            yoyo: true,
            repeat: -1,
            ease: "Quad.easeInOut"
        }));
    }

    /**
     * Sol 5 Stage 3: Restored, pressurized Mars habitat dome with green indicators, flowing O2 & celebrating astronaut
     */
    private drawRestoredHabitat(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();

        // Outer protective shield dome glow
        g.fillStyle(0x38bdf8, 0.16);
        g.beginPath();
        g.arc(x - 10, bottom - 16, 64, Math.PI, 0, false);
        g.closePath();
        g.fillPath();
        g.lineStyle(2, 0x38bdf8, 0.85);
        g.beginPath();
        g.arc(x - 10, bottom - 16, 64, Math.PI, 0, false);
        g.strokePath();

        // Repaired futuristic habitat shell
        g.fillStyle(0x1e3a5f, 1);
        g.beginPath();
        g.arc(x - 10, bottom - 18, 52, Math.PI, 0, false);
        g.closePath();
        g.fillPath();
        g.lineStyle(2.5, 0x7dd3fc, 1);
        g.beginPath();
        g.arc(x - 10, bottom - 18, 52, Math.PI, 0, false);
        g.strokePath();

        // Reinforced base platform
        g.fillStyle(0x334155, 1);
        g.fillRoundedRect(x - 66, bottom - 22, 112, 18, 5);
        g.lineStyle(2, 0x22c55e, 0.95);
        g.strokeRoundedRect(x - 66, bottom - 22, 112, 18, 5);

        // Warmly illuminated habitat windows & airlock
        g.fillStyle(0xfef08a, 0.92);
        g.fillRoundedRect(x - 24, bottom - 44, 24, 22, 4);
        g.lineStyle(2, 0x22c55e, 1);
        g.strokeRoundedRect(x - 24, bottom - 44, 24, 22, 4);

        g.fillStyle(0x7dd3fc, 0.9);
        g.fillCircle(x - 40, bottom - 34, 6);
        g.fillCircle(x + 18, bottom - 34, 6);

        // Transparent intact oxygen supply pipe on left with glowing O2 stream
        g.lineStyle(6, 0x94a3b8, 0.85);
        g.beginPath();
        g.moveTo(x - 76, bottom - 16);
        g.lineTo(x - 76, bottom - 40);
        g.lineTo(x - 58, bottom - 40);
        g.strokePath();
        g.lineStyle(3, 0x00f0ff, 1);
        g.beginPath();
        g.moveTo(x - 76, bottom - 16);
        g.lineTo(x - 76, bottom - 40);
        g.lineTo(x - 58, bottom - 40);
        g.strokePath();

        // Green operational beacon on roof & stable pressure gauge badge on right
        g.fillStyle(0x22c55e, 1);
        g.fillCircle(x - 10, bottom - 74, 5.5);

        // Stable green pressure gauge indicator on right wall
        g.fillStyle(0x06281e, 1);
        g.fillCircle(x + 34, bottom - 34, 10);
        g.lineStyle(2, 0x22c55e, 1);
        g.strokeCircle(x + 34, bottom - 34, 10);
        g.lineStyle(2, 0x4ade80, 1);
        g.lineBetween(x + 34, bottom - 34, x + 34, bottom - 41);

        parent.add(g);

        // Celebrating astronaut with raised arms beside the restored habitat
        const celebAstro = this.scene.add.container(x + 64, bottom - 22);
        const ag = this.scene.add.graphics();
        // Spacesuit body & legs
        ag.fillStyle(0xf8fafc, 1);
        ag.fillRoundedRect(-6, -12, 12, 17, 4);
        ag.fillRect(-5, 5, 4, 13);
        ag.fillRect(1, 5, 4, 13);
        // Raised celebrating arms
        ag.lineStyle(3.5, 0xf8fafc, 1);
        ag.lineBetween(-6, -8, -14, -19);
        ag.lineBetween(6, -8, 14, -19);
        // Helmet & gold visor
        ag.fillCircle(0, -19, 8);
        ag.fillStyle(0xf59e0b, 1);
        ag.fillRoundedRect(-5, -22, 10, 6, 2);
        celebAstro.add(ag);
        parent.add(celebAstro);

        this.sol5Tweens.push(this.scene.tweens.add({
            targets: celebAstro,
            y: celebAstro.y - 5,
            duration: 850,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        }));
    }

    private drawStageIcon(g: Phaser.GameObjects.Graphics, icon: StagePillIcon, x: number, y: number) {
        if (icon === "oxygen") {
            g.lineStyle(3, 0x75e8ff, 1);
            g.lineBetween(x - 12, y - 7, x + 10, y - 7);
            g.lineBetween(x - 16, y, x + 14, y);
            g.lineBetween(x - 10, y + 7, x + 8, y + 7);
        } else if (icon === "water") {
            g.fillStyle(0x62dfff, 1);
            g.fillCircle(x, y + 3, 8);
            g.fillTriangle(x, y - 13, x - 7, y, x + 7, y);
        } else if (icon === "pipe") {
            g.lineStyle(3.5, 0x75e8ff, 1);
            g.beginPath();
            g.moveTo(x - 12, y + 4);
            g.lineTo(x - 2, y + 4);
            g.lineTo(x - 2, y - 6);
            g.lineTo(x + 12, y - 6);
            g.strokePath();
        } else if (icon === "blower") {
            g.fillStyle(0xf59e0b, 1);
            g.fillCircle(x - 6, y, 7);
            g.lineStyle(2.5, 0x75e8ff, 1);
            g.lineBetween(x + 3, y - 4, x + 14, y - 6);
            g.lineBetween(x + 4, y, x + 16, y);
            g.lineBetween(x + 3, y + 4, x + 14, y + 6);
        } else if (icon === "solar") {
            g.fillStyle(0x38bdf8, 1);
            g.fillRoundedRect(x - 12, y - 8, 24, 16, 3);
            g.lineStyle(1.5, 0xffffff, 0.9);
            g.strokeRoundedRect(x - 12, y - 8, 24, 16, 3);
            g.lineBetween(x, y - 8, x, y + 8);
            g.lineBetween(x - 12, y, x + 12, y);
        } else if (icon === "dustdevil") {
            g.lineStyle(2.5, 0xff9a62, 1);
            g.strokeEllipse(x, y - 6, 20, 6);
            g.strokeEllipse(x, y, 14, 5);
            g.strokeEllipse(x, y + 6, 8, 4);
        } else if (icon === "relay") {
            // Orbital dish + signal waves icon
            g.lineStyle(2.5, 0x00e5ff, 1);
            g.beginPath();
            g.arc(x - 3, y + 2, 9, Math.PI * 1.15, Math.PI * 1.85, false);
            g.strokePath();
            g.beginPath();
            g.arc(x - 3, y + 2, 14, Math.PI * 1.2, Math.PI * 1.8, false);
            g.strokePath();
            g.fillStyle(0xffd23f, 1);
            g.fillCircle(x - 3, y + 6, 3);
        } else if (icon === "roverCmd") {
            // Rover wheel + directional command arrow icon
            g.fillStyle(0xf59e0b, 1);
            g.fillRoundedRect(x - 11, y - 6, 18, 9, 3);
            g.fillStyle(0x75e8ff, 1);
            g.fillCircle(x - 7, y + 6, 3.5);
            g.fillCircle(x + 3, y + 6, 3.5);
            g.lineStyle(2, 0x52e26a, 1);
            g.lineBetween(x + 9, y + 2, x + 15, y - 4);
            g.lineBetween(x + 11, y - 4, x + 15, y - 4);
            g.lineBetween(x + 15, y - 4, x + 15, y);
        } else if (icon === "transmit") {
            // Sample canister + upward data arrow icon
            g.fillStyle(0x38bdf8, 1);
            g.fillRoundedRect(x - 10, y - 4, 10, 13, 2);
            g.lineStyle(2.5, 0xffd23f, 1);
            g.lineBetween(x + 6, y + 7, x + 6, y - 7);
            g.lineBetween(x + 2, y - 3, x + 6, y - 7);
            g.lineBetween(x + 10, y - 3, x + 6, y - 7);
        } else if (icon === "inspectHabitat") {
            // Magnifying glass + red emergency alert dot
            g.lineStyle(2.5, 0x75e8ff, 1);
            g.strokeCircle(x - 3, y - 2, 7);
            g.lineBetween(x + 2, y + 3, x + 10, y + 10);
            g.fillStyle(0xff4d4f, 1);
            g.fillCircle(x - 3, y - 2, 3);
        } else if (icon === "repairSystems") {
            // Engineering wrench icon
            g.lineStyle(3, 0xffc928, 1);
            g.lineBetween(x - 8, y + 8, x + 7, y - 7);
            g.fillStyle(0xffc928, 1);
            g.fillCircle(x + 8, y - 8, 4.5);
            g.fillStyle(0x062346, 1);
            g.fillCircle(x + 9, y - 9, 2);
        } else if (icon === "saveColony") {
            // Protected habitat dome with green operational check/dot
            g.lineStyle(2.5, 0x52e26a, 1);
            g.beginPath();
            g.arc(x, y + 5, 11, Math.PI, 0, false);
            g.strokePath();
            g.lineBetween(x - 12, y + 5, x + 12, y + 5);
            g.fillStyle(0x52e26a, 1);
            g.fillCircle(x, y - 1, 3.5);
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
            case 5: return "Sol5LastSafeHabitatScene";
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
                stateRecord.currentVal = Math.min(4, stateRecord.currentVal + 1);
                stateRecord.completed = stateRecord.currentVal >= 4;
                break;
            case 3:
                this.launchSolScene(3);
                return;
            case 4:
                stateRecord.currentVal = Math.min(3, stateRecord.currentVal + 1);
                break;
            case 5:
                stateRecord.currentVal = Math.min(4, stateRecord.currentVal + 1);
                stateRecord.completed = stateRecord.currentVal >= 4;
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
                stateRecord.currentVal = Math.min(4, stateRecord.currentVal + 1);
                stateRecord.completed = stateRecord.currentVal >= 4;
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
            "Sol5SilenceCommsLagScene",
            "Sol5LastSafeHabitatScene"
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
        this.clearSol1Tweens();
        this.clearSol2Tweens();
        this.clearSol3Tweens();
        this.clearSol4Tweens();
        this.clearSol5Tweens();
        this.sol4WeatherAbort?.abort();
        this.sol4WeatherTitle = undefined;
        this.sol4WeatherDetail = undefined;
        this.scene.scale.off("fullscreenchange", this.updateFullscreenLabel, this);
        this.container.destroy();
        this.callbacks.onClose();
    }
}

export default MissionChallengesModal;