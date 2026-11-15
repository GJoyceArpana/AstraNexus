import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "./ButtonFactory.ts";

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

interface SuitCardEntry {
    container: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Graphics;
    thumb: Phaser.GameObjects.Image;
    label: Phaser.GameObjects.Text;
    width: number;
    height: number;
    thumbMaxW: number;
    thumbMaxH: number;
}

// Unified 16:9 design coordinate space scaled proportionally to any viewport
const DESIGN = {
    WIDTH: 1920,
    HEIGHT: 1080,
    MARGIN_X: 56,
    HEADER_Y: 36,
    SUBTITLE_Y: 78,
    CONTENT_TOP: 120,
    NAV_HEIGHT: 84,
    NAV_BOTTOM_MARGIN: 24,
    COLUMN_GAP: 40,
    LEFT_COL_RATIO: 0.40
} as const;

export class AstronautCustomizer {
    private scene: Phaser.Scene;
    private rootContainer: Phaser.GameObjects.Container;
    private layoutContainer: Phaser.GameObjects.Container;
    private callbacks: AstronautCustomizerCallbacks;

    private gender: GenderType = "boy";
    private avatarFrame = 1;
    private callsign = "Cadet Orion";

    private avatarImage?: Phaser.GameObjects.Image;
    private avatarFloatContainer!: Phaser.GameObjects.Container;
    private previewBounds = { width: 340, height: 360 };

    private suitCards: SuitCardEntry[] = [];
    private callsignText!: Phaser.GameObjects.Text;
    private suitModelTitleText!: Phaser.GameObjects.Text;
    private suitRoleTagText!: Phaser.GameObjects.Text;
    private launchButton?: Phaser.GameObjects.Container;

    private boyBtn!: Phaser.GameObjects.Container;
    private girlBtn!: Phaser.GameObjects.Container;
    private genderBtnSize = { width: 460, height: 68 };

    private activeTweens: Phaser.Tweens.Tween[] = [];

    // Preserved defaults for backward compatibility
    private readonly defaultColor = { name: "ARES CYAN", hex: 0x00E5FF };
    private readonly defaultToolId = "drill";
    private readonly callsignPresets = [
        "Cadet Orion",
        "Commander Nova",
        "Ares One",
        "Sol Walker",
        "Astra Scout"
    ];

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

    public getSuitShortName(fullName: string): string {
        return fullName
            .replace("ASTRONAUT ", "")
            .replace(" EVA", "")
            .replace(" SUIT", "")
            .replace(" RIG", "")
            .replace(" COMMAND", "")
            .trim();
    }

    public getSuitModels(): SuitModel[] {
        return this.gender === "boy" ? AstronautCustomizer.boySuitModels : AstronautCustomizer.girlSuitModels;
    }

    constructor(scene: Phaser.Scene, callbacks: AstronautCustomizerCallbacks) {
        this.scene = scene;
        this.callbacks = callbacks;
        this.rootContainer = this.scene.add.container(0, 0);
        this.layoutContainer = this.scene.add.container(0, 0);
        this.rootContainer.add(this.layoutContainer);

        // Load existing saved state if available
        const saved = this.scene.registry.get("astronautCustomization") as CustomizationData | undefined;
        if (saved) {
            this.gender = saved.gender;
            this.avatarFrame = saved.avatarFrame || 1;
            this.callsign = saved.callsign || "Cadet Orion";
        }

        this.init();
        this.updateResponsiveLayout();
        this.scene.scale.on("resize", this.updateResponsiveLayout, this);
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.rootContainer;
    }

