import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "./ButtonFactory.ts";

export type BaseMaterialType = "glass" | "sand";

export interface BaseMaterialInfo {
    id: BaseMaterialType;
    name: string;
    subtitle: string;
    materialTag: string;
    accentColor: number;
    accentColorStr: string;
    description: string;
    perks: { label: string; value: string; icon: string }[];
    scienceFact: string;
}

export interface BaseMaterialSelectorCallbacks {
    onMaterialSelected: (material: BaseMaterialType) => void;
    onBack: () => void;
}

export class BaseMaterialSelector {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private callbacks: BaseMaterialSelectorCallbacks;
    private selectedMaterial: BaseMaterialType = "glass";

    private cards: Map<BaseMaterialType, Phaser.GameObjects.Container> = new Map();
    private cardBgs: Map<BaseMaterialType, Phaser.GameObjects.Graphics> = new Map();
    private actionPills: Map<BaseMaterialType, Phaser.GameObjects.Text> = new Map();
    private actionPillBgs: Map<BaseMaterialType, Phaser.GameObjects.Graphics> = new Map();

    private readonly materialData: Record<BaseMaterialType, BaseMaterialInfo> = {
        glass: {
            id: "glass",
            name: "SILICA GLASS BIOSPHERE",
            subtitle: "Fused Quartz Silica & Pressurized Aerogel Dome",
            materialTag: "OPTICAL BIOSPHERE DOME",
            accentColor: UITheme.colors.primaryCyan,
            accentColorStr: UITheme.colors.primaryCyanStr,
            description: "High-transparency bio-canopy synthesized by melting pure Martian sand into fused quartz. Provides daylight illumination, optimal crop photosynthesis, and 360° panoramic surface monitoring.",
            perks: [
                { icon: "☀️", label: "Solar Influx", value: "92% Natural Lighting (-25% Grid Power)" },
                { icon: "🌱", label: "Botanical Synergy", value: "+35% Hydroponic Crop Yield" },
                { icon: "🔭", label: "Surface Visibility", value: "Panoramic Jezero Delta Observation" },
                { icon: "🛡️", label: "Radiation Defense", value: "Requires Active Magnetic Shield Grid" }
            ],
            scienceFact: "NASA In-Situ Research: High-temperature microwaves melt Martian silica sand into transparent quartz glass domes, allowing natural plant photosynthesis while shielding against dust."
        },
        sand: {
            id: "sand",
            name: "SINTERED REGOLITH VAULT",
            subtitle: "3D-Printed Martian Sand & Compacted Basalt",
            materialTag: "FORTIFIED REGOLITH VAULT",
            accentColor: UITheme.colors.solarGold,
            accentColorStr: UITheme.colors.solarGoldStr,
            description: "Fortified habitat shell created by microwave-sintering indigenous iron-rich Martian sand into high-density interlocking basalt blocks. Delivers superior cosmic radiation shielding and sandstorm resilience.",
            perks: [
                { icon: "🛡️", label: "Radiation Shield", value: "+55% Passive Cosmic Ray Deflection" },
                { icon: "🌪️", label: "Storm Armor", value: "100% Micro-Meteoroid & Sand Abrasion Proof" },
                { icon: "🌡️", label: "Thermal Inertia", value: "High Basalt Mass (Prevents Night Freeze)" },
                { icon: "🧱", label: "In-Situ Materials", value: "Zero Earth Resupply (100% Martian Sand)" }
            ],
            scienceFact: "NASA ISRU Architecture: Sintering Martian regolith sand with microwave energy bonds basaltic grains into interlocking structural vaults 3x stronger than Earth concrete."
        }
    };

