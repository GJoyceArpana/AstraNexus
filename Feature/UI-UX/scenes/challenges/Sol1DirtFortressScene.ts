import UITheme from "../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

export class Sol1DirtFortressScene extends SolChallengeBaseScene {
    private regolithMoundGraphics!: Phaser.GameObjects.Graphics;
    private radDoseText!: Phaser.GameObjects.Text;
    private targetThickness = 3.0;
    private compactionPercent = 0;

    private domeCenterX = 0;
    private domeBaseY = 0;
    private gaugeX = 0;
    private gaugeY = 0;
    private gaugeW = 0;
    private gaugeH = 0;

    constructor() {
        super("Sol1DirtFortressScene", {
            solNumber: 1,
            title: "SOL 1: DIRT FORTRESS",
            codename: "REGOLITH RADIATION SHIELDING",
            hazardBadge: "COSMIC RADIATION (>0.70 mSv/Sol)",
            briefing: "Mars lacks a planetary magnetosphere. Galactic cosmic rays and solar flares bombard the bare habitat shell. Use the rover bucket to excavate loose basalt regolith and pile a 3.0-meter thick soil layer over the roof.",
            nasaFact: "NASA Langley tests confirm 3 meters of compacted Martian regolith provides radiation attenuation equivalent to Earth's atmosphere, blocking 95% of cosmic rays.",
            primaryTarget: "Pile at least 3.0 meters of compacted regolith over habitat roof.",
            unit: "m",
            targetVal: 3.0,
            initialVal: 0.8
        });
    }

    protected createChallengeContent() {
        const frameX = (this.W - 1220) / 2;
        const frameY = (this.H - 660) / 2;
        const topY = frameY + 70;
        const colW = 575;
        const colH = 505;

        // -------------------------------------------------------------
        // LEFT COLUMN: HABITAT SHIELD CROSS-SECTION VISUALIZER
        // -------------------------------------------------------------
        const leftX = frameX + 24;
        const leftBg = this.add.graphics();
        leftBg.fillStyle(UITheme.colors.cardBg, 0.9);
        leftBg.fillRoundedRect(leftX, topY, colW, colH, 12);
        leftBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        leftBg.strokeRoundedRect(leftX, topY, colW, colH, 12);

        this.add.text(leftX + 24, topY + 18, "HABITAT HULL & RADIATION ATTENUATION", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });

        // Habitat Dome Diagram Viewport
        const viewW = colW - 48;
        const viewH = 240;
        const viewX = leftX + 24;
        const viewY = topY + 50;

        const viewFrame = this.add.graphics();
        viewFrame.fillStyle(0x040B17, 1);
        viewFrame.fillRoundedRect(viewX, viewY, viewW, viewH, 10);
        viewFrame.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        viewFrame.strokeRoundedRect(viewX, viewY, viewW, viewH, 10);

        // Habitat Shell Graphic
        this.domeCenterX = viewX + viewW / 2;
        this.domeBaseY = viewY + viewH - 30;

        const habDome = this.add.graphics();
        habDome.fillStyle(0x0C2B4E, 0.9);
        habDome.fillEllipse(this.domeCenterX, this.domeBaseY, 320, 150);
        habDome.lineStyle(3, UITheme.colors.primaryCyan, 1);
        habDome.strokeEllipse(this.domeCenterX, this.domeBaseY, 320, 150);

        // Internal Crew Life-Sign Glow
        this.add.text(this.domeCenterX, this.domeBaseY - 15, "🏠 HABITAT PRESSURIZED CABIN", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Dynamic Regolith Shield Layer Graphic (piles up over dome)
        this.regolithMoundGraphics = this.add.graphics();

        // Strict Viewport Geometry Mask to contain dome and regolith inside viewFrame
        const viewMaskG = this.make.graphics();
        viewMaskG.fillStyle(0xffffff);
        viewMaskG.fillRoundedRect(viewX, viewY, viewW, viewH, 10);
        const viewMask = viewMaskG.createGeometryMask();
        habDome.setMask(viewMask);
        this.regolithMoundGraphics.setMask(viewMask);

        this.updateRegolithVisuals(this.domeCenterX, this.domeBaseY);

        // Dosimeter Telemetry Box
        const radBoxY = topY + 310;
        const radBox = this.add.graphics();
        radBox.fillStyle(0x081528, 0.95);
        radBox.fillRoundedRect(leftX + 24, radBoxY, colW - 48, 170, 10);
        radBox.lineStyle(1.5, UITheme.colors.primaryCyan, 0.8);
        radBox.strokeRoundedRect(leftX + 24, radBoxY, colW - 48, 170, 10);

        this.add.text(leftX + 44, radBoxY + 16, "☢️ NASA DOSIMETER (RAD INSTRUMENT)", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });

