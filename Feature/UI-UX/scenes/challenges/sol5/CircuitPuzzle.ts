import Phaser from "phaser";
import UITheme from "../../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../../components/ButtonFactory.ts";

export interface CircuitPuzzleCallbacks {
    onComplete: () => void;
    onClose: () => void;
}

interface CircuitSwitch {
    id: string;
    label: string;
    x: number;
    y: number;
    isClosed: boolean; // true = passing current
    container: Phaser.GameObjects.Container;
    switchGraphics: Phaser.GameObjects.Graphics;
    led: Phaser.GameObjects.Arc;
}

interface TransformerRelay {
    id: string;
    label: string;
    x: number;
    y: number;
    stepRatio: string;
    isActive: boolean;
    container: Phaser.GameObjects.Container;
    boxGraphics: Phaser.GameObjects.Graphics;
    statusText: Phaser.GameObjects.Text;
}

interface CircuitTerminal {
    id: string;
    name: string;
    loadKw: number;
    x: number;
    y: number;
    isEnergized: boolean;
    container: Phaser.GameObjects.Container;
    statusGlow: Phaser.GameObjects.Graphics;
    statusLabel: Phaser.GameObjects.Text;
}

export class CircuitPuzzle {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private callbacks: CircuitPuzzleCallbacks;

    private isSolved = false;
    private isBreakerTripped = false;
    private isClosed = false;
    private completionTimer?: Phaser.Time.TimerEvent;

    private switches: CircuitSwitch[] = [];
    private relays: TransformerRelay[] = [];
    private terminals: CircuitTerminal[] = [];

    private boardTraceGraphics!: Phaser.GameObjects.Graphics;
    private currentPulseGraphics!: Phaser.GameObjects.Graphics;
    private breakerAlertText!: Phaser.GameObjects.Text;
    private breakerResetBtn!: Phaser.GameObjects.Container;
    private livePowerGaugeText!: Phaser.GameObjects.Text;

    constructor(scene: Phaser.Scene, callbacks: CircuitPuzzleCallbacks) {
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
        const bgShield = this.scene.add.rectangle(0, 0, width, height, 0x030611, 0.90).setOrigin(0);
        bgShield.setInteractive();
        this.container.add(bgShield);

        // High-Tech Circuit Board Chassis (880x600)
        const frameW = 880;
        const frameH = 600;
        const cx = width / 2;
        const cy = height / 2;

        const chassis = this.scene.add.graphics();
        // PCB Substrate: deep matte technical green/navy
        chassis.fillStyle(0x0A1828, 0.98);
        chassis.fillRoundedRect(cx - frameW / 2, cy - frameH / 2, frameW, frameH, 16);
        chassis.lineStyle(3, UITheme.colors.solarGold, 0.9);
        chassis.strokeRoundedRect(cx - frameW / 2, cy - frameH / 2, frameW, frameH, 16);
        chassis.lineStyle(1.5, UITheme.colors.panelBorder, 0.7);
        chassis.strokeRoundedRect(cx - frameW / 2 + 8, cy - frameH / 2 + 8, frameW - 16, frameH - 16, 12);
        this.container.add(chassis);

        // Header Section
        const headerY = cy - frameH / 2 + 40;
        const title = this.scene.add.text(
            cx - frameW / 2 + 28,
            headerY,
            "CHALLENGE 2 // ELECTRICAL CIRCUIT RESTORATION MATRIX",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "15px",
                color: UITheme.colors.solarGoldStr,
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
            "DANGER 480V: Connect Main Generator to all 3 Life Support Terminals. Route current through Step-Down Transformers to prevent Overload trips!",
            {
                fontFamily: UITheme.fonts.body,
                fontSize: "11.5px",
                color: UITheme.colors.textSecondary
            }
        );
        this.container.add(subheader);

        // PCB Circuit Layer Graphics
        this.boardTraceGraphics = this.scene.add.graphics();
        this.currentPulseGraphics = this.scene.add.graphics();
        this.container.add([this.boardTraceGraphics, this.currentPulseGraphics]);

        // Power Source Infeed (Left side: cx - 340, cy - 20)
        this.createPowerSourceNode(cx - 320, cy - 10);

        // Switches & Transformers (Center grid)
        this.createCircuitTopology(cx, cy);

        // Destination Terminals (Right side)
        this.createDestinationTerminals(cx + 310, cy - 10);

        // Bottom Breaker Status Banner
        const hudY = cy + frameH / 2 - 48;
        const hudBg = this.scene.add.graphics();
        hudBg.fillStyle(0x060E1A, 0.95);
        hudBg.fillRoundedRect(cx - frameW / 2 + 28, hudY - 24, frameW - 56, 48, 8);
        hudBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        hudBg.strokeRoundedRect(cx - frameW / 2 + 28, hudY - 24, frameW - 56, 48, 8);
        this.container.add(hudBg);

        this.breakerAlertText = this.scene.add.text(
            cx - frameW / 2 + 48,
            hudY,
            "GRID STATUS: ⚠ BROWNOUT · CRITICAL EQUIPMENT UNPOWERED · RELAY COILS OPEN",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: UITheme.colors.emergencyRedStr,
                fontStyle: "bold"
            }
        ).setOrigin(0, 0.5);
        this.container.add(this.breakerAlertText);

