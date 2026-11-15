import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "./ButtonFactory.ts";

export type LandingSiteId = "jezero" | "arcadia";

export interface LandingSiteInfo {
    id: LandingSiteId;
    name: string;
    coordinates: string;
    terrainType: string;
    targetFocus: string;
    elevation: string;
    iceDepth: string;
    solarPower: string;
    scienceScore: string;
    perk: string;
    hazard: string;
}

export interface LandingSiteSelectorCallbacks {
    onSiteSelected: (site: LandingSiteId) => void;
    onBack: () => void;
}

interface SiteCardVisualRefs {
    cardContainer: Phaser.GameObjects.Container;
    visuals: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Graphics;
    glow: Phaser.GameObjects.Graphics;
    checkCircle: Phaser.GameObjects.Graphics;
    checkText: Phaser.GameObjects.Text;
    titleText: Phaser.GameObjects.Text;
}

export class LandingSiteSelector {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private callbacks: LandingSiteSelectorCallbacks;
    private selectedSite: LandingSiteId = "jezero";

    private siteCards: Map<LandingSiteId, SiteCardVisualRefs> = new Map();
    private previewContainer!: Phaser.GameObjects.Container;
    private previewDynamicContainer!: Phaser.GameObjects.Container;
    private activeTweens: Phaser.Tweens.Tween[] = [];
    private fullscreenText?: Phaser.GameObjects.Text;

    private readonly siteData: Record<LandingSiteId, LandingSiteInfo> = {
        jezero: {
            id: "jezero",
            name: "JEZERO CRATER",
            coordinates: "18.38° N, 77.58° E",
            terrainType: "Ancient River Delta & Lakebed Sediments",
            targetFocus: "Astrobiology & Organic Biosignatures Search",
            elevation: "-2.5 km (Below Datum)",
            iceDepth: "Deep / Mineral Hydrates",
            solarPower: "590 W/m² (Optimal)",
            scienceScore: "98% (Perseverance Zone)",
            perk: "✦ +30% Science points & ancient sample collection bonus",
            hazard: "⚠ Rugged delta cliffs and sand ripples"
        },
        arcadia: {
            id: "arcadia",
            name: "ARCADIA PLANITIA",
            coordinates: "39.30° N, 188.0° E",
            
            targetFocus: "In-Situ Water Ice Extraction & Base Expansion",
            elevation: "-4.0 km (Atmospheric Shielding)",
            iceDepth: "1.0 - 2.5 meters (Shallow Sheet Ice)",
            solarPower: "470 W/m² (Moderate)",
            scienceScore: "85% (ISRU Hub)",
            perk: "✦ +40% Water extraction rate & life support stability",
            hazard: "⚠ Extreme sub-zero frost nights (-125°C)"
        }
    };

    private readonly cardSummaryData: Record<
        LandingSiteId,
        {
            subtitle: string;
            highlight: string;
            elevationShort: string;
            iceShort: string;
            solarShort: string;
            textureKey: string;
            accentColor: number;
            accentColorStr: string;
            fallbackBaseColor: number;
            fallbackAccentColor: number;
        }
    > = {
        jezero: {
            subtitle: "Ancient river delta",
            highlight: "High Science Value",
            elevationShort: "-2.5 km",
            iceShort: "Deep / Hydrates",
            solarShort: "590 W/m²",
            textureKey: "jezero-mosaic",
            accentColor: 0x00e5ff,
            accentColorStr: "#00E5FF",
            fallbackBaseColor: 0x9b4d34,
            fallbackAccentColor: 0xc96e4b
        },
        arcadia: {
            
            highlight: "High Water Potential",
            elevationShort: "-4.0 km",
            iceShort: "Shallow Sheet Ice",
            solarShort: "470 W/m²",
            textureKey: "arcadia-mosaic",
            accentColor: 0xff8c24,
            accentColorStr: "#FFB347",
            fallbackBaseColor: 0xb04829,
            fallbackAccentColor: 0xd96b38
        }
    };

