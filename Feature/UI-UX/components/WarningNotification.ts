import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import { SoundFX } from "./ButtonFactory.ts";

export type NotificationType = "DANGER" | "CAUTION" | "SUCCESS" | "INFO";

export interface NotificationPayload {
    type: NotificationType;
    title: string;
    message: string;
    actionLabel?: string;
    onAction?: () => void;
    durationMs?: number;
}

export class WarningNotification {
    private scene: Phaser.Scene;
    private queue: NotificationPayload[] = [];
    private currentBanner?: Phaser.GameObjects.Container;
    private isShowing = false;

    constructor(scene: Phaser.Scene) {
        this.scene = scene;
    }

    /**
     * Show or queue a high-priority warning notification
     */
    public show(payload: NotificationPayload) {
        this.queue.push(payload);
        if (!this.isShowing) {
            this.processNext();
        }
    }

    private processNext() {
        if (this.queue.length === 0) {
            this.isShowing = false;
            return;
        }

        this.isShowing = true;
        const payload = this.queue.shift()!;
        this.displayBanner(payload);
    }

    private displayBanner(payload: NotificationPayload) {
        const { width } = this.scene.scale;
        const bannerW = 600;
        const bannerH = 84;
        const targetY = 188;

        const container = this.scene.add.container(width / 2, -bannerH);
        container.setDepth(200); // Above all HUD

        // Colors based on type
        let primaryColor = UITheme.colors.primaryCyan;
        let primaryColorStr = UITheme.colors.primaryCyanStr;
        let iconSymbol = "📡";

        if (payload.type === "DANGER") {
            primaryColor = UITheme.colors.emergencyRed;
            primaryColorStr = UITheme.colors.emergencyRedStr;
            iconSymbol = "⚠";
        } else if (payload.type === "CAUTION") {
            primaryColor = UITheme.colors.marsAmber;
            primaryColorStr = UITheme.colors.marsAmberStr;
            iconSymbol = "⚡";
        } else if (payload.type === "SUCCESS") {
            primaryColor = UITheme.colors.bioGreen;
            primaryColorStr = UITheme.colors.bioGreenStr;
            iconSymbol = "✔";
        }

        // Shadow
        const shadow = this.scene.add.graphics();
        shadow.fillStyle(0x000000, 0.5);
        shadow.fillRoundedRect(-bannerW / 2 + 3, -bannerH / 2 + 5, bannerW, bannerH, 10);
        container.add(shadow);

        // Frame
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x0B182B, 0.98);
        bg.fillRoundedRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH, 10);
        bg.lineStyle(2.5, primaryColor, 1);
        bg.strokeRoundedRect(-bannerW / 2, -bannerH / 2, bannerW, bannerH, 10);
        container.add(bg);

        // Left Glow Strip
        const strip = this.scene.add.graphics();
        strip.fillStyle(primaryColor, 1);
        strip.fillRoundedRect(-bannerW / 2 + 2, -bannerH / 2 + 2, 8, bannerH - 4, 3);
        container.add(strip);

        // Icon Circle
        const iconCircle = this.scene.add.circle(-bannerW / 2 + 42, 0, 18, 0x050D17);
        iconCircle.setStrokeStyle(2, primaryColor, 1);
        container.add(iconCircle);

        const iconText = this.scene.add.text(-bannerW / 2 + 42, 0, iconSymbol, {
            fontSize: "18px"
        }).setOrigin(0.5);
        container.add(iconText);

        // Texts
        const titleText = this.scene.add.text(-bannerW / 2 + 75, -bannerH / 2 + 14, payload.title.toUpperCase(), {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: primaryColorStr,
            fontStyle: "bold"
        });
        const msgText = this.scene.add.text(-bannerW / 2 + 75, -bannerH / 2 + 34, payload.message, {
            fontFamily: UITheme.fonts.body,
            fontSize: "12.5px",
            color: "#FFFFFF",
            lineSpacing: 3,
            wordWrap: { width: payload.actionLabel ? 320 : 470 }
        });
        container.add([titleText, msgText]);

        // Optional Action Button (e.g. "OPEN SWITCHBOARD")
        if (payload.actionLabel && payload.onAction) {
            const btnW = 160;
            const btnH = 34;
            const actionBtn = this.scene.add.container(bannerW / 2 - 96, 0);

            // Visuals layer for smooth scaling without displacing hit bounds
            const visuals = this.scene.add.container(0, 0);
            actionBtn.add(visuals);

            const bBg = this.scene.add.graphics();
            bBg.fillStyle(primaryColor, 0.95);
            bBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
            bBg.lineStyle(1.8, 0xFFFFFF, 0.95);
            bBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
            visuals.add(bBg);

            // Luminous hover glow
            const hoverGlow = this.scene.add.graphics();
            hoverGlow.fillStyle(0xFFFFFF, 0.32);
            hoverGlow.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
            hoverGlow.lineStyle(3, 0xFFFFFF, 1);
            hoverGlow.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
            hoverGlow.setAlpha(0);
            visuals.add(hoverGlow);

            const bLabel = this.scene.add.text(0, 0, payload.actionLabel.toUpperCase(), {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: "#FFFFFF",
                fontStyle: "bold"
            }).setOrigin(0.5);
            visuals.add(bLabel);

            // Top-layer hit shield (+10px w, +8px h) to guarantee 100% responsive clicks and hover
            const hitShield = this.scene.add.rectangle(0, 0, btnW + 10, btnH + 8, 0x000000, 0.001);
            hitShield.setOrigin(0.5, 0.5);
            hitShield.setInteractive({ useHandCursor: true });
            actionBtn.add(hitShield);

            hitShield.on("pointerover", () => {
                SoundFX.playHover();
                this.scene.tweens.killTweensOf(visuals);
                this.scene.tweens.killTweensOf(hoverGlow);

                this.scene.tweens.add({
                    targets: visuals,
                    scaleX: 1.05,
                    scaleY: 1.05,
                    duration: 50,
                    ease: "Back.easeOut"
                });

                this.scene.tweens.add({
                    targets: hoverGlow,
                    alpha: 1,
                    duration: 40
                });
            });

            hitShield.on("pointermove", () => {
                if (hoverGlow.alpha < 0.95) hoverGlow.setAlpha(1);
                if (visuals.scaleX < 1.04) visuals.setScale(1.05);
            });

            hitShield.on("pointerout", () => {
                this.scene.tweens.killTweensOf(visuals);
                this.scene.tweens.killTweensOf(hoverGlow);

                this.scene.tweens.add({
                    targets: visuals,
                    scaleX: 1.0,
                    scaleY: 1.0,
                    duration: 85,
                    ease: "Quad.easeOut"
                });

                this.scene.tweens.add({
                    targets: hoverGlow,
                    alpha: 0,
                    duration: 85
                });
            });

            hitShield.on("pointerdown", () => {
                SoundFX.playClick();
                this.scene.tweens.add({
                    targets: visuals,
                    scaleX: 0.94,
                    scaleY: 0.94,
                    duration: 40,
                    yoyo: true,
                    onComplete: () => {
                        if (payload.onAction) payload.onAction();
                        this.dismissCurrent();
                    }
                });
            });

            container.add(actionBtn);
        }

        // Close 'X' Button on top-right
        const closeX = this.scene.add.container(bannerW / 2 - 18, -bannerH / 2 + 14);
        const xText = this.scene.add.text(0, 0, "✕", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: UITheme.colors.textMuted
        }).setOrigin(0.5);
        closeX.add(xText);

        const xShield = this.scene.add.rectangle(0, 0, 24, 24, 0x000000, 0.001);
        xShield.setInteractive({ useHandCursor: true });
        closeX.add(xShield);

        xShield.on("pointerover", () => {
            xText.setColor("#FFFFFF");
        });
        xShield.on("pointerout", () => {
            xText.setColor(UITheme.colors.textMuted);
        });
        xShield.on("pointerdown", () => {
            SoundFX.playClick();
            this.dismissCurrent();
        });
        container.add(closeX);

        this.currentBanner = container;

        // Slide Down Animation
        this.scene.tweens.add({
            targets: container,
            y: targetY + bannerH / 2,
            duration: 320,
            ease: "Back.easeOut",
            onComplete: () => {
                // Auto dismiss timer
                const duration = payload.durationMs ?? (payload.type === "DANGER" ? 7500 : 5000);
                this.scene.time.delayedCall(duration, () => {
                    if (this.currentBanner === container) {
                        this.dismissCurrent();
                    }
                });
            }
        });
    }

    private dismissCurrent() {
        if (!this.currentBanner) return;

        const banner = this.currentBanner;
        this.currentBanner = undefined;

        this.scene.tweens.add({
            targets: banner,
            y: -100,
            alpha: 0,
            duration: 250,
            ease: "Quad.easeIn",
            onComplete: () => {
                banner.destroy();
                this.processNext();
            }
        });
    }

    public destroy() {
        if (this.currentBanner) {
            this.currentBanner.destroy();
        }
        this.queue = [];
    }
}

export default WarningNotification;
