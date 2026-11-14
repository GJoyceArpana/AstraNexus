import Phaser from "phaser";
import { gameState } from "../systems/GameState.ts";
import { playBlip } from "../systems/AudioBus.ts";
import { Font, fontPx, hex, paletteFor } from "../theme/theme.ts";

export type PlugState = "available" | "selected" | "connected";

export type PowerPlugConfig = {
  index: number;
  state: PlugState;
  onPress: () => void;
};

export class PowerPlug extends Phaser.GameObjects.Container {
  private readonly graphics: Phaser.GameObjects.Graphics;
  private state: PlugState;

  constructor(scene: Phaser.Scene, x: number, y: number, config: PowerPlugConfig, attach = true) {
    super(scene, x, y);
    this.state = config.state;
    this.graphics = new Phaser.GameObjects.Graphics(scene);
    const settings = gameState.get().settings;
    const palette = paletteFor(settings);
    const caption = new Phaser.GameObjects.Text(scene, 28, 58, `PLUG ${config.index}`, {
      fontFamily: Font.display,
      fontSize: fontPx(12, settings),
      color: hex(palette.textMuted),
    });
    caption.setOrigin(0.5, 0);
    this.add([this.graphics, caption]);
    this.setSize(56, 84);
    this.draw();
    this.setInteractive({
      hitArea: new Phaser.Geom.Rectangle(0, 0, 56, 78),
      hitAreaCallback: Phaser.Geom.Rectangle.Contains,
      useHandCursor: true,
    });
    this.on("pointerup", () => {
      playBlip("click");
      config.onPress();
    });
    if (attach) scene.add.existing(this);
  }

  setPlugState(state: PlugState): void {
    this.state = state;
    this.draw();
  }

  private draw(): void {
    const palette = paletteFor(gameState.get().settings);
    const color = this.state === "connected" ? palette.green : this.state === "selected" ? palette.yellow : palette.cyan;
    const graphics = this.graphics;
    graphics.clear();
    graphics.fillStyle(palette.navy, 1);
    graphics.fillRoundedRect(8, 0, 40, 52, 10);
    graphics.lineStyle(3, color, this.state === "available" ? 0.7 : 1);
    graphics.strokeRoundedRect(8, 0, 40, 52, 10);
    graphics.lineStyle(4, color, 1);
    graphics.lineBetween(20, 52, 20, 68);
    graphics.lineBetween(36, 52, 36, 68);
    if (this.state === "connected") {
      graphics.fillStyle(color, 1);
      graphics.fillCircle(28, 26, 6);
    }
  }
}