    constructor(scene: Phaser.Scene, callbacks: LandingSiteSelectorCallbacks) {
        this.scene = scene;
        this.callbacks = callbacks;
        this.container = this.scene.add.container(0, 0);

        this.selectedSite = (this.scene.registry.get("landingSite") as LandingSiteId) || "jezero";
        this.init();
        this.scene.input.keyboard?.on("keydown", this.handleKeyboard, this);
        this.scene.scale.on("fullscreenchange", this.updateFullscreenLabel, this);
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private hasValidTexture(key: string): boolean {
        if (!this.scene.textures.exists(key)) return false;
        const tex = this.scene.textures.get(key);
        return tex.key !== "__MISSING" && tex.getSourceImage() !== null;
    }

    private init() {
        const { width, height } = this.scene.scale;

        // 1. Deep-Space Background, Twinkling Stars, Upper-Right Mars Planet & Martian Horizon
        this.createBackdrop(width, height);

        // 2. Top Header & Fullscreen [F] Button
        this.createHeader(width);

        // Responsive main workspace geometry
        const sideMargin = Math.max(44, Math.round(width * 0.055));
        const columnGap = Math.max(24, Math.round(width * 0.022));
        const contentTop = 126;
        const contentBottom = height - 114;
        const contentHeight = Math.max(360, contentBottom - contentTop);
        const totalContentWidth = width - sideMargin * 2;

        const leftWidth = Math.round(totalContentWidth * 0.37);
        const rightWidth = totalContentWidth - leftWidth - columnGap;
        const leftX = sideMargin;
        const rightX = leftX + leftWidth + columnGap;

        const cardGap = 20;
        const cardHeight = Math.floor((contentHeight - cardGap) / 2);

        // 3. Left Section: Two Clean Site Cards
        this.createSiteCard("jezero", leftX, contentTop, leftWidth, cardHeight);
        this.createSiteCard("arcadia", leftX, contentTop + cardHeight + cardGap, leftWidth, cardHeight);

        // 4. Right Section: Orbital Terrain Preview + 4 Essential Telemetry Rows
        this.createPreviewPanel(rightX, contentTop, rightWidth, contentHeight);

        this.updateSelectionVisuals();

        // 5. Bottom Navigation Buttons
        this.createBottomNavigation(width, height);
    }

    private createBackdrop(width: number, height: number) {
        // Deep-space base
        const spaceBg = this.scene.add.rectangle(0, 0, width, height, 0x050b1a, 1).setOrigin(0);
        this.container.add(spaceBg);

        // Subtle atmospheric nebula gradients
        const topGlow = this.scene.add.ellipse(width * 0.5, height * 0.14, width * 0.75, 220, 0x102854, 0.34);
        const rightMarsAura = this.scene.add.circle(width * 0.88, height * 0.24, Math.min(width, height) * 0.38, 0x8f3319, 0.16);
        this.container.add([topGlow, rightMarsAura]);

        // Twinkling starfield
        const starCount = 68;
        for (let i = 0; i < starCount; i++) {
            const sx = Phaser.Math.Between(16, Math.max(32, width - 16));
            const sy = Phaser.Math.Between(14, Math.max(40, Math.round(height * 0.72)));
            const radius = Phaser.Math.FloatBetween(0.7, 1.9);
            const starColor = i % 5 === 0 ? 0x9beeff : 0xfff8e7;
            const star = this.scene.add.circle(sx, sy, radius, starColor, Phaser.Math.FloatBetween(0.28, 0.85));
            this.container.add(star);

            const tween = this.scene.tweens.add({
                targets: star,
                alpha: Phaser.Math.FloatBetween(0.12, 0.45),
                duration: Phaser.Math.Between(1400, 3200),
                yoyo: true,
                repeat: -1,
                delay: Phaser.Math.Between(0, 1200)
            });
            this.activeTweens.push(tween);
        }

        // Mars Planet in the upper-right background
        const marsRadius = Math.round(Math.min(width, height) * 0.23);
        const marsX = width * 0.89;
        const marsY = height * 0.24;
        const marsGroup = this.scene.add.container(marsX, marsY);

        const outerAtmo = this.scene.add.circle(0, 0, marsRadius * 1.18, 0xe86431, 0.1);
        const innerAtmo = this.scene.add.circle(0, 0, marsRadius * 1.07, 0xff8a47, 0.16);

        const planet = this.scene.add.graphics();
        // Base Martian sphere
        planet.fillStyle(0xb84625, 0.92);
        planet.fillCircle(0, 0, marsRadius);
        // Sunlit upper-left crescent warmth
        planet.fillStyle(0xd96134, 0.72);
        planet.fillCircle(-marsRadius * 0.16, -marsRadius * 0.14, marsRadius * 0.84);
        // Albedo surface patches & craters
        planet.fillStyle(0x7c2917, 0.45);
        planet.fillEllipse(-marsRadius * 0.28, marsRadius * 0.18, marsRadius * 0.62, marsRadius * 0.34);
        planet.fillEllipse(marsRadius * 0.18, -marsRadius * 0.24, marsRadius * 0.48, marsRadius * 0.26);
        planet.fillCircle(-marsRadius * 0.1, -marsRadius * 0.36, marsRadius * 0.14);
        planet.fillCircle(marsRadius * 0.26, marsRadius * 0.22, marsRadius * 0.18);
        // Night-side limb shadow
        planet.fillStyle(0x280d14, 0.42);
        planet.fillCircle(marsRadius * 0.34, marsRadius * 0.28, marsRadius * 0.82);
        // Rim highlight
        planet.lineStyle(2, 0xff9f68, 0.35);
        planet.strokeCircle(0, 0, marsRadius);

        marsGroup.add([outerAtmo, innerAtmo, planet]);
        this.container.add(marsGroup);

        const marsFloatTween = this.scene.tweens.add({
            targets: marsGroup,
            y: marsY - 6,
            duration: 5200,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
        this.activeTweens.push(marsFloatTween);

        const atmoPulseTween = this.scene.tweens.add({
            targets: [outerAtmo, innerAtmo],
            alpha: 0.22,
            duration: 3400,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });
        this.activeTweens.push(atmoPulseTween);

        // Red-orange Martian landscape along the bottom
        const horizon = this.scene.add.graphics();
        // Distant ridge
        horizon.fillStyle(0x5c2326, 0.95);
        horizon.beginPath();
        horizon.moveTo(0, height);
        horizon.lineTo(0, height * 0.87);
        horizon.lineTo(width * 0.18, height * 0.82);
        horizon.lineTo(width * 0.38, height * 0.85);
        horizon.lineTo(width * 0.62, height * 0.81);
        horizon.lineTo(width * 0.84, height * 0.84);
        horizon.lineTo(width, height * 0.80);
        horizon.lineTo(width, height);
        horizon.closePath();
        horizon.fillPath();

        // Midground dunes
        horizon.fillStyle(0x8e3726, 0.98);
        horizon.beginPath();
        horizon.moveTo(0, height);
        horizon.lineTo(0, height * 0.90);
        horizon.lineTo(width * 0.24, height * 0.87);
        horizon.lineTo(width * 0.52, height * 0.91);
        horizon.lineTo(width * 0.78, height * 0.86);
        horizon.lineTo(width, height * 0.89);
        horizon.lineTo(width, height);
        horizon.closePath();
        horizon.fillPath();

        // Foreground warm rust terrain
        horizon.fillStyle(0xb64b2a, 1);
        horizon.beginPath();
        horizon.moveTo(0, height);
        horizon.lineTo(0, height * 0.93);
        horizon.lineTo(width * 0.32, height * 0.91);
        horizon.lineTo(width * 0.68, height * 0.94);
        horizon.lineTo(width, height * 0.91);
        horizon.lineTo(width, height);
        horizon.closePath();
        horizon.fillPath();

        // Subtle warm horizon rim line
        horizon.lineStyle(1.5, 0xe87241, 0.45);
        horizon.lineBetween(0, height * 0.93, width * 0.32, height * 0.91);
        horizon.lineBetween(width * 0.32, height * 0.91, width * 0.68, height * 0.94);
        horizon.lineBetween(width * 0.68, height * 0.94, width, height * 0.91);

        this.container.add(horizon);
    }

    private createHeader(width: number) {
        const centerX = width / 2;

        // Decorative cyan geometric accents framing the title
        const deco = this.scene.add.graphics();
        deco.lineStyle(2, 0x00e5ff, 0.75);
        // Left brackets & scanline
        deco.lineBetween(centerX - 360, 44, centerX - 275, 44);
        deco.lineBetween(centerX - 360, 44, centerX - 372, 56);
        deco.lineStyle(1.5, 0x00e5ff, 0.35);
        deco.lineBetween(centerX - 420, 52, centerX - 285, 52);
        // Right brackets & scanline
        deco.lineStyle(2, 0x00e5ff, 0.75);
        deco.lineBetween(centerX + 275, 44, centerX + 360, 44);
        deco.lineBetween(centerX + 360, 44, centerX + 372, 56);
        deco.lineStyle(1.5, 0x00e5ff, 0.35);
        deco.lineBetween(centerX + 285, 52, centerX + 420, 52);

        // Cyan corner nodes
        deco.fillStyle(0x00e5ff, 0.95);
        deco.fillCircle(centerX - 275, 44, 3);
        deco.fillCircle(centerX + 275, 44, 3);
        this.container.add(deco);

        const title = this.scene.add.text(centerX, 46, "MARS LANDING SITE SCANNER", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "30px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setOrigin(0.5);
        title.setShadow(0, 2, "#001933", 8);
        this.container.add(title);

        const subtitle = this.scene.add.text(centerX, 82, "Choose a landing site for your Mars mission", {
            fontFamily: UITheme.fonts.body,
            fontSize: "16px",
            color: "#B8D4F5"
        }).setOrigin(0.5);
        this.container.add(subtitle);

        // Top-right FULLSCREEN [F] pill button
        const fsW = 148;
        const fsH = 34;
        const fsX = width - fsW / 2 - 24;
        const fsY = 36;
        const fsBtn = this.scene.add.container(fsX, fsY);

        const fsBg = this.scene.add.graphics();
        fsBg.fillStyle(0x0a1933, 0.88);
        fsBg.fillRoundedRect(-fsW / 2, -fsH / 2, fsW, fsH, 10);
        fsBg.lineStyle(1.5, 0x00e5ff, 0.65);
        fsBg.strokeRoundedRect(-fsW / 2, -fsH / 2, fsW, fsH, 10);

        this.fullscreenText = this.scene.add.text(0, 0, "⛶ FULLSCREEN [F]", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#9CEEFF",
            fontStyle: "bold"
        }).setOrigin(0.5);
        this.updateFullscreenLabel();

        const fsHit = this.scene.add.rectangle(0, 0, fsW, fsH, 0x000000, 0.001).setInteractive({ useHandCursor: true });
        fsBtn.add([fsBg, this.fullscreenText, fsHit]);
        this.container.add(fsBtn);

        fsHit.on("pointerover", () => {
            SoundFX.playHover();
            this.scene.tweens.add({ targets: fsBtn, scale: 1.04, duration: 90, ease: "Quad.easeOut" });
        });
        fsHit.on("pointerout", () => {
            this.scene.tweens.add({ targets: fsBtn, scale: 1, duration: 90, ease: "Quad.easeOut" });
        });
        fsHit.on("pointerdown", () => {
            SoundFX.playClick();
            this.toggleFullscreen();
        });
    }

    private toggleFullscreen() {
        if (this.scene.scale.isFullscreen) {
            this.scene.scale.stopFullscreen();
        } else {
            this.scene.scale.startFullscreen();
        }
    }

    private updateFullscreenLabel() {
        if (!this.fullscreenText || !this.fullscreenText.active) return;
        this.fullscreenText.setText(this.scene.scale.isFullscreen ? "⛶ EXIT FULL [F]" : "⛶ FULLSCREEN [F]");
    }

    private createSiteCard(id: LandingSiteId, x: number, y: number, w: number, h: number) {
        const data = this.siteData[id];
        const summary = this.cardSummaryData[id];

        const cardContainer = this.scene.add.container(x + w / 2, y + h / 2);
        const visuals = this.scene.add.container(0, 0);
        cardContainer.add(visuals);

        // Card drop shadow
        const shadow = this.scene.add.graphics();
        shadow.fillStyle(0x020611, 0.65);
        shadow.fillRoundedRect(-w / 2 + 2, -h / 2 + 5, w, h, 18);
        visuals.add(shadow);

        // Dynamic selected/unselected background & border
        const bg = this.scene.add.graphics();
        visuals.add(bg);

        // Animated outer glow border for selected/hover state
        const glow = this.scene.add.graphics();
        glow.lineStyle(5, summary.accentColor, 0.35);
        glow.strokeRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, 20);
        glow.setAlpha(0);
        visuals.add(glow);

        // Small square terrain thumbnail on the left of the card
        const thumbSize = Math.min(118, Math.max(88, h - 42));
        const thumbX = -w / 2 + 20 + thumbSize / 2;
        const thumbY = 0;

        const thumbFrame = this.scene.add.graphics();
        thumbFrame.fillStyle(0x050d1c, 1);
        thumbFrame.fillRoundedRect(thumbX - thumbSize / 2 - 2, thumbY - thumbSize / 2 - 2, thumbSize + 4, thumbSize + 4, 12);
        thumbFrame.lineStyle(2, summary.accentColor, 0.75);
        thumbFrame.strokeRoundedRect(thumbX - thumbSize / 2 - 2, thumbY - thumbSize / 2 - 2, thumbSize + 4, thumbSize + 4, 12);
        visuals.add(thumbFrame);

        if (this.hasValidTexture(summary.textureKey)) {
            const thumbImg = this.createCoverTerrainImage(
                thumbX,
                thumbY,
                thumbSize - 2,
                thumbSize - 2,
                summary.textureKey
            );
            visuals.add(thumbImg);
        } else {
            // Clean procedural Martian terrain thumbnail fallback
            const fallback = this.scene.add.graphics();
            fallback.fillStyle(summary.fallbackBaseColor, 1);
            fallback.fillRoundedRect(thumbX - thumbSize / 2 + 1, thumbY - thumbSize / 2 + 1, thumbSize - 2, thumbSize - 2, 10);
            fallback.fillStyle(summary.fallbackAccentColor, 0.75);
            fallback.fillCircle(thumbX - 10, thumbY - 8, thumbSize * 0.24);
            fallback.fillCircle(thumbX + 16, thumbY + 14, thumbSize * 0.18);
            visuals.add(fallback);
        }

        // Text column to the right of the thumbnail
        const textLeft = -w / 2 + 20 + thumbSize + 18;
        const textWrapWidth = w / 2 - textLeft - 46;

        const titleText = this.scene.add.text(textLeft, -h / 2 + 28, data.name, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "21px",
            color: "#FFFFFF",
            fontStyle: "bold",
            wordWrap: { width: textWrapWidth }
        });
        visuals.add(titleText);

        const subtitleText = this.scene.add.text(textLeft, -h / 2 + 62, summary.subtitle, {
            fontFamily: UITheme.fonts.body,
            fontSize: "15px",
            color: "#C4D8F2",
            wordWrap: { width: textWrapWidth }
        });
        visuals.add(subtitleText);

        // Highlight pill badge (High Science Value / High Water Potential)
        const pillY = -h / 2 + 98;
        const badgePill = this.scene.add.graphics();
        badgePill.fillStyle(id === "jezero" ? 0x072b42 : 0x361e09, 0.9);
        badgePill.fillRoundedRect(textLeft, pillY, Math.min(textWrapWidth + 18, 210), 30, 15);
        badgePill.lineStyle(1.5, summary.accentColor, 0.75);
        badgePill.strokeRoundedRect(textLeft, pillY, Math.min(textWrapWidth + 18, 210), 30, 15);
        visuals.add(badgePill);

        const highlightText = this.scene.add.text(textLeft + 14, pillY + 15, `✦ ${summary.highlight}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: summary.accentColorStr,
            fontStyle: "bold"
        }).setOrigin(0, 0.5);
        visuals.add(highlightText);

        // Top-right circular selection indicator
        const checkX = w / 2 - 28;
        const checkY = -h / 2 + 28;
        const checkCircle = this.scene.add.graphics();
        visuals.add(checkCircle);

        const checkText = this.scene.add.text(checkX, checkY, "✓", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            color: "#041224",
            fontStyle: "bold"
        }).setOrigin(0.5);
        visuals.add(checkText);

        // Interactive hit area over entire card
        const hitShield = this.scene.add.rectangle(0, 0, w + 8, h + 8, 0x000000, 0.001);
        hitShield.setInteractive({ useHandCursor: true });
        cardContainer.add(hitShield);

        hitShield.on("pointerover", () => {
            SoundFX.playHover();
            this.scene.tweens.killTweensOf(visuals);
            this.scene.tweens.add({
                targets: visuals,
                scaleX: 1.025,
                scaleY: 1.025,
                duration: 110,
                ease: "Quad.easeOut"
            });
            if (this.selectedSite !== id) {
                glow.setAlpha(0.45);
            }
        });

        hitShield.on("pointerout", () => {
            this.scene.tweens.killTweensOf(visuals);
            this.scene.tweens.add({
                targets: visuals,
                scaleX: 1,
                scaleY: 1,
                duration: 110,
                ease: "Quad.easeOut"
            });
            if (this.selectedSite !== id) {
                glow.setAlpha(0);
            }
        });

        hitShield.on("pointerdown", () => {
            SoundFX.playSelect();
            this.scene.tweens.add({
                targets: visuals,
                scaleX: 0.985,
                scaleY: 0.985,
                duration: 60,
                yoyo: true,
                onComplete: () => {
                    visuals.setScale(1.025);
                }
            });

            if (this.selectedSite !== id) {
                this.selectedSite = id;
                this.updateSelectionVisuals();
                this.renderPreviewDetails();
            }
        });

        this.siteCards.set(id, {
            cardContainer,
            visuals,
            bg,
            glow,
            checkCircle,
            checkText,
            titleText
        });
        this.container.add(cardContainer);
    }

    private createPreviewPanel(x: number, y: number, w: number, h: number) {
        this.previewContainer = this.scene.add.container(x, y);

        // Outer glass-navy panel
        const panelBg = this.scene.add.graphics();
        panelBg.fillStyle(0x09162e, 0.92);
        panelBg.fillRoundedRect(0, 0, w, h, 20);
        panelBg.lineStyle(2, 0x1e5b94, 0.85);
        panelBg.strokeRoundedRect(0, 0, w, h, 20);

        // Subtle inner top highlight line
        panelBg.lineStyle(1.5, 0x00e5ff, 0.35);
        panelBg.lineBetween(24, 1, w - 24, 1);
        this.previewContainer.add(panelBg);

        this.previewDynamicContainer = this.scene.add.container(0, 0);
        this.previewContainer.add(this.previewDynamicContainer);

        this.container.add(this.previewContainer);
        this.renderPreviewDetails(w, h);
    }

    private renderPreviewDetails(panelW?: number, panelH?: number) {
        const w = panelW ?? 660;
        const h = panelH ?? 445;

        // Clean up previous dynamic children & tweens
        this.previewDynamicContainer.list.forEach(child => {
            this.scene.tweens.killTweensOf(child);
        });
        this.previewDynamicContainer.removeAll(true);

        const data = this.siteData[this.selectedSite];
        const summary = this.cardSummaryData[this.selectedSite];

        // Panel Header
        const headerText = this.scene.add.text(28, 22, `ORBITAL SCAN · ${data.name}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "19px",
            color: "#6BE8FF",
            fontStyle: "bold",
            letterSpacing: 1
        });
        this.previewDynamicContainer.add(headerText);

        // Large Square Orbital Terrain Image Frame on the Left of the Preview Panel
        const padding = 28;
        const headerOffset = 62;
        const availableH = h - headerOffset - padding;
        const maxSquareW = Math.floor(w * 0.47);
        const mapSize = Math.min(availableH, maxSquareW);
        const mapX = padding;
        const mapY = headerOffset + Math.floor((availableH - mapSize) / 2);
        const mapCenterX = mapX + mapSize / 2;
        const mapCenterY = mapY + mapSize / 2;

        // Subtle orange outer glow around orbital terrain frame
        const orangeGlow = this.scene.add.graphics();
        orangeGlow.fillStyle(0xff7a1a, 0.14);
        orangeGlow.fillRoundedRect(mapX - 6, mapY - 6, mapSize + 12, mapSize + 12, 16);
        this.previewDynamicContainer.add(orangeGlow);

        // Terrain frame background & orange glowing border
        const mapFrame = this.scene.add.graphics();
        mapFrame.fillStyle(0x050b18, 1);
        mapFrame.fillRoundedRect(mapX, mapY, mapSize, mapSize, 12);
        mapFrame.lineStyle(3, 0xff8c24, 0.95);
        mapFrame.strokeRoundedRect(mapX, mapY, mapSize, mapSize, 12);
        this.previewDynamicContainer.add(mapFrame);

        const innerSize = mapSize - 8;

        if (data.id === "jezero" && this.hasValidTexture("jezero-mosaic")) {
            const img = this.createCoverTerrainImage(mapCenterX, mapCenterY, innerSize, innerSize, "jezero-mosaic");
            img.setAlpha(0);
            this.previewDynamicContainer.add(img);
            this.scene.tweens.add({
                targets: img,
                alpha: 1,
                duration: 200,
                ease: "Quad.easeOut"
            });
        } else if (data.id === "arcadia" && this.hasValidTexture("arcadia-mosaic")) {
            const img = this.createCoverTerrainImage(mapCenterX, mapCenterY, innerSize, innerSize, "arcadia-mosaic");
            img.setAlpha(0);
            this.previewDynamicContainer.add(img);
            this.scene.tweens.add({
                targets: img,
                alpha: 1,
                duration: 200,
                ease: "Quad.easeOut"
            });
        } else {
            // Radar fallback when selected site's texture is unavailable
            const radar = this.scene.add.graphics();
            radar.lineStyle(1, 0x00e5ff, 0.18);
            for (let gx = mapX + 24; gx < mapX + mapSize; gx += 32) {
                radar.lineBetween(gx, mapY + 6, gx, mapY + mapSize - 6);
            }
            for (let gy = mapY + 24; gy < mapY + mapSize; gy += 32) {
                radar.lineBetween(mapX + 6, gy, mapX + mapSize - 6, gy);
            }
            radar.lineStyle(1.5, 0x00e5ff, 0.32);
            radar.strokeCircle(mapCenterX, mapCenterY, mapSize * 0.16);
            radar.strokeCircle(mapCenterX, mapCenterY, mapSize * 0.30);
            radar.strokeCircle(mapCenterX, mapCenterY, mapSize * 0.43);
            radar.fillStyle(0x00e5ff, 0.85);
            radar.fillCircle(mapCenterX, mapCenterY, 3.5);
            this.previewDynamicContainer.add(radar);

            const radarLabel = this.scene.add.text(mapCenterX, mapY + 20, "ORBITAL TELEMETRY · NO SURFACE IMAGE", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "9px",
                color: "#6BE8FF",
                backgroundColor: "#050B18"
            }).setOrigin(0.5);
            this.previewDynamicContainer.add(radarLabel);
        }

