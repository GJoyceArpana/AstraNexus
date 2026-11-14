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
        6: { currentVal: 4, completed: false },    // 4 modules balanced
        7: { currentVal: 150, completed: false },  // 150 kg samples
    };

    private contentContainer!: Phaser.GameObjects.Container;
    private tabButtons: Phaser.GameObjects.Container[] = [];

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
            title: "SOL 2: DUST DEVIL CLEANUP AT ARCADIA PLANITIA",
            codename: "DUST DEVIL CLEANUP",
            icon: "🌪️",
            hazardBadge: "ELECTROSTATIC DUST DEVIL VORTICES",
            briefing: "Arcadia Planitia is a wide, flat plain ideal for solar panels—until a mischievous Martian dust devil spins through! Run around in a puffy astronaut suit with a specialized wind-blower tool, dodge playful dust devils bouncing around, clean the panels, and establish your Night Shift protocol before sunset.",
            nasaFact: "NASA Spirit and Opportunity rovers frequently tracked Martian dust devils up to 8 km high. Dust devils generate powerful electrostatic charges causing dust to cling to solar glass until neutralized by high-velocity wind-blowers and ion dissipators.",
            primaryTarget: "Dodge dust devils & blast dust off all 4 solar arrays with Wind-Blower.",
            progressMetric: "Arrays Cleaned",
            currentVal: 0,
            targetVal: 4,
            unit: "Arrays",
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
            title: "SOL 4: LIVING OFF THE LAND",
            codename: "ISRU PRODUCTION TRINITY",
            icon: "🥔",
            hazardBadge: "DEPLETION OF EARTH EMERGENCY RATIONS",
            briefing: "Initial emergency supplies are dwindling. The outpost must achieve complete In-Situ Resource Utilization (ISRU) independence: generate oxygen with MOXIE, harvest subsurface ice, and grow LED potatoes.",
            nasaFact: "NASA Perseverance MOXIE proved oxygen can be extracted from Mars CO2 at 800°C. ISS Veggie and APH chambers proved hydroponic crops thrive under high-PAR LEDs.",
            primaryTarget: "Simultaneously harvest fresh O2, ice permafrost, and greenhouse crops.",
            progressMetric: "ISRU Trinity Status",
            currentVal: 1,
            targetVal: 3,
            unit: "Pillars",
            actionButtonText: "🥔 HARVEST HYDROPONIC POTATOES",
            secondaryActionText: "💧 DRILL SUBSURFACE ICE PERMAFROST"
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
        },
        6: {
            solNumber: 6,
            title: "SOL 6: COLONY GRIDLOCK",
            codename: "TOTAL SYSTEM INTEGRATION",
            icon: "⚡",
            hazardBadge: "CONTINUOUS MAXIMUM ELECTRICAL LOAD",
            briefing: "A sub-zero thermal cold front (-110°C) tests every engineering system simultaneously under peak load. Power Life Support, Heaters, MOXIE, and Water Extractor while keeping grid surplus positive.",
            nasaFact: "NASA Moon-to-Mars architecture tests Total System Integration: verifying ECLSS, nuclear power, rovers, and habitats operate harmoniously under extreme stress.",
            primaryTarget: "Maintain 4 active modules simultaneously with 0 breaker trips.",
            progressMetric: "Modules Powered",
            currentVal: 4,
            targetVal: 4,
            unit: "Mods",
            actionButtonText: "⚡ AUTO-BALANCE SWITCHBOARD LOAD",
            secondaryActionText: "📊 INSPECT ALL 5 BASE STRUCTURES"
        },
        7: {
            solNumber: 7,
            title: "SOL 7: JOURNEY HOME",
            codename: "RETURN CAPSULE MASS BUDGET",
            icon: "🚀",
            hazardBadge: "STRICT 15,000 kg TAKEOFF MASS LIMIT",
            briefing: "The Mars Ascent Vehicle (MAV) is on the launchpad. The rocket equation is unforgiving: total takeoff weight cannot exceed 15,000 kg! Balance rocket propellant, crew mass, and collected geological samples to launch safely.",
            nasaFact: "The Tsiolkovsky Rocket Equation dictates that every extra kilogram on Mars requires 10+ kilograms of propellant to reach Mars orbit. Overweight rockets fail to achieve escape velocity.",
            primaryTarget: "Ensure total capsule mass <= 15,000 kg and ignite ascent engine.",
            progressMetric: "Takeoff Payload Mass",
            currentVal: 14850,
            targetVal: 15000,
            unit: "kg",
            actionButtonText: "🚀 IGNITE MARS ASCENT VEHICLE (MAV)",
            secondaryActionText: "⚖️ JETTISON SURPLUS SAMPLE WEIGHT"
        }
    };

    constructor(scene: Phaser.Scene, callbacks: MissionChallengeCallbacks, initialSol: number = 1) {
        this.scene = scene;
        this.callbacks = callbacks;
        this.currentSolTab = Math.max(1, Math.min(7, initialSol));
        this.container = this.scene.add.container(0, 0);
        this.container.setDepth(210); // Highest priority modal overlay
        this.init();
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        const { width, height } = this.scene.scale;

        // 1. Dimmed Modal Backdrop
        const backdrop = this.scene.add.rectangle(0, 0, width, height, 0x040914, 0.94).setOrigin(0);
        backdrop.setInteractive();
        this.container.add(backdrop);

        // 2. Main High-Tech Frame (1160 x 640)
        const frameW = 1160;
        const frameH = 640;
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
        const headerTitle = this.scene.add.text(frameX + 24, frameY + 16, "✦ OUTPOST SOL: 7-SOL MISSION CHALLENGES ✦", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "18px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            letterSpacing: 2
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

        // 3. Sol Navigation Carousel Tabs (Sols 1 - 7)
        this.createSolTabs(frameX + 20, frameY + 70, frameW - 40);

        // 4. Dynamic Content Container (re-drawn when switching Sols)
        this.contentContainer = this.scene.add.container(0, 0);
        this.container.add(this.contentContainer);

        // Render Initial Active Sol
        this.renderSolChallenge(this.currentSolTab);
    }

    /**
     * Renders Sol 1 - Sol 7 interactive navigation buttons
     */
    private createSolTabs(startX: number, y: number, totalWidth: number) {
        const tabCount = 7;
        const tabSpacing = 8;
        const tabW = (totalWidth - (tabSpacing * (tabCount - 1))) / tabCount;
        const tabH = 40;

        for (let i = 1; i <= tabCount; i++) {
            const tabX = startX + (i - 1) * (tabW + tabSpacing) + tabW / 2;
            const isSelected = i === this.currentSolTab;
            const data = this.challenges[i];

            const tabContainer = this.scene.add.container(tabX, y + tabH / 2);

            const bg = this.scene.add.graphics();
            this.drawTabBackground(bg, tabW, tabH, isSelected);
            tabContainer.add(bg);

            const label = this.scene.add.text(0, 0, `${data.icon} SOL ${i}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "13px",
                color: isSelected ? "#FFFFFF" : UITheme.colors.textSecondary,
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

    private drawTabBackground(g: Phaser.GameObjects.Graphics, w: number, h: number, isSelected: boolean, isHovered: boolean = false) {
        g.clear();
        if (isSelected) {
            g.fillStyle(UITheme.colors.cardSelected, 0.95);
            g.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
            g.lineStyle(2, UITheme.colors.primaryCyan, 1);
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

            this.drawTabBackground(bg, tabContainer.width, tabContainer.height, isSelected);
            label.setColor(isSelected ? "#FFFFFF" : UITheme.colors.textSecondary);
        });

        // Re-render Challenge details
        this.renderSolChallenge(sol);
    }

    /**
     * Renders the full 2-column detailed view for the active Sol
     */
    private renderSolChallenge(sol: number) {
        this.contentContainer.removeAll(true);
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
            fontSize: "22px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 2
        });
        this.contentContainer.add(titleText);

        const codename = this.scene.add.text(leftX + 20, topY + 48, `MISSION CODENAME: [ ${data.codename} ]`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            letterSpacing: 1
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
        const rightTitle = this.scene.add.text(rightX + 20, topY + 18, "MISSION CHALLENGE & ENGINEERING CONTROLS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 1.5
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

    private getSolSceneKey(sol: number): string {
        switch (sol) {
            case 1: return "Sol1DirtFortressScene";
            case 2: return "Sol2PerchlorateBarrierScene";
            case 3: return "Sol3RedGaleScene";
            case 4: return "Sol4ISRUProductionScene";
            case 5: return "Sol5SilenceCommsLagScene";
            case 6: return "Sol6ColonyGridlockScene";
            case 7: return "Sol7JourneyHomeMAVScene";
            default: return "Sol1DirtFortressScene";
        }
    }

    /**
     * Handles interactive clicks on challenge action buttons
     */
    private handlePrimaryAction(sol: number) {
        const stateRecord = this.activeSolData[sol];
        const data = this.challenges[sol];

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
            case 6:
                // Auto-balance grid
                stateRecord.currentVal = 4;
                break;
            case 7:
                // MAV Rocket Launch
                stateRecord.completed = stateRecord.currentVal <= data.targetVal;
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
            case 7:
                // Jettison 50kg samples
                stateRecord.currentVal = Math.max(0, stateRecord.currentVal - 50);
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

        if (sol < 7) {
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
            "Sol5SilenceCommsLagScene",
            "Sol6ColonyGridlockScene",
            "Sol7JourneyHomeMAVScene"
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
        this.container.destroy();
        this.callbacks.onClose();
    }
}

export default MissionChallengesModal;
