import Phaser from "phaser";
import UITheme from "../../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../../components/ButtonFactory.ts";
import type { Sol5MissionResults } from "./types.ts";

export interface ResultsModalCallbacks {
    onRetry: () => void;
    onAdvanceOrReturn: () => void;
}

export class Sol5ResultsModal {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private results: Sol5MissionResults;
    private callbacks: ResultsModalCallbacks;

    constructor(
        scene: Phaser.Scene,
        results: Sol5MissionResults,
        callbacks: ResultsModalCallbacks
    ) {
        this.scene = scene;
        this.results = results;
        this.callbacks = callbacks;
        this.container = this.scene.add.container(0, 0).setDepth(300);

        this.init();
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        const { width, height } = this.scene.scale;

        // Dark modal shield
        const bgShield = this.scene.add.rectangle(0, 0, width, height, 0x02050E, 0.92).setOrigin(0);
        bgShield.setInteractive();
        this.container.add(bgShield);

        const frameW = 820;
        const frameH = 560;
        const cx = width / 2;
        const cy = height / 2;

        const box = this.scene.add.graphics();
        box.fillStyle(UITheme.colors.panelBg, 0.98);
        box.fillRoundedRect(cx - frameW / 2, cy - frameH / 2, frameW, frameH, 16);
        box.lineStyle(3, this.results.isSuccess ? UITheme.colors.bioGreen : UITheme.colors.emergencyRed, 1);
        box.strokeRoundedRect(cx - frameW / 2, cy - frameH / 2, frameW, frameH, 16);
        box.lineStyle(1.5, UITheme.colors.panelBorder, 0.7);
        box.strokeRoundedRect(cx - frameW / 2 + 8, cy - frameH / 2 + 8, frameW - 16, frameH - 16, 12);
        this.container.add(box);

        // Header Title
        const topY = cy - frameH / 2 + 40;
        const headerTitle = this.scene.add.text(
            cx,
            topY,
            this.results.isSuccess ? "✦ MISSION SUCCESSFUL: HABITAT SECURED ✦" : "⚠ CRITICAL HABITAT FAILURE: MISSION ABORT ⚠",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "20px",
                color: this.results.isSuccess ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr,
                fontStyle: "bold",
                letterSpacing: 2
            }
        ).setOrigin(0.5);
        this.container.add(headerTitle);

