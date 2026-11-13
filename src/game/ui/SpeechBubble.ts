import { palette } from "../theme/palette";
import { textStyle } from "../theme/typography";
import { paintCard, panelPaint } from "./paint";

export class SpeechBubble extends Phaser.GameObjects.Container {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly label: Phaser.GameObjects.Text;
  private readonly motion: boolean;

  constructor(scene: Phaser.Scene, motion: boolean, largeText: boolean) {
    super(scene, -24, -180);
    this.motion = motion;
    this.graphics = scene.add.graphics();
    this.label = scene.add
      .text(0, -10, "", {
        ...textStyle("body", palette.white, largeText),
        wordWrap: { width: largeText ? 280 : 300 },
        align: "center",
      })
      .setOrigin(0.5);
    this.add([this.graphics, this.label]);
    this.setVisible(false);
    scene.add.existing(this);
  }

  show(message: string): void {
    this.scene.tweens.killTweensOf(this);
    this.label.setText(message);
    this.setVisible(true);

    const boxWidth = Math.max(220, this.label.width + 40);
    const boxHeight = this.label.height + 32;
    const paint = panelPaint(false, palette.cyan);

    this.graphics.clear();
    paintCard(this.graphics, -boxWidth / 2, -boxHeight / 2 - 8, boxWidth, boxHeight, {
      ...paint,
      fillAlpha: 0.96,
      radius: 18,
    });
    this.graphics.fillStyle(palette.panel, 0.96);
    this.graphics.fillTriangle(
      -12,
      boxHeight / 2 - 10,
      12,
      boxHeight / 2 - 10,
      0,
      boxHeight / 2 + 14,
    );
    this.graphics.lineStyle(2, palette.cyan, 0.8);
    this.graphics.strokeTriangle(
      -12,
      boxHeight / 2 - 10,
      12,
      boxHeight / 2 - 10,
      0,
      boxHeight / 2 + 14,
    );

    this.y = -118 - boxHeight / 2;
    this.label.setY(-10);

    if (!this.motion) {
      this.setAlpha(1);
      return;
    }

    this.setAlpha(0);
    this.scene.tweens.add({
      targets: this,
      alpha: 1,
      duration: 280,
      ease: "Sine.Out",
    });
  }
}
