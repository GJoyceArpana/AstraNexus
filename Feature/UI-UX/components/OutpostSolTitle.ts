import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import ButtonFactory from "./ButtonFactory.ts";

export interface OutpostSolTitleCallbacks {
    onStartMission: () => void;
    onSelectRole: () => void;
    onSelectLandingSite: () => void;
    onCustomization: () => void;
    onOpenTelemetry: () => void;
    onHowToPlay: () => void;
}

export class OutpostSolTitle {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private callbacks: OutpostSolTitleCallbacks;
    private particles: Phaser.GameObjects.Arc[] = [];

    constructor(scene: Phaser.Scene, callbacks: OutpostSolTitleCallbacks) {
        this.scene = scene;
        this.callbacks = callbacks;
        this.container = this.scene.add.container(0, 0);
        this.init();
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        const { width, height } = this.scene.scale;

        // 1. Atmosphere & Mars Horizon
        this.createMarsAtmosphere(width, height);

        // 2. Outpost Sol Habitat Visuals
        this.createHabitatSilhouette(width, height);

        // 3. Floating Dust & Twinkling Stars
        this.createDustParticles(width, height);

        // 4. Logo & Mission Header
        this.createTitleTypography(width);

        // 5. Interactive Navigation Menu
        this.createMainMenu(width, height);

        // 6. NASA Official Badge & Footer
        this.createFooter(width, height);
    }

    private createMarsAtmosphere(w: number, h: number) {
        // Deep Space Backdrop
        const bg = this.scene.add.rectangle(0, 0, w, h, UITheme.colors.marsSky).setOrigin(0);
        this.container.add(bg);

        // Distant Mars Sun & Atmospheric Halo
        const sunGlow = this.scene.add.circle(w * 0.78, h * 0.22, 180, UITheme.colors.marsGlow, 0.25);
        const sunCore = this.scene.add.circle(w * 0.78, h * 0.22, 60, 0xFFAB91, 0.95);
        this.container.add([sunGlow, sunCore]);

        this.scene.tweens.add({
            targets: sunGlow,
            scale: 1.15,
            alpha: 0.35,
            duration: 3500,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        // Mars Mountain Ridges (Layered depth)
        const ridgeFar = this.scene.add.ellipse(w * 0.5, h * 0.88, w * 1.3, 260, UITheme.colors.marsDeepRust);
        const ridgeMid = this.scene.add.ellipse(w * 0.8, h * 0.92, w * 1.1, 220, 0x93443C);
        const ground = this.scene.add.rectangle(0, h * 0.82, w, h * 0.18, UITheme.colors.marsSurface).setOrigin(0);
        
        this.container.add([ridgeFar, ridgeMid, ground]);
    }

    private createHabitatSilhouette(w: number, h: number) {
        // If textures exist in asset library, render Mars habitat structures
        const savedMaterial = this.scene.registry.get("baseConstructionMaterial") ||
            (typeof window !== "undefined" && window.localStorage ? localStorage.getItem("astra_base_material") : null);

        if (savedMaterial === "sand" && this.scene.textures.exists("sand-base-station")) {
            const hab = this.scene.add.image(w * 0.78, h * 0.76, "sand-base-station");
            hab.setScale(0.36);
            this.container.add(hab);
        } else if (this.scene.textures.exists("mars-habitat")) {
            const hab = this.scene.add.image(w * 0.78, h * 0.75, "mars-habitat");
            hab.setScale(0.55);
            if (savedMaterial === "glass") {
                hab.setTint(0xD0F8FF);
            }
            this.container.add(hab);
        }

        if (this.scene.textures.exists("solar-panels")) {
            const solar = this.scene.add.image(w * 0.62, h * 0.79, "solar-panels");
            solar.setScale(0.45);
            this.container.add(solar);
        }

        if (this.scene.textures.exists("dish-antenna")) {
            const dish = this.scene.add.image(w * 0.90, h * 0.66, "dish-antenna");
            dish.setScale(0.38);
            this.container.add(dish);
        }
    }

    private createDustParticles(w: number, h: number) {
        // Twinkling stars
        for (let i = 0; i < 60; i++) {
            const star = this.scene.add.circle(
                Phaser.Math.Between(0, w),
                Phaser.Math.Between(0, h * 0.65),
                Phaser.Math.FloatBetween(0.8, 2.0),
                0xFFFFFF,
                Phaser.Math.FloatBetween(0.3, 0.9)
            );
            this.container.add(star);

            this.scene.tweens.add({
                targets: star,
                alpha: 0.15,
                duration: Phaser.Math.Between(1200, 3000),
                yoyo: true,
                repeat: -1
            });
        }

        // Drifting red Martian dust
        for (let i = 0; i < 25; i++) {
            const dust = this.scene.add.circle(
                Phaser.Math.Between(0, w),
                Phaser.Math.Between(h * 0.4, h * 0.9),
                Phaser.Math.FloatBetween(1.5, 3.5),
                UITheme.colors.marsAmber,
                Phaser.Math.FloatBetween(0.2, 0.6)
            );
            this.particles.push(dust);
            this.container.add(dust);

            this.scene.tweens.add({
                targets: dust,
                x: `+=${Phaser.Math.Between(60, 180)}`,
                y: `+=${Phaser.Math.Between(-30, 30)}`,
                alpha: 0.1,
                duration: Phaser.Math.Between(4000, 8000),
                yoyo: true,
                repeat: -1
            });
        }
    }

    private createTitleTypography(w: number) {
        const titleGroup = this.scene.add.container(w * 0.30, 140);

        // Status Ribbon
        const statusBadge = this.scene.add.graphics();
        statusBadge.fillStyle(UITheme.colors.panelBg, 0.85);
        statusBadge.fillRoundedRect(-160, -64, 320, 26, 6);
        statusBadge.lineStyle(1.5, UITheme.colors.primaryCyan, 0.8);
        statusBadge.strokeRoundedRect(-160, -64, 320, 26, 6);
        titleGroup.add(statusBadge);

        const statusText = this.scene.add.text(0, -51, "✦ NASA MARS EXPLORATION INITIATIVE ✦", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        titleGroup.add(statusText);

        // Glowing Main Title Shadow
        const titleShadow = this.scene.add.text(3, 3, "OUTPOST SOL", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "64px",
            color: "#000000",
            fontStyle: "900"
        }).setOrigin(0.5);
        titleGroup.add(titleShadow);

        // Main Title
        const titleText = this.scene.add.text(0, 0, "OUTPOST SOL", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "64px",
            color: "#FFFFFF",
            fontStyle: "900"
        }).setOrigin(0.5);
        titleGroup.add(titleText);

        // Glowing Underline / Energy Bar
        const bar = this.scene.add.graphics();
        bar.fillStyle(UITheme.colors.marsAmber, 1);
        bar.fillRoundedRect(-180, 42, 360, 4, 2);
        titleGroup.add(bar);

        // Subtitle
        const subtitle = this.scene.add.text(0, 62, "MARS HABITAT COLONIZATION & SURVIVAL SIMULATION", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: UITheme.colors.textSecondary,
            fontStyle: "bold",
            letterSpacing: 1.5,
            align: "center",
            wordWrap: { width: 380 }
        }).setOrigin(0.5);
        titleGroup.add(subtitle);

        this.container.add(titleGroup);
    }

