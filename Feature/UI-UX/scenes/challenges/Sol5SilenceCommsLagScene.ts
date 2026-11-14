import UITheme from "../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

export class Sol5SilenceCommsLagScene extends SolChallengeBaseScene {
    private commandQueue: string[] = [];
    private slotTexts: Phaser.GameObjects.Text[] = [];

    constructor() {
        super("Sol5SilenceCommsLagScene", {
            solNumber: 5,
            title: "SOL 5: THE 12-MINUTE SILENCE",
            codename: "SOLAR STORM & AUTONOMOUS ROVER BUFFER",
            hazardBadge: "CME PROTON STORM (+85 mSv) & 12-MIN COMMS LAG",
            briefing: "NASA DONKI space weather detects an X-class solar flare hurtling high-energy protons toward Mars. Because radio waves take 12 minutes one-way to reach Mars, Houston cannot joystick the rover in real-time. Pre-program and queue an autonomous command buffer before the comms blackout hits!",
            nasaFact: "Radio signals traveling at the speed of light take 4 to 24 minutes between Earth and Mars depending on orbital geometry. Mars rovers must parse and execute multi-step drive sequences completely autonomously.",
            primaryTarget: "Queue 3 autonomous rover actions & shelter crew in storm bunker.",
            unit: "Commands",
            targetVal: 3,
            initialVal: 0
        });
    }

    protected createChallengeContent() {
        const frameX = (this.W - 1220) / 2;
        const frameY = (this.H - 660) / 2;
        const topY = frameY + 70;
        const colW = 575;
        const colH = 505;

        // -------------------------------------------------------------
        // LEFT COLUMN: DEEP SPACE 12-MINUTE COMMS GAP VISUALIZER
        // -------------------------------------------------------------
        const leftX = frameX + 24;
        const leftBg = this.add.graphics();
        leftBg.fillStyle(UITheme.colors.cardBg, 0.9);
        leftBg.fillRoundedRect(leftX, topY, colW, colH, 12);
        leftBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        leftBg.strokeRoundedRect(leftX, topY, colW, colH, 12);

        this.add.text(leftX + 24, topY + 18, "EARTH-MARS ORBITAL TELEMETRY GAP", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });

        // Orbital Diagram Box
        const viewW = colW - 48;
        const viewH = 240;
        const viewX = leftX + 24;
        const viewY = topY + 50;

        const viewBg = this.add.graphics();
        viewBg.fillStyle(0x060F1F, 1);
        viewBg.fillRoundedRect(viewX, viewY, viewW, viewH, 10);
        viewBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
        viewBg.strokeRoundedRect(viewX, viewY, viewW, viewH, 10);

        // Earth (Left)
        const earth = this.add.circle(viewX + 60, viewY + viewH / 2, 28, 0x1E88E5);
        earth.setStrokeStyle(2, 0x64B5F6, 1);
        this.add.text(viewX + 60, viewY + viewH / 2 + 40, "EARTH\n(HOUSTON)", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#64B5F6",
            align: "center",
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Mars (Right)
        const mars = this.add.circle(viewX + viewW - 60, viewY + viewH / 2, 22, 0xE53935);
        mars.setStrokeStyle(2, 0xFF7043, 1);
        this.add.text(viewX + viewW - 60, viewY + viewH / 2 + 40, "MARS\n(OUTPOST SOL)", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#FF8A65",
            align: "center",
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Radio Wave Line between Earth and Mars
        const wave = this.add.graphics();
        wave.lineStyle(2, UITheme.colors.solarGold, 0.8);
        wave.lineBetween(viewX + 95, viewY + viewH / 2, viewX + viewW - 90, viewY + viewH / 2);

        // Signal Pulse Tween
        const pulse = this.add.circle(viewX + 100, viewY + viewH / 2, 6, UITheme.colors.primaryCyan);
        this.tweens.add({
            targets: pulse,
            x: viewX + viewW - 95,
            duration: 2000,
            repeat: -1,
            ease: "Linear"
        });

        // Geometry Mask for orbital space
        const viewMaskG = this.make.graphics();
        viewMaskG.fillStyle(0xffffff);
        viewMaskG.fillRoundedRect(viewX, viewY, viewW, viewH, 10);
        const viewMask = viewMaskG.createGeometryMask();
        wave.setMask(viewMask);
        pulse.setMask(viewMask);

        // Delay Badge
        this.add.text(viewX + viewW / 2, viewY + viewH / 2 - 25, "📡 SPEED-OF-LIGHT LATENCY: 12m 00s (210,000,000 km)", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        // Telemetry Box
        const statBoxY = topY + 310;
        const statBox = this.add.graphics();
        statBox.fillStyle(0x081528, 0.95);
        statBox.fillRoundedRect(leftX + 24, statBoxY, colW - 48, 170, 10);
        statBox.lineStyle(1.5, UITheme.colors.primaryCyan, 0.8);
        statBox.strokeRoundedRect(leftX + 24, statBoxY, colW - 48, 170, 10);

        this.add.text(leftX + 44, statBoxY + 16, "⚡ DONKI SPACE WEATHER ALERT: CME PROTON SHOCK", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold"
        });

        this.add.text(leftX + 44, statBoxY + 42, "CME IMPACT: T-MINUS 15 MIN  |  AUTONOMY MODE: MANDATORY", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });

        this.add.text(leftX + 44, statBoxY + 82, this.challengeConfig.nasaFact, {
            fontFamily: UITheme.fonts.body,
            fontSize: "12.5px",
            color: UITheme.colors.textSecondary,
            lineSpacing: 4,
            wordWrap: { width: colW - 88 }
        });

        // -------------------------------------------------------------
        // RIGHT COLUMN: AUTONOMOUS COMMAND BUFFER PROGRAMMER
        // -------------------------------------------------------------
        const rightX = leftX + colW + 22;
        const rightBg = this.add.graphics();
        rightBg.fillStyle(UITheme.colors.cardBg, 0.9);
        rightBg.fillRoundedRect(rightX, topY, colW, colH, 12);
        rightBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
        rightBg.strokeRoundedRect(rightX, topY, colW, colH, 12);

        this.add.text(rightX + 24, topY + 18, "AUTONOMOUS ROVER COMMAND QUEUE (3 SLOTS)", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            color: "#FFFFFF",
            fontStyle: "bold"
        });

