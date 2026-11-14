import Phaser from "phaser";
import { gameState } from "../systems/GameState.ts";
import { motionMs, playBlip } from "../systems/AudioBus.ts";
import { Depth, Font, VIEW_H, VIEW_W, fontPx, hex, paletteFor } from "../theme/theme.ts";
import { paintGlass } from "../utils/paint.ts";
import { UiButton } from "./Button.ts";

export type ModalConfig = {
  title: string;
  width?: number;
  height?: number;
  closeLabel?: string;
  onClose?: () => void;
};

export class Modal {
  readonly body: Phaser.GameObjects.Container;
  private readonly root: Phaser.GameObjects.Container;
  private readonly onClose?: () => void;
  private closed = false;

  constructor(scene: Phaser.Scene, config: ModalConfig) {
    const settings = gameState.get().settings;
    const palette = paletteFor(settings);
    const width = config.width ?? 760;
    const height = config.height ?? 560;
    this.onClose = config.onClose;
    this.root = scene.add.container(0, 0).setDepth(Depth.modal);

    const blocker = new Phaser.GameObjects.Rectangle(scene, VIEW_W / 2, VIEW_H / 2, VIEW_W, VIEW_H, 0x04060e, 0.66);
    blocker.setInteractive();
    blocker.on("pointerdown", () => {
      playBlip("open");
      this.close();
    });

    const panel = new Phaser.GameObjects.Container(scene, VIEW_W / 2, VIEW_H / 2);
    const graphics = new Phaser.GameObjects.Graphics(scene);
    paintGlass(graphics, -width / 2, -height / 2, width, height, palette, 24);
    const shield = new Phaser.GameObjects.Rectangle(scene, 0, 0, width, height, 0x000000, 0);
    shield.setInteractive();
    const title = new Phaser.GameObjects.Text(scene, -width / 2 + 28, -height / 2 + 22, config.title, {
      fontFamily: Font.display,
      fontSize: fontPx(26, settings),
      color: hex(palette.text),
    });
    const close = new UiButton(
      scene,
      width / 2 - 78,
      -height / 2 + 40,
      {
        label: "X",
        width: 56,
        height: 44,
        variant: "ghost",
        onClick: () => this.close(),
      },
      false,
    );
    this.body = new Phaser.GameObjects.Container(scene, -width / 2 + 28, -height / 2 + 84);
    const footer = new UiButton(
      scene,
      0,
      height / 2 - 46,
      {
        label: config.closeLabel ?? "DONE",
        width: Math.min(280, width - 80),
        height: 52,
        variant: "primary",
        onClick: () => this.close(),
      },
      false,
    );

    panel.add([graphics, shield, title, close, this.body, footer]);
    this.root.add([blocker, panel]);
    this.root.setAlpha(0);
    this.root.setScale(motionMs(1) === 0 ? 1 : 0.98);
    scene.tweens.add({
      targets: this.root,
      alpha: 1,
      scale: 1,
      duration: motionMs(180),
      ease: "Quad.Out",
    });
    playBlip("open");
  }

  close(): void {
    if (this.closed) return;
    this.closed = true;
    const finish = () => {
      this.root.destroy(true);
      this.onClose?.();
    };
    const duration = motionMs(140);
    if (duration === 0) {
      finish();
      return;
    }
    this.root.scene.tweens.add({
      targets: this.root,
      alpha: 0,
      duration,
      onComplete: finish,
    });
  }
}
