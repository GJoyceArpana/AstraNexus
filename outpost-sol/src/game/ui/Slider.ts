import Phaser from "phaser";
import { gameState } from "../systems/GameState.ts";
import { Font, fontPx, hex, paletteFor } from "../theme/theme.ts";

export type SliderConfig = {
  label: string;
  value: number;
  width?: number;
  onChange: (value: number) => void;
};

export class Slider extends Phaser.GameObjects.Container {
  private readonly trackX = 0;
  private readonly trackWidth: number;
  private readonly handle: Phaser.GameObjects.Arc;
  private readonly readout: Phaser.GameObjects.Text;
  private readonly graphics: Phaser.GameObjects.Graphics;
  private dragging = false;
  private value: number;

  constructor(scene: Phaser.Scene, x: number, y: number, config: SliderConfig, attach = true) {
    super(scene, x, y);
    this.value = Phaser.Math.Clamp(config.value, 0, 1);
    this.trackWidth = config.width ?? 460;
    const settings = gameState.get().settings;
    const palette = paletteFor(settings);
    const label = new Phaser.GameObjects.Text(scene, 0, 0, config.label, {
      fontFamily: Font.body,
      fontSize: fontPx(20, settings),
      color: hex(palette.text),
    });
    this.readout = new Phaser.GameObjects.Text(scene, this.trackWidth, 0, "", {
      fontFamily: Font.display,
      fontSize: fontPx(16, settings),
      color: hex(palette.cyan),
    });
    this.readout.setOrigin(1, 0);
    this.graphics = new Phaser.GameObjects.Graphics(scene);
    this.handle = new Phaser.GameObjects.Arc(scene, 0, 52, 12, 0, 360, false, palette.sand);
    this.handle.setInteractive({ useHandCursor: true, draggable: true });
    this.add([label, this.readout, this.graphics, this.handle]);
    this.setSize(this.trackWidth, 72);
    this.redraw();

    const apply = (pointer: Phaser.Input.Pointer) => {
      const localX = pointer.x - this.getWorldTransformMatrix().tx - this.trackX;
      this.value = Phaser.Math.Clamp(localX / this.trackWidth, 0, 1);
      this.redraw();
      config.onChange(this.value);
    };
    const zone = new Phaser.GameObjects.Rectangle(scene, this.trackWidth / 2, 52, this.trackWidth, 36, 0x000000, 0);
    zone.setInteractive({ useHandCursor: true });
    zone.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.dragging = true;
      apply(pointer);
    });
    this.add(zone);

    const move = (pointer: Phaser.Input.Pointer) => {
      if (!this.dragging) return;
      apply(pointer);
    };
    const up = () => {
      this.dragging = false;
    };
    scene.input.on("pointermove", move);
    scene.input.on("pointerup", up);
    this.once("destroy", () => {
      scene.input.off("pointermove", move);
      scene.input.off("pointerup", up);
    });
    if (attach) scene.add.existing(this);
  }

  private redraw(): void {
    const palette = paletteFor(gameState.get().settings);
    const graphics = this.graphics;
    graphics.clear();
    graphics.fillStyle(0x07101d, 1);
    graphics.fillRoundedRect(0, 46, this.trackWidth, 12, 6);
    graphics.fillStyle(palette.cyan, 1);
    graphics.fillRoundedRect(0, 46, Math.max(12, this.trackWidth * this.value), 12, 6);
    this.handle.setPosition(this.trackWidth * this.value, 52);
    this.readout.setText(`${Math.round(this.value * 100)}%`);
  }
}
