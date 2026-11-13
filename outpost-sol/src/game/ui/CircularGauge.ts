import Phaser from "phaser";
import { gameState } from "../systems/GameState.ts";
import { motionMs } from "../systems/AudioBus.ts";
import { Font, fontPx, hex, paletteFor, toneColor, type MeterTone } from "../theme/theme.ts";

export type CircularGaugeConfig = {
  label: string;
  value: number;
  display: string;
  tone: MeterTone;
  radius?: number;
};

export class CircularGauge extends Phaser.GameObjects.Container {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly radius: number;
  private readonly tone: MeterTone;

  constructor(scene: Phaser.Scene, x: number, y: number, config: CircularGaugeConfig, attach = true) {
    super(scene, x, y);
    const settings = gameState.get().settings;
    const palette = paletteFor(settings);
    this.radius = config.radius ?? 52;
    this.tone = config.tone;
    this.graphics = new Phaser.GameObjects.Graphics(scene);
    const value = new Phaser.GameObjects.Text(scene, 0, -4, config.display, {
      fontFamily: Font.display,
      fontSize: fontPx(18, settings),
      color: hex(palette.text),
    });
    value.setOrigin(0.5);
    const label = new Phaser.GameObjects.Text(scene, 0, this.radius + 16, config.label, {
      fontFamily: Font.body,
      fontSize: fontPx(16, settings),
      color: hex(palette.textMuted),
    });
    label.setOrigin(0.5, 0);
    this.add([this.graphics, value, label]);
    this.setSize(this.radius * 2, this.radius * 2 + 36);
    const target = Phaser.Math.Clamp(config.value, 0, 100);
    if (motionMs(1) === 0) this.draw(target);
    else {
      const meter = { value: 0 };
      this.draw(0);
      scene.tweens.add({
        targets: meter,
        value: target,
        duration: 800,
        ease: "Cubic.Out",
        onUpdate: () => this.draw(meter.value),
      });
    }
    if (attach) scene.add.existing(this);
  }

  private draw(value: number): void {
    const palette = paletteFor(gameState.get().settings);
    const graphics = this.graphics;
    graphics.clear();
    graphics.lineStyle(10, 0x07101d, 0.95);
    graphics.beginPath();
    graphics.arc(0, 0, this.radius, Phaser.Math.DegToRad(140), Phaser.Math.DegToRad(400), false);
    graphics.strokePath();
    const sweep = 260 * (value / 100);
    graphics.lineStyle(10, toneColor(this.tone, palette), 1);
    graphics.beginPath();
    graphics.arc(0, 0, this.radius, Phaser.Math.DegToRad(140), Phaser.Math.DegToRad(140 + sweep), false);
    graphics.strokePath();
  }
}
