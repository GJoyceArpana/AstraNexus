import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

export class Sol3RedGaleScene extends SolChallengeBaseScene {
    private solarOutputKW = 3.75;
    private nuclearOutputKW = 0;
    private habitatTempC = -15;

    private solarSprite!: Phaser.GameObjects.Image;
    private reactorCore!: Phaser.GameObjects.Arc;
    private reactorGlowRing!: Phaser.GameObjects.Ellipse;
    private thermalPipeGraphics!: Phaser.GameObjects.Graphics;
    private habSprite!: Phaser.GameObjects.Image;
    private thermalUnitText!: Phaser.GameObjects.Text;

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
        // Red Gale Storm Atmosphere: Crimson-amber dusky sky with dusty red soil
        this.createMartianSurfaceBase(0x240A06, 0xE0623A, 0x7E321E);

        // Soft Atmospheric Dust Storm Haze across the Martian surface
        const stormHaze = this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0xD4663A, 0.12).setDepth(-15);
        this.tweens.add({
            targets: stormHaze,
            alpha: 0.24,
            duration: 3500,
            yoyo: true,
            repeat: -1
        });

        // 1. Habitat Pressurized Dome (Center-Left: x=580, y=430)
        this.habSprite = this.add.image(580, 430, "base-station");
        this.habSprite.setScale(0.62).setDepth(10);
        this.habSprite.setTint(0x7594BA); // Cold blue frost tint initially

        // 2. Photovoltaic Solar Panels Farm (Far Left: x=230, y=520)
        this.solarSprite = this.add.image(230, 520, "solar-panels");
        this.solarSprite.setScale(0.65).setDepth(12);
        // Fine electrostatic dust layer tint on the solar panels (clean sprite tint, no misaligned 2D boxes)
        this.solarSprite.setTint(0x7A4030);

        // 3. High-Tech Isometric KRUSTY Kilopower Nuclear Reactor Station (Right: x=960, y=490)
        this.createKilopowerReactorStation(960, 490);

        // 4. Habitat Thermal Bus Heat Exchanger Manifold (Ground coupling beside dome: x=730, y=500)
        this.createThermalExchangerStation(730, 500);

        // 5. Molten Sodium-Potassium Thermal Conduits on ground
        this.thermalPipeGraphics = this.add.graphics().setDepth(11);
        this.drawThermalPipes(false);

        // 6. Interactive Surface Hotspots
        // Hotspot 1: KRUSTY Kilopower Reactor
        this.createSurfaceHotspot({
            x: 960,
            y: 490,
            width: 160,
            height: 150,
            icon: "⚛️",
            label: "KILOPOWER REACTOR",
            actionHint: "DEPLOY STIRLING CORE (+10 kW)",
            color: UITheme.colors.primaryCyan,
            onClick: () => this.deployReactor()
        });

        // Hotspot 2: Solar Panels (Click to engage electrostatic wipers)
        this.createSurfaceHotspot({
            x: 230,
            y: 520,
            width: 180,
            height: 130,
            icon: "🧹",
            label: "SOLAR ARRAY",
            actionHint: "WIPE SURFACE DUST (+2.5 kW)",
            color: UITheme.colors.solarGold,
            onClick: () => this.wipeSolarPanels()
        });

        // Hotspot 3: Habitat Thermal Bus (Positioned at the ground manifold, completely clear of the dome roof!)
        this.createSurfaceHotspot({
            x: 730,
            y: 500,
            width: 140,
            height: 90,
            icon: "🔥",
            label: "THERMAL BUS",
            actionHint: "DIVERT HEAT TO CABIN (+21°C)",
            color: UITheme.colors.bioGreen,
            onClick: () => this.heatHabitat()
        });
    }

    /**
     * Builds a high-tech isometric Kilopower nuclear reactor on the Martian surface
     */
    private createKilopowerReactorStation(x: number, y: number) {
        const c = this.add.container(x, y).setDepth(14);

        // Hexagonal concrete foundation pad
        const pad = this.add.graphics();
        pad.fillStyle(0x1F2A38, 1);
        pad.fillRoundedRect(-60, 20, 120, 35, 8);
        pad.lineStyle(2, 0x48586B, 1);
        pad.strokeRoundedRect(-60, 20, 120, 35, 8);
        c.add(pad);

        // Titanium Reactor Base Cylinder
        const base = this.add.graphics();
        base.fillStyle(0x28384A, 1);
        base.fillRoundedRect(-40, -40, 80, 70, 8);
        base.lineStyle(2, UITheme.colors.primaryCyan, 0.9);
        base.strokeRoundedRect(-40, -40, 80, 70, 8);
        c.add(base);

        // Beryllium Reflector & Stirling Radiator Fins
        const fins = this.add.graphics();
        fins.fillStyle(0x3B4F66, 1);
        fins.fillTriangle(0, -95, -55, -40, 55, -40);
        fins.lineStyle(2, 0x7E94B5, 1);
        fins.strokeTriangle(0, -95, -55, -40, 55, -40);
        c.add(fins);

        // Fission Core Chamber Viewport
        this.reactorCore = this.add.circle(0, -8, 18, 0x141E28);
        this.reactorCore.setStrokeStyle(2.5, 0x4A5D75);
        c.add(this.reactorCore);

        // Ambient glow ring around reactor (animates when active)
        this.reactorGlowRing = this.add.ellipse(0, 30, 140, 50, UITheme.colors.primaryCyan, 0);
        c.add(this.reactorGlowRing);
    }

    /**
     * Physical Ground Thermal Heat Exchanger unit coupling reactor to habitat
     */
    private createThermalExchangerStation(x: number, y: number) {
        const c = this.add.container(x, y).setDepth(13);

        const box = this.add.graphics();
        box.fillStyle(0x182434, 1);
        box.fillRoundedRect(-45, -25, 90, 50, 6);
        box.lineStyle(1.5, UITheme.colors.marsAmber, 0.9);
        box.strokeRoundedRect(-45, -25, 90, 50, 6);
        c.add(box);

        // Heat sink cooling gills
        const gills = this.add.graphics();
        gills.lineStyle(2, 0xC47B34, 0.8);
        for (let gx = -30; gx <= 30; gx += 12) {
            gills.lineBetween(gx, -18, gx, 18);
        }
        c.add(gills);

        // Temperature status readout
        this.thermalUnitText = this.add.text(0, 0, "-15°C", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        c.add(this.thermalUnitText);
    }

    private drawThermalPipes(isActive: boolean) {
        this.thermalPipeGraphics.clear();

        // Insulated Sodium Heat Pipe Conduit on ground between Reactor (960, 510) and Exchanger (730, 510)
        this.thermalPipeGraphics.lineStyle(6, isActive ? 0xE58635 : 0x2A3747, 1);
        this.thermalPipeGraphics.lineBetween(960, 510, 730, 510);
        // Exchanger to Hab Dome port (640, 480)
        this.thermalPipeGraphics.lineBetween(730, 500, 640, 480);

        if (isActive) {
            this.thermalPipeGraphics.lineStyle(2, 0xFFD54F, 0.95);
            this.thermalPipeGraphics.lineBetween(960, 510, 730, 510);
            this.thermalPipeGraphics.lineBetween(730, 500, 640, 480);
        }
    }

    private deployReactor() {
        if (this.nuclearOutputKW > 0) {
            this.showSurfaceFloatingText(960, 420, "✔ KILOPOWER REACTOR ALREADY GENERATING 10 kW", UITheme.colors.bioGreenStr);
            return;
        }

        this.nuclearOutputKW = 10.0;
        SoundFX.playToggle(true);

        // Core glow & Stirling pulsation animation
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

        this.tweens.add({
            targets: this.reactorGlowRing,
            alpha: 0.35,
            duration: 800
        });

        this.updateVisorProgress(this.solarOutputKW + this.nuclearOutputKW, this.challengeConfig.targetVal, "kW");
        this.showSurfaceFloatingText(960, 400, "⚛️ 10 kWe Stirling Nuclear Core Online (+10 kW)!", UITheme.colors.primaryCyanStr);
    }

    private wipeSolarPanels() {
        SoundFX.playClick();

        // Electrostatic wiper sweep animation across solar array
        const wiper = this.add.rectangle(150, 520, 8, 120, UITheme.colors.solarGold, 0.9).setDepth(15);
        this.tweens.add({
            targets: wiper,
            x: 320,
            duration: 550,
            yoyo: true,
            onComplete: () => {
                wiper.destroy();
                this.solarOutputKW = Math.min(6.5, this.solarOutputKW + 2.5);
                // Clear the dark dust tint: panels become clean and bright!
                this.solarSprite.clearTint();
                this.updateVisorProgress(this.solarOutputKW + this.nuclearOutputKW, this.challengeConfig.targetVal, "kW");
                this.showSurfaceFloatingText(230, 430, "🧹 Electrostatic Dust Repelled! Solar Output +2.5 kW.", UITheme.colors.solarGoldStr);
            }
        });
    }

    private heatHabitat() {
        if (this.nuclearOutputKW === 0) {
            SoundFX.playAlert();
            this.showSurfaceFloatingText(730, 450, "⚠ Deploy Kilopower reactor first to generate heat!", UITheme.colors.emergencyRedStr);
            return;
        }

        SoundFX.playToggle(true);
        this.habitatTempC = 21;
        this.drawThermalPipes(true);

        // Update thermal manifold readout
        if (this.thermalUnitText) {
            this.thermalUnitText.setText("+21°C");
            this.thermalUnitText.setColor(UITheme.colors.bioGreenStr);
        }

        // Melt habitat frost: tint turns warm ochre
        this.habSprite.setTint(0xF5BA8E);

        this.updateVisorProgress(this.solarOutputKW + this.nuclearOutputKW, this.challengeConfig.targetVal, "kW");
        this.showSurfaceFloatingText(730, 440, "🔥 Molten Sodium Thermal Bus Diverted to Cabin (+21°C)!", UITheme.colors.bioGreenStr);
    }

    protected isTargetMet(): boolean {
        return (this.solarOutputKW + this.nuclearOutputKW) >= this.challengeConfig.targetVal && this.habitatTempC > 0;
    }
}

export default Sol3RedGaleScene;
