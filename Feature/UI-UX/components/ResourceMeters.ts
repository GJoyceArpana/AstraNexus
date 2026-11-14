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

    private meterWidth = 150;
    private meterHeight = 16;

    constructor(config: ResourceMeterConfig) {
        this.scene = config.scene;
        this.onOpenSwitchboard = config.onOpenSwitchboard;
        this.container = this.scene.add.container(config.x ?? 20, config.y ?? 18);
        this.container.setDepth(100); // Always on top of game world
        this.init();
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        // Base HUD Dock Panel
        const dockW = 470;
        const dockH = 158;

        const bg = this.scene.add.graphics();
        bg.fillStyle(UITheme.colors.panelBg, 0.94);
        bg.fillRoundedRect(0, 0, dockW, dockH, 12);
        bg.lineStyle(2, UITheme.colors.panelBorder, 0.9);
        bg.strokeRoundedRect(0, 0, dockW, dockH, 12);
        this.container.add(bg);

        // Header
        const header = this.scene.add.text(16, 12, "OUTPOST SOL · VITALS & INTEGRITY", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        this.container.add(header);

        // Quick Switchboard Button on Header Right (Ultra-responsive & prominent)
        if (this.onOpenSwitchboard) {
            const btnW = 160;
            const btnH = 26;
            const switchBtn = this.scene.add.container(dockW - 95, 18);

            const visuals = this.scene.add.container(0, 0);
            switchBtn.add(visuals);

            const sBg = this.scene.add.graphics();
            sBg.fillStyle(0x0C223D, 0.95);
            sBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
            sBg.lineStyle(1.8, UITheme.colors.solarGold, 0.95);
            sBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
            visuals.add(sBg);

            // Luminous hover glow
            const hoverGlow = this.scene.add.graphics();
            hoverGlow.fillStyle(UITheme.colors.solarGold, 0.28);
            hoverGlow.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
            hoverGlow.lineStyle(2.5, 0xFFFFFF, 1);
            hoverGlow.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 6);
            hoverGlow.setAlpha(0);
            visuals.add(hoverGlow);

            const sText = this.scene.add.text(0, 0, "⚡ SWITCHBOARD [P]", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: UITheme.colors.solarGoldStr,
                fontStyle: "bold"
            }).setOrigin(0.5);
            visuals.add(sText);

            // Top-layer hit shield: full coverage and extended proximity (+10px w, +8px h)
            const hitShield = this.scene.add.rectangle(0, 0, btnW + 10, btnH + 8, 0x000000, 0.001);
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

                sText.setColor(UITheme.colors.solarGoldStr);
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

        // 1. Life Support (O₂ & Water)
        this.createMeterRow({
            key: "lifeSupport",
            label: "LIFE SUPPORT",
            subLabel: "O₂ & H₂O Reserves",
            icon: "🫧",
            value: 95,
            color: UITheme.colors.primaryCyan,
            colorStr: UITheme.colors.primaryCyanStr,
            tooltip: "Recycles atmospheric oxygen and supplies pressurized water for the habitat."
        }, 34);

        // 2. Crew Health & Shielding
        this.createMeterRow({
            key: "crewHealth",
            label: "CREW & SHIELD",
            subLabel: "Radiation Protection",
            icon: "🛡",
            value: 100,
            color: UITheme.colors.bioGreen,
            colorStr: UITheme.colors.bioGreenStr,
            tooltip: "Defends against solar radiation flares and tracks astronaut physical health."
        }, 76);

        // 3. Hull & Power Integrity
        this.createMeterRow({
            key: "hullPower",
            label: "HULL & POWER",
            subLabel: "Solar & RTG Grid",
            icon: "⚡",
            value: 88,
            color: UITheme.colors.solarGold,
            colorStr: UITheme.colors.solarGoldStr,
            tooltip: "Tracks base structural stability and energy reserves from solar/nuclear cells."
        }, 118);
    }

    private createMeterRow(data: MeterData, yOffset: number) {
        const row = this.scene.add.container(16, yOffset);

        // Icon Graphic Container
        const iconCircle = this.scene.add.circle(14, 12, 12, 0x0A182E);
        iconCircle.setStrokeStyle(1.5, data.color, 0.9);
        row.add(iconCircle);

        const icon = this.scene.add.text(14, 12, data.icon, {
            fontSize: "12px"
        }).setOrigin(0.5);
        row.add(icon);

        // Labels
        const title = this.scene.add.text(34, 0, data.label, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#FFFFFF",
            fontStyle: "bold"
        });
        const sub = this.scene.add.text(34, 14, data.subLabel, {
            fontFamily: UITheme.fonts.body,
            fontSize: "9px",
            color: UITheme.colors.textMuted
        });
        row.add([title, sub]);

        // Percentage Text (Right aligned)
        const valText = this.scene.add.text(440, 4, `${data.value}%`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: data.colorStr,
            fontStyle: "bold"
        }).setOrigin(1, 0);
        row.add(valText);

        // Progress Bar Track
        const trackX = 225;
        const trackY = 6;
        const track = this.scene.add.graphics();
        track.fillStyle(0x061122, 1);
        track.fillRoundedRect(trackX, trackY, this.meterWidth, this.meterHeight, 4);
        track.lineStyle(1, 0x1A355A, 0.8);
        track.strokeRoundedRect(trackX, trackY, this.meterWidth, this.meterHeight, 4);
        row.add(track);

        // Fill Bar
        const barFill = this.scene.add.graphics();
        row.add(barFill);

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
        const trackX = 225;
        const trackY = 6;
        const fillW = Math.max(0, Math.min(this.meterWidth, (data.value / 100) * this.meterWidth));

        barFill.clear();

        // Color thresholds
        let activeColor = data.color;
        let activeColorStr = data.colorStr;

        if (data.value <= 25) {
            activeColor = UITheme.colors.emergencyRed;
            activeColorStr = UITheme.colors.emergencyRedStr;
        } else if (data.value <= 50) {
            activeColor = UITheme.colors.marsAmber;
            activeColorStr = UITheme.colors.marsAmberStr;
        }

        if (fillW > 0) {
            barFill.fillStyle(activeColor, 0.95);
            barFill.fillRoundedRect(trackX + 1, trackY + 1, fillW - 2, this.meterHeight - 2, 3);
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
