import Phaser from "phaser";
import { gameState } from "../systems/GameState.ts";
import { playBlip } from "../systems/AudioBus.ts";
import { Font, fontPx, hex, paletteFor } from "../theme/theme.ts";

export type MissionCardStatus = "preview" | "locked" | "current" | "complete";

export type MissionCardConfig = {
  sol: number;
  title: string;
  summary: string;
  status: MissionCardStatus;
  width?: number;
  onSelect?: () => void;
};

export class MissionCard extends Phaser.GameObjects.Container {
  constructor(scene: Phaser.Scene, x: number, y: number, config: MissionCardConfig, attach = true) {
    super(scene, x, y);
    const settings = gameState.get().settings;
    const palette = paletteFor(settings);
    const width = config.width ?? 680;
    const height = 62;
    const statusColor =
      config.status === "complete" ? palette.green : config.status === "current" ? palette.yellow : config.status === "locked" ? palette.textMuted : palette.cyan;
    const graphics = new Phaser.GameObjects.Graphics(scene);
    graphics.fillStyle(config.status === "locked" ? 0x10182a : palette.panel, 0.96);
    graphics.fillRoundedRect(0, 0, width, height, 14);
    graphics.lineStyle(2, statusColor, config.status === "locked" ? 0.35 : 0.8);
    graphics.strokeRoundedRect(0, 0, width, height, 14);
    graphics.fillStyle(statusColor, 1);
    graphics.fillCircle(30, height / 2, 16);
    const sol = new Phaser.GameObjects.Text(scene, 30, height / 2, String(config.sol), {
      fontFamily: Font.display,
      fontSize: fontPx(14, settings),
      color: hex(palette.textOnAccent),
    });
    sol.setOrigin(0.5);
    const title = new Phaser.GameObjects.Text(scene, 56, 8, `SOL ${config.sol}  ·  ${config.title}`, {
      fontFamily: Font.display,
      fontSize: fontPx(14, settings),
      color: hex(palette.text),
    });
    const summary = new Phaser.GameObjects.Text(scene, 56, 32, config.summary, {
      fontFamily: Font.body,
      fontSize: fontPx(15, settings),
      color: hex(palette.textMuted),
      wordWrap: { width: width - 170 },
    });
    const pill = new Phaser.GameObjects.Text(scene, width - 16, height / 2, config.status.toUpperCase(), {
      fontFamily: Font.display,
      fontSize: fontPx(11, settings),
      color: hex(statusColor),
    });
    pill.setOrigin(1, 0.5);
    this.add([graphics, sol, title, summary, pill]);
    this.setSize(width, height);
    if (config.onSelect && config.status !== "locked") {
      this.setInteractive({
        hitArea: new Phaser.Geom.Rectangle(0, 0, width, height),
        hitAreaCallback: Phaser.Geom.Rectangle.Contains,
        useHandCursor: true,
      });
      this.on("pointerup", () => {
        playBlip("click");
        config.onSelect?.();
      });
      this.on("pointerover", () => this.setScale(1.015));
      this.on("pointerout", () => this.setScale(1));
    }
    if (attach) scene.add.existing(this);
  }
}
