import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

export class Sol1DirtFortressScene extends SolChallengeBaseScene {
    private targetThickness = 3.0; // 3.0 meters basalt regolith
    private compactionPercent = 25; // 25% to 100%

    private regolithMoundGraphics!: Phaser.GameObjects.Graphics;
    private domeSprite!: Phaser.GameObjects.Image;
    private roverSprite!: Phaser.GameObjects.Image;
    private radTelemetryText!: Phaser.GameObjects.Text;
    private shovelGraphic!: Phaser.GameObjects.Graphics;

    constructor() {
        super("Sol1DirtFortressScene", {
            solNumber: 1,
            title: "SOL 1: THE DIRT FORTRESS",
            codename: "REGOLITH RADIATION SHIELDING",
            hazardBadge: "GALACTIC COSMIC RAYS (GCR) & CME PROTONS",
            briefing: "Deep space radiation will exceed safe human exposure within 48 hours. Pilot the autonomous excavation rover to pile 3.0+ meters of basalt volcanic regolith over the pressurized habitat dome.",
            nasaFact: "Mars lacks a global magnetosphere. NASA Langley radiation testing demonstrated that 3.0 meters of compacted Martian regolith cuts GCR radiation exposure by over 95%.",
            primaryTarget: "Pile 3.0m compacted basalt soil over habitat dome.",
            unit: "Meters",
            targetVal: 3.0,
            initialVal: 0.8
        });
    }

