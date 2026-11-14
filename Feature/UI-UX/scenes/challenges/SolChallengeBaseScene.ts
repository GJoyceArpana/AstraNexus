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

        // 1. Build Authentic Martian Surface Panorama
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
     * Builds an authentic Martian surface panorama:
     * - Deep cosmic sky with twinkling stars
     * - Smooth, realistic crater rim and mountain ridges along the horizon
     * - Pulsing atmospheric dust glow
     * - Rich, textured Martian ground plain with natural craters and basalt rocks
     */
    protected createMartianSurfaceBase(
        skyColor = 0x180D1A,
        horizonColor = 0xD4663A,
        groundColor = 0x8C3F2D
    ) {
        const bgG = this.add.graphics().setDepth(-30);

        // 1. Deep Cosmic Sky Gradient (y = 0 to 420)
        bgG.fillGradientStyle(0x06030A, 0x06030A, skyColor, skyColor, 1);
        bgG.fillRect(0, 0, this.W, 420);

        // Twinkling Upper Atmosphere Stars (y = 10 to 220)
        const starGraphics = this.add.graphics().setDepth(-29);
        starGraphics.fillStyle(0xFFFFFF, 0.85);
        for (let i = 0; i < 45; i++) {
            const sx = (i * 29 + 17) % this.W;
            const sy = (i * 19 + 23) % 200;
            const size = (i % 3 === 0) ? 2 : 1.2;
            starGraphics.fillCircle(sx, sy, size);
        }

        // 2. Distant Martian Mountain Ridges (Layer 1: Far horizon foothills)
        const farMountains = this.add.graphics().setDepth(-28);
        farMountains.fillStyle(skyColor, 0.7);
        farMountains.beginPath();
        farMountains.moveTo(0, 360);
        farMountains.lineTo(160, 325);
        farMountains.lineTo(340, 350);
        farMountains.lineTo(520, 315);
        farMountains.lineTo(700, 345);
        farMountains.lineTo(890, 320);
        farMountains.lineTo(1080, 350);
        farMountains.lineTo(1280, 330);
        farMountains.lineTo(1280, 420);
        farMountains.lineTo(0, 420);
        farMountains.closePath();
        farMountains.fillPath();

        // 3. Layer 2: Rolling Red Sand Dunes & Crater Rim
        const midDunes = this.add.graphics().setDepth(-27);
        midDunes.fillStyle(horizonColor, 0.45);
        midDunes.beginPath();
        midDunes.moveTo(0, 385);
        midDunes.lineTo(220, 360);
        midDunes.lineTo(460, 380);
        midDunes.lineTo(680, 355);
        midDunes.lineTo(920, 375);
        midDunes.lineTo(1140, 355);
        midDunes.lineTo(1280, 380);
        midDunes.lineTo(1280, 430);
        midDunes.lineTo(0, 430);
        midDunes.closePath();
        midDunes.fillPath();

        // 4. Mars Atmospheric Horizon Dust Glow Band
        const horizonGlow = this.add.ellipse(this.W / 2, 380, 1340, 160, horizonColor, 0.28).setDepth(-26);
        this.tweens.add({
            targets: horizonGlow,
            alpha: 0.42,
            duration: 3800,
            yoyo: true,
            repeat: -1
        });

        // 5. Expansive Martian Ground Plain (y = 390 to 720)
        const groundG = this.add.graphics().setDepth(-25);
        groundG.fillGradientStyle(groundColor, groundColor, 0x481E15, 0x481E15, 1);
        groundG.fillRect(0, 390, this.W, this.H - 390);

        // Ground Horizon Edge Line
        groundG.lineStyle(1.5, horizonColor, 0.55);
        groundG.lineBetween(0, 390, this.W, 390);

        // 6. Natural Martian Surface Features (Crater depressions & basalt rocks)
        const detailG = this.add.graphics().setDepth(-24);

        // Soft Crater Basins
        const drawCrater = (cx: number, cy: number, rx: number, ry: number) => {
            detailG.fillStyle(0x280E09, 0.65);
            detailG.fillEllipse(cx, cy, rx, ry);
            detailG.lineStyle(1.5, horizonColor, 0.35);
            detailG.strokeEllipse(cx, cy, rx, ry);
        };
        drawCrater(210, 490, 160, 34);
        drawCrater(640, 630, 220, 42);
        drawCrater(1080, 520, 180, 38);

        // Basalt Rocks with subtle cast shadows
        const drawRock = (rx: number, ry: number, size: number) => {
            detailG.fillStyle(0x1B0A06, 0.55);
            detailG.fillEllipse(rx + size * 0.4, ry + size * 0.3, size * 1.8, size * 0.7);
            detailG.fillStyle(0x5A2418, 0.9);
            detailG.fillCircle(rx, ry, size);
            detailG.fillStyle(horizonColor, 0.4);
            detailG.fillCircle(rx - size * 0.2, ry - size * 0.2, size * 0.5);
        };
        drawRock(150, 430, 6);
        drawRock(390, 550, 8);
        drawRock(520, 460, 5);
        drawRock(880, 560, 9);
        drawRock(1180, 450, 7);
        drawRock(780, 610, 6);
    }

    /**
     * Creates a streamlined NASA EVA Visor HUD at top and bottom.
     * Top visor HUD ends at x = 1040, leaving x = 1040..1280 (240px) wide open for #fullscreen-btn!
     */
    private createVisorHUD() {
        // -------------------------------------------------------------
        // TOP VISOR: Mission Directive & Live Objective Progress
        // Width: 1020 (ends at x = 1040, completely clear of #fullscreen-btn)
        // -------------------------------------------------------------
        if (!this.progressText || !this.statusBadge || !this.progressFill) return;

        const visorW = 1020;
        this.visorBg = this.add.graphics();
        this.visorBg.fillStyle(0x050C1B, 0.92);
        this.visorBg.fillRoundedRect(20, 14, visorW, 58, 12);
        this.visorBg.lineStyle(1.5, UITheme.colors.primaryCyan, 0.85);
        this.visorBg.strokeRoundedRect(20, 14, visorW, 58, 12);
        this.visorBg.setDepth(100);

        // Sol Title
        this.add.text(38, 24, `✦ ${this.challengeConfig.title}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14.5px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            letterSpacing: 1.2
        }).setDepth(101);

        // Sol Directive Target
        this.add.text(38, 46, `DIRECTIVE: ${this.challengeConfig.primaryTarget}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setDepth(101);

        // Objective Progress Gauge inside the Visor (x = 790 to 1010)
        const gaugeW = 220;
        const gaugeH = 18;
        const gaugeX = 20 + visorW - 20 - gaugeW; // 800
        const gaugeY = 38;

        const track = this.add.graphics();
        track.fillStyle(0x020712, 0.95);
        track.fillRoundedRect(gaugeX, gaugeY, gaugeW, gaugeH, 5);
        track.lineStyle(1, UITheme.colors.panelBorder, 0.8);
        track.strokeRoundedRect(gaugeX, gaugeY, gaugeW, gaugeH, 5);
        track.setDepth(101);

        this.progressFill = this.add.graphics().setDepth(102);

        this.progressText = this.add.text(gaugeX, gaugeY - 15, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setDepth(102);

        this.statusBadge = this.add.text(gaugeX + gaugeW, gaugeY - 15, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            fontStyle: "bold"
        }).setOrigin(1, 0).setDepth(102);

        this.updateVisorProgress(this.currentVal, this.challengeConfig.targetVal, this.challengeConfig.unit);

        // -------------------------------------------------------------
        // BOTTOM VISOR: Return Button, Real-Time Feedback, Complete Sol
        // -------------------------------------------------------------
        const bottomBar = this.add.graphics();
        bottomBar.fillStyle(0x050C1B, 0.92);
        bottomBar.fillRoundedRect(20, this.H - 58, this.W - 40, 46, 12);
        bottomBar.lineStyle(1.5, UITheme.colors.panelBorder, 0.85);
        bottomBar.strokeRoundedRect(20, this.H - 58, this.W - 40, 46, 12);
        bottomBar.setDepth(100);

        // Return Button (Left aligned, vertically centered at H - 35)
        const backBtn = ButtonFactory.createButton({
            scene: this,
            x: 155,
            y: this.H - 35,
            width: 230,
            height: 36,
            fontSize: "12px",
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
            this.H - 35,
            "CLICK STRUCTURES & ROVERS ON THE MARTIAN SURFACE TO EXECUTE DIRECTIVE",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: UITheme.colors.solarGoldStr,
                fontStyle: "bold",
                align: "center"
            }
        ).setOrigin(0.5).setDepth(102);

        // Advance Sol Button (Right aligned, vertically centered at H - 35)
        this.advanceBtnContainer = ButtonFactory.createButton({
            scene: this,
            x: this.W - 165,
            y: this.H - 35,
            width: 240,
            height: 36,
            fontSize: "12.5px",
            text: "✦ VALIDATE & ADVANCE ➔",
            primaryColor: UITheme.colors.bioGreen,
            textColor: "#FFFFFF",
            onClick: () => {
                SoundFX.playClick();
                this.completeChallengeAndAdvance();
            }
        });
        this.advanceBtnContainer.setDepth(102);
    }

    /**
     * Updates the top visor progress gauge smoothly.
     * Accurately supports both cumulative (>= target) and reduction (<= target) missions.
     */
    protected updateVisorProgress(current: number, target: number, unit: string) {
        this.currentVal = current;
        const met = this.isTargetMet();

        // Calculate progress percentage accurately
        let pct = 0;
        if (met) {
            pct = 1.0;
        } else if (this.challengeConfig.initialVal > target) {
            // Reduction mission (e.g. Sol 2 toxics, Sol 7 mass)
            const span = this.challengeConfig.initialVal - target;
            pct = span > 0 ? Math.max(0, Math.min(1.0, (this.challengeConfig.initialVal - current) / span)) : 0;
        } else {
            // Cumulative mission (e.g. Sol 1, 3, 4, 5, 6)
            pct = target > 0 ? Math.max(0, Math.min(1.0, current / target)) : 0;
        }

        if (!this.progressText || !this.statusBadge || !this.progressFill) return;

        const visorW = 1020;
        const gaugeW = 220;
        const gaugeH = 18;
        const gaugeX = 20 + visorW - 20 - gaugeW;
        const gaugeY = 38;

        this.progressText.setText(`DIRECTIVE: ${current.toFixed(1)} / ${target.toFixed(1)} ${unit}`);

        this.statusBadge.setText(met ? "✔ DIRECTIVE SATISFIED" : "⏳ IN PROGRESS");
        this.statusBadge.setColor(met ? UITheme.colors.bioGreenStr : UITheme.colors.solarGoldStr);

        this.progressFill.clear();
        this.progressFill.fillStyle(met ? UITheme.colors.bioGreen : UITheme.colors.primaryCyan, 1);
        this.progressFill.fillRoundedRect(gaugeX + 2, gaugeY + 2, Math.max(6, (gaugeW - 4) * pct), gaugeH - 4, 3);

        if (this.advanceBtnContainer) {
            this.advanceBtnContainer.setAlpha(met ? 1.0 : 0.45);
        }
    }

    /**
     * Helper to create interactive hotspots on the Martian surface with hover animations and floating badges.
     * High offset ensures badges never cover dome roofs or structure sprites.
     */
    protected createSurfaceHotspot(config: SurfaceHotspotConfig): Phaser.GameObjects.Container {
        const c = this.add.container(config.x, config.y).setDepth(20);

        // Hover Glow Halo
        const glow = this.add.ellipse(0, 0, config.width + 24, config.height + 20, config.color || UITheme.colors.primaryCyan, 0);
        c.add(glow);

        // Hit Area
        const hitArea = this.add.rectangle(0, 0, config.width, config.height, 0x000000, 0.001);
        hitArea.setInteractive({ useHandCursor: true });
        c.add(hitArea);

        // Floating Title Badge (clean pill frame positioned safely above structure)
        const badgeY = -config.height / 2 - 24;
        const badgeW = 204;
        const badgeH = 34;

        const badge = this.add.graphics();
        badge.fillStyle(0x050F1E, 0.92);
        badge.fillRoundedRect(-badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 6);
        badge.lineStyle(1.5, config.color || UITheme.colors.primaryCyan, 0.9);
        badge.strokeRoundedRect(-badgeW / 2, badgeY - badgeH / 2, badgeW, badgeH, 6);
        c.add(badge);

        const labelText = this.add.text(0, badgeY - 6, `${config.icon || "⚙️"} ${config.label}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);
        c.add(labelText);

        // Clean action subtext without bracket glyphs
        const hintText = this.add.text(0, badgeY + 7, `▶ ${config.actionHint}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
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
            y: y - 80,
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
