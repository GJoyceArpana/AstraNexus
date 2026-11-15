import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "../components/ButtonFactory.ts";

type IntroductionStage = "VIDEO" | "LESSON" | "FINAL";

interface SolIntroductionSceneData {
    replay?: boolean;
}

interface LessonCard {
    title: string;
    body: string;
    icon: string;
    accent: number;
}

const GAME_WIDTH = 1280;
const GAME_HEIGHT = 720;
const VIDEO_URL = "/assets/video/touchdown.mp4";

const LESSON_CARDS: LessonCard[] = [
    {
        title: "A DAY ON MARS!",
        body: "Did you know Mars has its own kind of day? Scientists call it a SOL! One Sol is about 24 hours and 39 minutes long. That is a little longer than a day on Earth!",
        icon: "🌍  •  🔴",
        accent: 0x6be8ff
    },
    {
        title: "WELCOME TO YOUR MARS BASE!",
        body: "Your new home is a special base on Mars. It protects astronauts from the cold, dusty environment and helps them live and work safely!",
        icon: "🏠  •  👩‍🚀",
        accent: 0xff9b70
    },
    {
        title: "BE A MISSION HERO!",
        body: "Your crew needs oxygen to breathe, water to drink, food to eat and power to run the base. You must make smart choices to keep everyone safe!",
        icon: "O₂   💧   🍎   ⚡",
        accent: 0x40ffaa
    },
    {
        title: "CAN YOU SAVE THE MISSION?",
        body: "Sometimes you will have to choose! Should you save power or grow more food? Should you explore Mars or protect the base? Every decision changes your mission!",
        icon: "🤖  •  🌱  •  ⚖️",
        accent: 0xffd23f
    }
];

export default class SolIntroductionScene extends Phaser.Scene {
    private stage: IntroductionStage = "VIDEO";
    private lessonIndex = 0;
    private video?: HTMLVideoElement;
    private videoFrame?: Phaser.GameObjects.Graphics;
    private videoMessage?: Phaser.GameObjects.Text;
    private videoPlayButton?: Phaser.GameObjects.Container;
    private videoMuteButton?: Phaser.GameObjects.Container;
    private videoSkipButton?: Phaser.GameObjects.Container;
    private videoReplayButton?: Phaser.GameObjects.Container;
    private videoContinueButton?: Phaser.GameObjects.Container;
    private videoHeader?: Phaser.GameObjects.Container;
    private lessonRoot?: Phaser.GameObjects.Container;
    private resizeHandler?: () => void;
    private videoFinished = false;
    private videoMuted = true;
    private readonly handleVideoMetadata = () => {
        this.updateVideoLayout();
    };
    private readonly handleVideoLoaded = () => {
        if (this.stage !== "VIDEO") return;
        this.updateVideoLayout();
        this.videoMessage?.setText("MARS TOUCHDOWN — PLAYING");
        void this.playVideo();
    };
    private readonly handleVideoCanPlay = () => {
        this.videoMessage?.setVisible(false);
    };
    private readonly handleVideoEnded = () => {
        this.videoFinished = true;
        this.videoMessage?.setVisible(false);
        this.videoContinueButton?.setVisible(true);
        this.videoReplayButton?.setVisible(true);
        this.videoMuteButton?.setVisible(false);
        this.videoSkipButton?.setVisible(false);
    };
    private readonly handleVideoError = () => {
        this.videoFinished = true;
        this.videoMessage?.setText("TOUCHDOWN VIDEO UNAVAILABLE — YOUR MISSION CAN STILL BEGIN!");
        this.videoMessage?.setColor("#FFD23F");
        this.videoContinueButton?.setVisible(true);
        this.videoSkipButton?.setVisible(false);
        this.videoReplayButton?.setVisible(false);
        this.videoMuteButton?.setVisible(false);
    };

    constructor() {
        super("SolIntroductionScene");
    }

