import Phaser from "phaser";
import { announce, motionMs } from "../systems/AudioBus.ts";
import { Depth, Font, VIEW_W, fontPx, hex, paletteFor, toneColor, type MeterTone } from "../theme/theme.ts";
import { gameState } from "../systems/GameState.ts";

export type NotificationConfig = {
  message: string;
  tone?: MeterTone;
};

export class NotificationBanner extends Phaser.GameObjects.Container {
  private static current?: NotificationBanner;

  static show(scene: Phaser.Scene, config: NotificationConfig): NotificationBanner {
    if (NotificationBanner.current?.active) NotificationBanner.current.close();
    const banner = new NotificationBanner(scene, config);
    NotificationBanner.current = banner;
    return banner;
  }

  private constructor(scene: Phaser.Scene, config: NotificationConfig) {
    super(scene, VIEW_W / 2, 36);
    const settings = gameState.get().settings;
    const palette = paletteFor(settings);
    const tone = config.tone ?? "info";
    const color = toneColor(tone, palette);
    const width = 640;
    const graphics = new Phaser.GameObjects.Graphics(scene);
    graphics.fillStyle(palette.navy, 0.95);
    graphics.fillRoundedRect(-width / 2, -28, width, 56, 16);
    graphics.lineStyle(2, color, 0.95);
    graphics.strokeRoundedRect(-width / 2, -28, width, 56, 16);
    graphics.fillStyle(color, 1);
    graphics.fillRoundedRect(-width / 2, -28, 8, 56, { tl: 16, bl: 16, tr: 0, br: 0 });
    const text = new Phaser.GameObjects.Text(scene, 0, 0, config.message, {
      fontFamily: Font.body,
      fontSize: fontPx(20, settings),
      color: hex(palette.text),
      align: "center",
      wordWrap: { width: width - 48 },
    });
    text.setOrigin(0.5);
    this.add([graphics, text]);
    this.setDepth(Depth.toast);
    scene.add.existing(this);
    announce(config.message);
    if (motionMs(1) === 0) this.setY(48);
    else {
      this.setY(-20);
      this.setAlpha(0);
      scene.tweens.add({ targets: this, y: 48, alpha: 1, duration: 220, ease: "Back.Out" });
    }
    scene.time.delayedCall(motionMs(1) === 0 ? 2200 : 3200, () => this.close());
  }

  close(): void {
    if (!this.active) return;
    this.destroy(true);
    if (NotificationBanner.current === this) NotificationBanner.current = undefined;
  }
}
