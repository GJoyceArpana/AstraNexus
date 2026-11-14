import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

export class Sol3RedGaleScene extends SolChallengeBaseScene {
    private solarOutputKW = 3.75; // 75% obscuration from 15.0 kW baseline
    private nuclearOutputKW = 0;   // 0 until KRUSTY reactor deployed
    private habitatTempC = -15;    // Freezing until thermal bus engaged
    private dustClearedPct = 0;    // Electrostatic wipers sweep percentage

    // UI Telemetry Texts
    private powerSurplusText!: Phaser.GameObjects.Text;
    private solarStatusText!: Phaser.GameObjects.Text;
    private solarBarFill!: Phaser.GameObjects.Graphics;
    private reactorStatusText!: Phaser.GameObjects.Text;
    private reactorCoreBadge!: Phaser.GameObjects.Text;
    private thermalStatusText!: Phaser.GameObjects.Text;

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
        // LEFT COLUMN: NASA POWER & ATMOSPHERIC TELEMETRY SENSORS
        // -------------------------------------------------------------
        const leftX = frameX + 24;
        const leftBg = this.add.graphics();
        leftBg.fillStyle(UITheme.colors.cardBg, 0.9);
        leftBg.fillRoundedRect(leftX, topY, colW, colH, 12);
        leftBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        leftBg.strokeRoundedRect(leftX, topY, colW, colH, 12);

        this.add.text(leftX + 24, topY + 18, "⚡ MARS SURFACE POWER & ATMOSPHERIC SENSORS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });

        const cardW = colW - 48;
        const cardX = leftX + 24;
        const card1Y = topY + 48;

        // CARD 1: SOLAR ARRAY TELEMETRY
        const card1Bg = this.add.graphics();
        card1Bg.fillStyle(0x08152B, 0.95);
        card1Bg.fillRoundedRect(cardX, card1Y, cardW, 110, 8);
        card1Bg.lineStyle(1, UITheme.colors.panelBorder, 0.8);
        card1Bg.strokeRoundedRect(cardX, card1Y, cardW, 110, 8);

        this.add.text(cardX + 16, card1Y + 12, "☀️ PHOTOVOLTAIC SOLAR ARRAY SENSORS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });

        this.solarStatusText = this.add.text(cardX + 16, card1Y + 34, "", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: "#E0ECFC",
            lineSpacing: 4
        });

        // Dust Cleared Bar Track
        const solarBarBg = this.add.graphics();
        solarBarBg.fillStyle(0x040B18, 0.9);
        solarBarBg.fillRoundedRect(cardX + 16, card1Y + 80, cardW - 32, 16, 4);
        this.solarBarFill = this.add.graphics();

        // CARD 2: KRUSTY NUCLEAR REACTOR CORE
        const card2Y = card1Y + 120;
        const card2Bg = this.add.graphics();
        card2Bg.fillStyle(0x08152B, 0.95);
        card2Bg.fillRoundedRect(cardX, card2Y, cardW, 110, 8);
        card2Bg.lineStyle(1, UITheme.colors.panelBorder, 0.8);
        card2Bg.strokeRoundedRect(cardX, card2Y, cardW, 110, 8);

        this.add.text(cardX + 16, card2Y + 12, "⚛️ KRUSTY 10 kWe STIRLING FISSION CORE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });

        this.reactorCoreBadge = this.add.text(cardX + cardW - 16, card2Y + 12, "[ CORE OFFLINE ]", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold"
        }).setOrigin(1, 0);

        this.reactorStatusText = this.add.text(cardX + 16, card2Y + 36, "", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: "#E0ECFC",
            lineSpacing: 4
        });

        // CARD 3: COMBINED GRID TELEMETRY & SCIENCE FACT
        const card3Y = card2Y + 120;
        const card3Bg = this.add.graphics();
        card3Bg.fillStyle(0x061122, 0.95);
        card3Bg.fillRoundedRect(cardX, card3Y, cardW, 185, 8);
        card3Bg.lineStyle(1.5, UITheme.colors.primaryCyan, 0.8);
        card3Bg.strokeRoundedRect(cardX, card3Y, cardW, 185, 8);

