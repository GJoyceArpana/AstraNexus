import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import ButtonFactory from "./ButtonFactory.ts";

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

class SiteSoundFX {
    private static ctx: AudioContext | null = null;
    private static getContext(): AudioContext | null {
        if (!SiteSoundFX.ctx && typeof window !== "undefined") {
            const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
            if (AudioCtx) SiteSoundFX.ctx = new AudioCtx();
        }
        if (SiteSoundFX.ctx && SiteSoundFX.ctx.state === "suspended") {
            SiteSoundFX.ctx.resume();
        }
        return SiteSoundFX.ctx;
    }

    public static playHover() {
        try {
            const ctx = SiteSoundFX.getContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "sine";
            osc.frequency.setValueAtTime(560, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(860, ctx.currentTime + 0.04);
            gain.gain.setValueAtTime(0.04, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.04);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.04);
        } catch {
            // Audio policy fallback
        }
    }

    public static playSelect() {
        try {
            const ctx = SiteSoundFX.getContext();
            if (!ctx) return;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.type = "triangle";
            osc.frequency.setValueAtTime(440, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.08);
            gain.gain.setValueAtTime(0.08, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);
            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } catch {
            // Audio policy fallback
        }
    }
}

export class LandingSiteSelector {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private callbacks: LandingSiteSelectorCallbacks;
    private selectedSite: LandingSiteId = "jezero";

