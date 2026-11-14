import UITheme from "../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

export class Sol3RedGaleScene extends SolChallengeBaseScene {
    private powerSurplusText!: Phaser.GameObjects.Text;
    private stormParticles: Phaser.GameObjects.Arc[] = [];
    private solarOutputKW = 3.75; // 75% loss from 15.0 kW
    private nuclearOutputKW = 0;   // 0 until deployed
    private habitatTempC = -15;    // Freezing until thermal bus engaged

    private gaugeX = 0;
    private gaugeY = 0;
    private gaugeW = 0;
    private gaugeH = 0;

    constructor() {
        super("Sol3RedGaleScene", {
            solNumber: 3,
            title: "SOL 3: THE RED GALE",
            codename: "EXTREME DUST STORM & KILOPOWER",
            hazardBadge: "75% SOLAR OBSCURATION (TAU = 4.2)",
            briefing: "A blinding regional dust storm engulfs Jezero Crater. Fine electrostatic atmospheric dust cuts solar array generation from 15.0 kW down to 3.75 kW. Deploy and start the KRUSTY 10 kW Stirling nuclear fission reactor before the habitat freezes!",
            nasaFact: "NASA's Opportunity rover died in 2018 when a global dust storm cut solar power for months. To eliminate solar vulnerability, NASA Glenn developed Kilopower (KRUSTY): a compact, safe 10 kWe uranium fission Stirling reactor.",
            primaryTarget: "Deploy 10 kW Kilopower reactor and achieve +12 kW grid surplus.",
            unit: "kW",
            targetVal: 12.0,
            initialVal: 3.75
        });
    }

