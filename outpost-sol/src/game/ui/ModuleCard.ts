import Phaser from "phaser";
import { gameState } from "../systems/GameState.ts";
import { playBlip } from "../systems/AudioBus.ts";
import { Font, fontPx, hex, paletteFor } from "../theme/theme.ts";

export type ModuleCardConfig = {
  title: string;
  description: string;
  powerDraw: string;
  active: boolean;
  selected?: boolean;
  width?: number;
  onSelect?: () => void;
};

export class ModuleCard extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, config: ModuleCardConfig, attach = true) {
    super(scene, x, y);
    const settings = gameState.get().settings;
    const palette = paletteFor(settings);
    const width = config.width ?? 280;
    const height = 118;
    const accent = config.active ? palette.green : config.selected ? palette.yellow : palette.cyan;
    const graphics = new Phaser.GameObjects.Graphics(scene);
    graphics.fillStyle(palette.panel, 0.96);
    graphics.fillRoundedRect(0, 0, width, height, 16);
    graphics.lineStyle(2, accent, config.selected || config.active ? 1 : 0.4);
    graphics.strokeRoundedRect(0, 0, width, height, 16);
    graphics.fillStyle(accent, 1);
    graphics.fillCircle(22, 24, 7);
    const title = new Phaser.GameObjects.Text(scene, 38, 12, config.title, {
      fontFamily: Font.display,
      fontSize: fontPx(14, settings),
      color: hex(palette.text),
      wordWrap: { width: width - 52 },
    });
    const description = new Phaser.GameObjects.Text(scene, 16, 44, config.description, {
      fontFamily: Font.body,
      fontSize: fontPx(15, settings),
      color: hex(palette.textMuted),
      wordWrap: { width: width - 32 },
    });
    const draw = new Phaser.GameObjects.Text(scene, 16, 88, config.powerDraw, {
      fontFamily: Font.display,
      fontSize: fontPx(12, settings),
      color: hex(accent),
    });
    this.add([graphics, title, description, draw]);
    this.setSize(width, height);
    if (config.onSelect) {
      this.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(0, 0, width, height),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });
      this.on("pointerup", () => {
        playBlip("click");
        config.onSelect?.();
      });
    }
    if (attach) scene.add.existing(this);
  }
}
