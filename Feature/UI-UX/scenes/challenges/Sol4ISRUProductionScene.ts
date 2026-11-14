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

export class Sol4ISRUProductionScene extends SolChallengeBaseScene {
    private readonly state: Sol4MissionState = { ...INITIAL_STATE };
    private readonly stageContainer = () => this.add.container(0, 0).setDepth(40);
    private missionUi!: Phaser.GameObjects.Container;
    private quizFeedback?: Phaser.GameObjects.Text;
    private greenhouseFeedback?: Phaser.GameObjects.Text;
    private greenhouseStartButtonAdded = false;

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
        this.createMartianSurfaceBase(0x10182B, 0x9E5544, 0x643326);
        this.missionUi = this.stageContainer();
        this.renderStage();
    }

    private renderStage() {
        this.missionUi.removeAll(true);
        this.quizFeedback = undefined;
        this.greenhouseFeedback = undefined;
        this.greenhouseStartButtonAdded = false;

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

    private renderIntroduction() {
        this.renderHeader("AIR, ICE & LED POTATOES", "SOL 4 MISSION BRIEFING • CLOSED-LOOP RESOURCE ENGINEERING");
        this.addPanel(110, 175, 1060, 390);
        this.addText(
            "\"Welcome to Sol 4, Cadet. Our Earth supply drops are months away, and our air and food tanks are dropping. Today you must turn Mars's 95% carbon dioxide air into oxygen using MOXIE, melt buried ice for water, and grow dwarf potatoes under LED lights—using only limited Kilopower electricity.\"",
            640, 235, { fontSize: "17px", lineSpacing: 7, wordWrap: { width: 900 } }
        );
        const systems = [
            ["💨 MOXIE", "Oxygen from CO₂-rich Mars air", UITheme.colors.primaryCyanStr],
            ["💧 ICE MELTER", "Subsurface ice becomes water", UITheme.colors.solarGoldStr],
            ["🥔 LED POTATO FARM", "Water + light grow food", UITheme.colors.bioGreenStr],
            ["⚡ KILOPOWER", "Limited electricity to sequence", UITheme.colors.cosmicPurpleStr]
        ];
        systems.forEach(([title, detail], index) => {
            const x = 225 + index * 235;
            this.addText(title, x, 350, { fontFamily: UITheme.fonts.heading, fontSize: "14px", color: detail, fontStyle: "bold" });
            this.addText(detail, x, 390, { fontSize: "12px", color: UITheme.colors.textSecondary, wordWrap: { width: 190 } });
        });
        this.addText("MISSION OBJECTIVE: sequence resources safely, harvest potatoes, and protect the habitat from Martian dust.", 640, 465, {
            fontSize: "14px", color: UITheme.colors.textWarning, fontStyle: "bold"
        });
        this.addButton("START MISSION", 640, 535, () => {
            this.state.stage = "LEARN";
            this.renderStage();
        }, UITheme.colors.bioGreen, 260);
    }

    private renderLearningCard() {
        const cards = [
            ["RULE 1 — WATER FIRST", "Plants and astronauts need liquid water before anything can grow.", "Light alone cannot hydrate potato roots."],
            ["RULE 2 — MOXIE", "MOXIE extracts oxygen from Mars's mostly carbon-dioxide atmosphere.", "Its solid-oxide system operates at approximately 800°C."],
            ["RULE 3 — POWER LIMIT", "MOXIE and the LED Potato Farm cannot run simultaneously at full power in this simplified simulation.", "Sequence the high-power systems instead of overloading Kilopower."],
            ["RULE 4 — RESOURCE SEQUENCING", "Produce and store enough oxygen first, then redirect available power to the greenhouse.", "Stored oxygen lets us safely unplug MOXIE during the afternoon."]
        ];
        const card = cards[this.state.learningCard];
        this.renderHeader("LEARN BEFORE PLAYING", `BLEEP SCIENCE CARD ${this.state.learningCard + 1} OF ${cards.length}`);
        this.addPanel(220, 190, 840, 290, UITheme.colors.cardBg, UITheme.colors.primaryCyan);
        this.addText(card[0], 640, 245, { fontFamily: UITheme.fonts.heading, fontSize: "22px", color: UITheme.colors.solarGoldStr, fontStyle: "bold" });
        this.addText(card[1], 640, 315, { fontSize: "20px", wordWrap: { width: 700 }, lineSpacing: 8 });
        this.addText(`Bleep: ${card[2]}`, 640, 405, { fontSize: "15px", color: UITheme.colors.primaryCyanStr, wordWrap: { width: 700 } });
        this.addButton(this.state.learningCard === cards.length - 1 ? "BEGIN MORNING DECISION" : "NEXT SCIENCE CARD", 640, 545, () => {
            if (this.state.learningCard < cards.length - 1) {
                this.state.learningCard++;
            } else {
                this.state.stage = "MORNING";
            }
            this.renderStage();
        }, UITheme.colors.primaryCyan, 320);
    }

    private renderMorningDecision() {
        this.renderHeader("MORNING — WATER & OXYGEN SETUP", "Choose one configuration. Plants need water before LED light.");
        this.addResourceStrip(0);
        this.addText("Exactly one safe sequence keeps both air and water production online.", 640, 195, { color: UITheme.colors.textSecondary });
        this.addChoice(
            120, "OPTION A — ICE + MOXIE", "Ice Melter ON • MOXIE ON • LED Farm OFF", "Water 60% • Oxygen 75% • Roots stay hydrated", UITheme.colors.bioGreen,
            () => this.chooseMorning(true)
        );
        this.addChoice(
            665, "OPTION B — LED TOO SOON", "LED Farm ON • MOXIE ON • Ice Melter OFF", "Water 0% • Dry potato roots • Farm cannot grow", UITheme.colors.emergencyRed,
            () => this.chooseMorning(false)
        );
    }

    private renderAfternoonDecision() {
        this.renderHeader("AFTERNOON — NOON DUST SQUALL", "Water is ready, oxygen is stored, and a toxic dust squall is approaching.");
        this.addResourceStrip(60);
        this.addText("Redirect limited Kilopower to food production while keeping the habitat sealed.", 640, 195, { color: UITheme.colors.textSecondary });
        this.addChoice(
            120, "OPTION A — SAFE POWER SWAP", "MOXIE OFF • LED Farm ON • Suitport SEALED", "Stored oxygen retained • Power feeds potatoes • Dust stays out", UITheme.colors.bioGreen,
            () => this.chooseAfternoon(true)
        );
        this.addChoice(
            665, "OPTION B — OPEN THE SUITPORT", "MOXIE ON • LED Farm OFF • Suitport OPEN", "Food unavailable • Power warning • Toxic perchlorate dust", UITheme.colors.cosmicPurple,
            () => this.chooseAfternoon(false)
        );
    }

    private addChoice(x: number, title: string, configuration: string, result: string, color: number, onClick: () => void) {
        this.addPanel(x, 245, 495, 250, UITheme.colors.cardBg, color);
        this.addText(title, x + 247, 285, { fontFamily: UITheme.fonts.heading, fontSize: "18px", color: Phaser.Display.Color.IntegerToColor(color).rgba, fontStyle: "bold" });
        this.addText(configuration, x + 247, 345, { fontSize: "16px", color: UITheme.colors.textPrimary, wordWrap: { width: 420 } });
        this.addText(result, x + 247, 410, { fontSize: "14px", color: UITheme.colors.textSecondary, wordWrap: { width: 410 } });
        this.addButton("SELECT CONFIGURATION", x + 247, 535, onClick, color, 300);
    }

    private renderError(title: string, bleep: string, color: number) {
        this.renderHeader("MISTAKE DETECTION", "THE SIMULATION FOUND AN UNSAFE CONFIGURATION");
        this.addPanel(150, 185, 980, 360, 0x241322, color);
        this.addText(title, 640, 245, { fontFamily: UITheme.fonts.heading, fontSize: "27px", color: Phaser.Display.Color.IntegerToColor(color).rgba, fontStyle: "bold" });
        this.addText(`Bleep: "${bleep}"`, 640, 310, { fontSize: "22px", color: UITheme.colors.textPrimary });
        if (this.state.morningDecision === "incorrect") {
            this.addText("WATER TANK  0%", 370, 405, { fontFamily: UITheme.fonts.heading, fontSize: "19px", color: UITheme.colors.emergencyRedStr, fontStyle: "bold" });
            this.addText("🥔  DRY ROOTS", 640, 405, { fontSize: "19px", color: UITheme.colors.emergencyRedStr, fontStyle: "bold" });
            this.addText("LED FARM: NO WATER", 910, 405, { fontFamily: UITheme.fonts.heading, fontSize: "15px", color: UITheme.colors.emergencyRedStr, fontStyle: "bold" });
        } else {
            this.addText("FOOD: CRITICAL", 350, 405, { fontFamily: UITheme.fonts.heading, fontSize: "17px", color: UITheme.colors.emergencyRedStr, fontStyle: "bold" });
            this.addText("MOXIE: POWER DRAW", 640, 405, { fontFamily: UITheme.fonts.heading, fontSize: "17px", color: UITheme.colors.solarGoldStr, fontStyle: "bold" });
            this.addText("☣ SUITPORT OPEN", 930, 405, { fontFamily: UITheme.fonts.heading, fontSize: "17px", color: UITheme.colors.cosmicPurpleStr, fontStyle: "bold" });
        }
        this.addButton("UNDERSTAND THE WARNING", 640, 510, () => {
            this.state.stage = this.state.morningDecision === "incorrect" ? "MORNING_GUIDANCE" : "AFTERNOON_GUIDANCE";
            this.renderStage();
        }, color, 330);
        SoundFX.playAlert();
    }

    private renderGuidance(message: string, hint: string) {
        this.renderHeader("ADAPTIVE GUIDANCE", "BLEEP AND COMMANDER MAYA EXPLAIN THE ENGINEERING CHOICE");
        this.addPanel(180, 190, 920, 300, UITheme.colors.cardBg, UITheme.colors.solarGold);
        this.addText(message, 640, 270, { fontSize: "21px", wordWrap: { width: 780 }, lineSpacing: 8 });
        this.addText(`HINT: ${hint}`, 640, 390, { fontSize: "16px", color: UITheme.colors.solarGoldStr, fontStyle: "bold", wordWrap: { width: 780 } });
        this.addButton("TRY THE CONFIGURATION AGAIN", 640, 540, () => {
            this.state.stage = this.state.morningDecision === "incorrect" ? "MORNING_RETRY" : "AFTERNOON_RETRY";
            this.renderStage();
        }, UITheme.colors.solarGold, 350);
    }

    private renderRetry(title: string, hint: string, onCorrect: () => void) {
        this.renderHeader("RETRY & CORRECTION", title);
        this.addPanel(190, 200, 900, 260, UITheme.colors.cardBg, UITheme.colors.bioGreen);
        this.addText("ROUTE THE POWER CORRECTLY", 640, 260, { fontFamily: UITheme.fonts.heading, fontSize: "22px", color: UITheme.colors.bioGreenStr, fontStyle: "bold" });
        this.addText(hint, 640, 340, { fontSize: "19px", wordWrap: { width: 750 } });
        this.addText("This retry changes the machine states and resource levels—not just the message.", 640, 415, { fontSize: "14px", color: UITheme.colors.textSecondary });
        this.addButton("APPLY CORRECTION", 640, 540, onCorrect, UITheme.colors.bioGreen, 300);
    }

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
        updateSlider(105 + ((this.state.redLed - 40) / 50) * 390);

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
        this.greenhouseFeedback = this.addText("", 850, 460, { fontSize: "14px", color: UITheme.colors.textWarning, wordWrap: { width: 330 } });
        this.updateGreenhouseFeedback();
    }

    private updateGreenhouseFeedback() {
        if (!this.greenhouseFeedback) return;
        const ledReady = this.state.redLed >= 60 && this.state.redLed <= 75;
        const co2Ready = this.state.co2Collected === 5;
        this.greenhouseFeedback.setText(`LED: ${ledReady ? "READY" : "NOT READY"}   CO₂: ${this.state.co2Collected}/5`);
        this.greenhouseFeedback.setColor(ledReady && co2Ready ? UITheme.colors.bioGreenStr : UITheme.colors.textWarning);
        if (ledReady && co2Ready && !this.state.growthComplete && !this.greenhouseStartButtonAdded) {
            this.greenhouseStartButtonAdded = true;
            this.addButton("START POTATO GROWTH", 850, 535, () => this.startGrowth(), UITheme.colors.bioGreen, 300);
        }
    }

    private startGrowth() {
        if (this.state.redLed < 60 || this.state.redLed > 75 || this.state.co2Collected < 5 || this.state.growthComplete) {
            SoundFX.playAlert();
            return;
        }
        const growth = { value: 0 };
        const progress = this.add.rectangle(640, 625, 10, 14, UITheme.colors.bioGreen).setOrigin(0.5);
        this.missionUi.add(progress);
        this.tweens.add({
            targets: growth,
            value: 100,
            duration: 1800,
            onUpdate: () => {
                this.state.cropProgress = Math.round(growth.value);
                progress.width = Math.max(10, this.state.cropProgress * 5);
            },
            onComplete: () => {
                this.state.growthComplete = true;
                this.addButton("HARVEST POTATOES", 640, 535, () => this.harvestPotatoes(), UITheme.colors.solarGold, 280);
                this.addText("🌱 Seedling → vine → flowering → potato tubers ready!", 640, 470, { color: UITheme.colors.bioGreenStr, fontStyle: "bold" });
            }
        });
    }

    private renderQuiz() {
        const question = this.quiz[this.state.quizIndex];
        this.renderHeader("QUICK QUIZ", `QUESTION ${this.state.quizIndex + 1} OF 2 • SCORE ${this.state.quizScore}/2`);
        this.addPanel(150, 190, 980, 310, UITheme.colors.cardBg, UITheme.colors.primaryCyan);
        this.addText(question.question, 640, 275, { fontSize: "20px", wordWrap: { width: 820 }, lineSpacing: 8 });
        this.addButton(`A. ${question.answers[0]}`, 395, 400, () => this.answerQuiz(0), UITheme.colors.primaryCyan, 410);
        this.addButton(`B. ${question.answers[1]}`, 885, 400, () => this.answerQuiz(1), UITheme.colors.marsAmber, 410);
        this.quizFeedback = this.addText("", 640, 480, { fontSize: "15px", fontStyle: "bold" });
    }

    private renderSummary() {
        this.renderHeader("MISSION SUMMARY", "SOL 4 COMPLETE • AIR, ICE & LED POTATOES");
        this.addPanel(70, 170, 1140, 420, UITheme.colors.cardBg, UITheme.colors.bioGreen);
        this.addText("FINAL RESOURCES", 250, 215, { fontFamily: UITheme.fonts.heading, fontSize: "16px", color: UITheme.colors.solarGoldStr, fontStyle: "bold" });
        this.addText("OXYGEN  75%", 250, 275, { fontFamily: UITheme.fonts.heading, fontSize: "22px", color: UITheme.colors.primaryCyanStr, fontStyle: "bold" });
        this.addText("WATER  45%", 250, 325, { fontFamily: UITheme.fonts.heading, fontSize: "22px", color: UITheme.colors.primaryCyanStr, fontStyle: "bold" });
        this.addText("FOOD  70%", 250, 375, { fontFamily: UITheme.fonts.heading, fontSize: "22px", color: UITheme.colors.bioGreenStr, fontStyle: "bold" });
        this.addText("MISSION CHECKLIST", 710, 215, { fontFamily: UITheme.fonts.heading, fontSize: "16px", color: UITheme.colors.solarGoldStr, fontStyle: "bold" });
        [
            "✓ Oxygen production", "✓ Ice extraction", "✓ Water management", "✓ Greenhouse activation",
            "✓ Electrical power management", "✓ Martian dust safety", "✓ Potato harvest", "✓ Mission quiz"
        ].forEach((item, index) => this.addText(item, 710, 255 + index * 27, { fontSize: "14px", align: "left", color: UITheme.colors.textSuccess }));
        this.addText("Commander Maya: Excellent sequencing, Cadet. You kept our habitat supplied.", 640, 445, { fontSize: "14px", color: UITheme.colors.primaryCyanStr });
        this.addText("Bleep: Potatoes secured! Engineering takeaway: \"You mastered closed-loop resource sequencing using Mars ISRU engineering!\"", 640, 480, { fontSize: "14px", color: UITheme.colors.textWarning, wordWrap: { width: 950 } });
        this.addButton("ADVANCE TO SOL 5", 640, 550, () => this.finishMission(), UITheme.colors.bioGreen, 300);
    }

    private addResourceStrip(water: number) {
        this.addText(`O₂ ${this.state.oxygen}%   •   WATER ${water}%   •   FOOD ${this.state.food}%`, 640, 155, {
            fontFamily: UITheme.fonts.heading, fontSize: "14px", color: UITheme.colors.primaryCyanStr
        });
    }

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
            this.quizFeedback?.setText("Not quite. Re-read the science card and try again.");
            this.quizFeedback?.setColor(UITheme.colors.emergencyRedStr);
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