        this.add.text(cardX + 16, card3Y + 14, "📊 BASE POWER GRID & HABITAT THERMAL BUS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });

        this.powerSurplusText = this.add.text(cardX + 16, card3Y + 38, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            fontStyle: "bold"
        });

        this.thermalStatusText = this.add.text(cardX + 16, card3Y + 68, "", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            fontStyle: "bold"
        });

        this.add.text(cardX + 16, card3Y + 102, this.challengeConfig.nasaFact, {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: UITheme.colors.textSecondary,
            lineSpacing: 4,
            wordWrap: { width: cardW - 32 }
        });

        // -------------------------------------------------------------
        // RIGHT COLUMN: KRUSTY KILOPOWER REACTOR & THERMAL CONSOLE
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

        // Main Mission Progress Gauge
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

        // 3 Interactive Action Buttons
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

        // Reactor Specifications Card
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

        // Render Initial Telemetry State
        this.refreshState();
    }

    private updateSolarCard() {
        const cardW = 575 - 48;
        const barW = cardW - 32;
        const frameX = (this.W - 1220) / 2;
        const leftX = frameX + 24;
        const cardX = leftX + 24;
        const card1Y = (this.H - 660) / 2 + 70 + 48;

        this.solarStatusText.setText(
            `Solar Generation: ${this.solarOutputKW.toFixed(2)} kW  |  Optical Opacity: Tau = 4.2\n` +
            `Dust Coating: ${100 - this.dustClearedPct}% Obscuration  |  Array Health: NOMINAL`
        );

        this.solarBarFill.clear();
        const fillW = Math.max(8, barW * (this.dustClearedPct / 100));
        this.solarBarFill.fillStyle(UITheme.colors.solarGold, 1);
        this.solarBarFill.fillRoundedRect(cardX + 16, card1Y + 80, fillW, 16, 4);
    }

    private updateReactorCard() {
        const isOnline = this.nuclearOutputKW > 0;
        this.reactorCoreBadge.setText(isOnline ? "[ CORE ONLINE · 10 kWe ]" : "[ CORE OFFLINE · 0 kWe ]");
        this.reactorCoreBadge.setColor(isOnline ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr);

        this.reactorStatusText.setText(
            `Fission Stirling Output: ${this.nuclearOutputKW.toFixed(1)} kW  |  Control Rods: ${isOnline ? "WITHDRAWN" : "INSERTED"}\n` +
            `Sodium Loop Temp: ${isOnline ? "923 K (650°C)" : "258 K (-15°C)"}  |  Converter Efficiency: ${isOnline ? "31.4%" : "0.0%"}`
        );
    }

    private updateSurplusDisplay() {
        const total = this.solarOutputKW + this.nuclearOutputKW;
        this.powerSurplusText.setText(`GRID GENERATION: ${total.toFixed(2)} kW (TARGET: 12.0 kW)`);
        this.powerSurplusText.setColor(total >= 12.0 ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr);

        const isWarm = this.habitatTempC > 0;
        this.thermalStatusText.setText(`CABIN TEMPERATURE: ${this.habitatTempC}°C  |  THERMAL STATUS: ${isWarm ? "STABLE & HABITABLE" : "HYPOTHERMIA RISK"}`);
        this.thermalStatusText.setColor(isWarm ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr);
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
        this.setActionFeedback("✔ KRUSTY Kilopower 10 kW nuclear Stirling reactor synchronized!", true);
    }

    private wipeSolarPanels() {
        this.dustClearedPct = Math.min(100, this.dustClearedPct + 40);
        this.solarOutputKW = Math.min(6.5, 3.75 + (this.dustClearedPct / 100) * 2.75);
        this.refreshState();
        this.setActionFeedback(`🧹 Electrostatic wipers swept dust! Solar array generation boosted (+${((this.dustClearedPct / 100) * 2.75).toFixed(2)} kW).`, true);
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
        this.updateSolarCard();
        this.updateReactorCard();
        this.updateSurplusDisplay();
        this.updateGauge(this.gaugeX, this.gaugeY, this.gaugeW, this.gaugeH);
    }
}

export default Sol3RedGaleScene;
