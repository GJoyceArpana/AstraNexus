import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import { SoundFX } from "./ButtonFactory.ts";

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
    private menuButtons: Phaser.GameObjects.Container[] = [];
    private menuActions: Array<() => void> = [];
    private keyboardFocusRing?: Phaser.GameObjects.Graphics;
    private keyboardMenuActive = false;
    private menuFocusIndex = 0;

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

        // 1. Serene Martian Celestial Sky, Realistic Sun & Smooth Horizon (Zero Creases/Lines)
        this.createMarsAtmosphere(width, height);

        // 2. Perfectly Spaced Base Station Assets (Completely Stable, Zero Crowding)
        this.createBaseStationScene(width, height);

        // 3. Static Cosmic Stars in Deep Space
        this.createStars(width, height);

        // 4. Command Console Frame & SOL SURVIVOR Terminal Menu
        this.createCommandTerminal(height);

        // 5. Clean, Legible NASA Open Data Footer
        this.createFooter(width, height);
    }

    // =========================================================
    // 1. MARS ATMOSPHERE & REALISTIC CELESTIAL SUN (NO CREASES/LINES)
    // =========================================================
    private createMarsAtmosphere(w: number, h: number) {
        // Deep Space Celestial Background
        const bg = this.scene.add.rectangle(0, 0, w, h, UITheme.colors.marsSky).setOrigin(0);
        this.container.add(bg);

        // Realistic Martian Sun: Small, bright celestial star (not a giant orange ball!)
        const sunX = w * 0.78;
        const sunY = h * 0.18;

        const sunHalo = this.scene.add.circle(sunX, sunY, 36, 0xFFE082, 0.16);
        const sunCore = this.scene.add.circle(sunX, sunY, 15, 0xFFFFFF, 0.98);
        this.container.add([sunHalo, sunCore]);

        // Smooth, Seamless Martian Horizon Curves (No sharp lines, No creases, No seams)
        const farHill = this.scene.add.ellipse(w * 0.60, h * 0.86, w * 1.35, 260, UITheme.colors.marsDeepRust);
        const midHill = this.scene.add.ellipse(w * 0.85, h * 0.90, w * 1.15, 220, 0x93443C);
        const ground = this.scene.add.rectangle(0, h * 0.82, w, h * 0.18, UITheme.colors.marsSurface).setOrigin(0);

        this.container.add([farHill, midHill, ground]);
    }

    // =========================================================
    // 2. BASE STATION ASSETS (PERFECTLY SPACED & STABLE)
    // =========================================================
    private createBaseStationScene(w: number, h: number) {
        const baseGroup = this.scene.add.container(0, 0);

        const savedMaterial = this.scene.registry.get("baseConstructionMaterial") ||
            (typeof window !== "undefined" && window.localStorage ? localStorage.getItem("astra_base_material") : null);

        // 1. Solar Panels Array: Cleanly spaced well to the left (x = 760)
        // Completely clear of the habitat's stairs and platform with ~250px breathing room!
        if (this.scene.textures.exists("solar-panels")) {
            const solar = this.scene.add.image(w * 0.60, h * 0.77, "solar-panels");
            solar.setScale(0.44);
            baseGroup.add(solar);
        }

        // 2. Habitat Dome: Proud centerpiece at x = 1000, y = 520
        const habX = w * 0.79;
        const habY = h * 0.73;

        let hab: Phaser.GameObjects.Image | null = null;
        if (savedMaterial === "sand" && this.scene.textures.exists("sand-base-station")) {
            hab = this.scene.add.image(habX, habY, "sand-base-station");
            hab.setScale(0.36);
        } else if (this.scene.textures.exists("mars-habitat")) {
            hab = this.scene.add.image(habX, habY, "mars-habitat");
            hab.setScale(0.55);
            if (savedMaterial === "glass") hab.setTint(0xD0F8FF);
        } else if (this.scene.textures.exists("base-station")) {
            hab = this.scene.add.image(habX, habY, "base-station");
            hab.setScale(0.66);
        }

        if (hab) {
            baseGroup.add(hab);
        }

        // 3. High-Gain Dish Antenna: Placed comfortably to the right of the habitat
        if (this.scene.textures.exists("dish-antenna")) {
            const dish = this.scene.add.image(w * 0.92, h * 0.64, "dish-antenna");
            dish.setScale(0.38);
            baseGroup.add(dish);
        }

        this.container.add(baseGroup);
    }

    // =========================================================
    // 3. COSMIC TWINKLING STARS (DEEP SKY ONLY)
    // =========================================================
    private createStars(w: number, h: number) {
        for (let i = 0; i < 65; i++) {
            const star = this.scene.add.circle(
                Phaser.Math.Between(15, w - 15),
                Phaser.Math.Between(15, h * 0.62),
                Phaser.Math.FloatBetween(0.8, 2.0),
                0xFFFFFF,
                Phaser.Math.FloatBetween(0.3, 0.9)
            );
            this.container.add(star);
        }
    }

    // =========================================================
    // 4. COMMAND TERMINAL CONSOLE & SOL SURVIVOR BRANDING
    // =========================================================
    private createCommandTerminal(h: number) {
        const termW = 460;
        const termH = 645;
        const termX = 40;
        const termY = (h - termH) / 2;

        const terminal = this.scene.add.container(termX, termY);

        // 1. Sleek Frosted Glass Console Panel
        const glassBg = this.scene.add.graphics();
        glassBg.fillStyle(0x061122, 0.92);
        glassBg.fillRoundedRect(0, 0, termW, termH, 16);
        glassBg.lineStyle(2, UITheme.colors.primaryCyan, 0.85);
        glassBg.strokeRoundedRect(0, 0, termW, termH, 16);

        // Inner glowing border
        glassBg.lineStyle(1, 0x1E3B68, 0.6);
        glassBg.strokeRoundedRect(6, 6, termW - 12, termH - 12, 12);

        // Futuristic Cyber Corner Accents
        const cornerSize = 18;
        glassBg.lineStyle(3, UITheme.colors.solarGold, 1);
        glassBg.lineBetween(0, cornerSize, 0, 0);
        glassBg.lineBetween(0, 0, cornerSize, 0);
        glassBg.lineBetween(termW - cornerSize, 0, termW, 0);
        glassBg.lineBetween(termW, 0, termW, cornerSize);
        glassBg.lineBetween(0, termH - cornerSize, 0, termH);
        glassBg.lineBetween(0, termH, cornerSize, termH);
        glassBg.lineBetween(termW - cornerSize, termH, termW, termH);
        glassBg.lineBetween(termW, termH - cornerSize, termW, termH);

        terminal.add(glassBg);

        // Terminal Top System Header
        const sysTag = this.scene.add.text(termW / 2, 22, "✦ NASA MARS BASE EXPEDITION · 2026 ✦", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            letterSpacing: 2
        }).setOrigin(0.5);
        terminal.add(sysTag);

        // 2. MAIN LOGO: "SOL SURVIVOR" (Blockbuster Sci-Fi Title Typography)
        const titleY = 64;

        // Glowing Golden Drop Shadow
        const titleGlow = this.scene.add.text(termW / 2, titleY + 2, "SOL SURVIVOR", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "44px",
            color: "#FF6D00",
            fontStyle: "900",
            letterSpacing: 2
        }).setOrigin(0.5);
        titleGlow.setShadow(0, 0, "#FFAB00", 16);
        terminal.add(titleGlow);

        // Crisp Radiant Solar Gold & White Main Title
        const mainTitle = this.scene.add.text(termW / 2, titleY, "SOL SURVIVOR", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "44px",
            color: "#FFF9C4",
            fontStyle: "900",
            letterSpacing: 2
        }).setOrigin(0.5);
        mainTitle.setShadow(0, 2, "#000000", 6);
        terminal.add(mainTitle);

        // Mission Subtitle
        const subTitle = this.scene.add.text(termW / 2, titleY + 36, "FIVE WAYS NOT TO POP! · SURVIVAL SIMULATION", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 1.2
        }).setOrigin(0.5);
        terminal.add(subTitle);

        // Glowing Decorative Divider Line with Center Diamond Pip
        const divG = this.scene.add.graphics();
        divG.lineStyle(1.5, UITheme.colors.primaryCyan, 0.6);
        divG.lineBetween(35, titleY + 54, termW - 35, titleY + 54);
        divG.fillStyle(UITheme.colors.solarGold, 1);
        divG.fillCircle(termW / 2, titleY + 54, 3.5);
        terminal.add(divG);

        // 3. INTERACTIVE NAVIGATION MENU
        const menuStartY = titleY + 76;
        const menuBtnW = 404;
        const btnSpacing = 68;

        // HERO BUTTON 1: INITIALIZE (Directly launches Customization & Descent)
        const launchBtn = this.createHeroButton({
            x: termW / 2,
            y: menuStartY + 28,
            width: menuBtnW,
            height: 52,
            title: "INITIALIZE",
            icon: "🚀",
            onClick: () => this.callbacks.onStartMission()
        });
        terminal.add(launchBtn);

        // BUTTON 2: ASTRONAUT CUSTOMIZATION
        const customBtn = this.createMenuCard({
            x: termW / 2,
            y: menuStartY + 28 + btnSpacing,
            width: menuBtnW,
            height: 50,
            title: "ASTRONAUT CUSTOMIZATION",
            subtitle: "Suits, Visors, Colors & Surface Tools",
            icon: "🧑‍🚀",
            accentColor: UITheme.colors.primaryCyan,
            onClick: () => this.callbacks.onCustomization()
        });
        terminal.add(customBtn);

        // BUTTON 3: MARS LANDING SITES
        const siteBtn = this.createMenuCard({
            x: termW / 2,
            y: menuStartY + 28 + btnSpacing * 2,
            width: menuBtnW,
            height: 50,
            title: "MARS LANDING SITES",
            subtitle: "Jezero Crater & Arcadia Planitia",
            icon: "🪐",
            accentColor: UITheme.colors.marsAmber,
            onClick: () => this.callbacks.onSelectLandingSite()
        });
        terminal.add(siteBtn);

        // BUTTON 4: NASA TELEMETRY ARCHIVE
        const telemetryBtn = this.createMenuCard({
            x: termW / 2,
            y: menuStartY + 28 + btnSpacing * 3,
            width: menuBtnW,
            height: 50,
            title: "NASA TELEMETRY ARCHIVE",
            subtitle: "Live DONKI Space Weather & Mars Data",
            icon: "📡",
            accentColor: UITheme.colors.bioGreen,
            onClick: () => this.callbacks.onOpenTelemetry()
        });
        terminal.add(telemetryBtn);

        // BUTTON 5: CADET SURVIVAL GUIDE
        const guideBtn = this.createMenuCard({
            x: termW / 2,
            y: menuStartY + 28 + btnSpacing * 4,
            width: menuBtnW,
            height: 50,
            title: "CADET SURVIVAL GUIDE",
            subtitle: "How to Play, Controls & Mission Tips",
            icon: "📖",
            accentColor: 0x4FC3F7,
            onClick: () => this.callbacks.onHowToPlay()
        });
