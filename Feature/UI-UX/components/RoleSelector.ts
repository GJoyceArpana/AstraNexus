import Phaser from "phaser";
import UITheme from "../styles/UITheme.ts";
import ButtonFactory from "./ButtonFactory.ts";

export type GameRole = "cadet" | "director";

export interface RoleSelectorCallbacks {
    onRoleSelected: (role: GameRole) => void;
    onBack: () => void;
}

export class RoleSelector {
    private scene: Phaser.Scene;
    private container: Phaser.GameObjects.Container;
    private callbacks: RoleSelectorCallbacks;
    private selectedRole: GameRole = "cadet";

    private cadetCardContainer!: Phaser.GameObjects.Container;
    private directorCardContainer!: Phaser.GameObjects.Container;
    private cadetGlow!: Phaser.GameObjects.Graphics;
    private directorGlow!: Phaser.GameObjects.Graphics;

    constructor(scene: Phaser.Scene, callbacks: RoleSelectorCallbacks) {
        this.scene = scene;
        this.callbacks = callbacks;
        this.container = this.scene.add.container(0, 0);

        this.selectedRole = (this.scene.registry.get("playerRole") as GameRole) || "cadet";
        this.init();
        this.scene.input.keyboard?.on("keydown", this.handleKeyboard, this);
    }

    public getContainer(): Phaser.GameObjects.Container {
        return this.container;
    }

    private init() {
        const { width, height } = this.scene.scale;

        // 1. Mars Space Background
        this.createSpaceBackground(width, height);

        // 2. Main Title: "SELECT YOUR ROLE" (matching the user's design)
        const title = this.scene.add.text(width / 2, 58, "SELECT YOUR ROLE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "36px",
            color: "#FFFFFF",
            fontStyle: "bold",
            letterSpacing: 3
        }).setOrigin(0.5);
        this.container.add(title);

        const subtitle = this.scene.add.text(width / 2, 94, "Choose your command clearance level for OUTPOST SOL operations", {
            fontFamily: UITheme.fonts.body,
            fontSize: "15px",
            color: UITheme.colors.textSecondary
        }).setOrigin(0.5);
        this.container.add(subtitle);

        // 3. Dual Role Cards (Cadet on Left, Flight Director on Right)
        const cardY = 380;
        const cardW = 390;
        const cardH = 500;
        const cardScale = 0.82;

        this.createCadetCard(width / 2 - 230, cardY, cardW, cardH, cardScale);
        this.createDirectorCard(width / 2 + 230, cardY, cardW, cardH, cardScale);

