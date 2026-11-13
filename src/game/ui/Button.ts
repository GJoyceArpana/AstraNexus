import { palette } from "../theme/palette";
import { textStyle } from "../theme/typography";
import { paintCard, panelPaint } from "./paint";

export type ButtonVariant = "primary" | "secondary" | "ghost";

export type ButtonOptions = {
  label: string;
  width?: number;
  height?: number;
  variant?: ButtonVariant;
  largeText?: boolean;
  contrast?: boolean;
  motion?: boolean;
  onClick: () => void;
};

export class UiButton extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private readonly options: ButtonOptions;
  private hovered = false;
  private pressed = false;
  private enabled = true;

  constructor(scene: Phaser.Scene, x: number, y: number, options: ButtonOptions) {
    super(scene, x, y);
    this.options = options;

    const boxWidth = options.width ?? 360;
    const boxHeight = options.height ?? 68;
    this.setSize(boxWidth, boxHeight);

    this.background = scene.add.graphics();
    this.label = scene.add
      .text(0, 0, options.label, textStyle("button", this.labelColor(), options.largeText ?? false))
      .setOrigin(0.5);
    this.hit = scene.add
      .rectangle(0, 0, boxWidth, boxHeight, palette.white, 0.001)
      .setInteractive({ useHandCursor: true });

    this.add([this.background, this.label, this.hit]);
    this.draw();
    this.bind();
    scene.add.existing(this);
  }

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.pressed = false;
    this.hovered = false;
    this.setScale(1);

    if (enabled) {
      this.hit.setInteractive({ useHandCursor: true });
    } else {
      this.hit.disableInteractive();
    }

    this.draw();
  }

  private bind(): void {
    this.hit.on("pointerover", () => {
      if (!this.enabled) return;
      this.hovered = true;
      this.draw();
    });

    this.hit.on("pointerout", () => {
      this.hovered = false;
      this.pressed = false;
      this.setScale(1);
      this.draw();
    });

    this.hit.on("pointerdown", () => {
      if (!this.enabled) return;
      this.pressed = true;
      if (this.options.motion !== false) this.setScale(0.98);
      this.draw();
    });

    this.hit.on("pointerup", () => {
      if (!this.enabled) return;
      const fire = this.pressed && this.hovered;
      this.pressed = false;
      this.setScale(1);
      this.draw();
      if (fire) this.options.onClick();
    });
  }

  private labelColor(): number {
    return this.options.variant === "primary" || this.options.variant === undefined
      ? palette.ink
      : palette.white;
  }

  private draw(): void {
    const width = this.width;
    const height = this.height;
    const variant = this.options.variant ?? "primary";
    const contrast = this.options.contrast ?? false;
    const hot = this.hovered || this.pressed;

    let fill = palette.orange;
    let stroke = palette.sand;
    let text = palette.ink;

    if (variant === "primary") {
      fill = hot ? palette.orangeHot : palette.orange;
      stroke = palette.sand;
      text = palette.ink;
    } else if (variant === "secondary") {
      fill = hot ? palette.navyRaised : palette.navy;
      stroke = palette.cyan;
      text = palette.white;
    } else {
      fill = palette.navy;
      stroke = hot ? palette.white : palette.cyan;
      text = palette.white;
    }

    const paint = panelPaint(contrast, stroke);
    this.background.clear();
    paintCard(this.background, -width / 2, -height / 2, width, height, {
      ...paint,
      fill,
      fillAlpha: variant === "ghost" ? (hot ? 0.28 : 0.12) : 1,
      stroke,
      radius: 18,
    });

    this.label.setColor(text === palette.ink ? "#1a120e" : "#f7f4ef");
    this.setAlpha(this.enabled ? 1 : 0.45);
  }
}
