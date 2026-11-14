import Phaser from "phaser";
import { gameState } from "../systems/GameState.ts";
import { Font, fontPx, hex, paletteFor, toneColor, type MeterTone } from "../theme/theme.ts";
import { SIMULATED_LABEL } from "../data/balance.ts";

export type TelemetryCardConfig = {
  label: string;
  value: string;
  unit?: string;
  tone?: MeterTone;
  width?: number;
  height?: number;
};

export class TelemetryCard extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, config: TelemetryCardConfig, attach = true) {
    super(scene, x, y);
    const settings = gameState.get().settings;
    const palette = paletteFor(settings);
    const width = config.width ?? 180;
    const height = config.height ?? 96;
    const tone = config.tone ?? "info";
    const graphics = new Phaser.GameObjects.Graphics(scene);
    graphics.fillStyle(palette.panel, 0.95);
    graphics.fillRoundedRect(0, 0, width, height, 16);
    graphics.lineStyle(2, toneColor(tone, palette), 0.8);
    graphics.strokeRoundedRect(0, 0, width, height, 16);
    const label = new Phaser.GameObjects.Text(scene, 14, 12, config.label, {
      fontFamily: Font.display,
      fontSize: fontPx(12, settings),
      color: hex(palette.cyan),
    });
    const value = new Phaser.GameObjects.Text(scene, 14, 36, config.value, {
      fontFamily: Font.display,
      fontSize: fontPx(22, settings),
      color: hex(palette.text),
    });
    const unit = new Phaser.GameObjects.Text(scene, 14, 68, config.unit ? `${config.unit}  ·  ${SIMULATED_LABEL}` : SIMULATED_LABEL, {
      fontFamily: Font.body,
      fontSize: fontPx(13, settings),
      color: hex(palette.textMuted),
    });
    this.add([graphics, label, value, unit]);
    this.setSize(width, height);
    if (attach) scene.add.existing(this);
  }
}
