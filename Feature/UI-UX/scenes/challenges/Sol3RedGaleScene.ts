import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

type MissionStage = "INTRO" | "PHASE1_RELAY" | "PHASE2_ROVER" | "PHASE3_TRANSMIT" | "QUIZ" | "COMPLETE";
type RoverCommand = "FORWARD" | "LEFT" | "RIGHT" | "STOP" | "CAPTURE" | "SAMPLE";
type Direction = 0 | 1 | 2 | 3; // 0 = North, 1 = East, 2 = South, 3 = West

interface RelaySatellite {
    id: string;
    name: string;
    orbit: string;
    signalBars: number;
    delaySeconds: number;
    windowSeconds: number;
    bandwidthCapMb: number;
    summary: string;
}

interface DataPacket {
    id: string;
    title: string;
    sizeMb: number;
    isCritical: boolean;
    selected: boolean;
}

interface QuizItem {
    question: string;
    options: string[];
    correctIndex: number;
    explanation: string;
}

const GRID_COLS = 7;
const GRID_ROWS = 5;
const MAX_QUEUE_LEN = 5;

const RELAY_SATELLITES: RelaySatellite[] = [
    {
        id: "mro",
        name: "MRO ORBITER (HIGH-GAIN)",
        orbit: "255 × 320 km Polar",
        signalBars: 5,
        delaySeconds: 1.4,
        windowSeconds: 45,
        bandwidthCapMb: 120,
        summary: "Strongest Ka-band link directly above Jezero-Syrtis Canyon."
    },
    {
        id: "maven",
        name: "MAVEN RELAY",
        orbit: "150 × 6,200 km Elliptical",
        signalBars: 4,
        delaySeconds: 2.2,
        windowSeconds: 36,
        bandwidthCapMb: 95,
        summary: "Reliable UHF relay coverage with moderate light-time latency."
    },
    {
        id: "tgo",
        name: "TRACE GAS ORBITER",
        orbit: "400 km Circular",
        signalBars: 3,
        delaySeconds: 3.0,
        windowSeconds: 28,
        bandwidthCapMb: 75,
        summary: "Low-horizon pass with tighter bandwidth and shorter window."
    }
];

const QUIZ_ITEMS: QuizItem[] = [
    {
        question: "1. Why can't astronauts steer a Mars rover live with a handheld joystick?",
        options: [
            "Radio waves travel at the speed of light, creating minutes of delay across millions of kilometers",
            "Mars has no atmosphere for radio signals",
            "Rovers can only drive in straight lines"
        ],
        correctIndex: 0,
        explanation: "Radio signals move at light speed (~300,000 km/s), which still takes 4 to 24 minutes between Earth and Mars—so teams upload pre-planned command queues!"
    },
    {
        question: "2. How does an orbital relay satellite help a rover inside a deep Martian canyon?",
        options: [
            "It carries solar panels down to the surface",
            "It receives low-power signals from overhead and relays them strongly to the Mars Outpost and Earth",
            "It clears rocks out of the canyon path"
        ],
        correctIndex: 1,
        explanation: "Canyon walls block low-angle transmissions; an overhead orbiter has clear line-of-sight and high-gain antennas to relay data reliably."
    },
    {
        question: "3. During a short orbital pass with a strict megabyte cap, which data should you transmit first?",
        options: [
            "High-priority mineral spectra and canyon target imagery",
            "Duplicate navigation thumbnails and routine heater logs",
            "Wait until the satellite disappears below the horizon"
        ],
        correctIndex: 0,
        explanation: "Communication windows close quickly as orbiters move overhead, so prioritizing critical scientific findings ensures key discoveries arrive safely."
    }
];

export class Sol3RedGaleScene extends SolChallengeBaseScene {
    private stage: MissionStage = "INTRO";

    // Phase 1: Orbital Relay & Signal Delay
    private selectedRelay: RelaySatellite = RELAY_SATELLITES[0];
    private relayLinked = false;
    private initialPacketSent = false;
    private signalStrengthPct = 0;

    // Phase 2: 2D Top-Down Canyon Navigation & Command Queue
    // 0 = Safe Regolith, 1 = Boulder Obstacle, 2 = Unsafe Crater Slope, 3 = Sample Site A, 4 = Sample Site B, 5 = Extraction Destination
    private readonly canyonGrid: number[][] = [
        [0, 0, 1, 0, 0, 2, 0],
        [0, 3, 0, 0, 1, 0, 0],
        [0, 1, 0, 2, 0, 4, 0],
        [0, 0, 0, 1, 0, 0, 5],
        [2, 0, 0, 0, 0, 1, 0]
    ];
    private roverCol = 0;
    private roverRow = 0;
    private roverDir: Direction = 1; // Facing East
    private commandQueue: RoverCommand[] = [];
    private controlsLocked = false;
    private imagesCaptured = 0;
    private samplesCollected: string[] = [];
    private destinationReached = false;

    // Phase 3: Scientific Data Transmission
    private packets: DataPacket[] = [];
    private windowTimeRemaining = 45;
    private windowTimer?: Phaser.Time.TimerEvent;
    private packetsDelivered = 0;
    private windowsUsed = 1;
    private dataDelivered = false;

    // Adaptive Mistake Detection & Dialogue
    private mistakeCount = 0;
    private mistakesCorrected = 0;
    private activeSpeaker: "Commander Maya" | "Bleep" = "Commander Maya";
    private activeDialogue = "";

    // Quiz & Scoring
    private quizIndex = 0;
    private quizScore = 0;
    private quizAnswered = false;
    private quizFeedback = "";

    // UI Containers
    private uiLayer!: Phaser.GameObjects.Container;
    private speakerLabel!: Phaser.GameObjects.Text;
    private dialogueBody!: Phaser.GameObjects.Text;

    constructor() {
        super("Sol3RedGaleScene", {
            solNumber: 3,
            title: "SOL 3: ECHOES FROM MARS",
            codename: "THE SIGNAL MISSION",
            hazardBadge: "INTERPLANETARY LIGHT-SPEED SIGNAL DELAY",
            briefing: "Our rover is exploring a deep Martian canyon! Link to an orbital relay satellite, queue autonomous rover commands across light-speed delay, collect geological samples, and transmit prioritized data back to the outpost.",
            nasaFact: "Radio waves travel at the speed of light, yet Mars is so far from Earth that one-way signals take 4 to 24 minutes. NASA rovers rely on orbital relays and autonomous command sequences!",
            primaryTarget: "Link orbital relay, navigate canyon to sample & beacon, and transmit science data.",
            unit: "Stages",
            targetVal: 3,
            initialVal: 0
        });
    }

    protected createChallengeContent() {
        this.resetMissionState();

        // Deep space & Mars-red canyon backdrop
        this.createMartianSurfaceBase(0x07142b, 0xc85532, 0x6f291e);

        // Starry upper sky overlay
        const stars = this.add.graphics().setDepth(-14);
        stars.fillStyle(0xd8f5ff, 0.8);
        for (let i = 0; i < 55; i++) {
            stars.fillCircle((i * 197) % this.W, (i * 73) % Math.round(this.H * 0.36), i % 4 === 0 ? 1.8 : 1);
        }

        // The shared visor HUD owns the mission title and progress area. Keep
        // Sol 3 controls in the reserved top-right space beside it.
        const fsBtn = ButtonFactory.createButton({
            scene: this,
            x: this.W - 182,
            y: 43,
            text: "⛶ FULLSCREEN",
            width: 110,
            height: 36,
            primaryColor: 0x0e2f5c,
            secondaryColor: 0x00e5ff,
            fontSize: "11px",
            onClick: () => {
                SoundFX.playClick();
                if (this.scale.isFullscreen) this.scale.stopFullscreen();
                else this.scale.startFullscreen();
            }
        }).setDepth(22);
        this.add.existing(fsBtn);

        const closeBtn = ButtonFactory.createButton({
            scene: this,
            x: this.W - 62,
            y: 43,
            text: "✖ MARS BASE",
            width: 110,
            height: 36,
            primaryColor: 0x5c1926,
            secondaryColor: 0xff6b7a,
            fontSize: "11px",
            onClick: () => this.exitToMarsWorld()
        }).setDepth(22);
        this.add.existing(closeBtn);

        // Character dialogue sits between the mission content and the shared
        // bottom visor, so it cannot cover navigation controls.
        const diagY = this.H - 108;
        const diagCard = this.add.graphics().setDepth(20);
        diagCard.fillStyle(0x071a38, 0.97);
        diagCard.fillRoundedRect(16, diagY, this.W - 32, 44, 12);
        diagCard.lineStyle(2, 0x00e5ff, 0.9);
        diagCard.strokeRoundedRect(16, diagY, this.W - 32, 44, 12);

        this.speakerLabel = this.add.text(34, diagY + 12, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            fontStyle: "bold",
            color: "#FFD23F"
        }).setDepth(21);

