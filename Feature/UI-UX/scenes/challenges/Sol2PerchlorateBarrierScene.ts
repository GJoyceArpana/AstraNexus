import UITheme from "../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

export class Sol2PerchlorateBarrierScene extends SolChallengeBaseScene {
    private contaminationText!: Phaser.GameObjects.Text;
    private cabinContaminationPct = 65; // Starts contaminated until suitport engaged
    public suitportLockStatus = false;
    public hepaAirCurtainActive = false;

    constructor() {
        super("Sol2PerchlorateBarrierScene", {
            solNumber: 2,
            title: "SOL 2: THE PERCHLORATE BARRIER",
            codename: "TOXIC SOIL & SUITPORT DOCKING",
            hazardBadge: "CHEMICALLY REACTIVE SOIL (ClO4- SALTS)",
            briefing: "Martian surface regolith contains 0.5%–1.0% toxic calcium and magnesium perchlorates. Inhaling perchlorate dust damages human thyroids and respiratory tracts. Never bring dusty EVA suits inside! Dock via the rear-entry Suitport to keep toxins outside.",
            nasaFact: "NASA Phoenix lander confirmed widespread perchlorates in 2008. NASA developed rear-entry Suitports: the spacesuit remains latched to the exterior hull while astronauts enter directly through the backpack hatch.",
            primaryTarget: "Dock through Suitport and purge cabin perchlorates below 15%.",
            unit: "%",
            targetVal: 15,
            initialVal: 65
        });
    }

    protected createChallengeContent() {
        const frameX = (this.W - 1220) / 2;
        const frameY = (this.H - 660) / 2;
        const topY = frameY + 70;
        const colW = 575;
        const colH = 505;

        // -------------------------------------------------------------
        // LEFT COLUMN: SUITPORT AIRLOCK DUAL-CHAMBER VISUALIZER
        // -------------------------------------------------------------
        const leftX = frameX + 24;
        const leftBg = this.add.graphics();
        leftBg.fillStyle(UITheme.colors.cardBg, 0.9);
        leftBg.fillRoundedRect(leftX, topY, colW, colH, 12);
        leftBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        leftBg.strokeRoundedRect(leftX, topY, colW, colH, 12);

        this.add.text(leftX + 24, topY + 18, "REAR-ENTRY SUITPORT AIRLOCK DIAGRAM", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });

        // Airlock Chamber Visual
        const chamberW = colW - 48;
        const chamberH = 240;
        const chamberX = leftX + 24;
        const chamberY = topY + 50;

        const chamberBg = this.add.graphics();
        // Left half: Mars exterior dusty zone
        chamberBg.fillStyle(0x2A1408, 0.9);
        chamberBg.fillRoundedRect(chamberX, chamberY, chamberW / 2, chamberH, { tl: 10, tr: 0, bl: 10, br: 0 });
        // Right half: Clean Pressurized Habitat Cabin
        chamberBg.fillStyle(0x061D38, 0.9);
        chamberBg.fillRoundedRect(chamberX + chamberW / 2, chamberY, chamberW / 2, chamberH, { tl: 0, tr: 10, bl: 0, br: 10 });
        // Dividing Hull Wall
        chamberBg.lineStyle(4, UITheme.colors.primaryCyan, 1);
        chamberBg.lineBetween(chamberX + chamberW / 2, chamberY, chamberX + chamberW / 2, chamberY + chamberH);
        chamberBg.strokeRoundedRect(chamberX, chamberY, chamberW, chamberH, 10);