        // 3 Command Slot Boxes
        const slotW = colW - 48;
        const slotH = 40;
        const startSlotY = topY + 50;

        for (let i = 0; i < 3; i++) {
            const slotBg = this.add.graphics();
            slotBg.fillStyle(0x061224, 0.95);
            slotBg.fillRoundedRect(rightX + 24, startSlotY + i * 48, slotW, slotH, 6);
            slotBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
            slotBg.strokeRoundedRect(rightX + 24, startSlotY + i * 48, slotW, slotH, 6);

            const label = this.add.text(rightX + 40, startSlotY + i * 48 + 12, `SLOT ${i + 1}: [ EMPTY BUFFER ]`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "12px",
                color: "#7E94B5",
                fontStyle: "bold"
            });
            this.slotTexts.push(label);
        }

        // Action Buttons to Queue Commands
        const btnY = topY + 200;

        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 20,
            width: colW - 48,
            height: 44,
            fontSize: "13px",
            text: "QUEUE: DRIVE TO REGOLITH BUNKER",
            primaryColor: UITheme.colors.primaryCyan,
            onClick: () => {
                SoundFX.playClick();
                this.addCommand("DRIVE TO REGOLITH RADIATION BUNKER");
            }
        });

        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 72,
            width: colW - 48,
            height: 44,
            fontSize: "13px",
            text: "QUEUE: ENGAGE LOW-POWER SLEEP & MAST HEATER",
            primaryColor: UITheme.colors.marsAmber,
            onClick: () => {
                SoundFX.playClick();
                this.addCommand("ENGAGE LOW-POWER SLEEP & MAST HEATER");
            }
        });

        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 124,
            width: colW - 48,
            height: 44,
            fontSize: "13px",
            text: "QUEUE: SHELTER CREW IN SUB-SURFACE VAULT",
            primaryColor: UITheme.colors.bioGreen,
            onClick: () => {
                SoundFX.playClick();
                this.addCommand("SHELTER CREW IN SUB-SURFACE VAULT");
            }
        });

        ButtonFactory.createButton({
            scene: this,
            x: rightX + colW / 2,
            y: btnY + 176,
            width: colW - 48,
            height: 40,
            fontSize: "12px",
            text: "CLEAR COMMAND BUFFER",
            primaryColor: UITheme.colors.cardHover,
            onClick: () => {
                SoundFX.playClick();
                this.clearBuffer();
            }
        });

        // Instructions
        this.add.text(rightX + 24, topY + 440, "✦ Commands will execute autonomously once transmitted to the rover.", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
    }

    protected isTargetMet(): boolean {
        return this.commandQueue.length >= 3;
    }

    private addCommand(cmd: string) {
        if (this.commandQueue.length >= 3) {
            this.setActionFeedback("Command buffer full (3/3). Clear buffer to re-program.", false);
            return;
        }

        this.commandQueue.push(cmd);
        this.currentVal = this.commandQueue.length;
        const idx = this.commandQueue.length - 1;
        this.slotTexts[idx].setText(`SLOT ${idx + 1}: ✔ ${cmd}`);
        this.slotTexts[idx].setColor(UITheme.colors.bioGreenStr);

        if (this.commandQueue.length === 3) {
            this.setActionFeedback("✔ AUTONOMOUS COMMAND BUFFER READY! 3/3 ACTIONS VALIDATED.", true);
        } else {
            this.setActionFeedback(`Queued: ${cmd} (${this.commandQueue.length}/3 slots filled).`, true);
        }
    }

    private clearBuffer() {
        this.commandQueue = [];
        this.currentVal = 0;
        this.slotTexts.forEach((text, i) => {
            text.setText(`SLOT ${i + 1}: [ EMPTY BUFFER ]`);
            text.setColor("#7E94B5");
        });
        this.setActionFeedback("Command queue cleared. Buffer ready for instructions.", false);
    }
}

export default Sol5SilenceCommsLagScene;