    private init() {
        const W = DESIGN.WIDTH;
        const H = DESIGN.HEIGHT;

        // 1. Deep Space Background (fills full virtual stage)
        const bg = this.scene.add.rectangle(0, 0, W, H, 0x040B18).setOrigin(0);
        this.layoutContainer.add(bg);

        // Glowing Nebulae
        this.layoutContainer.add(this.scene.add.ellipse(W * 0.2, H * 0.5, 780, 960, 0x0A2A5E, 0.4));
        this.layoutContainer.add(this.scene.add.ellipse(W * 0.8, H * 0.4, 920, 780, 0x1A1A4A, 0.3));

        // Distant Planet (Mars)
        this.layoutContainer.add(this.scene.add.circle(W * 0.11, H * 0.82, 220, 0x6B2E1D, 0.55));
        this.layoutContainer.add(this.scene.add.circle(W * 0.11, H * 0.82, 206, 0x8B3A22, 0.75));

        // Deterministic Starfield
        for (let i = 0; i < 90; i++) {
            const sx = ((i * 239) % W);
            const sy = ((i * 157) % H);
            const sr = 1.0 + (i % 3) * 0.6;
            const sa = 0.2 + (i % 5) * 0.12;
            this.layoutContainer.add(this.scene.add.circle(sx, sy, sr, 0xFFFFFF, sa));
        }

        // 2. Header
        const title = this.scene.add.text(W / 2, DESIGN.HEADER_Y, "ASTRONAUT SUIT CUSTOMIZATION", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "36px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 3
        }).setOrigin(0.5).setShadow(0, 0, "#00E5FF", 15, true, true);
        this.layoutContainer.add(title);

        const sub = this.scene.add.text(W / 2, DESIGN.SUBTITLE_Y, "Choose your cadet, explore your Mars EVA suits, and prepare for your next mission!", {
            fontFamily: UITheme.fonts.body,
            fontSize: "19px",
            color: "#A0B4D0"
        }).setOrigin(0.5);
        this.layoutContainer.add(sub);

        // Compute clean two-column geometry (40% Left / 60% Right) above dedicated bottom navigation
        const usableWidth = W - DESIGN.MARGIN_X * 2 - DESIGN.COLUMN_GAP;
        const leftColX = DESIGN.MARGIN_X;
        const leftColW = Math.floor(usableWidth * DESIGN.LEFT_COL_RATIO);
        const rightColX = leftColX + leftColW + DESIGN.COLUMN_GAP;
        const rightColW = usableWidth - leftColW;

        const navTopY = H - DESIGN.NAV_BOTTOM_MARGIN - DESIGN.NAV_HEIGHT;
        const contentBottomY = navTopY - 24;
        const contentHeight = contentBottomY - DESIGN.CONTENT_TOP;

        // 3. Left Column: Astronaut Preview (40%)
        this.createLeftPreviewColumn(leftColX, DESIGN.CONTENT_TOP, leftColW, contentHeight);

        // 4. Right Column: Customization Panel (60%)
        this.createControlsPanel(rightColX, DESIGN.CONTENT_TOP, rightColW, contentHeight);

        // 5. Dedicated Bottom Navigation (outside both columns)
        const navCenterY = navTopY + DESIGN.NAV_HEIGHT / 2;

