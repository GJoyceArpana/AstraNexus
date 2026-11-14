import { palette, cssColor } from "../theme/palette";
import { textStyle } from "../theme/typography";

export type ToggleOptions = {
  label: string;
  value: boolean;
  width: number;
  largeText?: boolean;
  contrast?: boolean;
  onChange: (value: boolean) => void;
};

/** A labelled on/off switch. Position is the top-left of the row. */
export class UiToggle extends Phaser.GameObjects.Container {
  private readonly track: Phaser.GameObjects.Graphics;
  private readonly stateText: Phaser.GameObjects.Text;
  private enabledValue: boolean;
  private readonly rowWidth: number;
  private readonly contrast: boolean;

  constructor(scene: Phaser.Scene, x: number, y: number, options: ToggleOptions) {
    super(scene, x, y);
    this.enabledValue = options.value;
    this.rowWidth = options.width;
    this.contrast = options.contrast ?? false;

    const label = scene.add
      .text(0, 22, options.label, textStyle("body", palette.white, options.largeText ?? false))
      .setOrigin(0, 0.5);
    this.stateText = scene.add
      .text(options.width - 78, 22, "", textStyle("caption", palette.ink, options.largeText ?? false))
      .setOrigin(0.5);
    this.track = scene.add.graphics();

    const hit = scene.add
      .rectangle(options.width / 2, 22, options.width, 52, palette.white, 0.001)
      .setInteractive({ useHandCursor: true });

    hit.on("pointerdown", () => {
      this.enabledValue = !this.enabledValue;
      this.draw();
      options.onChange(this.enabledValue);
    });

    this.add([hit, label, this.track, this.stateText]);
    this.setSize(options.width, 52);
    this.draw();
    scene.add.existing(this);
  }

  private draw(): void {
    const x = this.rowWidth - 58;
    const y = 6;
    this.track.clear();
    this.track.fillStyle(this.enabledValue ? palette.turquoise : palette.charcoal, 1);
    this.track.fillRoundedRect(x, y, 58, 32, 16);
    this.track.lineStyle(this.contrast ? 3 : 2, this.enabledValue ? palette.safe : palette.muted, 1);
    this.track.strokeRoundedRect(x, y, 58, 32, 16);
    this.track.fillStyle(palette.white, 1);
    this.track.fillCircle(this.enabledValue ? x + 42 : x + 16, y + 16, 10);
    this.stateText.setText(this.enabledValue ? "ON" : "OFF");
    this.stateText.setColor(cssColor(this.enabledValue ? palette.safe : palette.muted));
    this.stateText.setPosition(x + 29, 22);
  }
}