<<<<<<< HEAD
        this.container.add(howToBtn);

        this.menuButtons = [launchBtn, roleBtn, siteBtn, customBtn, telemetryBtn, howToBtn];
        this.menuActions = [
            this.callbacks.onStartMission,
            this.callbacks.onSelectRole,
            this.callbacks.onSelectLandingSite,
            this.callbacks.onCustomization,
            this.callbacks.onOpenTelemetry,
            this.callbacks.onHowToPlay
        ];

        this.keyboardFocusRing = this.scene.add.graphics();
        this.container.add(this.keyboardFocusRing);
        this.scene.input.keyboard?.on("keydown", this.handleMenuKeyboard, this);

        const keyboardHint = this.scene.add.text(menuX, startY + spacing * 5 + 40, "↑ / ↓  NAVIGATE     ENTER  SELECT", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#4A2B26",
            fontStyle: "bold",
            letterSpacing: 0.6
        }).setOrigin(0.5);
        this.container.add(keyboardHint);
    }

    private handleMenuKeyboard(event: KeyboardEvent) {
        if (!this.menuButtons.length) return;

        const key = event.key.toLowerCase();
        if (key === "arrowdown" || key === "s" || key === "tab") {
            event.preventDefault();
            this.keyboardMenuActive = true;
            this.menuFocusIndex = (this.menuFocusIndex + 1) % this.menuButtons.length;
            this.drawKeyboardFocus();
        } else if (key === "arrowup" || key === "w") {
            event.preventDefault();
            this.keyboardMenuActive = true;
            this.menuFocusIndex = (this.menuFocusIndex - 1 + this.menuButtons.length) % this.menuButtons.length;
            this.drawKeyboardFocus();
        } else if (key === "enter" || key === " ") {
            event.preventDefault();
            this.menuActions[this.menuFocusIndex]?.();
        }
    }

    private drawKeyboardFocus() {
        const ring = this.keyboardFocusRing;
        if (!ring) return;
        ring.clear();
        if (!this.keyboardMenuActive) return;

        const button = this.menuButtons[this.menuFocusIndex];
        const buttonHeight = this.menuFocusIndex === 0 ? 52 : 50;
        ring.lineStyle(2, 0xE8FCFF, 0.95);
        ring.strokeRoundedRect(button.x - 194, button.y - buttonHeight / 2 - 5, 388, buttonHeight + 10, 15);
=======
        terminal.add(guideBtn);

        // Console Bottom Status Pill inside terminal
        const termStatus = this.scene.add.text(termW / 2, termH - 24, "● SYSTEM ONLINE · MRO RELAY: ACTIVE · LAT 18.38°N", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: UITheme.colors.primaryCyanStr,
            letterSpacing: 1
        }).setOrigin(0.5);
        terminal.add(termStatus);

        this.container.add(terminal);