        const backBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: DESIGN.MARGIN_X + 120,
            y: navCenterY,
            width: 240,
            height: 60,
            fontSize: "19px",
            text: "← BACK",
            primaryColor: 0x102849,
            secondaryColor: 0x2A5A8A,
            textColor: "#FFFFFF",
            onClick: () => this.callbacks.onBack()
        });
        this.layoutContainer.add(backBtn);

        const launchBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: W - DESIGN.MARGIN_X - 210,
            y: navCenterY,
            width: 420,
            height: 64,
            fontSize: "21px",
            text: "CONFIRM LOADOUT ➔",
            primaryColor: 0xFFD600,
            secondaryColor: 0xFF7043,
            textColor: "#0A1A32",
            icon: "🚀",
            onClick: () => {
                const suits = this.getSuitModels();
                const currentSuit = suits[this.avatarFrame - 1] || suits[0];

                const data: CustomizationData = {
                    gender: this.gender,
                    avatarFrame: this.avatarFrame,
                    suitName: currentSuit.name,
                    suitColor: this.defaultColor.hex,
                    suitColorName: this.defaultColor.name,
                    toolId: this.defaultToolId,
                    callsign: this.callsign
                };

                this.scene.registry.set("astronautCustomization", data);
                if (typeof window !== "undefined" && window.localStorage) {
                    try {
                        localStorage.setItem("astra_astronaut_suit", JSON.stringify(data));
                    } catch {
                        // Ignore storage quota / privacy restrictions
                    }
                }
                this.callbacks.onComplete(data);
            }
        });
        this.launchButton = launchBtn;
        this.layoutContainer.add(launchBtn);
    }

    private createLeftPreviewColumn(x: number, y: number, w: number, h: number) {
        const panel = this.scene.add.container(x, y);

        // Subtle Left Column Container Frame
        const panelBg = this.scene.add.graphics();
        panelBg.fillStyle(0x061426, 0.65);
        panelBg.fillRoundedRect(0, 0, w, h, 24);
        panelBg.lineStyle(2, 0x00E5FF, 0.35);
        panelBg.strokeRoundedRect(0, 0, w, h, 24);
        panel.add(panelBg);

        const pad = 28;
        const cardW = w - pad * 2;
        const cardH = 156;
        const cardX = pad;
        const cardY = h - pad - cardH;

        // Holographic Stage Region (strictly above description card)
        const stageTop = pad;
        const stageBottom = cardY - 22;
        const stageCenterX = w / 2;
        const platformY = stageBottom - 44;

        // Circular Holographic Platform beneath the character
        const platformGlow = this.scene.add.ellipse(stageCenterX, platformY, 390, 92, 0x00E5FF, 0.18);
        panel.add(platformGlow);

        const platformRing = this.scene.add.ellipse(stageCenterX, platformY, 350, 76, 0x061122, 0.92);
        platformRing.setStrokeStyle(4, 0x00E5FF, 1);
        panel.add(platformRing);

        const innerRing = this.scene.add.ellipse(stageCenterX, platformY, 240, 48, 0x00E5FF, 0.12);
        innerRing.setStrokeStyle(2, 0xFFD600, 0.7);
        panel.add(innerRing);

        // Holographic Projection Beam
        const beam = this.scene.add.graphics();
        beam.fillStyle(0x00E5FF, 0.08);
        beam.fillTriangle(stageCenterX - 170, platformY, stageCenterX + 170, platformY, stageCenterX, stageTop + 20);
        beam.fillStyle(0x00E5FF, 0.14);
        beam.fillTriangle(stageCenterX - 95, platformY, stageCenterX + 95, platformY, stageCenterX, stageTop + 70);
        panel.add(beam);

        // Dedicated floating container for astronaut sprite
        const spriteCenterY = stageTop + (platformY - stageTop) * 0.50;
        this.previewBounds = {
            width: w - 120,
            height: platformY - stageTop - 36
        };

        this.avatarFloatContainer = this.scene.add.container(stageCenterX, spriteCenterY);
        panel.add(this.avatarFloatContainer);

        this.updateAvatarImage();

        const floatTween = this.scene.tweens.add({
            targets: this.avatarFloatContainer,
            y: spriteCenterY - 10,
            duration: 2800,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
        this.activeTweens.push(floatTween);

        // Separate Character Name & Suit Description Card below platform (completely clear of BACK)
        const infoCard = this.scene.add.graphics();
        infoCard.fillStyle(0x0A1A32, 0.95);
        infoCard.fillRoundedRect(cardX, cardY, cardW, cardH, 16);
        infoCard.lineStyle(2, 0x00E5FF, 0.85);
        infoCard.strokeRoundedRect(cardX, cardY, cardW, cardH, 16);
        panel.add(infoCard);

        const currentSuit = this.getSuitModels()[this.avatarFrame - 1] || this.getSuitModels()[0];

        this.suitModelTitleText = this.scene.add.text(stageCenterX, cardY + 34, currentSuit.name, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "24px",
            color: "#FFFFFF",
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: cardW - 40 }
        }).setOrigin(0.5);

        this.suitRoleTagText = this.scene.add.text(
            stageCenterX,
            cardY + 98,
            `★ ${currentSuit.roleTag}\n${currentSuit.perk}`,
            {
                fontFamily: UITheme.fonts.body,
                fontSize: "17px",
                color: "#FFD600",
                align: "center",
                lineSpacing: 6,
                wordWrap: { width: cardW - 40 }
            }
        ).setOrigin(0.5);

        panel.add([this.suitModelTitleText, this.suitRoleTagText]);
        this.layoutContainer.add(panel);
    }

    private updateAvatarImage() {
        if (this.avatarImage) {
            this.avatarImage.destroy();
            this.avatarImage = undefined;
        }

        const frameKey = this.gender === "boy" ? `boy_avatar_${this.avatarFrame}` : `girl_avatar_${this.avatarFrame}`;
        const fallbackKey = this.gender === "boy" ? "boy-astronaut" : "girl-astronaut";
        const textureToUse = this.scene.textures.exists(frameKey) ? frameKey : fallbackKey;

        if (this.scene.textures.exists(textureToUse) && this.avatarFloatContainer) {
            this.avatarImage = this.scene.add.image(0, 0, textureToUse).setOrigin(0.5);
            this.fitImageInsideBox(this.avatarImage, this.previewBounds.width, this.previewBounds.height);
            this.avatarFloatContainer.add(this.avatarImage);
        }

        const suits = this.getSuitModels();
        const currentSuit = suits[this.avatarFrame - 1] || suits[0];
        if (this.suitModelTitleText) {
            this.suitModelTitleText.setText(currentSuit.name);
        }
        if (this.suitRoleTagText) {
            this.suitRoleTagText.setText(`★ ${currentSuit.roleTag}\n${currentSuit.perk}`);
        }
    }

    private createControlsPanel(x: number, y: number, w: number, h: number) {
        const panel = this.scene.add.container(x, y);

        // Glass Panel Background
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x061426, 0.88);
        bg.fillRoundedRect(0, 0, w, h, 24);
        bg.lineStyle(2, 0x00E5FF, 0.55);
        bg.strokeRoundedRect(0, 0, w, h, 24);
        panel.add(bg);

        const padX = 36;
        const padY = 28;
        const innerW = w - padX * 2;
        const sectionGap = 32;
        const headerOffset = 34;

        let cursorY = padY;

        // =====================================================================
        // SECTION 1: CADET SELECTION (Two equally sized buttons in one row)
        // =====================================================================
        panel.add(
            this.scene.add.text(padX, cursorY, "1. CADET SELECTION", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "19px",
                color: "#00E5FF",
                fontStyle: "bold",
                letterSpacing: 1.5
            })
        );
        cursorY += headerOffset;

        const genderGap = 24;
        const genderBtnW = Math.floor((innerW - genderGap) / 2);
        const genderBtnH = 68;
        this.genderBtnSize = { width: genderBtnW, height: genderBtnH };

        this.boyBtn = this.createGenderCard(panel, padX, cursorY, genderBtnW, genderBtnH, "boy", "BOY CADET", "👨‍🚀");
        this.girlBtn = this.createGenderCard(
            panel,
            padX + genderBtnW + genderGap,
            cursorY,
            genderBtnW,
            genderBtnH,
            "girl",
            "GIRL CADET",
            "👩‍🚀"
        );
        this.updateGenderButtons();

        cursorY += genderBtnH + sectionGap;

        // =====================================================================
        // SECTION 3 BOUNDS (Calculated bottom-up so Section 2 fills remaining space)
        // =====================================================================
        const callsignBoxH = 72;
        const callsignHeaderY = h - padY - callsignBoxH - headerOffset;
        const callsignBoxY = h - padY - callsignBoxH;

        // =====================================================================
        // SECTION 2: SUIT SELECTION (Clean 3 + 2 Grid)
        // =====================================================================
        panel.add(
            this.scene.add.text(padX, cursorY, "2. SELECT MARS SUIT MODEL", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "19px",
                color: "#FFD600",
                fontStyle: "bold",
                letterSpacing: 1.5
            })
        );
        cursorY += headerOffset;

        const gridBottomY = callsignHeaderY - sectionGap;
        const gridAvailableH = gridBottomY - cursorY;

        this.createSuitCards(panel, padX, cursorY, innerW, gridAvailableH);

        // =====================================================================
        // SECTION 3: ACTIVE CADET CALLSIGN (Display + Cycle button in one row)
        // =====================================================================
        panel.add(
            this.scene.add.text(padX, callsignHeaderY, "3. ACTIVE CADET CALLSIGN", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "19px",
                color: "#00E5FF",
                fontStyle: "bold",
                letterSpacing: 1.5
            })
        );

        const badgeBg = this.scene.add.graphics();
        badgeBg.fillStyle(0x071B33, 0.96);
        badgeBg.fillRoundedRect(padX, callsignBoxY, innerW, callsignBoxH, 12);
        badgeBg.lineStyle(2, 0x00E5FF, 0.85);
        badgeBg.strokeRoundedRect(padX, callsignBoxY, innerW, callsignBoxH, 12);
        panel.add(badgeBg);

        const cycleBtnW = 176;
        const cycleBtnH = 48;
        const cycleBtnX = padX + innerW - cycleBtnW / 2 - 14;
        const rowCenterY = callsignBoxY + callsignBoxH / 2;

        const textZoneLeft = padX + 24;
        const textZoneRight = cycleBtnX - cycleBtnW / 2 - 16;
        const textCenterX = (textZoneLeft + textZoneRight) / 2;

        this.callsignText = this.scene.add.text(textCenterX, rowCenterY, this.callsign.toUpperCase(), {
            fontFamily: UITheme.fonts.heading,
            fontSize: "24px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setOrigin(0.5);
        panel.add(this.callsignText);

        const cycleBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: cycleBtnX,
            y: rowCenterY,
            width: cycleBtnW,
            height: cycleBtnH,
            fontSize: "16px",
            text: "CYCLE ↻",
            primaryColor: 0xFF7043,
            onClick: () => {
                SoundFX.playSelect();
                const currentIdx = this.callsignPresets.indexOf(this.callsign);
                this.callsign = this.callsignPresets[(currentIdx + 1) % this.callsignPresets.length];
                this.callsignText.setText(this.callsign.toUpperCase());
            }
        });
        panel.add(cycleBtn);

        this.layoutContainer.add(panel);
    }

    private createGenderCard(
        panel: Phaser.GameObjects.Container,
        x: number,
        y: number,
        w: number,
        h: number,
        gender: GenderType,
        label: string,
        icon: string
    ): Phaser.GameObjects.Container {
        const btn = this.scene.add.container(x + w / 2, y + h / 2);
        btn.setSize(w, h);

        const bg = this.scene.add.graphics();
        btn.add(bg);

        const iconText = this.scene.add.text(-86, 0, icon, {
            fontSize: "28px"
        }).setOrigin(0.5);

        const labelText = this.scene.add.text(22, 0, label, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "19px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);

        btn.add([iconText, labelText]);

        const hit = this.scene.add.rectangle(0, 0, w, h, 0x000000, 0.001).setInteractive({ useHandCursor: true });
        btn.add(hit);

        hit.on("pointerdown", () => {
            if (this.gender === gender) return;
            SoundFX.playToggle(gender === "boy");
            this.gender = gender;
            this.updateAvatarImage();
            this.updateSuitCards();
            this.updateGenderButtons();
        });

        panel.add(btn);
        return btn;
    }

    private updateGenderButtons() {
        const { width: w, height: h } = this.genderBtnSize;

        if (this.boyBtn) {
            const isBoy = this.gender === "boy";
            const bg = this.boyBtn.list[0] as Phaser.GameObjects.Graphics;
            const label = this.boyBtn.list[2] as Phaser.GameObjects.Text;
            bg.clear();
            bg.fillStyle(isBoy ? 0xFFD600 : 0x0A1A32, 0.96);
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
            bg.lineStyle(isBoy ? 3 : 1.5, isBoy ? 0xFFFFFF : 0x1A3A63, 1);
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
            if (label) label.setColor(isBoy ? "#0A1A32" : "#FFFFFF");
        }

        if (this.girlBtn) {
            const isGirl = this.gender === "girl";
            const bg = this.girlBtn.list[0] as Phaser.GameObjects.Graphics;
            const label = this.girlBtn.list[2] as Phaser.GameObjects.Text;
            bg.clear();
            bg.fillStyle(isGirl ? 0xFFD600 : 0x0A1A32, 0.96);
            bg.fillRoundedRect(-w / 2, -h / 2, w, h, 14);
            bg.lineStyle(isGirl ? 3 : 1.5, isGirl ? 0xFFFFFF : 0x1A3A63, 1);
            bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 14);
            if (label) label.setColor(isGirl ? "#0A1A32" : "#FFFFFF");
        }
    }

    private createSuitCards(
        panel: Phaser.GameObjects.Container,
        startX: number,
        startY: number,
        totalW: number,
        totalH: number
    ) {
        this.suitCards = [];

        const cols = 3;
        const rows = 2;
        const gapX = 22;
        const gapY = 22;

        // Identical explicit dimensions for all 5 suit cards
        const cardW = Math.floor((totalW - gapX * (cols - 1)) / cols);
        const cardH = Math.floor((totalH - gapY * (rows - 1)) / rows);

        // Internal zones inside each card so thumbnail and suit name never collide
        const labelZoneH = 54;
        const thumbTopPad = 14;
        const thumbBottomPad = 10;
        const thumbZoneH = cardH - labelZoneH - thumbTopPad - thumbBottomPad;
        const thumbMaxW = cardW - 36;
        const thumbMaxH = Math.max(48, thumbZoneH);
        const thumbCenterY = thumbTopPad + thumbZoneH / 2;
        const labelCenterY = cardH - labelZoneH / 2;

        const suits = this.getSuitModels();

        suits.forEach((suit, idx) => {
            const row = Math.floor(idx / cols);
            const col = idx % cols;

            // Row 0: 3 cards | Row 1: 2 cards centered cleanly
            const cardsInRow = row === 0 ? 3 : 2;
            const rowWidth = cardsInRow * cardW + (cardsInRow - 1) * gapX;
            const rowStartX = startX + Math.floor((totalW - rowWidth) / 2);

            const cardX = rowStartX + col * (cardW + gapX);
            const cardY = startY + row * (cardH + gapY);

            const card = this.scene.add.container(cardX, cardY);
            card.setSize(cardW, cardH);

            const bg = this.scene.add.graphics();
            card.add(bg);

            // Subtle divider separating thumbnail zone from suit name zone
            const divider = this.scene.add.graphics();
            divider.lineStyle(1, 0x1A3A63, 0.85);
            divider.lineBetween(16, cardH - labelZoneH, cardW - 16, cardH - labelZoneH);
            card.add(divider);

            const frameKey = `${this.gender}_avatar_${suit.frame}`;
            const fallbackKey = this.gender === "boy" ? "boy-astronaut" : "girl-astronaut";
            const texKey = this.scene.textures.exists(frameKey) ? frameKey : fallbackKey;

            const thumb = this.scene.add.image(cardW / 2, thumbCenterY, texKey).setOrigin(0.5);
            this.fitImageInsideBox(thumb, thumbMaxW, thumbMaxH);
            card.add(thumb);

            const label = this.scene.add.text(cardW / 2, labelCenterY, this.getSuitShortName(suit.name), {
                fontFamily: UITheme.fonts.heading,
                fontSize: "15px",
                color: "#FFFFFF",
                fontStyle: "bold",
                align: "center",
                wordWrap: { width: cardW - 20 }
            }).setOrigin(0.5);
            card.add(label);

            const hit = this.scene.add.rectangle(cardW / 2, cardH / 2, cardW, cardH, 0x000000, 0.001)
                .setInteractive({ useHandCursor: true });
            card.add(hit);

            hit.on("pointerdown", () => {
                SoundFX.playSelect();
                this.onSuitSelected(suit.frame);
            });

            this.suitCards.push({
                container: card,
                bg,
                thumb,
                label,
                width: cardW,
                height: cardH,
                thumbMaxW,
                thumbMaxH
            });

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
        const fallbackKey = this.gender === "boy" ? "boy-astronaut" : "girl-astronaut";

        this.suitCards.forEach((entry, idx) => {
            const frame = idx + 1;
            const isSelected = frame === this.avatarFrame;
            const { bg, thumb, label, width: w, height: h, thumbMaxW, thumbMaxH } = entry;

            bg.clear();
            bg.fillStyle(isSelected ? 0x162D52 : 0x0A1A32, 0.94);
            bg.fillRoundedRect(0, 0, w, h, 14);
            bg.lineStyle(isSelected ? 3.5 : 1.5, isSelected ? 0xFFD600 : 0x1A3A63, 1);
            bg.strokeRoundedRect(0, 0, w, h, 14);

            label.setColor(isSelected ? "#FFD600" : "#FFFFFF");

            const frameKey = `${this.gender}_avatar_${frame}`;
            const texKey = this.scene.textures.exists(frameKey) ? frameKey : fallbackKey;
            if (thumb && this.scene.textures.exists(texKey)) {
                thumb.setTexture(texKey);
                this.fitImageInsideBox(thumb, thumbMaxW, thumbMaxH);
            }
        });
    }

    private fitImageInsideBox(image: Phaser.GameObjects.Image, maxW: number, maxH: number) {
        if (!image || image.width <= 0 || image.height <= 0) return;
        const scale = Math.min(maxW / image.width, maxH / image.height);
        image.setScale(scale);
    }

    private updateResponsiveLayout() {
        if (!this.layoutContainer || !this.scene?.scale) return;

        const viewW = this.scene.scale.width;
        const viewH = this.scene.scale.height;

        const scaleX = viewW / DESIGN.WIDTH;
        const scaleY = viewH / DESIGN.HEIGHT;
        const uniformScale = Math.min(scaleX, scaleY);

        const offsetX = Math.floor((viewW - DESIGN.WIDTH * uniformScale) / 2);
        const offsetY = Math.floor((viewH - DESIGN.HEIGHT * uniformScale) / 2);

        this.layoutContainer.setScale(uniformScale);
        this.layoutContainer.setPosition(offsetX, offsetY);

        if (this.launchButton) {
            const isCompactViewport = viewW < 700 || viewH < 500;
            this.launchButton.setPosition(
                isCompactViewport ? DESIGN.WIDTH / 2 : DESIGN.WIDTH - DESIGN.MARGIN_X - 210,
                DESIGN.HEIGHT - DESIGN.NAV_BOTTOM_MARGIN - DESIGN.NAV_HEIGHT / 2
            );
            this.launchButton.setScale(isCompactViewport ? 2.2 : 1);
        }
    }

    public destroy() {
        this.scene.scale.off("resize", this.updateResponsiveLayout, this);
        this.activeTweens.forEach(tween => tween.remove());
        this.activeTweens = [];
        this.rootContainer.destroy();
    }
}

export default AstronautCustomizer;