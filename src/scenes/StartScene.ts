
import Phaser from "phaser";

type ScienceActivity = {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    color: number;
    icon: string;
    resource: string;
    url: string;
};

type WeatherEvent = {
    type: string;
    issuedAt: string | null;
    description: string;
    sourceUrl: string | null;
};

type WeatherResponse = {
    success: boolean;
    data?: {
        totalEvents: number;
        latestEvents: WeatherEvent[];
        status: string;
    };
};

export default class StartScene extends Phaser.Scene {
    private launchButton!: Phaser.GameObjects.Container;
    private isLaunching = false;

    private weatherTitle!: Phaser.GameObjects.Text;
    private weatherDescription!: Phaser.GameObjects.Text;
    private weatherLoading = false;

    private popup?: Phaser.GameObjects.Container;

    private readonly activities: ScienceActivity[] = [
        {
            id: "mars",
            title: "EXPLORE MARS",
            subtitle: "Discover Jezero Crater",
            description:
                "Explore real Mars terrain, discover ancient river delta features and choose a suitable location for your Mars habitat.",
            color: 0xF18A55,
            icon: "🪐",
            resource: "NASA Mars Trek",
            url: "https://trek.nasa.gov/mars/"
        },
        {
            id: "weather",
            title: "SPACE WEATHER",
            subtitle: "Investigate solar activity",
            description:
                "Discover solar flares and other space-weather events reported by NASA. Learn why astronauts and spacecraft need protection.",
            color: 0xF6B94B,
            icon: "☀",
            resource: "NASA DONKI",
            url: "https://ccmc.gsfc.nasa.gov/tools/DONKI/"
        },
        {
            id: "health",
            title: "CREW HEALTH",
            subtitle: "Study the human body",
            description:
                "Explore NASA space-biology research about muscles, bones, sleep and other changes that scientists study during spaceflight.",
            color: 0x42CBA5,
            icon: "♥",
            resource: "NASA OSDR",
            url: "https://osdr.nasa.gov/bio/repo/"
        },
        {
            id: "radiation",
            title: "RADIATION LAB",
            subtitle: "Become a space scientist",
            description:
                "Investigate real radiation dosimetry measurements collected by spaceflight instruments and experiment with a simulated shielding challenge.",
            color: 0xE9C65C,
            icon: "☢",
            resource: "NASA RadLab",
            url: "https://visualization.osdr.nasa.gov/radlab/gui/data-api/"
        },
        {
            id: "discoveries",
            title: "NASA DISCOVERIES",
            subtitle: "Explore space science",
            description:
                "Discover NASA's public data resources, space images and scientific information that help us understand the universe.",
            color: 0xB58AF5,
            icon: "✦",
            resource: "NASA Open APIs",
            url: "https://api.nasa.gov/"
        }
    ];

    constructor() {
        super("StartScene");
    }

    preload() {
        this.load.image("greenhouse", "/assets/game/base/greenhouse.png");
        this.load.image("mars-habitat", "/assets/game/base/lunar-habitat.png");
        this.load.image("dish-antenna", "/assets/game/base/dish-antenna.png");
        this.load.image("solar-panels", "/assets/game/base/solar-panels.png");
        this.load.image("rover", "/assets/game/base/rover.png");
        this.load.image("base-station", "/assets/game/base/base-station.png");

        this.load.image("boy-astronaut", "/assets/game/characters/boy-astronaut.png");
        this.load.image("girl-astronaut", "/assets/game/characters/girl-astronaut.png");

        this.load.image("launch-icon", "/assets/game/icons/launch-button.png");
        this.load.image("star-badge", "/assets/game/icons/star-badge.png");
    }

    create() {
        const W = 1280;
        const H = 720;

        this.isLaunching = false;
        this.popup = undefined;

        this.createBackground(W, H);
        this.createMarsOutpost();
        this.createBranding();

        this.createWelcomeSection();
        this.createMissionCard();
        this.createWeatherCard();

        this.createActivityCards();
        this.createLaunchButton();
        this.createFooter();

        this.loadNASAWeather();
    }

    // =========================================
    // BACKGROUND
    // =========================================

