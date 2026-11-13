import { palette } from "../theme/palette";

export type PanelPaint = {
  fill: number;
  fillAlpha: number;
  stroke: number;
  strokeAlpha: number;
  glow: number;
  radius: number;
  lineWidth: number;
};

export function panelPaint(contrast: boolean, accent = palette.cyan): PanelPaint {
  return {
    fill: palette.panel,
    fillAlpha: contrast ? 0.98 : 0.9,
    stroke: accent,
    strokeAlpha: contrast ? 1 : 0.72,
    glow: accent,
    radius: 22,
    lineWidth: contrast ? 3 : 2,
  };
}

/** Draws a rounded holographic card. Coordinates are the top-left of the card. */
export function paintCard(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  style: PanelPaint,
): void {
  graphics.fillStyle(style.glow, style.strokeAlpha * 0.16);
  graphics.fillRoundedRect(x - 7, y - 7, width + 14, height + 14, style.radius + 6);

  graphics.fillStyle(style.fill, style.fillAlpha);
  graphics.fillRoundedRect(x, y, width, height, style.radius);

  graphics.lineStyle(style.lineWidth, style.stroke, style.strokeAlpha);
  graphics.strokeRoundedRect(
    x + style.lineWidth / 2,
    y + style.lineWidth / 2,
    width - style.lineWidth,
    height - style.lineWidth,
    style.radius,
  );

  graphics.lineStyle(2, palette.white, 0.14);
  graphics.beginPath();
  graphics.moveTo(x + style.radius, y + 8);
  graphics.lineTo(x + width - style.radius, y + 8);
  graphics.strokePath();
}
