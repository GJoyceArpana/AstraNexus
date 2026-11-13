import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import ButtonFactory from "./ButtonFactory.ts";

export type GenderType = "boy" | "girl";

export interface SuitModel {
    frame: number;
    name: string;
    roleTag: string;
    perk: string;
}

export interface ToolItem {
    id: string;
    name: string;
    icon: string;
    desc: string;
    perk: string;
}

export interface CustomizationData {
    gender: GenderType;
    avatarFrame: number;
    suitName: string;
    suitColor: number;
    suitColorName: string;
    toolId: string;
    callsign: string;
}

export interface AstronautCustomizerCallbacks {
    onComplete: (data: CustomizationData) => void;
    onBack: () => void;
}

export class AstronautCustomizer {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private callbacks: AstronautCustomizerCallbacks;

    private gender: GenderType = "boy";
    private avatarFrame = 1;
    private selectedColorIndex = 0;
    private selectedToolId = "drill";
    private callsign = "Cadet Orion";

    private avatarImage?: Phaser.GameObjects.Image;
    private avatarContainer!: Phaser.GameObjects.Container;
    private platformBeam!: Phaser.GameObjects.Graphics;
    private platformRing!: Phaser.GameObjects.Ellipse;
    private colorButtons: Phaser.GameObjects.Container[] = [];
    private suitCards: Phaser.GameObjects.Container[] = [];
    private toolCards: Map<string, Phaser.GameObjects.Container> = new Map();
    private callsignText!: Phaser.GameObjects.Text;
    private suitModelTitleText!: Phaser.GameObjects.Text;
    private suitRoleTagText!: Phaser.GameObjects.Text;
    private boyBtn!: Phaser.GameObjects.Container;
    private girlBtn!: Phaser.GameObjects.Container;

    public static readonly boySuitModels: SuitModel[] = [
        { frame: 1, name: "ALPHA RECON EVA", roleTag: "STANDARD RECON", perk: "Balanced Mobility & Oxygen Recirculation" },
        { frame: 2, name: "STEALTH TACTICAL", roleTag: "RECON / PILOT", perk: "Carbon Fiber Plating & Glare Visor" },
        { frame: 3, name: "CYBER MECHA RIG", roleTag: "CORE EXCAVATION", perk: "Reinforced Armor & Thruster Boots" },
        { frame: 4, name: "SOLAR EXPLORER", roleTag: "SURFACE GEOLOGY", perk: "Hi-Vis Safety Orange & Dust Seals" },
        { frame: 5, name: "COMMAND TITAN", roleTag: "MISSION DIRECTOR", perk: "Micro-Meteor Shield & Comms Rig" }
    ];

    public static readonly girlSuitModels: SuitModel[] = [
        { frame: 1, name: "NEKO COSMIC EVA", roleTag: "CAT-EAR EXPEDITION", perk: "Acoustic Audio Visor & Heart Bio-Sensors" },
        { frame: 2, name: "STARRY NEBULA", roleTag: "COSMIC ASTROBIOLOGY", perk: "Starfield Galaxy Visor & O₂ Recirculator" },
        { frame: 3, name: "VALKYRIE MECHA", roleTag: "CYBER VANGUARD", perk: "Winged Gauntlets & Neon Deflectors" },
        { frame: 4, name: "SOLAR PULSE EVA", roleTag: "SURFACE SCOUT", perk: "Hi-Flex Sports Jumpsuit & Insulation" },
        { frame: 5, name: "ASTRA NOVA COMMAND", roleTag: "CELESTIAL COMMAND", perk: "Star Crest Plating & Telemetry Antenna" }
    ];

    public getSuitModels(): SuitModel[] {
        return this.gender === "boy" ? AstronautCustomizer.boySuitModels : AstronautCustomizer.girlSuitModels;
    }

    private readonly suitColors = [
        { name: "MARS RUST", hex: 0xFF7043, str: "#FF7043" },
        { name: "ARES CYAN", hex: 0x00E5FF, str: "#00E5FF" },
        { name: "SOL GOLD", hex: 0xFFD600, str: "#FFD600" },
        { name: "BIO GREEN", hex: 0x00E676, str: "#00E676" },
        { name: "COSMIC VOID", hex: 0xB388FF, str: "#B388FF" },
        { name: "POLAR WHITE", hex: 0xE0F7FA, str: "#E0F7FA" }
    ];

