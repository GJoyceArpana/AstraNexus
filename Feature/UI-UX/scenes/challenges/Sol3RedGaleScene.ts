import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

export class Sol3RedGaleScene extends SolChallengeBaseScene {
    private solarOutputKW = 3.75;
    private nuclearOutputKW = 0;
    private habitatTempC = -15;

    private solarSprite!: Phaser.GameObjects.Image;
    private solarDustOverlay!: Phaser.GameObjects.Graphics;
    private reactorCore!: Phaser.GameObjects.Arc;
    private reactorContainer!: Phaser.GameObjects.Container;
    private thermalPipeGraphics!: Phaser.GameObjects.Graphics;
    private habSprite!: Phaser.GameObjects.Image;
    private telemetryText!: Phaser.GameObjects.Text;

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
        // Build storm atmosphere: deep crimson-amber gale sky
        this.createMartianSurfaceBase(0x280D07, 0xE0623A, 0x7E321E);

        // Ambient Storm Dust Haze in air (soft breathing alpha, zero glitch)
        const stormHaze = this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0xD4663A, 0.12).setDepth(-15);
        this.tweens.add({
            targets: stormHaze,
            alpha: 0.22,
            duration: 3500,
            yoyo: true,
            repeat: -1
        });

        // 1. Habitat Dome in center-background (x=590, y=420)
        this.habSprite = this.add.image(590, 420, "base-station");
        this.habSprite.setScale(0.62).setDepth(10);
        this.habSprite.setTint(0x7594BA); // Cold blue frost tint

        // 2. Solar Panels Farm on left ground (x=270, y=500)
        this.solarSprite = this.add.image(270, 500, "solar-panels");
        this.solarSprite.setScale(0.65).setDepth(12);

        // Heavy Martian Dust Layer over Solar Panels
        this.solarDustOverlay = this.add.graphics().setDepth(13);
        this.drawSolarDust(1.0);

        // 3. KRUSTY 10 kWe Kilopower Nuclear Reactor on right ground (x=900, y=490)
        this.reactorContainer = this.add.container(900, 490).setDepth(14);

        // Reactor Base & Shielding Cylinder
        const baseCylinder = this.add.graphics();
        baseCylinder.fillStyle(0x1F2A38, 1);
        baseCylinder.fillRoundedRect(-50, -40, 100, 80, 10);
        baseCylinder.lineStyle(2, 0x7E94B5, 0.9);
        baseCylinder.strokeRoundedRect(-50, -40, 100, 80, 10);
        this.reactorContainer.add(baseCylinder);

        // Stirling Engine Radiator Fins (Top Umbrella)
        const fins = this.add.graphics();
        fins.fillStyle(0x3B4E66, 1);
        fins.fillTriangle(0, -90, -60, -40, 60, -40);
        fins.lineStyle(2, UITheme.colors.primaryCyan, 0.8);
        fins.strokeTriangle(0, -90, -60, -40, 60, -40);
        this.reactorContainer.add(fins);

        // Glowing Fission Core
        this.reactorCore = this.add.circle(0, 0, 18, 0x1A222D);
        this.reactorCore.setStrokeStyle(2, 0x5C6D82);
        this.reactorContainer.add(this.reactorCore);

        // 4. Molten Sodium-Potassium Thermal Conduits on ground to Habitat
        this.thermalPipeGraphics = this.add.graphics().setDepth(11);
        this.drawThermalPipes(false);

        // 5. Grid & Thermal Status Telemetry Panel on ground
        const statBox = this.add.graphics().setDepth(20);
        statBox.fillStyle(0x050C1B, 0.9);
        statBox.fillRoundedRect(420, 570, 440, 60, 8);
        statBox.lineStyle(1.5, UITheme.colors.primaryCyan, 0.85);
        statBox.strokeRoundedRect(420, 570, 440, 60, 8);

        this.add.text(440, 582, "⚡ SURFACE POWER GRID & THERMAL EQUILIBRIUM", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setDepth(21);

        this.telemetryText = this.add.text(440, 603, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            fontStyle: "bold"
        }).setDepth(21);
        this.updateTelemetry();

        // 6. Interactive Surface Hotspots
        // Hotspot 1: KRUSTY Kilopower Reactor
        this.createSurfaceHotspot({
            x: 900,
            y: 430,
            width: 140,
            height: 140,
            icon: "⚛️",
            label: "KILOPOWER REACTOR",
            actionHint: "CLICK TO DEPLOY STIRLING CORE",
            color: UITheme.colors.primaryCyan,
            onClick: () => this.deployReactor()
        });

        // Hotspot 2: Solar Array (Click to engage electrostatic wipers)
        this.createSurfaceHotspot({
            x: 270,
            y: 440,
            width: 180,
            height: 120,
            icon: "🧹",
            label: "SOLAR ARRAY",
            actionHint: "CLICK TO WIPE DUST",
            color: UITheme.colors.solarGold,
            onClick: () => this.wipeSolarPanels()
        });

        // Hotspot 3: Habitat Thermal Bus (Click to heat cabin)
        this.createSurfaceHotspot({
            x: 590,
            y: 350,
            width: 180,
            height: 120,
            icon: "🔥",
            label: "HABITAT THERMAL BUS",
            actionHint: "CLICK TO DIVERT HEAT (+21°C)",
            color: UITheme.colors.bioGreen,
            onClick: () => this.heatHabitat()
        });
    }

    private drawSolarDust(dustAlpha: number) {
        this.solarDustOverlay.clear();
        if (dustAlpha <= 0.05) return;
        this.solarDustOverlay.fillStyle(0x8D3C20, dustAlpha * 0.7);
        this.solarDustOverlay.fillRoundedRect(270 - 90, 500 - 60, 180, 120, 8);
    }

    private drawThermalPipes(isActive: boolean) {
        this.thermalPipeGraphics.clear();
        this.thermalPipeGraphics.lineStyle(4, isActive ? 0xE58635 : 0x3E4E63, 1);
        this.thermalPipeGraphics.lineBetween(900, 490, 650, 460);

        if (isActive) {
            this.thermalPipeGraphics.lineStyle(2, 0xFFE082, 0.9);
            this.thermalPipeGraphics.lineBetween(900, 490, 650, 460);
        }
    }

    private deployReactor() {
        if (this.nuclearOutputKW > 0) {
            this.showSurfaceFloatingText(900, 410, "✔ KILOPOWER REACTOR ALREADY AT FULL 10 kW POWER", UITheme.colors.bioGreenStr);
            return;
        }

        this.nuclearOutputKW = 10.0;
        SoundFX.playToggle(true);

        // Core glow and pulsation
        this.reactorCore.setFillStyle(UITheme.colors.primaryCyan, 1);
        this.reactorCore.setStrokeStyle(3, 0xFFFFFF, 1);

        this.tweens.add({
            targets: this.reactorCore,
            scaleX: 1.25,
            scaleY: 1.25,
            duration: 500,
            yoyo: true,
            repeat: -1
        });

        this.updateTelemetry();
        this.updateVisorProgress(this.solarOutputKW + this.nuclearOutputKW, this.challengeConfig.targetVal, "kW");
        this.showSurfaceFloatingText(900, 400, "⚛️ 10 kWe Stirling Nuclear Core Online (+10 kW)!", UITheme.colors.primaryCyanStr);
    }

    private wipeSolarPanels() {
        SoundFX.playClick();
        // Wiper sweep animation across solar array
        const wiper = this.add.rectangle(180, 500, 8, 110, UITheme.colors.solarGold, 0.9).setDepth(15);
        this.tweens.add({
            targets: wiper,
            x: 360,
            duration: 600,
            yoyo: true,
            onComplete: () => {
                wiper.destroy();
                this.solarOutputKW = Math.min(6.5, this.solarOutputKW + 2.5);
                this.drawSolarDust(0.15); // Cleaned!
                this.updateTelemetry();
                this.updateVisorProgress(this.solarOutputKW + this.nuclearOutputKW, this.challengeConfig.targetVal, "kW");
                this.showSurfaceFloatingText(270, 420, "🧹 Electrostatic Dust Repelled! Solar Output +2.5 kW.", UITheme.colors.solarGoldStr);
            }
        });
    }

    private heatHabitat() {
        if (this.nuclearOutputKW === 0) {
            SoundFX.playAlert();
            this.showSurfaceFloatingText(590, 340, "⚠ Deploy Kilopower reactor first to generate thermal bus heat!", UITheme.colors.emergencyRedStr);
            return;
        }

        SoundFX.playToggle(true);
        this.habitatTempC = 21;
        this.drawThermalPipes(true);

        // Melt habitat frost: tint turns warm ochre
        this.habSprite.setTint(0xF0B085);

        this.updateTelemetry();
        this.updateVisorProgress(this.solarOutputKW + this.nuclearOutputKW, this.challengeConfig.targetVal, "kW");
        this.showSurfaceFloatingText(590, 340, "🔥 Molten Sodium Thermal Bus Diverted to Cabin (+21°C)!", UITheme.colors.bioGreenStr);
    }

    private updateTelemetry() {
        const total = this.solarOutputKW + this.nuclearOutputKW;
        const isWarm = this.habitatTempC > 0;
        this.telemetryText.setText(`POWER: ${total.toFixed(2)} kW (TARGET 12.0)  |  CABIN TEMP: ${this.habitatTempC}°C (${isWarm ? "STABLE" : "FREEZING"})`);
        this.telemetryText.setColor(total >= 12.0 && isWarm ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr);
    }

    protected isTargetMet(): boolean {
        return (this.solarOutputKW + this.nuclearOutputKW) >= this.challengeConfig.targetVal && this.habitatTempC > 0;
    }
}

export default Sol3RedGaleScene;
