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

/** Shared modal frame size (the frame is drawn in init(); Sol 4 lays itself out inside it). */
const MODAL_W = 1160;
const MODAL_H = 640;
/** Tabs occupy frameY+70 .. frameY+110, so the Sol 4 area starts below them. */
const SOL4_AREA_TOP = 120;
const SOL4_AREA_BOTTOM_MARGIN = 16;
const SOL4_AREA_SIDE_MARGIN = 16;

export class MissionChallengesModal {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private callbacks: MissionChallengeCallbacks;

    private currentSolTab: number = 1;
    private activeSolData: Record<number, { currentVal: number; completed: boolean }> = {
        1: { currentVal: 0, completed: false },    // 0% water flow
        2: { currentVal: 0, completed: false },    // 0% perchlorate in cabin
        3: { currentVal: 0, completed: false },    // 0 = solar uncleaned / kilopower offline
        4: { currentVal: 1, completed: false },    // ISRU systems active
        5: { currentVal: 2, completed: false },    // 2 commands queued
    };

    private contentContainer!: Phaser.GameObjects.Container;
    private tabButtons: Phaser.GameObjects.Container[] = [];

    // Graphical briefing state (Sol 1, Sol 2, Sol 4)
    private nasaWeatherTitle?: Phaser.GameObjects.Text;
    private nasaWeatherDetail?: Phaser.GameObjects.Text;
    private nasaWeatherRequested = false;
    private nasaWeatherStatus: { detail: string; color: string } = { detail: "Loading NASA data...", color: "#d8efff" };
    private nasaWeatherAbort?: AbortController;
    private briefingTweens: Phaser.Tweens.Tween[] = [];
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
            title: "SOL 3: THE RED GALE",
            codename: "DUST STORM & KILOPOWER",
            icon: "⚛️",
            hazardBadge: "EXTREME DUST STORM (75% SOLAR LOSS)",
            briefing: "A blinding regional dust storm has swept over Jezero Crater. Solar irradiance dropped from 15.0 kW to 3.75 kW. Deploy and activate the KRUSTY 10 kW Stirling nuclear fission reactor before the habitat freezes!",
            nasaFact: "NASA Opportunity rover died in 2018 when a global dust storm cut sunlight. NASA built the Kilopower (KRUSTY) reactor to guarantee 10 kW continuous nuclear power.",
            primaryTarget: "Deploy 10 kW Kilopower fission reactor and clean solar array.",
            progressMetric: "Reactor Output",
            currentVal: 0,
            targetVal: 10,
            unit: "kW",
            actionButtonText: "⚛️ DEPLOY KILOPOWER REACTOR (+10 kW)",
            secondaryActionText: "🧹 SCRAPE DUST OFF SOLAR GLASS"
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

        // 1. Dimmed Modal Backdrop
        const backdrop = this.scene.add.rectangle(0, 0, width, height, 0x040914, 0.94).setOrigin(0);
        backdrop.setInteractive();
        this.container.add(backdrop);

        // 2. Main High-Tech Frame (1160 x 640)
        const frameW = MODAL_W;
        const frameH = MODAL_H;
        const frameX = (width - frameW) / 2;
        const frameY = (height - frameH) / 2;

        const frameBg = this.scene.add.graphics();
        frameBg.fillStyle(UITheme.colors.panelBg, 0.98);
        frameBg.fillRoundedRect(frameX, frameY, frameW, frameH, UITheme.layout.cardRadius);
        frameBg.lineStyle(2, UITheme.colors.primaryCyan, 0.9);
        frameBg.strokeRoundedRect(frameX, frameY, frameW, frameH, UITheme.layout.cardRadius);

        // Top Header Accent Bar
        frameBg.fillStyle(UITheme.colors.cardSelected, 0.5);
        frameBg.fillRoundedRect(frameX, frameY, frameW, 56, { tl: 16, tr: 16, bl: 0, br: 0 });
        this.container.add(frameBg);

