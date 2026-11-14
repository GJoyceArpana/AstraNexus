import Phaser from "phaser";
import { gameState } from "../systems/GameState.ts";
import { motionMs } from "../systems/AudioBus.ts";
import { Font, fontPx, hex, paletteFor, toneColor, type MeterTone } from "../theme/theme.ts";

export type ResourceBarConfig = {
  label: string;
  value: number;
  display: string;
  unit?: string;
  tone: MeterTone;
  width?: number;
};

export class ResourceBar extends Phaser.GameObjects.Container {
  private readonly fill: Phaser.GameObjects.Graphics;
  private readonly widthPx: number;
  private shown = 0;
  private readonly target: number;
  private readonly tone: MeterTone;

  constructor(scene: Phaser.Scene, x: number, y: number, config: ResourceBarConfig, attach = true) {
    super(scene, x, y);
    const settings = gameState.get().settings;
    const palette = paletteFor(settings);
    this.widthPx = config.width ?? 360;
    this.tone = config.tone;
    this.target = Phaser.Math.Clamp(config.value, 0, 100);
    const label = new Phaser.GameObjects.Text(scene, 0, 0, config.label, {
      fontFamily: Font.display,
      fontSize: fontPx(15, settings),
      color: hex(palette.cyan),
    });
    const value = new Phaser.GameObjects.Text(scene, this.widthPx, 0, `${config.display}${config.unit ? ` ${config.unit}` : ""}`, {
      fontFamily: Font.body,
      fontSize: fontPx(18, settings),
      color: hex(palette.text),
    });
    value.setOrigin(1, 0);
    this.fill = new Phaser.GameObjects.Graphics(scene);
    this.add([label, value, this.fill]);
    this.setSize(this.widthPx, 48);
    this.draw(motionMs(1) === 0 ? this.target : 0);
    if (attach) scene.add.existing(this);
    if (motionMs(1) > 0) {
      const meter = { value: 0 };
      scene.tweens.add({
        targets: meter,
        value: this.target,
        duration: 700,
        ease: "Cubic.Out",
        onUpdate: () => this.draw(meter.value),
      });
    }
  }

  private draw(value: number): void {
    this.shown = value;
    const palette = paletteFor(gameState.get().settings);
    const graphics = this.fill;
    graphics.clear();
    const y = 28;
    graphics.fillStyle(0x07101d, 0.9);
    graphics.fillRoundedRect(0, y, this.widthPx, 14, 7);
    const color = toneColor(this.tone, palette);
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(0, y, Math.max(8, (this.widthPx * this.shown) / 100), 14, 7);
  }
}
