import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

export class Sol5SilenceCommsLagScene extends SolChallengeBaseScene {
    private dishAligned = false;
    private roverBufferLoaded = false;
    private crewSheltered = false;

    private dishSprite!: Phaser.GameObjects.Image;
    private roverSprite!: Phaser.GameObjects.Image;
    private bunkerDoor!: Phaser.GameObjects.Graphics;
    private telemetryText!: Phaser.GameObjects.Text;

    constructor() {
        super("Sol5SilenceCommsLagScene", {
            solNumber: 5,
            title: "SOL 5: THE 12-MINUTE SILENCE",
            codename: "SOLAR STORM & COMMS LAG",
            hazardBadge: "CME PROTON FLARE (+85 mSv) & COMMS BLACKOUT",
            briefing: "NASA DONKI space weather reports an X-class solar flare launching an energetic Coronal Mass Ejection (CME) toward Mars. Because radio signals take 12 minutes one-way, you must pre-program autonomous rover actions and shelter the crew!",
            nasaFact: "Radio signals between Earth and Mars take 4 to 24 minutes depending on planetary orbits. Mars rovers must execute pre-programmed drive sequences autonomously.",
            primaryTarget: "Align dish, load 3 autonomous rover buffer commands, and seal bunker.",
            unit: "Actions",
            targetVal: 3,
            initialVal: 0
        });
    }

    protected createChallengeContent() {
        // High crater rim summit overlooking starry deep space
        this.createMartianSurfaceBase(0x080E1C, 0xD4663A, 0x7E3420);

        // Pale Blue Dot (Earth) in distant sky
        this.add.circle(980, 180, 5, 0x4FC3F7).setDepth(-26);
        this.add.text(980, 160, "EARTH (210M km)", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: "#4FC3F7",
            fontStyle: "bold"
        }).setOrigin(0.5).setDepth(-25);

        // 1. Deep Space Dish Antenna on elevated crater rim (Left: x=280, y=450)
        this.dishSprite = this.add.image(280, 450, "dish-antenna");
        this.dishSprite.setScale(0.55).setDepth(12);

        // 2. Autonomous Survey Rover (Center: x=660, y=510)
        this.roverSprite = this.add.image(660, 510, "rover");
        this.roverSprite.setScale(0.58).setDepth(13);

        // 3. Subsurface Storm Shelter Bunker Hatch (Right: x=1020, y=480)
        const bunkerBase = this.add.graphics().setDepth(10);
        bunkerBase.fillStyle(0x1B2C44, 1);
        bunkerBase.fillRoundedRect(930, 420, 180, 120, 12);
        bunkerBase.lineStyle(2, UITheme.colors.solarGold, 0.9);
        bunkerBase.strokeRoundedRect(930, 420, 180, 120, 12);

        this.bunkerDoor = this.add.graphics().setDepth(11);
        this.drawBunkerDoor(false);

        // 4. Autonomous Comms Telemetry Box on ground
        const statBox = this.add.graphics().setDepth(20);
        statBox.fillStyle(0x050C1B, 0.9);
        statBox.fillRoundedRect(380, 580, 520, 58, 8);
        statBox.lineStyle(1.5, UITheme.colors.primaryCyan, 0.85);
        statBox.strokeRoundedRect(380, 580, 520, 58, 8);

        this.add.text(400, 592, "📡 DEEP SPACE TELEMETRY & FLIGHT BUFFER", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setDepth(21);

        this.telemetryText = this.add.text(400, 613, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            fontStyle: "bold"
        }).setDepth(21);
        this.updateTelemetry();

        // 5. Interactive Surface Hotspots
        // Hotspot 1: High-Gain Dish Antenna
        this.createSurfaceHotspot({
            x: 280,
            y: 410,
            width: 140,
            height: 140,
            icon: "📡",
            label: "HIGH-GAIN DISH",
            actionHint: "CLICK TO ALIGN TO EARTH",
            color: UITheme.colors.solarGold,
            onClick: () => this.alignDish()
        });

        // Hotspot 2: Autonomous Rover
        this.createSurfaceHotspot({
            x: 660,
            y: 450,
            width: 160,
            height: 120,
            icon: "🤖",
            label: "AUTONOMOUS ROVER",
            actionHint: "CLICK TO QUEUE 3 BUFFER SLOTS",
            color: UITheme.colors.primaryCyan,
            onClick: () => this.programRover()
        });

