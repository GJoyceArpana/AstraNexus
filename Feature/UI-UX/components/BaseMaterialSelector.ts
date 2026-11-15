import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import ButtonFactory, { SoundFX } from "./ButtonFactory.ts";

export type BaseMaterialType = "glass" | "sand";

export interface BaseFeature {
    icon: string;
    title: string;
    desc: string;
}

export interface BaseMaterialInfo {
    id: BaseMaterialType;
    badge: string;
    name: string;
    tagline: string;
    accentColor: number;
    accentColorStr: string;
    bgAccent: number;
    features: BaseFeature[];
    funFact: string;
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
    private checkMarks: Map<BaseMaterialType, Phaser.GameObjects.Container> = new Map();

    private readonly materialData: Record<BaseMaterialType, BaseMaterialInfo> = {
        glass: {
            id: "glass",
            badge: "✨ SHINY & BRIGHT",
            name: "GLASS DOME",
            tagline: "See the stars & grow yummy space food!",
            accentColor: 0x00E5FF,
            accentColorStr: "#00E5FF",
            bgAccent: 0x051C30,
            features: [
                { icon: "☀️", title: "Warm Sunlight", desc: "Lots of bright, natural sunshine all day!" },
                { icon: "🌱", title: "Space Garden", desc: "Grows fresh greens & yummy space tomatoes!" },
                { icon: "🔭", title: "Star Windows", desc: "Watch Mars moons & rover right from your room!" }
            ],
            funFact: "Astronauts grow real fresh salads and tomatoes in space!"
        },
        sand: {
            id: "sand",
            badge: "🛡️ SUPER TOUGH",
            name: "SAND FORTRESS",
            tagline: "Super strong armor made from red Mars sand!",
            accentColor: 0xFFA726,
            accentColorStr: "#FFA726",
            bgAccent: 0x241407,
            features: [
                { icon: "🛡️", title: "Super Shield", desc: "Thick walls protect you from space rays!" },
                { icon: "🌪️", title: "Storm Proof", desc: "Safe and cozy even inside giant dust storms!" },
                { icon: "🧱", title: "100% Mars Sand", desc: "Robots build it right from red Martian soil!" }
            ],
            funFact: "Mars sandcastles are 3 times stronger than concrete!"
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
        const bg = this.scene.add.rectangle(0, 0, width, height, 0x050C18).setOrigin(0);
        this.container.add(bg);

        // Mars Horizon Glow Nebula
        const nebula = this.scene.add.circle(width * 0.5, height * 0.98, width * 0.7, 0x8C3224, 0.22);
        this.container.add(nebula);

        for (let i = 0; i < 40; i++) {
            const star = this.scene.add.circle(
                Phaser.Math.Between(0, width),
                Phaser.Math.Between(0, height),
                Phaser.Math.FloatBetween(0.8, 1.8),
                0xFFFFFF,
                Phaser.Math.FloatBetween(0.2, 0.7)
            );
            this.container.add(star);
        }

        // 2. Kid-Friendly Header: Big, Vibrant, Highly Legible
        const headerPill = this.scene.add.text(width / 2, 26, "✦ CHOOSE YOUR MARS HOME ✦", {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "14px",
            color: "#00E5FF",
            fontStyle: "bold",
            letterSpacing: 2
        }).setOrigin(0.5);
        this.container.add(headerPill);

        const title = this.scene.add.text(width / 2, 58, "PICK YOUR BASE HABITAT!", {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "32px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 2
        }).setOrigin(0.5);
        this.container.add(title);

        const sub = this.scene.add.text(width / 2, 92, "Where do you want your cadet to live and explore on Mars?", {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "16px",
            color: "#D0E4FA",
            fontStyle: "bold"
        }).setOrigin(0.5);
        this.container.add(sub);

        // 3. Two Spacious, Vibrant Interactive Cards
        const cardW = 500;
        const cardH = 520;
        const cardY = 372;

        const leftX = width / 2 - cardW / 2 - 22; // 368
        const rightX = width / 2 + cardW / 2 + 22; // 912

        this.createMaterialCard("glass", leftX, cardY, cardW, cardH);
        this.createMaterialCard("sand", rightX, cardY, cardW, cardH);

        this.updateCardSelectionVisuals();

        // 4. Clean, High-Contrast Footer Buttons
        const backBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: 140,
            y: height - 38,
            width: 170,
            height: 46,
            fontSize: "15px",
            text: "← BACK",
            primaryColor: 0x6E85A8,
            onClick: () => {
                SoundFX.playClick();
                this.callbacks.onBack();
            }
        });
        this.container.add(backBtn);