        const subtitle = this.scene.add.text(
            cx,
            topY + 28,
            this.results.isSuccess
                ? "SOL 5 — THE LAST SAFE HABITAT · ALL CRITICAL LIFE SUPPORT RESTORED"
                : this.getFailureDescription(),
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "12px",
                color: this.results.isSuccess ? UITheme.colors.solarGoldStr : "#FFA4A4",
                fontStyle: "bold"
            }
        ).setOrigin(0.5);
        this.container.add(subtitle);

        // 2-Column Layout: Left = Statistics & Performance, Right = NASA Science Insight
        const colW = (frameW - 64) / 2;
        const leftX = cx - frameW / 2 + 24;
        const rightX = cx + 8;
        const contentY = topY + 54;

        // LEFT COLUMN: PERFORMANCE & METRICS
        this.createPerformancePanel(leftX, contentY, colW, 350);

        // RIGHT COLUMN: NASA SCIENCE INSIGHT
        this.createNASASciencePanel(rightX, contentY, colW, 350);

        // BOTTOM ACTION BUTTONS
        const btnY = cy + frameH / 2 - 40;
        if (this.results.isSuccess) {
            const advanceBtn = ButtonFactory.createButton({
                scene: this.scene,
                x: cx,
                y: btnY,
                width: 320,
                height: 44,
                text: "✦ RETURN TO MARS BASE COMMAND ➔",
                fontSize: "13px",
                primaryColor: UITheme.colors.bioGreen,
                onClick: () => {
                    SoundFX.playClick();
                    this.close();
                    this.callbacks.onAdvanceOrReturn();
                }
            });
            this.container.add(advanceBtn);
        } else {
            const retryBtn = ButtonFactory.createButton({
                scene: this.scene,
                x: cx - 140,
                y: btnY,
                width: 240,
                height: 44,
                text: "🔄 RETRY EMERGENCY PROTOCOL",
                fontSize: "12.5px",
                primaryColor: UITheme.colors.marsAmber,
                onClick: () => {
                    SoundFX.playClick();
                    this.close();
                    this.callbacks.onRetry();
                }
            });

            const abortBtn = ButtonFactory.createButton({
                scene: this.scene,
                x: cx + 140,
                y: btnY,
                width: 240,
                height: 44,
                text: "← RETURN TO MARS BASE",
                fontSize: "12.5px",
                primaryColor: UITheme.colors.cardHover,
                onClick: () => {
                    SoundFX.playClick();
                    this.close();
                    this.callbacks.onAdvanceOrReturn();
                }
            });

            this.container.add([retryBtn, abortBtn]);
        }
    }

    private getFailureDescription(): string {
        switch (this.results.failureReason) {
            case "DEPRESSURIZATION":
                return "CATASTROPHIC DEPRESSURIZATION: Cabin pressure plummeted below Armstrong Limit threshold (<18 kPa)!";
            case "HYPOXIA":
                return "ACUTE HYPOXIA: Oxygen reserve exhausted (0%) due to uncontained air distribution leaks!";
            case "STRUCTURAL_COLLAPSE":
                return "STRUCTURAL COLLAPSE: External hull breach compromised the pressurized habitat shell!";
            case "TIME_EXPIRED":
                return "TIME EXPIRED: The habitat emergency reserve battery and buffer were completely depleted!";
            default:
                return "EMERGENCY PROTOCOL FAILED: Critical life-support systems were lost.";
        }
    }

    private createPerformancePanel(x: number, y: number, w: number, h: number) {
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x07111F, 0.95);
        bg.fillRoundedRect(x, y, w, h, 8);
        bg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        bg.strokeRoundedRect(x, y, w, h, 8);
        this.container.add(bg);

        const heading = this.scene.add.text(x + 16, y + 14, "FLIGHT TELEMETRY DEBRIEF:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        this.container.add(heading);

        const min = Math.floor(this.results.completionTimeSec / 60);
        const sec = this.results.completionTimeSec % 60;
        const timeStr = `${min}m ${sec < 10 ? "0" : ""}${sec}s`;

        const stats = [
            { label: "Systems Repaired", val: `${this.results.repairsCompleted} / 4 Subsystems` },
            { label: "Mission Elapsed Time", val: timeStr },
            { label: "Final Cabin Pressure", val: `${this.results.finalPressureKPa} kPa (Nominal: 60 kPa)` },
            { label: "Final Oxygen Reserve", val: `${this.results.finalOxygenPct}%` },
            { label: "Structural Hull Seal", val: `${this.results.finalIntegrityPct}%` },
            { label: "Electrical Power Output", val: `${this.results.finalPowerKW} kW` },
            { label: "Performance Score", val: `${this.results.performanceScore} PTS` },
            { label: "Engineering Rank", val: this.results.rankTitle }
        ];

        let lineY = y + 42;
        for (const s of stats) {
            const lText = this.scene.add.text(x + 16, lineY, s.label, {
                fontFamily: UITheme.fonts.body,
                fontSize: "11.5px",
                color: UITheme.colors.textSecondary
            });
            const rText = this.scene.add.text(x + w - 16, lineY, s.val, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11.5px",
                color: s.label === "Engineering Rank" ? UITheme.colors.solarGoldStr : "#FFFFFF",
                fontStyle: "bold"
            }).setOrigin(1, 0);

            this.container.add([lText, rText]);
            lineY += 28;
        }

        // Stars Rating (if success)
        if (this.results.isSuccess) {
            const starsStr = "★".repeat(this.results.stars) + "☆".repeat(3 - this.results.stars);
            const starsText = this.scene.add.text(x + w / 2, y + h - 35, starsStr, {
                fontSize: "24px",
                color: UITheme.colors.solarGoldStr
            }).setOrigin(0.5);
            this.container.add(starsText);
        }
    }

    private createNASASciencePanel(x: number, y: number, w: number, h: number) {
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x07111F, 0.95);
        bg.fillRoundedRect(x, y, w, h, 8);
        bg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        bg.strokeRoundedRect(x, y, w, h, 8);
        this.container.add(bg);

        const heading = this.scene.add.text(x + 16, y + 14, "NASA SCIENCE & ENGINEERING INSIGHT:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
        this.container.add(heading);

        const textContent =
            "1. MARS ATMOSPHERIC PRESSURE:\n" +
            "The Martian ambient surface pressure is only ~610 Pascals (0.61 kPa / 0.006 atm) — less than 1% of Earth's 101.3 kPa! At the Armstrong Limit (6.3 kPa), exposed water and bodily fluids boil at human body temperature (37°C).\n\n" +
            "2. NASA HABITAT PRESSURIZATION:\n" +
            "NASA Moon-to-Mars exploration standards specify an internal habitat atmosphere between 56.5 kPa (34% O₂) and 70.3 kPa (30% O₂). This prevents decompression sickness while reducing structural stress and nitrogen gas usage.\n\n" +
            "3. ECLSS LIFE SUPPORT:\n" +
            "Environmental Control and Life Support Systems (ECLSS) recycle O₂ via Sabatier and electrolysis, scrub CO₂, and regulate temperature. Without reliable electric power from fission or solar banks, pumps fail in minutes.\n\n" +
            "4. STRUCTURAL WHIPPLE SHIELDS:\n" +
            "Martian dust storms fling high-speed mineral grains. Multi-layer Kevlar, aerogel, and regolith bumpers absorb kinetic impacts and maintain the hermetic pressure seal.";

        const scienceText = this.scene.add.text(x + 16, y + 40, textContent, {
            fontFamily: UITheme.fonts.body,
            fontSize: "10.5px",
            color: "#D2E2F5",
            wordWrap: { width: w - 32 },
            lineSpacing: 4
        });
        this.container.add(scienceText);
    }

    public close() {
        this.container.destroy();
    }
}

export default Sol5ResultsModal;
