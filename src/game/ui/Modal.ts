import { STAGE } from "../theme/stage";
import { palette } from "../theme/palette";
import { textStyle } from "../theme/typography";
import { UiButton } from "./Button";
import { paintCard, panelPaint } from "./paint";

export type ModalOptions = {
  title: string;
  width: number;
  height: number;
  largeText?: boolean;
  contrast?: boolean;
  motion?: boolean;
  closeLabel?: string;
  onClose: () => void;
};

/** Full-screen overlay with a centered card and a close button. */
export class UiModal extends Phaser.GameObjects.Container {
  readonly body: Phaser.GameObjects.Container;
  readonly bodyWidth: number;

  constructor(scene: Phaser.Scene, options: ModalOptions) {
    super(scene, 0, 0);
    this.setDepth(300);

    const blocker = scene.add
      .rectangle(STAGE.width / 2, STAGE.height / 2, STAGE.width, STAGE.height, palette.space, 0.72)
      .setInteractive();

    const card = scene.add.graphics();
    const paint = panelPaint(options.contrast ?? false, palette.orange);
    paintCard(card, STAGE.width / 2 - options.width / 2, STAGE.height / 2 - options.height / 2, options.width, options.height, {
      ...paint,
      fillAlpha: 0.97,
      radius: 26,
    });

    const title = scene.add
      .text(
        STAGE.width / 2,
        STAGE.height / 2 - options.height / 2 + 36,
        options.title,
        textStyle("title", palette.sand, options.largeText ?? false),
      )
      .setOrigin(0.5, 0);

    const pad = 36;
    const footer = 84;
    const bodyTop = STAGE.height / 2 - options.height / 2 + 92;
    this.bodyWidth = options.width - pad * 2;
    this.body = scene.add.container(STAGE.width / 2 - options.width / 2 + pad, bodyTop);

    const close = new UiButton(
      scene,
      STAGE.width / 2,
      STAGE.height / 2 + options.height / 2 - 48,
      {
        label: options.closeLabel ?? "CLOSE",
        width: Math.min(280, options.width - 80),
        height: 60,
        variant: "primary",
        largeText: options.largeText,
        contrast: options.contrast,
        motion: options.motion,
        onClick: options.onClose,
      },
    );

    this.add([blocker, card, title, this.body, close]);
    scene.add.existing(this);
  }
}
