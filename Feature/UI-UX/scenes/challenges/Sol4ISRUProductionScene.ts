import Phaser from "phaser";
import UITheme from "../../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../../components/ButtonFactory.ts";
import SolChallengeBaseScene from "./SolChallengeBaseScene.ts";

type Sol4Stage =
    | "INTRO"
    | "LEARN"
    | "MORNING"
    | "MORNING_ERROR"
    | "MORNING_GUIDANCE"
    | "MORNING_RETRY"
    | "AFTERNOON"
    | "AFTERNOON_ERROR"
    | "AFTERNOON_GUIDANCE"
    | "AFTERNOON_RETRY"
    | "GREENHOUSE"
    | "QUIZ"
    | "SUMMARY";

type Decision = "correct" | "incorrect" | null;

interface Sol4MissionState {
    stage: Sol4Stage;
    learningCard: number;
    morningDecision: Decision;
    afternoonDecision: Decision;
    morningWrongAttempts: number;
    afternoonWrongAttempts: number;
    water: number;
    oxygen: number;
    food: number;
    storedOxygen: number;
    iceMelterOn: boolean;
    moxieOn: boolean;
    ledFarmOn: boolean;
    suitportSealed: boolean;
    redLed: number;
    blueLed: number;
    co2Collected: number;
    cropProgress: number;
    growthComplete: boolean;
    harvestComplete: boolean;
    quizIndex: number;
    quizScore: number;
    quizComplete: boolean;
    missionCompleted: boolean;
}

interface QuizQuestion {
    question: string;
    answers: [string, string];
    correct: number;
}

interface ChoiceOption {
    chips: Array<{ label: string; on: boolean }>;
    description: string;
    correct: boolean;
}

const INITIAL_STATE: Sol4MissionState = {
    stage: "INTRO",
    learningCard: 0,
    morningDecision: null,
    afternoonDecision: null,
    morningWrongAttempts: 0,
    afternoonWrongAttempts: 0,
    water: 0,
    oxygen: 0,
    food: 0,
    storedOxygen: 0,
    iceMelterOn: false,
    moxieOn: false,
    ledFarmOn: false,
    suitportSealed: true,
    redLed: 50,
    blueLed: 50,
    co2Collected: 0,
    cropProgress: 0,
    growthComplete: false,
    harvestComplete: false,
    quizIndex: 0,
    quizScore: 0,
    quizComplete: false,
    missionCompleted: false
};

/** One neutral colour for ALL answer choices so the correct option is never given away by its outline. */
const CHOICE_COLOR = UITheme.colors.cosmicPurple;
const CHOICE_COLOR_STR = UITheme.colors.cosmicPurpleStr;

/** Content column that stays clear of Maya (left) and Bleep (right). */
const COL_X = 240;
const COL_W = 800;

/** The intro screen is designed on this canvas and then uniformly scaled to fit the viewport. */
const INTRO_W = 1128;
const INTRO_H = 504;
/** Space reserved above the intro panel for the base scene's header/visor. */
const INTRO_TOP_LIMIT = 96;
const INTRO_BOTTOM_MARGIN = 16;
const INTRO_SIDE_MARGIN = 24;
/** Keep the mission UI above the base scene's background and decorative layers. */
const MISSION_UI_DEPTH = 900;

export class Sol4ISRUProductionScene extends SolChallengeBaseScene {
    private readonly state: Sol4MissionState = { ...INITIAL_STATE };
    private readonly stageContainer = () => this.add.container(0, 0).setDepth(MISSION_UI_DEPTH);
    private missionUi!: Phaser.GameObjects.Container;
    private quizFeedback?: Phaser.GameObjects.Text;
    private greenhouseFeedback?: Phaser.GameObjects.Text;
    private greenhouseStartButtonAdded = false;
    private greenhouseStartButton?: Phaser.GameObjects.Container;

    /** Tweens used by the intro screen (twinkling stars, button glow, floating characters). */
    private introTweens: Phaser.Tweens.Tween[] = [];
    private introStarting = false;

    /** Randomised each run so the correct answer isn't always on the same side. */
    private morningCorrectFirst = true;
    private afternoonCorrectFirst = true;
    private quizOrder: number[][] = [[0, 1], [0, 1]];

    private readonly quiz: QuizQuestion[] = [
        {
            question: "Why did turning on LED lights before the Ice Melter trigger an alert?",
            answers: ["Plants need liquid water before they can grow.", "LED lights cannot operate on Mars."],
            correct: 0
        },
        {
            question: "How were we able to unplug MOXIE in the afternoon safely?",
            answers: ["We had already stored enough oxygen during the morning.", "MOXIE is not needed anywhere on Mars."],
            correct: 0
        }
    ];

    constructor() {
        super("Sol4ISRUProductionScene", {
            solNumber: 4,
            title: "SOL 4: AIR, ICE & LED POTATOES",
            codename: "CLOSED-LOOP RESOURCE SEQUENCING",
            hazardBadge: "OXYGEN & FOOD SUPPLY CRITICAL",
            briefing: "Earth supply drops are months away. Produce oxygen from Mars air, melt buried ice, and grow dwarf potatoes with limited Kilopower electricity.",
            nasaFact: "MOXIE made oxygen from Mars's carbon-dioxide atmosphere at approximately 800°C. Plants still need liquid water before LED light can help them grow.",
            primaryTarget: "Sequence oxygen, water, power, and food production safely.",
            unit: "Mission",
            targetVal: 1,
            initialVal: 0
        });
    }

