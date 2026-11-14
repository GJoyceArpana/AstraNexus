import UITheme from "../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

export class Sol7JourneyHomeMAVScene extends SolChallengeBaseScene {
    private sampleMassKg = 980;
    private readonly dryMassKg = 9500;
    private readonly propMassKg = 3500;
    private readonly crewMassKg = 1200;
    private readonly maxTakeoffMassKg = 15000;

    private totalMassText!: Phaser.GameObjects.Text;
    private rocketGraphic!: Phaser.GameObjects.Graphics;
    private isLaunched = false;

    constructor() {
        super("Sol7JourneyHomeMAVScene", {
            solNumber: 7,
            title: "SOL 7: JOURNEY HOME",
            codename: "MARS ASCENT VEHICLE (MAV) LIFTOFF",
            hazardBadge: "STRICT 15,000 kg TAKEOFF PAYLOAD LIMIT",
            briefing: "The Mars Ascent Vehicle (MAV) sits fueled on the Jezero Crater launchpad. The Tsiolkovsky rocket equation is unforgiving: total vehicle takeoff mass cannot exceed 15,000 kg, or the ascent engines will fail to reach orbital velocity! Balance fuel, crew, and gathered geological samples, then launch home!",
            nasaFact: "The Tsiolkovsky Rocket Equation (Δv = Isp · g0 · ln(m0/mf)) proves that every extra kilogram carried off Mars requires ten times its weight in propellant. Overweight spacecraft cannot achieve orbit and will crash back to the surface.",
            primaryTarget: "Ensure total capsule mass <= 15,000 kg and ignite ascent engine.",
            unit: "kg",
            targetVal: 15000,
            initialVal: 15180
        });
    }

    protected createChallengeContent() {
        const frameX = (this.W - 1220) / 2;
        const frameY = (this.H - 660) / 2;
        const topY = frameY + 70;
        const colW = 575;
        const colH = 505;

        // -------------------------------------------------------------
        // LEFT COLUMN: MAV ROCKET ON LAUNCHPAD VIEWPORT
        // -------------------------------------------------------------
        const leftX = frameX + 24;
        const leftBg = this.add.graphics();
        leftBg.fillStyle(UITheme.colors.cardBg, 0.9);
        leftBg.fillRoundedRect(leftX, topY, colW, colH, 12);
        leftBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        leftBg.strokeRoundedRect(leftX, topY, colW, colH, 12);

        this.add.text(leftX + 24, topY + 18, "MARS ASCENT VEHICLE (MAV) LAUNCHPAD", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });

        // Launchpad Viewport
        const viewW = colW - 48;
        const viewH = 240;
        const viewX = leftX + 24;
        const viewY = topY + 50;

        const viewBg = this.add.graphics();
        viewBg.fillStyle(0x050C1A, 1);
        viewBg.fillRoundedRect(viewX, viewY, viewW, viewH, 10);
        viewBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        viewBg.strokeRoundedRect(viewX, viewY, viewW, viewH, 10);

        // Launchpad gantry
        const gantry = this.add.graphics();
        gantry.fillStyle(0x1B2C44, 0.9);
        gantry.fillRoundedRect(viewX + viewW / 2 - 90, viewY + viewH - 30, 180, 24, 4);

        // Rocket Capsule Silhouette Graphic
        this.rocketGraphic = this.add.graphics();
        this.drawRocketGraphic(viewX + viewW / 2, viewY + viewH - 30);

        // Mask launchpad viewport
        const launchMaskG = this.make.graphics();
        launchMaskG.fillStyle(0xffffff);
        launchMaskG.fillRoundedRect(viewX, viewY, viewW, viewH, 10);
        const launchMask = launchMaskG.createGeometryMask();
        this.rocketGraphic.setMask(launchMask);

