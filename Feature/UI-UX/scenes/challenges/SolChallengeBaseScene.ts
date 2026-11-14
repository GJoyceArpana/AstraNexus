import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../components/ButtonFactory.ts";

export interface SolChallengeBaseConfig {
    solNumber: number;
    title: string;
    codename: string;
    hazardBadge: string;
    briefing: string;
    nasaFact: string;
    primaryTarget: string;
    unit: string;
    targetVal: number;
    initialVal: number;
}

export interface SurfaceHotspotConfig {
    x: number;
    y: number;
    width: number;
    height: number;
    label: string;
    actionHint: string;
    icon?: string;
    color?: number;
    onClick: () => void;
}

export abstract class SolChallengeBaseScene extends Phaser.Scene {
    protected readonly W = 1280;
    protected readonly H = 720;
    protected challengeConfig: SolChallengeBaseConfig;

    protected currentVal: number;
    protected isCompleted = false;

    // Sleek EVA Visor HUD elements
    protected visorBg!: Phaser.GameObjects.Graphics;
    protected progressText!: Phaser.GameObjects.Text;
    protected progressFill!: Phaser.GameObjects.Graphics;
    protected statusBadge!: Phaser.GameObjects.Text;
    protected actionFeedbackText!: Phaser.GameObjects.Text;
    protected advanceBtnContainer!: Phaser.GameObjects.Container;

    constructor(sceneKey: string, config: SolChallengeBaseConfig) {
        super(sceneKey);
        this.challengeConfig = config;
        this.currentVal = config.initialVal;
    }

    preload() {
        if (!this.textures.exists("mars_terrain")) {
            this.load.image("mars_terrain", "/assets/game/mars/jezero-ctx-mosaic-3x3.png");
        }
        if (!this.textures.exists("base-station")) {
            this.load.image("base-station", "/assets/game/base/base-station.png");
        }
        if (!this.textures.exists("greenhouse")) {
            this.load.image("greenhouse", "/assets/game/base/greenhouse.png");
        }
        if (!this.textures.exists("solar-panels")) {
            this.load.image("solar-panels", "/assets/game/base/solar-panels.png");
        }
        if (!this.textures.exists("dish-antenna")) {
            this.load.image("dish-antenna", "/assets/game/base/dish-antenna.png");
        }
        if (!this.textures.exists("rover")) {
            this.load.image("rover", "/assets/game/base/rover.png");
        }
        if (!this.textures.exists("oxygen-cylinder")) {
            this.load.image("oxygen-cylinder", "/assets/game/base/oxygen-cylinder.png");
        }
        if (!this.textures.exists("drill-machine")) {
            this.load.image("drill-machine", "/assets/gadgets/drilling machine.png");
        }
    }

