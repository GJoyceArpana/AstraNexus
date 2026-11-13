import { palette, cssColor } from "../theme/palette";
import { textStyle } from "../theme/typography";

export type SliderOptions = {
  label: string;
  value: number;
  width: number;
  largeText?: boolean;
  contrast?: boolean;
  onChange: (value: number) => void;
};

/** Horizontal slider. Position is the top-left of the control. */
export class UiSlider extends Phaser.GameObjects.Container {
  private readonly track: Phaser.GameObjects.Graphics;
  private readonly hit: Phaser.GameObjects.Rectangle;
  private readonly valueText: Phaser.GameObjects.Text;
  private readonly trackWidth: number;
  private readonly onChange: (value: number) => void;
  private amount: number;
  private dragging = false;

  private readonly onMove = (pointer: Phaser.Input.Pointer) => {
    if (!this.dragging) return;
    this.preview(this.valueFromPointer(pointer));
  };

  private readonly onUp = () => {
    if (!this.dragging) return;
    this.dragging = false;
    this.onChange(this.amount);
  };

  constructor(scene: Phaser.Scene, x: number, y: number, options: SliderOptions) {
    super(scene, x, y);
    this.onChange = options.onChange;
    this.amount = Phaser.Math.Clamp(options.value, 0, 1);
    this.trackWidth = options.width;

    const caption = scene.add
      .text(0, 0, options.label, textStyle("caption", palette.sand, options.largeText ?? false))
      .setOrigin(0, 0);
    this.valueText = scene.add
      .text(options.width, 0, "", textStyle("caption", palette.cyan, options.largeText ?? false))
      .setOrigin(1, 0);

    this.track = scene.add.graphics();
    this.hit = scene.add
      .rectangle(0, 46, options.width, 36, palette.white, 0.001)
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true });

    this.add([caption, this.valueText, this.track, this.hit]);
    this.draw(options.contrast ?? false);
    this.setSize(options.width, 68);

    this.hit.on("pointerdown", (pointer: Phaser.Input.Pointer) => {
      this.dragging = true;
      this.preview(this.valueFromPointer(pointer));
      this.onChange(this.amount);
    });

    scene.input.on("pointermove", this.onMove);
    scene.input.on("pointerup", this.onUp);
    scene.add.existing(this);
  }

  override destroy(fromScene?: boolean): void {
    this.scene.input.off("pointermove", this.onMove);
    this.scene.input.off("pointerup", this.onUp);
    super.destroy(fromScene);
  }

  private valueFromPointer(pointer: Phaser.Input.Pointer): number {
    const bounds = this.hit.getBounds();
    if (bounds.width <= 0) return this.amount;
    return Phaser.Math.Clamp((pointer.worldX - bounds.left) / bounds.width, 0, 1);
  }

  private preview(value: number): void {
    this.amount = value;
    this.draw(false);
  }

  private draw(contrast: boolean): void {
    const y = 46;
    const height = 12;
    this.track.clear();
    this.track.fillStyle(palette.charcoal, 1);
    this.track.fillRoundedRect(0, y - height / 2, this.trackWidth, height, 6);
    this.track.fillStyle(palette.cyan, 1);
    this.track.fillRoundedRect(0, y - height / 2, Math.max(12, this.trackWidth * this.amount), height, 6);

    const knob = this.trackWidth * this.amount;
    this.track.fillStyle(palette.white, 1);
    this.track.fillCircle(knob, y, contrast ? 12 : 11);
    this.track.lineStyle(3, palette.electric, 1);
    this.track.strokeCircle(knob, y, contrast ? 12 : 11);

    this.valueText.setText(`${Math.round(this.amount * 100)}%`);
    this.valueText.setColor(cssColor(palette.cyan));
  }
}