        // Rocket Label
        this.add.text(viewX + viewW / 2, viewY + 30, "🚀 ARES-VII RETURN CAPSULE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Mass Equation Box
        const massBoxY = topY + 310;
        const massBox = this.add.graphics();
        massBox.fillStyle(0x081528, 0.95);
        massBox.fillRoundedRect(leftX + 24, massBoxY, colW - 48, 170, 10);
        massBox.lineStyle(1.5, UITheme.colors.primaryCyan, 0.8);
        massBox.strokeRoundedRect(leftX + 24, massBoxY, colW - 48, 170, 10);

        this.add.text(leftX + 44, massBoxY + 16, "⚖️ ROCKET EQUATION PAYLOAD BALANCE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });

        this.totalMassText = this.add.text(leftX + 44, massBoxY + 42, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "18px",
            fontStyle: "bold"
        });
        this.updateMassDisplay();

        this.add.text(leftX + 44, massBoxY + 82, this.challengeConfig.nasaFact, {
            fontFamily: UITheme.fonts.body,
            fontSize: "12.5px",
            color: UITheme.colors.textSecondary,
            lineSpacing: 4,
            wordWrap: { width: colW - 88 }
        });

        // -------------------------------------------------------------
        // RIGHT COLUMN: MASS BUDGET AUDIT & LIFTOFF IGNITION
        // -------------------------------------------------------------
        const rightX = leftX + colW + 22;
        const rightBg = this.add.graphics();
        rightBg.fillStyle(UITheme.colors.cardBg, 0.9);
        rightBg.fillRoundedRect(rightX, topY, colW, colH, 12);
        rightBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        rightBg.strokeRoundedRect(rightX, topY, colW, colH, 12);

        this.add.text(rightX + 24, topY + 18, "PRE-FLIGHT MASS BUDGET BREAKDOWN", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: "#FFFFFF",
            fontStyle: "bold"
        });

        // Mass Table Box
        const tableY = topY + 54;
        const tableBox = this.add.graphics();
        tableBox.fillStyle(0x061122, 0.95);
        tableBox.fillRoundedRect(rightX + 24, tableY, colW - 48, 140, 8);
        tableBox.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        tableBox.strokeRoundedRect(rightX + 24, tableY, colW - 48, 140, 8);

        const lines = [
            `• Rocket Dry Structure Mass: ${this.dryMassKg} kg (Fixed)`,
            `• LOX / Methane Propellant Mass: ${this.propMassKg} kg (Required for Δv 4.1 km/s)`,
            `• Astronaut Crew & Life Support: ${this.crewMassKg} kg (Fixed)`,
            `• Collected Mars Rock Samples: ${this.sampleMassKg} kg (Adjustable)`
        ];

        lines.forEach((line, i) => {
            this.add.text(rightX + 40, tableY + 18 + i * 28, line, {
                fontFamily: UITheme.fonts.body,
                fontSize: "12.5px",
                color: i === 3 ? UITheme.colors.solarGoldStr : "#FFFFFF"
            });
        });

        // Action Buttons
        const btnY = topY + 215;