    protected createChallengeContent() {
        // Build Cosmic Radiation Atmosphere (violet-tinted dusky sky & basalt terrain)
        this.createMartianSurfaceBase(0x1F0B18, 0xD45B38, 0x823420);

        // 1. Habitat Pressurized Dome (Center-Right: x=820, y=460)
        this.domeSprite = this.add.image(820, 460, "base-station");
        this.domeSprite.setScale(0.68).setDepth(10);
        this.domeSprite.setTint(0xF0A075);

        // Dynamic Basalt Shield Layer Graphic (builds over the dome)
        this.regolithMoundGraphics = this.add.graphics().setDepth(11);
        this.updateRegolithVisuals();

        // 2. Basalt Excavation Quarry Trench (Left sector: x=320, y=570)
        const trench = this.add.graphics().setDepth(5);
        trench.fillStyle(0x3B140B, 0.95);
        trench.fillRoundedRect(160, 560, 320, 70, 16);
        trench.lineStyle(2, 0xD4663A, 0.7);
        trench.strokeRoundedRect(160, 560, 320, 70, 16);

        this.add.text(320, 595, "BASALT REGOLITH QUARRY PIT", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(6);

        // 3. Heavy Autonomous Excavator Rover
        this.roverSprite = this.add.image(320, 500, "rover");
        this.roverSprite.setScale(0.58).setDepth(15);

        // Mechanical Shovel on the Rover
        this.shovelGraphic = this.add.graphics().setDepth(16);
        this.drawShovel(320 + 70, 500 + 20);

        // 4. Live Dosimeter Scanner Display on the ground
        const dosimeterBox = this.add.graphics().setDepth(20);
        dosimeterBox.fillStyle(0x040B18, 0.88);
        dosimeterBox.fillRoundedRect(560, 570, 260, 58, 8);
        dosimeterBox.lineStyle(1.5, UITheme.colors.primaryCyan, 0.8);
        dosimeterBox.strokeRoundedRect(560, 570, 260, 58, 8);

        this.add.text(575, 582, "☢️ NASA DOSIMETER SENSOR", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setDepth(21);

        this.radTelemetryText = this.add.text(575, 602, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            fontStyle: "bold"
        }).setDepth(21);
        this.updateDosimeterDisplay();

        // 5. Interactive Surface Hotspots on the Martian Ground
        // Hotspot 1: Excavation Rover (Click to scoop dirt)
        this.createSurfaceHotspot({
            x: 320,
            y: 440,
            width: 170,
            height: 90,
            icon: "🚜",
            label: "EXCAVATOR ROVER",
            actionHint: "CLICK TO EXCAVATE SOIL",
            color: UITheme.colors.solarGold,
            onClick: () => this.excavateSoil()
        });

        // Hotspot 2: Habitat Shield Mound (Click to compact)
        this.createSurfaceHotspot({
            x: 820,
            y: 380,
            width: 240,
            height: 120,
            icon: "🔨",
            label: "HABITAT REGOLITH SHIELD",
            actionHint: "CLICK TO COMPACT SOIL",
            color: UITheme.colors.marsAmber,
            onClick: () => this.compactSoil()
        });

        // Hotspot 3: Dosimeter Instrument
        this.createSurfaceHotspot({
            x: 690,
            y: 600,
            width: 260,
            height: 60,
            icon: "🔬",
            label: "RAD DOSIMETER",
            actionHint: "CLICK TO SCAN ATTENUATION",
            color: UITheme.colors.bioGreen,
            onClick: () => this.scanRadiation()
        });
    }

    private drawShovel(x: number, y: number) {
        this.shovelGraphic.clear();
        this.shovelGraphic.fillStyle(0x7E94B5, 1);
        this.shovelGraphic.fillRoundedRect(x - 10, y - 8, 32, 16, 4);
        this.shovelGraphic.lineStyle(2, 0xD4663A, 1);
        this.shovelGraphic.strokeRoundedRect(x - 10, y - 8, 32, 16, 4);
    }

    private excavateSoil() {
        if (this.currentVal >= this.targetThickness) {
            this.showSurfaceFloatingText(320, 480, "✔ MAXIMUM SAFE SHIELDING REACHED (3.2m)", UITheme.colors.bioGreenStr);
            return;
        }

        // Shovel scoop animation
        this.tweens.add({
            targets: this.roverSprite,
            y: 512,
            duration: 180,
            yoyo: true,
            repeat: 1
        });

        // Flying regolith dirt clod animation from rover to dome
        const clod = this.add.circle(380, 510, 9, 0x8D4024).setDepth(30);
        this.tweens.add({
            targets: clod,
            x: 780,
            y: 440,
            scaleX: 1.4,
            scaleY: 1.4,
            duration: 550,
            ease: "Quad.easeOut",
            onComplete: () => {
                clod.destroy();
                // Dust puff particles on dome
                for (let i = 0; i < 8; i++) {
                    const p = this.add.circle(
                        780 + Phaser.Math.Between(-30, 30),
                        440 + Phaser.Math.Between(-20, 20),
                        Phaser.Math.Between(3, 7),
                        0xD4663A,
                        0.8
                    ).setDepth(31);
                    this.tweens.add({
                        targets: p,
                        alpha: 0,
                        y: p.y - 25,
                        duration: 400,
                        onComplete: () => p.destroy()
                    });
                }

                this.currentVal = Math.min(3.5, Number((this.currentVal + 0.6).toFixed(1)));
                this.updateRegolithVisuals();
                this.updateDosimeterDisplay();
                this.updateVisorProgress(this.currentVal, this.targetThickness, "Meters");
                this.showSurfaceFloatingText(820, 410, `+0.6m Basalt Soil Added (${this.currentVal.toFixed(1)}m)`, UITheme.colors.solarGoldStr);
            }
        });
    }

    private compactSoil() {
        this.compactionPercent = Math.min(100, this.compactionPercent + 25);
        this.tweens.add({
            targets: this.domeSprite,
            scaleY: 0.65,
            duration: 100,
            yoyo: true,
            repeat: 2
        });

        this.updateDosimeterDisplay();
        this.showSurfaceFloatingText(820, 390, `Soil Compacted to ${this.compactionPercent}% Density!`, UITheme.colors.marsAmberStr);
    }

    private scanRadiation() {
        SoundFX.playToggle(true);
        // Bio-green radar beam sweep over dome
        const beam = this.add.rectangle(820, 460, 10, 220, UITheme.colors.bioGreen, 0.45).setDepth(25);
        this.tweens.add({
            targets: beam,
            scaleX: 30,
            alpha: 0,
            duration: 700,
            onComplete: () => beam.destroy()
        });

        this.updateDosimeterDisplay();
        const dose = Math.max(0.04, 0.70 - (this.currentVal / this.targetThickness) * 0.65).toFixed(2);
        this.showSurfaceFloatingText(690, 560, `Dose: ${dose} mSv/Sol · Attenuation ${Math.min(98, Math.round((this.currentVal / this.targetThickness) * 95))}%`, UITheme.colors.bioGreenStr);
    }

    private updateRegolithVisuals() {
        this.regolithMoundGraphics.clear();
        const ratio = Math.min(1.0, this.currentVal / this.targetThickness);
        const moundH = 30 + ratio * 85;

        // Draw protective basalt berm piling up over the dome
        this.regolithMoundGraphics.fillStyle(0x73331C, 0.88);
        this.regolithMoundGraphics.fillEllipse(820, 470 - moundH / 2, 280 + ratio * 40, 100 + moundH);
        this.regolithMoundGraphics.lineStyle(2.5, 0xC45C34, 0.95);
        this.regolithMoundGraphics.strokeEllipse(820, 470 - moundH / 2, 280 + ratio * 40, 100 + moundH);
    }

    private updateDosimeterDisplay() {
        const dose = Math.max(0.04, 0.70 - (this.currentVal / this.targetThickness) * 0.65).toFixed(2);
        this.radTelemetryText.setText(`DOSE: ${dose} mSv/Sol (TARGET <= 0.15)`);
        this.radTelemetryText.setColor(Number(dose) <= 0.15 ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr);
    }

    protected isTargetMet(): boolean {
        return this.currentVal >= this.targetThickness;
    }
}

export default Sol1DirtFortressScene;