    constructor(scene: Phaser.Scene, callbacks: BaseMaterialSelectorCallbacks) {
        this.scene = scene;
        this.callbacks = callbacks;
        this.container = this.scene.add.container(0, 0);

        // Load existing saved preference if present
        const saved = this.scene.registry.get("baseConstructionMaterial") as BaseMaterialType | undefined;
        if (saved && (saved === "glass" || saved === "sand")) {
            this.selectedMaterial = saved;
        }

        this.init();
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        const { width, height } = this.scene.scale;

        // 1. Deep Space Atmospheric Backdrop
        const bg = this.scene.add.rectangle(0, 0, width, height, UITheme.colors.spaceDark).setOrigin(0);
        this.container.add(bg);

        // Mars Horizon Glow Nebula
        const nebula = this.scene.add.circle(width * 0.5, height * 0.95, width * 0.65, UITheme.colors.marsSurface, 0.22);
        this.container.add(nebula);

        for (let i = 0; i < 45; i++) {
            const star = this.scene.add.circle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height),
                Phaser.Math.FloatBetween(0.8, 1.8),
                0xFFFFFF,
                Phaser.Math.FloatBetween(0.2, 0.7)
            );
            this.container.add(star);
        }

        // 2. Header
        const headerPill = this.scene.add.text(width / 2, 24, "✦ HABITAT ENGINEERING DIRECTIVE ✦", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            letterSpacing: 2
        }).setOrigin(0.5);
        this.container.add(headerPill);

        const title = this.scene.add.text(width / 2, 50, "MARS BASE HABITAT ARCHITECTURE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "24px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 2
        }).setOrigin(0.5);
        this.container.add(title);

        const sub = this.scene.add.text(width / 2, 74, "Select surface construction engineering material for Outpost Sol habitat modules and biosphere bays", {
            fontFamily: UITheme.fonts.body,
            fontSize: "13px",
            color: UITheme.colors.textSecondary
        }).setOrigin(0.5);
        this.container.add(sub);

        // 3. Two Large Side-by-Side Interactive Architecture Cards
        const cardW = 500;
        const cardH = 490;
        const cardY = 352;

        const leftX = width / 2 - cardW / 2 - 25; // 365
        const rightX = width / 2 + cardW / 2 + 25; // 915

        this.createMaterialCard("glass", leftX, cardY, cardW, cardH);
        this.createMaterialCard("sand", rightX, cardY, cardW, cardH);

        this.updateCardSelectionVisuals();

        // 4. Footer Buttons
        const backBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: 180,
            y: height - 42,
            width: 220,
            height: 44,
            fontSize: "13px",
            text: "← BACK TO SUIT",
            primaryColor: 0x6E85A8,
            onClick: () => {
                SoundFX.playClick();
                this.callbacks.onBack();
            }
        });
        this.container.add(backBtn);

        const confirmBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: width - 210,
            y: height - 42,
            width: 290,
            height: 44,
            fontSize: "13px",
            text: "CONFIRM BASE ARCHITECTURE ➔",
            primaryColor: UITheme.colors.solarGold,
            secondaryColor: 0x221808,
            textColor: UITheme.colors.solarGoldStr,
            icon: "🏗️",
            onClick: () => {
                SoundFX.playClick();
                this.scene.registry.set("baseConstructionMaterial", this.selectedMaterial);
                if (typeof window !== "undefined" && window.localStorage) {
                    try {
                        localStorage.setItem("astra_base_material", this.selectedMaterial);
                    } catch {}
                }
                this.callbacks.onMaterialSelected(this.selectedMaterial);
            }
        });
        this.container.add(confirmBtn);
    }

    private createMaterialCard(
        type: BaseMaterialType,
        x: number,
        y: number,
        w: number,
        h: number
    ) {
        const data = this.materialData[type];
        const card = this.scene.add.container(x, y);

        // 0. Card Background Graphic
        const bg = this.scene.add.graphics();
        card.add(bg);
        this.cardBgs.set(type, bg);

        // 1. Category Tag Pill at Top
        const tag = this.scene.add.text(0, -h / 2 + 22, `✦ ${data.materialTag} ✦`, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: data.accentColorStr,
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0.5);
        card.add(tag);

        // 2. Main Title & Subtitle
        const titleText = this.scene.add.text(0, -h / 2 + 45, data.name, {
            fontFamily: UITheme.fonts.heading,
            fontSize: "16px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0.5);

        const subText = this.scene.add.text(0, -h / 2 + 66, data.subtitle, {
            fontFamily: UITheme.fonts.body,
            fontSize: "11px",
            color: UITheme.colors.textSecondary,
            fontStyle: "bold"
        }).setOrigin(0.5);
        card.add([titleText, subText]);

        // 3. Architectural Preview Graphic Box
        const previewBoxY = -h / 2 + 135;
        this.createPreviewGraphics(card, type, 0, previewBoxY, w - 48, 100);

        // 4. Description Paragraph
        const descText = this.scene.add.text(0, -h / 2 + 208, data.description, {
            fontFamily: UITheme.fonts.body,
            fontSize: "11px",
            color: "#D0DEEE",
            align: "center",
            wordWrap: { width: w - 50 }
        }).setOrigin(0.5);
        card.add(descText);

        // 5. Four Key Engineering Specifications (2x2 Grid)
        const gridStartY = -h / 2 + 270;
        data.perks.forEach((perk, idx) => {
            const col = idx % 2;
            const row = Math.floor(idx / 2);
            const perkX = col === 0 ? -w / 2 + 32 : 12;
            const perkY = gridStartY + row * 44;

            const icon = this.scene.add.text(perkX, perkY, perk.icon, { fontSize: "16px" });
            const pLabel = this.scene.add.text(perkX + 26, perkY - 2, perk.label.toUpperCase(), {
                fontFamily: UITheme.fonts.heading,
                fontSize: "10px",
                color: data.accentColorStr,
                fontStyle: "bold"
            });
            const pVal = this.scene.add.text(perkX + 26, perkY + 12, perk.value, {
                fontFamily: UITheme.fonts.body,
                fontSize: "10px",
                color: "#FFFFFF",
                wordWrap: { width: 200 }
            });

            card.add([icon, pLabel, pVal]);
        });

        // 6. NASA Science Callout Box
        const sciBoxY = -h / 2 + 386;
        const sciBox = this.scene.add.graphics();
        sciBox.fillStyle(0x061426, 0.9);
        sciBox.fillRoundedRect(-w / 2 + 24, sciBoxY - 22, w - 48, 44, 8);
        sciBox.lineStyle(1, data.accentColor, 0.5);
        sciBox.strokeRoundedRect(-w / 2 + 24, sciBoxY - 22, w - 48, 44, 8);
        card.add(sciBox);

        const sciText = this.scene.add.text(0, sciBoxY, `🔬 ${data.scienceFact}`, {
            fontFamily: UITheme.fonts.body,
            fontSize: "9.5px",
            color: "#99B5D8",
            align: "center",
            wordWrap: { width: w - 66 }
        }).setOrigin(0.5);
        card.add(sciText);

        // 7. Interactive Selection Button Pill at Bottom
        const pillY = h / 2 - 32;

        const pillBg = this.scene.add.graphics();
        card.add(pillBg);
        this.actionPillBgs.set(type, pillBg);

        const pillText = this.scene.add.text(0, pillY, "SELECT THIS BASE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "11px",
            color: "#FFFFFF",
            fontStyle: "bold"
        }).setOrigin(0.5);
        card.add(pillText);
        this.actionPills.set(type, pillText);

        // 8. 100% Full-Coverage Hit Shield
        const hitShield = this.scene.add.rectangle(0, 0, w, h, 0x000000, 0.001);
        hitShield.setInteractive({ useHandCursor: true });
        card.add(hitShield);

        hitShield.on("pointerover", () => {
            SoundFX.playHover();
            if (this.selectedMaterial !== type) {
                this.scene.tweens.add({
                    targets: card,
                    y: y - 5,
                    duration: 120,
                    ease: "Quad.easeOut"
                });
            }
        });

        hitShield.on("pointerout", () => {
            if (this.selectedMaterial !== type) {
                this.scene.tweens.add({
                    targets: card,
                    y: y,
                    duration: 120,
                    ease: "Quad.easeOut"
                });
            }
        });

        hitShield.on("pointerdown", () => {
            SoundFX.playClick();
            this.selectedMaterial = type;
            this.updateCardSelectionVisuals();
        });

        this.cards.set(type, card);
        this.container.add(card);
    }

    private createPreviewGraphics(
        card: Phaser.GameObjects.Container,
        type: BaseMaterialType,
        x: number,
        y: number,
        w: number,
        h: number
    ) {
        const previewG = this.scene.add.graphics();
        previewG.fillStyle(0x05101E, 0.95);
        previewG.fillRoundedRect(x - w / 2, y - h / 2, w, h, 8);
        previewG.lineStyle(1.5, type === "glass" ? 0x00E5FF : 0xFFD600, 0.6);
        previewG.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 8);
        card.add(previewG);

        const habKey = this.scene.textures.exists("base-station")
            ? "base-station"
            : (this.scene.textures.exists("mars-habitat") ? "mars-habitat" : undefined);

        if (habKey) {
            const habImg = this.scene.add.image(x, y + 6, habKey);
            habImg.setScale(0.24);

            if (type === "glass") {
                // Radiant cyan glass dome tint & specular highlight
                habImg.setTint(0xC8F4FF);
                const glassHalo = this.scene.add.ellipse(x, y - 6, 80, 52, 0x00E5FF, 0.22);
                card.add([glassHalo, habImg]);

                this.scene.tweens.add({
                    targets: glassHalo,
                    alpha: 0.38,
                    duration: 2200,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut"
                });
            } else {
                // Ochre/terracotta sintered regolith sand tint & heavy sand foundation
                habImg.setTint(0xE0936C);
                const sandRing = this.scene.add.ellipse(x, y + 16, 120, 36, 0xC46B42, 0.35);
                sandRing.setStrokeStyle(1.5, 0xFFD600, 0.6);
                card.add([sandRing, habImg]);
            }
        }
    }

    private updateCardSelectionVisuals() {
        const cardW = 500;
        const cardH = 490;
        const pillW = 260;
        const pillH = 34;

        (["glass", "sand"] as BaseMaterialType[]).forEach(type => {
            const isSelected = this.selectedMaterial === type;
            const bg = this.cardBgs.get(type);
            const pillBg = this.actionPillBgs.get(type);
            const pillText = this.actionPills.get(type);
            const data = this.materialData[type];

            if (bg) {
                bg.clear();
                if (isSelected) {
                    // Selected Radiant Card Backing
                    bg.fillStyle(0x0C2240, 0.98);
                    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
                    bg.lineStyle(3, data.accentColor, 1);
                    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);

                    // Top Accent Banner Highlight
                    bg.fillStyle(data.accentColor, 0.2);
                    bg.fillRoundedRect(-cardW / 2 + 10, -cardH / 2 + 6, cardW - 20, 28, 6);
                } else {
                    bg.fillStyle(UITheme.colors.cardBg, 0.85);
                    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
                    bg.lineStyle(1.5, UITheme.colors.panelBorder, 0.7);
                    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 14);
                }
            }

            if (pillBg) {
                pillBg.clear();
                const pillY = cardH / 2 - 32;
                if (isSelected) {
                    pillBg.fillStyle(data.accentColor, 0.95);
                    pillBg.fillRoundedRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, 8);
                    pillBg.lineStyle(2, 0xFFFFFF, 1);
                    pillBg.strokeRoundedRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, 8);
                } else {
                    pillBg.fillStyle(0x0A182E, 0.9);
                    pillBg.fillRoundedRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, 8);
                    pillBg.lineStyle(1.5, UITheme.colors.panelBorder, 0.9);
                    pillBg.strokeRoundedRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, 8);
                }
            }

            if (pillText) {
                if (isSelected) {
                    pillText.setText(`✓ SELECTED ARCHITECTURE`);
                    pillText.setColor("#000000");
                } else {
                    pillText.setText(`SELECT ${data.name.split(" ")[0]} BASE`);
                    pillText.setColor(data.accentColorStr);
                }
            }
        });
    }

    public destroy() {
        this.container.destroy();
    }
}

export default BaseMaterialSelector;