        // Zone Labels
        this.add.text(chamberX + chamberW * 0.25, chamberY + 20, "MARS SURFACE\n(TOXIC SOIL)", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.emergencyRedStr,
            align: "center",
            fontStyle: "bold"
        }).setOrigin(0.5);

        this.add.text(chamberX + chamberW * 0.75, chamberY + 20, "HABITAT INTERIOR\n(CLEAN AIRLOCK)", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.bioGreenStr,
            align: "center",
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Suitport Hatch Graphic in Center
        const hatch = this.add.graphics();
        hatch.fillStyle(0x0F2E52, 1);
        hatch.fillRoundedRect(chamberX + chamberW / 2 - 25, chamberY + 80, 50, 100, 8);
        hatch.lineStyle(2, UITheme.colors.solarGold, 1);
        hatch.strokeRoundedRect(chamberX + chamberW / 2 - 25, chamberY + 80, 50, 100, 8);

        this.add.text(chamberX + chamberW / 2, chamberY + 130, "🚪", { fontSize: "28px" }).setOrigin(0.5);

        // Contamination Telemetry Card
        const toxicBoxY = topY + 310;
        const toxicBox = this.add.graphics();
        toxicBox.fillStyle(0x081528, 0.95);
        toxicBox.fillRoundedRect(leftX + 24, toxicBoxY, colW - 48, 170, 10);
        toxicBox.lineStyle(1.5, UITheme.colors.emergencyRed, 0.8);
        toxicBox.strokeRoundedRect(leftX + 24, toxicBoxY, colW - 48, 170, 10);

        this.add.text(leftX + 44, toxicBoxY + 16, "🧪 PERCHLORATE TOXICITY SPECTROMETRY", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold"
        });

        this.contaminationText = this.add.text(leftX + 44, toxicBoxY + 42, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "20px",
            fontStyle: "bold"
        });
        this.updateToxicityDisplay();

        this.add.text(leftX + 44, toxicBoxY + 82, this.challengeConfig.nasaFact, {
            fontFamily: UITheme.fonts.body,
            fontSize: "12.5px",
            color: UITheme.colors.textSecondary,
            lineSpacing: 4,
            wordWrap: { width: colW - 88 }
        });

        // -------------------------------------------------------------
        // RIGHT COLUMN: SUITPORT & AIR CURTAIN DECONTAMINATION CONTROLS
        // -------------------------------------------------------------
        const rightX = leftX + colW + 22;
        const rightBg = this.add.graphics();
        rightBg.fillStyle(UITheme.colors.cardBg, 0.9);
        rightBg.fillRoundedRect(rightX, topY, colW, colH, 12);
        rightBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        rightBg.strokeRoundedRect(rightX, topY, colW, colH, 12);

        this.add.text(rightX + 24, topY + 18, "SUITPORT PURIFICATION CONTROLS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: "#FFFFFF",
            fontStyle: "bold"
        });

        // Gauge
        const gaugeY = topY + 54;
        const barW = colW - 48;
        const barH = 26;

        this.progressText = this.add.text(rightX + 24, gaugeY, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });

        this.statusBadge = this.add.text(rightX + colW - 24, gaugeY, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            fontStyle: "bold"
        }).setOrigin(1, 0);

        const trackBg = this.add.graphics();
        trackBg.fillStyle(0x061122, 1);
        trackBg.fillRoundedRect(rightX + 24, gaugeY + 28, barW, barH, 6);
        trackBg.lineStyle(1, UITheme.colors.panelBorder, 0.8);
        trackBg.strokeRoundedRect(rightX + 24, gaugeY + 28, barW, barH, 6);

        this.progressFill = this.add.graphics();
        this.updateGauge(rightX + 24, gaugeY + 28, barW, barH);

        // Action Buttons
        const btnY = topY + 130;

        // Button 1: Lock Suitport
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 26,
            width: colW - 48,
            height: 52,
            fontSize: "14px",
            text: "🚪 ENGAGE REAR-ENTRY SUITPORT HATCH",
            primaryColor: UITheme.colors.primaryCyan,
            icon: "🚪",
            onClick: () => {
                SoundFX.playClick();
                this.engageSuitport();
            }
        });

        // Button 2: HEPA Air Curtain
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 92,
            width: colW - 48,
            height: 50,
            fontSize: "14px",
            text: "💨 ACTIVATE HIGH-PRESSURE HEPA AIR CURTAIN",
            primaryColor: UITheme.colors.solarGold,
            icon: "💨",
            onClick: () => {
                SoundFX.playClick();
                this.activateHEPACurtain();
            }
        });

        // Button 3: Collect Core Sample with SHERLOC
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 158,
            width: colW - 48,
            height: 50,
            fontSize: "14px",
            text: "🔬 SHERLOC RAMAN SPECTROMETER SAMPLE",
            primaryColor: UITheme.colors.bioGreen,
            icon: "🔬",
            onClick: () => {
                SoundFX.playClick();
                this.runSherlocScan();
            }
        });

        // Chemical Analysis Specs
        const specBoxY = topY + 360;
        const specBox = this.add.graphics();
        specBox.fillStyle(0x08152B, 0.95);
        specBox.fillRoundedRect(rightX + 24, specBoxY, colW - 48, 120, 8);
        specBox.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        specBox.strokeRoundedRect(rightX + 24, specBoxY, colW - 48, 120, 8);

        this.add.text(rightX + 40, specBoxY + 16, "MARS REGOLITH TOXICITY SPECIFICATION:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
        this.add.text(rightX + 40, specBoxY + 38, "• Primary Oxidizer: Mg(ClO4)2 · Ca(ClO4)2 salts (0.6 wt%)\n• Safe Human Threshold: < 15 ppm interior cabin atmosphere\n• Mitigation: Electrostatic suit repulsion + positive-pressure airlock", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: "#E0ECFC",
            lineSpacing: 5
        });
    }

    private updateToxicityDisplay() {
        this.contaminationText.setText(`CABIN PERCHLORATES: ${this.cabinContaminationPct}% (LIMIT: 15%)`);
        this.contaminationText.setColor(this.cabinContaminationPct <= 15 ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr);
    }

    private updateGauge(x: number, y: number, w: number, h: number) {
        const purityPct = Math.max(0, (100 - this.cabinContaminationPct) / 100);
        this.progressText.setText(`DECONTAMINATION PURITY: ${Math.round(purityPct * 100)}% / 100%`);

        const isSafe = this.cabinContaminationPct <= 15;
        this.statusBadge.setText(isSafe ? "✔ HABITAT CABIN TOXIN-FREE" : "⚠ TOXIC DUST DETECTED");
        this.statusBadge.setColor(isSafe ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr);

        this.progressFill.clear();
        this.progressFill.fillStyle(isSafe ? UITheme.colors.bioGreen : UITheme.colors.marsAmber, 1);
        this.progressFill.fillRoundedRect(x + 2, y + 2, Math.max(8, (w - 4) * purityPct), h - 4, 4);
    }

    private engageSuitport() {
        this.suitportLockStatus = true;
        this.cabinContaminationPct = Math.max(8, this.cabinContaminationPct - 35);
        this.refreshState();
        this.setActionFeedback("✔ Suitport locked! Spacesuit mounted outside living quarters.", true);
    }

    private activateHEPACurtain() {
        this.hepaAirCurtainActive = true;
        this.cabinContaminationPct = Math.max(4, this.cabinContaminationPct - 25);
        this.refreshState();
        this.setActionFeedback("💨 High-velocity HEPA air curtain engaged! Residual dust purged.", true);
    }

    private runSherlocScan() {
        SoundFX.playToggle(true);
        this.refreshState();
        this.setActionFeedback("🔬 SHERLOC analysis confirmed: 0.02% perchlorate trace. Within OSHA/NASA bio-limits.", true);
    }

    private refreshState() {
        this.updateToxicityDisplay();
        const frameX = (this.W - 1220) / 2;
        const rightX = frameX + 24 + 575 + 22;
        this.updateGauge(rightX + 24, (this.H - 660) / 2 + 152, 575 - 48, 26);
    }
}

export default Sol2PerchlorateBarrierScene;
