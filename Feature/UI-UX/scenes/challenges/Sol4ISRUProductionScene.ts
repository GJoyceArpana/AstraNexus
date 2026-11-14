import UITheme from "../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

export class Sol4ISRUProductionScene extends SolChallengeBaseScene {
    private moxieKg = 0.4;
    private waterLiters = 5;
    private foodKg = 2;
    private telemetryStatsText!: Phaser.GameObjects.Text;

    private gaugeX = 0;
    private gaugeY = 0;
    private gaugeW = 0;
    private gaugeH = 0;

    constructor() {
        super("Sol4ISRUProductionScene", {
            solNumber: 4,
            title: "SOL 4: LIVING OFF THE LAND",
            codename: "ISRU PRODUCTION TRINITY",
            hazardBadge: "EARTH EMERGENCY RATION DEPLETION",
            briefing: "Initial emergency supplies brought from Earth are running dangerously low. Outpost Sol must attain total In-Situ Resource Utilization (ISRU) autonomy: produce oxygen via MOXIE, harvest subsurface glacial ice, and grow LED hydroponic potatoes.",
            nasaFact: "NASA's MOXIE instrument on Perseverance successfully made oxygen out of the thin CO2 atmosphere. NASA and ESA plant experiments on ISS prove potatoes and leafy greens flourish under targeted red/blue PAR spectrums.",
            primaryTarget: "Achieve ISRU Trinity: Produce O2, harvest H2O ice, and yield crops.",
            unit: "Pillars",
            targetVal: 3,
            initialVal: 1
        });
    }

    protected createChallengeContent() {
        const frameX = (this.W - 1220) / 2;
        const frameY = (this.H - 660) / 2;
        const topY = frameY + 70;
        const colW = 575;
        const colH = 505;

        // -------------------------------------------------------------
        // LEFT COLUMN: 3 ISRU PRODUCTION PILLARS VISUALIZER
        // -------------------------------------------------------------
        const leftX = frameX + 24;
        const leftBg = this.add.graphics();
        leftBg.fillStyle(UITheme.colors.cardBg, 0.9);
        leftBg.fillRoundedRect(leftX, topY, colW, colH, 12);
        leftBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        leftBg.strokeRoundedRect(leftX, topY, colW, colH, 12);

        this.add.text(leftX + 24, topY + 18, "ISRU PRODUCTION TRINITY STATUS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });

        // 3 Visual Pillar Pod Cards
        const cardW = colW - 48;
        const cardH = 72;
        const startCardY = topY + 50;

        // Pod 1: MOXIE Oxygen
        this.createPillarCard(leftX + 24, startCardY, cardW, cardH, "💨 MOXIE 800°C ELECTROLYSIS", "Atmospheric CO₂ → Pure Breathable O₂", UITheme.colors.primaryCyan);
        // Pod 2: Subsurface Cryo Well
        this.createPillarCard(leftX + 24, startCardY + 84, cardW, cardH, "💧 CRYO-PERMAFROST WATER WELL", "Arcadia Glacial Subsurface Ice Melting", UITheme.colors.solarGold);
        // Pod 3: LED Greenhouse
        this.createPillarCard(leftX + 24, startCardY + 168, cardW, cardH, "🥔 HYDROPONIC LED GREENHOUSE", "Regolith Nutrient Beds & Red/Blue Spectrum", UITheme.colors.bioGreen);

        // Telemetry Box
        const statBoxY = topY + 310;
        const statBox = this.add.graphics();
        statBox.fillStyle(0x081528, 0.95);
        statBox.fillRoundedRect(leftX + 24, statBoxY, colW - 48, 170, 10);
        statBox.lineStyle(1.5, UITheme.colors.primaryCyan, 0.8);
        statBox.strokeRoundedRect(leftX + 24, statBoxY, colW - 48, 170, 10);

        this.add.text(leftX + 44, statBoxY + 16, "📊 LIVE HARVEST OUTPUT TELEMETRY", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });

        this.telemetryStatsText = this.add.text(leftX + 44, statBoxY + 42, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            color: "#FFFFFF",
            fontStyle: "bold"
        });
        this.updateStatsDisplay();

        this.add.text(leftX + 44, statBoxY + 82, this.challengeConfig.nasaFact, {
            fontFamily: UITheme.fonts.body,
            fontSize: "12.5px",
            color: UITheme.colors.textSecondary,
            lineSpacing: 4,
            wordWrap: { width: colW - 88 }
        });

        // -------------------------------------------------------------
        // RIGHT COLUMN: HARVEST & EXTRACTION ENGINEERING CONTROLS
        // -------------------------------------------------------------
        const rightX = leftX + colW + 22;
        const rightBg = this.add.graphics();
        rightBg.fillStyle(UITheme.colors.cardBg, 0.9);
        rightBg.fillRoundedRect(rightX, topY, colW, colH, 12);
        rightBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        rightBg.strokeRoundedRect(rightX, topY, colW, colH, 12);

