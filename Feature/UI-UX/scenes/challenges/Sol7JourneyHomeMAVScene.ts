import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

export class Sol7JourneyHomeMAVScene extends SolChallengeBaseScene {
    private dryMassKg = 9200;
    private propMassKg = 4800;
    private crewMassKg = 450;
    private sampleMassKg = 600; // Overweight by 50 kg initially (15,050 kg)
    private maxTakeoffMassKg = 15000;
    private isLaunched = false;
    private isGantryReleased = false;

    private rocketContainer!: Phaser.GameObjects.Container;
    private gantryArm!: Phaser.GameObjects.Graphics;
    private flameGraphics!: Phaser.GameObjects.Graphics;
    private massTelemetryText!: Phaser.GameObjects.Text;

    constructor() {
        super("Sol7JourneyHomeMAVScene", {
            solNumber: 7,
            title: "SOL 7: JOURNEY HOME",
            codename: "RETURN CAPSULE MASS BUDGET",
            hazardBadge: "STRICT 15,000 kg TAKEOFF MASS LIMIT",
            briefing: "The Mars Ascent Vehicle (MAV) is on the launchpad. The rocket equation is unforgiving: total takeoff weight cannot exceed 15,000 kg! Balance rocket propellant, crew mass, and collected geological samples to launch safely.",
            nasaFact: "The Tsiolkovsky Rocket Equation dictates that every extra kilogram on Mars requires 10+ kilograms of propellant to reach Mars orbit. Overweight rockets fail to achieve escape velocity.",
            primaryTarget: "Ensure total capsule mass <= 15,000 kg and ignite ascent engine.",
            unit: "kg",
            targetVal: 15000,
            initialVal: 15050
        });
    }

    protected createChallengeContent() {
        // Dramatic Sunset Martian Horizon sky at launch site
        this.createMartianSurfaceBase(0x1B0E14, 0xD45236, 0x823420);

        // Reinforced Concrete Launchpad Blast Pad on the surface
        const pad = this.add.graphics().setDepth(5);
        pad.fillStyle(0x2B3747, 1);
        pad.fillRoundedRect(440, 520, 400, 70, 12);
        pad.lineStyle(3, 0x5C6D82, 1);
        pad.strokeRoundedRect(440, 520, 400, 70, 12);

        // Blast Deflector Trenches
        pad.fillStyle(0x141B24, 1);
        pad.fillRoundedRect(560, 550, 160, 35, 6);

        // 1. Umbilical Launch Tower on right side
        const tower = this.add.graphics().setDepth(8);
        tower.lineStyle(4, 0x48586B, 1);
        tower.lineBetween(740, 530, 740, 220);
        tower.lineBetween(770, 530, 770, 220);
        for (let y = 240; y <= 500; y += 40) {
            tower.lineBetween(740, y, 770, y + 20);
            tower.lineBetween(770, y, 740, y + 20);
        }

        // Retractable Gantry Arm
        this.gantryArm = this.add.graphics().setDepth(9);
        this.drawGantryArm(false);

        // 2. Ares-VII Mars Ascent Vehicle (MAV) Rocket Container (x=640, y=410)
        this.rocketContainer = this.add.container(640, 410).setDepth(15);
        this.drawRocket(this.rocketContainer);

        // Rocket Engine Exhaust Flames
        this.flameGraphics = this.add.graphics().setDepth(14);

        // 3. Geological Sample Pallet on the ground (x=340, y=520)
        const samplePallet = this.add.graphics().setDepth(12);
        samplePallet.fillStyle(0x1B2C44, 1);
        samplePallet.fillRoundedRect(260, 480, 160, 60, 8);
        samplePallet.lineStyle(2, UITheme.colors.solarGold, 0.9);
        samplePallet.strokeRoundedRect(260, 480, 160, 60, 8);

        this.add.text(340, 500, "📦 SAMPLES PALLET", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(13);

        this.add.text(340, 520, "GEOLOGICAL CORE CRATES", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9.5px",
            color: "#FFFFFF"
        }).setOrigin(0.5).setDepth(13);

        // 4. Liftoff Mass Telemetry Display on ground
        const statBox = this.add.graphics().setDepth(20);
        statBox.fillStyle(0x050C1B, 0.9);
        statBox.fillRoundedRect(370, 580, 540, 58, 8);
        statBox.lineStyle(1.5, UITheme.colors.primaryCyan, 0.85);
        statBox.strokeRoundedRect(370, 580, 540, 58, 8);

        this.add.text(390, 592, "⚖️ TSIOLKOVSKY ROCKET EQUATION PAYLOAD BUDGET", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setDepth(21);

        this.massTelemetryText = this.add.text(390, 613, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            fontStyle: "bold"
        }).setDepth(21);
        this.updateMassDisplay();

        // 5. Interactive Surface Hotspots
        // Hotspot 1: Sample Crates (Click to Jettison)
        this.createSurfaceHotspot({
            x: 340,
            y: 440,
            width: 160,
            height: 100,
            icon: "⚖️",
            label: "SAMPLE PALLET",
            actionHint: "CLICK TO JETTISON -50 kg",
            color: UITheme.colors.solarGold,
            onClick: () => this.jettisonMass()
        });

        // Hotspot 2: Gantry Release Arm
        this.createSurfaceHotspot({
            x: 755,
            y: 330,
            width: 120,
            height: 90,
            icon: "🔓",
            label: "LAUNCH GANTRY",
            actionHint: "CLICK TO RETRACT CLAMPS",
            color: UITheme.colors.primaryCyan,
            onClick: () => this.retractGantry()
        });

        // Hotspot 3: MAV Rocket Ignition
        this.createSurfaceHotspot({
            x: 640,
            y: 300,
            width: 140,
            height: 220,
            icon: "🚀",
            label: "ARES-VII MAV",
            actionHint: "CLICK TO IGNITE ENGINES",
            color: UITheme.colors.bioGreen,
            onClick: () => this.launchRocket()
        });
    }

