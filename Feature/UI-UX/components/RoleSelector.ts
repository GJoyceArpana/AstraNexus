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

        // If card_cadet image exists, render it; otherwise render styled fallback
        if (this.scene.textures.exists("card_cadet")) {
            const cardImg = this.scene.add.image(0, 0, "card_cadet");
            cardImg.setScale(scale);
            this.cadetCardContainer.add(cardImg);
        } else {
            this.renderCadetFallback(w, h);
        }

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

        if (this.scene.textures.exists("card_director")) {
            const cardImg = this.scene.add.image(0, 0, "card_director");
            cardImg.setScale(scale);
            this.directorCardContainer.add(cardImg);
        } else {
            this.renderDirectorFallback(w, h);
        }

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

    private renderCadetFallback(w: number, h: number) {
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x0E192E, 0.96);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
        bg.lineStyle(2.5, UITheme.colors.primaryCyan, 0.9);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
        this.cadetCardContainer.add(bg);

        // Circular Icon Badge
        const badgeCircle = this.scene.add.circle(0, -95, 38, 0x07152B);
        badgeCircle.setStrokeStyle(2, UITheme.colors.primaryCyan, 1);
        const badgeIcon = this.scene.add.text(0, -95, "👨‍🚀", { fontSize: "38px" }).setOrigin(0.5);
        this.cadetCardContainer.add([badgeCircle, badgeIcon]);

        const title = this.scene.add.text(0, -28, "JUNIOR CADET", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "22px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0.5);

        const badgeTag = this.scene.add.text(0, 4, "✦ STANDARD RECON CLEARANCE ✦", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        const desc = this.scene.add.text(0, 68, "Perfect for newer astronauts!\nFocus on exploration, surface mobility,\nand learning about Mars with guided telemetry.", {
            fontFamily: UITheme.fonts.body,
            fontSize: "13px",
            color: "#D0E2FF",
            align: "center",
            lineSpacing: 5,
            wordWrap: { width: 300 }
        }).setOrigin(0.5);

        this.cadetCardContainer.add([title, badgeTag, desc]);
    }

    private renderDirectorFallback(w: number, h: number) {
        const bg = this.scene.add.graphics();
        bg.fillStyle(0x0E192E, 0.96);
        bg.fillRoundedRect(-w / 2, -h / 2, w, h, 20);
        bg.lineStyle(2.5, UITheme.colors.solarGold, 0.9);
        bg.strokeRoundedRect(-w / 2, -h / 2, w, h, 20);
        this.directorCardContainer.add(bg);

        // Circular Icon Badge
        const badgeCircle = this.scene.add.circle(0, -95, 38, 0x07152B);
        badgeCircle.setStrokeStyle(2, UITheme.colors.solarGold, 1);
        const badgeIcon = this.scene.add.text(0, -95, "🎖️", { fontSize: "38px" }).setOrigin(0.5);
        this.directorCardContainer.add([badgeCircle, badgeIcon]);

        const title = this.scene.add.text(0, -28, "FLIGHT DIRECTOR", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "22px",
            color: UITheme.colors.solarGoldStr,
            fontStyle: "bold",
            letterSpacing: 1
        }).setOrigin(0.5);

        const badgeTag = this.scene.add.text(0, 4, "✦ ADVANCED MISSION COMMAND ✦", {
            fontFamily: UITheme.fonts.heading,
            fontSize: "10.5px",
            color: UITheme.colors.primaryCyanStr,
            fontStyle: "bold"
        }).setOrigin(0.5);

        const desc = this.scene.add.text(0, 68, "For seasoned commanders!\nManage demanding ECLSS life support,\npower grids, and severe Martian weather.", {
            fontFamily: UITheme.fonts.body,
            fontSize: "13px",
            color: "#FFFFFF",
            align: "center",
            lineSpacing: 5,
            wordWrap: { width: 300 }
        }).setOrigin(0.5);

        this.directorCardContainer.add([title, badgeTag, desc]);
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
        this.container.destroy();
    }
}

export default RoleSelector;