    preload() {
        if (!this.textures.exists("mars-habitat")) {
            this.load.image("mars-habitat", "/assets/game/base/lunar-habitat.png");
        }
        if (!this.textures.exists("greenhouse")) {
            this.load.image("greenhouse", "/assets/game/base/greenhouse.png");
        }
        if (!this.textures.exists("rover")) {
            this.load.image("rover", "/assets/game/base/rover.png");
        }
        if (!this.textures.exists("solar-panels")) {
            this.load.image("solar-panels", "/assets/game/base/solar-panels.png");
        }
        if (!this.textures.exists("boy-astronaut")) {
            this.load.image("boy-astronaut", "/assets/game/characters/boy-astronaut.png");
        }
        if (!this.textures.exists("girl-astronaut")) {
            this.load.image("girl-astronaut", "/assets/game/characters/girl-astronaut.png");
        }
    }

    init(data: SolIntroductionSceneData = {}) {
        this.stage = "VIDEO";
        this.lessonIndex = 0;
        this.videoFinished = false;
        this.videoMuted = true;

        if (data.replay) {
            this.registry.remove("solIntroductionSeen");
        }
    }

    create() {
        this.cameras.main.setBackgroundColor("#050914");
        this.events.once(Phaser.Scenes.Events.SHUTDOWN, this.cleanup, this);
        this.resizeHandler = () => {
            if (this.stage === "VIDEO") this.updateVideoLayout();
            if (this.stage === "LESSON") this.renderLessonCard();
        };
        this.scale.on("resize", this.resizeHandler, this);

        this.createVideoStage();
    }

    private createVideoStage() {
        this.stage = "VIDEO";
        this.lessonRoot?.destroy(true);
        this.lessonRoot = undefined;

        this.add.rectangle(0, 0, GAME_WIDTH, GAME_HEIGHT, 0x050914).setOrigin(0);
        this.videoHeader = this.add.container(0, 0).setDepth(10);
        this.videoHeader.add(this.add.text(GAME_WIDTH / 2, 34, "MISSION CONTROL: WE HAVE LANDED!", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "24px",
            fontStyle: "bold",
            color: "#FFD23F",
            stroke: "#07172E",
            strokeThickness: 4
        }).setOrigin(0.5));
        this.videoHeader.add(this.add.text(GAME_WIDTH / 2, 68, "Welcome, Junior Astronaut! Your adventure on Mars begins now.", {
            fontFamily: UITheme.fonts.body,
            fontSize: "17px",
            color: "#D8F7FF"
        }).setOrigin(0.5));

        this.videoFrame = this.add.graphics().setDepth(3);
        this.updateVideoLayout();

