import Phaser from "phaser";
import { gameState } from "../systems/GameState.ts";
import { Font, fontPx, hex, paletteFor } from "../theme/theme.ts";
import { paintGlass } from "../utils/paint.ts";

export type PanelConfig = {
  width: number;
  height: number;
  title?: string;
};

export class Panel extends Phaser.GameObjects.Container {
  readonly body: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene, x: number, y: number, config: PanelConfig, attach = true) {
    super(scene, x, y);
    const palette = paletteFor(gameState.get().settings);
    const graphics = new Phaser.GameObjects.Graphics(scene);
    paintGlass(graphics, -config.width / 2, -config.height / 2, config.width, config.height, palette, 22);
    this.add(graphics);
    const titleHeight = config.title ? 42 : 0;
    if (config.title) {
      const title = new Phaser.GameObjects.Text(scene, -config.width / 2 + 22, -config.height / 2 + 16, config.title, {
        fontFamily: Font.display,
        fontSize: fontPx(16, gameState.get().settings),
        color: hex(palette.cyan),
      });
      this.add(title);
    }
    this.body = new Phaser.GameObjects.Container(scene, -config.width / 2 + 22, -config.height / 2 + 20 + titleHeight);
    this.add(this.body);
    this.setSize(config.width, config.height);
    if (attach) scene.add.existing(this);
  }
}