        // Pulsating Cyan Targeting Crosshair over the centre
        const crosshair = this.scene.add.container(mapCenterX, mapCenterY);
        const crossGfx = this.scene.add.graphics();
        const ringRadius = Math.round(mapSize * 0.16);
        const armLen = Math.round(mapSize * 0.23);

        crossGfx.lineStyle(2, 0x00e5ff, 0.92);
        crossGfx.strokeCircle(0, 0, ringRadius);
        crossGfx.lineBetween(-armLen, 0, -ringRadius + 6, 0);
        crossGfx.lineBetween(ringRadius - 6, 0, armLen, 0);
        crossGfx.lineBetween(0, -armLen, 0, -ringRadius + 6);
        crossGfx.lineBetween(0, ringRadius - 6, 0, armLen);
        crossGfx.fillStyle(0x00e5ff, 0.95);
        crossGfx.fillCircle(0, 0, 3);
        crosshair.add(crossGfx);
        this.previewDynamicContainer.add(crosshair);

        this.scene.tweens.add({
            targets: crosshair,
            scaleX: 1.07,
            scaleY: 1.07,
            alpha: 0.72,
            duration: 1200,
            yoyo: true,
            repeat: -1,
            ease: "Sine.easeInOut"
        });

        // Right Side: Four Essential Telemetry Rows Only
        const statsX = mapX + mapSize + 28;
        const statsW = w - statsX - padding;
        const rows = [
            { icon: "🌐", label: "COORDINATES", value: data.coordinates },
            { icon: "⛰", label: "ELEVATION", value: summary.elevationShort },
            { icon: "🧊", label: "WATER ICE", value: summary.iceShort },
            { icon: "☀", label: "SOLAR POWER", value: summary.solarShort }
        ];

