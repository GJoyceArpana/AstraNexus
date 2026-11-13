import Phaser from "phaser";
import { gameState } from "../systems/GameState.ts";
import { motionMs, playBlip } from "../systems/AudioBus.ts";
import { fontPx, hex, paletteFor, type Palette } from "../theme/theme.ts";
import { Font } from "../theme/theme.ts";

export type ButtonIcon = "play" | "help" | "objectives" | "settings" | "none";
export type ButtonVariant = "primary" | "secondary" | "ghost" | "alert";

export type ButtonConfig = {
  label: string;
  width?: number;
  height?: number;
  variant?: ButtonVariant;
  icon?: ButtonIcon;
  onClick: () => void;
};

export class UiButton extends Phaser.GameObjects.Container {
  private readonly config: ButtonConfig;
  private readonly widthPx: number;
  private readonly heightPx: number;
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private hovered = false;
  private pressed = false;
  private focused = false;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, config: ButtonConfig, attach = true) {
    super(scene, x, y);
    this.config = config;
    const settings = gameState.get().settings;
    this.widthPx = config.width ?? 320;
    this.heightPx = config.height ?? (settings.largeText ? 72 : 64);
    this.background = new Phaser.GameObjects.Graphics(scene);
    this.label = new Phaser.GameObjects.Text(scene, 16, 0, config.label, {
      fontFamily: Font.display,
      fontSize: fontPx(20, settings),
      color: "#ffffff",
    });
    this.label.setOrigin(0.5);
    this.add([this.background, this.label]);
    this.setSize(this.widthPx, this.heightPx);
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(-this.widthPx / 2, -this.heightPx / 2, this.widthPx, this.heightPx),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.draw();
    this.on("pointerover", () => {
      if (!this.enabled) return;
      this.hovered = true;
      this.draw();
      this.pulse(1.03);
    });
    this.on("pointerout", () => {
      this.hovered = false;
      this.pressed = false;
      this.draw();
      this.pulse(this.focused ? 1.03 : 1);
    });
    this.on("pointerdown", () => {
      if (!this.enabled) return;
      this.pressed = true;
      this.draw();
      this.pulse(0.98);
    });
    this.on("pointerup", () => {
      if (!this.enabled || !this.pressed) return;
      this.pressed = false;
      this.draw();
      this.pulse(1.03);
      playBlip(this.config.variant === "alert" ? "alert" : "click");
      this.config.onClick();
    });
    if (attach) scene.add.existing(this);
  }

  setFocused(focused: boolean): void {
    this.focused = focused;
    this.draw();
    if (focused) this.pulse(1.03);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.setAlpha(enabled ? 1 : 0.45);
    if (enabled) this.setInteractive();
    else this.disableInteractive();
  }

  private pulse(scale: number): void {
    if (motionMs(1) === 0) {
      this.setScale(scale);
      return;
    }
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scaleX: scale,
      scaleY: scale,
      duration: 90,
      ease: "Quad.Out",
    });
  }

  private draw(): void {
    const palette = paletteFor(gameState.get().settings);
    const variant = this.config.variant ?? "secondary";
    const graphics = this.background;
    graphics.clear();
    const x = -this.widthPx / 2;
    const y = -this.heightPx / 2;
    const radius = 16;
    const fill = this.fillFor(variant, palette);
    const textColor = variant === "primary" || variant === "alert" ? palette.textOnAccent : palette.text;
    graphics.fillStyle(fill, 1);
    graphics.fillRoundedRect(x, y, this.widthPx, this.heightPx, radius);
    if (this.hovered || this.pressed) {
      graphics.fillStyle(0xffffff, variant === "primary" ? 0.16 : 0.06);
      graphics.fillRoundedRect(x, y, this.widthPx, this.heightPx, radius);
    }
    const stroke = this.focused ? palette.yellow : variant === "primary" ? palette.sand : palette.cyan;
    const strokeAlpha = variant === "ghost" || this.focused ? 1 : 0.55;
    graphics.lineStyle(this.focused ? 3 : 2, stroke, strokeAlpha);
    graphics.strokeRoundedRect(x, y, this.widthPx, this.heightPx, radius);
    this.drawIcon(graphics, x + 28, 0, variant === "primary" ? palette.textOnAccent : palette.cyan);
    this.label.setColor(hex(textColor));
    this.label.setX(12);
  }

  private fillFor(variant: ButtonVariant, palette: Palette): number {
    if (variant === "primary") return palette.sand;
    if (variant === "alert") return 0xffb4bc;
    if (variant === "ghost") return palette.navy;
    return palette.panel;
  }

  private drawIcon(graphics: Phaser.GameObjects.Graphics, x: number, y: number, color: number): void {
    const icon = this.config.icon ?? "none";
    graphics.fillStyle(color, 1);
    graphics.lineStyle(2, color, 1);
    if (icon === "play") {
      graphics.fillTriangle(x - 6, y - 8, x - 6, y + 8, x + 9, y);
      return;
    }
    if (icon === "help") {
      graphics.strokeCircle(x, y, 9);
      graphics.fillCircle(x, y + 5, 1.4);
      graphics.beginPath();
      graphics.arc(x, y - 1, 4, Math.PI, 0.2, false);
      graphics.strokePath();
      return;
    }
    if (icon === "objectives") {
      graphics.strokeCircle(x, y, 9);
      graphics.lineBetween(x, y - 4, x, y + 3);
      graphics.lineBetween(x, y + 3, x + 4, y + 1);
      return;
    }
    if (icon === "settings") {
      graphics.strokeCircle(x, y, 4);
      for (let i = 0; i < 6; i += 1) {
        const angle = (Math.PI / 3) * i;
        graphics.lineBetween(x + Math.cos(angle) * 6, y + Math.sin(angle) * 6, x + Math.cos(angle) * 10, y + Math.sin(angle) * 10);
      }
    }
  }
}