    private siteCards: Map<LandingSiteId, Phaser.GameObjects.Container> = new Map();
    private siteBgs: Map<LandingSiteId, Phaser.GameObjects.Graphics> = new Map();
    private siteGlows: Map<LandingSiteId, Phaser.GameObjects.Graphics> = new Map();
    private siteVisuals: Map<LandingSiteId, Phaser.GameObjects.Container> = new Map();
    private siteActionButtons: Map<LandingSiteId, Phaser.GameObjects.Text> = new Map();
    private previewContainer!: Phaser.GameObjects.Container;

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
            terrainType: "Smooth Volcanic Lowland Plains",
            targetFocus: "In-Situ Water Ice Extraction & Base Expansion",
            elevation: "-4.0 km (Atmospheric Shielding)",
            iceDepth: "1.0 - 2.5 meters (Shallow Sheet Ice)",
            solarPower: "470 W/m² (Moderate)",
            scienceScore: "85% (ISRU Hub)",
            perk: "✦ +40% Water extraction rate & life support stability",
            hazard: "⚠ Extreme sub-zero frost nights (-125°C)"
        }
    };

    constructor(scene: Phaser.Scene, callbacks: LandingSiteSelectorCallbacks) {
        this.scene = scene;
        this.callbacks = callbacks;
        this.container = this.scene.add.container(0, 0);

        this.selectedSite = (this.scene.registry.get("landingSite") as LandingSiteId) || "jezero";
        this.init();
        this.scene.input.keyboard?.on("keydown", this.handleKeyboard, this);
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        const { width, height } = this.scene.scale;

        // Background
        const bg = this.scene.add.rectangle(0, 0, width, height, UITheme.colors.spaceDark, 0.95).setOrigin(0);
        this.container.add(bg);

        // Header Title
        const header = this.scene.add.text(width / 2, 55, "MARS LANDING-SITE ORBITAL SCANNER", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "30px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);
        this.container.add(header);

        const sub = this.scene.add.text(width / 2, 90, "Select a deployment zone using mission telemetry and available terrain data", {
            fontFamily: UITheme.fonts.body,
            fontSize: "15px",
            color: UITheme.colors.textSecondary
        }).setOrigin(0.5);
        this.container.add(sub);

        // Left Column: Site Selection Cards
        this.createSiteTab("jezero", 80, 135, 430, 215);
        this.createSiteTab("arcadia", 80, 365, 430, 215);

        // Right Column: Tactical Radar & Detailed Telemetry Preview
        this.createTelemetryPreview(540, 135, 660, 445);

        this.updateSelectionVisuals();

        // Footer Actions
        const backBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: width / 2 - 180,
            y: height - 55,
            width: 220,
            height: 48,
            text: "← BACK",
            primaryColor: 0x6E85A8,
            onClick: () => this.callbacks.onBack()
        });
        this.container.add(backBtn);

        const confirmBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: width / 2 + 180,
            y: height - 55,
            width: 320,
            height: 48,
            text: "CONFIRM LANDING SITE ➔",
            primaryColor: UITheme.colors.marsAmber,
            textColor: UITheme.colors.solarGoldStr,
            icon: "📍",
            onClick: () => this.confirmSelection()
        });
        this.container.add(confirmBtn);

        const keyboardHint = this.scene.add.text(width / 2, height - 10, "← / →  CHOOSE SITE     ENTER  CONFIRM     ESC  BACK", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: "#9FB0BD",
            fontStyle: "bold"
        }).setOrigin(0.5, 1);
        this.container.add(keyboardHint);
    }

    private handleKeyboard(event: KeyboardEvent) {
        const key = event.key.toLowerCase();
        if (["arrowleft", "arrowright", "arrowup", "arrowdown", "a", "d", "w", "s"].includes(key)) {
            event.preventDefault();
            const nextSite: LandingSiteId = this.selectedSite === "jezero" ? "arcadia" : "jezero";
            if (nextSite !== this.selectedSite) {
                this.selectedSite = nextSite;
                SiteSoundFX.playSelect();
                this.updateSelectionVisuals();
                this.renderTelemetryDetails();
            }
        } else if (key === "enter" || key === " ") {
            event.preventDefault();
            this.confirmSelection();
        } else if (key === "escape" || key === "backspace") {
            event.preventDefault();
            this.callbacks.onBack();
        }
    }

    private confirmSelection() {
        this.scene.registry.set("landingSite", this.selectedSite);
        this.callbacks.onSiteSelected(this.selectedSite);
    }

    private createSiteTab(id: LandingSiteId, x: number, y: number, w: number, h: number) {
        const data = this.siteData[id];
        const tab = this.scene.add.container(x + w / 2, y + h / 2);

        // Visuals container (scales smoothly on hover without shifting hit testing coordinates)
        const visuals = this.scene.add.container(0, 0);
        tab.add(visuals);
        this.siteVisuals.set(id, visuals);

        // Drop shadow
        const shadow = this.scene.add.graphics();
        shadow.fillStyle(0x000000, 0.55);
        shadow.fillRoundedRect(-w / 2 + 2, -h / 2 + 4, w, h, UITheme.layout.cardRadius);
        visuals.add(shadow);

        // Card Base Background
        const graphics = this.scene.add.graphics();
        this.siteBgs.set(id, graphics);
        visuals.add(graphics);

        // Luminous Hover Glow (Intense neon aura that flares on hover!)
        const hoverGlow = this.scene.add.graphics();
        hoverGlow.fillStyle(id === "jezero" ? UITheme.colors.primaryCyan : UITheme.colors.marsAmber, 0.22);
        hoverGlow.fillRoundedRect(-w / 2, -h / 2, w, h, UITheme.layout.cardRadius);
        hoverGlow.lineStyle(3.5, id === "jezero" ? 0x65E5FF : 0xFFB300, 1);
        hoverGlow.strokeRoundedRect(-w / 2, -h / 2, w, h, UITheme.layout.cardRadius);
        hoverGlow.setAlpha(0);
        this.siteGlows.set(id, hoverGlow);
        visuals.add(hoverGlow);

        // Top Neon Edge Line
        const topEdge = this.scene.add.graphics();
        topEdge.fillStyle(id === "jezero" ? UITheme.colors.primaryCyan : UITheme.colors.marsAmber, 0.9);
        topEdge.fillRoundedRect(-w / 2 + 15, -h / 2 + 2, w - 30, 3, 1.5);
        visuals.add(topEdge);

        // Site Badge
        const tag = this.scene.add.text(-w / 2 + 20, -h / 2 + 18, id === "jezero" ? "SITE ALPHA · NASA HISTORIC" : "SITE BETA · COLONY EXPANSION", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: id === "jezero" ? UITheme.colors.primaryCyanStr : UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
        visuals.add(tag);

        // Title
        const name = this.scene.add.text(-w / 2 + 20, -h / 2 + 40, data.name, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "22px",
            color: "#FFFFFF",
            fontStyle: "bold"
        });
        name.name = `name_${id}`;
        visuals.add(name);

        // Coordinates & Terrain
        const coords = this.scene.add.text(-w / 2 + 20, -h / 2 + 73, `Coordinates: ${data.coordinates}`, {
            fontFamily: UITheme.fonts.body,
            fontSize: "13px",
            color: UITheme.colors.textHighlight
        });
        visuals.add(coords);

        const terrain = this.scene.add.text(-w / 2 + 20, -h / 2 + 95, data.terrainType, {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: UITheme.colors.textSecondary,
            wordWrap: { width: w - 40 }
        });
        visuals.add(terrain);

        // Perk Box
        const perkBox = this.scene.add.graphics();
        perkBox.fillStyle(0x051F14, 0.7);
        perkBox.fillRoundedRect(-w / 2 + 18, -h / 2 + 120, w - 36, 32, 6);
        perkBox.lineStyle(1, UITheme.colors.bioGreen, 0.45);
        perkBox.strokeRoundedRect(-w / 2 + 18, -h / 2 + 120, w - 36, 32, 6);
        visuals.add(perkBox);

        const perkText = this.scene.add.text(-w / 2 + 26, -h / 2 + 127, data.perk, {
            fontFamily: UITheme.fonts.body,
            fontSize: "11px",
            color: UITheme.colors.bioGreenStr,
            fontStyle: "bold",
            wordWrap: { width: w - 50 }
        });
        visuals.add(perkText);

        // Prominent Interactive Action Button Pill at the bottom of the card
        const actionBtnBg = this.scene.add.graphics();
        actionBtnBg.name = `actionBtnBg_${id}`;
        visuals.add(actionBtnBg);

        const actionBtnText = this.scene.add.text(0, h / 2 - 25, "", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            fontStyle: "bold"
        }).setOrigin(0.5);
        this.siteActionButtons.set(id, actionBtnText);
        visuals.add(actionBtnText);

        // Top-Layer Hit Shield: Placed OVER all visual children!
        // Generously sized (+12px w, +10px h) to catch pointer events instantly even at the slightest hovering!
        const hitShield = this.scene.add.rectangle(0, 0, w + 12, h + 10, 0x000000, 0.001);
        hitShield.setOrigin(0.5, 0.5);
        hitShield.setInteractive({ useHandCursor: true });
        tab.add(hitShield);

        hitShield.on("pointerover", () => {
            SiteSoundFX.playHover();

            this.scene.tweens.killTweensOf(visuals);
            this.scene.tweens.killTweensOf(hoverGlow);

            this.scene.tweens.add({
                targets: visuals,
                scaleX: 1.035,
                scaleY: 1.035,
                duration: 65,
                ease: "Back.easeOut"
            });

            this.scene.tweens.add({
                targets: hoverGlow,
                alpha: 1,
                duration: 45
            });

            name.setColor(id === "jezero" ? UITheme.colors.primaryCyanStr : UITheme.colors.solarGoldStr);
        });

        hitShield.on("pointermove", () => {
            if (hoverGlow.alpha < 0.9) hoverGlow.setAlpha(1);
            if (visuals.scaleX < 1.03) visuals.setScale(1.035);
        });

        hitShield.on("pointerout", () => {
            this.scene.tweens.killTweensOf(visuals);
            this.scene.tweens.killTweensOf(hoverGlow);

            this.scene.tweens.add({
                targets: visuals,
                scaleX: 1.0,
                scaleY: 1.0,
                duration: 85,
                ease: "Quad.easeOut"
            });

            this.scene.tweens.add({
                targets: hoverGlow,
                alpha: 0,
                duration: 85
            });

            name.setColor("#FFFFFF");
        });

        hitShield.on("pointerdown", () => {
            SiteSoundFX.playSelect();

            // Tactile feedback bounce
            this.scene.tweens.add({
                targets: visuals,
                scaleX: 0.98,
                scaleY: 0.98,
                duration: 45,
                yoyo: true,
                onComplete: () => {
                    visuals.setScale(1.035);
                }
            });

            this.selectedSite = id;
            this.updateSelectionVisuals();
            this.renderTelemetryDetails();
        });

        this.siteCards.set(id, tab);
        this.container.add(tab);
    }

    private createTelemetryPreview(x: number, y: number, w: number, h: number) {
        this.previewContainer = this.scene.add.container(x, y);

        // Panel Box
        const bg = this.scene.add.graphics();
        bg.fillStyle(UITheme.colors.panelBg, 0.95);
        bg.fillRoundedRect(0, 0, w, h, UITheme.layout.cardRadius);
        bg.lineStyle(2, UITheme.colors.panelBorderGlow, 0.6);
        bg.strokeRoundedRect(0, 0, w, h, UITheme.layout.cardRadius);
        this.previewContainer.add(bg);

        this.container.add(this.previewContainer);
        this.renderTelemetryDetails();
    }

    private renderTelemetryDetails() {
        const data = this.siteData[this.selectedSite];

        // Clear existing dynamic elements except background
        const toRemove = this.previewContainer.list.slice(1);
        toRemove.forEach(child => child.destroy());

        // Header Banner
        const banner = this.scene.add.text(28, 24, `ORBITAL RECONNAISSANCE: ${data.name}`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "20px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        });
        this.previewContainer.add(banner);

        // Mars CTX Map Thumbnail or High-tech Radar Grid
        const mapW = 280;
        const mapH = 200;
        const mapX = 28;
        const mapY = 65;

        const mapFrame = this.scene.add.graphics();
        mapFrame.fillStyle(0x050C18, 1);
        mapFrame.fillRoundedRect(mapX, mapY, mapW, mapH, 8);
        mapFrame.lineStyle(2, UITheme.colors.marsAmber, 0.9);
        mapFrame.strokeRoundedRect(mapX, mapY, mapW, mapH, 8);
        this.previewContainer.add(mapFrame);

        if (data.id === "jezero" && this.scene.textures.exists("jezero-mosaic")) {
            const img = this.scene.add.image(mapX + mapW / 2, mapY + mapH / 2, "jezero-mosaic");
            img.setDisplaySize(mapW - 8, mapH - 8);
            this.previewContainer.add(img);
        } else {
            // Avoid presenting Jezero imagery as if it were a matching Arcadia map.
            const radar = this.scene.add.graphics();
            radar.lineStyle(1, UITheme.colors.primaryCyan, 0.18);
            for (let gx = mapX + 24; gx < mapX + mapW; gx += 32) {
                radar.lineBetween(gx, mapY + 6, gx, mapY + mapH - 6);
            }
            for (let gy = mapY + 18; gy < mapY + mapH; gy += 28) {
                radar.lineBetween(mapX + 6, gy, mapX + mapW - 6, gy);
            }
            radar.lineStyle(1, UITheme.colors.primaryCyan, 0.28);
            radar.strokeCircle(mapX + mapW / 2, mapY + mapH / 2, 30);
            radar.strokeCircle(mapX + mapW / 2, mapY + mapH / 2, 62);
            radar.strokeCircle(mapX + mapW / 2, mapY + mapH / 2, 92);
            radar.fillStyle(UITheme.colors.primaryCyan, 0.85);
            radar.fillCircle(mapX + mapW / 2, mapY + mapH / 2, 3);
            this.previewContainer.add(radar);

            const radarText = this.scene.add.text(mapX + mapW / 2, mapY + 18, "ORBITAL TELEMETRY · NO SURFACE IMAGE", {
                fontFamily: UITheme.fonts.heading,
                fontSize: "8px",
                color: UITheme.colors.primaryCyanStr,
                align: "center",
                backgroundColor: "#050C18"
            }).setOrigin(0.5);
            this.previewContainer.add(radarText);
        }

        // Animated Targeting Crosshair
        const crosshair = this.scene.add.graphics();
        crosshair.lineStyle(1.5, UITheme.colors.primaryCyan, 0.9);
        crosshair.strokeCircle(mapX + mapW / 2, mapY + mapH / 2, 34);
        crosshair.lineBetween(mapX + mapW / 2 - 45, mapY + mapH / 2, mapX + mapW / 2 + 45, mapY + mapH / 2);
        crosshair.lineBetween(mapX + mapW / 2, mapY + mapH / 2 - 45, mapX + mapW / 2, mapY + mapH / 2 + 45);
        this.previewContainer.add(crosshair);

        // Right side: Environmental Telemetry Gauges
        const statsX = 330;
        const stats = [
            { label: "COORDINATES", val: data.coordinates, icon: "🌐" },
            { label: "SURFACE ELEVATION", val: data.elevation, icon: "⛰" },
            { label: "WATER ICE RESERVES", val: data.iceDepth, icon: "🧊" },
            { label: "SOLAR POWER INDEX", val: data.solarPower, icon: "☀" },
            { label: "MISSION SCIENCE RATING", val: data.scienceScore, icon: "🔬" }
        ];

        stats.forEach((item, idx) => {
            const statY = 68 + idx * 42;
            const icon = this.scene.add.text(statsX, statY, item.icon, { fontSize: "16px" });
            const lbl = this.scene.add.text(statsX + 26, statY, item.label, {
                fontFamily: UITheme.fonts.heading,
                fontSize: "11px",
                color: UITheme.colors.textMuted
            });
            const val = this.scene.add.text(statsX + 26, statY + 14, item.val, {
                fontFamily: UITheme.fonts.body,
                fontSize: "14px",
                color: "#FFFFFF",
                fontStyle: "bold"
            });
            this.previewContainer.add([icon, lbl, val]);
        });

        // Bottom Objective & Hazard Box
        const descBox = this.scene.add.graphics();
        descBox.fillStyle(0x081324, 0.9);
        descBox.fillRoundedRect(28, 285, 604, 130, 8);
        descBox.lineStyle(1.5, UITheme.colors.panelBorder, 1);
        descBox.strokeRoundedRect(28, 285, 604, 130, 8);
        this.previewContainer.add(descBox);

        const focusTitle = this.scene.add.text(45, 298, "PRIMARY SURFACE OBJECTIVE:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        });
        const focusText = this.scene.add.text(45, 318, data.targetFocus, {
            fontFamily: UITheme.fonts.body,
            fontSize: "13.5px",
            color: "#FFFFFF",
            wordWrap: { width: 560 }
        });

        const hazardTitle = this.scene.add.text(45, 348, "ENVIRONMENTAL HAZARD BRIEFING:", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "12px",
            color: UITheme.colors.emergencyRedStr,
            fontStyle: "bold"
        });
        const hazardText = this.scene.add.text(45, 368, data.hazard, {
            fontFamily: UITheme.fonts.body,
            fontSize: "13.5px",
            color: "#FFA8A8",
            wordWrap: { width: 560 }
        });

        this.previewContainer.add([focusTitle, focusText, hazardTitle, hazardText]);
    }

    private updateSelectionVisuals() {
        const w = 430;
        const h = 215;

        (["jezero", "arcadia"] as LandingSiteId[]).forEach(id => {
            const bg = this.siteBgs.get(id);
            const btnText = this.siteActionButtons.get(id);
            const visuals = this.siteVisuals.get(id);
            const actionBg = visuals?.getByName(`actionBtnBg_${id}`) as Phaser.GameObjects.Graphics | undefined;

            if (bg) {
                bg.clear();
                if (this.selectedSite === id) {
                    bg.fillStyle(UITheme.colors.cardSelected, 0.98);
                    bg.fillRoundedRect(-w / 2, -h / 2, w, h, UITheme.layout.cardRadius);
                    bg.lineStyle(3, id === "jezero" ? UITheme.colors.primaryCyan : UITheme.colors.marsAmber, 1);
                    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, UITheme.layout.cardRadius);
                } else {
                    bg.fillStyle(UITheme.colors.cardBg, 0.78);
                    bg.fillRoundedRect(-w / 2, -h / 2, w, h, UITheme.layout.cardRadius);
                    bg.lineStyle(1.5, UITheme.colors.panelBorder, 0.85);
                    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, UITheme.layout.cardRadius);
                }
            }

            if (actionBg && btnText) {
                actionBg.clear();
                const btnW = 390;
                const btnH = 28;
                const btnY = h / 2 - 25;

                if (this.selectedSite === id) {
                    actionBg.fillStyle(id === "jezero" ? 0x07324B : 0x422606, 0.95);
                    actionBg.fillRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
                    actionBg.lineStyle(2, id === "jezero" ? UITheme.colors.primaryCyan : UITheme.colors.marsAmber, 1);
                    actionBg.strokeRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, 6);

                    btnText.setText(id === "jezero" ? "✔ SELECTED FOR OUTPOST SOL (PRIMARY DELTA)" : "✔ SELECTED FOR OUTPOST SOL (CRYO EXPANSION)");
                    btnText.setColor(id === "jezero" ? UITheme.colors.primaryCyanStr : UITheme.colors.solarGoldStr);
                } else {
                    actionBg.fillStyle(0x0C1A2E, 0.85);
                    actionBg.fillRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, 6);
                    actionBg.lineStyle(1.5, UITheme.colors.panelBorderGlow, 0.75);
                    actionBg.strokeRoundedRect(-btnW / 2, btnY - btnH / 2, btnW, btnH, 6);

                    btnText.setText("CLICK OR HOVER TO SELECT THIS SITE ➔");
                    btnText.setColor(UITheme.colors.textHighlight);
                }
            }
        });
    }

    public destroy() {
        this.scene.input.keyboard?.off("keydown", this.handleKeyboard, this);
        this.container.destroy();
    }
}

export default LandingSiteSelector;