    private drawRocket(c: Phaser.GameObjects.Container) {
        const g = this.add.graphics();

        // Rocket Body Cylinder
        g.fillStyle(0xE5EEF8, 1);
        g.fillRoundedRect(-30, -110, 60, 200, 6);
        g.lineStyle(2, 0x48586B, 1);
        g.strokeRoundedRect(-30, -110, 60, 200, 6);

        // Nosecone
        g.fillStyle(0xD45B38, 1);
        g.fillTriangle(0, -170, -30, -110, 30, -110);
        g.lineStyle(2, 0xD45B38, 1);
        g.strokeTriangle(0, -170, -30, -110, 30, -110);

        // NASA Meatball & Ares Decal
        g.fillStyle(0x0B3D91, 1);
        g.fillCircle(0, -50, 14);

        // Aerodynamic Tail Fins
        g.fillStyle(0x00E5FF, 1);
        g.fillTriangle(-30, 50, -55, 90, -30, 90);
        g.fillTriangle(30, 50, 55, 90, 30, 90);

        // Rocket Engines Nozzles
        g.fillStyle(0x2B3747, 1);
        g.fillRoundedRect(-22, 90, 44, 20, 4);

        c.add(g);
    }

    private drawGantryArm(isRetracted: boolean) {
        this.gantryArm.clear();
        this.gantryArm.lineStyle(4, isRetracted ? 0x2E7D32 : 0x7E94B5, 1);
        const endX = isRetracted ? 710 : 665;
        this.gantryArm.lineBetween(740, 330, endX, 330);
    }

