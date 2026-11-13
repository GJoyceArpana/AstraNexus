import Phaser from "phaser";
import { gameState } from "../systems/GameState.ts";
import { motionMs } from "../systems/AudioBus.ts";
import { Font, fontPx, hex, paletteFor } from "../theme/theme.ts";

export type BadgeConfig = {
  title: string;
  description: string;
  earned?: boolean;
};

export class Badge extends Phaser.GameObjects.Container {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private earned: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, config: BadgeConfig, attach = true) {
    super(scene, x, y);
    this.earned = config.earned ?? false;
    const settings = gameState.get().settings;
    const palette = paletteFor(settings);
    this.graphics = new Phaser.GameObjects.Graphics(scene);
    const title = new Phaser.GameObjects.Text(scene, 78, 8, config.title, {
      fontFamily: Font.display,
      fontSize: fontPx(16, settings),
      color: hex(this.earned ? palette.text : palette.textMuted),
    });
    const description = new Phaser.GameObjects.Text(scene, 78, 36, config.description, {
      fontFamily: Font.body,
      fontSize: fontPx(16, settings),
      color: hex(palette.textMuted),
      wordWrap: { width: 250 },
    });
    this.add([this.graphics, title, description]);
    this.draw();
    this.setSize(340, 78);
    if (attach) scene.add.existing(this);
  }

  playReveal(): void {
    this.earned = true;
    this.draw();
    if (motionMs(1) === 0) return;
    this.setScale(0.85);
    this.scene.tweens.add({
      targets: this,
      scale: 1,
      duration: 420,
      ease: "Back.Out",
    });
  }

  private draw(): void {
    const palette = paletteFor(gameState.get().settings);
    const graphics = this.graphics;
    graphics.clear();
    const color = this.earned ? palette.yellow : palette.textMuted;
    graphics.lineStyle(3, color, this.earned ? 1 : 0.45);
    graphics.strokeCircle(32, 36, 24);
    graphics.fillStyle(this.earned ? palette.sand : palette.navy, 1);
    graphics.fillCircle(32, 36, 20);
    graphics.lineStyle(2, palette.textOnAccent, this.earned ? 0.8 : 0.3);
    graphics.strokeCircle(32, 36, 10);
  }
}