        // Breaker Reset Button (Active only when tripped)
        this.breakerResetBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: cx + frameW / 2 - 120,
            y: hudY,
            width: 160,
            height: 32,
            text: "RESET BREAKER ⚡",
            fontSize: "11px",
            primaryColor: UITheme.colors.emergencyRed,
            onClick: () => this.resetBreaker()
        });
        this.breakerResetBtn.setVisible(false);
        this.container.add(this.breakerResetBtn);

        // Live Grid Load Text
        this.livePowerGaugeText = this.scene.add.text(
            cx + frameW / 2 - 48,
            headerY,
            "GRID LOAD: 0 / 47 kW",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: UITheme.colors.primaryCyanStr,
                fontStyle: "bold"
            }
        ).setOrigin(1, 0.5);
        this.container.add(this.livePowerGaugeText);

        // Wait for the first renderer pass before changing text styles. Phaser
        // 4 can leave a newly-created text texture uninitialized in WebGL.
        this.scene.time.delayedCall(0, () => {
            if (!this.isClosed) this.evaluateCircuit();
        });
    }

    private createPowerSourceNode(x: number, y: number) {
        const c = this.scene.add.container(x, y);

        const box = this.scene.add.graphics();
        box.fillStyle(0x112842, 1);
        box.fillRoundedRect(-55, -80, 110, 160, 10);
        box.lineStyle(2, UITheme.colors.solarGold, 1);
        box.strokeRoundedRect(-55, -80, 110, 160, 10);
        c.add(box);

        const icon = this.scene.add.text(0, -50, "⚡", {
            fontSize: "26px"
        }).setOrigin(0.5);
        const name = this.scene.add.text(0, -18, "KILOPOWER\nFISSION BUS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.solarGoldStr,
            align: "center",
            fontStyle: "bold"
        }).setOrigin(0.5);
        const voltage = this.scene.add.text(0, 24, "480V DC\nACTIVE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.bioGreenStr,
            align: "center",
            fontStyle: "bold"
        }).setOrigin(0.5);
        const outPin = this.scene.add.circle(55, 0, 7, UITheme.colors.solarGold);
        c.add([icon, name, voltage, outPin]);

        this.container.add(c);
    }

    private createCircuitTopology(cx: number, cy: number) {
        // Switch 1: Main Infeed Branch Selector (Routes to Upper / Lower Bus)
        this.createSwitch("sw_main", "MAIN FEED (SW-01)", cx - 180, cy - 80, true);
        this.createSwitch("sw_aux", "AUXILIARY (SW-02)", cx - 180, cy + 60, false);

        // Transformers (Step-Down 480V -> 28V)
        this.createTransformer("xfmr_eclss", "TR-01 (ECLSS)", "480V➔28V", cx - 30, cy - 120, false);
        this.createTransformer("xfmr_heaters", "TR-02 (THERMAL)", "480V➔28V", cx - 30, cy - 10, true);
        this.createTransformer("xfmr_turbine", "TR-03 (TURBINE)", "480V➔28V", cx - 30, cy + 100, false);

        // Secondary Distribution Switches
        this.createSwitch("sw_eclss", "O₂ BUS (SW-03)", cx + 130, cy - 120, false);
        this.createSwitch("sw_heaters", "HEAT BUS (SW-04)", cx + 130, cy - 10, false);
        this.createSwitch("sw_turbine", "TURBINE (SW-05)", cx + 130, cy + 100, true);
    }

    private createSwitch(id: string, label: string, x: number, y: number, initialClosed: boolean) {
        const c = this.scene.add.container(x, y);

        const plate = this.scene.add.graphics();
        plate.fillStyle(0x0C1E33, 1);
        plate.fillRoundedRect(-50, -25, 100, 50, 6);
        plate.lineStyle(1.5, UITheme.colors.panelBorder, 1);
        plate.strokeRoundedRect(-50, -25, 100, 50, 6);
        c.add(plate);

        const switchGraphics = this.scene.add.graphics();
        c.add(switchGraphics);

        const led = this.scene.add.circle(-36, 0, 4, initialClosed ? UITheme.colors.bioGreen : 0x4A607F);
        c.add(led);

        const txt = this.scene.add.text(8, 0, label, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);
        c.add(txt);

        c.setSize(100, 50);
        c.setInteractive({ useHandCursor: true });

        const swData: CircuitSwitch = {
            id,
            label,
            x,
            y,
            isClosed: initialClosed,
            container: c,
            switchGraphics,
            led
        };

        this.drawSwitchKnob(swData);

        c.on("pointerdown", () => {
            if (this.isSolved || this.isBreakerTripped) return;
            SoundFX.playClick();
            swData.isClosed = !swData.isClosed;
            this.drawSwitchKnob(swData);
            this.evaluateCircuit();
        });

        this.switches.push(swData);
        this.container.add(c);
    }

    private drawSwitchKnob(sw: CircuitSwitch) {
        sw.switchGraphics.clear();
        sw.led.setFillStyle(sw.isClosed ? UITheme.colors.bioGreen : 0x4A607F);

        // Draw bridge contact
        sw.switchGraphics.lineStyle(3, sw.isClosed ? UITheme.colors.bioGreen : 0x6E85A3, 1);
        if (sw.isClosed) {
            sw.switchGraphics.lineBetween(-22, 0, -6, 0);
        } else {
            // Open angle 45 deg
            sw.switchGraphics.lineBetween(-22, 0, -10, -10);
        }
    }

    private createTransformer(id: string, label: string, ratio: string, x: number, y: number, initialActive: boolean) {
        const c = this.scene.add.container(x, y);

        const boxGraphics = this.scene.add.graphics();
        c.add(boxGraphics);

        const txt = this.scene.add.text(0, -10, label, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9.5px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        const statusText = this.scene.add.text(0, 10, `${ratio}\n${initialActive ? "ENGAGED" : "BYPASSED"}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "8.5px",
            color: initialActive ? UITheme.colors.bioGreenStr : UITheme.colors.emergencyRedStr,
            align: "center",
            fontStyle: "bold"
        }).setOrigin(0.5);
        c.add([txt, statusText]);

        c.setSize(90, 56);
        c.setInteractive({ useHandCursor: true });

        const xfmrData: TransformerRelay = {
            id,
            label,
            x,
            y,
            stepRatio: ratio,
            isActive: initialActive,
            container: c,
            boxGraphics,
            statusText
        };

        this.drawTransformerBox(xfmrData);

        c.on("pointerdown", () => {
            if (this.isSolved || this.isBreakerTripped) return;
            SoundFX.playClick();
            xfmrData.isActive = !xfmrData.isActive;
            this.drawTransformerBox(xfmrData);
            this.evaluateCircuit();
        });

        this.relays.push(xfmrData);
        this.container.add(c);
    }

    private drawTransformerBox(tr: TransformerRelay) {
        tr.boxGraphics.clear();
        tr.boxGraphics.fillStyle(0x0E243A, 1);
        tr.boxGraphics.fillRoundedRect(-45, -28, 90, 56, 8);
        tr.boxGraphics.lineStyle(2, tr.isActive ? UITheme.colors.primaryCyan : 0x5C3830, 1);
        tr.boxGraphics.strokeRoundedRect(-45, -28, 90, 56, 8);

        tr.statusText.setText(`${tr.stepRatio}\n${tr.isActive ? "ENGAGED" : "BYPASS"}`);
        tr.statusText.setColor(tr.isActive ? UITheme.colors.bioGreenStr : UITheme.colors.marsAmberStr);
    }

    private createDestinationTerminals(x: number, y: number) {
        const specs = [
            { id: "term_eclss", name: "ECLSS O₂ SCRUBBERS", kw: 15, offsetY: -120 },
            { id: "term_heaters", name: "HABITAT RADIATOR HEAT", kw: 18, offsetY: -10 },
            { id: "term_turbine", name: "PRESSURE COMPRESSOR", kw: 14, offsetY: 100 }
        ];

        for (const spec of specs) {
            const c = this.scene.add.container(x, y + spec.offsetY);

            const bg = this.scene.add.graphics();
            bg.fillStyle(0x0C2238, 1);
            bg.fillRoundedRect(-60, -32, 120, 64, 8);
            bg.lineStyle(1.5, UITheme.colors.panelBorder, 1);
            bg.strokeRoundedRect(-60, -32, 120, 64, 8);
            c.add(bg);

            const statusGlow = this.scene.add.graphics();
            c.add(statusGlow);

            const title = this.scene.add.text(0, -14, spec.name, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "8.5px",
                color: "#FFFFFF",
                align: "center",
                fontStyle: "bold"
            }).setOrigin(0.5);

            const statusLabel = this.scene.add.text(0, 12, `UNPOWERED (${spec.kw} kW)`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "8px",
                color: UITheme.colors.emergencyRedStr,
                fontStyle: "bold"
            }).setOrigin(0.5);
            c.add([title, statusLabel]);

            const termData: CircuitTerminal = {
                id: spec.id,
                name: spec.name,
                loadKw: spec.kw,
                x,
                y: y + spec.offsetY,
                isEnergized: false,
                container: c,
                statusGlow,
                statusLabel
            };

            this.terminals.push(termData);
            this.container.add(c);
        }
    }

    /**
     * Evaluates circuit matrix:
     * - Checks conductive path from Power Source through switches and transformers to terminals.
     * - Checks for OVERLOAD condition (e.g. bypassing transformer sends dangerous surge to terminal).
     */
    private evaluateCircuit() {
        if (this.isBreakerTripped) return;

        const swMain = this.switches.find(s => s.id === "sw_main")?.isClosed ?? false;
        const swAux = this.switches.find(s => s.id === "sw_aux")?.isClosed ?? false;

        const swEclss = this.switches.find(s => s.id === "sw_eclss")?.isClosed ?? false;
        const swHeaters = this.switches.find(s => s.id === "sw_heaters")?.isClosed ?? false;
        const swTurbine = this.switches.find(s => s.id === "sw_turbine")?.isClosed ?? false;

        const trEclss = this.relays.find(r => r.id === "xfmr_eclss")?.isActive ?? false;
        const trHeaters = this.relays.find(r => r.id === "xfmr_heaters")?.isActive ?? false;
        const trTurbine = this.relays.find(r => r.id === "xfmr_turbine")?.isActive ?? false;

        // Terminal connections
        // Terminal ECLSS receives current if swMain AND swEclss are closed
        const eclssConnected = swMain && swEclss;
        // Terminal Heaters receives current if (swMain OR swAux) AND swHeaters
        const heatersConnected = (swMain || swAux) && swHeaters;
        // Terminal Turbine receives current if swAux AND swTurbine
        const turbineConnected = swAux && swTurbine;

        // Overload Check: If a terminal is connected but its transformer is BYPASSED (raw 480V spike)
        const eclssOverload = eclssConnected && !trEclss;
        const heatersOverload = heatersConnected && !trHeaters;
        const turbineOverload = turbineConnected && !trTurbine;

        if (eclssOverload || heatersOverload || turbineOverload) {
            this.triggerBreakerTrip("⚡ CIRCUIT OVERLOAD: RAW 480V SURGE! TRANSFORMER STEP-DOWN MUST BE ENGAGED!");
            return;
        }

        // Safe Energization
        const tEclss = this.terminals.find(t => t.id === "term_eclss")!;
        const tHeaters = this.terminals.find(t => t.id === "term_heaters")!;
        const tTurbine = this.terminals.find(t => t.id === "term_turbine")!;

        tEclss.isEnergized = eclssConnected && trEclss;
        tHeaters.isEnergized = heatersConnected && trHeaters;
        tTurbine.isEnergized = turbineConnected && trTurbine;

        let totalKw = 0;
        for (const t of this.terminals) {
            this.updateTerminalVisuals(t);
            if (t.isEnergized) totalKw += t.loadKw;
        }

        this.livePowerGaugeText.setText(`GRID LOAD: ${totalKw} / 47 kW`);

        // Draw live wiring traces
        this.renderTraces(swMain, swAux, swEclss, swHeaters, swTurbine);

        // Check Victory
        const allPowered = tEclss.isEnergized && tHeaters.isEnergized && tTurbine.isEnergized;
        if (allPowered && !this.isSolved) {
            this.handleSolveSuccess();
        } else {
            const poweredCount = (tEclss.isEnergized ? 1 : 0) + (tHeaters.isEnergized ? 1 : 0) + (tTurbine.isEnergized ? 1 : 0);
            this.breakerAlertText.setText(`GRID STATUS: OPERATING ${poweredCount} / 3 LIFE SUPPORT BUSES (${totalKw} kW LOAD)`);
            this.breakerAlertText.setColor(poweredCount > 0 ? UITheme.colors.solarGoldStr : UITheme.colors.emergencyRedStr);
        }
    }

    private triggerBreakerTrip(msg: string) {
        this.isBreakerTripped = true;
        SoundFX.playAlert();

        this.scene.cameras.main.flash(300, 255, 23, 68, false);

        for (const t of this.terminals) {
            t.isEnergized = false;
            this.updateTerminalVisuals(t);
        }

        this.breakerAlertText.setText(`⚠ ${msg}`);
        this.breakerAlertText.setColor(UITheme.colors.emergencyRedStr);
        this.breakerResetBtn.setVisible(true);
        this.livePowerGaugeText.setText("GRID LOAD: TRIP (0 kW)");
    }

    private resetBreaker() {
        SoundFX.playClick();
        this.isBreakerTripped = false;
        this.breakerResetBtn.setVisible(false);
        this.breakerAlertText.setText("BREAKER RESET. RE-ESTABLISHING CIRCUIT...");
        this.breakerAlertText.setColor(UITheme.colors.solarGoldStr);

        this.evaluateCircuit();
    }

    private updateTerminalVisuals(term: CircuitTerminal) {
        term.statusGlow.clear();
        if (term.isEnergized) {
            term.statusGlow.lineStyle(2, UITheme.colors.bioGreen, 1);
            term.statusGlow.strokeRoundedRect(-60, -32, 120, 64, 8);
            term.statusLabel.setText(`ONLINE (${term.loadKw} kW) ✔`);
            term.statusLabel.setColor(UITheme.colors.bioGreenStr);
        } else {
            term.statusLabel.setText(`UNPOWERED (${term.loadKw} kW)`);
            term.statusLabel.setColor(UITheme.colors.emergencyRedStr);
        }
    }

    private renderTraces(
        swMain: boolean,
        swAux: boolean,
        swEclss: boolean,
        swHeaters: boolean,
        swTurbine: boolean
    ) {
        this.boardTraceGraphics.clear();
        this.currentPulseGraphics.clear();

        const { width, height } = this.scene.scale;
        const cx = width / 2;
        const cy = height / 2;

        const srcX = cx - 320 + 55;
        const srcY = cy - 10;

        // Base Copper Traces
        this.boardTraceGraphics.lineStyle(4, 0x1B3552, 1);

        // Trace from Source to Switch 1 & 2
        this.boardTraceGraphics.lineBetween(srcX, srcY, cx - 180 - 50, cy - 80);
        this.boardTraceGraphics.lineBetween(srcX, srcY, cx - 180 - 50, cy + 60);

        // Traces from Switches to Transformers
        this.boardTraceGraphics.lineBetween(cx - 180 + 50, cy - 80, cx - 30 - 45, cy - 120);
        this.boardTraceGraphics.lineBetween(cx - 180 + 50, cy - 80, cx - 30 - 45, cy - 10);
        this.boardTraceGraphics.lineBetween(cx - 180 + 50, cy + 60, cx - 30 - 45, cy - 10);
        this.boardTraceGraphics.lineBetween(cx - 180 + 50, cy + 60, cx - 30 - 45, cy + 100);

        // Traces from Transformers to Sub Switches
        this.boardTraceGraphics.lineBetween(cx - 30 + 45, cy - 120, cx + 130 - 50, cy - 120);
        this.boardTraceGraphics.lineBetween(cx - 30 + 45, cy - 10, cx + 130 - 50, cy - 10);
        this.boardTraceGraphics.lineBetween(cx - 30 + 45, cy + 100, cx + 130 - 50, cy + 100);

        // Traces from Sub Switches to Terminals
        this.boardTraceGraphics.lineBetween(cx + 130 + 50, cy - 120, cx + 310 - 60, cy - 120);
        this.boardTraceGraphics.lineBetween(cx + 130 + 50, cy - 10, cx + 310 - 60, cy - 10);
        this.boardTraceGraphics.lineBetween(cx + 130 + 50, cy + 100, cx + 310 - 60, cy + 100);

        // Glowing live current lines
        this.currentPulseGraphics.lineStyle(2.5, UITheme.colors.solarGold, 0.95);
        if (!this.isBreakerTripped) {
            if (swMain) {
                this.currentPulseGraphics.lineBetween(srcX, srcY, cx - 180 - 50, cy - 80);
            }
            if (swAux) {
                this.currentPulseGraphics.lineBetween(srcX, srcY, cx - 180 - 50, cy + 60);
            }
            if (swMain && swEclss) {
                this.currentPulseGraphics.lineBetween(cx + 130 + 50, cy - 120, cx + 310 - 60, cy - 120);
            }
            if ((swMain || swAux) && swHeaters) {
                this.currentPulseGraphics.lineBetween(cx + 130 + 50, cy - 10, cx + 310 - 60, cy - 10);
            }
            if (swAux && swTurbine) {
                this.currentPulseGraphics.lineBetween(cx + 130 + 50, cy + 100, cx + 310 - 60, cy + 100);
            }
        }
    }

    private handleSolveSuccess() {
        this.isSolved = true;
        SoundFX.playToggle(true);

        this.breakerAlertText.setText("✔ ALL 3 LIFE SUPPORT BUSES RESTORED! ELECTRICAL GRID OPERATIONAL (52 kW)");
        this.breakerAlertText.setColor(UITheme.colors.bioGreenStr);

        this.scene.cameras.main.flash(400, 255, 214, 0, false);

        this.completionTimer = this.scene.time.delayedCall(1600, () => {
            if (this.isClosed) return;
            this.callbacks.onComplete();
            this.close();
        });
    }

    public close() {
        if (this.isClosed) return;
        this.isClosed = true;
        this.completionTimer?.destroy();
        this.completionTimer = undefined;
        this.container.destroy();
        this.callbacks.onClose();
    }
}

export default CircuitPuzzle;