        // Header Title
        const headerTitle = this.scene.add.text(frameX + 24, frameY + 10, "ASTRANEXUS\n→ SOL SURVIVOR ←", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 1.5,
            lineSpacing: -2
        });
        this.container.add(headerTitle);

        // Close Button (Top-Right)
        const closeBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: frameX + frameW - 74,
            y: frameY + 28,
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
        this.createSolTabs(frameX + 300, frameY + 70, frameW - 324);

        // 4. Dynamic Content Container (re-drawn when switching Sols)
        this.contentContainer = this.scene.add.container(0, 0);
        this.container.add(this.contentContainer);

        // Render Initial Active Sol
        this.renderSolChallenge(this.currentSolTab);
    }

    /**
     * Renders Sol 1 - Sol 5 interactive navigation buttons
     */
    private createSolTabs(startX: number, y: number, totalWidth: number) {
        const tabCount = 5;
        const tabSpacing = 8;
        const tabW = (totalWidth - (tabSpacing * (tabCount - 1))) / tabCount;
        const tabH = 40;

        for (let i = 1; i <= tabCount; i++) {
            const tabX = startX + (i - 1) * (tabW + tabSpacing) + tabW / 2;
            const isSelected = i === this.currentSolTab;
            const data = this.challenges[i];

            const tabContainer = this.scene.add.container(tabX, y + tabH / 2);

            const bg = this.scene.add.graphics();
            this.drawTabBackground(bg, tabW, tabH, isSelected, false);
            tabContainer.add(bg);

            const label = this.scene.add.text(0, 0, `${data.icon} SOL ${i}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "13px",
                color: isSelected ? "#0E1A32" : UITheme.colors.textSecondary,
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
        isHovered: boolean = false
    ) {
        g.clear();
        if (isSelected) {
            g.fillStyle(UITheme.colors.solarGold, 0.95);
            g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
            g.lineStyle(2, UITheme.colors.marsAmber, 1);
            g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
        } else if (isHovered) {
            g.fillStyle(UITheme.colors.cardHover, 0.85);
            g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
            g.lineStyle(1.5, UITheme.colors.marsAmber, 0.9);
            g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
        } else {
            g.fillStyle(UITheme.colors.cardBg, 0.7);
            g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
            g.lineStyle(1, UITheme.colors.panelBorder, 0.8);
            g.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
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

            this.drawTabBackground(bg, tabContainer.width || 120, 40, isSelected, false);
            label.setColor(isSelected ? "#0E1A32" : UITheme.colors.textSecondary);
        });

        // Re-render Challenge details
        this.renderSolChallenge(sol);
    }

    /**
     * Renders the full 2-column detailed view for the active Sol
     */
    private renderSolChallenge(sol: number) {
        // Stop any active briefing tweens BEFORE their targets are destroyed by removeAll(true)
        this.clearBriefingTweens();
        this.nasaWeatherTitle = undefined;
        this.nasaWeatherDetail = undefined;
        this.contentContainer.removeAll(true);

        if (sol === 1 || sol === 2 || sol === 4) {
            this.renderGraphicalBriefing(sol);
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
        leftBg.fillStyle(UITheme.colors.cardBg, 0.85);
        leftBg.fillRoundedRect(leftX, topY, colW, colH, 12);
        leftBg.lineStyle(1, UITheme.colors.panelBorder, 0.9);
        leftBg.strokeRoundedRect(leftX, topY, colW, colH, 12);
        this.contentContainer.add(leftBg);

        // Title & Codename
        const titleText = this.scene.add.text(leftX + 20, topY + 18, data.title, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "20px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 1.5,
            wordWrap: { width: colW - 40 }
        });
        this.contentContainer.add(titleText);

        const codename = this.scene.add.text(leftX + 20, topY + 48, `MISSION CODENAME: [ ${data.codename} ]`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            letterSpacing: 1,
            wordWrap: { width: colW - 40 }
        });
        this.contentContainer.add(codename);

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
            fontSize: "14px",
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
        rightBg.fillStyle(UITheme.colors.cardBg, 0.85);
        rightBg.fillRoundedRect(rightX, topY, colW, colH, 12);
        rightBg.lineStyle(1, UITheme.colors.panelBorder, 0.9);
        rightBg.strokeRoundedRect(rightX, topY, colW, colH, 12);
        this.contentContainer.add(rightBg);

        // Challenge Objectives Header
        const rightTitle = this.scene.add.text(rightX + 20, topY + 18, "MISSION CHALLENGE & CONTROLS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13.5px",
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
            fontSize: "13px",
            color: "#FFFFFF",
            wordWrap: { width: colW - 70 }
        });
        this.contentContainer.add(targetDesc);

        // Live Progress Gauge
        const gaugeY = topY + 150;
        const progressPct = Math.min(1.0, stateRecord.currentVal / data.targetVal);

        const metricTitle = this.scene.add.text(rightX + 20, gaugeY, `${data.progressMetric.toUpperCase()}: ${stateRecord.currentVal} / ${data.targetVal} ${data.unit}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
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
            fontSize: "14px",
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
    }

    // =====================================================================
    // SOL 4 BRIEFING
    // Everything is drawn inside a single child container positioned at the
    // top-left of the content area (below the Sol tabs, inside the modal
    // frame). All coordinates below are LOCAL to that area (0..W, 0..H), so
    // nothing can overlap the header or tabs.
    // =====================================================================

    private clearBriefingTweens() {
        this.briefingTweens.forEach((t) => t.remove());
        this.briefingTweens = [];
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



    // =====================================================================
    // UNIFIED GRAPHICAL MISSION BRIEFING (SOL 1, SOL 2, SOL 4)
    // Starry space, NASA Jezero terrain, Mars planet, NASA Space Weather,
    // Cadet Astronaut & Rover, 3 interactive mission stages on pedestals with
    // connecting yellow arrows, cyan glowing info pills, captions, and
    // high-contrast child-friendly Deploy button.
    // =====================================================================
    private renderGraphicalBriefing(sol: number) {
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
            // Fallback ground if the NASA texture is missing
            const ground = this.scene.add.graphics();
            ground.fillStyle(0x9e4a38, 1);
            ground.fillRect(0, terrainTop, W, terrainH);
            ground.fillStyle(0xc85a3c, 1);
            ground.fillTriangle(cx - 220, H, cx, terrainTop + 40, cx + 220, H);
            root.add(ground);
        }
        // Blend terrain into the sky at the top, darken bottom so the button/labels stay legible
        this.addFade(root, 0, terrainTop, W, 70, 0x07152e, 1, 0);
        this.addFade(root, 0, H - 110, W, 110, 0x1a0a14, 0, 0.7);

        // Mars planet (top-left, clear of title and weather card)
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

        // ---------- Mission Specific Config ----------
        type StageIconKey = "oxygen" | "water" | "food" | "pipes" | "tomato" | "tornado" | "wind" | "solar";
        interface SolBriefingConfig {
            badge: string;
            title: string;
            subtitle: string;
            deployButtonText: string;
            attribution: string;
            stages: Array<{ label: string; caption: string; icon: StageIconKey }>;
            renderVisuals: (root: Phaser.GameObjects.Container, colX: number[], stageBottom: number) => void;
        }

        const configs: Record<number, SolBriefingConfig> = {
            1: {
                badge: "SOL 1",
                title: "SPACE-TOMATO GREENHOUSE",
                subtitle: "Melt Martian ice, connect water pipes, and grow your own space tomatoes!",
                deployButtonText: "🚀 DEPLOY TO SOL 1 MARTIAN SURFACE →",
                attribution: "NASA Mars Trek terrain mosaic • Jezero Crater, Mars",
                stages: [
                    { label: "WATER TANK", caption: "Melt buried ice into\nclean liquid water.", icon: "water" },
                    { label: "CONNECT PIPES", caption: "Rotate pipe valves to\nroute water into base.", icon: "pipes" },
                    { label: "GROW TOMATOES", caption: "Water garden pods to\nharvest fresh tomatoes!", icon: "tomato" }
                ],
                renderVisuals: (r, cols, bottom) => {
                    this.drawSol1WaterTank(r, cols[0], bottom - 6);
                    this.drawSol1Pipes(r, cols[1], bottom - 6);
                    this.drawSol1Tomatoes(r, cols[2], bottom - 6);
                }
            },
            2: {
                badge: "SOL 2",
                title: "DUST DEVIL CLEANUP",
                subtitle: "Dodge playful dust devils, blow dust off solar panels, and recharge the base!",
                deployButtonText: "🚀 DEPLOY TO SOL 2 MARTIAN SURFACE →",
                attribution: "NASA Mars Trek terrain mosaic • Arcadia Planitia, Mars",
                stages: [
                    { label: "DUST DEVILS", caption: "Spot playful dust devils\ndancing across the plain.", icon: "tornado" },
                    { label: "WIND-BLOWER", caption: "Blast thick red dust\noff solar array glass.", icon: "wind" },
                    { label: "SOLAR POWER", caption: "Restore 100% solar energy\nto power base systems!", icon: "solar" }
                ],
                renderVisuals: (r, cols, bottom) => {
                    this.drawSol2DustDevil(r, cols[0], bottom - 6);
                    this.drawSol2WindBlower(r, cols[1], bottom - 6);
                    this.drawSol2SolarArray(r, cols[2], bottom - 6);
                }
            },
            4: {
                badge: "SOL 4",
                title: "AIR, ICE & LED POTATOES",
                subtitle: "Make oxygen, melt Martian ice, and grow your own potatoes!",
                deployButtonText: "🚀 DEPLOY TO SOL 4 MARTIAN SURFACE →",
                attribution: "NASA Mars Trek terrain mosaic • Jezero Crater, Mars",
                stages: [
                    { label: "OXYGEN", caption: "Make oxygen\nfrom Mars air.", icon: "oxygen" },
                    { label: "WATER", caption: "Melt buried ice\nfor water.", icon: "water" },
                    { label: "GROW FOOD", caption: "Grow potatoes\nunder LED lights.", icon: "food" }
                ],
                renderVisuals: (r, cols, bottom) => {
                    this.drawMoxie(r, cols[0], bottom - 6);
                    this.drawIceAndTank(r, cols[1], bottom - 6);
                    if (!this.addFittedImage(r, "greenhouse", cols[2], bottom - 6, 180, 140)) {
                        this.drawFallbackGreenhouse(r, cols[2], bottom - 6);
                    }
                }
            }
        };

        const config = configs[sol] || configs[4];

        // ---------- Header: SOL Badge, Title, Subtitle ----------
        const badge = this.scene.add.graphics();
        badge.fillStyle(UITheme.colors.solarGold, 1);
        badge.fillRoundedRect(cx - 56, 6, 112, 32, 16);
        badge.lineStyle(2, UITheme.colors.marsAmber, 1);
        badge.strokeRoundedRect(cx - 56, 6, 112, 32, 16);
        root.add(badge);

        const badgeText = this.scene.add.text(cx, 22, config.badge, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "20px",
            fontStyle: "bold",
            color: "#0E1A32"
        }).setOrigin(0.5);
        root.add(badgeText);

        const title = this.scene.add.text(cx, 82, config.title, {
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

        const subtitle = this.scene.add.text(cx, 120, config.subtitle, {
            fontFamily: UITheme.fonts.body,
            fontSize: "16px",
            color: "#fff8df",
            stroke: "#1a0a14",
            strokeThickness: 2,
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
            this.briefingTweens.push(this.scene.tweens.add({
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

        // Pedestals
        const pedestals = this.scene.add.graphics();
        colX.forEach((x) => {
            pedestals.fillStyle(0x6a2f26, 0.9);
            pedestals.fillEllipse(x, stageBottom + 4, 196, 30);
            pedestals.fillStyle(0xb5563a, 0.95);
            pedestals.fillEllipse(x, stageBottom, 190, 24);
        });
        root.add(pedestals);

        // Render graphical equipment visuals on top of pedestals
        config.renderVisuals(root, colX, stageBottom);

        // Yellow arrows between stages
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

        // Label pills + captions, anchored directly under each illustration
        const pillY = 314;
        config.stages.forEach((stage, i) => {
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

        // ---------- NASA Space Weather card (top-right, compact) ----------
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

        this.nasaWeatherTitle = this.scene.add.text(cardX + 14, cardY + 15, "NASA SPACE WEATHER", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            fontStyle: "bold",
            color: "#ffd36b"
        }).setOrigin(0, 0.5);
        this.nasaWeatherDetail = this.scene.add.text(cardX + 14, cardY + 35, "", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: "#d8efff"
        }).setOrigin(0, 0.5);
        root.add([this.nasaWeatherTitle, this.nasaWeatherDetail]);
        this.applyNasaWeather();

        // ---------- Bottom row: back / deploy / attribution ----------
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
            text: config.deployButtonText,
            width: 540,
            height: 58,
            primaryColor: UITheme.colors.marsAmber,
            secondaryColor: UITheme.colors.solarGold,
            textColor: "#fff6dc",
            fontSize: "17px",
            onClick: () => this.launchSolScene(sol)
        });
        root.add(deployButton);

        const attribution = this.scene.add.text(W - 14, H - 8, config.attribution, {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: "#9ff0ff",
            stroke: "#1a0a14",
            strokeThickness: 3
        }).setOrigin(1, 1);
        root.add(attribution);

        if (!this.nasaWeatherRequested) {
            this.nasaWeatherRequested = true;
            void this.loadNasaSpaceWeather();
        }
    }

    private drawStageIcon(
        g: Phaser.GameObjects.Graphics,
        icon: "oxygen" | "water" | "food" | "pipes" | "tomato" | "tornado" | "wind" | "solar",
        x: number,
        y: number
    ) {
        if (icon === "oxygen") {
            g.lineStyle(3, 0x75e8ff, 1);
            g.lineBetween(x - 12, y - 7, x + 10, y - 7);
            g.lineBetween(x - 16, y, x + 14, y);
            g.lineBetween(x - 10, y + 7, x + 8, y + 7);
        } else if (icon === "water") {
            g.fillStyle(0x62dfff, 1);
            g.fillCircle(x, y + 3, 8);
            g.fillTriangle(x, y - 13, x - 7, y, x + 7, y);
        } else if (icon === "food") {
            g.fillStyle(0x52e26a, 1);
            g.fillEllipse(x - 5, y - 3, 14, 9);
            g.fillEllipse(x + 6, y - 6, 14, 9);
            g.lineStyle(2.5, 0x52e26a, 1);
            g.lineBetween(x, y + 10, x, y - 2);
        } else if (icon === "pipes") {
            g.lineStyle(3, 0x38bdf8, 1);
            g.lineBetween(x - 12, y + 6, x, y + 6);
            g.lineBetween(x, y + 6, x, y - 6);
            g.lineBetween(x, y - 6, x + 12, y - 6);
            g.fillStyle(0xffd36b, 1);
            g.fillCircle(x, y, 4);
        } else if (icon === "tomato") {
            g.fillStyle(0xef4444, 1);
            g.fillCircle(x, y + 2, 8);
            g.fillStyle(0x22c55e, 1);
            g.fillTriangle(x, y - 8, x - 4, y - 4, x + 4, y - 4);
        } else if (icon === "tornado") {
            g.lineStyle(2.5, 0xf59e0b, 1);
            g.lineBetween(x - 11, y - 8, x + 11, y - 8);
            g.lineBetween(x - 8, y - 2, x + 8, y - 2);
            g.lineBetween(x - 5, y + 4, x + 5, y + 4);
            g.lineBetween(x - 2, y + 9, x + 2, y + 9);
        } else if (icon === "wind") {
            g.lineStyle(2.5, 0x38bdf8, 1);
            g.lineBetween(x - 12, y - 5, x + 8, y - 5);
            g.lineBetween(x - 14, y, x + 12, y);
            g.lineBetween(x - 10, y + 5, x + 6, y + 5);
        } else if (icon === "solar") {
            g.fillStyle(0x38bdf8, 1);
            g.fillRoundedRect(x - 10, y - 8, 20, 16, 2);
            g.lineStyle(1.5, 0xffe066, 1);
            g.strokeRoundedRect(x - 10, y - 8, 20, 16, 2);
            g.lineBetween(x, y - 8, x, y + 8);
            g.lineBetween(x - 10, y, x + 10, y);
        }
    }

    // =====================================================================
    // SOL 1 EQUIPMENT ILLUSTRATIONS (WATER TANK, PIPES, TOMATO GARDEN)
    // =====================================================================
    private drawSol1WaterTank(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();
        const ox = x;

        // Ice crystals around base of tank
        const crystal = (pts: Array<[number, number]>) => {
            g.fillStyle(0xbfe8ff, 0.95);
            g.fillPoints(pts.map(([px, py]) => new Phaser.Math.Vector2(ox + px, bottom + py)), true);
            g.lineStyle(2, 0xffffff, 0.9);
            g.strokePoints(pts.map(([px, py]) => new Phaser.Math.Vector2(ox + px, bottom + py)), true);
        };
        crystal([[-70, -2], [-60, -24], [-50, -2]]);
        crystal([[-52, -2], [-42, -44], [-30, -56], [-20, -30], [-14, -2]]);
        crystal([[36, -2], [48, -28], [60, -2]]);

        // Main cylindrical tank
        g.fillStyle(0x1e3a5f, 0.95);
        g.fillRoundedRect(ox - 38, bottom - 96, 76, 92, 10);
        g.lineStyle(3, 0x38bdf8, 1);
        g.strokeRoundedRect(ox - 38, bottom - 96, 76, 92, 10);

        // Tank metallic rim cap
        g.fillStyle(0x64748b, 1);
        g.fillRoundedRect(ox - 30, bottom - 108, 60, 14, 5);
        g.lineStyle(2, 0x94a3b8, 1);
        g.strokeRoundedRect(ox - 30, bottom - 108, 60, 14, 5);

        // Vertical water level viewport
        g.fillStyle(0x0b1e36, 1);
        g.fillRoundedRect(ox - 14, bottom - 82, 28, 66, 6);
        g.lineStyle(1.5, 0x38bdf8, 0.8);
        g.strokeRoundedRect(ox - 14, bottom - 82, 28, 66, 6);

        // Flowing blue water level inside viewport
        g.fillStyle(0x00dfff, 0.9);
        g.fillRoundedRect(ox - 12, bottom - 70, 24, 52, 4);

        // Water bubbles
        g.fillStyle(0xffffff, 0.8);
        g.fillCircle(ox - 4, bottom - 35, 3);
        g.fillCircle(ox + 4, bottom - 50, 2.5);
        g.fillCircle(ox - 2, bottom - 60, 2);

        // Water gauge measurement ticks
        g.lineStyle(1.5, 0xffffff, 0.6);
        [-60, -50, -40, -30].forEach(yOffset => {
            g.lineBetween(ox + 6, bottom + yOffset, ox + 11, bottom + yOffset);
        });

        // Lateral outlet pipe with flange
        g.fillStyle(0x475569, 1);
        g.fillRect(ox + 38, bottom - 46, 18, 12);
        g.fillStyle(0x94a3b8, 1);
        g.fillRect(ox + 52, bottom - 52, 6, 24);

        parent.add(g);
    }

    private drawSol1Pipes(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();
        const ox = x;

        // Outer inspection backdrop box
        g.fillStyle(0x0a192f, 0.85);
        g.fillRoundedRect(ox - 56, bottom - 96, 112, 92, 12);
        g.lineStyle(2, 0x1e293b, 1);
        g.strokeRoundedRect(ox - 56, bottom - 96, 112, 92, 12);

        // Pipe network metallic outer walls
        g.lineStyle(16, 0x334155, 1);
        g.beginPath();
        g.moveTo(ox - 64, bottom - 48);
        g.lineTo(ox - 16, bottom - 48);
        g.lineTo(ox - 16, bottom - 76);
        g.lineTo(ox + 34, bottom - 76);
        g.lineTo(ox + 34, bottom - 26);
        g.lineTo(ox + 64, bottom - 26);
        g.strokePath();

        // Glowing blue water flow inside pipes
        g.lineStyle(8, 0x00e5ff, 0.95);
        g.beginPath();
        g.moveTo(ox - 64, bottom - 48);
        g.lineTo(ox - 16, bottom - 48);
        g.lineTo(ox - 16, bottom - 76);
        g.lineTo(ox + 34, bottom - 76);
        g.lineTo(ox + 34, bottom - 26);
        g.lineTo(ox + 64, bottom - 26);
        g.strokePath();

        // Bright white liquid center streak
        g.lineStyle(3, 0xffffff, 0.9);
        g.beginPath();
        g.moveTo(ox - 64, bottom - 48);
        g.lineTo(ox - 16, bottom - 48);
        g.lineTo(ox - 16, bottom - 76);
        g.lineTo(ox + 34, bottom - 76);
        g.lineTo(ox + 34, bottom - 26);
        g.lineTo(ox + 64, bottom - 26);
        g.strokePath();

        // Brass rotary valve wheel
        g.fillStyle(0xd97706, 1);
        g.fillCircle(ox + 8, bottom - 76, 14);
        g.lineStyle(3, 0xfbbf24, 1);
        g.strokeCircle(ox + 8, bottom - 76, 14);
        g.fillStyle(0x78350f, 1);
        g.fillCircle(ox + 8, bottom - 76, 5);

        // Pipe collar couplings
        g.fillStyle(0x94a3b8, 1);
        g.fillRect(ox - 32, bottom - 54, 8, 12);
        g.fillRect(ox + 16, bottom - 82, 8, 12);
        g.fillRect(ox + 30, bottom - 44, 10, 8);

        parent.add(g);
    }

    private drawSol1Tomatoes(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();
        const ox = x;

        // Hydroponic planter basin
        g.fillStyle(0x1e293b, 1);
        g.fillRoundedRect(ox - 56, bottom - 28, 112, 26, 6);
        g.lineStyle(2, 0x06b6d4, 1);
        g.strokeRoundedRect(ox - 56, bottom - 28, 112, 26, 6);

        // Cyan LED status strip
        g.fillStyle(0x22d3ee, 0.9);
        g.fillRect(ox - 48, bottom - 16, 96, 4);

        // Grow-light illumination beam
        g.fillStyle(0xec4899, 0.14);
        g.fillTriangle(ox, bottom - 110, ox - 62, bottom - 28, ox + 62, bottom - 28);

        // Vine stems
        g.lineStyle(4, 0x16a34a, 1);
        g.beginPath();
        g.moveTo(ox - 24, bottom - 28);
        g.quadraticCurveTo(ox - 36, bottom - 66, ox - 18, bottom - 86);
        g.strokePath();

        g.beginPath();
        g.moveTo(ox + 10, bottom - 28);
        g.quadraticCurveTo(ox + 32, bottom - 60, ox + 14, bottom - 94);
        g.strokePath();

        // Lush green leaves
        const drawLeaf = (lx: number, ly: number, w: number, h: number) => {
            g.fillStyle(0x22c55e, 1);
            g.fillEllipse(lx, ly, w, h);
            g.lineStyle(1.5, 0x15803d, 1);
            g.strokeEllipse(lx, ly, w, h);
        };
        drawLeaf(ox - 36, bottom - 56, 22, 14);
        drawLeaf(ox - 12, bottom - 72, 24, 15);
        drawLeaf(ox + 28, bottom - 52, 22, 13);
        drawLeaf(ox + 20, bottom - 78, 20, 12);
        drawLeaf(ox, bottom - 92, 26, 14);

        // Plump glossy red tomatoes
        const drawTomato = (tx: number, ty: number, r: number) => {
            g.fillStyle(0xef4444, 1);
            g.fillCircle(tx, ty, r);
            g.fillStyle(0xdc2626, 0.85);
            g.fillCircle(tx + 2, ty + 2, r - 2);

            // Specular shiny highlight
            g.fillStyle(0xffffff, 0.85);
            g.fillEllipse(tx - r * 0.35, ty - r * 0.35, r * 0.45, r * 0.3);

            // Green calyx top star
            g.fillStyle(0x16a34a, 1);
            g.fillTriangle(tx, ty - r, tx - 6, ty - r + 3, tx + 6, ty - r + 3);
            g.fillTriangle(tx, ty - r - 4, tx - 3, ty - r + 1, tx + 3, ty - r + 1);
            g.fillTriangle(tx - 5, ty - r - 2, tx, ty - r + 2, tx - 2, ty - r + 4);
            g.fillTriangle(tx + 5, ty - r - 2, tx, ty - r + 2, tx + 2, ty - r + 4);
        };

        drawTomato(ox - 22, bottom - 42, 16);
        drawTomato(ox + 20, bottom - 38, 18);
        drawTomato(ox, bottom - 64, 14);

        parent.add(g);
    }

    // =====================================================================
    // SOL 2 EQUIPMENT ILLUSTRATIONS (DUST DEVIL, WIND-BLOWER, SOLAR ARRAY)
    // =====================================================================
    private drawSol2DustDevil(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();
        const ox = x;

        // Base dust billow
        g.fillStyle(0x78350f, 0.75);
        g.fillEllipse(ox, bottom - 8, 70, 16);
        g.fillStyle(0xb45309, 0.85);
        g.fillEllipse(ox, bottom - 12, 54, 13);

        // Swirling tornado funnel rings
        const rings = [
            { y: -18, w: 28, h: 10, col: 0xd97706, a: 0.85 },
            { y: -32, w: 42, h: 12, col: 0xe27845, a: 0.9 },
            { y: -48, w: 60, h: 14, col: 0xf59e0b, a: 0.9 },
            { y: -66, w: 82, h: 18, col: 0xd97706, a: 0.92 },
            { y: -86, w: 106, h: 22, col: 0xfbbf24, a: 0.95 },
            { y: -100, w: 122, h: 25, col: 0xe27845, a: 0.95 }
        ];

        rings.forEach(r => {
            g.fillStyle(r.col, r.a);
            g.fillEllipse(ox, bottom + r.y, r.w, r.h);
            g.lineStyle(2, 0xffedd5, 0.85);
            g.strokeEllipse(ox, bottom + r.y, r.w, r.h);
        });

        // Spiral whirlwind streaks
        g.lineStyle(3, 0xfff7ed, 0.9);
        g.beginPath();
        g.arc(ox, bottom - 86, 44, Math.PI * 0.2, Math.PI * 0.9, false);
        g.strokePath();

        g.beginPath();
        g.arc(ox, bottom - 56, 30, Math.PI * 0.6, Math.PI * 1.4, false);
        g.strokePath();

        // Flying sand pebbles
        const particles: Array<[number, number, number]> = [
            [-46, -92, 3], [-24, -108, 4], [38, -96, 3.5], [52, -72, 3],
            [-34, -48, 2.5], [32, -38, 3], [-18, -14, 2]
        ];
        particles.forEach(([px, py, r]) => {
            g.fillStyle(0x78350f, 0.9);
            g.fillCircle(ox + px, bottom + py, r);
            g.fillStyle(0xffedd5, 0.9);
            g.fillCircle(ox + px - 1, bottom + py - 1, r * 0.4);
        });

        parent.add(g);
    }

    private drawSol2WindBlower(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();
        const ox = x - 18;

        // Tool chassis body
        g.fillStyle(0x1e293b, 1);
        g.fillRoundedRect(ox - 36, bottom - 66, 64, 38, 8);
        g.lineStyle(2.5, 0x00dfff, 1);
        g.strokeRoundedRect(ox - 36, bottom - 66, 64, 38, 8);

        // Rear turbine intake
        g.fillStyle(0x334155, 1);
        g.fillRoundedRect(ox - 48, bottom - 62, 14, 30, 4);
        g.lineStyle(1.5, 0x64748b, 1);
        [-54, -48, -42].forEach(ventY => {
            g.lineBetween(ox - 45, bottom + ventY, ox - 37, bottom + ventY);
        });

        // Ergonomic handle and grip
        g.fillStyle(0x0f172a, 1);
        g.fillRoundedRect(ox - 16, bottom - 30, 18, 28, 5);
        g.lineStyle(2, 0x475569, 1);
        g.strokeRoundedRect(ox - 16, bottom - 30, 18, 28, 5);

        // Trigger
        g.fillStyle(0xf97316, 1);
        g.fillRect(ox + 2, bottom - 22, 6, 10);

        // Forward nozzle funnel
        g.fillStyle(0x475569, 1);
        g.fillTriangle(ox + 28, bottom - 62, ox + 50, bottom - 56, ox + 28, bottom - 34);
        g.lineStyle(2, 0x00dfff, 1);
        g.strokeTriangle(ox + 28, bottom - 62, ox + 50, bottom - 56, ox + 28, bottom - 34);

        // Battery charge LEDs
        g.fillStyle(0x10b981, 1);
        g.fillCircle(ox - 18, bottom - 56, 3);
        g.fillCircle(ox - 8, bottom - 56, 3);
        g.fillCircle(ox + 2, bottom - 56, 3);

        // Dynamic high-velocity air blast waves
        const windX = ox + 54;
        const windY = bottom - 46;

        g.lineStyle(3, 0x38bdf8, 0.95);
        g.beginPath();
        g.arc(windX + 16, windY, 18, -Math.PI * 0.35, Math.PI * 0.35, false);
        g.strokePath();

        g.lineStyle(3.5, 0x7dd3fc, 0.95);
        g.beginPath();
        g.arc(windX + 32, windY, 28, -Math.PI * 0.38, Math.PI * 0.38, false);
        g.strokePath();

        g.lineStyle(2, 0xffffff, 1);
        g.beginPath();
        g.arc(windX + 46, windY, 36, -Math.PI * 0.35, Math.PI * 0.35, false);
        g.strokePath();

        // Forward air speed streaks
        g.lineStyle(2, 0xe0f2fe, 0.9);
        g.lineBetween(windX + 6, windY - 8, windX + 34, windY - 14);
        g.lineBetween(windX + 8, windY, windX + 48, windY);
        g.lineBetween(windX + 6, windY + 8, windX + 34, windY + 14);

        parent.add(g);
    }

    private drawSol2SolarArray(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const ox = x;
        const panelImg = this.addFittedImage(parent, "solar-panels", ox, bottom - 48, 160, 110);
        const g = this.scene.add.graphics();

        if (!panelImg) {
            // Struts
            g.fillStyle(0x334155, 1);
            g.fillRect(ox - 8, bottom - 30, 16, 28);
            g.fillRect(ox - 32, bottom - 6, 64, 6);

            // Tilted frame
            g.fillStyle(0x0f172a, 1);
            g.fillRoundedRect(ox - 64, bottom - 100, 128, 72, 6);
            g.lineStyle(3, 0x00dfff, 1);
            g.strokeRoundedRect(ox - 64, bottom - 100, 128, 72, 6);

            // Photovoltaic cells
            g.fillStyle(0x1d4ed8, 0.95);
            for (let row = 0; row < 2; row++) {
                for (let col = 0; col < 3; col++) {
                    const cellX = ox - 58 + col * 40;
                    const cellY = bottom - 94 + row * 34;
                    g.fillRoundedRect(cellX, cellY, 36, 30, 3);
                    g.lineStyle(1.5, 0x60a5fa, 0.9);
                    g.strokeRoundedRect(cellX, cellY, 36, 30, 3);
                }
            }
        }

        // Sparkling glints on clean solar glass
        const drawSparkle = (sx: number, sy: number, r: number) => {
            g.fillStyle(0xffffff, 1);
            g.fillTriangle(sx, sy - r, sx, sy + r, sx - r * 0.3, sy);
            g.fillTriangle(sx, sy - r, sx, sy + r, sx + r * 0.3, sy);
            g.fillTriangle(sx - r, sy, sx + r, sy, sx, sy - r * 0.3);
            g.fillTriangle(sx - r, sy, sx + r, sy, sx, sy + r * 0.3);
            g.fillCircle(sx, sy, r * 0.25);
        };

        drawSparkle(ox + 42, bottom - 84, 14);
        drawSparkle(ox - 46, bottom - 76, 9);
        drawSparkle(ox + 12, bottom - 96, 7);

        // Power charge energy spark dots
        g.fillStyle(0xfde047, 0.95);
        g.fillCircle(ox + 50, bottom - 68, 3);
        g.fillCircle(ox + 32, bottom - 96, 2.5);

        parent.add(g);
    }

    /** Child-friendly MOXIE machine (illustrated; not NASA imagery). */
    private drawMoxie(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();
        // hose
        g.lineStyle(9, 0x9aa7b5, 1);
        g.beginPath();
        g.moveTo(x + 24, bottom - 88);
        g.lineTo(x + 30, bottom - 108);
        g.lineTo(x + 48, bottom - 116);
        g.lineTo(x + 60, bottom - 104);
        g.lineTo(x + 62, bottom - 78);
        g.lineTo(x + 62, bottom - 26);
        g.strokePath();
        // base + body
        g.fillStyle(0xe8742a, 1);
        g.fillRoundedRect(x - 64, bottom - 14, 128, 14, 5);
        g.fillStyle(0xeef2f7, 1);
        g.fillRoundedRect(x - 56, bottom - 92, 112, 80, 10);
        g.lineStyle(3, 0x9fb4c8, 1);
        g.strokeRoundedRect(x - 56, bottom - 92, 112, 80, 10);
        // vents
        g.lineStyle(2, 0x9fb4c8, 1);
        [0, 1, 2].forEach((i) => g.lineBetween(x - 48, bottom - 78 + i * 7, x - 36, bottom - 78 + i * 7));
        // screen
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

    /** Ice crystals + water container. */
    private drawIceAndTank(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.scene.add.graphics();
        const ox = x - 8;
        // crystals
        const crystal = (pts: Array<[number, number]>) => {
            g.fillStyle(0xbfe8ff, 0.95);
            g.fillPoints(pts.map(([px, py]) => new Phaser.Math.Vector2(ox + px, bottom + py)), true);
            g.lineStyle(2, 0xffffff, 0.9);
            g.strokePoints(pts.map(([px, py]) => new Phaser.Math.Vector2(ox + px, bottom + py)), true);
        };
        crystal([[-84, -2], [-76, -26], [-64, -2]]);
        crystal([[-72, -2], [-58, -56], [-42, -72], [-26, -40], [-22, -2]]);
        crystal([[-44, -2], [-30, -32], [-16, -2]]);
        // tank
        g.fillStyle(0x1e90d8, 0.9);
        g.fillRoundedRect(ox, bottom - 92, 66, 88, 10);
        g.lineStyle(3, 0xbfe8ff, 1);
        g.strokeRoundedRect(ox - 92, bottom - 92, 66, 88, 10);
        g.fillStyle(0x8793a3, 1);
        g.fillRoundedRect(ox + 6, bottom - 104, 54, 14, 5);
        // drop
        g.fillStyle(0xe8fbff, 1);
        g.fillCircle(ox + 33, bottom - 40, 10);
        g.fillTriangle(ox + 33, bottom - 66, ox + 24, bottom - 46, ox + 42, bottom - 46);
        parent.add(g);
    }

    /** Only used if the existing "greenhouse" texture is missing. */
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

    private applyNasaWeather() {
        if (this.nasaWeatherTitle?.active) {
            this.nasaWeatherTitle.setText("NASA SPACE WEATHER");
        }
        if (this.nasaWeatherDetail?.active) {
            this.nasaWeatherDetail.setText(this.nasaWeatherStatus.detail).setColor(this.nasaWeatherStatus.color);
        }
    }

    private async loadNasaSpaceWeather() {
        const endpoint = import.meta.env.DEV
            ? "http://localhost:3001/api/nasa/space-weather"
            : "/api/nasa/space-weather";
        const controller = new AbortController();
        this.nasaWeatherAbort = controller;
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
            this.nasaWeatherStatus = {
                detail: total > 0
                    ? `${total} recent solar event${total === 1 ? "" : "s"} (DONKI)`
                    : "No recent events (DONKI)",
                color: total > 0 ? "#bfffd1" : "#d8efff"
            };
        } catch (error) {
            if (!this.isClosed) {
                this.nasaWeatherStatus = { detail: "Data unavailable", color: "#b8b8b8" };
                console.warn("NASA space-weather status unavailable:", error);
            }
        } finally {
            window.clearTimeout(timeout);
            this.nasaWeatherAbort = undefined;
            if (!this.isClosed) this.applyNasaWeather();
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

    /**
     * Handles interactive clicks on challenge action buttons
     */
    private handlePrimaryAction(sol: number) {
        const stateRecord = this.activeSolData[sol];

        switch (sol) {
            case 1:
                // Water flow (+25%)
                stateRecord.currentVal = Math.min(100, stateRecord.currentVal + 25);
                break;
            case 2:
                // Disperse dust devil (+1 vortex cleared, target = 3)
                stateRecord.currentVal = Math.min(3, stateRecord.currentVal + 1);
                stateRecord.completed = stateRecord.currentVal >= 3;
                break;
            case 3:
                // Kilopower Deployment
                stateRecord.currentVal = 10;
                break;
            case 4:
                // Potato Harvest
                stateRecord.currentVal = Math.min(3, stateRecord.currentVal + 1);
                break;
            case 5:
                // Execute command buffer
                stateRecord.currentVal = 3;
                break;
        }

        if (this.callbacks.onChallengeAction) {
            this.callbacks.onChallengeAction(`sol_${sol}_action`, stateRecord);
        }

        // Re-render to update gauges & button states
        this.renderSolChallenge(sol);
    }

    private handleSecondaryAction(sol: number) {
        const stateRecord = this.activeSolData[sol];

        switch (sol) {
            case 1:
                SoundFX.playAlert();
                break;
            case 2:
                // Scrape/clean dust off solar arrays
                SoundFX.playClick();
                stateRecord.currentVal = Math.min(3, stateRecord.currentVal + 1);
                stateRecord.completed = stateRecord.currentVal >= 3;
                this.renderSolChallenge(sol);
                break;
            case 3:
                // Scraped dust off solar glass
                SoundFX.playClick();
                stateRecord.currentVal = Math.min(10, stateRecord.currentVal + 2);
                this.renderSolChallenge(sol);
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

    /**
     * Dedicated mission launch prompt shown as soon as Sol 2 is clicked:
     * Displays "YOUR MISSION", "Dust Devil Cleanup", and a "START MISSION" button.
     */
    private launchSolScene(sol: number) {
        SoundFX.playClick();
        const solKey = this.getSolSceneKey(sol);
        this.close();

        // Stop any existing Sol challenge scenes to ensure zero scene stacking or WebGL conflicts
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

        // Sleep MarsWorldScene cleanly and launch dedicated challenge scene on top
        this.scene.scene.sleep("MarsWorldScene");
        this.scene.scene.launch(solKey);
        this.scene.scene.bringToTop(solKey);
    }

    public close() {
        if (this.isClosed) return;
        this.isClosed = true;
        this.clearBriefingTweens();
        this.nasaWeatherAbort?.abort();
        this.nasaWeatherTitle = undefined;
        this.nasaWeatherDetail = undefined;
        this.container.destroy();
        this.callbacks.onClose();
    }
}

export default MissionChallengesModal;