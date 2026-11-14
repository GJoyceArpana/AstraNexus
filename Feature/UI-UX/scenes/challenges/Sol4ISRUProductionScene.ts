import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

export class Sol4ISRUProductionScene extends SolChallengeBaseScene {
    private moxieO2Kg = 0;
    private iceWaterLiters = 0;
    private cropsHarvestedKg = 0;

    private moxieSprite!: Phaser.GameObjects.Container;
    private drillSprite!: Phaser.GameObjects.Container;
    private greenSprite!: Phaser.GameObjects.Image;
    private telemetryText!: Phaser.GameObjects.Text;

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
            initialVal: 0
        });
    }

    protected createChallengeContent() {
        // Glacial permafrost terrain atmosphere (blue-tinted horizon and icy ground)
        this.createMartianSurfaceBase(0x0E1929, 0x4A709C, 0x6E4238);

        // Subsurface Glacial Ice Shelf exposed on the ground
        const iceShelf = this.add.graphics().setDepth(-18);
        iceShelf.fillStyle(0x7EB8D9, 0.4);
        iceShelf.fillEllipse(640, 560, 360, 48);
        iceShelf.lineStyle(2, 0xA3D9F8, 0.7);
        iceShelf.strokeEllipse(640, 560, 360, 48);

        // 1. MOXIE Atmospheric CO2 Extraction Tower (Left: x=260, y=470)
        this.moxieSprite = this.add.container(260, 470).setDepth(12);
        const moxieBase = this.add.graphics();
        moxieBase.fillStyle(0x1F2A38, 1);
        moxieBase.fillRoundedRect(-40, -60, 80, 120, 8);
        moxieBase.lineStyle(2, UITheme.colors.primaryCyan, 1);
        moxieBase.strokeRoundedRect(-40, -60, 80, 120, 8);
        const moxieExhaust = this.add.rectangle(0, -75, 20, 30, 0x5C6D82);
        const o2Tank = this.add.image(28, 0, "oxygen-cylinder").setScale(0.38);
        this.moxieSprite.add([moxieBase, moxieExhaust, o2Tank]);

        // 2. Heavy Subsurface Cryo-Well Drill Rig (Center: x=640, y=480)
        this.drillSprite = this.add.container(640, 480).setDepth(13);
        const drillDerrick = this.add.graphics();
        drillDerrick.fillStyle(0x3B4A5C, 1);
        drillDerrick.fillTriangle(0, -90, -45, 40, 45, 40);
        drillDerrick.lineStyle(2, UITheme.colors.solarGold, 0.9);
        drillDerrick.strokeTriangle(0, -90, -45, 40, 45, 40);
        const drillPipe = this.add.rectangle(0, 0, 10, 80, 0x8DA2BA);
        this.drillSprite.add([drillDerrick, drillPipe]);

        // 3. LED Hydroponic Greenhouse (Right: x=1020, y=470)
        this.greenSprite = this.add.image(1020, 470, "greenhouse");
        this.greenSprite.setScale(0.55).setDepth(12);

        // 4. ISRU Production Telemetry Card on ground
        const statBox = this.add.graphics().setDepth(20);
        statBox.fillStyle(0x050C1B, 0.9);
        statBox.fillRoundedRect(360, 580, 560, 58, 8);
        statBox.lineStyle(1.5, UITheme.colors.primaryCyan, 0.85);
        statBox.strokeRoundedRect(360, 580, 560, 58, 8);

        this.add.text(380, 592, "🌿 ISRU RESOURCE AUTONOMY TELEMETRY", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setDepth(21);

        this.telemetryText = this.add.text(380, 613, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            fontStyle: "bold"
        }).setDepth(21);
        this.updateTelemetry();

        // 5. Interactive Surface Hotspots
        // Hotspot 1: MOXIE Tower
        this.createSurfaceHotspot({
            x: 260,
            y: 420,
            width: 130,
            height: 140,
            icon: "💨",
            label: "MOXIE O2 TOWER",
            actionHint: "CLICK TO EXTRACT OXYGEN",
            color: UITheme.colors.primaryCyan,
            onClick: () => this.extractOxygen()
        });

        // Hotspot 2: Cryo-Ice Drill
        this.createSurfaceHotspot({
            x: 640,
            y: 430,
            width: 140,
            height: 140,
            icon: "💧",
            label: "CRYO-ICE DRILL",
            actionHint: "CLICK TO HARVEST ICE",
            color: UITheme.colors.solarGold,
            onClick: () => this.drillGlacialIce()
        });

        // Hotspot 3: Hydroponic Greenhouse
        this.createSurfaceHotspot({
            x: 1020,
            y: 420,
            width: 150,
            height: 130,
            icon: "🥔",
            label: "LED GREENHOUSE",
            actionHint: "CLICK TO HARVEST POTATOES",
            color: UITheme.colors.bioGreen,
            onClick: () => this.harvestPotatoes()
        });
    }

    private extractOxygen() {
        SoundFX.playToggle(true);

        // MOXIE compressor vibration & vapor puffs
        this.tweens.add({
            targets: this.moxieSprite,
            y: 466,
            duration: 80,
            yoyo: true,
            repeat: 3
        });

        for (let i = 0; i < 12; i++) {
            const p = this.add.circle(
                260 + Phaser.Math.Between(-10, 10),
                390,
                Phaser.Math.Between(3, 7),
                UITheme.colors.primaryCyan,
                0.85
            ).setDepth(25);

            this.tweens.add({
                targets: p,
                y: 340,
                alpha: 0,
                scaleX: 1.6,
                scaleY: 1.6,
                duration: Phaser.Math.Between(400, 700),
                onComplete: () => p.destroy()
            });
        }

        this.moxieO2Kg = Math.min(2.5, Number((this.moxieO2Kg + 0.8).toFixed(1)));
        this.recalcPillars();
        this.showSurfaceFloatingText(260, 390, `💨 +0.8 kg Pure O2 Generated at 800°C!`, UITheme.colors.primaryCyanStr);
    }

    private drillGlacialIce() {
        SoundFX.playClick();

        // Drill bit downward push animation
        this.tweens.add({
            targets: this.drillSprite,
            y: 495,
            duration: 250,
            yoyo: true,
            repeat: 2
        });

        // Ice chip flying particles
        for (let i = 0; i < 16; i++) {
            const p = this.add.circle(
                640 + Phaser.Math.Between(-25, 25),
                530,
                Phaser.Math.Between(2, 6),
                0xA3D9F8,
                0.95
            ).setDepth(25);

            this.tweens.add({
                targets: p,
                x: 640 + Phaser.Math.Between(-60, 60),
                y: 510 + Phaser.Math.Between(-30, 10),
                alpha: 0,
                duration: 450,
                onComplete: () => p.destroy()
            });
        }

        this.iceWaterLiters = Math.min(30, this.iceWaterLiters + 10);
        this.recalcPillars();
        this.showSurfaceFloatingText(640, 420, `💧 +10L Melted Glacial H2O Pumped to Storage!`, UITheme.colors.solarGoldStr);
    }

    private harvestPotatoes() {
        SoundFX.playToggle(true);

        // Greenhouse grow-light illumination pulse
        const bioGlow = this.add.ellipse(1020, 470, 180, 130, UITheme.colors.bioGreen, 0.4).setDepth(13);
        this.tweens.add({
            targets: bioGlow,
            alpha: 0,
            duration: 600,
            onComplete: () => bioGlow.destroy()
        });

        this.cropsHarvestedKg = Math.min(15, this.cropsHarvestedKg + 5);
        this.recalcPillars();
        this.showSurfaceFloatingText(1020, 410, `🥔 +5 kg Nutrient LED Hydroponic Potatoes Harvested!`, UITheme.colors.bioGreenStr);
    }

    private recalcPillars() {
        let count = 0;
        if (this.moxieO2Kg >= 0.8) count++;
        if (this.iceWaterLiters >= 10) count++;
        if (this.cropsHarvestedKg >= 5) count++;

        this.currentVal = count;
        this.updateTelemetry();
        this.updateVisorProgress(this.currentVal, this.challengeConfig.targetVal, "Pillars");
    }

    private updateTelemetry() {
        this.telemetryText.setText(
            `O2: ${this.moxieO2Kg} kg (Pillar 1) | ICE H2O: ${this.iceWaterLiters} L (Pillar 2) | CROPS: ${this.cropsHarvestedKg} kg (Pillar 3)`
        );
        this.telemetryText.setColor(this.currentVal >= 3 ? UITheme.colors.bioGreenStr : UITheme.colors.solarGoldStr);
    }

    protected isTargetMet(): boolean {
        return this.currentVal >= this.challengeConfig.targetVal;
    }
}

export default Sol4ISRUProductionScene;
