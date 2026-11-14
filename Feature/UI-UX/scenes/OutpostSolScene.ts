import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import OutpostSolTitle from "../components/OutpostSolTitle.ts";
import RoleSelector, { type GameRole } from "../components/RoleSelector.ts";
import LandingSiteSelector, { type LandingSiteId } from "../components/LandingSiteSelector.ts";
import AstronautCustomizer, { type CustomizationData } from "../components/AstronautCustomizer.ts";
import MissionModals from "../components/MissionModals.ts";
import ButtonFactory from "../components/ButtonFactory.ts";

export type OutpostFlowState = "TITLE" | "ROLE" | "SITE" | "CUSTOMIZE" | "BRIEFING" | "HOW_TO_PLAY" | "TELEMETRY_ARCHIVE";

export class OutpostSolScene extends Phaser.Scene {
    private currentState: OutpostFlowState = "TITLE";

    public getCurrentFlowState(): OutpostFlowState {
        return this.currentState;
    }

    private titleComponent?: OutpostSolTitle;
    private roleComponent?: RoleSelector;
    private siteComponent?: LandingSiteSelector;
    private customizerComponent?: AstronautCustomizer;
    private modalContainer?: Phaser.GameObjects.Container;

    constructor() {
        super("OutpostSolScene");
    }

    preload() {
        // Preload any essential base images if not already preloaded by BootScene
        if (!this.textures.exists("mars-habitat")) {
            this.load.image("mars-habitat", "/assets/game/base/lunar-habitat.png");
        }
        if (!this.textures.exists("solar-panels")) {
            this.load.image("solar-panels", "/assets/game/base/solar-panels.png");
        }
        if (!this.textures.exists("dish-antenna")) {
            this.load.image("dish-antenna", "/assets/game/base/dish-antenna.png");
        }
        if (!this.textures.exists("rover")) {
            this.load.image("rover", "/assets/game/base/rover.png");
        }
        if (!this.textures.exists("greenhouse")) {
            this.load.image("greenhouse", "/assets/game/base/greenhouse.png");
        }
        if (!this.textures.exists("boy-astronaut")) {
            this.load.image("boy-astronaut", "/assets/game/characters/boy-astronaut.png");
        }
        if (!this.textures.exists("girl-astronaut")) {
            this.load.image("girl-astronaut", "/assets/game/characters/girl-astronaut.png");
        }
        if (!this.textures.exists("jezero-mosaic")) {
            this.load.image("jezero-mosaic", "/assets/game/mars/jezero-ctx-mosaic-3x3.png");
        }
        // Role selection panels are rendered as live Phaser UI using transparent astronaut portraits.

        // Preload Avatar Frames (1 to 5)
        for (let i = 1; i <= 5; i++) {
            if (!this.textures.exists(`boy_avatar_${i}`)) {
                this.load.image(`boy_avatar_${i}`, `/assets/customization/boy_avatar_${i}.png`);
            }
            if (!this.textures.exists(`girl_avatar_${i}`)) {
                this.load.image(`girl_avatar_${i}`, `/assets/customization/girl_avatar_${i}.png`);
            }
        }
    }

    create() {
        this.cameras.main.setBackgroundColor(UITheme.colors.spaceDark);
        this.showTitleScreen();
    }

    /**
     * STATE 1: OUTPOST SOL Title Screen & Main Menu
     */
    private showTitleScreen() {
        this.clearActiveComponents();
        this.currentState = "TITLE";

        this.titleComponent = new OutpostSolTitle(this, {
            onStartMission: () => this.showRoleSelector(),
            onSelectRole: () => this.showRoleSelector(),
            onSelectLandingSite: () => this.showLandingSiteSelector(),
            onCustomization: () => this.showCustomizer(),
            onOpenTelemetry: () => this.showTelemetryArchive(),
            onHowToPlay: () => this.showHowToPlay()
        });
    }

    /**
     * STATE 2: Junior Cadet vs Flight Director Selection
     */
    private showRoleSelector() {
        this.clearActiveComponents();
        this.currentState = "ROLE";

        this.roleComponent = new RoleSelector(this, {
            onRoleSelected: (_role: GameRole) => {
                this.showLandingSiteSelector();
            },
            onBack: () => this.showTitleScreen()
        });
    }

    /**
     * STATE 3: Jezero Crater vs Arcadia Planitia Landing Site
     */
    private showLandingSiteSelector() {
        this.clearActiveComponents();
        this.currentState = "SITE";

        this.siteComponent = new LandingSiteSelector(this, {
            onSiteSelected: (_site: LandingSiteId) => {
                this.showCustomizer();
            },
            onBack: () => this.showRoleSelector()
        });
    }

    /**
     * STATE 4: Astronaut Suit & Tool Customizer
     */
    private showCustomizer() {
        this.clearActiveComponents();
        this.currentState = "CUSTOMIZE";

        this.customizerComponent = new AstronautCustomizer(this, {
            onComplete: (_data: CustomizationData) => {
                this.showMissionBriefing();
            },
            onBack: () => this.showLandingSiteSelector()
        });
    }

    /**
     * STATE 5: Sol 01 Mission Briefing Modal
     */
    private showMissionBriefing() {
        this.clearActiveComponents();
        this.currentState = "BRIEFING";

        this.modalContainer = MissionModals.createBriefingModal(this, {
            onStart: () => {
                this.cameras.main.fade(600, 0, 0, 0);
                this.time.delayedCall(650, () => {
                    this.scene.start("MarsWorldScene");
                });
            }
        });
    }