        const confirmBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: width - 180,
            y: height - 38,
            width: 290,
            height: 46,
            fontSize: "15px",
            text: "CONFIRM BASE ➔",
            primaryColor: UITheme.colors.solarGold,
            secondaryColor: 0x221808,
            textColor: UITheme.colors.solarGoldStr,
            icon: "🚀",
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
        const tag = this.scene.add.text(0, -h / 2 + 26, data.badge, {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "13px",
            color: data.accentColorStr,
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setOrigin(0.5);
        card.add(tag);

        // 2. Big Cheerful Name & Tagline (Large, High Contrast)
        const titleText = this.scene.add.text(0, -h / 2 + 56, data.name, {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "26px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 1.5
        }).setOrigin(0.5);

        const subText = this.scene.add.text(0, -h / 2 + 84, data.tagline, {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "14.5px",
            color: "#E2F0FF",
            fontStyle: "bold"
        }).setOrigin(0.5);
        card.add([titleText, subText]);

        // 3. Prominent Visual Showcase Box (Clean frame for the 3D base)
        const previewBoxY = -h / 2 + 176;
        const previewBoxH = 152;
        this.createPreviewGraphics(card, type, 0, previewBoxY, w - 40, previewBoxH);

        // 4. Three Fun, Kid-Friendly Features (Large Emojis + Large High-Legibility Text)
        const featureStartY = 28;
        const featureSpacing = 44;

        data.features.forEach((feat, idx) => {
            const featY = featureStartY + idx * featureSpacing;

            // Icon
            const icon = this.scene.add.text(-w / 2 + 30, featY, feat.icon, {
                fontSize: "24px"
            }).setOrigin(0, 0.5);

            // Title
            const featTitle = this.scene.add.text(-w / 2 + 68, featY - 10, feat.title.toUpperCase(), {
                fontFamily: "Nunito, Montserrat, sans-serif",
                fontSize: "15px",
                color: data.accentColorStr,
                fontStyle: "bold"
            });

            // Description
            const featDesc = this.scene.add.text(-w / 2 + 68, featY + 9, feat.desc, {
                fontFamily: "Nunito, Montserrat, sans-serif",
                fontSize: "14px",
                color: "#FFFFFF",
                fontStyle: "bold"
            });

            card.add([icon, featTitle, featDesc]);
        });

        // 5. Fun Kid Fact Box (Expanded Height for Large 13.5px Font)
        const factBoxY = 175;
        const factBox = this.scene.add.graphics();
        factBox.fillStyle(0x061426, 0.92);
        factBox.fillRoundedRect(-w / 2 + 20, factBoxY - 21, w - 40, 42, 10);
        factBox.lineStyle(1.5, data.accentColor, 0.5);
        factBox.strokeRoundedRect(-w / 2 + 20, factBoxY - 21, w - 40, 42, 10);
        card.add(factBox);

        const factText = this.scene.add.text(0, factBoxY, `💡 Fun Fact: ${data.funFact}`, {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "13.5px",
            color: "#FFFFFF",
            fontStyle: "bold",
            align: "center",
            wordWrap: { width: w - 50 }
        }).setOrigin(0.5);
        card.add(factText);

        // 6. Interactive Selection Button Pill at Bottom (Large 15px Font)
        const pillY = 228;

        const pillBg = this.scene.add.graphics();
        card.add(pillBg);
        this.actionPillBgs.set(type, pillBg);

        const pillText = this.scene.add.text(0, pillY, "CHOOSE THIS BASE ➔", {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "15px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0.5);
        card.add(pillText);
        this.actionPills.set(type, pillText);

        // 7. Corner Selection Badge (Top Right)
        const checkContainer = this.scene.add.container(w / 2 - 28, -h / 2 + 28);
        const checkCircle = this.scene.add.graphics();
        checkCircle.fillStyle(data.accentColor, 1);
        checkCircle.fillCircle(0, 0, 15);
        const checkIcon = this.scene.add.text(0, 0, "✓", {
            fontFamily: "Nunito, Montserrat, sans-serif",
            fontSize: "15px",
            color: "#000000",
            fontStyle: "bold"
        }).setOrigin(0.5);
        checkContainer.add([checkCircle, checkIcon]);
        checkContainer.setVisible(false);
        card.add(checkContainer);
        this.checkMarks.set(type, checkContainer);

        // 8. Full-Card Click & Hover Interaction
        const hitShield = this.scene.add.rectangle(0, 0, w, h, 0x000000, 0.001);
        hitShield.setInteractive({ useHandCursor: true });
        card.add(hitShield);

        hitShield.on("pointerover", () => {
            SoundFX.playHover();
            if (this.selectedMaterial !== type) {
                this.scene.tweens.add({
                    targets: card,
                    y: y - 6,
                    duration: 140,
                    ease: "Back.easeOut"
                });
            }
        });

        hitShield.on("pointerout", () => {
            if (this.selectedMaterial !== type) {
                this.scene.tweens.add({
                    targets: card,
                    y: y,
                    duration: 140,
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
        previewG.fillStyle(0x061122, 0.95);
        previewG.fillRoundedRect(x - w / 2, y - h / 2, w, h, 14);
        previewG.lineStyle(1.5, type === "glass" ? 0x00E5FF : 0xFFA726, 0.5);
        previewG.strokeRoundedRect(x - w / 2, y - h / 2, w, h, 14);
        card.add(previewG);

        if (type === "glass") {
            const habKey = this.scene.textures.exists("base-station")
                ? "base-station"
                : (this.scene.textures.exists("mars-habitat") ? "mars-habitat" : undefined);

            if (habKey) {
                // Soft Cyan Ambient Biosphere Halo
                const glassHalo = this.scene.add.ellipse(x, y - 8, 115, 70, 0x00E5FF, 0.22);
                card.add(glassHalo);

                const habImg = this.scene.add.image(x, y + 8, habKey);
                habImg.setScale(0.32); // Large, clear, prominent base showcase!
                habImg.setTint(0xC8F4FF);
                card.add(habImg);

                this.scene.tweens.add({
                    targets: glassHalo,
                    alpha: 0.42,
                    scaleX: 1.08,
                    scaleY: 1.08,
                    duration: 2000,
                    yoyo: true,
                    repeat: -1,
                    ease: "Sine.easeInOut"
                });
            }
        } else {
            // Sand Base Station asset on natural Mars sand dunes
            const sandKey = this.scene.textures.exists("sand-base-station")
                ? "sand-base-station"
                : (this.scene.textures.exists("base-station") ? "base-station" : undefined);

            if (sandKey) {
                const isRealSand = sandKey === "sand-base-station";
                const sandDune = this.scene.add.ellipse(x, y + 28, 200, 38, 0x98411D, 0.6);
                sandDune.setStrokeStyle(1.5, 0xE0936C, 0.7);
                card.add(sandDune);

                const sandImg = this.scene.add.image(x, y + (isRealSand ? 4 : 8), sandKey);
                sandImg.setScale(isRealSand ? 0.16 : 0.32); // Large, clear, prominent base showcase!
                if (!isRealSand) {
                    sandImg.setTint(0xE0936C);
                }
                card.add(sandImg);
            }
        }
    }

    private updateCardSelectionVisuals() {
        const cardW = 500;
        const cardH = 520;
        const pillW = 300;
        const pillH = 42;

        (["glass", "sand"] as BaseMaterialType[]).forEach(type => {
            const isSelected = this.selectedMaterial === type;
            const bg = this.cardBgs.get(type);
            const pillBg = this.actionPillBgs.get(type);
            const pillText = this.actionPills.get(type);
            const check = this.checkMarks.get(type);
            const data = this.materialData[type];

            if (check) {
                check.setVisible(isSelected);
            }

            if (bg) {
                bg.clear();
                if (isSelected) {
                    // Selected Radiant Card Backing with Glowing Rim
                    bg.fillStyle(data.bgAccent, 0.98);
                    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
                    bg.lineStyle(3.5, data.accentColor, 1);
                    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);

                    // Top Accent Banner Highlight
                    bg.fillStyle(data.accentColor, 0.18);
                    bg.fillRoundedRect(-cardW / 2 + 10, -cardH / 2 + 8, cardW - 20, 32, 8);
                } else {
                    bg.fillStyle(0x081628, 0.85);
                    bg.fillRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
                    bg.lineStyle(2, 0x1A3452, 0.8);
                    bg.strokeRoundedRect(-cardW / 2, -cardH / 2, cardW, cardH, 18);
                }
            }

            if (pillBg) {
                pillBg.clear();
                const pillY = 228;
                if (isSelected) {
                    pillBg.fillStyle(data.accentColor, 1);
                    pillBg.fillRoundedRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, 10);
                    pillBg.lineStyle(2, 0xFFFFFF, 0.9);
                    pillBg.strokeRoundedRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, 10);
                } else {
                    pillBg.fillStyle(0x0C2036, 0.9);
                    pillBg.fillRoundedRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, 10);
                    pillBg.lineStyle(1.5, data.accentColor, 0.6);
                    pillBg.strokeRoundedRect(-pillW / 2, pillY - pillH / 2, pillW, pillH, 10);
                }
            }

            if (pillText) {
                if (isSelected) {
                    pillText.setText(`★ SELECTED HOME ★`);
                    pillText.setColor("#000000");
                } else {
                    pillText.setText(`CHOOSE ${data.name} ➔`);
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
