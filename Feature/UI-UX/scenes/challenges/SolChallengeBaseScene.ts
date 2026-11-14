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

export abstract class SolChallengeBaseScene extends Phaser.Scene {
    protected readonly W = 1280;
    protected readonly H = 720;
    protected challengeConfig: SolChallengeBaseConfig;

    protected currentVal: number;
    protected isCompleted = false;

    // UI elements
    protected mainFrame!: Phaser.GameObjects.Graphics;
    protected progressFill!: Phaser.GameObjects.Graphics;
    protected progressText!: Phaser.GameObjects.Text;
    protected statusBadge!: Phaser.GameObjects.Text;
    protected actionFeedbackText!: Phaser.GameObjects.Text;

    constructor(sceneKey: string, config: SolChallengeBaseConfig) {
        super(sceneKey);
        this.challengeConfig = config;
        this.currentVal = config.initialVal;
    }

    create() {
        this.cameras.main.fadeIn(400, 10, 5, 20);

        // 1. Mars deep atmospheric background
        this.createAtmosphericBackdrop();

        // 2. High-Tech UI HUD Frame
        this.createHUDFrame();

        // 3. Top NASA Mission Directive Banner
        this.createTopBanner();

        // 4. Concrete Challenge Content (implemented by subclasses)
        this.createChallengeContent();

        // 5. Bottom Navigation Control Bar
        this.createBottomBar();
    }

    private createAtmosphericBackdrop() {
        // Deep Space Gradient
        const bg = this.add.rectangle(this.W / 2, this.H / 2, this.W, this.H, 0x070E1A).setOrigin(0.5);
        bg.setDepth(-10);

        // Atmospheric Mars Glow
        const halo = this.add.circle(this.W / 2, this.H + 80, 580, UITheme.colors.marsGlow, 0.22);
        halo.setDepth(-9);
        this.tweens.add({
            targets: halo,
            alpha: 0.32,
            duration: 3500,
            yoyo: true,
            repeat: -1
        });

        // Twinkling stars / dust
        for (let i = 0; i < 40; i++) {
            const p = this.add.circle(
                Phaser.Math.Between(0, this.W),
                Phaser.Math.Between(0, this.H * 0.7),
                Phaser.Math.FloatBetween(1, 2.5),
                UITheme.colors.marsAmber,
                Phaser.Math.FloatBetween(0.2, 0.6)
            );
            p.setDepth(-8);
        }
    }

    private createHUDFrame() {
        const frameW = 1220;
        const frameH = 660;
        const frameX = (this.W - frameW) / 2;
        const frameY = (this.H - frameH) / 2;

        this.mainFrame = this.add.graphics();
        this.mainFrame.fillStyle(UITheme.colors.panelBg, 0.94);
        this.mainFrame.fillRoundedRect(frameX, frameY, frameW, frameH, 14);
        this.mainFrame.lineStyle(2, UITheme.colors.primaryCyan, 0.9);
        this.mainFrame.strokeRoundedRect(frameX, frameY, frameW, frameH, 14);

        // Header accent bar (62px tall to cleanly accommodate 2 distinct lines on left and right)
        this.mainFrame.fillStyle(UITheme.colors.cardSelected, 0.4);
        this.mainFrame.fillRoundedRect(frameX, frameY, frameW, 62, { tl: 14, tr: 14, bl: 0, br: 0 });
    }

    private createTopBanner() {
        const frameX = (this.W - 1220) / 2;
        const frameY = (this.H - 660) / 2;

        // Left Side Line 1: Sol Title
        this.add.text(
            frameX + 24,
            frameY + 12,
            `✦ ${this.challengeConfig.title}`,
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "16px",
                color: UITheme.colors.primaryCyanStr,
                fontStyle: "bold",
                letterSpacing: 1.5
            }
        ).setDepth(10);