    /**
     * HOW TO PLAY GUIDE MODAL
     */
    private showHowToPlay() {
        const { width, height } = this.scale;
        const modal = this.add.container(0, 0);
        modal.setDepth(200);

        const bg = this.add.rectangle(0, 0, width, height, 0x040A17, 0.92).setOrigin(0);
        bg.setInteractive();
        modal.add(bg);

        const boxW = 680;
        const boxH = 460;
        const box = this.add.graphics();
        box.fillStyle(UITheme.colors.panelBg, 0.98);
        box.fillRoundedRect((width - boxW) / 2, (height - boxH) / 2, boxW, boxH, 16);
        box.lineStyle(2, UITheme.colors.primaryCyan, 0.9);
        box.strokeRoundedRect((width - boxW) / 2, (height - boxH) / 2, boxW, boxH, 16);
        modal.add(box);

        const title = this.add.text(width / 2, (height - boxH) / 2 + 40, "CADET MISSION MANUAL", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "24px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        const guideText = this.add.text(
            (width - boxW) / 2 + 40,
            (height - boxH) / 2 + 80,
            "WELCOME TO MARS BASE: OUTPOST SOL!\n\n" +
            "1. EXPLORATION:\n" +
            "Use W, A, S, D or Arrow keys to walk across the Martian surface and explore Jezero Crater.\n\n" +
            "2. BASE MANAGEMENT & SWITCHBOARD:\n" +
            "Keep Life Support, Crew Health, and Hull Power integrity high. Access the 3/4 plug Switchboard to power essential modules like the Greenhouse and Magnetic Radiation Shield.\n\n" +
            "3. SPACE WEATHER ALERTS:\n" +
            "Real NASA DONKI feeds detect solar flares! When an alarm sounds, divert power to your shield.\n\n" +
            "4. SCIENCE DISCOVERIES:\n" +
            "Inspect rock samples, discover water ice, and unlock authentic NASA educational insights!",
            {
                fontFamily: UITheme.fonts.body,
                fontSize: "14px",
                color: "#E2EDFC",
                lineSpacing: 4,
                wordWrap: { width: boxW - 80 }
            }
        );

        const closeBtn = ButtonFactory.createButton({
            scene: this,
            x: width / 2,
            y: (height - boxH) / 2 + boxH - 45,
            width: 200,
            height: 42,
            text: "GOT IT, CADET!",
            primaryColor: UITheme.colors.solarGold,
            onClick: () => modal.destroy()
        });

        modal.add([title, guideText, closeBtn]);
    }

    /**
     * NASA TELEMETRY ARCHIVE MODAL
     */
    private showTelemetryArchive() {
        const { width, height } = this.scale;
        const modal = this.add.container(0, 0);
        modal.setDepth(200);

        const bg = this.add.rectangle(0, 0, width, height, 0x040A17, 0.92).setOrigin(0);
        bg.setInteractive();
        modal.add(bg);

        const boxW = 720;
        const boxH = 460;
        const box = this.add.graphics();
        box.fillStyle(UITheme.colors.panelBg, 0.98);
        box.fillRoundedRect((width - boxW) / 2, (height - boxH) / 2, boxW, boxH, 16);
        box.lineStyle(2, UITheme.colors.bioGreen, 0.9);
        box.strokeRoundedRect((width - boxW) / 2, (height - boxH) / 2, boxW, boxH, 16);
        modal.add(box);

        const title = this.add.text(width / 2, (height - boxH) / 2 + 38, "NASA OPEN DATA ARCHIVE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "22px",
            color: UITheme.colors.bioGreenStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        const desc = this.add.text(
            (width - boxW) / 2 + 40,
            (height - boxH) / 2 + 75,
            "ASTRA NEXUS integrates live datasets provided by NASA's Open Science Initiatives:\n\n" +
            "• NASA DONKI (Space Weather Database Of Notifications, Knowledge, Information):\n" +
            "  Tracks real Coronal Mass Ejections (CMEs), solar energetic particles, and solar flares.\n\n" +
            "• NASA MARS TREK & CTX (Context Camera):\n" +
            "  High-resolution orbital cartography covering Jezero Crater and Arcadia Planitia.\n\n" +
            "• NASA OSDR (Open Science Data Repository):\n" +
            "  Spaceflight biological research analyzing crew radiation doses and bone health.",
            {
                fontFamily: UITheme.fonts.body,
                fontSize: "13px",
                color: "#E2EDFC",
                lineSpacing: 5,
                wordWrap: { width: boxW - 80 }
            }
        );

        const closeBtn = ButtonFactory.createButton({
            scene: this,
            x: width / 2,
            y: (height - boxH) / 2 + boxH - 45,
            width: 220,
            height: 42,
            text: "CLOSE ARCHIVE",
            primaryColor: UITheme.colors.primaryCyan,
            onClick: () => modal.destroy()
        });

        modal.add([title, desc, closeBtn]);
    }

    private clearActiveComponents() {
        if (this.titleComponent) {
            this.titleComponent.destroy();
            this.titleComponent = undefined;
        }
        if (this.roleComponent) {
            this.roleComponent.destroy();
            this.roleComponent = undefined;
        }
        if (this.siteComponent) {
            this.siteComponent.destroy();
            this.siteComponent = undefined;
        }
        if (this.customizerComponent) {
            this.customizerComponent.destroy();
            this.customizerComponent = undefined;
        }
        if (this.modalContainer) {
            this.modalContainer.destroy();
            this.modalContainer = undefined;
        }
    }
}

export default OutpostSolScene;