        // 4. Back Button (Bottom Left)
        const backBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: 130,
            y: height - 42,
            width: 190,
            height: 42,
            fontSize: "13px",
            text: "← BACK TO MENU",
            primaryColor: 0x6E85A8,
            onClick: () => this.callbacks.onBack()
        });
        this.container.add(backBtn);

        this.updateCardSelection();

        const roleKeyboardHint = this.scene.add.text(width / 2, height - 28, "← / →  CHOOSE ROLE     ENTER  CONTINUE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10px",
            color: "#B7C8D4",
            fontStyle: "bold"
        }).setOrigin(0.5);
        this.container.add(roleKeyboardHint);
    }

    private handleKeyboard(event: KeyboardEvent) {
        const key = event.key.toLowerCase();
        if (key === "arrowleft" || key === "a") {
            event.preventDefault();
            this.selectedRole = "cadet";
            this.updateCardSelection();
        } else if (key === "arrowright" || key === "d") {
            event.preventDefault();
            this.selectedRole = "director";
            this.updateCardSelection();
        } else if (key === "enter" || key === " ") {
            event.preventDefault();
            this.scene.registry.set("playerRole", this.selectedRole);
            this.callbacks.onRoleSelected(this.selectedRole);
        }
    }
    private createSpaceBackground(w: number, h: number) {
        // Deep space gradient
        const bg = this.scene.add.rectangle(0, 0, w, h, UITheme.colors.spaceDark).setOrigin(0);
        this.container.add(bg);

        // Mars atmosphere nebula glow
        const glow = this.scene.add.circle(w / 2, h * 0.45, 360, UITheme.colors.marsSky, 0.45);
        this.container.add(glow);

        // Twinkling stars
        for (let i = 0; i < 50; i++) {
            const star = this.scene.add.circle(
                Phaser.Math.Between(0, w),
                Phaser.Math.Between(0, h),
                Phaser.Math.FloatBetween(0.8, 1.8),
                0xFFFFFF,
                Phaser.Math.FloatBetween(0.2, 0.8)
            );
            this.container.add(star);
        }
    }

    private createCadetCard(x: number, y: number, w: number, h: number, scale: number) {
        this.cadetCardContainer = this.scene.add.container(x, y);

        // Glow selection outline
        this.cadetGlow = this.scene.add.graphics();
        this.cadetCardContainer.add(this.cadetGlow);

        // Render as live UI to avoid the baked checkerboard artwork.
        this.renderCadetCard(w * scale, h * scale);

        // Top Hit Shield for Card
        const cardShield = this.scene.add.rectangle(0, 0, w * scale, h * scale, 0x000000, 0.001);
        cardShield.setInteractive({ useHandCursor: true });
        this.cadetCardContainer.add(cardShield);

        cardShield.on("pointerover", () => {
            this.scene.tweens.add({
                targets: this.cadetCardContainer,
                scaleX: 1.03,
                scaleY: 1.03,
                duration: 100,
                ease: "Back.easeOut"
            });
        });

        cardShield.on("pointerout", () => {
            this.scene.tweens.add({
                targets: this.cadetCardContainer,
                scaleX: 1.0,
                scaleY: 1.0,
                duration: 100,
                ease: "Quad.easeOut"
            });
        });

        cardShield.on("pointerdown", () => {
            this.selectedRole = "cadet";
            this.updateCardSelection();

        });

        // Dedicated Interactive "CHOOSE CADET" Button positioned over the card's action area
        const chooseBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: 0,
            y: (h * scale) / 2 - 38,
            width: 250,
            height: 44,
            fontSize: "14px",
            text: "CHOOSE CADET",
            primaryColor: UITheme.colors.solarGold,
            secondaryColor: 0xF5B025,
            textColor: "#1A1504",
            onClick: () => {
                this.selectedRole = "cadet";
                this.scene.registry.set("playerRole", "cadet");
                this.updateCardSelection();

                this.callbacks.onRoleSelected("cadet");
            }
        });
        this.cadetCardContainer.add(chooseBtn);

        this.container.add(this.cadetCardContainer);
    }

    private createDirectorCard(x: number, y: number, w: number, h: number, scale: number) {
        this.directorCardContainer = this.scene.add.container(x, y);

        // Glow selection outline
        this.directorGlow = this.scene.add.graphics();
        this.directorCardContainer.add(this.directorGlow);

        // Render as live UI to avoid the baked checkerboard artwork.
        this.renderDirectorCard(w * scale, h * scale);

        // Top Hit Shield for Card
        const cardShield = this.scene.add.rectangle(0, 0, w * scale, h * scale, 0x000000, 0.001);
        cardShield.setInteractive({ useHandCursor: true });
        this.directorCardContainer.add(cardShield);

        cardShield.on("pointerover", () => {
            this.scene.tweens.add({
                targets: this.directorCardContainer,
                scaleX: 1.03,
                scaleY: 1.03,
                duration: 100,
                ease: "Back.easeOut"
            });
        });

        cardShield.on("pointerout", () => {
            this.scene.tweens.add({
                targets: this.directorCardContainer,
                scaleX: 1.0,
                scaleY: 1.0,
                duration: 100,
                ease: "Quad.easeOut"
            });
        });

        cardShield.on("pointerdown", () => {
            this.selectedRole = "director";
            this.updateCardSelection();

        });

        // Dedicated Interactive "CHOOSE DIRECTOR" Button
        const chooseBtn = ButtonFactory.createButton({
            scene: this.scene,
            x: 0,
            y: (h * scale) / 2 - 38,
            width: 250,
            height: 44,
            fontSize: "14px",
            text: "CHOOSE DIRECTOR",
            primaryColor: UITheme.colors.solarGold,
            secondaryColor: 0xF5B025,
            textColor: "#1A1504",
            onClick: () => {
                this.selectedRole = "director";
                this.scene.registry.set("playerRole", "director");
                this.updateCardSelection();

                this.callbacks.onRoleSelected("director");
            }
        });
        this.directorCardContainer.add(chooseBtn);

        this.container.add(this.directorCardContainer);
    }

    private renderCadetCard(w: number, h: number) {
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x111B29, 0.98);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
        bg.lineStyle(1.5, 0x3A4B5B, 0.95);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
        bg.fillStyle(UITheme.colors.primaryCyan, 1);
        bg.fillRoundedRect(-w / 2 + 16, -h / 2 + 12, w - 32, 4, 2);
        this.cadetCardContainer.add(bg);

        const halo = this.scene.add.circle(0, -72, 62, 0x1C485C, 0.52)
            .setStrokeStyle(1.5, UITheme.colors.primaryCyan, 0.55);
        const portrait = this.scene.add.image(0, -72, "boy_avatar_1").setScale(0.32);
        const tag = this.scene.add.text(0, -176, "FIELD OPERATIONS · TRAINING MODE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            letterSpacing: 0.7
        }).setOrigin(0.5);
        const title = this.scene.add.text(0, 32, "JUNIOR CADET", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "20px",
            color: "#F3F6F8",
            fontStyle: "bold"
        }).setOrigin(0.5);
        const desc = this.scene.add.text(0, 64, "Explore Mars with helpful guidance\nand forgiving resource pressure.", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: "#B6C4CD",
            align: "center",
            lineSpacing: 4
        }).setOrigin(0.5, 0);
        const feature = this.scene.add.text(0, 98, "✓  Guided mission steps\n✓  Lower life-support drain", {
            fontFamily: UITheme.fonts.body,
            fontSize: "10px",
            color: "#7EE0C0",
            align: "left",
            lineSpacing: 3
        }).setOrigin(0.5, 0);
        this.cadetCardContainer.add([halo, portrait, tag, title, desc, feature]);
    }
    private renderDirectorCard(w: number, h: number) {
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x111B29, 0.98);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 22);
        bg.lineStyle(1.5, 0x3A4B5B, 0.95);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 22);
        bg.fillStyle(UITheme.colors.solarGold, 1);
        bg.fillRoundedRect(-w / 2 + 16, -h / 2 + 12, w - 32, 4, 2);
        this.directorCardContainer.add(bg);

        const halo = this.scene.add.circle(0, -72, 62, 0x4A3823, 0.46)
            .setStrokeStyle(1.5, UITheme.colors.solarGold, 0.6);
        const portrait = this.scene.add.image(0, -72, "girl_avatar_1").setScale(0.32);
        const tag = this.scene.add.text(0, -176, "COMMAND SYSTEMS · ADVANCED MODE", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "9px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 0.7
        }).setOrigin(0.5);
        const title = this.scene.add.text(0, 32, "FLIGHT DIRECTOR", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "20px",
            color: "#F3F6F8",
            fontStyle: "bold"
        }).setOrigin(0.5);
        const desc = this.scene.add.text(0, 64, "Lead a demanding Mars operation\nwith tighter resource limits.", {
            fontFamily: UITheme.fonts.body,
            fontSize: "12px",
            color: "#B6C4CD",
            align: "center",
            lineSpacing: 4
        }).setOrigin(0.5, 0);
        const feature = this.scene.add.text(0, 98, "✓  Higher resource drain\n✓  Greater crew-risk pressure", {
            fontFamily: UITheme.fonts.body,
            fontSize: "10px",
            color: "#F2CB83",
            align: "left",
            lineSpacing: 3
        }).setOrigin(0.5, 0);
        this.directorCardContainer.add([halo, portrait, tag, title, desc, feature]);
    }
    private updateCardSelection() {
        const w = 390 * 0.82;
        const h = 500 * 0.82;

        this.cadetGlow.clear();
        this.directorGlow.clear();

        if (this.selectedRole === "cadet") {
            this.cadetGlow.lineStyle(5, UITheme.colors.solarGold, 1);
            this.cadetGlow.strokeRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 22);
        } else {
            this.directorGlow.lineStyle(5, UITheme.colors.solarGold, 1);
            this.directorGlow.strokeRoundedRect(-w / 2 - 4, -h / 2 - 4, w + 8, h + 8, 22);
        }
    }

    public destroy() {
        this.scene.input.keyboard?.off("keydown", this.handleKeyboard, this);
        this.container.destroy();
    }
}

export default RoleSelector;