    protected createChallengeContent() {
        // Scene instances are reused by Phaser, so start every run from a clean state.
        Object.assign(this.state, INITIAL_STATE);
        this.greenhouseStartButtonAdded = false;
        this.greenhouseStartButton = undefined;
        this.introStarting = false;
        this.introTweens = [];
        this.morningCorrectFirst = Math.random() < 0.5;
        this.afternoonCorrectFirst = Math.random() < 0.5;
        this.quizOrder = this.quiz.map(() => (Math.random() < 0.5 ? [0, 1] : [1, 0]));

        // Listener hygiene: register exactly once per run and always remove on shutdown.
        this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize);
        this.scale.on(Phaser.Scale.Events.RESIZE, this.handleResize);
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.handleShutdown);

        this.createMartianSurfaceBase(0x10182B, 0x9E5544, 0x643326);
        this.missionUi = this.stageContainer();
        this.renderStage();
    }

    private readonly handleResize = () => {
        // Only the intro is laid out from the viewport size; other stages use the fixed 1280x720 layout.
        if (this.state.stage === "INTRO" && this.missionUi?.active) {
            this.renderStage();
        }
    };

    private readonly handleShutdown = () => {
        this.scale.off(Phaser.Scale.Events.RESIZE, this.handleResize);
        this.clearIntroTweens();
    };

    private clearIntroTweens() {
        this.introTweens.forEach((tween) => tween.remove());
        this.introTweens = [];
    }

    private renderStage() {
        // Stop intro tweens BEFORE their targets are destroyed by removeAll(true)
        this.clearIntroTweens();
        this.missionUi.removeAll(true);
        this.quizFeedback = undefined;
        this.greenhouseFeedback = undefined;
        this.greenhouseStartButtonAdded = false;
        this.greenhouseStartButton = undefined;

        switch (this.state.stage) {
            case "INTRO":
                this.renderIntroduction();
                break;
            case "LEARN":
                this.renderLearningCard();
                break;
            case "MORNING":
                this.renderMorningDecision();
                break;
            case "MORNING_ERROR":
                this.renderError("CRITICAL: WATER TANK AT 0%!", "Plants can't drink light!", UITheme.colors.emergencyRed);
                break;
            case "MORNING_GUIDANCE":
                this.renderGuidance(
                    "Commander Maya: NASA CEA farms need melted ice water before turning on LEDs.",
                    "Set Ice Melter ON, MOXIE ON, and LED Farm OFF."
                );
                break;
            case "MORNING_RETRY":
                this.renderRetry("CORRECT THE MORNING POWER ROUTING", "Ice Melter + MOXIE ON • LED Farm OFF", () => this.correctMorning());
                break;
            case "AFTERNOON":
                this.renderAfternoonDecision();
                break;
            case "AFTERNOON_ERROR":
                this.renderError("ALERT: FOOD CRITICAL & TOXIC DUST!", "Oxygen is already 75%!", UITheme.colors.cosmicPurple);
                break;
            case "AFTERNOON_GUIDANCE":
                this.renderGuidance(
                    "Commander Maya: You banked enough O2 this morning—divert power to LED crops!",
                    "Switch MOXIE OFF, keep the suitport SEALED, and power the LED Farm."
                );
                break;
            case "AFTERNOON_RETRY":
                this.renderRetry("CORRECT THE AFTERNOON POWER SWAP", "MOXIE OFF • LED Farm ON • Suitport SEALED", () => this.correctAfternoon());
                break;
            case "GREENHOUSE":
                this.renderGreenhouse();
                break;
            case "QUIZ":
                this.renderQuiz();
                break;
            case "SUMMARY":
                this.renderSummary();
                break;
        }
    }

    // ------------------------------------------------------------------
    // Shared UI helpers
    // ------------------------------------------------------------------

    private addText(text: string, x: number, y: number, style: Phaser.Types.GameObjects.Text.TextStyle = {}) {
        const label = this.add.text(x, y, text, {
            fontFamily: UITheme.fonts.body,
            fontSize: "16px",
            color: UITheme.colors.textPrimary,
            align: "center",
            wordWrap: { width: 900 },
            ...style
        }).setOrigin(0.5);
        this.missionUi.add(label);
        return label;
    }

    private addPanel(x: number, y: number, width: number, height: number, color = UITheme.colors.panelBg, border = UITheme.colors.primaryCyan) {
        const panel = this.add.graphics();
        panel.fillStyle(color, 0.97);
        panel.fillRoundedRect(x, y, width, height, 16);
        panel.lineStyle(2, border, 0.9);
        panel.strokeRoundedRect(x, y, width, height, 16);
        this.missionUi.add(panel);
        return panel;
    }

    private addButton(text: string, x: number, y: number, onClick: () => void, color = UITheme.colors.primaryCyan, width = 300) {
        const button = ButtonFactory.createButton({
            scene: this,
            x,
            y,
            width,
            height: 44,
            text,
            primaryColor: color,
            secondaryColor: UITheme.colors.cardBg,
            fontSize: "13px",
            onClick
        });
        this.missionUi.add(button);
        return button;
    }

    private addFitted(
        key: string,
        x: number,
        bottom: number,
        maxW: number,
        maxH: number,
        parent: Phaser.GameObjects.Container = this.missionUi
    ): Phaser.GameObjects.Image | undefined {
        if (!this.textures.exists(key)) return undefined;
        const img = this.add.image(x, bottom, key).setOrigin(0.5, 1);
        img.setScale(Math.min(maxW / img.width, maxH / img.height));
        parent.add(img);
        return img;
    }

    /** Commander Maya on the left, Bleep the rover on the right (existing textures). */
    private addCompanions(maya = true, bleep = true) {
        if (maya) this.addFitted("girl-astronaut", 120, 650, 210, 400);
        if (bleep) this.addFitted("rover", 1165, 650, 170, 120);
    }

    private renderHeader(title: string, subtitle: string) {
        this.addText(title, 640, 105, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "25px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
        this.addText(subtitle, 640, 140, {
            fontSize: "15px",
            color: UITheme.colors.primaryCyanStr
        });
    }

    private drawIcon(kind: "water" | "power" | "moxie" | "sequence", x: number, y: number) {
        const g = this.add.graphics();
        this.missionUi.add(g);
        if (kind === "water") {
            g.fillStyle(0x62dfff, 1);
            g.fillCircle(x, y + 8, 18);
            g.fillTriangle(x, y - 26, x - 16, y + 2, x + 16, y + 2);
        } else if (kind === "power") {
            g.lineStyle(3, 0xffffff, 1);
            g.strokeRoundedRect(x - 45, y - 16, 90, 32, 6);
            g.fillStyle(UITheme.colors.bioGreen, 1);
            for (let i = 0; i < 4; i += 1) g.fillRect(x - 40 + i * 21, y - 11, 17, 22);
            g.fillStyle(0xffffff, 1);
            g.fillRect(x + 45, y - 6, 5, 12);
        } else if (kind === "moxie") {
            g.fillStyle(0xeef2f7, 1);
            g.fillRoundedRect(x - 34, y - 26, 68, 52, 6);
            g.fillStyle(0x0b2b40, 1);
            g.fillRoundedRect(x - 20, y - 14, 40, 28, 4);
            this.addText("O₂", x, y, { fontFamily: UITheme.fonts.heading, fontSize: "16px", color: "#4de3ff", fontStyle: "bold" });
        } else {
            g.lineStyle(3, 0xffc928, 1);
            [-1, 0].forEach((i) => g.lineBetween(x + i * 50 + 14, y, x + i * 50 + 36, y));
            [UITheme.colors.primaryCyan, 0x62dfff, UITheme.colors.bioGreen].forEach((c, i) => {
                g.fillStyle(c, 1);
                g.fillCircle(x - 50 + i * 50, y, 12);
            });
        }
    }

    // ------------------------------------------------------------------
    // 1. Mission introduction (illustrated scene + START MISSION button)
    //
    // Everything is drawn on a fixed INTRO_W x INTRO_H design canvas inside
    // one container. That container is uniformly scaled and centred to fit
    // the current viewport, so the panel, artwork and button always stay
    // inside the visible game area (fullscreen or windowed).
    // ------------------------------------------------------------------

    private renderIntroduction() {
        const { width, height } = this.scale;
        const availW = width - INTRO_SIDE_MARGIN * 2 - 12;
        const availH = height - INTRO_TOP_LIMIT - INTRO_BOTTOM_MARGIN - 12;
        const s = Math.max(0.3, Math.min(availW / INTRO_W, availH / INTRO_H, 1.25));
        const w = INTRO_W * s;
        const h = INTRO_H * s;
        const x0 = Math.round((width - w) / 2);
        const y0 = Math.round(INTRO_TOP_LIMIT + 6 + (availH - h) / 2);

        // Cyan glowing frame around the main mission panel
        const frame = this.add.graphics();
        frame.fillStyle(0x07152e, 1);
        frame.fillRoundedRect(x0 - 6, y0 - 6, w + 12, h + 12, 18);
        frame.lineStyle(9, 0x00e5ff, 0.16);
        frame.strokeRoundedRect(x0 - 6, y0 - 6, w + 12, h + 12, 18);
        frame.lineStyle(2.5, 0x00e5ff, 0.95);
        frame.strokeRoundedRect(x0 - 6, y0 - 6, w + 12, h + 12, 18);
        this.missionUi.add(frame);

        const root = this.add.container(x0, y0).setScale(s);
        this.missionUi.add(root);

        const W = INTRO_W;
        const H = INTRO_H;
        const cx = W / 2;

        // ---------- Background: space, stars, NASA terrain ----------
        const sky = this.add.graphics();
        sky.fillStyle(0x07152e, 1);
        sky.fillRoundedRect(0, 0, W, H, 12);
        sky.fillStyle(0x0d2147, 0.8);
        sky.fillRect(0, 0, W, 90);
        root.add(sky);

        const stars = this.add.graphics();
        stars.fillStyle(0xc8edff, 0.75);
        for (let i = 0; i < 55; i += 1) {
            stars.fillCircle(10 + ((i * 197) % (W - 20)), 8 + ((i * 83) % 190), i % 5 === 0 ? 1.8 : 1);
        }
        root.add(stars);

        // A few twinkling stars (tracked so they are cleaned up)
        for (let i = 0; i < 8; i += 1) {
            const twinkle = this.add.circle(40 + ((i * 331) % (W - 80)), 16 + ((i * 67) % 120), 2, 0xffffff, 0.9);
            root.add(twinkle);
            this.introTweens.push(this.tweens.add({
                targets: twinkle,
                alpha: 0.15,
                duration: 900 + i * 170,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            }));
        }

        const terrainTop = 150;
        const terrain = this.addCoverImage(root, "mars_terrain", 0, terrainTop, W, H - terrainTop);
        if (terrain) {
            terrain.setTint(0xe29a78);
            terrain.setAlpha(0.95);
        } else {
            const ground = this.add.graphics();
            ground.fillStyle(0x9e4a38, 1);
            ground.fillRect(0, terrainTop, W, H - terrainTop);
            ground.fillStyle(0xc85a3c, 1);
            ground.fillTriangle(cx - 220, H, cx, terrainTop + 40, cx + 220, H);
            root.add(ground);
        }
        this.addFade(root, 0, terrainTop, W, 70, 0x07152e, 1, 0);
        this.addFade(root, 0, H - 110, W, 110, 0x1a0a14, 0, 0.7);

        // Mars planet (top-right, clear of the title)
        const planet = this.add.graphics();
        planet.fillStyle(0xd96848, 1);
        planet.fillCircle(W - 78, 64, 30);
        planet.fillStyle(0xa9443e, 0.55);
        planet.fillCircle(W - 88, 55, 6);
        planet.fillCircle(W - 66, 74, 8);
        planet.lineStyle(2, 0xff9a5c, 0.8);
        planet.strokeCircle(W - 78, 64, 30);
        root.add(planet);

        // ---------- Title + subtitle ----------
        const title = this.add.text(cx, 50, "SOL 4 – AIR, ICE & LED POTATOES", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "34px",
            fontStyle: "bold",
            color: "#fff8df",
            stroke: "#ff7347",
            strokeThickness: 4,
            letterSpacing: 1
        }).setOrigin(0.5);
        if (title.width > 860) title.setScale(860 / title.width);
        const subtitle = this.add.text(cx, 96, "Make oxygen, melt Martian ice, and grow your own potatoes!", {
            fontFamily: UITheme.fonts.body,
            fontSize: "17px",
            color: "#fff8df",
            align: "center"
        }).setOrigin(0.5);
        if (subtitle.width > 760) subtitle.setScale(760 / subtitle.width);
        const underline = this.add.graphics();
        underline.lineStyle(3, UITheme.colors.solarGold, 0.9);
        underline.lineBetween(cx - 240, 76, cx + 240, 76);
        root.add([underline, title, subtitle]);

        // ---------- Characters (existing assets) ----------
        const astronaut = this.addFitted("girl-astronaut", 118, 440, 200, 300, root);
        const rover = this.addFitted("rover", W - 108, 440, 160, 112, root);
        [astronaut, rover].forEach((img, i) => {
            if (!img) return;
            this.introTweens.push(this.tweens.add({
                targets: img,
                y: img.y - 5,
                duration: 1800 + i * 400,
                yoyo: true,
                repeat: -1,
                ease: "Sine.easeInOut"
            }));
        });

        // ---------- Three mission stages ----------
        const stageBottom = 286;
        const stageGap = 240;
        const colX = [cx - stageGap, cx, cx + stageGap];

        const pedestals = this.add.graphics();
        colX.forEach((x) => {
            pedestals.fillStyle(0x6a2f26, 0.9);
            pedestals.fillEllipse(x, stageBottom + 4, 196, 30);
            pedestals.fillStyle(0xb5563a, 0.95);
            pedestals.fillEllipse(x, stageBottom, 190, 24);
        });
        root.add(pedestals);

        this.drawMoxie(root, colX[0], stageBottom - 6);
        this.drawIceAndTank(root, colX[1], stageBottom - 6);
        if (!this.addFitted("greenhouse", colX[2], stageBottom - 6, 180, 140, root)) {
            this.drawFallbackGreenhouse(root, colX[2], stageBottom - 6);
        }

        const arrows = this.add.graphics();
        arrows.lineStyle(7, 0xffc928, 1);
        [cx - stageGap / 2, cx + stageGap / 2].forEach((ax) => {
            arrows.beginPath();
            arrows.moveTo(ax - 8, 196);
            arrows.lineTo(ax + 8, 214);
            arrows.lineTo(ax - 8, 232);
            arrows.strokePath();
        });
        root.add(arrows);

        const pillY = 314;
        const stages: Array<{ label: string; caption: string; icon: "oxygen" | "water" | "food" }> = [
            { label: "OXYGEN", caption: "Make oxygen\nfrom Mars air.", icon: "oxygen" },
            { label: "WATER", caption: "Melt buried ice\nfor water.", icon: "water" },
            { label: "GROW FOOD", caption: "Grow potatoes\nunder LED lights.", icon: "food" }
        ];
        stages.forEach((stage, i) => {
            const x = colX[i];
            const pill = this.add.graphics();
            pill.fillStyle(0x062346, 0.97);
            pill.fillRoundedRect(x - 105, pillY - 19, 210, 38, 19);
            pill.lineStyle(2.5, 0x00dfff, 1);
            pill.strokeRoundedRect(x - 105, pillY - 19, 210, 38, 19);
            this.drawStageIcon(pill, stage.icon, x - 72, pillY);
            root.add(pill);
            const label = this.add.text(x + 14, pillY, stage.label, {
                fontFamily: UITheme.fonts.heading, fontSize: "17px", fontStyle: "bold", color: "#ffffff"
            }).setOrigin(0.5);
            const caption = this.add.text(x, pillY + 30, stage.caption, {
                fontFamily: UITheme.fonts.body,
                fontSize: "15px",
                color: "#fff8df",
                align: "center",
                lineSpacing: 2,
                stroke: "#1a0a14",
                strokeThickness: 3,
                wordWrap: { width: 200 }
            }).setOrigin(0.5, 0);
            root.add([label, caption]);
        });

        // ---------- NASA terrain attribution (only meaningful if the NASA texture is used) ----------
        if (terrain) {
            const attribution = this.add.text(W - 14, H - 8, "NASA Mars Trek terrain mosaic • Jezero Crater, Mars", {
                fontFamily: UITheme.fonts.body,
                fontSize: "12px",
                color: "#9ff0ff",
                stroke: "#1a0a14",
                strokeThickness: 3
            }).setOrigin(1, 1);
            root.add(attribution);
        }

        // ---------- START MISSION (bottom-centre, fully inside the panel, added LAST so it is on top) ----------
        const startButton = this.createStartMissionButton(cx, H - 50, 380, 64, () => this.startMission());
        root.add(startButton);
    }

    /** Large rounded button: whole area interactive, glow pulse, hover/out/down feedback. */
    private createStartMissionButton(x: number, y: number, w: number, h: number, onActivate: () => void) {
        const button = this.add.container(x, y);
        const glow = this.add.graphics();
        const face = this.add.graphics();
        const label = this.add.text(0, 0, "🚀 START MISSION", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "26px",
            fontStyle: "bold",
            color: "#ffffff",
            stroke: "#8a3b00",
            strokeThickness: 4
        }).setOrigin(0.5);
        if (label.width > w - 40) label.setScale((w - 40) / label.width);

        const draw = (mode: "idle" | "hover" | "down") => {
            const hot = mode !== "idle";
            glow.clear();
            glow.fillStyle(0xffa000, hot ? 0.38 : 0.22);
            glow.fillRoundedRect(-w / 2 - 10, -h / 2 - 10, w + 20, h + 20, h / 2 + 10);
            face.clear();
            face.fillStyle(mode === "down" ? 0xe06a00 : hot ? 0xffa51f : 0xff8a00, 1);
            face.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
            face.fillStyle(0xffffff, 0.2);
            face.fillRoundedRect(-w / 2 + 10, -h / 2 + 6, w - 20, h / 2 - 6, (h / 2 - 6) / 2);
            face.lineStyle(3, 0xffd600, 1);
            face.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
        };
        draw("idle");

        button.add([glow, face, label]);
        button.setSize(w, h);
        button.setInteractive({ useHandCursor: true });

        this.introTweens.push(this.tweens.add({
            targets: glow,
            alpha: 0.45,
            duration: 900,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        }));

        button.on("pointerover", () => {
            SoundFX.playHover();
            draw("hover");
            button.setScale(1.04);
        });
        button.on("pointerout", () => {
            draw("idle");
            button.setScale(1);
        });
        button.on("pointerdown", () => {
            draw("down");
            button.setScale(0.97);
        });
        button.on("pointerup", () => {
            draw("hover");
            button.setScale(1.04);
            onActivate();
        });
        return button;
    }

    /** Leaves the intro and enters the existing gameplay flow (Learn Before Playing). Does not complete or unlock anything. */
    private startMission() {
        if (this.introStarting || this.state.stage !== "INTRO") return;
        this.introStarting = true;
        SoundFX.playClick();
        this.state.stage = "LEARN";
        this.renderStage();
    }

    private addCoverImage(
        parent: Phaser.GameObjects.Container,
        key: string,
        x: number,
        y: number,
        w: number,
        h: number
    ): Phaser.GameObjects.Image | undefined {
        if (!this.textures.exists(key)) return undefined;
        const img = this.add.image(x + w / 2, y + h / 2, key);
        const tw = img.width;
        const th = img.height;
        const s = Math.max(w / tw, h / th);
        img.setScale(s);
        const cw = w / s;
        const ch = h / s;
        img.setCrop((tw - cw) / 2, (th - ch) / 2, cw, ch);
        parent.add(img);
        return img;
    }

    /** Vertical fade made from stacked strips (avoids gradient APIs that differ between Phaser versions). */
    private addFade(
        parent: Phaser.GameObjects.Container,
        x: number,
        y: number,
        w: number,
        h: number,
        color: number,
        fromAlpha: number,
        toAlpha: number,
        steps = 16
    ) {
        const g = this.add.graphics();
        const stripH = h / steps;
        for (let i = 0; i < steps; i += 1) {
            g.fillStyle(color, fromAlpha + (toAlpha - fromAlpha) * (i / (steps - 1)));
            g.fillRect(x, y + i * stripH, w, Math.ceil(stripH) + 1);
        }
        parent.add(g);
    }

    private drawStageIcon(g: Phaser.GameObjects.Graphics, icon: "oxygen" | "water" | "food", x: number, y: number) {
        if (icon === "oxygen") {
            g.lineStyle(3, 0x75e8ff, 1);
            g.lineBetween(x - 12, y - 7, x + 10, y - 7);
            g.lineBetween(x - 16, y, x + 14, y);
            g.lineBetween(x - 10, y + 7, x + 8, y + 7);
        } else if (icon === "water") {
            g.fillStyle(0x62dfff, 1);
            g.fillCircle(x, y + 3, 8);
            g.fillTriangle(x, y - 13, x - 7, y, x + 7, y);
        } else {
            g.fillStyle(0x52e26a, 1);
            g.fillEllipse(x - 5, y - 3, 14, 9);
            g.fillEllipse(x + 6, y - 6, 14, 9);
            g.lineStyle(2.5, 0x52e26a, 1);
            g.lineBetween(x, y + 10, x, y - 2);
        }
    }

    /** Child-friendly MOXIE oxygen machine (illustration, not NASA imagery). */
    private drawMoxie(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.add.graphics();
        g.lineStyle(9, 0x9aa7b5, 1);
        g.beginPath();
        g.moveTo(x + 24, bottom - 88);
        g.lineTo(x + 30, bottom - 108);
        g.lineTo(x + 48, bottom - 116);
        g.lineTo(x + 60, bottom - 104);
        g.lineTo(x + 62, bottom - 78);
        g.lineTo(x + 62, bottom - 26);
        g.strokePath();
        g.fillStyle(0xe8742a, 1);
        g.fillRoundedRect(x - 64, bottom - 14, 128, 14, 5);
        g.fillStyle(0xeef2f7, 1);
        g.fillRoundedRect(x - 56, bottom - 92, 112, 80, 10);
        g.lineStyle(3, 0x9fb4c8, 1);
        g.strokeRoundedRect(x - 56, bottom - 92, 112, 80, 10);
        g.lineStyle(2, 0x9fb4c8, 1);
        [0, 1, 2].forEach((i) => g.lineBetween(x - 48, bottom - 78 + i * 7, x - 36, bottom - 78 + i * 7));
        g.fillStyle(0x0b2b40, 1);
        g.fillRoundedRect(x - 32, bottom - 54, 64, 36, 6);
        g.lineStyle(2, 0x22d3ee, 1);
        g.strokeRoundedRect(x - 32, bottom - 54, 64, 36, 6);
        parent.add(g);

        const name = this.add.text(x - 6, bottom - 74, "MOXIE", {
            fontFamily: UITheme.fonts.heading, fontSize: "14px", fontStyle: "bold", color: "#0e1a32"
        }).setOrigin(0.5);
        const o2 = this.add.text(x, bottom - 36, "O₂", {
            fontFamily: UITheme.fonts.heading, fontSize: "20px", fontStyle: "bold", color: "#4de3ff"
        }).setOrigin(0.5);
        parent.add([name, o2]);
    }

    /** Ice crystals + water container (ice extraction / melting equipment). */
    private drawIceAndTank(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.add.graphics();
        const ox = x - 8;
        const crystal = (pts: Array<[number, number]>) => {
            const points = pts.map(([px, py]) => new Phaser.Math.Vector2(ox + px, bottom + py));
            g.fillStyle(0xbfe8ff, 0.95);
            g.fillPoints(points, true);
            g.lineStyle(2, 0xffffff, 0.9);
            g.strokePoints(points, true);
        };
        crystal([[-84, -2], [-76, -26], [-64, -2]]);
        crystal([[-72, -2], [-58, -56], [-42, -72], [-26, -40], [-22, -2]]);
        crystal([[-44, -2], [-30, -32], [-16, -2]]);
        g.fillStyle(0x1e90d8, 0.9);
        g.fillRoundedRect(ox, bottom - 92, 66, 88, 10);
        g.lineStyle(3, 0xbfe8ff, 1);
        g.strokeRoundedRect(ox, bottom - 92, 66, 88, 10);
        g.fillStyle(0x8793a3, 1);
        g.fillRoundedRect(ox + 6, bottom - 104, 54, 14, 5);
        g.fillStyle(0xe8fbff, 1);
        g.fillCircle(ox + 33, bottom - 40, 10);
        g.fillTriangle(ox + 33, bottom - 66, ox + 24, bottom - 46, ox + 42, bottom - 46);
        parent.add(g);
    }

    /** Only used if the existing "greenhouse" texture is missing. */
    private drawFallbackGreenhouse(parent: Phaser.GameObjects.Container, x: number, bottom: number) {
        const g = this.add.graphics();
        g.fillStyle(0x9fd8ff, 0.35);
        g.beginPath();
        g.arc(x, bottom - 10, 74, Math.PI, 0, false);
        g.closePath();
        g.fillPath();
        g.lineStyle(3, 0xcfeeff, 0.9);
        g.beginPath();
        g.arc(x, bottom - 10, 74, Math.PI, 0, false);
        g.strokePath();
        g.fillStyle(0x6b3b24, 1);
        g.fillRect(x - 70, bottom - 12, 140, 10);
        g.fillStyle(0x3da94b, 1);
        [-40, -10, 24, 50].forEach((dx) => g.fillCircle(x + dx, bottom - 24, 12));
        g.fillStyle(0xd9a441, 1);
        g.fillEllipse(x + 40, bottom - 10, 24, 14);
        parent.add(g);
    }

    // ------------------------------------------------------------------
    // 2. Learn before playing (two science cards per page)
    // ------------------------------------------------------------------

    private renderLearningCard() {
        const pages: Array<Array<{ title: string; icon: "water" | "power" | "moxie" | "sequence"; body: string; tip: string }>> = [
            [
                { title: "WATER FIRST!", icon: "water", body: "Plants and astronauts need liquid water before anything can grow.", tip: "Light alone cannot hydrate potato roots." },
                { title: "LIMITED POWER!", icon: "power", body: "MOXIE and the LED Potato Farm cannot run at full power at the same time in this simplified simulation.", tip: "Sequence the high-power systems instead of overloading Kilopower." }
            ],
            [
                { title: "MOXIE MAKES OXYGEN", icon: "moxie", body: "MOXIE extracts oxygen from Mars's mostly carbon-dioxide atmosphere.", tip: "Its solid-oxide system operates at approximately 800°C." },
                { title: "RESOURCE SEQUENCING", icon: "sequence", body: "Make and store enough oxygen first, then redirect power to the greenhouse.", tip: "Stored oxygen lets us safely unplug MOXIE in the afternoon." }
            ]
        ];
        const page = pages[Math.min(this.state.learningCard, pages.length - 1)];

        this.addCompanions();
        this.renderHeader("LEARN BEFORE PLAYING", `BLEEP SCIENCE CARDS ${this.state.learningCard + 1} OF ${pages.length}`);

        page.forEach((card, i) => {
            const x = COL_X + i * 410;
            this.addPanel(x, 175, 390, 300, UITheme.colors.cardBg, UITheme.colors.primaryCyan);
            this.addText(card.title, x + 195, 212, {
                fontFamily: UITheme.fonts.heading, fontSize: "19px", color: UITheme.colors.solarGoldStr, fontStyle: "bold"
            });
            this.drawIcon(card.icon, x + 195, 275);
            this.addText(card.body, x + 195, 358, { fontSize: "15px", lineSpacing: 4, wordWrap: { width: 330 } });
            this.addText(`Bleep: ${card.tip}`, x + 195, 432, {
                fontSize: "13px", color: UITheme.colors.primaryCyanStr, wordWrap: { width: 330 }
            });
        });

        const last = this.state.learningCard === pages.length - 1;
        this.addButton(last ? "BEGIN MORNING DECISION" : "NEXT SCIENCE CARDS", 640, 545, () => {
            if (!last) {
                this.state.learningCard++;
            } else {
                this.state.stage = "MORNING";
            }
            this.renderStage();
        }, UITheme.colors.primaryCyan, 320);
    }

    // ------------------------------------------------------------------
    // 3 & 5. Morning / afternoon decisions (uniform purple choices)
    // ------------------------------------------------------------------

    private renderMorningDecision() {
        this.addCompanions();
        this.renderHeader("MORNING — WATER & OXYGEN SETUP", "Choose one configuration. Plants need water before LED light.");
        this.addResourceStrip(0);
        this.addText("Exactly one safe sequence keeps both air and water production online.", 640, 195, { color: UITheme.colors.textSecondary });

        const correct: ChoiceOption = {
            chips: [{ label: "MOXIE ON", on: true }, { label: "ICE MELTER ON", on: true }, { label: "LED FARM OFF", on: false }],
            description: "Turn on MOXIE and the Ice Melter. Keep the LED Farm off.",
            correct: true
        };
        const wrong: ChoiceOption = {
            chips: [{ label: "MOXIE ON", on: true }, { label: "ICE MELTER OFF", on: false }, { label: "LED FARM ON", on: true }],
            description: "Turn on MOXIE and the LED Farm. Keep the Ice Melter off.",
            correct: false
        };
        this.addChoices(this.morningCorrectFirst ? [correct, wrong] : [wrong, correct], (ok) => this.chooseMorning(ok));
    }

    private renderAfternoonDecision() {
        this.addCompanions();
        this.renderHeader("AFTERNOON — NOON DUST SQUALL", "Water is ready, oxygen is stored, and a toxic dust squall is approaching.");
        this.addResourceStrip(60);
        this.addText("Redirect limited Kilopower to food production while keeping the habitat sealed.", 640, 195, { color: UITheme.colors.textSecondary });

        const correct: ChoiceOption = {
            chips: [{ label: "MOXIE OFF", on: false }, { label: "LED FARM ON", on: true }, { label: "SUITPORT SEALED", on: true }],
            description: "Switch MOXIE off, power the LED Farm, and keep the suitport sealed.",
            correct: true
        };
        const wrong: ChoiceOption = {
            chips: [{ label: "MOXIE ON", on: true }, { label: "LED FARM OFF", on: false }, { label: "SUITPORT OPEN", on: true }],
            description: "Keep MOXIE running, leave the LED Farm off, and open the suitport.",
            correct: false
        };
        this.addChoices(this.afternoonCorrectFirst ? [correct, wrong] : [wrong, correct], (ok) => this.chooseAfternoon(ok));
    }

    /** Two identical-looking purple option cards. Nothing visual reveals which is correct. */
    private addChoices(options: ChoiceOption[], onPick: (correct: boolean) => void) {
        options.forEach((option, index) => {
            const x = COL_X + index * 410;
            this.addPanel(x, 235, 390, 270, UITheme.colors.cardBg, CHOICE_COLOR);
            this.addText(index === 0 ? "OPTION A" : "OPTION B", x + 195, 268, {
                fontFamily: UITheme.fonts.heading, fontSize: "19px", color: CHOICE_COLOR_STR, fontStyle: "bold"
            });
            this.addChips(x + 12, 322, option.chips);
            this.addText(option.description, x + 195, 395, { fontSize: "15px", lineSpacing: 4, wordWrap: { width: 340 } });
            this.addButton("SELECT CONFIGURATION", x + 195, 470, () => onPick(option.correct), CHOICE_COLOR, 300);
        });
    }

    private addChips(x: number, y: number, chips: Array<{ label: string; on: boolean }>) {
        const chipW = 118;
        const gap = 6;
        chips.forEach((chip, i) => {
            const cx = x + i * (chipW + gap);
            const g = this.add.graphics();
            g.fillStyle(chip.on ? CHOICE_COLOR : 0x1a2540, chip.on ? 0.85 : 0.9);
            g.fillRoundedRect(cx, y - 15, chipW, 30, 15);
            g.lineStyle(2, CHOICE_COLOR, 1);
            g.strokeRoundedRect(cx, y - 15, chipW, 30, 15);
            this.missionUi.add(g);
            this.addText(chip.label, cx + chipW / 2, y, {
                fontFamily: UITheme.fonts.heading, fontSize: "10px", color: "#ffffff", fontStyle: "bold", wordWrap: { width: chipW - 8 }
            });
        });
    }

    // ------------------------------------------------------------------
    // 4. Mistake & guidance
    // ------------------------------------------------------------------

    private renderError(title: string, bleep: string, color: number) {
        this.addCompanions();
        this.renderHeader("MISTAKE DETECTION", "THE SIMULATION FOUND AN UNSAFE CONFIGURATION");
        this.addPanel(COL_X, 185, COL_W, 360, 0x241322, color);
        this.addText(title, 640, 245, { fontFamily: UITheme.fonts.heading, fontSize: "25px", color: Phaser.Display.Color.IntegerToColor(color).rgba, fontStyle: "bold", wordWrap: { width: COL_W - 40 } });
        this.addText(`Bleep: "${bleep}"`, 640, 310, { fontSize: "22px", color: UITheme.colors.textPrimary });
        if (this.state.morningDecision === "incorrect") {
            this.addText("WATER TANK  0%", 385, 405, { fontFamily: UITheme.fonts.heading, fontSize: "16px", color: UITheme.colors.emergencyRedStr, fontStyle: "bold" });
            this.addText("🥔  DRY ROOTS", 640, 405, { fontSize: "17px", color: UITheme.colors.emergencyRedStr, fontStyle: "bold" });
            this.addText("LED FARM: NO WATER", 895, 405, { fontFamily: UITheme.fonts.heading, fontSize: "13px", color: UITheme.colors.emergencyRedStr, fontStyle: "bold" });
        } else {
            this.addText("FOOD: CRITICAL", 385, 405, { fontFamily: UITheme.fonts.heading, fontSize: "15px", color: UITheme.colors.emergencyRedStr, fontStyle: "bold" });
            this.addText("MOXIE: POWER DRAW", 640, 405, { fontFamily: UITheme.fonts.heading, fontSize: "15px", color: UITheme.colors.solarGoldStr, fontStyle: "bold" });
            this.addText("☣ SUITPORT OPEN", 895, 405, { fontFamily: UITheme.fonts.heading, fontSize: "15px", color: UITheme.colors.cosmicPurpleStr, fontStyle: "bold" });
        }
        this.addButton("UNDERSTAND THE WARNING", 640, 510, () => {
            this.state.stage = this.state.morningDecision === "incorrect" ? "MORNING_GUIDANCE" : "AFTERNOON_GUIDANCE";
            this.renderStage();
        }, color, 330);
        SoundFX.playAlert();
    }

    private renderGuidance(message: string, hint: string) {
        this.addCompanions();
        this.renderHeader("ADAPTIVE GUIDANCE", "BLEEP AND COMMANDER MAYA EXPLAIN THE ENGINEERING CHOICE");
        this.addPanel(COL_X, 190, COL_W, 300, UITheme.colors.cardBg, UITheme.colors.solarGold);
        this.addText(message, 640, 270, { fontSize: "21px", wordWrap: { width: COL_W - 80 }, lineSpacing: 8 });
        this.addText(`HINT: ${hint}`, 640, 390, { fontSize: "16px", color: UITheme.colors.solarGoldStr, fontStyle: "bold", wordWrap: { width: COL_W - 80 } });
        this.addButton("TRY THE CONFIGURATION AGAIN", 640, 540, () => {
            this.state.stage = this.state.morningDecision === "incorrect" ? "MORNING_RETRY" : "AFTERNOON_RETRY";
            this.renderStage();
        }, UITheme.colors.solarGold, 350);
    }

    private renderRetry(title: string, hint: string, onCorrect: () => void) {
        this.addCompanions();
        this.renderHeader("RETRY & CORRECTION", title);
        this.addPanel(COL_X, 200, COL_W, 260, UITheme.colors.cardBg, UITheme.colors.primaryCyan);
        this.addText("ROUTE THE POWER CORRECTLY", 640, 260, { fontFamily: UITheme.fonts.heading, fontSize: "22px", color: UITheme.colors.primaryCyanStr, fontStyle: "bold" });
        this.addText(hint, 640, 340, { fontSize: "19px", wordWrap: { width: COL_W - 100 } });
        this.addText("This retry changes the machine states and resource levels—not just the message.", 640, 415, { fontSize: "14px", color: UITheme.colors.textSecondary, wordWrap: { width: COL_W - 100 } });
        this.addButton("APPLY CORRECTION", 640, 540, onCorrect, UITheme.colors.bioGreen, 300);
    }

    // ------------------------------------------------------------------
    // 6. Greenhouse mini-game
    // ------------------------------------------------------------------

    private renderGreenhouse() {
        this.renderHeader("LED HYDROPONIC GREENHOUSE", "Complete both interactions before the potatoes can be harvested.");
        this.addPanel(80, 175, 1120, 410, UITheme.colors.cardBg, UITheme.colors.bioGreen);
        this.addText("LED WAVELENGTH CONTROL", 300, 215, { fontFamily: UITheme.fonts.heading, fontSize: "16px", color: UITheme.colors.solarGoldStr, fontStyle: "bold" });
        this.addText("RED LED BALANCE", 300, 260, { fontSize: "13px", color: UITheme.colors.textSecondary });
        const slider = this.add.rectangle(300, 315, 390, 18, UITheme.colors.spaceDark).setInteractive({ useHandCursor: true });
        this.missionUi.add(slider);
        const sliderFill = this.add.rectangle(105, 315, 1, 10, UITheme.colors.marsAmber).setOrigin(0, 0.5);
        this.missionUi.add(sliderFill);
        const redText = this.addText(`RED ${this.state.redLed}%  •  BLUE ${this.state.blueLed}%`, 300, 365, { fontFamily: UITheme.fonts.heading, fontSize: "15px" });
        const balanceText = this.addText("", 300, 410, { fontSize: "14px", fontStyle: "bold" });
        const updateSlider = (pointerX: number) => {
            const bounded = Phaser.Math.Clamp(pointerX, 105, 495);
            this.state.redLed = Math.round(40 + ((bounded - 105) / 390) * 50);
            this.state.blueLed = 100 - this.state.redLed;
            sliderFill.width = bounded - 105;
            redText.setText(`RED ${this.state.redLed}%  •  BLUE ${this.state.blueLed}%`);
            const valid = this.state.redLed >= 60 && this.state.redLed <= 75;
            balanceText.setText(valid ? "✓ BALANCE READY FOR POTATOES" : "Adjust red LED to 60–75%");
            balanceText.setColor(valid ? UITheme.colors.bioGreenStr : UITheme.colors.textWarning);
            this.updateGreenhouseFeedback();
        };
        slider.on("pointerdown", (pointer: Phaser.Input.Pointer) => updateSlider(pointer.x));
        slider.on("pointermove", (pointer: Phaser.Input.Pointer) => {
            if (pointer.isDown) updateSlider(pointer.x);
        });

        // Plant growth illustration (updates during growth)
        const plants = this.add.graphics();
        this.missionUi.add(plants);
        this.drawPlants(plants, this.state.cropProgress);
        this.plantGraphics = plants;

        this.addText("CO₂ ACTIVITY", 850, 215, { fontFamily: UITheme.fonts.heading, fontSize: "16px", color: UITheme.colors.primaryCyanStr, fontStyle: "bold" });
        this.addText("Click each molecule to route Mars CO₂ to the plants.", 850, 260, { fontSize: "13px", color: UITheme.colors.textSecondary, wordWrap: { width: 290 } });
        for (let index = 0; index < 5; index++) {
            const molecule = this.add.circle(740 + (index % 3) * 75, 330 + Math.floor(index / 3) * 65, 20, UITheme.colors.primaryCyan, 0.85);
            molecule.setInteractive({ useHandCursor: true });
            molecule.on("pointerdown", () => {
                if (!molecule.active) return;
                molecule.disableInteractive();
                molecule.setAlpha(0.25);
                this.state.co2Collected++;
                SoundFX.playClick();
                this.updateGreenhouseFeedback();
            });
            this.missionUi.add(molecule);
        }
        this.greenhouseFeedback = this.addText("", 850, 450, { fontSize: "14px", color: UITheme.colors.textWarning, wordWrap: { width: 330 } });

        // Growth progress track (inside the panel)
        this.addText("PLANT GROWTH", 300, 480, { fontFamily: UITheme.fonts.heading, fontSize: "12px", color: UITheme.colors.textSecondary });
        const track = this.add.rectangle(105, 510, 390, 14, UITheme.colors.spaceDark).setOrigin(0, 0.5);
        this.missionUi.add(track);
        this.growthBar = this.add.rectangle(105, 510, Math.max(2, (this.state.cropProgress / 100) * 390), 10, UITheme.colors.bioGreen).setOrigin(0, 0.5);
        this.missionUi.add(this.growthBar);

        updateSlider(105 + ((this.state.redLed - 40) / 50) * 390);
    }

    private plantGraphics?: Phaser.GameObjects.Graphics;
    private growthBar?: Phaser.GameObjects.Rectangle;

    private drawPlants(g: Phaser.GameObjects.Graphics, progress: number) {
        g.clear();
        const baseY = 470;
        const h = 14 + progress * 0.85;
        g.fillStyle(0x6b3b24, 1);
        g.fillRoundedRect(530, baseY, 180, 12, 4);
        [565, 620, 675].forEach((px, i) => {
            const ph = h * (0.8 + i * 0.1);
            g.lineStyle(4, 0x3da94b, 1);
            g.lineBetween(px, baseY, px, baseY - ph);
            g.fillStyle(0x52e26a, 1);
            g.fillEllipse(px - 11, baseY - ph * 0.6, 20, 11);
            g.fillEllipse(px + 11, baseY - ph * 0.8, 20, 11);
            if (progress >= 100) {
                g.fillStyle(0xffffff, 1);
                g.fillCircle(px, baseY - ph - 5, 6);
                g.fillStyle(0xd9a441, 1);
                g.fillEllipse(px, baseY + 2, 18, 10);
            }
        });
    }

    private updateGreenhouseFeedback() {
        if (!this.greenhouseFeedback) return;
        const ledReady = this.state.redLed >= 60 && this.state.redLed <= 75;
        const co2Ready = this.state.co2Collected === 5;
        this.greenhouseFeedback.setText(`LED: ${ledReady ? "READY" : "NOT READY"}   CO₂: ${this.state.co2Collected}/5`);
        this.greenhouseFeedback.setColor(ledReady && co2Ready ? UITheme.colors.bioGreenStr : UITheme.colors.textWarning);
        if (ledReady && co2Ready && !this.state.growthComplete && !this.greenhouseStartButtonAdded) {
            this.greenhouseStartButtonAdded = true;
            this.greenhouseStartButton = this.addButton("START POTATO GROWTH", 850, 535, () => this.startGrowth(), UITheme.colors.bioGreen, 300);
        }
    }

    private startGrowth() {
        if (this.state.redLed < 60 || this.state.redLed > 75 || this.state.co2Collected < 5 || this.state.growthComplete) {
            SoundFX.playAlert();
            return;
        }
        this.greenhouseStartButton?.destroy();
        this.greenhouseStartButton = undefined;

        const growth = { value: 0 };
        this.tweens.add({
            targets: growth,
            value: 100,
            duration: 1800,
            onUpdate: () => {
                this.state.cropProgress = Math.round(growth.value);
                if (this.growthBar?.active) this.growthBar.width = Math.max(2, (this.state.cropProgress / 100) * 390);
                if (this.plantGraphics?.active) this.drawPlants(this.plantGraphics, this.state.cropProgress);
            },
            onComplete: () => {
                this.state.growthComplete = true;
                if (!this.missionUi?.active) return;
                this.addButton("HARVEST POTATOES", 850, 535, () => this.harvestPotatoes(), UITheme.colors.solarGold, 280);
                this.addText("🌱 Seedling → vine → flowering → potato tubers ready!", 850, 495, { color: UITheme.colors.bioGreenStr, fontStyle: "bold", fontSize: "13px", wordWrap: { width: 330 } });
            }
        });
    }

    // ------------------------------------------------------------------
    // 7. Quiz (uniform purple answer cards, no green/red reveal)
    // ------------------------------------------------------------------

    private renderQuiz() {
        const question = this.quiz[this.state.quizIndex];
        const order = this.quizOrder[this.state.quizIndex] ?? [0, 1];
        this.addCompanions();
        this.renderHeader("QUICK QUIZ", `QUESTION ${this.state.quizIndex + 1} OF 2 • SCORE ${this.state.quizScore}/2`);
        this.addPanel(COL_X, 175, COL_W, 335, UITheme.colors.cardBg, UITheme.colors.primaryCyan);
        this.addText(question.question, 640, 235, { fontSize: "20px", wordWrap: { width: COL_W - 80 }, lineSpacing: 8 });

        order.forEach((answerIndex, slot) => {
            const x = COL_X + 20 + slot * 390;
            this.addPanel(x, 290, 370, 110, 0x0e1a32, CHOICE_COLOR);
            this.addText(`${slot === 0 ? "A" : "B"}. ${question.answers[answerIndex]}`, x + 185, 345, {
                fontSize: "16px", wordWrap: { width: 330 }
            });
            this.addButton(slot === 0 ? "CHOOSE A" : "CHOOSE B", x + 185, 440, () => this.answerQuiz(answerIndex), CHOICE_COLOR, 200);
        });
        this.quizFeedback = this.addText("", 640, 535, { fontSize: "15px", fontStyle: "bold" });
    }

    // ------------------------------------------------------------------
    // 8. Summary
    // ------------------------------------------------------------------

    private renderSummary() {
        this.addCompanions();
        this.renderHeader("MISSION SUMMARY", "SOL 4 COMPLETE • AIR, ICE & LED POTATOES");
        this.addPanel(COL_X, 170, COL_W, 420, UITheme.colors.cardBg, UITheme.colors.bioGreen);
        this.addText("FINAL RESOURCES", 400, 215, { fontFamily: UITheme.fonts.heading, fontSize: "16px", color: UITheme.colors.solarGoldStr, fontStyle: "bold" });
        this.addText("OXYGEN  75%", 400, 270, { fontFamily: UITheme.fonts.heading, fontSize: "21px", color: UITheme.colors.primaryCyanStr, fontStyle: "bold" });
        this.addText("WATER  45%", 400, 320, { fontFamily: UITheme.fonts.heading, fontSize: "21px", color: UITheme.colors.primaryCyanStr, fontStyle: "bold" });
        this.addText("FOOD  70%", 400, 370, { fontFamily: UITheme.fonts.heading, fontSize: "21px", color: UITheme.colors.bioGreenStr, fontStyle: "bold" });
        this.addText("MISSION CHECKLIST", 800, 215, { fontFamily: UITheme.fonts.heading, fontSize: "16px", color: UITheme.colors.solarGoldStr, fontStyle: "bold" });
        [
            "✓ Oxygen production", "✓ Ice extraction", "✓ Water management", "✓ Greenhouse activation",
            "✓ Electrical power management", "✓ Martian dust safety", "✓ Potato harvest", "✓ Mission quiz"
        ].forEach((item, index) => this.addText(item, 800, 252 + index * 26, { fontSize: "14px", color: UITheme.colors.textSuccess }));
        this.addText("Commander Maya: Excellent sequencing, Cadet. You kept our habitat supplied.", 640, 465, { fontSize: "14px", color: UITheme.colors.primaryCyanStr, wordWrap: { width: COL_W - 60 } });
        this.addText("Bleep: Potatoes secured! \"You mastered closed-loop resource sequencing using Mars ISRU engineering!\"", 640, 500, { fontSize: "14px", color: UITheme.colors.textWarning, wordWrap: { width: COL_W - 60 } });
        this.addButton("ADVANCE TO SOL 5", 640, 555, () => this.finishMission(), UITheme.colors.bioGreen, 300);
    }

    private addResourceStrip(water: number) {
        this.addText(`O₂ ${this.state.oxygen}%   •   WATER ${water}%   •   FOOD ${this.state.food}%`, 640, 165, {
            fontFamily: UITheme.fonts.heading, fontSize: "14px", color: UITheme.colors.primaryCyanStr
        });
    }

    // ------------------------------------------------------------------
    // Game logic (unchanged behaviour)
    // ------------------------------------------------------------------

    private chooseMorning(correct: boolean) {
        if (this.state.morningDecision !== null) return;
        this.state.morningDecision = correct ? "correct" : "incorrect";
        if (correct) {
            this.correctMorning();
        } else {
            this.state.morningWrongAttempts++;
            this.state.iceMelterOn = false;
            this.state.moxieOn = true;
            this.state.ledFarmOn = true;
            this.state.water = 0;
            this.state.oxygen = 0;
            this.state.stage = "MORNING_ERROR";
            this.renderStage();
        }
    }

    private correctMorning() {
        this.state.morningDecision = "correct";
        this.state.iceMelterOn = true;
        this.state.moxieOn = true;
        this.state.ledFarmOn = false;
        this.state.suitportSealed = true;
        this.state.water = 60;
        this.state.oxygen = 75;
        this.state.storedOxygen = 75;
        SoundFX.playSuccess();
        this.state.stage = "AFTERNOON";
        this.renderStage();
    }

    private chooseAfternoon(correct: boolean) {
        if (this.state.afternoonDecision !== null) return;
        this.state.afternoonDecision = correct ? "correct" : "incorrect";
        if (correct) {
            this.correctAfternoon();
        } else {
            this.state.afternoonWrongAttempts++;
            this.state.moxieOn = true;
            this.state.ledFarmOn = false;
            this.state.suitportSealed = false;
            this.state.stage = "AFTERNOON_ERROR";
            this.renderStage();
        }
    }

    private correctAfternoon() {
        this.state.afternoonDecision = "correct";
        this.state.moxieOn = false;
        this.state.ledFarmOn = true;
        this.state.suitportSealed = true;
        this.state.stage = "GREENHOUSE";
        SoundFX.playSuccess();
        this.renderStage();
    }

    private harvestPotatoes() {
        if (!this.state.growthComplete || this.state.harvestComplete) return;
        this.state.harvestComplete = true;
        this.state.food = 70;
        this.state.water = 45;
        this.state.stage = "QUIZ";
        SoundFX.playSuccess();
        this.renderStage();
    }

    private answerQuiz(answer: number) {
        const question = this.quiz[this.state.quizIndex];
        if (answer !== question.correct) {
            // Neutral gold hint (no red) and no per-answer colouring
            this.quizFeedback?.setText("Not quite. Re-read the science cards and try again.");
            this.quizFeedback?.setColor(UITheme.colors.solarGoldStr);
            SoundFX.playAlert();
            return;
        }
        this.state.quizScore++;
        if (this.state.quizIndex === this.quiz.length - 1) {
            this.state.quizComplete = true;
            this.state.stage = "SUMMARY";
        } else {
            this.state.quizIndex++;
        }
        SoundFX.playSuccess();
        this.renderStage();
    }

    private finishMission() {
        if (!this.state.harvestComplete || !this.state.quizComplete) {
            SoundFX.playAlert();
            return;
        }
        this.state.missionCompleted = true;
        this.currentVal = 1;
        this.updateVisorProgress(1, 1, "Mission");
        this.completeChallengeAndAdvance();
    }

    protected isTargetMet(): boolean {
        return this.state.missionCompleted;
    }
}

export default Sol4ISRUProductionScene;