        this.radDoseText = this.add.text(leftX + 44, radBoxY + 42, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "20px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
        this.updateRadDoseDisplay();

        this.add.text(leftX + 44, radBoxY + 82, this.challengeConfig.nasaFact, {
            fontFamily: UITheme.fonts.body,
            fontSize: "12.5px",
            color: UITheme.colors.textSecondary,
            lineSpacing: 4,
            wordWrap: { width: colW - 88 }
        });

        // -------------------------------------------------------------
        // RIGHT COLUMN: ROVER EXCAVATION & ENGINEERING CONTROLS
        // -------------------------------------------------------------
        const rightX = leftX + colW + 22;
        const rightBg = this.add.graphics();
        rightBg.fillStyle(UITheme.colors.cardBg, 0.9);
        rightBg.fillRoundedRect(rightX, topY, colW, colH, 12);
        rightBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        rightBg.strokeRoundedRect(rightX, topY, colW, colH, 12);

        this.add.text(rightX + 24, topY + 18, "ROVER BUCKET EXCAVATOR CONTROLS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: "#FFFFFF",
            fontStyle: "bold"
        });

        // Live Progress Gauge
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

        this.gaugeX = rightX + 24;
        this.gaugeY = gaugeY + 28;
        this.gaugeW = barW;
        this.gaugeH = barH;

        const trackBg = this.add.graphics();
        trackBg.fillStyle(0x061122, 1);
        trackBg.fillRoundedRect(this.gaugeX, this.gaugeY, this.gaugeW, this.gaugeH, 6);
        trackBg.lineStyle(1, UITheme.colors.panelBorder, 0.8);
        trackBg.strokeRoundedRect(this.gaugeX, this.gaugeY, this.gaugeW, this.gaugeH, 6);

        this.progressFill = this.add.graphics();
        this.updateProgressGauge(this.gaugeX, this.gaugeY, this.gaugeW, this.gaugeH);

        // Engineering Action Buttons
        const btnY = topY + 130;