        // Left Side Line 2: Codename
        this.add.text(
            frameX + 24,
            frameY + 36,
            `MISSION DIRECTIVE: [ ${this.challengeConfig.codename} ]`,
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: UITheme.colors.solarGoldStr,
                fontStyle: "bold"
            }
        ).setDepth(10);

        // Right Side Line 1: Hazard Badge
        this.add.text(
            frameX + 1220 - 24,
            frameY + 12,
            `⚠ HAZARD: ${this.challengeConfig.hazardBadge}`,
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11.5px",
                color: UITheme.colors.emergencyRedStr,
                fontStyle: "bold"
            }
        ).setOrigin(1, 0).setDepth(10);

        // Right Side Line 2: Primary Target
        this.add.text(
            frameX + 1220 - 24,
            frameY + 36,
            `🎯 TARGET: ${this.challengeConfig.primaryTarget}`,
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: UITheme.colors.bioGreenStr,
                fontStyle: "bold"
            }
        ).setOrigin(1, 0).setDepth(10);

        // Subtle divider below header
        const div = this.add.graphics();
        div.lineStyle(1, UITheme.colors.panelBorder, 0.8);
        div.lineBetween(frameX + 20, frameY + 62, frameX + 1200, frameY + 62);
        div.setDepth(10);
    }

    private createBottomBar() {
        const frameX = (this.W - 1220) / 2;
        const frameY = (this.H - 660) / 2;
        const bottomY = frameY + 660 - 38;

        // Return to Mars EVA button
        const backBtn = ButtonFactory.createButton({
            scene: this,
            x: frameX + 130,
            y: bottomY,
            width: 220,
            height: 42,
            fontSize: "13px",
            text: "← RETURN TO MARS EVA",
            primaryColor: UITheme.colors.cardHover,
            textColor: "#FFFFFF",
            onClick: () => {
                SoundFX.playClick();
                this.returnToMars();
            }
        });
        backBtn.setDepth(10);

        // Advance / Complete Challenge Button
        const advanceBtn = ButtonFactory.createButton({
            scene: this,
            x: frameX + 1220 - 180,
            y: bottomY,
            width: 320,
            height: 44,
            fontSize: "14px",
            text: "✦ COMPLETE & ADVANCE SOL ➔",
            primaryColor: UITheme.colors.bioGreen,
            textColor: "#FFFFFF",
            icon: "✔",
            onClick: () => {
                SoundFX.playClick();
                this.completeChallengeAndAdvance();
            }
        });
        advanceBtn.setDepth(10);

        // Action Feedback banner in the middle with text wrapping
        this.actionFeedbackText = this.add.text(this.W / 2, bottomY, "NASA FLIGHT DIRECTIVE ACTIVE · EXECUTE ENGINEERING CONTROLS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: 520 }
        }).setOrigin(0.5).setDepth(10);
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
            this.setActionFeedback("⚠ PRIMARY OBJECTIVE NOT MET YET! COMPLETE NASA DIRECTIVE FIRST.", false);
            return;
        }

        this.isCompleted = true;
        const nextSol = Math.min(7, this.challengeConfig.solNumber + 1);
        this.registry.set("solLevel", nextSol);

        this.cameras.main.flash(500, 0, 230, 118);
        SoundFX.playToggle(true);

        this.time.delayedCall(600, () => {
            const marsScene = this.scene.get("MarsWorldScene");
            if (marsScene) {
                marsScene.events.emit("solLevelUpdated", nextSol);
            }
            this.returnToMars();
        });
    }

    protected returnToMars() {
        this.cameras.main.fadeOut(300, 10, 5, 20);
        this.time.delayedCall(300, () => {
            this.scene.stop();
            if (this.scene.isSleeping("MarsWorldScene")) {
                this.scene.wake("MarsWorldScene");
            } else {
                this.scene.start("MarsWorldScene");
            }
        });
    }

    /**
     * Subclasses must report whether the primary NASA directive for this Sol has been satisfied
     */
    protected abstract isTargetMet(): boolean;

    /**
     * Subclasses must implement their specific visual simulation and engineering controls
     */
    protected abstract createChallengeContent(): void;
}

export default SolChallengeBaseScene;
