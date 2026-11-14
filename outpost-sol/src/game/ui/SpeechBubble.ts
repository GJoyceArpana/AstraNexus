import Phaser from "phaser";
import { gameState } from "../systems/GameState.ts";
import { motionMs } from "../systems/AudioBus.ts";
import { Font, fontPx, hex, paletteFor } from "../theme/theme.ts";

export type SpeechBubbleConfig = {
  name?: string;
  text: string;
  width?: number;
  tail?: "left" | "right" | "none";
};

export class SpeechBubble extends Phaser.GameObjects.Container {
  private readonly background: Phaser.GameObjects.Graphics;
  private readonly nameLabel: Phaser.GameObjects.Text;
  private readonly body: Phaser.GameObjects.Text;
  private readonly widthPx: number;
  private readonly tail: "left" | "right" | "none";
  private fullText = "";
  private timer?: Phaser.Time.TimerEvent;

  constructor(scene: Phaser.Scene, x: number, y: number, config: SpeechBubbleConfig, attach = true) {
    super(scene, x, y);
    const settings = gameState.get().settings;
    const palette = paletteFor(settings);
    this.widthPx = config.width ?? 340;
    this.tail = config.tail ?? "right";
    this.background = new Phaser.GameObjects.Graphics(scene);
    this.nameLabel = new Phaser.GameObjects.Text(scene, 16, 12, config.name ?? "BLEEP", {
      fontFamily: Font.display,
      fontSize: fontPx(14, settings),
      color: hex(palette.cyan),
    });
    this.body = new Phaser.GameObjects.Text(scene, 16, 36, "", {
      fontFamily: Font.body,
      fontSize: fontPx(20, settings),
      color: hex(palette.text),
      wordWrap: { width: this.widthPx - 32 },
      lineSpacing: 4,
    });
    this.add([this.background, this.nameLabel, this.body]);
    this.setText(config.text, true);
    if (attach) scene.add.existing(this);
  }

  setText(text: string, typewriter = false): void {
    this.fullText = text;
    this.timer?.remove(false);
    this.timer = undefined;
    const instant = !typewriter || motionMs(1) === 0;
    if (instant) {
      this.body.setText(text);
      this.redraw();
      return;
    }
    this.body.setText("");
    this.redraw();
    let index = 0;
    this.timer = this.scene.time.addEvent({
      delay: 18,
      repeat: text.length - 1,
      callback: () => {
        index += 1;
        this.body.setText(text.slice(0, index));
        this.redraw();
      },
    });
  }

  private redraw(): void {
    const palette = paletteFor(gameState.get().settings);
    const height = Math.max(88, this.body.y + this.body.height + 16);
    const graphics = this.background;
    graphics.clear();
    graphics.fillStyle(palette.navy, 0.94);
    graphics.fillRoundedRect(0, 0, this.widthPx, height, 18);
    graphics.lineStyle(2, palette.cyan, 0.7);
    graphics.strokeRoundedRect(0, 0, this.widthPx, height, 18);
    graphics.fillStyle(palette.navy, 0.94);
    if (this.tail === "right") {
      graphics.fillTriangle(this.widthPx - 28, height - 8, this.widthPx - 4, height - 6, this.widthPx + 16, height + 18);
      graphics.lineStyle(2, palette.cyan, 0.7);
      graphics.strokeTriangle(this.widthPx - 28, height - 8, this.widthPx - 4, height - 6, this.widthPx + 16, height + 18);
    } else if (this.tail === "left") {
      graphics.fillTriangle(28, height - 8, 4, height - 6, -16, height + 18);
    }
    this.setSize(this.widthPx, height);
  }
}