        this.dialogueBody = this.add.text(190, diagY + 14, "", {
            fontFamily: UITheme.fonts.body,
            fontSize: "11px",
            color: "#FFFFFF",
            wordWrap: { width: this.W - 230 },
            maxLines: 2
        }).setDepth(21);

        this.uiLayer = this.add.container(0, 0).setDepth(15);
        this.setDialogue(
            "Commander Maya",
            "Our rover is investigating a rocky Martian canyon, but direct radio signals are blocked by canyon walls and delayed by distance!"
        );
        this.renderStage();
    }

    private resetMissionState() {
        this.stage = "INTRO";
        this.selectedRelay = RELAY_SATELLITES[0];
        this.relayLinked = false;
        this.initialPacketSent = false;
        this.signalStrengthPct = 0;

        this.roverCol = 0;
        this.roverRow = 0;
        this.roverDir = 1;
        this.commandQueue = [];
        this.controlsLocked = false;
        this.imagesCaptured = 0;
        this.samplesCollected = [];
        this.destinationReached = false;

        this.packets = [
            { id: "pkt_spectra", title: "Hematite & Silica Biosignature Spectra", sizeMb: 45, isCritical: true, selected: true },
            { id: "pkt_stereo", title: "High-Res Canyon Stratigraphy Panorama", sizeMb: 40, isCritical: true, selected: true },
            { id: "pkt_wheel", title: "Routine Wheel Actuator Temperature Log", sizeMb: 35, isCritical: false, selected: false },
            { id: "pkt_cache", title: "Duplicate Navcam Thumbnail Buffer", sizeMb: 30, isCritical: false, selected: false }
        ];
        this.windowTimeRemaining = 45;
        this.windowTimer?.remove();
        this.packetsDelivered = 0;
        this.windowsUsed = 1;
        this.dataDelivered = false;

        this.mistakeCount = 0;
        this.mistakesCorrected = 0;
        this.quizIndex = 0;
        this.quizScore = 0;
        this.quizAnswered = false;
        this.quizFeedback = "";

        this.updateVisorProgress(0, this.challengeConfig.targetVal, "Stages");
    }

    private setDialogue(speaker: "Commander Maya" | "Bleep", message: string) {
        this.activeSpeaker = speaker;
        this.activeDialogue = message;
        if (this.speakerLabel?.active) {
            this.speakerLabel.setText(speaker === "Commander Maya" ? "👩‍🚀 COMMANDER MAYA" : "🤖 BLEEP");
            this.speakerLabel.setColor(speaker === "Commander Maya" ? "#FFD23F" : "#6BE8FF");
        }
        if (this.dialogueBody?.active) {
            this.dialogueBody.setText(message);
        }
    }

    private handleMistake(bleepHint: string, mayaScience: string, guidedExample: string) {
        this.mistakeCount += 1;
        SoundFX.playAlert();
        if (this.mistakeCount === 1) {
            this.setDialogue("Bleep", `Bleep-boop! Quick hint: ${bleepHint}`);
        } else if (this.mistakeCount === 2) {
            this.setDialogue("Commander Maya", `Science Check: ${mayaScience}`);
        } else {
            this.setDialogue("Commander Maya", `Guided Example: ${guidedExample}`);
        }
    }

    private renderStage() {
        this.uiLayer.removeAll(true);

        switch (this.stage) {
            case "INTRO":
                this.renderIntroStage();
                break;
            case "PHASE1_RELAY":
                this.renderPhase1Relay();
                break;
            case "PHASE2_ROVER":
                this.renderPhase2Rover();
                break;
            case "PHASE3_TRANSMIT":
                this.renderPhase3Transmit();
                break;
            case "QUIZ":
                this.renderQuizStage();
                break;
            case "COMPLETE":
                this.renderCompleteStage();
                break;
        }
    }

    // =========================================================================
    // MISSION INTRODUCTION (Visual Diorama + Maya & Bleep + BEGIN MISSION)
    // =========================================================================
    private renderIntroStage() {
        const panelY = 86;
        const panelH = this.H - 206;
        const leftW = Math.round((this.W - 48) * 0.62);
        const rightX = 16 + leftW + 16;
        const rightW = this.W - rightX - 16;

        // Left Canyon Illustration Card
        const leftCard = this.add.graphics();
        leftCard.fillStyle(0x091d3e, 0.95);
        leftCard.fillRoundedRect(16, panelY, leftW, panelH, 14);
        leftCard.lineStyle(2, 0x00e5ff, 0.9);
        leftCard.strokeRoundedRect(16, panelY, leftW, panelH, 14);
        this.uiLayer.add(leftCard);

        // Mars planet in sky
        const planet = this.add.graphics();
        planet.fillStyle(0xc84c2b, 0.9);
        planet.fillCircle(16 + leftW * 0.72, panelY + 115, 76);
        planet.fillStyle(0xe26e3d, 0.5);
        planet.fillCircle(16 + leftW * 0.70, panelY + 100, 58);
        this.uiLayer.add(planet);

        // Canyon ridges & floor
        const canyon = this.add.graphics();
        canyon.fillStyle(0x7a3024, 0.95);
        canyon.fillRoundedRect(20, panelY + panelH - 165, leftW - 8, 161, { tl: 0, tr: 0, bl: 12, br: 12 });
        canyon.fillStyle(0xb54e2e, 1);
        canyon.fillRoundedRect(20, panelY + panelH - 110, leftW - 8, 106, { tl: 0, tr: 0, bl: 12, br: 12 });
        this.uiLayer.add(canyon);

        // Outpost sprite or fallback
        const outpostX = 16 + leftW * 0.82;
        const outpostY = panelY + panelH - 125;
        if (this.textures.exists("base-station")) {
            const baseImg = this.add.image(outpostX, outpostY, "base-station").setScale(0.32);
            this.uiLayer.add(baseImg);
        } else {
            const dome = this.add.graphics();
            dome.fillStyle(0xdce6f2, 1);
            dome.fillCircle(outpostX, outpostY, 34);
            this.uiLayer.add(dome);
        }

        // Rover sprite or fallback
        const roverX = 16 + leftW * 0.52;
        const roverY = panelY + panelH - 96;
        if (this.textures.exists("rover")) {
            const roverImg = this.add.image(roverX, roverY, "rover").setScale(0.38);
            this.uiLayer.add(roverImg);
        } else {
            const rv = this.add.graphics();
            rv.fillStyle(0xf59e2d, 1);
            rv.fillRoundedRect(roverX - 42, roverY - 18, 84, 30, 8);
            this.uiLayer.add(rv);
        }

        // Orbital Satellite + Animated Signal Waves
        const satX = 16 + leftW * 0.62;
        const satY = panelY + 95;
        const sat = this.add.text(satX, satY, "🛰️", { fontSize: "44px" }).setOrigin(0.5);
        this.uiLayer.add(sat);
        this.tweens.add({ targets: sat, y: satY - 8, duration: 1800, yoyo: true, repeat: -1 });

        const waves = this.add.graphics();
        waves.lineStyle(2.5, 0x00f0ff, 0.9);
        waves.lineBetween(roverX, roverY - 24, satX - 10, satY + 20);
        waves.lineBetween(satX + 12, satY + 20, outpostX, outpostY - 24);
        this.uiLayer.add(waves);
        this.tweens.add({ targets: waves, alpha: 0.3, duration: 900, yoyo: true, repeat: -1 });

        // Title Banner
        this.uiLayer.add(this.add.text(36, panelY + 18, "ECHOES FROM MARS", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "30px",
            fontStyle: "bold",
            color: "#FFD23F",
            stroke: "#101B33",
            strokeThickness: 4
        }));
        this.uiLayer.add(this.add.text(36, panelY + 54, "((( THE SIGNAL MISSION )))", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "14px",
            fontStyle: "bold",
            color: "#6BE8FF"
        }));

        // Commander Maya & Bleep Intro Dialogue Cards
        this.drawIntroCharacterCard(
            36,
            panelY + 86,
            "Commander Maya",
            0x00e5ff,
            "Our rover is in a rocky canyon! Let's link to the orbital relay, send the right commands, and collect valuable Mars samples!"
        );
        this.drawIntroCharacterCard(
            36,
            panelY + 196,
            "Bleep",
            0xb784ff,
            "Radio signals travel at the speed of light, but Mars is far away, so there's a delay. Plan your commands carefully!"
        );

        // Prominent BEGIN MISSION Button
        const beginBtn = ButtonFactory.createButton({
            scene: this,
            x: 16 + leftW * 0.64,
            y: panelY + panelH - 36,
            text: "▶  BEGIN MISSION  →",
            width: 310,
            height: 52,
            primaryColor: 0xff8c1a,
            secondaryColor: 0xffe066,
            textColor: "#141008",
            fontSize: "18px",
            onClick: () => {
                SoundFX.playClick();
                this.stage = "PHASE1_RELAY";
                this.setDialogue(
                    "Commander Maya",
                    "Phase 1: Select an orbital relay satellite overhead, establish the communication link, and send our initial handshake packet!"
                );
                this.renderStage();
            }
        });
        this.uiLayer.add(beginBtn);

        // Right Mission Stages & Telemetry Overview
        const rightCard = this.add.graphics();
        rightCard.fillStyle(0x081d3d, 0.96);
        rightCard.fillRoundedRect(rightX, panelY, rightW, panelH, 14);
        rightCard.lineStyle(2, 0x00e5ff, 0.9);
        rightCard.strokeRoundedRect(rightX, panelY, rightW, panelH, 14);
        this.uiLayer.add(rightCard);

        this.uiLayer.add(this.add.text(rightX + 20, panelY + 18, "🎯 MISSION ROADMAP", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "17px",
            fontStyle: "bold",
            color: "#FFD23F"
        }));

        const roadmap = [
            { num: "1. CONNECT RELAY", desc: "Lock onto an orbital satellite & test light-speed signal delay." },
            { num: "2. PLAN ROVER COMMANDS", desc: "Queue up to 5 commands (FORWARD, LEFT, RIGHT, STOP, CAPTURE, SAMPLE) & transmit." },
            { num: "3. TRANSMIT DATA", desc: "Prioritize critical sample packets within bandwidth & orbital pass limits." }
        ];
        roadmap.forEach((step, idx) => {
            const sy = panelY + 58 + idx * 88;
            const box = this.add.graphics();
            box.fillStyle(0x0d2b57, 0.95);
            box.fillRoundedRect(rightX + 20, sy, rightW - 40, 74, 10);
            box.lineStyle(1.5, 0x00e5ff, 0.8);
            box.strokeRoundedRect(rightX + 20, sy, rightW - 40, 74, 10);
            this.uiLayer.add(box);

            this.uiLayer.add(this.add.text(rightX + 34, sy + 12, step.num, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "14px",
                fontStyle: "bold",
                color: "#6BE8FF"
            }));
            this.uiLayer.add(this.add.text(rightX + 34, sy + 34, step.desc, {
                fontFamily: UITheme.fonts.body,
                fontSize: "12px",
                color: "#E2F1FF",
                wordWrap: { width: rightW - 68 }
            }));
        });

        this.uiLayer.add(this.add.text(
            rightX + 20,
            panelY + panelH - 54,
            "📶 ROVER TELEMETRY:  SIGNAL LINK: STANDBY  |  STATUS: IDLE  |  PACKETS: 0/3",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11.5px",
                fontStyle: "bold",
                color: "#9CEEFF",
                wordWrap: { width: rightW - 40 }
            }
        ));
    }

    private drawIntroCharacterCard(x: number, y: number, name: string, borderColor: number, text: string) {
        const card = this.add.graphics();
        card.fillStyle(0xf5f9ff, 0.96);
        card.fillRoundedRect(x, y, 330, 96, 12);
        card.lineStyle(2, borderColor, 1);
        card.strokeRoundedRect(x, y, 330, 96, 12);
        this.uiLayer.add(card);

        this.uiLayer.add(this.add.text(x + 14, y + 10, name === "Commander Maya" ? "👩‍🚀 Commander Maya" : "🤖 Bleep", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            fontStyle: "bold",
            color: "#0D3B7A"
        }));
        this.uiLayer.add(this.add.text(x + 14, y + 32, text, {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            fontStyle: "bold",
            color: "#152542",
            wordWrap: { width: 302 }
        }));
    }

    // =========================================================================
    // PHASE 1: ESTABLISH THE SIGNAL
    // =========================================================================
    private renderPhase1Relay() {
        const panelY = 86;
        const panelH = this.H - 206;
        const leftW = Math.round((this.W - 48) * 0.54);
        const rightX = 16 + leftW + 16;
        const rightW = this.W - rightX - 16;

        // Left: Orbital Signal Visualizer
        const leftBox = this.add.graphics();
        leftBox.fillStyle(0x081d3d, 0.95);
        leftBox.fillRoundedRect(16, panelY, leftW, panelH, 14);
        leftBox.lineStyle(2, 0x00e5ff, 0.85);
        leftBox.strokeRoundedRect(16, panelY, leftW, panelH, 14);
        this.uiLayer.add(leftBox);

        this.uiLayer.add(this.add.text(36, panelY + 18, "PHASE 1: ORBITAL RELAY & LIGHT-SPEED DELAY", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "17px",
            fontStyle: "bold",
            color: "#6BE8FF"
        }));

        const cx = 16 + leftW / 2;
        const satY = panelY + 112;
        const groundY = panelY + panelH - 96;
        const outpostX = cx - 175;
        const roverX = cx + 175;

        const canyonFloor = this.add.graphics();
        canyonFloor.fillStyle(0x9e3f27, 1);
        canyonFloor.fillRoundedRect(36, groundY + 18, leftW - 40, 44, 10);
        this.uiLayer.add(canyonFloor);

        // Relay Node
        const satCard = this.add.graphics();
        satCard.fillStyle(0x13386e, 1);
        satCard.fillRoundedRect(cx - 105, satY - 26, 210, 52, 12);
        satCard.lineStyle(2, this.relayLinked ? 0x2ee59d : 0xffd23f, 1);
        satCard.strokeRoundedRect(cx - 105, satY - 26, 210, 52, 12);
        this.uiLayer.add(satCard);
        this.uiLayer.add(this.add.text(cx, satY, `🛰️ ${this.selectedRelay.name.split(" ")[0]}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "15px",
            fontStyle: "bold",
            color: "#FFFFFF"
        }).setOrigin(0.5));

        this.uiLayer.add(this.add.text(outpostX, groundY, "🏛️ MARS OUTPOST", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            fontStyle: "bold",
            color: "#FFD23F"
        }).setOrigin(0.5));
        this.uiLayer.add(this.add.text(roverX, groundY, "🤖 CANYON ROVER", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            fontStyle: "bold",
            color: "#6BE8FF"
        }).setOrigin(0.5));

        const beam = this.add.graphics();
        beam.lineStyle(3, this.relayLinked ? 0x2ee59d : 0x2a5287, this.relayLinked ? 0.95 : 0.45);
        beam.lineBetween(outpostX, groundY - 14, cx - 35, satY + 26);
        beam.lineBetween(cx + 35, satY + 26, roverX, groundY - 14);
        this.uiLayer.add(beam);

        if (this.relayLinked) {
            const packetDot = this.add.circle(outpostX, groundY - 14, 7, 0x00f0ff, 1);
            this.uiLayer.add(packetDot);
            this.tweens.add({
                targets: packetDot,
                x: cx,
                y: satY + 26,
                duration: Math.round(this.selectedRelay.delaySeconds * 420),
                onComplete: () => {
                    if (!packetDot.active) return;
                    this.tweens.add({
                        targets: packetDot,
                        x: roverX,
                        y: groundY - 14,
                        duration: Math.round(this.selectedRelay.delaySeconds * 420),
                        yoyo: true,
                        repeat: -1
                    });
                }
            });
        }

        // Science explanation panel
        const eduBox = this.add.graphics();
        eduBox.fillStyle(0x061329, 0.95);
        eduBox.fillRoundedRect(36, satY + 54, leftW - 40, 114, 10);
        eduBox.lineStyle(1.5, 0x28568f, 0.9);
        eduBox.strokeRoundedRect(36, satY + 54, leftW - 40, 114, 10);
        this.uiLayer.add(eduBox);

        this.uiLayer.add(this.add.text(52, satY + 66, "⚡ WHY DO SIGNALS HAVE A DELAY?", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            fontStyle: "bold",
            color: "#FFD23F"
        }));
        this.uiLayer.add(this.add.text(
            52,
            satY + 88,
            `• Radio waves travel at the speed of light, yet vast planetary distances still create a noticeable delay (${this.selectedRelay.delaySeconds.toFixed(1)}s simulated).\n` +
            `• Orbital relay satellites provide overhead line-of-sight into deep canyons.\n` +
            `• Signal Link: ${this.relayLinked ? `${this.signalStrengthPct}% (${this.selectedRelay.signalBars}/5 Bars)` : "NOT CONNECTED"}  |  Initial Packet: ${this.initialPacketSent ? "ACKNOWLEDGED ✔" : "PENDING"}`,
            {
                fontFamily: UITheme.fonts.body,
                fontSize: "12px",
                color: "#D8ECFF",
                lineSpacing: 4,
                wordWrap: { width: leftW - 72 }
            }
        ));

        // Right: Satellite Selection & Handshake Controls
        const rightBox = this.add.graphics();
        rightBox.fillStyle(0x081d3d, 0.95);
        rightBox.fillRoundedRect(rightX, panelY, rightW, panelH, 14);
        rightBox.lineStyle(2, 0x00e5ff, 0.85);
        rightBox.strokeRoundedRect(rightX, panelY, rightW, panelH, 14);
        this.uiLayer.add(rightBox);

        this.uiLayer.add(this.add.text(rightX + 20, panelY + 18, "1. CHOOSE RELAY & ESTABLISH LINK", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            fontStyle: "bold",
            color: "#FFFFFF"
        }));

        RELAY_SATELLITES.forEach((satItem, idx) => {
            const ry = panelY + 52 + idx * 82;
            const isSel = satItem.id === this.selectedRelay.id;
            const card = this.add.graphics();
            card.fillStyle(isSel ? 0x11366b : 0x0b2144, 0.95);
            card.fillRoundedRect(rightX + 20, ry, rightW - 40, 72, 10);
            card.lineStyle(2, isSel ? 0x00e5ff : 0x264e82, 1);
            card.strokeRoundedRect(rightX + 20, ry, rightW - 40, 72, 10);
            this.uiLayer.add(card);

            this.uiLayer.add(this.add.text(rightX + 34, ry + 10, `${isSel ? "◉" : "○"} ${satItem.name}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "13px",
                fontStyle: "bold",
                color: isSel ? "#6BE8FF" : "#FFFFFF"
            }));
            this.uiLayer.add(this.add.text(rightX + rightW - 34, ry + 10, `DELAY: ${satItem.delaySeconds.toFixed(1)}s`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "12px",
                fontStyle: "bold",
                color: "#FFD23F"
            }).setOrigin(1, 0));

            this.uiLayer.add(this.add.text(
                rightX + 34,
                ry + 32,
                `Orbit: ${satItem.orbit} • Cap: ${satItem.bandwidthCapMb} MB • ${satItem.summary}`,
                {
                    fontFamily: UITheme.fonts.body,
                    fontSize: "11px",
                    color: "#C4DDF7",
                    wordWrap: { width: rightW - 68 }
                }
            ));

            const hit = this.add.rectangle(rightX + rightW / 2, ry + 36, rightW - 40, 72, 0, 0).setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => {
                if (this.controlsLocked) return;
                SoundFX.playSelect();
                this.selectedRelay = satItem;
                this.relayLinked = false;
                this.initialPacketSent = false;
                this.signalStrengthPct = 0;
                this.renderStage();
            });
            this.uiLayer.add(hit);
        });

        // Step 1A: Establish Link
        const linkBtn = ButtonFactory.createButton({
            scene: this,
            x: rightX + rightW / 2,
            y: panelY + panelH - 122,
            text: this.relayLinked ? `✔ LINKED (${this.signalStrengthPct}% SIGNAL)` : "📡 ESTABLISH COMMUNICATION LINK",
            width: rightW - 40,
            height: 40,
            primaryColor: this.relayLinked ? UITheme.colors.bioGreen : UITheme.colors.primaryCyan,
            fontSize: "13px",
            onClick: () => {
                if (this.controlsLocked) return;
                SoundFX.playClick();
                this.relayLinked = true;
                this.signalStrengthPct = this.selectedRelay.signalBars * 20;
                this.windowTimeRemaining = this.selectedRelay.windowSeconds;
                this.setDialogue("Bleep", `Carrier wave locked on ${this.selectedRelay.name}! Now transmit the initial command packet to test the delay.`);
                this.renderStage();
            }
        });
        this.uiLayer.add(linkBtn);

        // Step 1B: Transmit Initial Command Packet
        const pingBtn = ButtonFactory.createButton({
            scene: this,
            x: rightX + rightW / 2,
            y: panelY + panelH - 76,
            text: this.initialPacketSent ? "✔ INITIAL COMMAND PACKET VERIFIED" : "📨 TRANSMIT INITIAL COMMAND PACKET",
            width: rightW - 40,
            height: 40,
            primaryColor: this.initialPacketSent ? UITheme.colors.bioGreen : 0x1e4d8c,
            fontSize: "13px",
            onClick: () => {
                if (this.controlsLocked) return;
                if (!this.relayLinked) {
                    this.handleMistake(
                        "Establish the orbital relay link before transmitting a command packet!",
                        "Without an active carrier frequency to an overhead orbiter, surface transmissions cannot reach the canyon.",
                        "Click ESTABLISH COMMUNICATION LINK first, then click TRANSMIT INITIAL COMMAND PACKET."
                    );
                    return;
                }
                if (this.initialPacketSent) return;

                SoundFX.playClick();
                this.controlsLocked = true;
                this.setDialogue("Bleep", `Transmitting handshake packet... Waiting ${this.selectedRelay.delaySeconds.toFixed(1)}s for light-speed round-trip!`);
                this.renderStage();

                this.time.delayedCall(Math.round(this.selectedRelay.delaySeconds * 1000), () => {
                    this.controlsLocked = false;
                    this.initialPacketSent = true;
                    this.updateVisorProgress(1, this.challengeConfig.targetVal, "Stages");
                    this.showSurfaceFloatingText(this.W / 2, this.H / 2, "📡 Rover Handshake Confirmed!", UITheme.colors.bioGreenStr);
                    this.setDialogue("Commander Maya", "Signal verified! Stage 1 complete. Click PROCEED TO ROVER COMMANDS to navigate the canyon.");
                    this.renderStage();
                });
            }
        });
        this.uiLayer.add(pingBtn);

        // Step 1C: Advance to Phase 2
        const proceedBtn = ButtonFactory.createButton({
            scene: this,
            x: rightX + rightW / 2,
            y: panelY + panelH - 28,
            text: "PROCEED TO ROVER COMMANDS →",
            width: rightW - 40,
            height: 42,
            primaryColor: this.initialPacketSent ? 0xff8c1a : 0x223654,
            textColor: this.initialPacketSent ? "#141008" : "#899BB5",
            fontSize: "14px",
            onClick: () => {
                if (!this.initialPacketSent) {
                    this.handleMistake(
                        "Complete both relay link establishment and the initial command packet test first!",
                        "Flight controllers always verify two-way command latency before uploading autonomous drive sequences.",
                        "Press ESTABLISH COMMUNICATION LINK, then TRANSMIT INITIAL COMMAND PACKET."
                    );
                    return;
                }
                SoundFX.playClick();
                this.stage = "PHASE2_ROVER";
                this.setDialogue(
                    "Commander Maya",
                    "Phase 2: Plan up to 5 rover commands in your queue, then press TRANSMIT COMMANDS. Remember: the rover moves only after transmission!"
                );
                this.renderStage();
            }
        });
        this.uiLayer.add(proceedBtn);
    }

    // =========================================================================
    // PHASE 2: COMMAND THE ROVER (2D Top-Down Canyon + Queue + Delayed Exec)
    // =========================================================================
    private renderPhase2Rover() {
        const panelY = 86;
        const panelH = this.H - 206;
        const leftW = Math.round((this.W - 48) * 0.54);
        const rightX = 16 + leftW + 16;
        const rightW = this.W - rightX - 16;

        // Left: 2D Top-Down Canyon Grid
        const leftBox = this.add.graphics();
        leftBox.fillStyle(0x081d3d, 0.95);
        leftBox.fillRoundedRect(16, panelY, leftW, panelH, 14);
        leftBox.lineStyle(2, 0x00e5ff, 0.85);
        leftBox.strokeRoundedRect(16, panelY, leftW, panelH, 14);
        this.uiLayer.add(leftBox);

        const dirNames = ["NORTH ▲", "EAST ▶", "SOUTH ▼", "WEST ◀"];
        this.uiLayer.add(this.add.text(
            34,
            panelY + 14,
            `CANYON SECTOR MAP  |  COORDS: (${this.roverCol}, ${this.roverRow})  |  HEADING: ${dirNames[this.roverDir]}`,
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "13.5px",
                fontStyle: "bold",
                color: "#6BE8FF"
            }
        ));

        const cellSize = Math.min(72, Math.floor((leftW - 56) / GRID_COLS), Math.floor((panelH - 96) / GRID_ROWS));
        const gridX0 = 16 + Math.floor((leftW - cellSize * GRID_COLS) / 2);
        const gridY0 = panelY + 44;

        for (let r = 0; r < GRID_ROWS; r++) {
            for (let c = 0; c < GRID_COLS; c++) {
                const cx = gridX0 + c * cellSize;
                const cy = gridY0 + r * cellSize;
                const tile = this.canyonGrid[r][c];

                const cell = this.add.graphics();
                let bgHex = 0x99422a; // Safe regolith
                if (tile === 1) bgHex = 0x4b2520; // Rock obstacle
                if (tile === 2) bgHex = 0x3b121c; // Unsafe crater terrain
                if (tile === 3 || tile === 4) bgHex = 0x154b61; // Sample site
                if (tile === 5) bgHex = 0x175c3a; // Destination marker

                cell.fillStyle(bgHex, 0.96);
                cell.fillRoundedRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4, 8);
                cell.lineStyle(1.5, tile === 5 ? 0x2ee59d : 0xd97348, 0.75);
                cell.strokeRoundedRect(cx + 2, cy + 2, cellSize - 4, cellSize - 4, 8);
                this.uiLayer.add(cell);

                let glyph = "";
                if (tile === 1) glyph = "🪨";
                else if (tile === 2) glyph = "⚠️";
                else if (tile === 3) glyph = this.samplesCollected.includes("Hematite Concretion") ? "✓" : "🧪";
                else if (tile === 4) glyph = this.samplesCollected.includes("Hydrated Silica") ? "✓" : "💎";
                else if (tile === 5) glyph = "🏁";

                if (glyph) {
                    this.uiLayer.add(this.add.text(cx + cellSize / 2, cy + cellSize / 2, glyph, {
                        fontSize: "24px"
                    }).setOrigin(0.5));
                }
            }
        }

        // Rover Token
        const rx = gridX0 + this.roverCol * cellSize + cellSize / 2;
        const ry = gridY0 + this.roverRow * cellSize + cellSize / 2;
        const roverToken = this.add.container(rx, ry);
        const badge = this.add.circle(0, 0, cellSize * 0.34, 0xffa726, 1);
        badge.setStrokeStyle(3, 0xffffff, 1);
        const dirArrows = ["▲", "▶", "▼", "◀"];
        const label = this.add.text(0, 0, `🤖${dirArrows[this.roverDir]}`, {
            fontSize: "14px",
            fontStyle: "bold",
            color: "#091426"
        }).setOrigin(0.5);
        roverToken.add([badge, label]);
        this.uiLayer.add(roverToken);

        // Legend & Objective Status
        this.uiLayer.add(this.add.text(
            34,
            panelY + panelH - 34,
            `🪨 Rock  ⚠️ Unsafe Terrain  🧪/💎 Samples (${this.samplesCollected.length}/2)  📷 Photos (${this.imagesCaptured}/1)  🏁 Beacon (${this.destinationReached ? "REACHED" : "PENDING"})`,
            {
                fontFamily: UITheme.fonts.body,
                fontSize: "11.5px",
                fontStyle: "bold",
                color: "#FFE39F"
            }
        ));

        // Right: Command Buttons & Queue
        const rightBox = this.add.graphics();
        rightBox.fillStyle(0x081d3d, 0.95);
        rightBox.fillRoundedRect(rightX, panelY, rightW, panelH, 14);
        rightBox.lineStyle(2, 0x00e5ff, 0.85);
        rightBox.strokeRoundedRect(rightX, panelY, rightW, panelH, 14);
        this.uiLayer.add(rightBox);

        this.uiLayer.add(this.add.text(rightX + 18, panelY + 14, "ROVER COMMAND PLANNER (MAX 5)", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            fontStyle: "bold",
            color: "#FFFFFF"
        }));

        const commandDefs: Array<{ id: RoverCommand; label: string; color: number }> = [
            { id: "FORWARD", label: "⬆ FORWARD", color: 0x136f54 },
            { id: "LEFT", label: "↰ LEFT", color: 0x35428f },
            { id: "RIGHT", label: "↱ RIGHT", color: 0x35428f },
            { id: "STOP", label: "■ STOP", color: 0x8c2432 },
            { id: "CAPTURE", label: "📷 CAPTURE IMAGE", color: 0x996b14 },
            { id: "SAMPLE", label: "🧪 COLLECT SAMPLE", color: 0x136f54 }
        ];

        const btnW = Math.floor((rightW - 56) / 3);
        const btnH = 42;
        commandDefs.forEach((cmd, idx) => {
            const col = idx % 3;
            const row = Math.floor(idx / 3);
            const bx = rightX + 18 + col * (btnW + 10) + btnW / 2;
            const by = panelY + 64 + row * (btnH + 10);

            const btn = ButtonFactory.createButton({
                scene: this,
                x: bx,
                y: by,
                text: cmd.label,
                width: btnW,
                height: btnH,
                primaryColor: cmd.color,
                fontSize: "11px",
                onClick: () => {
                    if (this.controlsLocked) return;
                    if (this.commandQueue.length >= MAX_QUEUE_LEN) {
                        SoundFX.playAlert();
                        this.setDialogue("Bleep", "Queue full (5/5 commands)! Press TRANSMIT COMMANDS or click a queued slot to remove it.");
                        return;
                    }
                    SoundFX.playClick();
                    this.commandQueue.push(cmd.id);
                    this.renderStage();
                }
            });
            this.uiLayer.add(btn);
        });

        // Command Queue Slots
        const qY = panelY + 154;
        this.uiLayer.add(this.add.text(rightX + 18, qY, `COMMAND QUEUE (${this.commandQueue.length}/5) — CLICK ANY SLOT TO REMOVE`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11.5px",
            fontStyle: "bold",
            color: "#8AD8FF"
        }));

        const slotW = Math.floor((rightW - 76) / 5);
        for (let i = 0; i < MAX_QUEUE_LEN; i++) {
            const sx = rightX + 18 + i * (slotW + 10);
            const sy = qY + 22;
            const queuedCmd = this.commandQueue[i];

            const slot = this.add.graphics();
            slot.fillStyle(queuedCmd ? 0x123a6e : 0x061329, 0.95);
            slot.fillRoundedRect(sx, sy, slotW, 46, 8);
            slot.lineStyle(1.5, queuedCmd ? 0x00e5ff : 0x264b7d, 1);
            slot.strokeRoundedRect(sx, sy, slotW, 46, 8);
            this.uiLayer.add(slot);

            this.uiLayer.add(this.add.text(sx + slotW / 2, sy + 23, queuedCmd ? `${i + 1}. ${queuedCmd.slice(0, 7)}` : `${i + 1}. EMPTY`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                fontStyle: "bold",
                color: queuedCmd ? "#FFFFFF" : "#5D7CA6"
            }).setOrigin(0.5));

            if (queuedCmd && !this.controlsLocked) {
                const hit = this.add.rectangle(sx + slotW / 2, sy + 23, slotW, 46, 0, 0).setInteractive({ useHandCursor: true });
                hit.on("pointerdown", () => {
                    SoundFX.playClick();
                    this.commandQueue.splice(i, 1);
                    this.renderStage();
                });
                this.uiLayer.add(hit);
            }
        }

        // Clear Queue & Transmit Commands
        const clearBtn = ButtonFactory.createButton({
            scene: this,
            x: rightX + 18 + (rightW - 46) * 0.21,
            y: qY + 98,
            text: "🗑️ CLEAR QUEUE",
            width: Math.floor((rightW - 46) * 0.42),
            height: 40,
            primaryColor: 0x7d2230,
            fontSize: "11.5px",
            onClick: () => {
                if (this.controlsLocked) return;
                SoundFX.playClick();
                this.commandQueue = [];
                this.renderStage();
            }
        });
        this.uiLayer.add(clearBtn);

        const transmitBtn = ButtonFactory.createButton({
            scene: this,
            x: rightX + 18 + (rightW - 46) * 0.72,
            y: qY + 98,
            text: this.controlsLocked ? "⏳ TRANSMITTING..." : "📡 TRANSMIT COMMANDS",
            width: Math.floor((rightW - 46) * 0.54),
            height: 40,
            primaryColor: 0xff8c1a,
            textColor: "#141008",
            fontSize: "12px",
            onClick: () => this.transmitCommandSequence()
        });
        this.uiLayer.add(transmitBtn);

        // Advance to Phase 3 once sample + image + beacon destination are achieved
        const stage2Complete = this.samplesCollected.length >= 1 && this.imagesCaptured >= 1 && this.destinationReached;
        const nextPhaseBtn = ButtonFactory.createButton({
            scene: this,
            x: rightX + rightW / 2,
            y: panelY + panelH - 28,
            text: stage2Complete ? "NEXT: TRANSMIT SCIENTIFIC DATA →" : "CAPTURE IMAGE, COLLECT SAMPLE & REACH 🏁",
            width: rightW - 36,
            height: 42,
            primaryColor: stage2Complete ? UITheme.colors.bioGreen : 0x1c3152,
            textColor: stage2Complete ? "#081A12" : "#899BB5",
            fontSize: "12px",
            onClick: () => {
                if (!stage2Complete) {
                    this.handleMistake(
                        "Before transmitting science data, capture a photo, collect at least 1 geological sample, and reach the 🏁 Beacon!",
                        "Surface imagery documents sample context before drilling, and the rover must reach the relay beacon for high-rate uplink.",
                        "Drive to 🧪 at (1,1) or 💎 at (5,2), execute CAPTURE IMAGE + COLLECT SAMPLE, then navigate to 🏁 at (6,3)."
                    );
                    return;
                }
                SoundFX.playClick();
                this.updateVisorProgress(2, this.challengeConfig.targetVal, "Stages");
                this.stage = "PHASE3_TRANSMIT";
                this.startOrbitalWindowTimer();
                this.setDialogue(
                    "Commander Maya",
                    "Phase 3: Select and prioritize our most important scientific data packets within the relay's bandwidth limit before the pass window closes!"
                );
                this.renderStage();
            }
        });
        this.uiLayer.add(nextPhaseBtn);
    }

    private transmitCommandSequence() {
        if (this.controlsLocked) return;
        if (this.commandQueue.length === 0) {
            this.handleMistake(
                "Add at least one command to the queue before pressing TRANSMIT COMMANDS!",
                "Because radio signals have communication lag, controllers bundle commands into a sequence before uplink.",
                "Click FORWARD, RIGHT, CAPTURE IMAGE, or COLLECT SAMPLE to queue steps, then transmit."
            );
            return;
        }

        this.controlsLocked = true;
        SoundFX.playClick();
        const delayMs = Math.round(this.selectedRelay.delaySeconds * 550);
        this.setDialogue(
            "Bleep",
            `Uplinking ${this.commandQueue.length} commands via ${this.selectedRelay.name}... Simulating ${this.selectedRelay.delaySeconds.toFixed(1)}s light-speed delay!`
        );
        this.renderStage();

        const stepNext = () => {
            if (this.commandQueue.length === 0) {
                this.controlsLocked = false;
                this.renderStage();
                return;
            }

            const cmd = this.commandQueue.shift()!;
            const stopExecution = this.executeSingleRoverStep(cmd);
            if (stopExecution) {
                this.commandQueue = [];
                this.controlsLocked = false;
                this.renderStage();
                return;
            }

            this.renderStage();
            this.time.delayedCall(520, stepNext);
        };

        this.time.delayedCall(delayMs, stepNext);
    }

    private executeSingleRoverStep(cmd: RoverCommand): boolean {
        if (cmd === "LEFT") {
            this.roverDir = ((this.roverDir + 3) % 4) as Direction;
            SoundFX.playSelect();
            return false;
        }
        if (cmd === "RIGHT") {
            this.roverDir = ((this.roverDir + 1) % 4) as Direction;
            SoundFX.playSelect();
            return false;
        }
        if (cmd === "STOP") {
            SoundFX.playClick();
            this.setDialogue("Bleep", "Rover brakes engaged — holding safe position.");
            return false;
        }
        if (cmd === "CAPTURE") {
            this.imagesCaptured += 1;
            SoundFX.playClick();
            this.showSurfaceFloatingText(this.W * 0.3, this.H * 0.45, "📷 Surface Image Captured!", UITheme.colors.solarGoldStr);
            this.setDialogue("Bleep", `High-res Mastcam photo saved at (${this.roverCol}, ${this.roverRow})!`);
            return false;
        }
        if (cmd === "SAMPLE") {
            const tile = this.canyonGrid[this.roverRow][this.roverCol];
            if (tile === 3 && !this.samplesCollected.includes("Hematite Concretion")) {
                this.samplesCollected.push("Hematite Concretion");
                SoundFX.playClick();
                this.showSurfaceFloatingText(this.W * 0.3, this.H * 0.45, "🧪 Hematite Concretion Collected!", UITheme.colors.bioGreenStr);
                this.setDialogue("Commander Maya", "Sample stored: Hematite Concretion! Evidence of ancient Martian liquid water.");
                return false;
            }
            if (tile === 4 && !this.samplesCollected.includes("Hydrated Silica")) {
                this.samplesCollected.push("Hydrated Silica");
                SoundFX.playClick();
                this.showSurfaceFloatingText(this.W * 0.3, this.H * 0.45, "💎 Hydrated Silica Collected!", UITheme.colors.bioGreenStr);
                this.setDialogue("Commander Maya", "Sample stored: Hydrated Silica Vein! Excellent preservation of potential biosignatures.");
                return false;
            }
            this.handleMistake(
                "There is no uncollected sample directly under the rover! Drive onto 🧪 or 💎 first.",
                "The rover's coring drill only reaches directly beneath its robotic arm turret.",
                "Navigate onto (1, 1) or (5, 2) before executing COLLECT SAMPLE."
            );
            return true;
        }

        // FORWARD movement
        const vectors: Record<Direction, [number, number]> = {
            0: [0, -1],
            1: [1, 0],
            2: [0, 1],
            3: [-1, 0]
        };
        const [dc, dr] = vectors[this.roverDir];
        const nextC = this.roverCol + dc;
        const nextR = this.roverRow + dr;

        if (nextC < 0 || nextC >= GRID_COLS || nextR < 0 || nextR >= GRID_ROWS) {
            this.handleMistake(
                "Canyon wall boundary ahead! Remaining queued steps halted for safety.",
                "Autonomous hazard avoidance stops the rover immediately if a path exits the mapped canyon floor.",
                "Turn LEFT or RIGHT away from the canyon edge before moving FORWARD."
            );
            return true;
        }

        const nextTile = this.canyonGrid[nextR][nextC];
        if (nextTile === 1 || nextTile === 2) {
            const hazardDesc = nextTile === 1 ? "large boulder obstacle (🪨)" : "unsafe steep crater slope (⚠️)";
            this.handleMistake(
                `Rover halted before entering a ${hazardDesc} at (${nextC}, ${nextR})!`,
                "Because light-speed delay prevents live steering, onboard stereo cameras stop the rover before wheel slip or collision occurs.",
                "Use LEFT or RIGHT to steer around 🪨 obstacles and ⚠️ unsafe crater tiles."
            );
            if (this.mistakeCount > 1) this.mistakesCorrected += 1;
            return true;
        }

        this.roverCol = nextC;
        this.roverRow = nextR;
        SoundFX.playSelect();

        if (nextTile === 5) {
            this.destinationReached = true;
            this.showSurfaceFloatingText(this.W * 0.3, this.H * 0.45, "🏁 Outpost Beacon Reached!", UITheme.colors.bioGreenStr);
            this.setDialogue("Commander Maya", "Rover reached the Outpost Relay Beacon! Ready for Phase 3 data transmission.");
        }
        return false;
    }

    // =========================================================================
    // PHASE 3: SCIENTIFIC DATA TRANSMISSION
    // =========================================================================
    private startOrbitalWindowTimer() {
        this.windowTimer?.remove();
        this.windowTimer = this.time.addEvent({
            delay: 1000,
            loop: true,
            callback: () => {
                if (this.stage !== "PHASE3_TRANSMIT" || this.dataDelivered) return;
                this.windowTimeRemaining = Math.max(0, this.windowTimeRemaining - 1);
                if (this.windowTimeRemaining === 0) {
                    this.windowTimer?.remove();
                    this.handleMistake(
                        "The orbital relay window closed as the satellite passed over the horizon!",
                        "Orbital satellites circle Mars every ~2 hours, giving rovers brief pass windows to uplink science data.",
                        "Click OPEN NEXT RELAY WINDOW, select only the critical science packets within the MB limit, and transmit."
                    );
                }
                this.renderStage();
            }
        });
    }

    private renderPhase3Transmit() {
        const panelY = 86;
        const panelH = this.H - 206;

        const card = this.add.graphics();
        card.fillStyle(0x081d3d, 0.96);
        card.fillRoundedRect(16, panelY, this.W - 32, panelH, 14);
        card.lineStyle(2, 0x00e5ff, 0.9);
        card.strokeRoundedRect(16, panelY, this.W - 32, panelH, 14);
        this.uiLayer.add(card);

        const selectedMb = this.packets.filter(p => p.selected).reduce((acc, p) => acc + p.sizeMb, 0);
        const capMb = this.selectedRelay.bandwidthCapMb;
        const exceedsCap = selectedMb > capMb;

        this.uiLayer.add(this.add.text(36, panelY + 18, "PHASE 3: PRIORITIZE & TRANSMIT SCIENTIFIC DATA", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "18px",
            fontStyle: "bold",
            color: "#FFD23F"
        }));

        this.uiLayer.add(this.add.text(
            36,
            panelY + 46,
            `SAMPLES: ${this.samplesCollected.join(" + ") || "Canyon Core"}   |   WINDOW: ${this.windowTimeRemaining}s   |   BANDWIDTH: ${selectedMb} / ${capMb} MB ${exceedsCap ? "(OVER LIMIT!)" : "(OK)"}`,
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "13px",
                fontStyle: "bold",
                color: exceedsCap ? "#FF6B7A" : "#6BE8FF"
            }
        ));

        this.packets.forEach((pkt, idx) => {
            const py = panelY + 80 + idx * 62;
            const pw = this.W - 72;

            const rowBg = this.add.graphics();
            rowBg.fillStyle(pkt.selected ? 0x11366b : 0x0b2144, 0.95);
            rowBg.fillRoundedRect(36, py, pw, 52, 10);
            rowBg.lineStyle(2, pkt.selected ? 0x00e5ff : 0x264e82, 1);
            rowBg.strokeRoundedRect(36, py, pw, 52, 10);
            this.uiLayer.add(rowBg);

            this.uiLayer.add(this.add.text(54, py + 15, `${pkt.selected ? "☑" : "☐"}  ${pkt.title}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "14px",
                fontStyle: "bold",
                color: pkt.selected ? "#FFFFFF" : "#97B3D6"
            }));

            this.uiLayer.add(this.add.text(
                pw - 18,
                py + 15,
                `${pkt.isCritical ? "★ CRITICAL SCIENCE" : "ROUTINE TELEMETRY"}   •   ${pkt.sizeMb} MB`,
                {
                    fontFamily: UITheme.fonts.heading,
                    fontSize: "12px",
                    fontStyle: "bold",
                    color: pkt.isCritical ? "#2EE59D" : "#FFD23F"
                }
            ).setOrigin(1, 0));

            const hit = this.add.rectangle(36 + pw / 2, py + 26, pw, 52, 0, 0).setInteractive({ useHandCursor: true });
            hit.on("pointerdown", () => {
                if (this.dataDelivered) return;
                SoundFX.playSelect();
                pkt.selected = !pkt.selected;
                this.renderStage();
            });
            this.uiLayer.add(hit);
        });

        if (this.windowTimeRemaining === 0 && !this.dataDelivered) {
            const nextPassBtn = ButtonFactory.createButton({
                scene: this,
                x: this.W / 2,
                y: panelY + panelH - 34,
                text: "🛰️ ACQUIRE NEXT ORBITAL PASS WINDOW",
                width: 390,
                height: 46,
                primaryColor: UITheme.colors.primaryCyan,
                fontSize: "14px",
                onClick: () => {
                    SoundFX.playClick();
                    this.windowsUsed += 1;
                    this.mistakesCorrected += 1;
                    this.windowTimeRemaining = this.selectedRelay.windowSeconds;
                    this.startOrbitalWindowTimer();
                    this.setDialogue("Bleep", "Orbital pass re-established! Select the critical science packets and transmit.");
                    this.renderStage();
                }
            });
            this.uiLayer.add(nextPassBtn);
            return;
        }

        const transmitDataBtn = ButtonFactory.createButton({
            scene: this,
            x: this.W / 2,
            y: panelY + panelH - 34,
            text: this.dataDelivered ? "PROCEED TO SCIENCE QUIZ →" : "📡 TRANSMIT DATA THROUGH ORBITAL RELAY",
            width: 450,
            height: 46,
            primaryColor: this.dataDelivered ? UITheme.colors.bioGreen : 0xff8c1a,
            textColor: "#141008",
            fontSize: "15px",
            onClick: () => {
                if (this.dataDelivered) {
                    SoundFX.playClick();
                    this.stage = "QUIZ";
                    this.setDialogue("Commander Maya", "Great transmission! Complete these 3 final science questions to earn your Sol 3 badge.");
                    this.renderStage();
                    return;
                }

                if (exceedsCap) {
                    this.handleMistake(
                        `Total size (${selectedMb} MB) exceeds ${this.selectedRelay.name}'s ${capMb} MB limit!`,
                        "Each orbital pass has a strict megabyte budget; unchecking routine telemetry leaves room for vital discoveries.",
                        "Uncheck routine logs so your total MB fits inside the relay bandwidth cap."
                    );
                    return;
                }

                const criticalCount = this.packets.filter(p => p.isCritical && p.selected).length;
                if (criticalCount < 2) {
                    this.handleMistake(
                        "You left high-priority scientific findings unselected!",
                        "Biosignature spectra and canyon imagery are our top mission priorities and must be uplinked first.",
                        "Check both ★ CRITICAL SCIENCE packets before transmitting."
                    );
                    return;
                }

                SoundFX.playClick();
                this.windowTimer?.remove();
                this.packetsDelivered = 3;
                this.dataDelivered = true;
                this.updateVisorProgress(3, this.challengeConfig.targetVal, "Stages");
                this.showSurfaceFloatingText(this.W / 2, this.H / 2, "📡 Science Findings Received at Mars Outpost!", UITheme.colors.bioGreenStr);
                this.setDialogue("Bleep", "Transmission 100% confirmed at Mars Outpost! All 3 data bundles delivered safely!");
                this.renderStage();
            }
        });
        this.uiLayer.add(transmitDataBtn);
    }

    // =========================================================================
    // QUIZ STAGE (3 Multiple-Choice Questions)
    // =========================================================================
    private renderQuizStage() {
        const panelY = 86;
        const panelH = this.H - 206;
        const item = QUIZ_ITEMS[this.quizIndex];

        const box = this.add.graphics();
        box.fillStyle(0x081d3d, 0.96);
        box.fillRoundedRect(16, panelY, this.W - 32, panelH, 14);
        box.lineStyle(2, 0x00e5ff, 0.9);
        box.strokeRoundedRect(16, panelY, this.W - 32, panelH, 14);
        this.uiLayer.add(box);

        this.uiLayer.add(this.add.text(36, panelY + 20, `MARS SIGNAL QUIZ  (${this.quizIndex + 1} / ${QUIZ_ITEMS.length})   |   SCORE: ${this.quizScore}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            fontStyle: "bold",
            color: "#FFD23F"
        }));

        this.uiLayer.add(this.add.text(36, panelY + 54, item.question, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "18px",
            fontStyle: "bold",
            color: "#FFFFFF",
            wordWrap: { width: this.W - 76 }
        }));

        item.options.forEach((opt, idx) => {
            const oy = panelY + 112 + idx * 60;
            const ow = this.W - 76;
            const btn = ButtonFactory.createButton({
                scene: this,
                x: 38 + ow / 2,
                y: oy + 24,
                text: `${String.fromCharCode(65 + idx)}.  ${opt}`,
                width: ow,
                height: 46,
                primaryColor: this.quizAnswered && idx === item.correctIndex ? UITheme.colors.bioGreen : 0x11366b,
                secondaryColor: 0x00e5ff,
                fontSize: "13.5px",
                onClick: () => {
                    if (this.quizAnswered) return;
                    if (idx === item.correctIndex) {
                        SoundFX.playClick();
                        this.quizScore += 1;
                        this.quizAnswered = true;
                        this.quizFeedback = `✔ Correct! ${item.explanation}`;
                        this.setDialogue("Bleep", "Affirmative! Great engineering answer!");
                    } else {
                        this.mistakesCorrected += 1;
                        SoundFX.playAlert();
                        this.quizFeedback = "⚠ Not quite — try again! Review how light-speed delay and orbital relays work.";
                        this.setDialogue("Commander Maya", "Give that question another try!");
                    }
                    this.renderStage();
                }
            });
            this.uiLayer.add(btn);
        });

        if (this.quizFeedback) {
            this.uiLayer.add(this.add.text(38, panelY + panelH - 84, this.quizFeedback, {
                fontFamily: UITheme.fonts.body,
                fontSize: "13px",
                fontStyle: "bold",
                color: this.quizAnswered ? "#2EE59D" : "#FFD23F",
                wordWrap: { width: this.W - 76 }
            }));
        }

        if (this.quizAnswered) {
            const nextBtn = ButtonFactory.createButton({
                scene: this,
                x: this.W / 2,
                y: panelY + panelH - 28,
                text: this.quizIndex < QUIZ_ITEMS.length - 1 ? "NEXT QUESTION →" : "VIEW MISSION COMPLETION REPORT →",
                width: 370,
                height: 42,
                primaryColor: 0xff8c1a,
                textColor: "#141008",
                fontSize: "14px",
                onClick: () => {
                    SoundFX.playClick();
                    if (this.quizIndex < QUIZ_ITEMS.length - 1) {
                        this.quizIndex += 1;
                        this.quizAnswered = false;
                        this.quizFeedback = "";
                        this.renderStage();
                    } else {
                        this.registry.set("sol3Completed", true);
                        const currentSol = (this.registry.get("solLevel") as number) || 1;
                        if (currentSol < 4) this.registry.set("solLevel", 4);
                        this.stage = "COMPLETE";
                        this.setDialogue(
                            "Commander Maya",
                            "Mission accomplished! You earned the MARS COMMUNICATION EXPERT badge!"
                        );
                        this.renderStage();
                    }
                }
            });
            this.uiLayer.add(nextBtn);
        }
    }

    // =========================================================================
    // COMPLETION SUMMARY & PROGRESSION
    // =========================================================================
    private renderCompleteStage() {
        const panelY = 86;
        const panelH = this.H - 206;

        const box = this.add.graphics();
        box.fillStyle(0x081d3d, 0.96);
        box.fillRoundedRect(16, panelY, this.W - 32, panelH, 14);
        box.lineStyle(3, 0xffd23f, 0.95);
        box.strokeRoundedRect(16, panelY, this.W - 32, panelH, 14);
        this.uiLayer.add(box);

        this.uiLayer.add(this.add.text(this.W / 2, panelY + 32, "🏅 BADGE EARNED: MARS COMMUNICATION EXPERT", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "24px",
            fontStyle: "bold",
            color: "#FFD23F"
        }).setOrigin(0.5));

        const reportLines = [
            `✔ Rover Destination Reached: Outpost Relay Beacon (${this.destinationReached ? "YES" : "CONFIRMED"})`,
            `✔ Samples Collected: ${this.samplesCollected.length} (${this.samplesCollected.join(", ") || "Canyon Core"})`,
            `✔ Data Packets Delivered: ${this.packetsDelivered} / 3 Priority Science Bundles`,
            `✔ Communication Windows Used: ${this.windowsUsed} (${this.selectedRelay.name})`,
            `✔ Mistakes Corrected: ${this.mistakesCorrected}`,
            `✔ Quiz Score: ${this.quizScore} / ${QUIZ_ITEMS.length}`,
            "★ Learning Achievements: Light-Speed Delay Planning • Orbital Relay Uplink • Bandwidth Prioritization"
        ];

        this.uiLayer.add(this.add.text(this.W / 2, panelY + 182, reportLines.join("\n"), {
            fontFamily: UITheme.fonts.body,
            fontSize: "15px",
            fontStyle: "bold",
            color: "#E8F6FF",
            align: "center",
            lineSpacing: 8
        }).setOrigin(0.5));

        const retryBtn = ButtonFactory.createButton({
            scene: this,
            x: this.W / 2 - 190,
            y: panelY + panelH - 34,
            text: "↻ RETRY SOL 3",
            width: 260,
            height: 46,
            primaryColor: 0x13386e,
            secondaryColor: 0x00e5ff,
            fontSize: "15px",
            onClick: () => {
                SoundFX.playClick();
                this.windowTimer?.remove();
                this.scene.restart();
            }
        });

        const continueBtn = ButtonFactory.createButton({
            scene: this,
            x: this.W / 2 + 190,
            y: panelY + panelH - 34,
            text: "CONTINUE TO SOL 4 →",
            width: 300,
            height: 46,
            primaryColor: 0xff8c1a,
            textColor: "#141008",
            fontSize: "15px",
            onClick: () => {
                SoundFX.playClick();
                this.windowTimer?.remove();
                this.scene.stop("Sol3RedGaleScene");
                this.scene.start("Sol4ISRUProductionScene");
            }
        });

        this.uiLayer.add([retryBtn, continueBtn]);
    }

    protected isTargetMet(): boolean {
        return this.stage === "COMPLETE" || this.dataDelivered;
    }

    private exitToMarsWorld() {
        SoundFX.playClick();
        this.windowTimer?.remove();
        this.scene.stop("Sol3RedGaleScene");
        this.scene.wake("MarsWorldScene");
    }
}

export default Sol3RedGaleScene;