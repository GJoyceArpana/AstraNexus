import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";

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
        const bannerH = 74;
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
        const titleText = this.scene.add.text(-bannerW / 2 + 75, -bannerH / 2 + 16, payload.title.toUpperCase(), {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: primaryColorStr,
            fontStyle: "bold"
        });
        const msgText = this.scene.add.text(-bannerW / 2 + 75, -bannerH / 2 + 36, payload.message, {
            fontFamily: UITheme.fonts.body,
            fontSize: "13px",
            color: "#FFFFFF",
            wordWrap: { width: payload.actionLabel ? 360 : 470 }
        });
        container.add([titleText, msgText]);

        // Optional Action Button (e.g. "OPEN SWITCHBOARD")
        if (payload.actionLabel && payload.onAction) {
            const btnW = 120;
            const btnH = 34;
            const actionBtn = this.scene.add.container(bannerW / 2 - 80, 0);

            const bBg = this.scene.add.graphics();
            bBg.fillStyle(primaryColor, 0.9);
            bBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
            actionBtn.add(bBg);

            const bLabel = this.scene.add.text(0, 0, payload.actionLabel.toUpperCase(), {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: "#FFFFFF",
                fontStyle: "bold"
            }).setOrigin(0.5);
            actionBtn.add(bLabel);

            actionBtn.setSize(btnW, btnH);
            actionBtn.setInteractive(new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH), Phaser.Geom.Rectangle.Contains);
            actionBtn.input!.cursor = "pointer";

            actionBtn.on("pointerdown", () => {
                if (payload.onAction) payload.onAction();
                this.dismissCurrent();
            });

            container.add(actionBtn);
        }

        // Close 'X' Button on top-right
        const closeX = this.scene.add.text(bannerW / 2 - 18, -bannerH / 2 + 8, "✕", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.textMuted
        }).setOrigin(0.5);
        closeX.setInteractive();
        closeX.input!.cursor = "pointer";
        closeX.on("pointerdown", () => {
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
