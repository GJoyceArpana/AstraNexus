import Phaser from "phaser";
import { gameState } from "../systems/GameState.ts";
import { playBlip } from "../systems/AudioBus.ts";
import { Font, fontPx, hex, paletteFor } from "../theme/theme.ts";

export type ToggleConfig = {
  label: string;
  value: boolean;
  width?: number;
  onChange: (value: boolean) => void;
};

export class Toggle extends Phaser.GameObjects.Container {
  private value: boolean;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private readonly widthPx: number;

  constructor(scene: Phaser.Scene, x: number, y: number, config: ToggleConfig, attach = true) {
    super(scene, x, y);
    this.value = config.value;
    this.widthPx = config.width ?? 460;
    const settings = gameState.get().settings;
    const palette = paletteFor(settings);
    const label = new Phaser.GameObjects.Text(scene, 0, 14, config.label, {
      fontFamily: Font.body,
      fontSize: fontPx(20, settings),
      color: hex(palette.text),
    });
    this.graphics = new Phaser.GameObjects.Graphics(scene);
    this.add([label, this.graphics]);
    this.setSize(this.widthPx, 52);
    this.draw();
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, this.widthPx, 52),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.on("pointerup", () => {
      this.value = !this.value;
      this.draw();
      playBlip("click");
      config.onChange(this.value);
    });
    if (attach) scene.add.existing(this);
  }

  private draw(): void {
    const palette = paletteFor(gameState.get().settings);
    const graphics = this.graphics;
    graphics.clear();
    const x = this.widthPx - 72;
    graphics.fillStyle(this.value ? palette.turquoise : 0x243044, 1);
    graphics.fillRoundedRect(x, 10, 64, 32, 16);
    graphics.fillStyle(palette.text, 1);
    graphics.fillCircle(this.value ? x + 46 : x + 18, 26, 11);
  }
}
