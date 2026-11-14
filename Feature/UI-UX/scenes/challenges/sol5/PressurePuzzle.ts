import Phaser from "phaser";
import UITheme from "../../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../../components/ButtonFactory.ts";

export interface PressurePuzzleCallbacks {
    onComplete: () => void;
    onClose: () => void;
}

export class PressurePuzzle {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private callbacks: PressurePuzzleCallbacks;

    // Simulation variables
    private pressureKPa = 38.0;
    private readonly TARGET_MIN = 56.0;
    private readonly TARGET_MAX = 64.0;

    // Valve settings (0.0 to 1.0)
    private valveA_Inflow = 0.20;       // Drives pressure up, introduces surge
    private valveB_Bleed = 0.10;        // Drives pressure down
    private valveC_Equalizer = 0.10;    // Dampens storm oscillations

    // Stabilization Lock
    private dwellTimeSec = 0;
    private readonly DWELL_REQUIRED_SEC = 5.0;
    private isSolved = false;

    // UI Elements
    private needleGraphics!: Phaser.GameObjects.Graphics;
    private digitalKPaText!: Phaser.GameObjects.Text;
    private statusText!: Phaser.GameObjects.Text;
    private dwellProgressBarFill!: Phaser.GameObjects.Graphics;
    private dwellProgressLabel!: Phaser.GameObjects.Text;

    private valveLabels: Record<string, Phaser.GameObjects.Text> = {};

    private timerEvent?: Phaser.Time.TimerEvent;

    constructor(scene: Phaser.Scene, callbacks: PressurePuzzleCallbacks) {
        this.scene = scene;
        this.callbacks = callbacks;
        this.container = this.scene.add.container(0, 0).setDepth(200);

        this.init();
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        const { width, height } = this.scene.scale;

        // Dark modal shield
        const bgShield = this.scene.add.rectangle(0, 0, width, height, 0x030713, 0.90).setOrigin(0);
        bgShield.setInteractive();
        this.container.add(bgShield);

        // Heavy Console Bezel (880x600)
        const frameW = 880;
        const frameH = 600;
        const cx = width / 2;
        const cy = height / 2;

        const chassis = this.scene.add.graphics();
        chassis.fillStyle(UITheme.colors.panelBg, 0.98);
        chassis.fillRoundedRect(cx - frameW / 2, cy - frameH / 2, frameW, frameH, 16);
        chassis.lineStyle(3, UITheme.colors.bioGreen, 0.9);
        chassis.strokeRoundedRect(cx - frameW / 2, cy - frameH / 2, frameW, frameH, 16);
        chassis.lineStyle(1.5, UITheme.colors.panelBorder, 0.6);
        chassis.strokeRoundedRect(cx - frameW / 2 + 8, cy - frameH / 2 + 8, frameW - 16, frameH - 16, 12);
        this.container.add(chassis);

        // Header Section
        const headerY = cy - frameH / 2 + 40;
        const title = this.scene.add.text(
            cx - frameW / 2 + 28,
            headerY,
            "CHALLENGE 3 // OXYGEN PRESSURE REGULATION CONSOLE",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "15px",
                color: UITheme.colors.bioGreenStr,
                fontStyle: "bold",
                letterSpacing: 1.5
            }
        ).setOrigin(0, 0.5);
        this.container.add(title);

