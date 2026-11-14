import { palette } from "../theme/palette";
import { paintCard, panelPaint } from "./paint";

export type PanelOptions = {
  accent?: number;
  contrast?: boolean;
  padding?: number;
  fillAlpha?: number;
};

/** Centered rounded panel. Children of `content` use a top-left origin. */
export class UiPanel extends Phaser.GameObjects.Container {
  readonly content: Phaser.GameObjects.Container;
  readonly padding: number;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    width: number,
    height: number,
    options: PanelOptions = {},
  ) {
    super(scene, x, y);
    this.setSize(width, height);
    this.padding = options.padding ?? 28;

    const graphics = scene.add.graphics();
    const paint = panelPaint(options.contrast ?? false, options.accent ?? palette.cyan);
    paintCard(graphics, -width / 2, -height / 2, width, height, {
      ...paint,
      fillAlpha: options.fillAlpha ?? paint.fillAlpha,
    });

    this.content = scene.add.container(-width / 2 + this.padding, -height / 2 + this.padding);
    this.add([graphics, this.content]);
    scene.add.existing(this);
  }

  get innerWidth(): number {
    return this.width - this.padding * 2;
  }

  get innerHeight(): number {
    return this.height - this.padding * 2;
  }
}