        const rowGap = 14;
        const rowH = Math.floor((mapSize - rowGap * (rows.length - 1)) / rows.length);

        rows.forEach((row, index) => {
            const rowY = mapY + index * (rowH + rowGap);

            const rowCard = this.scene.add.graphics();
            rowCard.fillStyle(0x0d2142, 0.86);
            rowCard.fillRoundedRect(statsX, rowY, statsW, rowH, 12);
            rowCard.lineStyle(1.5, 0x1d4d82, 0.8);
            rowCard.strokeRoundedRect(statsX, rowY, statsW, rowH, 12);
            this.previewDynamicContainer.add(rowCard);

            const iconBg = this.scene.add.circle(statsX + 28, rowY + rowH / 2, 18, 0x07142b, 1);
            iconBg.setStrokeStyle(1.5, 0x00e5ff, 0.45);
            const iconText = this.scene.add.text(statsX + 28, rowY + rowH / 2, row.icon, {
                fontSize: "17px"
            }).setOrigin(0.5);

            const labelText = this.scene.add.text(statsX + 56, rowY + rowH / 2 - 14, row.label, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: "#8AB4E8",
                fontStyle: "bold",
                letterSpacing: 0.8
            }).setOrigin(0, 0.5);

            const valueText = this.scene.add.text(statsX + 56, rowY + rowH / 2 + 10, row.value, {
                fontFamily: UITheme.fonts.body,
                fontSize: "17px",
                color: "#FFFFFF",
                fontStyle: "bold",
                wordWrap: { width: statsW - 68 }
            }).setOrigin(0, 0.5);

            this.previewDynamicContainer.add([iconBg, iconText, labelText, valueText]);
        });
    }

    private createCoverTerrainImage(
        centerX: number,
        centerY: number,
        targetW: number,
        targetH: number,
        textureKey: string
    ): Phaser.GameObjects.Image {
        const img = this.scene.add.image(centerX, centerY, textureKey);
        const srcW = img.width;
        const srcH = img.height;

        if (srcW > 0 && srcH > 0) {
            const targetAspect = targetW / targetH;
            const srcAspect = srcW / srcH;

            let cropW = srcW;
            let cropH = srcH;
            if (srcAspect > targetAspect) {
                cropW = Math.round(srcH * targetAspect);
            } else if (srcAspect < targetAspect) {
                cropH = Math.round(srcW / targetAspect);
            }

            const cropX = Math.floor((srcW - cropW) / 2);
            const cropY = Math.floor((srcH - cropH) / 2);
            img.setCrop(cropX, cropY, cropW, cropH);
        }

        img.setDisplaySize(targetW, targetH);
        return img;
    }

    private updateSelectionVisuals() {
        const { width, height } = this.scene.scale;
        const sideMargin = Math.max(44, Math.round(width * 0.055));
        const totalContentWidth = width - sideMargin * 2;
        const w = Math.round(totalContentWidth * 0.37);
        const contentTop = 126;
        const contentBottom = height - 114;
        const contentHeight = Math.max(360, contentBottom - contentTop);
        const h = Math.floor((contentHeight - 20) / 2);

        (["jezero", "arcadia"] as LandingSiteId[]).forEach(id => {
            const refs = this.siteCards.get(id);
            if (!refs) return;

            const isSelected = this.selectedSite === id;
            const summary = this.cardSummaryData[id];
            const borderColor = id === "jezero" ? 0x00e5ff : 0xff8c24;

            this.scene.tweens.killTweensOf(refs.glow);
            refs.bg.clear();
            refs.checkCircle.clear();

            const checkX = w / 2 - 28;
            const checkY = -h / 2 + 28;

            if (isSelected) {
                // Slightly brighter navy card background + bright glowing border
                refs.bg.fillStyle(0x11284f, 0.96);
                refs.bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
                refs.bg.lineStyle(3, borderColor, 1);
                refs.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);

                refs.glow.clear();
                refs.glow.lineStyle(6, borderColor, 0.42);
                refs.glow.strokeRoundedRect(-w / 2 - 3, -h / 2 - 3, w + 6, h + 6, 21);
                refs.glow.setAlpha(0.95);

                const pulseTween = this.scene.tweens.add({
                    targets: refs.glow,
                    alpha: 0.45,
                    duration: 1100,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut"
                });
                this.activeTweens.push(pulseTween);

                // Solid circular indicator with checkmark
                refs.checkCircle.fillStyle(borderColor, 1);
                refs.checkCircle.fillCircle(checkX, checkY, 14);
                refs.checkText.setVisible(true);
                refs.titleText.setColor(summary.accentColorStr);
            } else {
                // Dark navy background + subtle blue border
                refs.bg.fillStyle(0x081329, 0.88);
                refs.bg.fillRoundedRect(-w / 2, -h / 2, w, h, 18);
                refs.bg.lineStyle(1.5, 0x1e4373, 0.85);
                refs.bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 18);

                refs.glow.setAlpha(0);

                // Unselected hollow ring indicator
                refs.checkCircle.lineStyle(2, 0x2b558c, 0.85);
                refs.checkCircle.strokeCircle(checkX, checkY, 14);
                refs.checkText.setVisible(false);
                refs.titleText.setColor("#FFFFFF");
            }
        });
    }

    private createBottomNavigation(width: number, height: number) {
        const navY = height - 56;
        const backW = 210;
        const confirmW = 330;
        const gap = 28;
        const totalNavW = backW + gap + confirmW;
        const startX = (width - totalNavW) / 2;

        // BACK Button (Blue gradient-style appearance, left arrow, white text)
        const backBtn = this.createStyledActionButton({
            x: startX + backW / 2,
            y: navY,
            width: backW,
            height: 54,
            label: "← BACK",
            topColor: 0x255799,
            bottomColor: 0x133363,
            borderColor: 0x4da3ff,
            glowColor: 0x2b7de9,
            textColor: "#FFFFFF",
            onClick: () => this.callbacks.onBack()
        });
        this.container.add(backBtn);

        // CONFIRM LANDING SITE Button (Orange gradient-style appearance, rocket icon, yellow text, subtle glow)
        const confirmBtn = this.createStyledActionButton({
            x: startX + backW + gap + confirmW / 2,
            y: navY,
            width: confirmW,
            height: 54,
            label: "🚀 CONFIRM LANDING SITE",
            topColor: 0xff8b24,
            bottomColor: 0xd9530f,
            borderColor: 0xffd15c,
            glowColor: 0xff7a1a,
            textColor: "#FFF275",
            onClick: () => this.confirmSelection()
        });
        this.container.add(confirmBtn);
    }

    private createStyledActionButton(config: {
        x: number;
        y: number;
        width: number;
        height: number;
        label: string;
        topColor: number;
        bottomColor: number;
        borderColor: number;
        glowColor: number;
        textColor: string;
        onClick: () => void;
    }): Phaser.GameObjects.Container {
        const { x, y, width, height, label, topColor, bottomColor, borderColor, glowColor, textColor, onClick } = config;
        const btn = this.scene.add.container(x, y);
        const radius = 16;

        // Outer ambient glow
        const outerGlow = this.scene.add.graphics();
        outerGlow.fillStyle(glowColor, 0.24);
        outerGlow.fillRoundedRect(-width / 2 - 5, -height / 2 - 5, width + 10, height + 10, radius + 4);
        btn.add(outerGlow);

        // Gradient-style layered body
        const body = this.scene.add.graphics();
        body.fillStyle(bottomColor, 1);
        body.fillRoundedRect(-width / 2, -height / 2, width, height, radius);
        body.fillStyle(topColor, 0.92);
        body.fillRoundedRect(-width / 2, -height / 2, width, Math.round(height * 0.56), {
            tl: radius,
            tr: radius,
            bl: 4,
            br: 4
        });
        body.lineStyle(2.5, borderColor, 0.95);
        body.strokeRoundedRect(-width / 2, -height / 2, width, height, radius);
        btn.add(body);

        const text = this.scene.add.text(0, 0, label, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "17px",
            color: textColor,
            fontStyle: "bold",
            letterSpacing: 0.8
        }).setOrigin(0.5);
        text.setShadow(0, 2, "#1A0D05", 4);
        btn.add(text);

        const hit = this.scene.add.rectangle(0, 0, width, height, 0x000000, 0.001).setInteractive({ useHandCursor: true });
        btn.add(hit);

        hit.on("pointerover", () => {
            SoundFX.playHover();
            this.scene.tweens.add({
                targets: btn,
                scaleX: 1.035,
                scaleY: 1.035,
                duration: 110,
                ease: "Quad.easeOut"
            });
            outerGlow.setAlpha(1.4);
        });

        hit.on("pointerout", () => {
            this.scene.tweens.add({
                targets: btn,
                scaleX: 1,
                scaleY: 1,
                duration: 110,
                ease: "Quad.easeOut"
            });
            outerGlow.setAlpha(1);
        });

        hit.on("pointerdown", () => {
            SoundFX.playClick();
            this.scene.tweens.add({
                targets: btn,
                scaleX: 0.96,
                scaleY: 0.96,
                duration: 65,
                yoyo: true,
                onComplete: () => onClick()
            });
        });

        return btn;
    }

    private handleKeyboard(event: KeyboardEvent) {
        const key = event.key.toLowerCase();
        if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"].includes(key)) {
            event.preventDefault();
            const nextSite: LandingSiteId = this.selectedSite === "jezero" ? "arcadia" : "jezero";
            if (nextSite !== this.selectedSite) {
                this.selectedSite = nextSite;
                SoundFX.playSelect();
                this.updateSelectionVisuals();
                this.renderPreviewDetails();
            }
        } else if (key === "enter" || key === " ") {
            event.preventDefault();
            this.confirmSelection();
        } else if (key === "escape" || key === "backspace") {
            event.preventDefault();
            this.callbacks.onBack();
        } else if (key === "f") {
            event.preventDefault();
            this.toggleFullscreen();
        }
    }

    private confirmSelection() {
        this.scene.registry.set("landingSite", this.selectedSite);
        this.callbacks.onSiteSelected(this.selectedSite);
    }

    public destroy() {
        this.scene.input.keyboard?.off("keydown", this.handleKeyboard, this);
        this.scene.scale.off("fullscreenchange", this.updateFullscreenLabel, this);
        this.activeTweens.forEach(tween => tween.stop());
        this.activeTweens = [];
        this.scene.tweens.killTweensOf(this.container);
        this.container.destroy(true);
    }
}

export default LandingSiteSelector;