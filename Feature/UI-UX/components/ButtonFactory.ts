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
    private static masterCompressor: DynamicsCompressorNode | null = null;
    private static isInitialized = false;
    private static lastSoundTime = 0;

    public static initGlobalUnlock() {
        if (SoundFX.isInitialized || typeof window === "undefined") return;
        SoundFX.isInitialized = true;

        const unlockAudio = () => {
            const ctx = SoundFX.getContext();
            if (ctx && ctx.state === "suspended") {
                ctx.resume().catch(() => {});
            }
        };

        // Real user activation gestures (do NOT include pointermove as browsers reject it)
        const unlockEvents = ["pointerdown", "mousedown", "keydown", "touchstart", "click"];
        unlockEvents.forEach((ev) => {
            window.addEventListener(ev, unlockAudio, { passive: true, capture: true });
        });
    }

    public static getContext(): AudioContext | null {
        if (!SoundFX.ctx && typeof window !== "undefined") {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) {
                SoundFX.ctx = new AudioCtx();
                try {
                    const comp = SoundFX.ctx.createDynamicsCompressor();
                    comp.threshold.setValueAtTime(-14, SoundFX.ctx.currentTime);
                    comp.knee.setValueAtTime(24, SoundFX.ctx.currentTime);
                    comp.ratio.setValueAtTime(10, SoundFX.ctx.currentTime);
                    comp.attack.setValueAtTime(0.003, SoundFX.ctx.currentTime);
                    comp.release.setValueAtTime(0.2, SoundFX.ctx.currentTime);
                    comp.connect(SoundFX.ctx.destination);
                    SoundFX.masterCompressor = comp;
                } catch {
                    // Fallback to direct output
                }
            }
        }
        if (SoundFX.ctx && SoundFX.ctx.state === "suspended") {
            SoundFX.ctx.resume().catch(() => {});
        }
        return SoundFX.ctx;
    }

    private static connectOut(node: AudioNode, ctx: AudioContext) {
        if (SoundFX.masterCompressor) {
            node.connect(SoundFX.masterCompressor);
        } else {
            node.connect(ctx.destination);
        }
    }

    private static shouldPlay(minIntervalMs = 40): boolean {
        const now = Date.now();
        if (now - SoundFX.lastSoundTime < minIntervalMs) return false;
        SoundFX.lastSoundTime = now;
        return true;
    }

    /**
     * Universal Click: Crisp, punchy tactile futuristic button click / tap
     */
    public static playClick(force = false) {
        if (!force && !SoundFX.shouldPlay(45)) return;
        try {
            const ctx = SoundFX.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;

            // Transient attack pop
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(750, now);
            osc.frequency.exponentialRampToValueAtTime(320, now + 0.055);

            gain.gain.setValueAtTime(0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);

            osc.connect(gain);
            SoundFX.connectOut(gain, ctx);

            osc.start(now);
            osc.stop(now + 0.055);

            // Subtle second harmonic tick
            const tick = ctx.createOscillator();
            const tickGain = ctx.createGain();
            tick.type = "triangle";
            tick.frequency.setValueAtTime(1150, now);
            tick.frequency.exponentialRampToValueAtTime(450, now + 0.025);
            tickGain.gain.setValueAtTime(0.12, now);
            tickGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
            tick.connect(tickGain);
            SoundFX.connectOut(tickGain, ctx);
            tick.start(now);
            tick.stop(now + 0.025);
        } catch {
            // Ignore autoplay policy restriction
        }
    }

    /**
     * Soft high-tech subtle hover blip
     */
    public static playHover() {
        if (!SoundFX.shouldPlay(30)) return;
        try {
            const ctx = SoundFX.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(680, now);
            osc.frequency.exponentialRampToValueAtTime(960, now + 0.035);
            gain.gain.setValueAtTime(0.10, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
            osc.connect(gain);
            SoundFX.connectOut(gain, ctx);
            osc.start(now);
            osc.stop(now + 0.035);
        } catch {
            // Ignore
        }
    }

    /**
     * Dual-tone toggle switch sound
     */
    public static playToggle(isPowered: boolean) {
        SoundFX.lastSoundTime = Date.now();
        try {
            const ctx = SoundFX.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = isPowered ? "triangle" : "sine";
            const startFreq = isPowered ? 480 : 720;
            const endFreq = isPowered ? 880 : 360;
            osc.frequency.setValueAtTime(startFreq, now);
            osc.frequency.exponentialRampToValueAtTime(endFreq, now + 0.065);
            gain.gain.setValueAtTime(0.24, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);
            osc.connect(gain);
            SoundFX.connectOut(gain, ctx);
            osc.start(now);
            osc.stop(now + 0.065);
        } catch {
            // Ignore
        }
    }

    /**
     * Card / Option Select Confirmation Chime (Ascending triad)
     */
    public static playSelect() {
        SoundFX.lastSoundTime = Date.now();
        try {
            const ctx = SoundFX.getContext();
            if (!ctx) return;
            const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
            notes.forEach((freq, idx) => {
                const startTime = ctx.currentTime + idx * 0.045;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0.20, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.08);
                osc.connect(gain);
                SoundFX.connectOut(gain, ctx);
                osc.start(startTime);
                osc.stop(startTime + 0.08);
            });
        } catch {
            // Ignore
        }
    }

    /**
     * Pipe Ratchet / Rotation Mechanical Click (for Sol 1 and mechanical puzzles)
     */
    public static playPipeRotate() {
        SoundFX.lastSoundTime = Date.now();
        try {
            const ctx = SoundFX.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(420, now);
            osc.frequency.exponentialRampToValueAtTime(190, now + 0.07);
            gain.gain.setValueAtTime(0.32, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
            osc.connect(gain);
            SoundFX.connectOut(gain, ctx);
            osc.start(now);
            osc.stop(now + 0.07);
        } catch {
            // Ignore
        }
    }

    /**
     * Keyboard / Hotkey Tactile Click
     */
    public static playKeyStroke() {
        if (!SoundFX.shouldPlay(40)) return;
        try {
            const ctx = SoundFX.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(540, now);
            osc.frequency.exponentialRampToValueAtTime(360, now + 0.035);
            gain.gain.setValueAtTime(0.18, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.035);
            osc.connect(gain);
            SoundFX.connectOut(gain, ctx);
            osc.start(now);
            osc.stop(now + 0.035);
        } catch {
            // Ignore
        }
    }

    /**
     * Warning Alert Buzzer
     */
    public static playAlert() {
        SoundFX.lastSoundTime = Date.now();
        try {
            const ctx = SoundFX.getContext();
            if (!ctx) return;
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sawtooth";
            osc.frequency.setValueAtTime(260, now);
            osc.frequency.setValueAtTime(190, now + 0.06);
            gain.gain.setValueAtTime(0.28, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
            osc.connect(gain);
            SoundFX.connectOut(gain, ctx);
            osc.start(now);
            osc.stop(now + 0.14);
        } catch {
            // Ignore
        }
    }

    /**
     * Glorious Sci-Fi Victory / Objective Accomplished Fanfare
     */
    public static playSuccess() {
        SoundFX.lastSoundTime = Date.now();
        try {
            const ctx = SoundFX.getContext();
            if (!ctx) return;
            const notes = [523.25, 659.25, 783.99, 1046.50]; // C5, E5, G5, C6
            notes.forEach((freq, idx) => {
                const startTime = ctx.currentTime + idx * 0.075;
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();
                osc.type = "sine";
                osc.frequency.setValueAtTime(freq, startTime);
                gain.gain.setValueAtTime(0.25, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);
                osc.connect(gain);
                SoundFX.connectOut(gain, ctx);
                osc.start(startTime);
                osc.stop(startTime + 0.22);
            });
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
        const iconOffset = -width / 2 + 24;

        if (iconKey && scene.textures.exists(iconKey)) {
            const iconImg = scene.add.image(iconOffset, 0, iconKey);
            iconImg.setScale(iconScale);
            visuals.add(iconImg);
        } else if (icon) {
            const iconCircle = scene.add.circle(iconOffset, 0, 14, 0x050F1E, 0.85);
            iconCircle.setStrokeStyle(1.5, primaryColor, 0.9);
            visuals.add(iconCircle);

            const iconText = scene.add.text(iconOffset, 0, icon, {
                fontSize: "14px",
                fontFamily: UITheme.fonts.body
            }).setOrigin(0.5);
            visuals.add(iconText);
        }

        // Label Text
        const labelX = hasIcon ? -width / 2 + 46 : 0;
        const labelOriginX = hasIcon ? 0 : 0.5;

        const label = scene.add.text(labelX, 0, text.toUpperCase(), {
            fontFamily: UITheme.fonts.heading,
            fontSize,
            color: textColor,
            fontStyle: "bold"
        }).setOrigin(labelOriginX, 0.5);

        // Enforce boundary containment: label must NEVER overflow button borders
        const maxTextW = hasIcon ? (width - 46 - 12) : (width - 24);
        if (label.width > maxTextW && maxTextW > 0) {
            label.setScale(Math.min(1, maxTextW / label.width));
        }

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