    private createBackground(W: number, H: number) {
        this.add.rectangle(0, 0, W, H, 0x15172d).setOrigin(0);

        // Atmospheric sky
        this.add.circle(1050, 150, 260, 0x9a4a64, 0.22);

        this.add.circle(1080, 145, 83, 0xffa36e, 0.95);

        // Stars
        for (let i = 0; i < 85; i++) {
            const star = this.add.circle(
                Phaser.Math.Between(0, W),
                Phaser.Math.Between(0, 470),
                Phaser.Math.FloatBetween(0.7, 1.7),
                0xffffff,
                Phaser.Math.FloatBetween(0.3, 0.8)
            );

            star.setDepth(1);

            this.tweens.add({
                targets: star,
                alpha: 0.15,
                duration: Phaser.Math.Between(1000, 2500),
                yoyo: true,
                repeat: -1
            });
        }

        // Distant mountains
        this.add.ellipse(880, 575, 1000, 240, 0x753c42).setDepth(2);
        this.add.ellipse(1150, 620, 1100, 210, 0x9d4d40).setDepth(3);

        // Foreground
        this.add.ellipse(750, 700, 1500, 220, 0xc35d40).setDepth(4);

        this.add.rectangle(0, 675, W, 45, 0x9f4938)
            .setOrigin(0)
            .setDepth(4);
    }

    // =========================================
    // MARS OUTPOST
    // =========================================