        // Hotspot 3: Storm Bunker Hatch
        this.createSurfaceHotspot({
            x: 1020,
            y: 430,
            width: 160,
            height: 120,
            icon: "🛡️",
            label: "STORM BUNKER",
            actionHint: "CLICK TO SEAL BLAST HATCH",
            color: UITheme.colors.bioGreen,
            onClick: () => this.sealBunker()
        });
    }

    private drawBunkerDoor(isSealed: boolean) {
        this.bunkerDoor.clear();
        this.bunkerDoor.fillStyle(isSealed ? 0x2E7D32 : 0x455A64, 1);
        this.bunkerDoor.fillRoundedRect(955, 445, 130, 70, 8);
        this.bunkerDoor.lineStyle(2, isSealed ? UITheme.colors.bioGreen : 0x78909C, 1);
        this.bunkerDoor.strokeRoundedRect(955, 445, 130, 70, 8);
    }

    private alignDish() {
        SoundFX.playToggle(true);

        // Dish pivot animation
        this.tweens.add({
            targets: this.dishSprite,
            angle: -18,
            duration: 800,
            ease: "Cubic.easeInOut",
            onComplete: () => {
                this.dishAligned = true;
                // Radio wave ring animation towards Earth
                for (let i = 0; i < 3; i++) {
                    const wave = this.add.ellipse(300, 420, 20, 20, 0x4FC3F7, 0).setDepth(25);
                    wave.setStrokeStyle(2, 0x4FC3F7, 0.9);
                    this.tweens.add({
                        targets: wave,
                        scaleX: 8,
                        scaleY: 8,
                        alpha: 0,
                        duration: 1200,
                        delay: i * 300,
                        repeat: -1
                    });
                }
                this.recalcState();
                this.showSurfaceFloatingText(280, 370, "📡 Deep Space Carrier Lock Acquired! 12m Lag Active.", UITheme.colors.solarGoldStr);
            }
        });
    }

    private programRover() {
        SoundFX.playClick();

        // Lidar laser scan sweep from rover
        const lidar = this.add.line(0, 0, 660, 490, 780, 520, UITheme.colors.primaryCyan).setDepth(25);
        lidar.setLineWidth(2);
        this.tweens.add({
            targets: lidar,
            alpha: 0,
            duration: 500,
            onComplete: () => lidar.destroy()
        });

        // Rover small forward roll
        this.tweens.add({
            targets: this.roverSprite,
            x: 685,
            duration: 400,
            yoyo: true
        });

        this.roverBufferLoaded = true;
        this.recalcState();
        this.showSurfaceFloatingText(660, 430, "🤖 3 Autonomous Navigation Waypoints Cached to Rover Buffer!", UITheme.colors.primaryCyanStr);
    }

    private sealBunker() {
        SoundFX.playToggle(true);
        this.crewSheltered = true;
        this.drawBunkerDoor(true);
        this.recalcState();
        this.showSurfaceFloatingText(1020, 400, "🛡️ Underground Radiation Storm Bunker Sealed! Crew Protected.", UITheme.colors.bioGreenStr);
    }

    private recalcState() {
        let count = 0;
        if (this.dishAligned) count++;
        if (this.roverBufferLoaded) count++;
        if (this.crewSheltered) count++;

        this.currentVal = count;
        this.updateTelemetry();
        this.updateVisorProgress(this.currentVal, this.challengeConfig.targetVal, "Actions");
    }

    private updateTelemetry() {
        this.telemetryText.setText(
            `DISH: ${this.dishAligned ? "LOCKED" : "UNALIGNED"} | BUFFER: ${this.roverBufferLoaded ? "LOADED (3 SLOTS)" : "EMPTY"} | BUNKER: ${this.crewSheltered ? "SEALED" : "OPEN"}`
        );
        this.telemetryText.setColor(this.currentVal >= 3 ? UITheme.colors.bioGreenStr : UITheme.colors.solarGoldStr);
    }

    protected isTargetMet(): boolean {
        return this.currentVal >= this.challengeConfig.targetVal;
    }
}

export default Sol5SilenceCommsLagScene;