        // Button 1: Scoop Regolith
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 26,
            width: colW - 48,
            height: 52,
            fontSize: "14px",
            text: "EXCAVATE BASALT REGOLITH (+0.5m)",
            primaryColor: UITheme.colors.primaryCyan,
            icon: "🚜",
            onClick: () => {
                SoundFX.playClick();
                this.excavateRegolith(0.5);
            }
        });

        // Button 2: Compact with Mechanical Tamper
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 92,
            width: colW - 48,
            height: 50,
            fontSize: "14px",
            text: "COMPACT DIRT SHIELD (-15% VOIDS)",
            primaryColor: UITheme.colors.marsAmber,
            icon: "🔨",
            onClick: () => {
                SoundFX.playClick();
                this.compactShield();
            }
        });

        // Button 3: Run Dosimeter Attenuation Test
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 158,
            width: colW - 48,
            height: 50,
            fontSize: "14px",
            text: "RUN RAD ATTENUATION SCAN",
            primaryColor: UITheme.colors.bioGreen,
            icon: "🔬",
            onClick: () => {
                SoundFX.playClick();
                this.runDosimeterScan();
            }
        });

        // Soil Composition Card
        const compBoxY = topY + 360;
        const compBox = this.add.graphics();
        compBox.fillStyle(0x08152B, 0.95);
        compBox.fillRoundedRect(rightX + 24, compBoxY, colW - 48, 120, 8);
        compBox.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        compBox.strokeRoundedRect(rightX + 24, compBoxY, colW - 48, 120, 8);

        this.add.text(rightX + 40, compBoxY + 16, "GEOLOGICAL SOIL SPECIFICATION:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
        this.add.text(rightX + 40, compBoxY + 38, "• Material: Iron-rich basaltic volcanic sand & permafrost clay\n• Density: 1.55 g/cm³ uncompacted → 1.95 g/cm³ compacted\n• Radiation Stopping Power: 3m soil = 10m water equivalent", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: "#E0ECFC",
            lineSpacing: 5
        });
    }

    private updateRegolithVisuals(centerX: number, baseY: number) {
        this.regolithMoundGraphics.clear();
        const thicknessRatio = Math.min(1.0, this.currentVal / this.targetThickness);
        const moundHeight = 25 + thicknessRatio * 75;

        // Draw earthy basalt mound
        this.regolithMoundGraphics.fillStyle(0x8D4024, 0.85);
        this.regolithMoundGraphics.fillEllipse(centerX, baseY - moundHeight / 2, 360 + thicknessRatio * 40, 110 + moundHeight);
        this.regolithMoundGraphics.lineStyle(2, 0xD4663A, 0.9);
        this.regolithMoundGraphics.strokeEllipse(centerX, baseY - moundHeight / 2, 360 + thicknessRatio * 40, 110 + moundHeight);
    }

    private updateRadDoseDisplay() {
        const dose = Math.max(0.04, 0.70 - (this.currentVal / this.targetThickness) * 0.65).toFixed(2);
        const attenuation = Math.min(96, Math.round((this.currentVal / this.targetThickness) * 95));
        this.radDoseText.setText(`DOSE: ${dose} mSv/Sol (ATTENUATION: ${attenuation}%)`);
        this.radDoseText.setColor(Number(dose) <= 0.15 ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr);
    }

    private updateProgressGauge(x: number, y: number, w: number, h: number) {
        const pct = Math.min(1.0, this.currentVal / this.targetThickness);
        this.progressText.setText(`SHIELD THICKNESS: ${this.currentVal.toFixed(1)} / ${this.targetThickness.toFixed(1)} METERS`);

        const isDone = this.currentVal >= this.targetThickness;
        this.statusBadge.setText(isDone ? "✔ RADIATION BARRIER SECURE" : "⏳ EXCAVATION IN PROGRESS");
        this.statusBadge.setColor(isDone ? UITheme.colors.bioGreenStr : UITheme.colors.solarGoldStr);

        this.progressFill.clear();
        this.progressFill.fillStyle(isDone ? UITheme.colors.bioGreen : UITheme.colors.primaryCyan, 1);
        this.progressFill.fillRoundedRect(x + 2, y + 2, Math.max(8, (w - 4) * pct), h - 4, 4);
    }

    protected isTargetMet(): boolean {
        return this.currentVal >= this.targetThickness;
    }

    private excavateRegolith(amount: number) {
        this.currentVal = Math.min(3.5, Number((this.currentVal + amount).toFixed(1)));

        this.updateRegolithVisuals(this.domeCenterX, this.domeBaseY);
        this.updateRadDoseDisplay();
        this.updateProgressGauge(this.gaugeX, this.gaugeY, this.gaugeW, this.gaugeH);

        if (this.currentVal >= this.targetThickness) {
            this.setActionFeedback("✔ REGOLITH BARRIER EXCEEDS 3.0m NASA TARGET! RADIATION NORMALIZED.", true);
        } else {
            this.setActionFeedback(`Excavated +${amount}m basalt soil. Current depth: ${this.currentVal.toFixed(1)}m.`, false);
        }
    }

    private compactShield() {
        this.compactionPercent = Math.min(100, this.compactionPercent + 25);
        this.updateRadDoseDisplay();
        this.setActionFeedback(`Hydraulic tamper engaged! Soil compaction: ${this.compactionPercent}%. Density increased.`, true);
    }

    private runDosimeterScan() {
        SoundFX.playToggle(true);
        this.updateRadDoseDisplay();
        const dose = Math.max(0.04, 0.70 - (this.currentVal / this.targetThickness) * 0.65).toFixed(2);
        this.setActionFeedback(`RAD telemetry sync complete: Current exposure ${dose} mSv/Sol.`, Number(dose) <= 0.15);
    }
}

export default Sol1DirtFortressScene;
