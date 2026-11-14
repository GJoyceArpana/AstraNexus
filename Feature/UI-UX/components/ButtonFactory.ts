import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";

export interface ButtonConfig {
    scene: Phaser.Scene;
    x: number;
    y: number;
    text: string;
    width?: number;
    height?: number;
    primaryColor?: number;
    secondaryColor?: number;
    textColor?: string;
    fontSize?: string;
    icon?: string;
    iconKey?: string;
    iconScale?: number;
    tooltip?: string;
    onClick: () => void;
}

export class SoundFX {
    private static ctx: AudioContext | null = null;
    private static isInitialized = false;

    public static initGlobalUnlock() {
        if (SoundFX.isInitialized || typeof window === "undefined") return;
        SoundFX.isInitialized = true;

        const unlockAudio = () => {
            SoundFX.getContext();
            window.removeEventListener("pointerdown", unlockAudio);
            window.removeEventListener("pointermove", unlockAudio);
            window.removeEventListener("keydown", unlockAudio);
        };
        window.addEventListener("pointerdown", unlockAudio);
        window.addEventListener("pointermove", unlockAudio);
        window.addEventListener("keydown", unlockAudio);
    }

    public static getContext(): AudioContext | null {
        if (!SoundFX.ctx && typeof window !== "undefined") {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) {
                SoundFX.ctx = new AudioCtx();
            }
        }
        if (SoundFX.ctx && SoundFX.ctx.state === "suspended") {
            SoundFX.ctx.resume().catch(() => {});
        }
        return SoundFX.ctx;
    }

    public static playHover() {
        try {
            const ctx = SoundFX.getContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(650, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.04);
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.04);
        } catch {
            // Ignore autoplay policy restriction
        }
    }

    public static playClick() {
        try {
            const ctx = SoundFX.getContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(520, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(260, ctx.currentTime + 0.06);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.06);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.06);
        } catch {
            // Ignore
        }
    }

    public static playToggle(isPowered: boolean) {
        try {
            const ctx = SoundFX.getContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = isPowered ? "triangle" : "sine";
            const startFreq = isPowered ? 440 : 660;
            const endFreq = isPowered ? 880 : 330;
            osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(endFreq, ctx.currentTime + 0.05);
            gain.gain.setValueAtTime(0.06, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.05);
        } catch {
            // Ignore
        }
    }

    public static playAlert() {
        try {
            const ctx = SoundFX.getContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(220, ctx.currentTime);
            osc.frequency.setValueAtTime(180, ctx.currentTime + 0.06);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.12);
        } catch {
            // Ignore
        }
    }
}

// Immediately wire unlock
SoundFX.initGlobalUnlock();