        this.videoMessage = this.add.text(GAME_WIDTH / 2, 352, "LOADING MARS TOUCHDOWN...", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "17px",
            fontStyle: "bold",
            color: "#9CEEFF"
        }).setOrigin(0.5).setDepth(6);

        this.createVideoElement();
        this.videoSkipButton = ButtonFactory.createButton({
            scene: this,
            x: 120,
            y: 662,
            width: 180,
            height: 42,
            text: "SKIP INTRO",
            primaryColor: 0xff9b70,
            secondaryColor: 0x1b2944,
            fontSize: "13px",
            onClick: () => this.showLesson()
        });

        this.videoMuteButton = ButtonFactory.createButton({
            scene: this,
            x: 1080,
            y: 662,
            width: 180,
            height: 42,
            text: "🔇 UNMUTE",
            primaryColor: 0x00e5ff,
            secondaryColor: 0x102f59,
            fontSize: "13px",
            onClick: () => this.toggleMute()
        });

        this.videoReplayButton = ButtonFactory.createButton({
            scene: this,
            x: 440,
            y: 662,
            width: 170,
            height: 42,
            text: "↻ REPLAY",
            primaryColor: 0x6be8ff,
            secondaryColor: 0x102f59,
            fontSize: "13px",
            onClick: () => this.replayVideo()
        });
        this.videoReplayButton.setVisible(false);

        this.videoContinueButton = ButtonFactory.createButton({
            scene: this,
            x: 760,
            y: 662,
            width: 220,
            height: 42,
            text: "CONTINUE →",
            primaryColor: 0x40ffaa,
            secondaryColor: 0x123a46,
            textColor: "#061329",
            fontSize: "14px",
            onClick: () => this.showLesson()
        });
        this.videoContinueButton.setVisible(false);
        this.updateVideoLayout();
    }

    private createVideoElement() {
        const video = document.createElement("video");
        this.video = video;
        video.src = VIDEO_URL;
        video.preload = "auto";
        video.playsInline = true;
        video.autoplay = true;
        video.muted = true;
        video.controls = false;
        video.setAttribute("aria-label", "Mars touchdown cinematic");
        Object.assign(video.style, {
            width: "1px",
            height: "1px",
            objectFit: "contain",
            maxWidth: "100%",
            maxHeight: "100%",
            backgroundColor: "#020712",
            display: "block",
            borderRadius: "12px"
        });

        video.addEventListener("loadedmetadata", this.handleVideoMetadata);
        video.addEventListener("loadeddata", this.handleVideoLoaded);
        video.addEventListener("canplay", this.handleVideoCanPlay);
        video.addEventListener("ended", this.handleVideoEnded);
        video.addEventListener("error", this.handleVideoError);

        video.style.position = "fixed";
        video.style.zIndex = "5";
        video.style.pointerEvents = "none";
        document.body.appendChild(video);
        this.updateVideoLayout();
    }

    private getVideoLayout() {
        const compact = this.scale.displaySize.width < 900;
        return compact
            ? { panelX: 60, panelY: 94, panelW: 1160, panelH: 430, footerY: 590 }
            : { panelX: 52, panelY: 94, panelW: 1176, panelH: 516, footerY: 662 };
    }

    private updateVideoLayout() {
        const layout = this.getVideoLayout();
        const padding = 18;

        if (this.videoFrame) {
            this.videoFrame.clear();
            this.videoFrame.fillStyle(0x081d3d, 0.96);
            this.videoFrame.fillRoundedRect(layout.panelX, layout.panelY, layout.panelW, layout.panelH, 16);
            this.videoFrame.lineStyle(2, 0x00e5ff, 0.9);
            this.videoFrame.strokeRoundedRect(layout.panelX, layout.panelY, layout.panelW, layout.panelH, 16);
        }

        this.videoMessage?.setPosition(
            layout.panelX + layout.panelW / 2,
            layout.panelY + layout.panelH / 2
        );

        this.updateVideoControlsLayout(layout.footerY);

        const videoWidth = this.video?.videoWidth ?? 0;
        const videoHeight = this.video?.videoHeight ?? 0;
        if (!this.video || videoWidth <= 0 || videoHeight <= 0) return;

        const availableWidth = layout.panelW - padding * 2;
        const availableHeight = layout.panelH - padding * 2;
        const fitScale = Math.min(availableWidth / videoWidth, availableHeight / videoHeight);
        const displayWidth = Math.max(1, Math.floor(videoWidth * fitScale));
        const displayHeight = Math.max(1, Math.floor(videoHeight * fitScale));
        const canvas = this.game.canvas;
        const canvasBounds = canvas.getBoundingClientRect();
        const scaleX = canvasBounds.width / GAME_WIDTH;
        const scaleY = canvasBounds.height / GAME_HEIGHT;
        const screenWidth = displayWidth * scaleX;
        const screenHeight = displayHeight * scaleY;
        const screenCenterX = canvasBounds.left + (layout.panelX + layout.panelW / 2) * scaleX;
        const screenCenterY = canvasBounds.top + (layout.panelY + layout.panelH / 2) * scaleY;

        this.video.style.width = `${screenWidth}px`;
        this.video.style.height = `${screenHeight}px`;
        this.video.style.left = `${screenCenterX - screenWidth / 2}px`;
        this.video.style.top = `${screenCenterY - screenHeight / 2}px`;
        this.video.style.aspectRatio = `${videoWidth} / ${videoHeight}`;
    }

    private updateVideoControlsLayout(footerY: number) {
        this.videoSkipButton?.setPosition(120, footerY);
        this.videoReplayButton?.setPosition(440, footerY);
        this.videoContinueButton?.setPosition(760, footerY);
        this.videoMuteButton?.setPosition(1080, footerY);
    }

    private async playVideo() {
        if (!this.video || this.videoFinished) return;

        try {
            await this.video.play();
        } catch {
            this.videoMessage?.setText("TAP PLAY TO START THE MARS TOUCHDOWN");
            this.videoPlayButton?.destroy();
            this.videoPlayButton = ButtonFactory.createButton({
                scene: this,
                x: GAME_WIDTH / 2,
                y: 535,
                width: 260,
                height: 48,
                text: "▶ PLAY INTRO",
                primaryColor: 0xffd23f,
                secondaryColor: 0x2a3151,
                textColor: "#101426",
                fontSize: "15px",
                onClick: () => {
                    this.videoMuted = false;
                    if (this.video) this.video.muted = false;
                    void this.playVideo();
                    this.videoPlayButton?.setVisible(false);
                }
            });
        }
    }

    private toggleMute() {
        if (!this.video) return;
        this.videoMuted = !this.videoMuted;
        this.video.muted = this.videoMuted;
        const label = this.videoMuteButton?.list.find(
            (child) => child instanceof Phaser.GameObjects.Text
        ) as Phaser.GameObjects.Text | undefined;
        label?.setText(this.videoMuted ? "🔇 UNMUTE" : "🔊 MUTE");
    }

    private replayVideo() {
        if (!this.video) return;
        this.videoFinished = false;
        this.video.currentTime = 0;
        this.videoMessage?.setText("MARS TOUCHDOWN — PLAYING");
        this.videoMessage?.setVisible(true);
        this.videoReplayButton?.setVisible(false);
        this.videoContinueButton?.setVisible(false);
        this.videoSkipButton?.setVisible(true);
        this.videoMuteButton?.setVisible(true);
        void this.playVideo();
    }

    private showLesson() {
        if (this.stage === "LESSON") return;
        this.video?.pause();
        this.videoHeader?.destroy(true);
        this.videoHeader = undefined;
        if (this.video) this.video.style.display = "none";
        this.videoFrame?.setVisible(false);
        this.videoMessage?.setVisible(false);
        this.videoSkipButton?.setVisible(false);
        this.videoReplayButton?.setVisible(false);
        this.videoMuteButton?.setVisible(false);
        this.videoContinueButton?.setVisible(false);
        this.videoPlayButton?.setVisible(false);
        this.stage = "LESSON";
        this.renderLessonCard();
    }

    private renderLessonCard() {
        this.lessonRoot?.destroy(true);
        this.lessonRoot = this.add.container(0, 0).setDepth(20);
        const card = LESSON_CARDS[this.lessonIndex];
        const compact = this.scale.displaySize.width < 900;
        const panelX = compact ? 28 : 64;
        const panelY = compact ? 28 : 86;
        const panelW = compact ? 1224 : 1152;
        const panelH = compact ? 596 : 538;
        const contentLeft = compact ? 82 : 126;
        const contentWidth = compact ? 1116 : 500;
        const titleY = compact ? 136 : 220;
        const bodyY = compact ? 186 : 285;
        const highlightY = compact ? 346 : 466;
        const illustrationX = compact ? GAME_WIDTH / 2 : 930;
        const illustrationY = compact ? 486 : 382;

        const panel = this.add.graphics();
        panel.fillStyle(0x091d3e, 0.98);
        panel.fillRoundedRect(panelX, panelY, panelW, panelH, 18);
        panel.lineStyle(2.5, card.accent, 0.95);
        panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 18);
        this.lessonRoot.add(panel);

        this.lessonRoot.add(this.add.text(GAME_WIDTH / 2, compact ? 60 : 116, "SO... WHAT IS A SOL?", {
            fontFamily: UITheme.fonts.heading,
            fontSize: compact ? "24px" : "27px",
            fontStyle: "bold",
            color: "#FFD23F"
        }).setOrigin(0.5));

        this.lessonRoot.add(this.add.text(GAME_WIDTH / 2, compact ? 92 : 155, `SPACE LESSON  •  ${this.lessonIndex + 1} OF ${LESSON_CARDS.length}`, {
            fontFamily: UITheme.fonts.body,
            fontSize: "13px",
            fontStyle: "bold",
            color: "#9CEEFF"
        }).setOrigin(0.5));

        const illustration = this.add.container(illustrationX, illustrationY);
        if (compact) illustration.setScale(0.78);
        const illustrationBg = this.add.graphics();
        illustrationBg.fillStyle(0x102f59, 0.95);
        illustrationBg.fillRoundedRect(-250, -145, 430, 290, 16);
        illustrationBg.lineStyle(1.5, card.accent, 0.85);
        illustrationBg.strokeRoundedRect(-250, -145, 430, 290, 16);
        illustration.add(illustrationBg);
        this.drawLessonArtwork(illustration, card.accent);
        this.lessonRoot.add(illustration);

        this.lessonRoot.add(this.add.text(contentLeft, titleY, card.title, {
            fontFamily: UITheme.fonts.heading,
            fontSize: compact ? "24px" : "28px",
            fontStyle: "bold",
            color: `#${card.accent.toString(16).padStart(6, "0")}`,
            wordWrap: { width: contentWidth }
        }));
        this.lessonRoot.add(this.add.text(contentLeft, bodyY, card.body, {
            fontFamily: UITheme.fonts.body,
            fontSize: compact ? "18px" : "20px",
            color: "#F1F7FF",
            lineSpacing: compact ? 6 : 8,
            wordWrap: { width: contentWidth }
        }));
        this.lessonRoot.add(this.add.text(contentLeft, highlightY, this.getLessonHighlight(), {
            fontFamily: UITheme.fonts.heading,
            fontSize: compact ? "14px" : "15px",
            fontStyle: "bold",
            color: `#${card.accent.toString(16).padStart(6, "0")}`,
            wordWrap: { width: contentWidth }
        }));

        const back = ButtonFactory.createButton({
            scene: this,
            x: 170,
            y: 670,
            width: 180,
            height: 44,
            text: "← BACK",
            primaryColor: 0x6be8ff,
            secondaryColor: 0x102f59,
            fontSize: "14px",
            onClick: () => {
                if (this.lessonIndex > 0) {
                    this.lessonIndex -= 1;
                    this.renderLessonCard();
                }
            }
        });
        back.setAlpha(this.lessonIndex === 0 ? 0.45 : 1);
        this.lessonRoot.add(back);

        const skip = ButtonFactory.createButton({
            scene: this,
            x: 640,
            y: 670,
            width: 210,
            height: 44,
            text: "SKIP LESSON",
            primaryColor: 0xff9b70,
            secondaryColor: 0x1b2944,
            fontSize: "13px",
            onClick: () => this.showFinalLesson()
        });
        this.lessonRoot.add(skip);

        const next = ButtonFactory.createButton({
            scene: this,
            x: 1105,
            y: 670,
            width: 220,
            height: 44,
            text: this.lessonIndex === LESSON_CARDS.length - 1 ? "LET'S EXPLORE MARS! →" : "NEXT →",
            primaryColor: card.accent,
            secondaryColor: 0x123a46,
            textColor: "#061329",
            fontSize: "14px",
            onClick: () => {
                if (this.lessonIndex === LESSON_CARDS.length - 1) {
                    this.showFinalLesson();
                } else {
                    this.lessonIndex += 1;
                    this.renderLessonCard();
                }
            }
        });
        this.lessonRoot.add(next);

        this.lessonRoot.add(this.add.text(GAME_WIDTH / 2, compact ? 602 : 595, LESSON_CARDS.map((_item, index) => index === this.lessonIndex ? "●" : "○").join("  "), {
            fontFamily: UITheme.fonts.body,
            fontSize: "18px",
            color: `#${card.accent.toString(16).padStart(6, "0")}`
        }).setOrigin(0.5));

        this.tweens.add({
            targets: this.lessonRoot,
            alpha: { from: 0, to: 1 },
            y: { from: 14, to: 0 },
            duration: 260,
            ease: "Quad.easeOut"
        });
    }

    private getLessonHighlight(): string {
        switch (this.lessonIndex) {
            case 0:
                return "KEY IDEA: A SOL = ONE MARTIAN DAY.";
            case 1:
                return "KEY IDEA: THE BASE IS YOUR CREW'S SAFE HOME.";
            case 2:
                return "KEY IDEA: OXYGEN + WATER + FOOD + POWER KEEP THE CREW GOING.";
            default:
                return "KEY IDEA: EVERY CHOICE HAS A MISSION CONSEQUENCE.";
        }
    }

    private drawLessonArtwork(illustration: Phaser.GameObjects.Container, accent: number) {
        if (this.lessonIndex === 0) {
            illustration.add(this.add.circle(-125, -36, 47, 0x4f9bd9));
            illustration.add(this.add.circle(58, -36, 47, 0xc85532));
            illustration.add(this.add.text(-125, 38, "EARTH", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "12px",
                color: "#FFFFFF"
            }).setOrigin(0.5));
            illustration.add(this.add.text(58, 38, "MARS", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "12px",
                color: "#FFFFFF"
            }).setOrigin(0.5));
            illustration.add(this.add.text(-35, 82, "24 h  →  24 h 39 min", {
                fontFamily: UITheme.fonts.body,
                fontSize: "14px",
                color: "#FFD23F"
            }).setOrigin(0.5));
            return;
        }

        if (this.lessonIndex === 1) {
            this.addIllustrationImage(illustration, "mars-habitat", -78, 28, 190, 130);
            this.addIllustrationImage(illustration, "solar-panels", 82, 54, 135, 82);
            this.addIllustrationImage(illustration, "boy-astronaut", -178, 38, 72, 105);
            this.addArtworkLabel(illustration, "HABITAT", -78, 112, accent);
            this.addArtworkLabel(illustration, "SOLAR POWER", 82, 112, accent);
            this.addArtworkLabel(illustration, "SAFE CREW", -178, 112, accent);
            return;
        }

        if (this.lessonIndex === 2) {
            const resources = [
                ["O₂", "BREATHE", -135, -72, 0x6be8ff],
                ["💧", "DRINK", 65, -72, 0x4fa9ff],
                ["🍎", "EAT", -135, 45, 0xff9b70],
                ["⚡", "POWER", 65, 45, 0xffd23f]
            ] as const;
            resources.forEach(([icon, label, x, y, color]) => {
                const box = this.add.graphics();
                box.fillStyle(0x091d3e, 0.95);
                box.fillRoundedRect(x - 70, y - 38, 140, 82, 10);
                box.lineStyle(1.5, color, 0.95);
                box.strokeRoundedRect(x - 70, y - 38, 140, 82, 10);
                illustration.add(box);
                illustration.add(this.add.text(x, y - 10, icon, {
                    fontFamily: UITheme.fonts.body,
                    fontSize: "25px",
                    color: "#FFFFFF"
                }).setOrigin(0.5));
                this.addArtworkLabel(illustration, label, x, y + 20, color);
            });
            return;
        }

        this.addIllustrationImage(illustration, "rover", -115, 64, 180, 110);
        this.addIllustrationImage(illustration, "greenhouse", 100, 54, 150, 115);
        this.addChoiceBadge(illustration, "SAVE POWER", -135, -90, 0x6be8ff);
        this.addChoiceBadge(illustration, "GROW FOOD", 75, -90, 0x40ffaa);
    }

    private addIllustrationImage(
        illustration: Phaser.GameObjects.Container,
        textureKey: string,
        x: number,
        y: number,
        width: number,
        height: number
    ) {
        if (!this.textures.exists(textureKey)) return;
        const image = this.add.image(x, y, textureKey).setDisplaySize(width, height);
        illustration.add(image);
    }

    private addArtworkLabel(
        illustration: Phaser.GameObjects.Container,
        label: string,
        x: number,
        y: number,
        color: number
    ) {
        illustration.add(this.add.text(x, y, label, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            fontStyle: "bold",
            color: `#${color.toString(16).padStart(6, "0")}`
        }).setOrigin(0.5));
    }

    private addChoiceBadge(
        illustration: Phaser.GameObjects.Container,
        label: string,
        x: number,
        y: number,
        color: number
    ) {
        const badge = this.add.graphics();
        badge.fillStyle(0x091d3e, 0.98);
        badge.fillRoundedRect(x - 76, y - 22, 152, 44, 8);
        badge.lineStyle(1.5, color, 0.95);
        badge.strokeRoundedRect(x - 76, y - 22, 152, 44, 8);
        illustration.add(badge);
        this.addArtworkLabel(illustration, label, x, y, color);
    }

    private showFinalLesson() {
        this.stage = "FINAL";
        this.lessonRoot?.destroy(true);
        this.lessonRoot = this.add.container(0, 0).setDepth(20);

        const panel = this.add.graphics();
        panel.fillStyle(0x091d3e, 0.98);
        panel.fillRoundedRect(120, 110, 1040, 480, 20);
        panel.lineStyle(3, 0xffd23f, 0.95);
        panel.strokeRoundedRect(120, 110, 1040, 480, 20);
        this.lessonRoot.add(panel);

        this.lessonRoot.add(this.add.text(640, 190, "YOUR MISSION STARTS NOW, JUNIOR ASTRONAUT!", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "27px",
            fontStyle: "bold",
            color: "#FFD23F",
            align: "center",
            wordWrap: { width: 850 }
        }).setOrigin(0.5));
        this.lessonRoot.add(this.add.text(640, 278, "Choose your cadet, pick your Mars suit and get ready for your first Sol!", {
            fontFamily: UITheme.fonts.body,
            fontSize: "21px",
            color: "#E8F6FF",
            align: "center",
            wordWrap: { width: 780 }
        }).setOrigin(0.5));
        this.lessonRoot.add(this.add.text(640, 392, "🚀  🌱  🔴  🛰️", {
            fontFamily: UITheme.fonts.body,
            fontSize: "48px"
        }).setOrigin(0.5));

        const customize = ButtonFactory.createButton({
            scene: this,
            x: 640,
            y: 505,
            width: 390,
            height: 58,
            text: "CUSTOMIZE MY ASTRONAUT →",
            primaryColor: 0xffd23f,
            secondaryColor: 0xff8c1a,
            textColor: "#141008",
            fontSize: "17px",
            onClick: () => this.completeIntroduction()
        });
        this.lessonRoot.add(customize);
    }

    private completeIntroduction() {
        this.registry.set("solIntroductionSeen", true);
        this.scene.start("OutpostSolScene", { openCustomizer: true });
    }

    private cleanup() {
        if (this.resizeHandler) {
            this.scale.off("resize", this.resizeHandler, this);
            this.resizeHandler = undefined;
        }
        const video = this.video;
        if (!video) return;
        video.pause();
        video.removeEventListener("loadedmetadata", this.handleVideoMetadata);
        video.removeEventListener("loadeddata", this.handleVideoLoaded);
        video.removeEventListener("canplay", this.handleVideoCanPlay);
        video.removeEventListener("ended", this.handleVideoEnded);
        video.removeEventListener("error", this.handleVideoError);
        video.removeAttribute("src");
        video.load();
        video.remove();
        this.video = undefined;
    }
}