    create() {
        this.cameras.main.setBackgroundColor("#070E1A");

        this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
            this.tweens.killAll();
            this.input.keyboard?.removeAllListeners();
        });

        // 1. Build Interactive Martian Surface Environment
        this.createMartianSurfaceBase();

        // 2. Build Sol-Specific Martian Surface Content (implemented by subclasses)
        this.createChallengeContent();

        // 3. Floating NASA Astronaut Visor HUD (Top & Bottom)
        this.createVisorHUD();

        // 4. Keyboard Shortcut: ESC to safely return to Mars EVA
        this.input.keyboard?.on("keydown-ESC", () => {
            SoundFX.playClick();
            this.returnToMars();
        });
    }

    /**
     * Builds the expansive, immersive Martian backdrop and terrain ground
     */
    protected createMartianSurfaceBase(
        skyColor = 0x1A0D18,
        horizonColor = 0xC8573E,
        groundColor = 0x8C3F2D
    ) {
        // Deep Atmospheric Martian Sky
        this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, skyColor).setDepth(-30);

        // CTX Jezero Mosaic Terrain if present
        if (this.textures.exists("mars_terrain")) {
            const terrain = this.add.image(this.W / 2, this.H / 2, "mars_terrain");
            terrain.setDisplaySize(this.W, this.H);
            terrain.setAlpha(0.85);
            terrain.setDepth(-29);
        }

        // Distant Martian Mountain Horizon & Atmospheric Glow
        const horizonGlow = this.add.ellipse(this.W / 2, 340, 1340, 280, horizonColor, 0.28).setDepth(-28);
        this.tweens.add({
            targets: horizonGlow,
            alpha: 0.38,
            duration: 4000,
            yoyo: true,
            repeat: -1
        });

        // Mars Horizon Mountains
        const mountains = this.add.graphics().setDepth(-27);
        mountains.fillStyle(0x3B1812, 0.95);
        mountains.beginPath();
        mountains.moveTo(0, 380);
        mountains.lineTo(180, 310);
        mountains.lineTo(360, 350);
        mountains.lineTo(540, 290);
        mountains.lineTo(760, 340);
        mountains.lineTo(980, 280);
        mountains.lineTo(1160, 330);
        mountains.lineTo(1280, 310);
        mountains.lineTo(1280, 720);
        mountains.lineTo(0, 720);
        mountains.closePath();
        mountains.fillPath();

        // Expansive Surface Ground Pad
        const ground = this.add.ellipse(this.W / 2, 590, 1380, 320, groundColor, 0.95).setDepth(-20);
        ground.setStrokeStyle(3, 0xD4663A, 0.7);

        // Martian Surface Rocks & Craters
        const detailG = this.add.graphics().setDepth(-19);
        detailG.fillStyle(0x2B0F0B, 0.8);
        detailG.fillEllipse(220, 620, 140, 36);
        detailG.fillEllipse(1050, 600, 160, 42);
        detailG.fillEllipse(640, 670, 200, 46);

        detailG.fillStyle(0xD4663A, 0.5);
        detailG.fillCircle(180, 580, 6);
        detailG.fillCircle(440, 630, 8);
        detailG.fillCircle(880, 590, 7);
        detailG.fillCircle(1150, 640, 10);
    }

    /**
     * Creates a streamlined, semi-transparent NASA EVA Visor HUD at top and bottom
     */
    private createVisorHUD() {
        // -------------------------------------------------------------
        // TOP VISOR: Mission Directive, Objective Progress, NASA Insight
        // -------------------------------------------------------------
        this.visorBg = this.add.graphics();
        this.visorBg.fillStyle(0x050C1B, 0.88);
        this.visorBg.fillRoundedRect(20, 14, this.W - 40, 56, 12);
        this.visorBg.lineStyle(1.5, UITheme.colors.primaryCyan, 0.8);
        this.visorBg.strokeRoundedRect(20, 14, this.W - 40, 56, 12);
        this.visorBg.setDepth(100);

        // Sol Title
        this.add.text(38, 24, `✦ ${this.challengeConfig.title}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "15px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setDepth(101);

        // Sol Codename & Hazard
        this.add.text(38, 45, `DIRECTIVE: [ ${this.challengeConfig.codename} ]  ·  ${this.challengeConfig.hazardBadge}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setDepth(101);

        // Objective Progress Gauge in Top Right
        const gaugeW = 260;
        const gaugeH = 20;
        const gaugeX = this.W - 38 - gaugeW;
        const gaugeY = 32;

        const track = this.add.graphics();
        track.fillStyle(0x020712, 0.95);
        track.fillRoundedRect(gaugeX, gaugeY, gaugeW, gaugeH, 6);
        track.lineStyle(1, UITheme.colors.panelBorder, 0.8);
        track.strokeRoundedRect(gaugeX, gaugeY, gaugeW, gaugeH, 6);
        track.setDepth(101);

        this.progressFill = this.add.graphics().setDepth(102);

        this.progressText = this.add.text(gaugeX, gaugeY - 14, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setDepth(102);

        this.statusBadge = this.add.text(gaugeX + gaugeW, gaugeY - 14, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            fontStyle: "bold"
        }).setOrigin(1, 0).setDepth(102);

        this.updateVisorProgress(this.currentVal, this.challengeConfig.targetVal, this.challengeConfig.unit);

        // -------------------------------------------------------------
        // BOTTOM VISOR: Return Button, Real-Time Feedback, Complete Sol
        // -------------------------------------------------------------
        const bottomBar = this.add.graphics();
        bottomBar.fillStyle(0x050C1B, 0.88);
        bottomBar.fillRoundedRect(20, this.H - 62, this.W - 40, 50, 12);
        bottomBar.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        bottomBar.strokeRoundedRect(20, this.H - 62, this.W - 40, 50, 12);
        bottomBar.setDepth(100);

        // Return Button
        const backBtn = ButtonFactory.createButton({
            scene: this,
            x: 140,
            y: this.H - 37,
            width: 210,
            height: 38,
            fontSize: "12.5px",
            text: "← RETURN TO MARS BASE",
            primaryColor: UITheme.colors.cardHover,
            textColor: "#FFFFFF",
            onClick: () => {
                SoundFX.playClick();
                this.returnToMars();
            }
        });
        backBtn.setDepth(102);

        // Center Action Guidance
        this.actionFeedbackText = this.add.text(
            this.W / 2,
            this.H - 37,
            "CLICK STRUCTURES & ROVERS ON THE MARTIAN SURFACE TO EXECUTE DIRECTIVE",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: UITheme.colors.solarGoldStr,
                fontStyle: "bold",
                align: "center"
            }
        ).setOrigin(0.5).setDepth(102);

        // Advance Sol Button (Unlocks when target is met)
        this.advanceBtnContainer = ButtonFactory.createButton({
            scene: this,
            x: this.W - 160,
            y: this.H - 37,
            width: 250,
            height: 38,
            fontSize: "13px",
            text: "✦ VALIDATE & ADVANCE ➔",
            primaryColor: UITheme.colors.cardHover,
            textColor: "#7E94B5",
            onClick: () => {
                SoundFX.playClick();
                this.completeChallengeAndAdvance();
            }
        });
        this.advanceBtnContainer.setDepth(102);
    }

    /**
     * Updates the top visor progress gauge smoothly
     */
    protected updateVisorProgress(current: number, target: number, unit: string) {
        this.currentVal = current;
        const pct = Math.min(1.0, current / target);
        const gaugeW = 260;
        const gaugeH = 20;
        const gaugeX = this.W - 38 - gaugeW;
        const gaugeY = 32;

        this.progressText.setText(`DIRECTIVE PROGRESS: ${current.toFixed(1)} / ${target.toFixed(1)} ${unit}`);

        const met = this.isTargetMet();
        this.statusBadge.setText(met ? "✔ DIRECTIVE SATISFIED" : "⏳ IN PROGRESS");
        this.statusBadge.setColor(met ? UITheme.colors.bioGreenStr : UITheme.colors.solarGoldStr);

        this.progressFill.clear();
        this.progressFill.fillStyle(met ? UITheme.colors.bioGreen : UITheme.colors.primaryCyan, 1);
        this.progressFill.fillRoundedRect(gaugeX + 2, gaugeY + 2, Math.max(8, (gaugeW - 4) * pct), gaugeH - 4, 4);

        if (this.advanceBtnContainer) {
            this.advanceBtnContainer.setAlpha(met ? 1.0 : 0.5);
        }
    }

    /**
     * Helper to create interactive hotspots on the Martian surface with hover animations and floating labels
     */
    protected createSurfaceHotspot(config: SurfaceHotspotConfig): Phaser.GameObjects.Container {
        const c = this.add.container(config.x, config.y).setDepth(20);

        // Hover Glow Halo
        const glow = this.add.ellipse(0, 0, config.width + 30, config.height + 25, config.color || UITheme.colors.primaryCyan, 0);
        c.add(glow);

        // Hit Area
        const hitArea = this.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.001);
        hitArea.setInteractive({ useHandCursor: true });
        c.add(hitArea);

        // Floating Title Badge
        const badgeY = -config.height / 2 - 20;
        const badgeW = 210;
        const badgeH = 34;

        const badge = this.add.graphics();
        badge.fillStyle(0x050F1E, 0.88);
        badge.fillRoundedRect(-badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 6);
        badge.lineStyle(1.5, config.color || UITheme.colors.primaryCyan, 0.85);
        badge.strokeRoundedRect(-badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 6);
        c.add(badge);

        const labelText = this.add.text(0, badgeY - 5, `${config.icon || "⚙️"} ${config.label}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);
        c.add(labelText);

        // Floating Action Subtext
        const hintText = this.add.text(0, badgeY + 9, `[ ${config.actionHint} ]`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9.5px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        c.add(hintText);

        // Hover Animation
        hitArea.on("pointerover", () => {
            this.tweens.add({
                targets: glow,
                alpha: 0.28,
                duration: 200
            });
            this.tweens.add({
                targets: c,
                scaleX: 1.04,
                scaleY: 1.04,
                duration: 200
            });
        });

        hitArea.on("pointerout", () => {
            this.tweens.add({
                targets: glow,
                alpha: 0,
                duration: 200
            });
            this.tweens.add({
                targets: c,
                scaleX: 1,
                scaleY: 1,
                duration: 200
            });
        });

        hitArea.on("pointerdown", () => {
            SoundFX.playClick();
            this.tweens.add({
                targets: c,
                scaleX: 0.96,
                scaleY: 0.96,
                duration: 80,
                yoyo: true,
                onComplete: () => config.onClick()
            });
        });

        return c;
    }

    /**
     * Floats feedback text over a Martian surface structure when interacted with
     */
    protected showSurfaceFloatingText(x: number, y: number, text: string, color = UITheme.colors.bioGreenStr) {
        const floatText = this.add.text(x, y - 30, text, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: color,
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 3
        }).setOrigin(0.5).setDepth(80);

        this.tweens.add({
            targets: floatText,
            y: y - 85,
            alpha: 0,
            duration: 1400,
            ease: "Quad.easeOut",
            onComplete: () => floatText.destroy()
        });

        this.setActionFeedback(text, true);
    }

    protected setActionFeedback(msg: string, isSuccess = true) {
        if (!this.actionFeedbackText) return;
        this.actionFeedbackText.setText(msg.toUpperCase());
        this.actionFeedbackText.setColor(isSuccess ? UITheme.colors.bioGreenStr : UITheme.colors.solarGoldStr);

        this.tweens.killTweensOf(this.actionFeedbackText);
        this.tweens.add({
            targets: this.actionFeedbackText,
            scaleX: 1.05,
            scaleY: 1.05,
            duration: 120,
            yoyo: true
        });
    }

    protected completeChallengeAndAdvance() {
        if (!this.isTargetMet()) {
            SoundFX.playAlert();
            this.setActionFeedback("⚠ PRIMARY OBJECTIVE NOT MET YET! INTERACT WITH MARTIAN SURFACE OBJECTS.", false);
            return;
        }

        this.isCompleted = true;
        const nextSol = Math.min(7, this.challengeConfig.solNumber + 1);
        this.registry.set("solLevel", nextSol);

        SoundFX.playToggle(true);

        const marsScene = this.scene.get("MarsWorldScene");
        if (marsScene) {
            marsScene.events.emit("solLevelUpdated", nextSol);
        }
        this.returnToMars();
    }

    protected returnToMars() {
        this.scene.stop();
        const marsScene = this.scene.get("MarsWorldScene");
        if (marsScene) {
            marsScene.scene.wake();
            marsScene.scene.bringToTop();
        } else {
            this.scene.start("MarsWorldScene");
        }
    }

    protected abstract isTargetMet(): boolean;
    protected abstract createChallengeContent(): void;
}

export default SolChallengeBaseScene;