    private createMarsOutpost() {
        const structures = [
            { key: "solar-panels", x: 680, y: 535, w: 195, h: 120 },
            { key: "greenhouse", x: 865, y: 490, w: 165, h: 140 },
            { key: "mars-habitat", x: 1060, y: 485, w: 260, h: 205 },
            { key: "base-station", x: 1190, y: 505, w: 165, h: 145 },
            { key: "dish-antenna", x: 1165, y: 325, w: 90, h: 120 }
        ];

        structures.forEach((item) => {
            const image = this.add.image(item.x, item.y, item.key);

            image.setDisplaySize(item.w, item.h);
            image.setDepth(5);
        });

        const rover = this.add.image(745, 620, "rover");
        rover.setDisplaySize(135, 88);
        rover.setDepth(7);

        const astronaut = this.add.image(
            965,
            585,
            "girl-astronaut"
        );

        astronaut.setDisplaySize(90, 125);
        astronaut.setDepth(8);

        this.tweens.add({
            targets: astronaut,
            y: 572,
            duration: 1800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
    }

    // =========================================
    // BRANDING
    // =========================================

    private createBranding() {
        this.add.text(45, 28, "✦ ASTRA NEXUS", {
            fontFamily: "Orbitron",
            fontSize: "27px",
            fontStyle: "bold",
            color: "#FFFFFF",
            stroke: "#263B5D",
            strokeThickness: 2
        }).setDepth(10);

        this.add.text(48, 65, "JUNIOR ASTRONAUT MISSION TRAINER", {
            fontFamily: "Nunito",
            fontSize: "15px",
            fontStyle: "bold",
            color: "#C6D8EC",
            letterSpacing: 2
        }).setDepth(10);

        this.add.text(1190, 40, "★", {
            fontFamily: "Nunito",
            fontSize: "38px",
            color: "#FFD16D"
        }).setOrigin(0.5).setDepth(10);
    }

    // =========================================
    // WELCOME SECTION
    // =========================================

    private createWelcomeSection() {
        const panel = this.add.rectangle(
            275, 215, 440, 175, 0x14243b, 0.94
        );

        panel.setStrokeStyle(2, 0x68d9ee, 0.85);
        panel.setDepth(10);

        this.add.text(75, 150, "WELCOME, EXPLORER!", {
            fontFamily: "Orbitron",
            fontSize: "22px",
            fontStyle: "bold",
            color: "#75E4FF"
        }).setDepth(11);

        this.add.text(
            75,
            192,
            "Your adventure begins on the Red Planet!",
            {
                fontFamily: "Nunito",
                fontSize: "19px",
                fontStyle: "bold",
                color: "#FFFFFF"
            }
        ).setDepth(11);

        this.add.text(
            75,
            231,
            "Explore Mars, build your outpost and discover\nhow astronauts live, work and stay healthy\nin space.",
            {
                fontFamily: "Nunito",
                fontSize: "18px",
                color: "#D5E2F0",
                lineSpacing: 6
            }
        ).setDepth(11);
    }

    // =========================================
    // MISSION CARD
    // =========================================

    private createMissionCard() {
        const card = this.add.rectangle(
            875, 175, 420, 90, 0x25263b, 0.94
        );

        card.setStrokeStyle(2, 0xffa66f, 0.95);
        card.setDepth(10);

        this.add.text(875, 137, "MISSION 01", {
            fontFamily: "Orbitron",
            fontSize: "16px",
            fontStyle: "bold",
            color: "#27182A",
            backgroundColor: "#FFAA69",
            padding: { x: 15, y: 7 }
        }).setOrigin(0.5).setDepth(11);

        this.add.text(875, 165, "ESTABLISH A MARS OUTPOST", {
            fontFamily: "Orbitron",
            fontSize: "19px",
            fontStyle: "bold",
            color: "#FFFFFF"
        }).setOrigin(0.5).setDepth(11);

        this.add.text(875, 205, "📍 Jezero Crater  •  Mars", {
            fontFamily: "Nunito",
            fontSize: "18px",
            fontStyle: "bold",
            color: "#FFC49E"
        }).setOrigin(0.5).setDepth(11);
    }

    // =========================================
    // NASA DONKI CARD
    // =========================================

    private createWeatherCard() {
        const card = this.add.rectangle(
            1090, 365, 330, 100, 0x10233a, 0.97
        );

        card.setStrokeStyle(2, 0x50cce9, 0.9);
        card.setDepth(10);

        this.add.text(950, 328, "✦ NASA MISSION INTELLIGENCE", {
            fontFamily: "Orbitron",
            fontSize: "12px",
            fontStyle: "bold",
            color: "#73E6F7"
        }).setDepth(11);

        this.weatherTitle = this.add.text(
            950,
            350,
            "CONNECTING TO NASA...",
            {
                fontFamily: "Nunito",
                fontSize: "17px",
                fontStyle: "bold",
                color: "#FFD18A",
                wordWrap: { width: 275 }
            }
        ).setDepth(11);

        this.weatherDescription = this.add.text(
            950,
            382,
            "Retrieving recent space-weather reports.",
            {
                fontFamily: "Nunito",
                fontSize: "14px",
                color: "#D5E2F0",
                wordWrap: { width: 275 },
                lineSpacing: 3
            }
        ).setDepth(11);

        const refresh = this.add.text(
            1225,
            435,
            "↻ REFRESH",
            {
                fontFamily: "Nunito",
                fontSize: "13px",
                fontStyle: "bold",
                color: "#71DFF2"
            }
        ).setOrigin(1, 0.5).setDepth(12);

        refresh.setInteractive({ useHandCursor: true });

        refresh.on("pointerdown", () => {
            this.loadNASAWeather(true);
        });
    }

    private async loadNASAWeather(_force = false) {
        if (this.weatherLoading) return;

        this.weatherLoading = true;

        this.weatherTitle.setText("CONNECTING TO NASA...");
        this.weatherDescription.setText(
            "Checking recent space-weather notifications."
        );

        try {
            const response = await fetch(
                "http://localhost:3001/api/nasa/space-weather"
            );

            if (!response.ok) {
                throw new Error(`Backend returned ${response.status}`);
            }

            const result = await response.json() as WeatherResponse;

            if (!result.success || !result.data) {
                throw new Error("NASA data unavailable.");
            }

            const data = result.data;
            const latest = data.latestEvents[0];

            if (!latest) {
                this.weatherTitle.setText("NO RECENT NOTIFICATIONS");
                this.weatherTitle.setColor("#8BE0B0");

                this.weatherDescription.setText(
                    "No DONKI notifications were returned for the selected period."
                );

                return;
            }

            this.weatherTitle.setText(
                `${data.totalEvents} SPACE-WEATHER REPORT(S)`
            );

            this.weatherTitle.setColor("#FFD18A");

            const date = latest.issuedAt
                ? new Date(latest.issuedAt).toLocaleDateString()
                : "Date unavailable";

            this.weatherDescription.setText(
                `${latest.type} • ${date}\n${latest.description.slice(0, 90)}`
            );

        } catch (error) {
            console.error("NASA DONKI error:", error);

            this.weatherTitle.setText("NASA CONNECTION OFFLINE");
            this.weatherTitle.setColor("#FF9D8B");

            this.weatherDescription.setText(
                "The science activities are still available. Try refreshing later."
            );

        } finally {
            this.weatherLoading = false;
        }
    }

    // =========================================
    // INTERACTIVE SCIENCE CARDS
    // =========================================

    private createActivityCards() {
        const cardWidth = 225;
        const cardHeight = 115;
        const gap = 17;
        const startX = 32;
        const y = 585;

        this.activities.forEach((activity, index) => {
            const x = startX + index * (cardWidth + gap);

            const card = this.add.container(
                x + cardWidth / 2,
                y
            );

            card.setDepth(20);

            const shadow = this.add.rectangle(
                3, 5, cardWidth, cardHeight, 0x000000, 0.35
            );

            const background = this.add.rectangle(
                0, 0, cardWidth, cardHeight, 0x15243a, 0.98
            );

            background.setStrokeStyle(2, activity.color, 0.95);

            const icon = this.add.text(
                -cardWidth / 2 + 18,
                -cardHeight / 2 + 15,
                activity.icon,
                {
                    fontFamily: "Nunito",
                    fontSize: "29px",
                    color: "#FFFFFF"
                }
            );

            const title = this.add.text(
                -cardWidth / 2 + 60,
                -cardHeight / 2 + 15,
                activity.title,
                {
                    fontFamily: "Orbitron",
                    fontSize: "11px",
                    fontStyle: "bold",
                    color: "#FFFFFF",
                    wordWrap: { width: 145 }
                }
            );

            const subtitle = this.add.text(
                -cardWidth / 2 + 16,
                14,
                activity.subtitle,
                {
                    fontFamily: "Nunito",
                    fontSize: "14px",
                    fontStyle: "bold",
                    color: "#C9D7E9",
                    wordWrap: { width: cardWidth - 30 }
                }
            );

            const explore = this.add.text(
                -cardWidth / 2 + 16,
                37,
                "TAP TO DISCOVER  →",
                {
                    fontFamily: "Nunito",
                    fontSize: "12px",
                    fontStyle: "bold",
                    color: `#${activity.color.toString(16).padStart(6, "0")}`
                }
            );

            card.add([
                shadow,
                background,
                icon,
                title,
                subtitle,
                explore
            ]);

            card.setSize(cardWidth, cardHeight);

            card.setInteractive(
                new Phaser.Geom.Rectangle(
                    -cardWidth / 2,
                    -cardHeight / 2,
                    cardWidth,
                    cardHeight
                ),
                Phaser.Geom.Rectangle.Contains
            );

            card.on("pointerover", () => {
                if (this.popup) return;

                this.input.setDefaultCursor("pointer");

                this.tweens.add({
                    targets: card,
                    scale: 1.045,
                    duration: 120
                });
            });

            card.on("pointerout", () => {
                this.input.setDefaultCursor("default");

                this.tweens.add({
                    targets: card,
                    scale: 1,
                    duration: 120
                });
            });

            card.on("pointerdown", () => {
                this.showActivityPopup(activity);
            });
        });
    }

    // =========================================
    // SCIENCE ACTIVITY POPUP
    // =========================================

    private showActivityPopup(activity: ScienceActivity) {
        if (this.popup) return;

        const overlay = this.add.rectangle(
            0, 0, 1280, 720, 0x050914, 0.78
        );

        overlay.setOrigin(0);
        overlay.setInteractive();

        const container = this.add.container(640, 360);
        container.setDepth(100);

        const panel = this.add.rectangle(
            0, 0, 570, 360, 0x15243a, 1
        );

        panel.setStrokeStyle(3, activity.color, 1);

        const icon = this.add.text(
            -245, -135, activity.icon,
            {
                fontFamily: "Nunito",
                fontSize: "43px",
                color: "#FFFFFF"
            }
        );

        const title = this.add.text(
            -185, -130, activity.title,
            {
                fontFamily: "Orbitron",
                fontSize: "19px",
                fontStyle: "bold",
                color: "#FFFFFF",
                wordWrap: { width: 400 }
            }
        );

        const description = this.add.text(
            -245, -65,
            activity.description,
            {
                fontFamily: "Nunito",
                fontSize: "19px",
                color: "#D9E5F2",
                wordWrap: { width: 490 },
                lineSpacing: 8
            }
        );

        const resource = this.add.text(
            -245, 75,
            `REAL-WORLD RESOURCE\n${activity.resource}`,
            {
                fontFamily: "Nunito",
                fontSize: "17px",
                fontStyle: "bold",
                color: "#7AE4F2",
                lineSpacing: 5
            }
        );

        const open = this.add.text(
            -245, 145,
            "OPEN NASA RESOURCE  ↗",
            {
                fontFamily: "Nunito",
                fontSize: "16px",
                fontStyle: "bold",
                color: "#FFB37D"
            }
        );

        open.setInteractive({ useHandCursor: true });

        open.on("pointerdown", () => {
            window.open(activity.url, "_blank", "noopener,noreferrer");
        });

        const close = this.add.text(
            245, -150, "✕",
            {
                fontFamily: "Nunito",
                fontSize: "26px",
                fontStyle: "bold",
                color: "#FFFFFF"
            }
        ).setOrigin(0.5);

        close.setInteractive({ useHandCursor: true });

        const closePopup = () => {
            container.destroy();
            overlay.destroy();
            this.popup = undefined;
            this.input.setDefaultCursor("default");
        };

        close.on("pointerdown", closePopup);

        container.add([
            panel,
            icon,
            title,
            description,
            resource,
            open,
            close
        ]);

        this.popup = container;

        this.tweens.add({
            targets: container,
            scale: { from: 0.9, to: 1 },
            alpha: { from: 0, to: 1 },
            duration: 180,
            ease: "Back.Out"
        });

        // Clicking outside the popup closes it.
        overlay.on("pointerdown", closePopup);
    }

    // =========================================
    // START MISSION BUTTON
    // =========================================

    private createLaunchButton() {
        this.launchButton = this.add.container(1080, 490);
        this.launchButton.setDepth(30);

        const glow = this.add.rectangle(
            0, 0, 245, 82, 0xff873e, 0.16
        );

        const background = this.add.rectangle(
            0, 0, 230, 70, 0xf07837
        );

        background.setStrokeStyle(3, 0xffcf85, 1);

        const text = this.add.text(
            -8, 0,
            "START\nMISSION",
            {
                fontFamily: "Orbitron",
                fontSize: "19px",
                fontStyle: "bold",
                color: "#FFFFFF",
                align: "center",
                lineSpacing: 2
            }
        ).setOrigin(0.5);

        const icon = this.add.image(83, 0, "launch-icon");
        icon.setDisplaySize(35, 35);

        this.launchButton.add([
            glow,
            background,
            text,
            icon
        ]);

        this.launchButton.setSize(245, 82);

        this.launchButton.setInteractive(
            new Phaser.Geom.Rectangle(-122, -41, 245, 82),
            Phaser.Geom.Rectangle.Contains
        );

        this.launchButton.on("pointerover", () => {
            if (this.isLaunching) return;

            this.input.setDefaultCursor("pointer");

            this.tweens.add({
                targets: this.launchButton,
                scale: 1.07,
                duration: 140
            });
        });

        this.launchButton.on("pointerout", () => {
            this.input.setDefaultCursor("default");

            this.tweens.add({
                targets: this.launchButton,
                scale: 1,
                duration: 140
            });
        });

        this.launchButton.on("pointerdown", () => {
            this.launchMission();
        });

        this.tweens.add({
            targets: glow,
            alpha: 0.4,
            duration: 850,
            yoyo: true,
            repeat: -1
        });
    }

    // =========================================
    // FOOTER
    // =========================================

    private createFooter() {
        this.add.text(
            30, 704,
            "A NASA-INSPIRED EDUCATIONAL ADVENTURE",
            {
                fontFamily: "Nunito",
                fontSize: "12px",
                fontStyle: "bold",
                color: "#D4DCE9",
                letterSpacing: 1
            }
        ).setOrigin(0, 1).setDepth(40);

        this.add.text(
            1250, 704,
            "AGES 7–12",
            {
                fontFamily: "Orbitron",
                fontSize: "12px",
                fontStyle: "bold",
                color: "#FFD09B"
            }
        ).setOrigin(1, 1).setDepth(40);
    }

    // =========================================
    // LAUNCH MISSION
    // =========================================

    private launchMission() {
        if (this.isLaunching || this.popup) return;

        this.isLaunching = true;
        this.input.setDefaultCursor("default");

        this.tweens.add({
            targets: this.launchButton,
            scale: 0.85,
            alpha: 0,
            duration: 220
        });

        const overlay = this.add.rectangle(
            0, 0, 1280, 720, 0x050914, 0
        );

        overlay.setOrigin(0).setDepth(100);

        this.tweens.add({
            targets: overlay,
            alpha: 1,
            duration: 650,
            onComplete: () => {
                this.scene.start("StoryScene");
            }
        });
    }
}
