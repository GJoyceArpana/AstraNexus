import { STAGE } from "../theme/stage";
import { palette } from "../theme/palette";
import { textStyle } from "../theme/typography";
import { paintCard, panelPaint } from "./paint";

const TOAST_NAME = "outpost-toast";

export class UiNotification extends Phaser.GameObjects.Container {
  static show(scene: Phaser.Scene, message: string, motion: boolean): void {
    scene.children.getByName(TOAST_NAME)?.destroy();
    const toast = new UiNotification(scene, message, motion);
    toast.setName(TOAST_NAME);
  }

  constructor(scene: Phaser.Scene, message: string, motion: boolean) {
    super(scene, STAGE.width - 28, 28);
    this.setDepth(420);

    const label = scene.add
      .text(-20, 28, message, {
        ...textStyle("caption", palette.white, false),
        wordWrap: { width: 360 },
        align: "right",
      })
      .setOrigin(1, 0);

    const boxWidth = 400;
    const boxHeight = Math.max(72, label.height + 28);
    const graphics = scene.add.graphics();
    paintCard(graphics, -boxWidth, 0, boxWidth, boxHeight, {
      ...panelPaint(true, palette.cyan),
      fillAlpha: 0.96,
      radius: 16,
    });

    label.setY(boxHeight / 2 - label.height / 2);
    this.add([graphics, label]);
    scene.add.existing(this);

    const remove = () => {
      if (!this.active) return;
      this.destroy();
    };

    if (!motion) {
      scene.time.delayedCall(2400, remove);
      return;
    }

    this.setAlpha(0);
    this.y -= 12;
    scene.tweens.add({
      targets: this,
      alpha: 1,
      y: 28,
      duration: 220,
      ease: "Sine.Out",
    });
    scene.time.delayedCall(2600, () => {
      if (!this.active) return;
      scene.tweens.add({
        targets: this,
        alpha: 0,
        duration: 220,
        onComplete: remove,
      });
    });
  }
}