    protected createChallengeContent() {
        const frameX = (this.W - 1220) / 2;
        const frameY = (this.H - 660) / 2;
        const topY = frameY + 70;
        const colW = 575;
        const colH = 505;

        // -------------------------------------------------------------
        // LEFT COLUMN: BLINDING RED DUST STORM & GRID TELEMETRY
        // -------------------------------------------------------------
        const leftX = frameX + 24;
        const leftBg = this.add.graphics();
        leftBg.fillStyle(UITheme.colors.cardBg, 0.9);
        leftBg.fillRoundedRect(leftX, topY, colW, colH, 12);
        leftBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        leftBg.strokeRoundedRect(leftX, topY, colW, colH, 12);

        this.add.text(leftX + 24, topY + 18, "STORM VIEWPORT & SOLAR ARRAY SENSORS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });

        // Viewport
        const viewW = colW - 48;
        const viewH = 240;
        const viewX = leftX + 24;
        const viewY = topY + 50;

        const stormWindow = this.add.graphics();
        stormWindow.fillStyle(0x280E09, 0.95);
        stormWindow.fillRoundedRect(viewX, viewY, viewW, viewH, 10);
        stormWindow.lineStyle(2, UITheme.colors.marsAmber, 0.9);
        stormWindow.strokeRoundedRect(viewX, viewY, viewW, viewH, 10);

        // Animated Howling Dust Streaks (contained inside stormWindow via Geometry Mask)
        const stormMaskG = this.make.graphics();
        stormMaskG.fillStyle(0xffffff);
        stormMaskG.fillRoundedRect(viewX, viewY, viewW, viewH, 10);
        const stormMask = stormMaskG.createGeometryMask();

        for (let i = 0; i < 35; i++) {
            const p = this.add.circle(
                viewX + Phaser.Math.Between(0, viewW),
                viewY + Phaser.Math.Between(0, viewH),
                Phaser.Math.FloatBetween(1.5, 4),
                0xE3714A,
                Phaser.Math.FloatBetween(0.3, 0.8)
            );
            p.setMask(stormMask);
            this.stormParticles.push(p);

            this.tweens.add({
                targets: p,
                x: `+=${Phaser.Math.Between(150, 300)}`,
                duration: Phaser.Math.Between(400, 900),
                repeat: -1,
                onRepeat: () => {
                    p.x = viewX - 10;
                    p.y = viewY + Phaser.Math.Between(0, viewH);
                }
            });
        }

        this.add.text(viewX + viewW / 2, viewY + 30, "🌪 REGIONAL DUST GALE · ATMOSPHERIC OPACITY: TAU 4.2", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.marsAmberStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Habitat Dome in distance with faint light
        const habSilhouette = this.add.ellipse(viewX + viewW / 2, viewY + viewH - 40, 160, 70, 0x1A0905, 0.9);
        habSilhouette.setStrokeStyle(2, 0xD4663A, 0.8);

        // Telemetry Box
        const statBoxY = topY + 310;
        const statBox = this.add.graphics();
        statBox.fillStyle(0x081528, 0.95);
        statBox.fillRoundedRect(leftX + 24, statBoxY, colW - 48, 170, 10);
        statBox.lineStyle(1.5, UITheme.colors.primaryCyan, 0.8);
        statBox.strokeRoundedRect(leftX + 24, statBoxY, colW - 48, 170, 10);

        this.add.text(leftX + 44, statBoxY + 16, "⚡ BASE POWER & THERMAL GRID", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });

        this.powerSurplusText = this.add.text(leftX + 44, statBoxY + 42, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "18px",
            fontStyle: "bold"
        });
        this.updateSurplusDisplay();

        this.add.text(leftX + 44, statBoxY + 82, this.challengeConfig.nasaFact, {
            fontFamily: UITheme.fonts.body,
            fontSize: "12.5px",
            color: UITheme.colors.textSecondary,
            lineSpacing: 4,
            wordWrap: { width: colW - 88 }
        });

        // -------------------------------------------------------------
        // RIGHT COLUMN: KRUSTY KILOPOWER REACTOR CONTROLS
        // -------------------------------------------------------------
        const rightX = leftX + colW + 22;
        const rightBg = this.add.graphics();
        rightBg.fillStyle(UITheme.colors.cardBg, 0.9);
        rightBg.fillRoundedRect(rightX, topY, colW, colH, 12);
        rightBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        rightBg.strokeRoundedRect(rightX, topY, colW, colH, 12);

        this.add.text(rightX + 24, topY + 18, "KILOPOWER NUCLEAR STIRLING CONSOLE", {
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
        this.updateGauge(this.gaugeX, this.gaugeY, this.gaugeW, this.gaugeH);

        // Action Buttons
        const btnY = topY + 130;

        // Button 1: Deploy Kilopower Reactor
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 26,
            width: colW - 48,
            height: 52,
            fontSize: "14px",
            text: "DEPLOY 10 kW KILOPOWER STIRLING REACTOR",
            primaryColor: UITheme.colors.primaryCyan,
            icon: "⚛️",
            onClick: () => {
                SoundFX.playClick();
                this.deployKilopower();
            }
        });

        // Button 2: Electrostatic Panel Wipers
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 92,
            width: colW - 48,
            height: 50,
            fontSize: "14px",
            text: "ENGAGE ELECTROSTATIC SOLAR DUST WIPERS",
            primaryColor: UITheme.colors.solarGold,
            icon: "🧹",
            onClick: () => {
                SoundFX.playClick();
                this.wipeSolarPanels();
            }
        });

        // Button 3: Thermal Radiator Heat Exchanger
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 158,
            width: colW - 48,
            height: 50,
            fontSize: "14px",
            text: "DIVERT SODIUM-POTASSIUM HEAT TO CABIN (+21°C)",
            primaryColor: UITheme.colors.bioGreen,
            icon: "🔥",
            onClick: () => {
                SoundFX.playClick();
                this.engageHeating();
            }
        });

        // Reactor Specs Box
        const specBoxY = topY + 360;
        const specBox = this.add.graphics();
        specBox.fillStyle(0x08152B, 0.95);
        specBox.fillRoundedRect(rightX + 24, specBoxY, colW - 48, 120, 8);
        specBox.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        specBox.strokeRoundedRect(rightX + 24, specBoxY, colW - 48, 120, 8);

        this.add.text(rightX + 40, specBoxY + 16, "KRUSTY REACTOR ENGINEERING SPECIFICATION:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
        this.add.text(rightX + 40, specBoxY + 38, "• Core: U-235 cast alloy surrounded by BeO reflector\n• Heat Transfer: High-temperature sodium heat pipes to Stirling engines\n• Operational Lifespan: 10+ years continuous autonomous power regardless of dust", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: "#E0ECFC",
            lineSpacing: 5
        });
    }

    private updateSurplusDisplay() {
        const total = this.solarOutputKW + this.nuclearOutputKW;
        this.powerSurplusText.setText(`GRID GENERATION: ${total.toFixed(2)} kW  |  CABIN TEMP: ${this.habitatTempC}°C`);
        this.powerSurplusText.setColor(total >= 12.0 ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr);
    }

    private updateGauge(x: number, y: number, w: number, h: number) {
        const total = this.solarOutputKW + this.nuclearOutputKW;
        const pct = Math.min(1.0, total / this.challengeConfig.targetVal);
        this.progressText.setText(`GRID POWER: ${total.toFixed(1)} / ${this.challengeConfig.targetVal.toFixed(1)} kW`);

        const isSafe = total >= this.challengeConfig.targetVal && this.habitatTempC > 0;
        this.statusBadge.setText(isSafe ? "✔ BASE POWER GRID SECURE" : "⚠ POWER SHORTAGE (BLACKOUT RISK)");
        this.statusBadge.setColor(isSafe ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr);

        this.progressFill.clear();
        this.progressFill.fillStyle(isSafe ? UITheme.colors.bioGreen : UITheme.colors.primaryCyan, 1);
        this.progressFill.fillRoundedRect(x + 2, y + 2, Math.max(8, (w - 4) * pct), h - 4, 4);
    }

    private deployKilopower() {
        this.nuclearOutputKW = 10.0;
        this.refreshState();
        this.setActionFeedback("⚛️ KRUSTY Kilopower 10 kW Stirling nuclear reactor online and synchronized!", true);
    }

    private wipeSolarPanels() {
        this.solarOutputKW = Math.min(6.5, this.solarOutputKW + 2.5);
        this.refreshState();
        this.setActionFeedback("🧹 Electrostatic wipers repelled Martian dust! Solar output boosted (+2.5 kW).", true);
    }

    private engageHeating() {
        this.habitatTempC = 21;
        this.refreshState();
        this.setActionFeedback("🔥 Thermal bus engaged! Heat pipes pumping warmth to cabin (+21°C).", true);
    }

    protected isTargetMet(): boolean {
        const total = this.solarOutputKW + this.nuclearOutputKW;
        return total >= this.challengeConfig.targetVal && this.habitatTempC > 0;
    }

    private refreshState() {
        this.updateSurplusDisplay();
        this.updateGauge(this.gaugeX, this.gaugeY, this.gaugeW, this.gaugeH);
    }
}

export default Sol3RedGaleScene;