    private createMainMenu(w: number, _h: number) {
        const startY = 275;
        const spacing = 62;
        const menuX = w * 0.30;
        const btnW = 370;

        // Button 1: LAUNCH MISSION
        const launchBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: menuX,
            y: startY,
            width: btnW,
            height: 52,
            fontSize: "15px",
            text: "INITIALIZE MISSION",
            primaryColor: UITheme.colors.solarGold,
            secondaryColor: 0x221A08,
            textColor: UITheme.colors.solarGoldStr,
            icon: "🚀",
            onClick: () => this.callbacks.onStartMission()
        });
        this.container.add(launchBtn);

        // Button 2: SELECT ROLE / DIFFICULTY
        const roleBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: menuX,
            y: startY + spacing,
            width: btnW,
            height: 50,
            fontSize: "14px",
            text: "COMMAND ROLE SELECTOR",
            primaryColor: UITheme.colors.primaryCyan,
            icon: "🎖",
            onClick: () => this.callbacks.onSelectRole()
        });
        this.container.add(roleBtn);

        // Button 3: LANDING-SITE RADAR
        const siteBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: menuX,
            y: startY + spacing * 2,
            width: btnW,
            height: 50,
            fontSize: "14px",
            text: "MARS LANDING SITES",
            primaryColor: UITheme.colors.marsAmber,
            icon: "🪐",
            onClick: () => this.callbacks.onSelectLandingSite()
        });
        this.container.add(siteBtn);

        // Button 4: ASTRONAUT CUSTOMIZER
        const customBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: menuX,
            y: startY + spacing * 3,
            width: btnW,
            height: 50,
            fontSize: "14px",
            text: "ASTRONAUT CUSTOMIZATION",
            primaryColor: UITheme.colors.cosmicPurple,
            icon: "🧑‍🚀",
            onClick: () => this.callbacks.onCustomization()
        });
        this.container.add(customBtn);

        // Button 5: NASA TELEMETRY & SCIENCE
        const telemetryBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: menuX,
            y: startY + spacing * 4,
            width: btnW,
            height: 50,
            fontSize: "14px",
            text: "NASA TELEMETRY ARCHIVE",
            primaryColor: UITheme.colors.bioGreen,
            icon: "📡",
            onClick: () => this.callbacks.onOpenTelemetry()
        });
        this.container.add(telemetryBtn);

        // Button 6: HOW TO PLAY
        const howToBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: menuX,
            y: startY + spacing * 5,
            width: btnW,
            height: 50,
            fontSize: "14px",
            text: "CADET MISSION GUIDE",
            primaryColor: 0x88A0C4,
            icon: "📖",
            onClick: () => this.callbacks.onHowToPlay()
        });
        this.container.add(howToBtn);
    }

    private createFooter(w: number, h: number) {
        const footerText = this.scene.add.text(
            w * 0.5,
            h - 22,
            "ASTRA NEXUS · POWERED BY NASA OPEN DATA (DONKI & MARS TREK) · CHILD-SAFE INTERFACE",
            {
                fontFamily: UITheme.fonts.body,
                fontSize: "12px",
                color: UITheme.colors.textMuted
            }
        ).setOrigin(0.5);
        this.container.add(footerText);
    }

    public destroy() {
        this.container.destroy();
    }
}

export default OutpostSolTitle;