    private jettisonMass() {
        if (this.sampleMassKg <= 400) {
            this.showSurfaceFloatingText(340, 430, "✔ Core geological samples preserved (400 kg minimum).", UITheme.colors.bioGreenStr);
            return;
        }

        this.sampleMassKg -= 50;
        this.updateMassDisplay();

        const totalMass = this.dryMassKg + this.propMassKg + this.crewMassKg + this.sampleMassKg;
        if (totalMass <= this.maxTakeoffMassKg) {
            this.showSurfaceFloatingText(340, 430, `✔ Surplus Jettisoned! Mass: ${totalMass} kg <= 15,000 kg LIMIT. CLEAR FOR LAUNCH!`, UITheme.colors.bioGreenStr);
        } else {
            this.showSurfaceFloatingText(340, 430, `Jettisoned 50 kg. Total: ${totalMass} kg (${totalMass - this.maxTakeoffMassKg} kg Overweight).`, UITheme.colors.solarGoldStr);
        }
    }

    private retractGantry() {
        SoundFX.playClick();
        this.isGantryReleased = true;
        this.drawGantryArm(true);
        this.showSurfaceFloatingText(755, 300, "🔓 Umbilical Clamps Retracted from MAV Rocket Body!", UITheme.colors.primaryCyanStr);
    }

    private launchRocket() {
        const totalMass = this.dryMassKg + this.propMassKg + this.crewMassKg + this.sampleMassKg;
        if (totalMass > this.maxTakeoffMassKg) {
            SoundFX.playAlert();
            this.showSurfaceFloatingText(640, 260, `⚠ LAUNCH ABORT: Rocket is ${totalMass - this.maxTakeoffMassKg} kg OVERWEIGHT! Jettison rocks.`, UITheme.colors.emergencyRedStr);
            return;
        }

        if (!this.isGantryReleased) {
            SoundFX.playAlert();
            this.showSurfaceFloatingText(755, 300, "⚠ Retract gantry umbilical clamps before ignition!", UITheme.colors.solarGoldStr);
            return;
        }

        if (this.isLaunched) return;
        this.isLaunched = true;

        SoundFX.playToggle(true);
        this.showSurfaceFloatingText(640, 240, "🚀 ENGINES IGNITED! MARS ASCENT VEHICLE ACHIEVED ORBIT!", UITheme.colors.bioGreenStr);

        // Rocket Launch Animation: Flames, Surface Dust billow, Ascent
        this.tweens.add({
            targets: this.rocketContainer,
            y: -280,
            duration: 2600,
            ease: "Quad.easeIn",
            onUpdate: () => {
                // Draw flaming exhaust cone beneath rocket
                this.flameGraphics.clear();
                this.flameGraphics.fillStyle(0xFFD600, 0.95);
                this.flameGraphics.fillTriangle(640, this.rocketContainer.y + 105, 620, this.rocketContainer.y + 190, 660, this.rocketContainer.y + 190);
                this.flameGraphics.fillStyle(0xFF5722, 0.85);
                this.flameGraphics.fillTriangle(640, this.rocketContainer.y + 110, 630, this.rocketContainer.y + 170, 650, this.rocketContainer.y + 170);
            },
            onComplete: () => {
                this.flameGraphics.clear();
                this.time.delayedCall(400, () => {
                    this.completeChallengeAndAdvance();
                });
            }
        });
    }

    private updateMassDisplay() {
        const totalMass = this.dryMassKg + this.propMassKg + this.crewMassKg + this.sampleMassKg;
        this.currentVal = totalMass;

        const isSafe = totalMass <= this.maxTakeoffMassKg;
        this.massTelemetryText.setText(`TOTAL TAKEOFF MASS: ${totalMass} kg / 15,000 kg LIMIT`);
        this.massTelemetryText.setColor(isSafe ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr);

        this.updateVisorProgress(totalMass, this.maxTakeoffMassKg, "kg");
    }

    protected isTargetMet(): boolean {
        const totalMass = this.dryMassKg + this.propMassKg + this.crewMassKg + this.sampleMassKg;
        return totalMass <= this.maxTakeoffMassKg && this.isLaunched;
    }
}

export default Sol7JourneyHomeMAVScene;