        // Button 1: Jettison 100 kg regolith
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 24,
            width: colW - 48,
            height: 48,
            fontSize: "13px",
            text: "JETTISON 100 kg SURPLUS BASALT DIRT",
            primaryColor: UITheme.colors.marsAmber,
            icon: "⚖️",
            onClick: () => {
                SoundFX.playClick();
                this.jettisonMass(100);
            }
        });

        // Button 2: Jettison 85 kg rock slabs
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 80,
            width: colW - 48,
            height: 48,
            fontSize: "13px",
            text: "JETTISON 85 kg UNPROCESSED CORE SLABS",
            primaryColor: UITheme.colors.marsAmber,
            icon: "⚖️",
            onClick: () => {
                SoundFX.playClick();
                this.jettisonMass(85);
            }
        });

        // Button 3: Ignite Rocket Engine
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 144,
            width: colW - 48,
            height: 54,
            fontSize: "15px",
            text: "IGNITE MARS ASCENT VEHICLE (LIFTOFF)",
            primaryColor: UITheme.colors.bioGreen,
            textColor: "#FFFFFF",
            icon: "🚀",
            onClick: () => {
                SoundFX.playClick();
                this.attemptLiftoff();
            }
        });
    }

    protected isTargetMet(): boolean {
        const totalMass = this.dryMassKg + this.propMassKg + this.crewMassKg + this.sampleMassKg;
        return totalMass <= this.maxTakeoffMassKg && this.isLaunched;
    }

    private drawRocketGraphic(centerX: number, baseY: number) {
        this.rocketGraphic.clear();
        // Rocket Body
        this.rocketGraphic.fillStyle(0xE0E6ED, 1);
        this.rocketGraphic.fillRoundedRect(centerX - 24, baseY - 120, 48, 120, 6);
        // Nosecone
        this.rocketGraphic.fillStyle(UITheme.colors.emergencyRed, 1);
        this.rocketGraphic.fillTriangle(centerX - 24, baseY - 120, centerX + 24, baseY - 120, centerX, baseY - 165);
        // Fins
        this.rocketGraphic.fillStyle(UITheme.colors.primaryCyan, 1);
        this.rocketGraphic.fillTriangle(centerX - 24, baseY - 40, centerX - 42, baseY, centerX - 24, baseY);
        this.rocketGraphic.fillTriangle(centerX + 24, baseY - 40, centerX + 42, baseY, centerX + 24, baseY);
    }

    private updateMassDisplay() {
        const totalMass = this.dryMassKg + this.propMassKg + this.crewMassKg + this.sampleMassKg;
        this.currentVal = totalMass;

        const isSafe = totalMass <= this.maxTakeoffMassKg;
        this.totalMassText.setText(`TOTAL LIFTOFF MASS: ${totalMass} kg / 15,000 kg LIMIT`);
        this.totalMassText.setColor(isSafe ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr);
    }

    private jettisonMass(kg: number) {
        this.sampleMassKg = Math.max(0, this.sampleMassKg - kg);
        this.updateMassDisplay();

        const totalMass = this.dryMassKg + this.propMassKg + this.crewMassKg + this.sampleMassKg;
        if (totalMass <= this.maxTakeoffMassKg) {
            this.setActionFeedback(`✔ Surplus jettisoned! Total mass ${totalMass} kg <= 15,000 kg. CLEAR FOR LAUNCH!`, true);
        } else {
            this.setActionFeedback(`Jettisoned -${kg} kg. Total mass ${totalMass} kg (still +${totalMass - this.maxTakeoffMassKg} kg overweight).`, false);
        }
    }

    private attemptLiftoff() {
        const totalMass = this.dryMassKg + this.propMassKg + this.crewMassKg + this.sampleMassKg;
        if (totalMass > this.maxTakeoffMassKg) {
            SoundFX.playAlert();
            this.setActionFeedback(`⚠ LAUNCH ABORT: Capsule is ${totalMass - this.maxTakeoffMassKg} kg OVERWEIGHT! Rocket equation prevents orbit.`, false);
            return;
        }

        if (this.isLaunched) return;
        this.isLaunched = true;

        SoundFX.playToggle(true);
        this.setActionFeedback("🚀 ENGINES IGNITED! MARS ASCENT VEHICLE ACHIEVED ORBITAL RENDEZVOUS!", true);

        // Rocket Launch Animation: Flames and lift upward!
        this.tweens.add({
            targets: this.rocketGraphic,
            y: -250,
            duration: 2500,
            ease: "Quad.easeIn",
            onComplete: () => {
                this.cameras.main.flash(800, 255, 255, 255);
                this.time.delayedCall(1000, () => {
                    this.completeChallengeAndAdvance();
                });
            }
        });
    }
}

export default Sol7JourneyHomeMAVScene;
