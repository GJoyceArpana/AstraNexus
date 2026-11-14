import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import { SoundFX } from "./ButtonFactory.ts";

export interface TelemetryData {
    sol: number;
    marsTime: string;
    temperatureC: number;
    pressurePa: number;
    solarFlux: string;
    donkiStatus: "QUIET" | "MODERATE" | "SOLAR_STORM";
    radiationLevel: string;
}

export interface TelemetryPanelConfig {
    scene: Phaser.Scene;
    x?: number;
    y?: number;
    onOpenInsights?: () => void;
}

export class TelemetryPanel {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private onOpenInsights?: () => void;

    private tempText!: Phaser.GameObjects.Text;
    private donkiStatusText!: Phaser.GameObjects.Text;
    private donkiStatusLed!: Phaser.GameObjects.Arc;
    private isCollapsed = false;

    private telemetry: TelemetryData = {
        sol: 1,
        marsTime: "14:25 MTC",
        temperatureC: -62,
        pressurePa: 610,
        solarFlux: "Normal (0.24 mSv/day)",
        donkiStatus: "QUIET",
        radiationLevel: "0.18 µGy/h"
    };

    constructor(config: TelemetryPanelConfig) {
        this.scene = config.scene;
        this.onOpenInsights = config.onOpenInsights;
        this.container = this.scene.add.container(config.x ?? (this.scene.scale.width - 340), config.y ?? 18);
        this.container.setDepth(100);

        this.init();
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        const panelW = 320;
        const panelH = 158;

        const bg = this.scene.add.graphics();
        bg.fillStyle(UITheme.colors.panelBg, 0.94);
        bg.fillRoundedRect(0, 0, panelW, panelH, 12);
        bg.lineStyle(2, UITheme.colors.panelBorder, 0.9);
        bg.strokeRoundedRect(0, 0, panelW, panelH, 12);
        this.container.add(bg);

        // Header: NASA Telemetry Feed
        const header = this.scene.add.text(16, 12, "NASA DONKI & MARS TELEMETRY", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        this.container.add(header);

        // Live Pulse Dot
        const liveDot = this.scene.add.circle(panelW - 20, 18, 5, UITheme.colors.bioGreen);
        this.container.add(liveDot);
        this.scene.tweens.add({
            targets: liveDot,
            alpha: 0.2,
            duration: 900,
            yoyo: true,
            repeat: -1
        });

        // 1. Sol & Martian Time
        const solLabel = this.scene.add.text(16, 36, "MARTIAN SOL:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.textMuted
        });
        const solVal = this.scene.add.text(16, 50, `SOL 0${this.telemetry.sol} · ${this.telemetry.marsTime}`, {
            fontFamily: UITheme.fonts.body,
            fontSize: "13px",
            color: "#FFFFFF",
            fontStyle: "bold"
        });
        this.container.add([solLabel, solVal]);

        // 2. Ambient Surface Temperature & Pressure
        const tempLabel = this.scene.add.text(170, 36, "SURFACE TEMP & BARO:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.textMuted
        });
        this.tempText = this.scene.add.text(170, 50, `${this.telemetry.temperatureC}°C | ${this.telemetry.pressurePa} Pa`, {
            fontFamily: UITheme.fonts.body,
            fontSize: "13px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        this.container.add([tempLabel, this.tempText]);

        // Divider
        const div = this.scene.add.line(0, 0, 16, 76, panelW - 16, 76, UITheme.colors.panelBorder).setOrigin(0);
        this.container.add(div);

        // 3. NASA DONKI Space Weather Feed
        const donkiLabel = this.scene.add.text(16, 84, "NASA DONKI SPACE WEATHER:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });

        this.donkiStatusLed = this.scene.add.circle(24, 110, 5, UITheme.colors.bioGreen);
        this.donkiStatusText = this.scene.add.text(35, 102, "STATUS: NOMINAL (NO FLARE)", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: UITheme.colors.bioGreenStr,
            fontStyle: "bold"
        });
        this.container.add([donkiLabel, this.donkiStatusLed, this.donkiStatusText]);

        // 4. Insights Button
        if (this.onOpenInsights) {
            const insBtn = this.scene.add.container(panelW / 2, 136);

            const bBg = this.scene.add.graphics();
            bBg.fillStyle(0x132C4F, 0.9);
            bBg.fillRoundedRect(-140, -10, 280, 22, 6);
            bBg.lineStyle(1, UITheme.colors.primaryCyan, 0.7);
            bBg.strokeRoundedRect(-140, -10, 280, 22, 6);
            insBtn.add(bBg);

            const bText = this.scene.add.text(0, 1, "VIEW NASA MARS SCIENCE ARCHIVE ✦", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: "#FFFFFF",
                fontStyle: "bold"
            }).setOrigin(0.5);
            insBtn.add(bText);

            insBtn.setSize(280, 22);
            insBtn.setInteractive(new Phaser.Geom.Rectangle(-140, -10, 280, 22), Phaser.Geom.Rectangle.Contains);
            insBtn.input!.cursor = "pointer";

            insBtn.on("pointerdown", () => {
                SoundFX.playClick();
                if (this.onOpenInsights) this.onOpenInsights();
            });

            this.container.add(insBtn);
        }
    }

    /**
     * Update DONKI Space Weather status dynamically
     */
    public setDonkiAlert(status: "QUIET" | "MODERATE" | "SOLAR_STORM") {
        this.telemetry.donkiStatus = status;

        if (status === "QUIET") {
            this.donkiStatusLed.setFillStyle(UITheme.colors.bioGreen);
            this.donkiStatusText.setText("STATUS: NOMINAL (NO FLARE)");
            this.donkiStatusText.setColor(UITheme.colors.bioGreenStr);
        } else if (status === "MODERATE") {
            this.donkiStatusLed.setFillStyle(UITheme.colors.solarGold);
            this.donkiStatusText.setText("STATUS: C-CLASS SOLAR FLARE");
            this.donkiStatusText.setColor(UITheme.colors.solarGoldStr);
        } else {
            this.donkiStatusLed.setFillStyle(UITheme.colors.emergencyRed);
            this.donkiStatusText.setText("STATUS: ⚠ M-CLASS STORM INCOMING");
            this.donkiStatusText.setColor(UITheme.colors.emergencyRedStr);
        }
    }

    public toggleCollapse() {
        this.isCollapsed = !this.isCollapsed;
        this.scene.tweens.add({
            targets: this.container,
            y: this.isCollapsed ? -110 : 18,
            duration: 250,
            ease: "Quad.easeOut"
        });
    }

    public destroy() {
        this.container.destroy();
    }
}

export default TelemetryPanel;
