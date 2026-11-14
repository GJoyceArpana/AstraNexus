import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

export class Sol2PerchlorateBarrierScene extends SolChallengeBaseScene {
    private isSuitDocked = false;
    private isAirCurtainActive = false;
    private suitSprite!: Phaser.GameObjects.Container;
    private deconNozzles!: Phaser.GameObjects.Graphics;
    private toxicTelemetryText!: Phaser.GameObjects.Text;
    private suitportLockIndicator!: Phaser.GameObjects.Text;

    constructor() {
        super("Sol2PerchlorateBarrierScene", {
            solNumber: 2,
            title: "SOL 2: THE PERCHLORATE BARRIER",
            codename: "TOXIC SOIL & SUITPORT DOCKING",
            hazardBadge: "CHEMICALLY REACTIVE SOIL (ClO4- SALTS)",
            briefing: "Martian surface regolith contains 0.5%–1.0% toxic calcium and magnesium perchlorates. Inhaling perchlorate dust damages human thyroids and respiratory tracts. Never bring dusty EVA suits inside! Dock via the rear-entry Suitport to keep toxins outside.",
            nasaFact: "NASA Phoenix lander confirmed widespread perchlorates in 2008. NASA developed rear-entry Suitports: the spacesuit remains latched to the exterior hull while astronauts enter directly through the backpack hatch.",
            primaryTarget: "Dock through Suitport and purge cabin perchlorates below 15%.",
            unit: "%",
            targetVal: 15,
            initialVal: 65
        });
    }