    private readonly tools: ToolItem[] = [
        {
            id: "drill",
            name: "DRILLING MACHINE",
            icon: "⚙",
            desc: "Martian core drill for mineral & water ice extraction.",
            perk: "+25% Resource Yield"
        },
        {
            id: "medkit",
            name: "FIRST AID KIT",
            icon: "♥",
            desc: "Emergency biogel injectors to treat low-G fatigue.",
            perk: "+30% Health Recovery"
        },
        {
            id: "spanner",
            name: "TOOLBOX & SPANNER",
            icon: "🔧",
            desc: "Precision torque tools for solar array & airlock repairs.",
            perk: "-40% Repair Time"
        },
        {
            id: "radio",
            name: "WALKIE TALKIE",
            icon: "📻",
            desc: "High-frequency transceiver linked to NASA Mission Control.",
            perk: "+50% Telemetry Range"
        }
    ];

    constructor(scene: Phaser.Scene, callbacks: AstronautCustomizerCallbacks) {
        this.scene = scene;
        this.callbacks = callbacks;
        this.container = this.scene.add.container(0, 0);

        // Load existing saved state if available
        const saved = this.scene.registry.get("astronautCustomization") as CustomizationData | undefined;
        if (saved) {
            this.gender = saved.gender;
            this.avatarFrame = saved.avatarFrame || 1;
            const cIdx = this.suitColors.findIndex(c => c.hex === saved.suitColor);
            this.selectedColorIndex = cIdx >= 0 ? cIdx : 0;
            this.selectedToolId = saved.toolId;
            this.callsign = saved.callsign;
        }

        this.init();
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        const { width, height } = this.scene.scale;

        // 1. Deep Space Background
        const bg = this.scene.add.rectangle(0, 0, width, height, UITheme.colors.spaceDark).setOrigin(0);
        this.container.add(bg);

        // Mars atmosphere nebula
        const nebula = this.scene.add.circle(width * 0.25, height * 0.48, 360, UITheme.colors.marsSky, 0.45);
        this.container.add(nebula);

        for (let i = 0; i < 45; i++) {
            const star = this.scene.add.circle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height),
                Phaser.Math.FloatBetween(0.8, 1.8),
                0xFFFFFF,
                Phaser.Math.FloatBetween(0.2, 0.8)
            );
            this.container.add(star);
        }

        // 2. Header
        const title = this.scene.add.text(width / 2, 42, "ASTRONAUT SUIT CUSTOMIZATION", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "28px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 2
        }).setOrigin(0.5);
        this.container.add(title);

        const sub = this.scene.add.text(width / 2, 72, "Equip high-visibility EVA suits with specialized perks for current and upcoming Martian mission levels", {
            fontFamily: UITheme.fonts.body,
            fontSize: "14px",
            color: UITheme.colors.textSecondary
        }).setOrigin(0.5);
        this.container.add(sub);

        // 3. Left Column: Big & Clear Astronaut Holographic Pedestal
        this.createAvatarDisplay(245, 345);

        // 4. Right Column: Controls Panel (Suits, Colors, Tools, Callsign)
        this.createControlsPanel(510, 95, 735, 550);

        // 5. Footer Buttons
        const backBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: 130,
            y: height - 42,
            width: 170,
            height: 42,
            fontSize: "13px",
            text: "← BACK",
            primaryColor: 0x6E85A8,
            onClick: () => this.callbacks.onBack()
        });
        this.container.add(backBtn);

        const launchBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: width - 190,
            y: height - 42,
            width: 290,
            height: 44,
            fontSize: "14px",
            text: "EQUIP SUIT & DEPLOY ➔",
            primaryColor: UITheme.colors.primaryCyan,
            textColor: "#FFFFFF",
            icon: "🚀",
            onClick: () => {
                const suits = this.getSuitModels();
                const currentSuit = suits[this.avatarFrame - 1] || suits[0];
                const data: CustomizationData = {
                    gender: this.gender,
                    avatarFrame: this.avatarFrame,
                    suitName: currentSuit.name,
                    suitColor: this.suitColors[this.selectedColorIndex].hex,
                    suitColorName: this.suitColors[this.selectedColorIndex].name,
                    toolId: this.selectedToolId,
                    callsign: this.callsign
                };
                this.scene.registry.set("astronautCustomization", data);
                if (typeof window !== "undefined" && window.localStorage) {
                    try {
                        localStorage.setItem("astra_astronaut_suit", JSON.stringify(data));
                    } catch {
                        // Ignore storage restrictions
                    }
                }
                this.callbacks.onComplete(data);
            }
        });
        this.container.add(launchBtn);
    }

    private createAvatarDisplay(x: number, y: number) {
        this.avatarContainer = this.scene.add.container(x, y);

        // High-Tech Teleport Base Platform - Wider & Deeper
        this.platformRing = this.scene.add.ellipse(0, 180, 300, 68, 0x0E1F3B);
        this.platformRing.setStrokeStyle(3.5, this.suitColors[this.selectedColorIndex].hex, 1);
        this.avatarContainer.add(this.platformRing);

        // Holographic Beam Glow
        this.platformBeam = this.scene.add.graphics();
        this.updatePlatformBeam();
        this.avatarContainer.add(this.platformBeam);

        // Giant, High-Definition Astronaut Display (scale 0.46, ~305px tall, ultra-clear!)
        this.updateAvatarImage();

        // Mars Low-G Floating Sine Wave
        this.scene.tweens.add({
            targets: this.avatarContainer,
            y: y - 10,
            duration: 2600,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        // Interactive Left / Right Arrows (spaced outwards)
        const prevArrow = ButtonFactory.createIconButton(
            this.scene,
            -165,
            -10,
            "◀",
            20,
            UITheme.colors.primaryCyan,
            () => {
                this.avatarFrame = this.avatarFrame > 1 ? this.avatarFrame - 1 : 5;
                this.onSuitSelected(this.avatarFrame);
            }
        );
        const nextArrow = ButtonFactory.createIconButton(
            this.scene,
            165,
            -10,
            "▶",
            20,
            UITheme.colors.primaryCyan,
            () => {
                this.avatarFrame = this.avatarFrame < 5 ? this.avatarFrame + 1 : 1;
                this.onSuitSelected(this.avatarFrame);
            }
        );
        this.avatarContainer.add([prevArrow, nextArrow]);

        // Suit Title & Specs Plaque (Wider, High Contrast)
        const suitPlaque = this.scene.add.graphics();
        suitPlaque.fillStyle(0x08162B, 0.96);
        suitPlaque.fillRoundedRect(-148, 198, 296, 52, 10);
        suitPlaque.lineStyle(2, UITheme.colors.primaryCyan, 0.9);
        suitPlaque.strokeRoundedRect(-148, 198, 296, 52, 10);
        this.avatarContainer.add(suitPlaque);

        const currentSuit = this.getSuitModels()[this.avatarFrame - 1] || this.getSuitModels()[0];
        this.suitModelTitleText = this.scene.add.text(0, 212, currentSuit.name, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "13px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0.5);

        this.suitRoleTagText = this.scene.add.text(0, 233, `★ ${currentSuit.roleTag} · ${currentSuit.perk}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0.5);
        this.avatarContainer.add([this.suitModelTitleText, this.suitRoleTagText]);

        this.container.add(this.avatarContainer);
    }

    private updatePlatformBeam() {
        const color = this.suitColors[this.selectedColorIndex].hex;
        this.platformBeam.clear();
        this.platformBeam.fillStyle(color, 0.16);
        this.platformBeam.fillTriangle(-140, 180, 140, 180, 0, -190);
        if (this.platformRing) {
            this.platformRing.setStrokeStyle(3.5, color, 1);
        }
    }

    private updateAvatarImage() {
        if (this.avatarImage) {
            this.avatarImage.destroy();
        }

        const frameKey = this.gender === "boy" 
            ? `boy_avatar_${this.avatarFrame}` 
            : `girl_avatar_${this.avatarFrame}`;

        const fallbackKey = this.gender === "boy" ? "boy-astronaut" : "girl-astronaut";
        const textureToUse = this.scene.textures.exists(frameKey) ? frameKey : fallbackKey;

        if (this.scene.textures.exists(textureToUse)) {
            this.avatarImage = this.scene.add.image(0, -10, textureToUse);
            // Extra large, ultra-clear, high-definition scale (scale 0.46)
            this.avatarImage.setScale(0.46);
            // Clean, natural authentic colors (NO muddy face tint)
            this.avatarContainer.add(this.avatarImage);
        }

        const suits = this.getSuitModels();
        const currentSuit = suits[this.avatarFrame - 1] || suits[0];
        if (this.suitModelTitleText) {
            this.suitModelTitleText.setText(currentSuit.name);
        }
        if (this.suitRoleTagText) {
            this.suitRoleTagText.setText(`★ ${currentSuit.roleTag} · ${currentSuit.perk}`);
        }
    }

    private createControlsPanel(x: number, y: number, w: number, h: number) {
        const panel = this.scene.add.container(x, y);

        const bg = this.scene.add.graphics();
        bg.fillStyle(UITheme.colors.panelBg, 0.95);
        bg.fillRoundedRect(0, 0, w, h, UITheme.layout.cardRadius);
        bg.lineStyle(1.5, UITheme.colors.panelBorder, 1);
        bg.strokeRoundedRect(0, 0, w, h, UITheme.layout.cardRadius);
        panel.add(bg);

        // 1. Gender Selection
        const genderLabel = this.scene.add.text(20, 12, "1. ASTRONAUT CADET BASE:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        panel.add(genderLabel);

        this.boyBtn = this.createGenderButton(panel, 120, 44, "boy", "BOY CADET", "👨‍🚀");
        this.girlBtn = this.createGenderButton(panel, 310, 44, "girl", "GIRL CADET", "👩‍🚀");
        this.updateGenderButtons();

        // 2. Select Mars Suit Model (5 Large Visual Cards)
        const suitLabel = this.scene.add.text(20, 74, "2. SELECT MARS SUIT MODEL (EQUIPPED ACROSS ALL SOL MISSIONS):", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
        panel.add(suitLabel);

        this.createSuitCards(panel, 20, 96, w - 40);

        // 3. Suit Telemetry & Beam Color
        const colorLabel = this.scene.add.text(20, 226, "3. SUIT TELEMETRY ACCENT COLOR:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        panel.add(colorLabel);

        this.suitColors.forEach((color, idx) => {
            const swatch = this.scene.add.container(40 + idx * 110, 256);

            const circle = this.scene.add.circle(0, 0, 18, color.hex, 1);
            circle.setStrokeStyle(3, idx === this.selectedColorIndex ? 0xFFFFFF : 0x1A3050, 1);
            swatch.add(circle);

            const name = this.scene.add.text(0, 25, color.name, {
                fontFamily: UITheme.fonts.body,
                fontSize: "10px",
                color: "#A0B4D0"
            }).setOrigin(0.5);
            swatch.add(name);

            // Hit shield
            const hit = this.scene.add.circle(0, 0, 24, 0x000000, 0.001);
            hit.setInteractive({ useHandCursor: true });
            swatch.add(hit);

            hit.on("pointerdown", () => {
                this.selectedColorIndex = idx;
                this.updatePlatformBeam();
                this.updateColorSwatches();
            });

            this.colorButtons.push(swatch);
            panel.add(swatch);
        });

        // 4. Surface Tool Loadout
        const toolLabel = this.scene.add.text(20, 298, "4. MARS SURFACE TOOL LOADOUT:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        panel.add(toolLabel);

        this.tools.forEach((tool, idx) => {
            const row = Math.floor(idx / 2);
            const col = idx % 2;
            const cardX = 20 + col * 350;
            const cardY = 322 + row * 76;
            const cardW = 335;
            const cardH = 68;

            const card = this.scene.add.container(cardX, cardY);
            const cardBg = this.scene.add.graphics();
            card.add(cardBg);

            const icon = this.scene.add.text(16, 14, tool.icon, { fontSize: "24px" });
            const title = this.scene.add.text(48, 10, tool.name, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: "#FFFFFF",
                fontStyle: "bold"
            });
            const desc = this.scene.add.text(48, 26, tool.desc, {
                fontFamily: UITheme.fonts.body,
                fontSize: "10px",
                color: UITheme.colors.textSecondary,
                wordWrap: { width: 275 }
            });
            const perk = this.scene.add.text(48, 48, tool.perk, {
                fontFamily: UITheme.fonts.body,
                fontSize: "10px",
                color: UITheme.colors.bioGreenStr,
                fontStyle: "bold"
            });

            card.add([icon, title, desc, perk]);

            // Hit shield
            const hit = this.scene.add.rectangle(cardW / 2, cardH / 2, cardW, cardH, 0x000000, 0.001);
            hit.setInteractive({ useHandCursor: true });
            card.add(hit);

            hit.on("pointerdown", () => {
                this.selectedToolId = tool.id;
                this.updateToolCardVisuals();
            });

            this.toolCards.set(tool.id, card);
            panel.add(card);
        });

        this.updateToolCardVisuals();

        // 5. Callsign
        const nameLabel = this.scene.add.text(20, 488, "5. CADET CALLSIGN: ", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        panel.add(nameLabel);

        const callsignPresets = ["Cadet Orion", "Commander Nova", "Ares One", "Sol Walker", "Astra Scout"];
        const cycleBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: 230,
            y: 496,
            width: 200,
            height: 34,
            fontSize: "12px",
            text: "CYCLE CALLSIGN 🎲",
            primaryColor: UITheme.colors.marsAmber,
            onClick: () => {
                const currentIdx = callsignPresets.indexOf(this.callsign);
                const nextIdx = (currentIdx + 1) % callsignPresets.length;
                this.callsign = callsignPresets[nextIdx];
                if (this.callsignText) {
                    this.callsignText.setText(this.callsign.toUpperCase());
                }
            }
        });
        panel.add(cycleBtn);

        this.container.add(panel);
    }

    private createGenderButton(panel: Phaser.GameObjects.Container, x: number, y: number, gender: GenderType, label: string, icon: string): Phaser.GameObjects.Container {
        const btn = this.scene.add.container(x, y);
        const w = 175, h = 36;

        const bg = this.scene.add.graphics();
        btn.add(bg);

        const iconText = this.scene.add.text(-60, 0, icon, { fontSize: "18px" }).setOrigin(0.5);
        const labelText = this.scene.add.text(-35, 0, label, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0, 0.5);
        btn.add([iconText, labelText]);

        const hit = this.scene.add.rectangle(0, 0, w, h, 0x000000, 0.001);
        hit.setInteractive({ useHandCursor: true });
        btn.add(hit);

        hit.on("pointerdown", () => {
            this.gender = gender;
            this.updateAvatarImage();
            this.updateSuitCards();
            this.updateGenderButtons();
        });

        panel.add(btn);
        return btn;
    }

    private updateGenderButtons() {
        const w = 175, h = 36, r = 8;

        if (this.boyBtn && this.boyBtn.list[0]) {
            const boyBg = this.boyBtn.list[0] as Phaser.GameObjects.Graphics;
            boyBg.clear();
            if (this.gender === "boy") {
                boyBg.fillStyle(UITheme.colors.primaryCyan, 0.95);
                boyBg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
                boyBg.lineStyle(2, 0xFFFFFF, 1);
                boyBg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
            } else {
                boyBg.fillStyle(UITheme.colors.cardBg, 0.85);
                boyBg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
                boyBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.7);
                boyBg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
            }
        }

        if (this.girlBtn && this.girlBtn.list[0]) {
            const girlBg = this.girlBtn.list[0] as Phaser.GameObjects.Graphics;
            girlBg.clear();
            if (this.gender === "girl") {
                girlBg.fillStyle(0xE040FB, 0.95);
                girlBg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
                girlBg.lineStyle(2, 0xFFFFFF, 1);
                girlBg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
            } else {
                girlBg.fillStyle(UITheme.colors.cardBg, 0.85);
                girlBg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
                girlBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.7);
                girlBg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
            }
        }
    }

    private createSuitCards(panel: Phaser.GameObjects.Container, startX: number, startY: number, totalW: number) {
        const cardW = Math.floor((totalW - 40) / 5);
        const cardH = 114;
        const suits = this.getSuitModels();

        suits.forEach((suit, idx) => {
            const cardX = startX + idx * (cardW + 10);
            const card = this.scene.add.container(cardX, startY);

            // 0: Card Graphics Background
            const bg = this.scene.add.graphics();
            card.add(bg);

            // 1: Thumbnail Image of suit - Much Bigger & Crystal Clear! (scale 0.145)
            const frameKey = `${this.gender}_avatar_${suit.frame}`;
            const thumb = this.scene.add.image(cardW / 2, 46, this.scene.textures.exists(frameKey) ? frameKey : "boy-astronaut");
            thumb.setScale(0.145);
            card.add(thumb);

            // 2: Suit Tag Top Pill
            const tag = this.scene.add.text(cardW / 2, 10, `SUIT 0${suit.frame}`, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "9px",
                color: UITheme.colors.primaryCyanStr,
                fontStyle: "bold"
            }).setOrigin(0.5);
            card.add(tag);

            // 3: Name
            const shortName = suit.name
                .replace("ASTRONAUT ", "")
                .replace(" EVA", "")
                .replace(" SUIT", "")
                .replace(" RIG", "");

            const name = this.scene.add.text(cardW / 2, 98, shortName, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "9px",
                color: "#FFFFFF",
                fontStyle: "bold",
                align: "center"
            }).setOrigin(0.5);
            card.add(name);

            // 4: Interactive hit shield covering 100% of card
            const hit = this.scene.add.rectangle(cardW / 2, cardH / 2, cardW, cardH, 0x000000, 0.001);
            hit.setInteractive({ useHandCursor: true });
            card.add(hit);

            hit.on("pointerover", () => {
                card.setScale(1.05);
            });
            hit.on("pointerout", () => {
                card.setScale(1.0);
            });
            hit.on("pointerdown", () => {
                this.onSuitSelected(suit.frame);
            });

            this.suitCards.push(card);
            panel.add(card);
        });

        this.updateSuitCards();
    }

    private onSuitSelected(frame: number) {
        this.avatarFrame = frame;
        this.updateAvatarImage();
        this.updateSuitCards();
    }

    private updateSuitCards() {
        const cardH = 114;
        const suits = this.getSuitModels();

        this.suitCards.forEach((card, idx) => {
            const suitFrame = idx + 1;
            const suit = suits[idx];
            const isSelected = suitFrame === this.avatarFrame;
            const bg = card.list[0] as Phaser.GameObjects.Graphics;
            const cardW = 130;
            bg.clear();

            if (isSelected) {
                // Radiant glow and highlight backing
                bg.fillStyle(0x0C284D, 0.98);
                bg.fillRoundedRect(0, 0, cardW, cardH, 10);
                bg.lineStyle(2.5, UITheme.colors.solarGold, 1);
                bg.strokeRoundedRect(0, 0, cardW, cardH, 10);

                // Top highlight line
                bg.lineStyle(2, UITheme.colors.primaryCyan, 0.8);
                bg.lineBetween(10, 2, cardW - 10, 2);
            } else {
                bg.fillStyle(UITheme.colors.cardBg, 0.80);
                bg.fillRoundedRect(0, 0, cardW, cardH, 10);
                bg.lineStyle(1.5, UITheme.colors.panelBorder, 0.7);
                bg.strokeRoundedRect(0, 0, cardW, cardH, 10);
            }

            // Update thumb texture if gender changed
            const frameKey = `${this.gender}_avatar_${suitFrame}`;
            const thumb = card.list[1] as Phaser.GameObjects.Image;
            if (thumb && this.scene.textures.exists(frameKey)) {
                thumb.setTexture(frameKey);
            }

            // Update tag style
            const tag = card.list[2] as Phaser.GameObjects.Text;
            if (tag) {
                tag.setColor(isSelected ? UITheme.colors.solarGoldStr : UITheme.colors.primaryCyanStr);
                tag.setText(isSelected ? `★ SUIT 0${suitFrame}` : `SUIT 0${suitFrame}`);
            }

            // Update name label
            const name = card.list[3] as Phaser.GameObjects.Text;
            if (name && suit) {
                const shortName = suit.name
                    .replace("ASTRONAUT ", "")
                    .replace(" EVA", "")
                    .replace(" SUIT", "")
                    .replace(" RIG", "");
                name.setText(shortName);
            }
        });
    }

    private updateColorSwatches() {
        this.colorButtons.forEach((swatch, idx) => {
            const circle = swatch.list[0] as Phaser.GameObjects.Arc;
            circle.setStrokeStyle(3, idx === this.selectedColorIndex ? 0xFFFFFF : 0x1A3050, 1);
        });
    }

    private updateToolCardVisuals() {
        this.tools.forEach(tool => {
            const card = this.toolCards.get(tool.id);
            if (!card) return;

            const bg = card.list[0] as Phaser.GameObjects.Graphics;
            bg.clear();

            const isSelected = this.selectedToolId === tool.id;
            if (isSelected) {
                bg.fillStyle(UITheme.colors.cardSelected, 0.98);
                bg.fillRoundedRect(0, 0, 296, 72, 8);
                bg.lineStyle(2.5, UITheme.colors.primaryCyan, 1);
                bg.strokeRoundedRect(0, 0, 296, 72, 8);
            } else {
                bg.fillStyle(UITheme.colors.cardBg, 0.75);
                bg.fillRoundedRect(0, 0, 296, 72, 8);
                bg.lineStyle(1.5, UITheme.colors.panelBorder, 0.8);
                bg.strokeRoundedRect(0, 0, 296, 72, 8);
            }
        });
    }

    public destroy() {
        this.container.destroy();
    }
}

export default AstronautCustomizer;
