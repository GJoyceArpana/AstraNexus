import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import { SoundFX } from "./ButtonFactory.ts";

export interface ResourceMeterConfig {
    scene: Phaser.Scene;
    x?: number;
    y?: number;
    onOpenSwitchboard?: () => void;
}

export type ResourceMeterKey = "lifeSupport" | "crewHealth" | "hullPower";

export interface MeterData {
    key: ResourceMeterKey;
    label: string;
    subLabel: string;
    icon: string;
    value: number; // 0 to 100
    color: number;
    colorStr: string;
    tooltip: string;
}

export class ResourceMeters {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private onOpenSwitchboard?: () => void;

    private meters: Map<ResourceMeterKey, {
        data: MeterData;
        barFill: Phaser.GameObjects.Graphics;
        valText: Phaser.GameObjects.Text;
        iconText: Phaser.GameObjects.Text;
        container: Phaser.GameObjects.Container;
    }> = new Map();

    private meterWidth = 145;
    private meterHeight = 16;
    private trackX = 210;

    constructor(config: ResourceMeterConfig) {
        this.scene = config.scene;
        this.onOpenSwitchboard = config.onOpenSwitchboard;
        this.container = this.scene.add.container(config.x ?? 22, config.y ?? 16);
        this.container.setDepth(100); // Always on top of game world
        this.init();
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        // Base HUD Dock Panel (A bit smaller, compact, clean and balanced)
        const dockW = 445;
        const dockH = 175;

        const bg = this.scene.add.graphics();
        // Deep space blue frosted glass
        bg.fillStyle(0x07152B, 0.96);
        bg.fillRoundedRect(0, 0, dockW, dockH, 16);
        bg.lineStyle(2, 0x00E5FF, 0.95);
        bg.strokeRoundedRect(0, 0, dockW, dockH, 16);

        // Header subtle highlight bar
        bg.fillStyle(0x00E5FF, 0.12);
        bg.fillRoundedRect(0, 0, dockW, 36, { tl: 16, tr: 16, bl: 0, br: 0 });
        this.container.add(bg);

        // Header Title (Large, clear, kid-friendly)
        const header = this.scene.add.text(16, 10, "✦ BASE VITALS & POWER ✦", {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "12.5px",
            color: "#00E5FF",
            fontStyle: "bold",
            letterSpacing: 1.5
        });
        this.container.add(header);

        // Quick Switchboard Button on Header Right (Prominent & interactive)
        if (this.onOpenSwitchboard) {
            const btnW = 150;
            const btnH = 26;
            const switchBtn = this.scene.add.container(dockW - 86, 18);

            const visuals = this.scene.add.container(0, 0);
            switchBtn.add(visuals);

            const sBg = this.scene.add.graphics();
            sBg.fillStyle(0x0E2644, 0.95);
            sBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
            sBg.lineStyle(1.8, 0xFFD54F, 0.95);
            sBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
            visuals.add(sBg);

            // Luminous hover glow
            const hoverGlow = this.scene.add.graphics();
            hoverGlow.fillStyle(0xFFD54F, 0.3);
            hoverGlow.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
            hoverGlow.lineStyle(2, 0xFFFFFF, 1);
            hoverGlow.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
            hoverGlow.setAlpha(0);
            visuals.add(hoverGlow);

            const sText = this.scene.add.text(0, 0, "⚡ SWITCHBOARD [P]", {
                fontFamily: "Nunito, Montserrat, sans-serif",
                fontSize: "11px",
                color: "#FFD54F",
                fontStyle: "bold"
            }).setOrigin(0.5);
            visuals.add(sText);

            // Top-layer hit shield
            const hitShield = this.scene.add.rectangle(0, 0, btnW + 8, btnH + 6, 0x000000, 0.001);
            hitShield.setOrigin(0.5, 0.5);
            hitShield.setInteractive({ useHandCursor: true });
            switchBtn.add(hitShield);

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

                sText.setColor("#FFFFFF");
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

                sText.setColor("#FFD54F");
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
                        if (this.onOpenSwitchboard) this.onOpenSwitchboard();
                    }
                });
            });

            this.container.add(switchBtn);
        }

        // 1. Oxygen & Water (Life Support)
        this.createMeterRow({
            key: "lifeSupport",
            label: "OXYGEN & WATER",
            subLabel: "Fresh Air & Water Reserves",
            icon: "🫧",
            value: 95,
            color: 0x00E5FF,
            colorStr: "#00E5FF",
            tooltip: "Supplies clean breathing air and water across your Mars base."
        }, 42);

        // 2. Shield & Health (Crew Health)
        this.createMeterRow({
            key: "crewHealth",
            label: "SHIELD & HEALTH",
            subLabel: "Suit & Radiation Armor",
            icon: "🛡️",
            value: 100,
            color: 0x00E676,
            colorStr: "#00E676",
            tooltip: "Protects your astronaut from space radiation flares."
        }, 85);

        // 3. Base Power (Hull Power)
        this.createMeterRow({
            key: "hullPower",
            label: "BASE POWER",
            subLabel: "Solar & Battery Station Grid",
            icon: "⚡",
            value: 88,
            color: 0xFFD54F,
            colorStr: "#FFD54F",
            tooltip: "Keeps all lights, heaters, and base systems running."
        }, 128);
    }

    private createMeterRow(data: MeterData, yOffset: number) {
        const row = this.scene.add.container(14, yOffset);

        // Icon Circle
        const iconCircle = this.scene.add.circle(16, 17, 14, 0x06152B);
        iconCircle.setStrokeStyle(1.8, data.color, 0.9);
        row.add(iconCircle);

        const icon = this.scene.add.text(16, 17, data.icon, {
            fontSize: "15px"
        }).setOrigin(0.5);
        row.add(icon);

        // Labels (Clean, Large, Kid-Friendly)
        const title = this.scene.add.text(38, 3, data.label, {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "13px",
            color: "#FFFFFF",
            fontStyle: "bold"
        });
        const sub = this.scene.add.text(38, 20, data.subLabel, {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "10.5px",
            color: "#A2BCD8",
            fontStyle: "bold"
        });
        row.add([title, sub]);

        // Progress Bar Track
        const trackY = 9;
        const track = this.scene.add.graphics();
        track.fillStyle(0x040D1C, 1);
        track.fillRoundedRect(this.trackX, trackY, this.meterWidth, this.meterHeight, 5);
        track.lineStyle(1.5, 0x16345A, 0.9);
        track.strokeRoundedRect(this.trackX, trackY, this.meterWidth, this.meterHeight, 5);
        row.add(track);

        // Fill Bar
        const barFill = this.scene.add.graphics();
        row.add(barFill);

        // Percentage Text (Cleanly spaced to the right of the bar with ZERO overlap!)
        const valText = this.scene.add.text(420, 17, `${data.value}%`, {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "14px",
            color: data.colorStr,
            fontStyle: "bold"
        }).setOrigin(1, 0.5);
        row.add(valText);

        this.meters.set(data.key, {
            data,
            barFill,
            valText,
            iconText: icon,
            container: row
        });

        this.renderBarFill(data.key);

        this.container.add(row);
    }

    private renderBarFill(key: ResourceMeterKey) {
        const item = this.meters.get(key);
        if (!item) return;

        const { data, barFill, valText } = item;
        const trackY = 9;
        const fillW = Math.max(0, Math.min(this.meterWidth, (data.value / 100) * this.meterWidth));

        barFill.clear();

        // Color thresholds
        let activeColor = data.color;
        let activeColorStr = data.colorStr;

        if (data.value <= 25) {
            activeColor = 0xFF5252;
            activeColorStr = "#FF5252";
        } else if (data.value <= 50) {
            activeColor = 0xFFB300;
            activeColorStr = "#FFB300";
        }

        if (fillW > 0) {
            // Main fill
            barFill.fillStyle(activeColor, 0.95);
            barFill.fillRoundedRect(this.trackX + 1, trackY + 1, fillW - 2, this.meterHeight - 2, 4);

            // Subtle glossy top highlight
            barFill.fillStyle(0xFFFFFF, 0.25);
            barFill.fillRoundedRect(this.trackX + 2, trackY + 2, fillW - 4, (this.meterHeight - 4) / 2, 2);
        }

        valText.setText(`${Math.round(data.value)}%`);
        valText.setColor(activeColorStr);
    }

    /**
     * Smoothly animate a meter to a new value (0 to 100)
     */
    public setMeterValue(key: ResourceMeterKey, targetValue: number, duration = 300) {
        const item = this.meters.get(key);
        if (!item) return;

        const clamped = Math.max(0, Math.min(100, targetValue));

        this.scene.tweens.add({
            targets: item.data,
            value: clamped,
            duration,
            ease: "Quad.easeOut",
            onUpdate: () => {
                this.renderBarFill(key);
            }
        });
    }

    public getMeterValue(key: ResourceMeterKey): number {
        return this.meters.get(key)?.data.value ?? 0;
    }

    public destroy() {
        this.container.destroy();
    }
}

export default ResourceMeters;