        // Close Button
        const closeBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: cx + frameW / 2 - 50,
            y: headerY,
            width: 70,
            height: 32,
            text: "EXIT ✕",
            fontSize: "11px",
            primaryColor: UITheme.colors.cardHover,
            onClick: () => {
                SoundFX.playClick();
                this.close();
            }
        });
        this.container.add(closeBtn);

        const subheader = this.scene.add.text(
            cx - frameW / 2 + 28,
            headerY + 26,
            "TARGET: Maintain cabin pressure in the NASA Nominal Zone (56.0 - 64.0 kPa) continuously for 5.0 seconds to lock servo calibration.",
            {
                fontFamily: UITheme.fonts.body,
                fontSize: "11.5px",
                color: UITheme.colors.textSecondary
            }
        );
        this.container.add(subheader);

        // Left Section: Analog Dial Pressure Gauge
        this.createAnalogGauge(cx - 180, cy + 20);

        // Right Section: 3 Interactive Rotary Valves
        this.createValveControls(cx + 190, cy + 20);

        // Bottom Dwell Progress Bar & Status
        this.createDwellStatusHUD(cx, cy + frameH / 2 - 50, frameW - 56);

        // Simulation Loop (runs every 50ms)
        this.timerEvent = this.scene.time.addEvent({
            delay: 50,
            loop: true,
            callback: () => this.simulateStep(0.05)
        });
    }

    private createAnalogGauge(gx: number, gy: number) {
        const gaugeRadius = 130;
        const g = this.scene.add.graphics();

        // Outer circular bezel
        g.fillStyle(0x07111D, 1);
        g.fillCircle(gx, gy, gaugeRadius);
        g.lineStyle(4, 0x1A3554, 1);
        g.strokeCircle(gx, gy, gaugeRadius);

        // Colored Pressure Arc Rings (from -140 deg to +140 deg)
        // Total sweep = 280 deg for 0 to 100 kPa (2.8 deg per kPa)
        // Red (0 - 30 kPa): Extreme Vacuum
        // Amber (30 - 56 kPa): Low / Hypoxic
        // Green (56 - 64 kPa): Nominal NASA Exploration Band
        // Amber (64 - 80 kPa): High
        // Red (80 - 100 kPa): Overpressure Rupture
        const degPerKPa = 260 / 100;

        // Draw arcs using small segments
        const drawArcBand = (minK: number, maxK: number, color: number, width: number) => {
            g.lineStyle(width, color, 0.9);
            const a1 = Phaser.Math.DegToRad(140 + minK * degPerKPa);
            const a2 = Phaser.Math.DegToRad(140 + maxK * degPerKPa);
            g.beginPath();
            g.arc(gx, gy, gaugeRadius - 18, a1, a2, false);
            g.strokePath();
        };

        drawArcBand(0, 30, 0xFF1744, 8);   // Red
        drawArcBand(30, 56, 0xFF8A50, 8);  // Amber
        drawArcBand(56, 64, 0x00E676, 12); // Green Target Zone!
        drawArcBand(64, 80, 0xFF8A50, 8);  // Amber
        drawArcBand(80, 100, 0xFF1744, 8); // Red

        // Dial tick marks
        for (let k = 0; k <= 100; k += 10) {
            const rad = Phaser.Math.DegToRad(140 + k * degPerKPa);
            const innerR = k % 20 === 0 ? gaugeRadius - 32 : gaugeRadius - 26;
            const x1 = gx + Math.cos(rad) * (gaugeRadius - 10);
            const y1 = gy + Math.sin(rad) * (gaugeRadius - 10);
            const x2 = gx + Math.cos(rad) * innerR;
            const y2 = gy + Math.sin(rad) * innerR;
            g.lineStyle(k === 60 ? 2.5 : 1.5, k === 60 ? 0x00E676 : 0x4C6E96, 1);
            g.lineBetween(x1, y1, x2, y2);

            if (k % 20 === 0) {
                const tx = gx + Math.cos(rad) * (gaugeRadius - 44);
                const ty = gy + Math.sin(rad) * (gaugeRadius - 44);
                const tNum = this.scene.add.text(tx, ty, `${k}`, {
                    fontFamily: UITheme.fonts.heading,
                    fontSize: "8.5px",
                    color: k === 60 ? UITheme.colors.bioGreenStr : "#7E95B8",
                    fontStyle: "bold"
                }).setOrigin(0.5);
                this.container.add(tNum);
            }
        }

        this.container.add(g);

        // Center needle
        this.needleGraphics = this.scene.add.graphics();
        this.container.add(this.needleGraphics);

        // Center hub cap
        const hub = this.scene.add.graphics();
        hub.fillStyle(0x0C1F33, 1);
        hub.fillCircle(gx, gy, 12);
        hub.lineStyle(2, UITheme.colors.solarGold, 1);
        hub.strokeCircle(gx, gy, 12);
        this.container.add(hub);

        // Digital Readout below dial
        const digiBox = this.scene.add.graphics();
        digiBox.fillStyle(0x050C17, 1);
        digiBox.fillRoundedRect(gx - 80, gy + gaugeRadius + 10, 160, 44, 6);
        digiBox.lineStyle(1.5, UITheme.colors.panelBorder, 1);
        digiBox.strokeRoundedRect(gx - 80, gy + gaugeRadius + 10, 160, 44, 6);
        this.container.add(digiBox);

        this.digitalKPaText = this.scene.add.text(
            gx,
            gy + gaugeRadius + 32,
            "38.0 kPa",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "16px",
                color: UITheme.colors.marsAmberStr,
                fontStyle: "bold"
            }
        ).setOrigin(0.5);
        this.container.add(this.digitalKPaText);

        const targetBadge = this.scene.add.text(
            gx,
            gy + 65,
            "TARGET: 56–64 kPa",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "9px",
                color: UITheme.colors.bioGreenStr,
                fontStyle: "bold",
                backgroundColor: "#030E1CEE",
                padding: { x: 6, y: 2 }
            }
        ).setOrigin(0.5);
        this.container.add(targetBadge);

        this.updateNeedle(this.pressureKPa);
    }

    private updateNeedle(pressure: number) {
        this.needleGraphics.clear();
        const gx = this.scene.scale.width / 2 - 180;
        const gy = this.scene.scale.height / 2 + 20;
        const gaugeRadius = 130;
        const degPerKPa = 260 / 100;

        const clamped = Math.max(0, Math.min(100, pressure));
        const rad = Phaser.Math.DegToRad(140 + clamped * degPerKPa);

        const tipX = gx + Math.cos(rad) * (gaugeRadius - 20);
        const tipY = gy + Math.sin(rad) * (gaugeRadius - 20);

        // Tail opposite
        const tailRad = rad + Math.PI;
        const tailX = gx + Math.cos(tailRad) * 16;
        const tailY = gy + Math.sin(tailRad) * 16;

        this.needleGraphics.lineStyle(3, 0xFF5252, 1);
        this.needleGraphics.lineBetween(tailX, tailY, tipX, tipY);
        this.needleGraphics.fillStyle(0xFF5252, 1);
        this.needleGraphics.fillCircle(tipX, tipY, 3);
    }

    private createValveControls(vx: number, vy: number) {
        const valveConfigs = [
            {
                id: "valve_a",
                name: "VALVE A: CRYO O₂ INFLOW",
                desc: "Throttles O2 intake. Adds pressure (+kPa), increases surge.",
                val: this.valveA_Inflow,
                offsetY: -95
            },
            {
                id: "valve_b",
                name: "VALVE B: BLEED-OFF VENT",
                desc: "Releases excess gas (-kPa). Relieves overpressure.",
                val: this.valveB_Bleed,
                offsetY: 0
            },
            {
                id: "valve_c",
                name: "VALVE C: STORM EQUALIZER",
                desc: "Dampens external dust gale barometric oscillations.",
                val: this.valveC_Equalizer,
                offsetY: 95
            }
        ];

        for (const cfg of valveConfigs) {
            const cardY = vy + cfg.offsetY;
            const cardW = 360;
            const cardH = 76;

            const card = this.scene.add.container(vx, cardY);

            const bg = this.scene.add.graphics();
            bg.fillStyle(0x0A1C2E, 0.95);
            bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);
            bg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
            bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 8);
            card.add(bg);

            const title = this.scene.add.text(-cardW / 2 + 14, -cardH / 2 + 12, cfg.name, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: UITheme.colors.primaryCyanStr,
                fontStyle: "bold"
            });
            const desc = this.scene.add.text(-cardW / 2 + 14, -cardH / 2 + 28, cfg.desc, {
                fontFamily: UITheme.fonts.body,
                fontSize: "9.5px",
                color: UITheme.colors.textSecondary
            });
            card.add([title, desc]);

            // Value Display
            const valText = this.scene.add.text(
                cardW / 2 - 95,
                cardH / 2 - 20,
                `${Math.round(cfg.val * 100)}%`,
                {
                    fontFamily: UITheme.fonts.heading,
                    fontSize: "13px",
                    color: UITheme.colors.solarGoldStr,
                    fontStyle: "bold"
                }
            ).setOrigin(0.5);
            card.add(valText);
            this.valveLabels[cfg.id] = valText;

            // Step Down Button [-]
            const minusBtn = ButtonFactory.createButton({
                scene: this.scene,
                x: cardW / 2 - 145,
                y: cardH / 2 - 20,
                width: 34,
                height: 28,
                text: "▼",
                fontSize: "10px",
                primaryColor: UITheme.colors.cardHover,
                onClick: () => this.adjustValve(cfg.id, -0.10)
            });
            card.add(minusBtn);

            // Step Up Button [+]
            const plusBtn = ButtonFactory.createButton({
                scene: this.scene,
                x: cardW / 2 - 45,
                y: cardH / 2 - 20,
                width: 34,
                height: 28,
                text: "▲",
                fontSize: "10px",
                primaryColor: UITheme.colors.cardHover,
                onClick: () => this.adjustValve(cfg.id, +0.10)
            });
            card.add(plusBtn);

            this.container.add(card);
        }
    }

    private adjustValve(id: string, delta: number) {
        if (this.isSolved) return;
        SoundFX.playClick();

        if (id === "valve_a") {
            this.valveA_Inflow = Math.max(0, Math.min(1.0, this.valveA_Inflow + delta));
            this.valveLabels[id].setText(`${Math.round(this.valveA_Inflow * 100)}%`);
        } else if (id === "valve_b") {
            this.valveB_Bleed = Math.max(0, Math.min(1.0, this.valveB_Bleed + delta));
            this.valveLabels[id].setText(`${Math.round(this.valveB_Bleed * 100)}%`);
        } else if (id === "valve_c") {
            this.valveC_Equalizer = Math.max(0, Math.min(1.0, this.valveC_Equalizer + delta));
            this.valveLabels[id].setText(`${Math.round(this.valveC_Equalizer * 100)}%`);
        }
    }

    private createDwellStatusHUD(x: number, y: number, w: number) {
        const hudBg = this.scene.add.graphics();
        hudBg.fillStyle(0x060E1A, 0.95);
        hudBg.fillRoundedRect(x - w / 2, y - 24, w, 48, 8);
        hudBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        hudBg.strokeRoundedRect(x - w / 2, y - 24, w, 48, 8);
        this.container.add(hudBg);

        this.statusText = this.scene.add.text(
            x - w / 2 + 20,
            y,
            "STATUS: ⚠ UNSTABLE PRESSURE · ADJUST VALVES TO 56–64 kPa",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10.5px",
                color: UITheme.colors.marsAmberStr,
                fontStyle: "bold"
            }
        ).setOrigin(0, 0.5);
        this.container.add(this.statusText);

        // Dwell Progress Bar
        const barW = 200;
        const barH = 16;
        const barX = x + w / 2 - 20 - barW;
        const barY = y;

        const barTrack = this.scene.add.graphics();
        barTrack.fillStyle(0x030812, 1);
        barTrack.fillRoundedRect(barX, barY - barH / 2, barW, barH, 4);
        barTrack.lineStyle(1, UITheme.colors.panelBorder, 1);
        barTrack.strokeRoundedRect(barX, barY - barH / 2, barW, barH, 4);
        this.container.add(barTrack);

        this.dwellProgressBarFill = this.scene.add.graphics();
        this.container.add(this.dwellProgressBarFill);

        this.dwellProgressLabel = this.scene.add.text(
            barX - 10,
            barY,
            "LOCK: 0.0s / 5.0s",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: UITheme.colors.primaryCyanStr,
                fontStyle: "bold"
            }
        ).setOrigin(1, 0.5);
        this.container.add(this.dwellProgressLabel);
    }

    /**
     * Physics Step for Pressure Regulation.
     * Integrates non-linear valve drives and external storm waves.
     */
    private simulateStep(deltaSec: number) {
        if (this.isSolved) return;

        // Drive factors:
        // Valve A adds pressure: +8.5 kPa/s at 100%
        // Valve B bleeds pressure: -7.0 kPa/s at 100%
        // Ambient natural bleed: -1.2 kPa/s (habitat airlock micro leakage)
        const netInflow = (this.valveA_Inflow * 8.5) - (this.valveB_Bleed * 7.0) - 1.2;

        // External Martian dust storm barometric wave buffeting the regulator:
        // Amplitude is reduced by Valve C (Equalizer)!
        const stormAmplitude = Math.max(0, 8.0 * (1.0 - this.valveC_Equalizer));
        const stormWave = Math.sin(Date.now() * 0.0035) * stormAmplitude;

        this.pressureKPa += netInflow * deltaSec;
        this.pressureKPa = Math.max(15.0, Math.min(95.0, this.pressureKPa));

        const displayPressure = Math.max(0, Math.min(100, this.pressureKPa + stormWave));
        this.digitalKPaText.setText(`${displayPressure.toFixed(1)} kPa`);

        // Gauge color
        if (displayPressure < this.TARGET_MIN) {
            this.digitalKPaText.setColor(displayPressure < 30 ? UITheme.colors.emergencyRedStr : UITheme.colors.marsAmberStr);
        } else if (displayPressure > this.TARGET_MAX) {
            this.digitalKPaText.setColor(displayPressure > 80 ? UITheme.colors.emergencyRedStr : UITheme.colors.marsAmberStr);
        } else {
            this.digitalKPaText.setColor(UITheme.colors.bioGreenStr);
        }

        this.updateNeedle(displayPressure);

        // Check if inside target window (56.0 - 64.0 kPa)
        const isInside = displayPressure >= this.TARGET_MIN && displayPressure <= this.TARGET_MAX;

        if (isInside) {
            this.dwellTimeSec = Math.min(this.DWELL_REQUIRED_SEC, this.dwellTimeSec + deltaSec);
            this.statusText.setText("✔ IN TARGET WINDOW: HOLDING STEADY FOR SERVO-LOCK...");
            this.statusText.setColor(UITheme.colors.bioGreenStr);
        } else {
            if (this.dwellTimeSec > 0) {
                // Lost lock!
                this.dwellTimeSec = Math.max(0, this.dwellTimeSec - deltaSec * 2.5);
                this.statusText.setText("⚠ PRESSURE FLUCTUATING OUTSIDE 56–64 kPa! STABILIZATION RESET");
                this.statusText.setColor(UITheme.colors.emergencyRedStr);
            }
        }

        // Update Dwell Bar
        this.updateDwellHUD();

        // Check Victory
        if (this.dwellTimeSec >= this.DWELL_REQUIRED_SEC && !this.isSolved) {
            this.handleSolveSuccess();
        }
    }

    private updateDwellHUD() {
        const { width, height } = this.scene.scale;
        const frameW = 880;
        const frameH = 600;
        const barW = 200;
        const barH = 16;
        const barX = width / 2 + frameW / 2 - 48 - barW;
        const barY = height / 2 + frameH / 2 - 50;

        const pct = this.dwellTimeSec / this.DWELL_REQUIRED_SEC;

        this.dwellProgressBarFill.clear();
        this.dwellProgressBarFill.fillStyle(pct >= 1.0 ? UITheme.colors.bioGreen : UITheme.colors.primaryCyan, 0.95);
        this.dwellProgressBarFill.fillRoundedRect(barX + 2, barY - barH / 2 + 2, Math.max(0, (barW - 4) * pct), barH - 4, 3);

        this.dwellProgressLabel.setText(`LOCK: ${this.dwellTimeSec.toFixed(1)}s / 5.0s`);
    }

    private handleSolveSuccess() {
        this.isSolved = true;
        SoundFX.playToggle(true);

        this.statusText.setText("✔ SERVO-CALIBRATION LOCKED AT 60.5 kPa! OXYGEN REGULATION NOMINAL");
        this.statusText.setColor(UITheme.colors.bioGreenStr);

        this.scene.cameras.main.flash(400, 0, 230, 118, false);

        this.scene.time.delayedCall(1600, () => {
            this.callbacks.onComplete();
            this.close();
        });
    }

    public close() {
        if (this.timerEvent) {
            this.timerEvent.destroy();
            this.timerEvent = undefined;
        }
        this.container.destroy();
        this.callbacks.onClose();
    }
}

export default PressurePuzzle;