export class ButtonFactory {
    /**
     * Highly responsive interactive button with 100% full-coverage hit detection
     * on every single pixel, instant hover glow, hand cursor, and audio feedback.
     */
    public static createButton(config: ButtonConfig): Phaser.GameObjects.Container {
        const {
            scene,
            x,
            y,
            text,
            width = 240,
            height = 52,
            primaryColor = UITheme.colors.primaryCyan,
            secondaryColor = UITheme.colors.cardBg,
            textColor = "#FFFFFF",
            fontSize = "15px",
            icon,
            iconKey,
            iconScale = 0.5,
            onClick
        } = config;

        const container = scene.add.container(x, y);
        container.setSize(width, height);
        container.setDepth(100);

        // Visuals layer
        const visuals = scene.add.container(0, 0);
        container.add(visuals);

        // Shadow
        const shadow = scene.add.graphics();
        shadow.fillStyle(0x000000, 0.5);
        shadow.fillRoundedRect(-width / 2 + 2, -height / 2 + 4, width, height, UITheme.layout.buttonRadius);
        visuals.add(shadow);

        // Base Background
        const bg = scene.add.graphics();
        bg.fillStyle(secondaryColor, 0.95);
        bg.fillRoundedRect(-width / 2, -height / 2, width, height, UITheme.layout.buttonRadius);
        bg.lineStyle(2.5, primaryColor, 1);
        bg.strokeRoundedRect(-width / 2, -height / 2, width, height, UITheme.layout.buttonRadius);
        visuals.add(bg);

        // Luminous Hover Glow Overlay (Fades in instantly on hover!)
        const hoverGlow = scene.add.graphics();
        hoverGlow.fillStyle(primaryColor, 0.35);
        hoverGlow.fillRoundedRect(-width / 2, -height / 2, width, height, UITheme.layout.buttonRadius);
        hoverGlow.lineStyle(3.5, 0xFFFFFF, 1);
        hoverGlow.strokeRoundedRect(-width / 2, -height / 2, width, height, UITheme.layout.buttonRadius);
        hoverGlow.setAlpha(0);
        visuals.add(hoverGlow);

        // Top Accent Neon Line
        const accent = scene.add.graphics();
        accent.fillStyle(primaryColor, 0.9);
        accent.fillRoundedRect(-width / 2 + 10, -height / 2 + 2, width - 20, 3, 2);
        visuals.add(accent);

        // Icon
        const hasIcon = Boolean(iconKey || icon);
        const iconOffset = -width / 2 + 28;

        if (iconKey && scene.textures.exists(iconKey)) {
            const iconImg = scene.add.image(iconOffset, 0, iconKey);
            iconImg.setScale(iconScale);
            visuals.add(iconImg);
        } else if (icon) {
            const iconCircle = scene.add.circle(iconOffset, 0, 16, 0x050F1E, 0.85);
            iconCircle.setStrokeStyle(1.5, primaryColor, 0.9);
            visuals.add(iconCircle);

            const iconText = scene.add.text(iconOffset, 0, icon, {
                fontSize: "16px",
                fontFamily: UITheme.fonts.body
            }).setOrigin(0.5);
            visuals.add(iconText);
        }

        // Label Text
        const labelX = hasIcon ? -width / 2 + 56 : 0;
        const labelOriginX = hasIcon ? 0 : 0.5;

        const label = scene.add.text(labelX, 0, text.toUpperCase(), {
            fontFamily: UITheme.fonts.heading,
            fontSize,
            color: textColor,
            fontStyle: "bold"
        }).setOrigin(labelOriginX, 0.5);
        visuals.add(label);

        const hoverTextColor = (primaryColor === UITheme.colors.marsAmber || primaryColor === UITheme.colors.solarGold)
            ? UITheme.colors.solarGoldStr
            : (primaryColor === UITheme.colors.cosmicPurple ? "#F080FF" : UITheme.colors.primaryCyanStr);

        // Top-Layer Hit Shield: Placed over ALL visuals to guarantee 100% hover & click detection anywhere on the button
        // Generous dimensions (+10px w, +8px h) ensure immediate responsiveness at the slightest hovering edge!
        const hitShield = scene.add.rectangle(0, 0, width + 10, height + 8, 0x000000, 0.001);
        hitShield.setOrigin(0.5, 0.5);
        hitShield.setInteractive({ useHandCursor: true });
        container.add(hitShield);

        // Hover In
        hitShield.on("pointerover", () => {
            SoundFX.playHover();

            scene.tweens.killTweensOf(visuals);
            scene.tweens.killTweensOf(hoverGlow);

            scene.tweens.add({
                targets: visuals,
                scaleX: 1.05,
                scaleY: 1.05,
                duration: 50,
                ease: "Back.easeOut"
            });

            scene.tweens.add({
                targets: hoverGlow,
                alpha: 1,
                duration: 40
            });

            label.setColor(hoverTextColor);
        });

        // Pointer move safeguard
        hitShield.on("pointermove", () => {
            if (hoverGlow.alpha < 0.95) hoverGlow.setAlpha(1);
            if (visuals.scaleX < 1.04) visuals.setScale(1.05);
        });

        // Hover Out
        hitShield.on("pointerout", () => {
            scene.tweens.killTweensOf(visuals);
            scene.tweens.killTweensOf(hoverGlow);

            scene.tweens.add({
                targets: visuals,
                scaleX: 1.0,
                scaleY: 1.0,
                duration: 85,
                ease: "Quad.easeOut"
            });

            scene.tweens.add({
                targets: hoverGlow,
                alpha: 0,
                duration: 85
            });

            label.setColor(textColor);
        });

        // Click / Press
        hitShield.on("pointerdown", () => {
            SoundFX.playClick();

            scene.tweens.add({
                targets: visuals,
                scaleX: 0.95,
                scaleY: 0.95,
                duration: 40,
                yoyo: true,
                onComplete: () => {
                    onClick();
                }
            });
        });

        return container;
    }

    /**
     * Circular icon button with full hit shield
     */
    public static createIconButton(
        scene: Phaser.Scene,
        x: number,
        y: number,
        icon: string,
        radius = 24,
        color = UITheme.colors.primaryCyan,
        onClick: () => void
    ): Phaser.GameObjects.Container {
        const container = scene.add.container(x, y);
        container.setDepth(100);

        const circle = scene.add.circle(0, 0, radius, UITheme.colors.cardBg, 0.92);
        circle.setStrokeStyle(2, color, 1);
        container.add(circle);

        const hoverRing = scene.add.circle(0, 0, radius + 3, color, 0.35);
        hoverRing.setStrokeStyle(2.5, 0xFFFFFF, 1);
        hoverRing.setAlpha(0);
        container.add(hoverRing);

        const symbol = scene.add.text(0, 0, icon, {
            fontFamily: UITheme.fonts.heading,
            fontSize: `${Math.round(radius * 0.95)}px`,
            color: "#FFFFFF"
        }).setOrigin(0.5);
        container.add(symbol);

        // Full coverage circle hit shield on top
        const hitShield = scene.add.circle(0, 0, radius + 4, 0x000000, 0.001);
        hitShield.setInteractive({ useHandCursor: true });
        container.add(hitShield);

        hitShield.on("pointerover", () => {
            SoundFX.playHover();
            circle.setFillStyle(UITheme.colors.cardHover, 1);
            hoverRing.setAlpha(1);
            container.setScale(1.1);
        });

        hitShield.on("pointerout", () => {
            circle.setFillStyle(UITheme.colors.cardBg, 0.92);
            hoverRing.setAlpha(0);
            container.setScale(1.0);
        });

        hitShield.on("pointerdown", () => {
            SoundFX.playClick();
            scene.tweens.add({
                targets: container,
                scale: 0.92,
                duration: 40,
                yoyo: true,
                onComplete: onClick
            });
        });

        return container;
    }
}

export default ButtonFactory;