>>>>>>> origin/main
    }

    // =========================================================
    // HERO BUTTON BUILDER (Glowing Golden Launch Action)
    // =========================================================
    private createHeroButton(config: {
        x: number;
        y: number;
        width: number;
        height: number;
        title: string;
        icon: string;
        onClick: () => void;
    }): Phaser.GameObjects.Container {
        const btn = this.scene.add.container(config.x, config.y);
        const w = config.width;
        const h = config.height;

        // Solid Radiant Golden Body
        const bg = this.scene.add.graphics();
        bg.fillGradientStyle(0xFFD600, 0xFFAB00, 0xFF8F00, 0xFF6F00, 1);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
        bg.lineStyle(2, 0xFFFFFF, 0.9);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        btn.add(bg);

        // Centered Icon & Title
        const iconText = this.scene.add.text(-68, 0, config.icon, {
            fontSize: "20px"
        }).setOrigin(0.5);
        btn.add(iconText);

        const titleText = this.scene.add.text(-44, 0, config.title, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            color: "#0A111E",
            fontStyle: "900",
            letterSpacing: 2
        }).setOrigin(0, 0.5);
        btn.add(titleText);

        // Hit Shield for instant responsiveness
        const hit = this.scene.add.rectangle(0, 0, w, h, 0x000000, 0.001);
        hit.setInteractive({ useHandCursor: true });
        btn.add(hit);

        hit.on("pointerover", () => {
            SoundFX.playHover();
            this.scene.tweens.add({
                targets: btn,
                scaleX: 1.02,
                scaleY: 1.02,
                duration: 90,
                ease: "Back.easeOut"
            });
            bg.clear();
            bg.fillGradientStyle(0xFFFF8D, 0xFFD600, 0xFFA000, 0xFF8F00, 1);
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
            bg.lineStyle(2.5, 0xFFFFFF, 1);
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        });

        hit.on("pointerout", () => {
            this.scene.tweens.add({
                targets: btn,
                scaleX: 1.0,
                scaleY: 1.0,
                duration: 100,
                ease: "Quad.easeOut"
            });
            bg.clear();
            bg.fillGradientStyle(0xFFD600, 0xFFAB00, 0xFF8F00, 0xFF6F00, 1);
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 10);
            bg.lineStyle(2, 0xFFFFFF, 0.9);
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 10);
        });

        hit.on("pointerdown", () => {
            SoundFX.playClick();
            this.scene.tweens.add({
                targets: btn,
                scaleX: 0.97,
                scaleY: 0.97,
                duration: 50,
                yoyo: true,
                onComplete: () => config.onClick()
            });
        });

        return btn;
    }

    // =========================================================
    // SLEEK MENU CARD BUILDER (Rich 2-Line High-Tech Buttons)
    // =========================================================
    private createMenuCard(config: {
        x: number;
        y: number;
        width: number;
        height: number;
        title: string;
        subtitle: string;
        icon: string;
        accentColor: number;
        onClick: () => void;
    }): Phaser.GameObjects.Container {
        const btn = this.scene.add.container(config.x, config.y);
        const w = config.width;
        const h = config.height;
        const hexStr = `#${config.accentColor.toString(16).padStart(6, "0")}`;

        // Background Box
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x0C1D38, 0.88);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
        bg.lineStyle(1.5, config.accentColor, 0.7);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
        btn.add(bg);

        // Icon in Neon Container Box
        const iconBox = this.scene.add.graphics();
        iconBox.fillStyle(0x07152B, 0.9);
        iconBox.fillRoundedRect(-w / 2 + 8, -h / 2 + 7, 36, 36, 6);
        iconBox.lineStyle(1, config.accentColor, 0.8);
        iconBox.strokeRoundedRect(-w / 2 + 8, -h / 2 + 7, 36, 36, 6);
        btn.add(iconBox);

        const iconText = this.scene.add.text(-w / 2 + 26, 0, config.icon, {
            fontSize: "17px"
        }).setOrigin(0.5);
        btn.add(iconText);

        // Main Title
        const titleText = this.scene.add.text(-w / 2 + 54, -7, config.title, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12.5px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0, 0.5);
        btn.add(titleText);

        // Subtitle / Description
        const subText = this.scene.add.text(-w / 2 + 54, 10, config.subtitle, {
            fontFamily: UITheme.fonts.body,
            fontSize: "10px",
            color: "#9BB5D5"
        }).setOrigin(0, 0.5);
        btn.add(subText);

        // Right-side chevron arrow
        const arrow = this.scene.add.text(w / 2 - 20, 0, "➔", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: hexStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        btn.add(arrow);

        // Interactive Hit Shield
        const hit = this.scene.add.rectangle(0, 0, w, h, 0x000000, 0.001);
        hit.setInteractive({ useHandCursor: true });
        btn.add(hit);

        hit.on("pointerover", () => {
            SoundFX.playHover();
            this.scene.tweens.add({
                targets: btn,
                x: config.x + 6,
                duration: 90,
                ease: "Back.easeOut"
            });
            bg.clear();
            bg.fillStyle(0x132E58, 0.96);
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
            bg.lineStyle(2, config.accentColor, 1);
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
            titleText.setColor(hexStr);
        });

        hit.on("pointerout", () => {
            this.scene.tweens.add({
                targets: btn,
                x: config.x,
                duration: 90,
                ease: "Quad.easeOut"
            });
            bg.clear();
            bg.fillStyle(0x0C1D38, 0.88);
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 8);
            bg.lineStyle(1.5, config.accentColor, 0.7);
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 8);
            titleText.setColor("#FFFFFF");
        });

        hit.on("pointerdown", () => {
            SoundFX.playSelect();
            this.scene.tweens.add({
                targets: btn,
                scaleX: 0.98,
                scaleY: 0.98,
                duration: 50,
                yoyo: true,
                onComplete: () => config.onClick()
            });
        });

        return btn;
    }

    // =========================================================
    // 5. HIGH-CONTRAST FOOTER STATUS BAR
    // =========================================================
    private createFooter(w: number, h: number) {
        const footerY = h - 18;

        const footer = this.scene.add.text(
            w * 0.5,
            footerY,
            "ASTRA NEXUS · SOL SURVIVOR · POWERED BY NASA OPEN DATA (DONKI / MARS TREK / PDS) · CHILD SAFE",
            {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10.5px",
                color: "#C2D7EF",
                fontStyle: "bold",
                letterSpacing: 1
            }
        ).setOrigin(0.5);

        // Add subtle dark pill background so footer stands out on any terrain
        const bounds = footer.getBounds();
        const pillBg = this.scene.add.graphics();
        pillBg.fillStyle(0x060E1A, 0.85);
        pillBg.fillRoundedRect(bounds.x - 14, bounds.y - 4, bounds.width + 28, bounds.height + 8, 6);
        pillBg.lineStyle(1, 0x1E3B68, 0.6);
        pillBg.strokeRoundedRect(bounds.x - 14, bounds.y - 4, bounds.width + 28, bounds.height + 8, 6);

        this.container.add([pillBg, footer]);
    }

    public destroy() {
        this.scene.input.keyboard?.off("keydown", this.handleMenuKeyboard, this);
        this.container.destroy();
    }
}

export default OutpostSolTitle;