        this.add.text(rightX + 24, topY + 18, "ISRU AUTONOMOUS REFINERY CONTROLS", {
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

        // Button 1: Run MOXIE
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 26,
            width: colW - 48,
            height: 52,
            fontSize: "14px",
            text: "RUN MOXIE ELECTROLYSIS (+1.2 kg O₂)",
            primaryColor: UITheme.colors.primaryCyan,
            icon: "💨",
            onClick: () => {
                SoundFX.playClick();
                this.runMOXIE();
            }
        });

        // Button 2: Drill Subsurface Ice
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 92,
            width: colW - 48,
            height: 50,
            fontSize: "14px",
            text: "DRILL SUBSURFACE GLACIAL ICE (+20 L H₂O)",
            primaryColor: UITheme.colors.solarGold,
            icon: "💧",
            onClick: () => {
                SoundFX.playClick();
                this.drillIce();
            }
        });

        // Button 3: Harvest Hydroponic Crops
        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 158,
            width: colW - 48,
            height: 50,
            fontSize: "14px",
            text: "HARVEST HYDROPONIC CROPS (+8 kg Food)",
            primaryColor: UITheme.colors.bioGreen,
            icon: "🥔",
            onClick: () => {
                SoundFX.playClick();
                this.harvestCrops();
            }
        });

        // Specs Box
        const specBoxY = topY + 360;
        const specBox = this.add.graphics();
        specBox.fillStyle(0x08152B, 0.95);
        specBox.fillRoundedRect(rightX + 24, specBoxY, colW - 48, 120, 8);
        specBox.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        specBox.strokeRoundedRect(rightX + 24, specBoxY, colW - 48, 120, 8);

        this.add.text(rightX + 40, specBoxY + 16, "NASA ECLSS & BIO-REGENERATIVE SPECIFICATION:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
        this.add.text(rightX + 40, specBoxY + 38, "• Human Daily Basals: 0.84 kg O₂ · 2.5 L potable water · 0.62 kg dry food\n• Loop Efficiency: 90% ECLSS urine recovery + 100% MOXIE O₂ top-up\n• Sol Autonomy Status: Complete closure achieved when all 3 pillars active", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: "#E0ECFC",
            lineSpacing: 5
        });
    }

    private createPillarCard(x: number, y: number, w: number, h: number, title: string, subtitle: string, color: number) {
        const bg = this.add.graphics();
        bg.fillStyle(0x061122, 0.95);
        bg.fillRoundedRect(x, y, w, h, 8);
        bg.lineStyle(1.5, color, 0.8);
        bg.strokeRoundedRect(x, y, w, h, 8);

        this.add.text(x + 16, y + 14, title, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: "#FFFFFF",
            fontStyle: "bold"
        });

        this.add.text(x + 16, y + 38, subtitle, {
            fontFamily: UITheme.fonts.body,
            fontSize: "11px",
            color: UITheme.colors.textSecondary
        });
    }

    private updateStatsDisplay() {
        this.telemetryStatsText.setText(`OXYGEN: ${this.moxieKg.toFixed(1)} kg  |  WATER: ${this.waterLiters} L  |  FOOD: ${this.foodKg} kg`);
    }

    private updateGauge(x: number, y: number, w: number, h: number) {
        let activePillars = 0;
        if (this.moxieKg >= 1.5) activePillars++;
        if (this.waterLiters >= 20) activePillars++;
        if (this.foodKg >= 8) activePillars++;

        this.currentVal = activePillars;
        const pct = activePillars / 3;
        this.progressText.setText(`ISRU AUTONOMY: ${activePillars} / 3 ACTIVE PILLARS`);

        const isFull = activePillars >= 3;
        this.statusBadge.setText(isFull ? "✔ 100% COLONY INDEPENDENCE ACHIEVED" : "⏳ HARVESTING IN SITU ASSETS");
        this.statusBadge.setColor(isFull ? UITheme.colors.bioGreenStr : UITheme.colors.solarGoldStr);

        this.progressFill.clear();
        this.progressFill.fillStyle(isFull ? UITheme.colors.bioGreen : UITheme.colors.primaryCyan, 1);
        this.progressFill.fillRoundedRect(x + 2, y + 2, Math.max(8, (w - 4) * pct), h - 4, 4);
    }

    private runMOXIE() {
        this.moxieKg = Number((this.moxieKg + 1.2).toFixed(1));
        this.refreshState();
        this.setActionFeedback("💨 MOXIE high-temp solid oxide cell yielded +1.2 kg pure O₂ from Martian CO₂!", true);
    }

    private drillIce() {
        this.waterLiters += 20;
        this.refreshState();
        this.setActionFeedback("💧 Thermal well drill tapped subsurface permafrost glacier! +20 L potable H₂O.", true);
    }

    private harvestCrops() {
        this.foodKg += 8;
        this.refreshState();
        this.setActionFeedback("🥔 Hydroponic LED chamber harvested! +8 kg fresh Martian potatoes.", true);
    }

    protected isTargetMet(): boolean {
        return this.moxieKg >= 1.5 && this.waterLiters >= 20 && this.foodKg >= 8;
    }

    private refreshState() {
        this.updateStatsDisplay();
        this.updateGauge(this.gaugeX, this.gaugeY, this.gaugeW, this.gaugeH);
    }
}

export default Sol4ISRUProductionScene;