    protected createChallengeContent() {
        // Toxic soil atmosphere with white perchlorate salt crusts
        this.createMartianSurfaceBase(0x191008, 0xC47B34, 0x8A4B24);

        // White Perchlorate Salt Patches on the ground
        const saltPatches = this.add.graphics().setDepth(-18);
        saltPatches.fillStyle(0xE5EEF8, 0.45);
        saltPatches.fillEllipse(280, 560, 160, 34);
        saltPatches.fillEllipse(540, 620, 220, 40);
        saltPatches.fillEllipse(960, 580, 180, 36);

        // 1. Habitat Airlock Bulkhead Wall (Center-Right: x=780, y=450)
        const airlockHull = this.add.graphics().setDepth(10);
        airlockHull.fillStyle(0x0A1B2D, 0.98);
        airlockHull.fillRoundedRect(640, 280, 360, 320, 16);
        airlockHull.lineStyle(3, UITheme.colors.primaryCyan, 0.9);
        airlockHull.strokeRoundedRect(640, 280, 360, 320, 16);

        // Clean interior habitat chamber visual behind glass
        const cabinInterior = this.add.graphics().setDepth(11);
        cabinInterior.fillStyle(0x062846, 0.9);
        cabinInterior.fillRoundedRect(770, 320, 210, 240, 10);
        cabinInterior.lineStyle(2, UITheme.colors.bioGreen, 0.8);
        cabinInterior.strokeRoundedRect(770, 320, 210, 240, 10);

        this.add.text(875, 340, "PRESSURIZED\nHABITAT CABIN", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.bioGreenStr,
            align: "center",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(12);

        // Rear-Entry Suitport Docking Collar
        const collar = this.add.graphics().setDepth(12);
        collar.fillStyle(0x1A3858, 1);
        collar.fillRoundedRect(680, 390, 80, 140, 10);
        collar.lineStyle(2, UITheme.colors.solarGold, 1);
        collar.strokeRoundedRect(680, 390, 80, 140, 10);

        this.suitportLockIndicator = this.add.text(720, 550, "[ UNLATCHED ]", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(13);

        // Overhead Decontamination HEPA Air Nozzles
        this.deconNozzles = this.add.graphics().setDepth(14);
        this.deconNozzles.fillStyle(0x4C6885, 1);
        this.deconNozzles.fillRoundedRect(690, 340, 60, 20, 4);
        this.deconNozzles.lineStyle(1.5, UITheme.colors.primaryCyan, 1);
        this.deconNozzles.strokeRoundedRect(690, 340, 60, 20, 4);

        // 2. Spacesuit Container on exterior gantry
        this.suitSprite = this.add.container(360, 460).setDepth(15);
        const suitBody = this.add.ellipse(0, 0, 52, 95, 0xE8EDF5);
        suitBody.setStrokeStyle(2, 0xD4663A, 0.9);
        const suitHelmet = this.add.circle(0, -38, 22, 0xD4663A);
        const visor = this.add.ellipse(0, -38, 26, 16, 0x00E5FF);
        const backpack = this.add.rectangle(24, 0, 20, 60, 0x7E94B5);
        this.suitSprite.add([backpack, suitBody, suitHelmet, visor]);

        // Docking Guide Rail on the surface ground
        const rail = this.add.graphics().setDepth(8);
        rail.lineStyle(4, 0x5C6D82, 0.8);
        rail.lineBetween(360, 520, 720, 520);
        rail.lineStyle(2, UITheme.colors.solarGold, 0.6);
        rail.lineBetween(360, 520, 720, 520);

        // 3. Chemical Contamination Sensor Panel on ground
        const sensorBox = this.add.graphics().setDepth(20);
        sensorBox.fillStyle(0x050F1E, 0.88);
        sensorBox.fillRoundedRect(220, 570, 300, 60, 8);
        sensorBox.lineStyle(1.5, UITheme.colors.primaryCyan, 0.8);
        sensorBox.strokeRoundedRect(220, 570, 300, 60, 8);

        this.add.text(236, 582, "🧪 CABIN PERCHLORATE CONTAMINATION", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setDepth(21);

        this.toxicTelemetryText = this.add.text(236, 603, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            fontStyle: "bold"
        }).setDepth(21);
        this.updateToxicDisplay();

        // 4. Interactive Surface Hotspots
        // Hotspot 1: Spacesuit (Click to Dock)
        this.createSurfaceHotspot({
            x: 360,
            y: 410,
            width: 120,
            height: 120,
            icon: "🚪",
            label: "EVA SUIT",
            actionHint: "CLICK TO DOCK IN SUITPORT",
            color: UITheme.colors.solarGold,
            onClick: () => this.dockSuit()
        });

        // Hotspot 2: Decontamination Nozzles (Click to Spray)
        this.createSurfaceHotspot({
            x: 720,
            y: 330,
            width: 140,
            height: 60,
            icon: "💨",
            label: "DECON AIR-CURTAIN",
            actionHint: "CLICK TO SPRAY HEPA JETS",
            color: UITheme.colors.primaryCyan,
            onClick: () => this.sprayDeconJets()
        });

        // Hotspot 3: Chemical Purge Console
        this.createSurfaceHotspot({
            x: 370,
            y: 600,
            width: 300,
            height: 60,
            icon: "🧪",
            label: "CHEMICAL PURGE",
            actionHint: "CLICK TO FLUSH VESTIBULE",
            color: UITheme.colors.bioGreen,
            onClick: () => this.purgeCabin()
        });
    }

    private dockSuit() {
        if (this.isSuitDocked) {
            this.showSurfaceFloatingText(720, 420, "✔ SUIT ALREADY LATCHED IN SUITPORT COLLAR", UITheme.colors.bioGreenStr);
            return;
        }

        // Slide suit along guide rail into the suitport hatch
        this.tweens.add({
            targets: this.suitSprite,
            x: 715,
            duration: 800,
            ease: "Cubic.easeInOut",
            onComplete: () => {
                this.isSuitDocked = true;
                this.suitportLockIndicator.setText("[ LATCHED & LOCKED ]");
                this.suitportLockIndicator.setColor(UITheme.colors.bioGreenStr);
                SoundFX.playToggle(true);

                this.currentVal = Math.max(25, this.currentVal - 25);
                this.updateToxicDisplay();
                this.updateVisorProgress(this.currentVal, this.challengeConfig.targetVal, "%");
                this.showSurfaceFloatingText(720, 390, "✔ Rear Hatch Locked Into Outer Hull! Toxins Isolated Outside.", UITheme.colors.bioGreenStr);
            }
        });
    }

    private sprayDeconJets() {
        if (!this.isSuitDocked) {
            SoundFX.playAlert();
            this.showSurfaceFloatingText(360, 410, "⚠ Dock suit into collar before activating air shower!", UITheme.colors.emergencyRedStr);
            return;
        }

        this.isAirCurtainActive = true;
        SoundFX.playClick();

        // Animated high-pressure cyan air particles spraying down
        for (let i = 0; i < 24; i++) {
            const p = this.add.circle(
                720 + Phaser.Math.Between(-30, 30),
                360,
                Phaser.Math.Between(2, 5),
                UITheme.colors.primaryCyan,
                0.9
            ).setDepth(25);

            this.tweens.add({
                targets: p,
                y: 530,
                alpha: 0,
                duration: Phaser.Math.Between(300, 600),
                onComplete: () => p.destroy()
            });
        }

        this.currentVal = Math.max(12, this.currentVal - 20);
        this.updateToxicDisplay();
        this.updateVisorProgress(this.currentVal, this.challengeConfig.targetVal, "%");
        this.showSurfaceFloatingText(720, 360, "💨 HEPA Air-Curtain Swept 99.7% of Surface Dust!", UITheme.colors.primaryCyanStr);
    }

    private purgeCabin() {
        if (!this.isSuitDocked) {
            SoundFX.playAlert();
            this.showSurfaceFloatingText(360, 410, "⚠ Suit must be docked before running chemical purge!", UITheme.colors.emergencyRedStr);
            return;
        }

        SoundFX.playToggle(true);
        this.currentVal = 5; // Safely below 15% target
        this.updateToxicDisplay();
        this.updateVisorProgress(this.currentVal, this.challengeConfig.targetVal, "%");
        this.showSurfaceFloatingText(370, 560, "✔ Cabin Purged! Perchlorate Residue at Safe 5% Level.", UITheme.colors.bioGreenStr);
    }

    private updateToxicDisplay() {
        this.toxicTelemetryText.setText(`CONCENTRATION: ${this.currentVal}% (SAFE LIMIT <= 15%)`);
        this.toxicTelemetryText.setColor(this.currentVal <= 15 ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr);
    }

    protected isTargetMet(): boolean {
        return this.isSuitDocked && this.isAirCurtainActive && this.currentVal <= this.challengeConfig.targetVal;
    }
}

export default Sol2PerchlorateBarrierScene;
