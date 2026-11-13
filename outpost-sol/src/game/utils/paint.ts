import Phaser from "phaser";
import type { Palette } from "../theme/theme.ts";

export function paintGlass(
  graphics: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  width: number,
  height: number,
  palette: Palette,
  radius = 22,
): void {
  graphics.fillStyle(palette.navy, 0.9);
  graphics.fillRoundedRect(x, y, width, height, radius);
  graphics.fillStyle(palette.cyan, 0.05);
  graphics.fillRoundedRect(x + 2, y + 2, width - 4, 18, { tl: radius, tr: radius, bl: 0, br: 0 });
  graphics.lineStyle(2, palette.stroke, palette.stroke === 0x7af0ff ? 0.85 : 0.45);
  graphics.strokeRoundedRect(x, y, width, height, radius);
  graphics.lineStyle(3, palette.mars, 0.9);
  graphics.beginPath();
  graphics.moveTo(x + 28, y + 1);
  graphics.lineTo(x + 120, y + 1);
  graphics.strokePath();
}

function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function paintWorldTextures(scene: Phaser.Scene): void {
  if (!scene.textures.exists("os-mars")) paintMars(scene);
  if (!scene.textures.exists("os-habitat")) paintHabitat(scene);
  if (!scene.textures.exists("os-backdrop")) paintBackdrop(scene);
}

function paintBackdrop(scene: Phaser.Scene): void {
  const texture = scene.textures.createCanvas("os-backdrop", 1280, 720);
  if (!texture) return;
  const ctx = texture.getContext();
  const sky = ctx.createLinearGradient(0, 0, 0, 720);
  sky.addColorStop(0, "#070b18");
  sky.addColorStop(0.45, "#1a1030");
  sky.addColorStop(0.72, "#4a241c");
  sky.addColorStop(1, "#2a120e");
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 1280, 720);

  const glow = ctx.createRadialGradient(980, 420, 40, 980, 420, 520);
  glow.addColorStop(0, "rgba(255, 140, 80, 0.28)");
  glow.addColorStop(1, "rgba(255, 120, 60, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, 1280, 720);

  const ground = ctx.createLinearGradient(0, 560, 0, 720);
  ground.addColorStop(0, "rgba(92, 36, 24, 0)");
  ground.addColorStop(0.35, "#8a3d28");
  ground.addColorStop(1, "#4a2016");
  ctx.fillStyle = ground;
  ctx.fillRect(0, 520, 1280, 200);
  texture.refresh();
}

function paintMars(scene: Phaser.Scene): void {
  const size = 900;
  const texture = scene.textures.createCanvas("os-mars", size, size);
  if (!texture) return;
  const ctx = texture.getContext();
  const random = rng(2026);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 8;

  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.clip();

  const body = ctx.createRadialGradient(cx - 120, cy - 140, 40, cx, cy, radius);
  body.addColorStop(0, "#ffc39a");
  body.addColorStop(0.35, "#ef7a45");
  body.addColorStop(0.72, "#c4482c");
  body.addColorStop(1, "#6e2418");
  ctx.fillStyle = body;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 26; i += 1) {
    const x = cx + (random() - 0.5) * radius * 1.6;
    const y = cy + (random() - 0.5) * radius * 1.6;
    const r = 10 + random() * 54;
    const shade = ctx.createRadialGradient(x - r * 0.2, y - r * 0.25, r * 0.1, x, y, r);
    shade.addColorStop(0, "rgba(120, 42, 28, 0.15)");
    shade.addColorStop(0.7, "rgba(90, 28, 20, 0.45)");
    shade.addColorStop(1, "rgba(70, 20, 14, 0)");
    ctx.fillStyle = shade;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "rgba(255, 214, 180, 0.18)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r * 0.92, 0.6, 2.4);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255, 196, 150, 0.18)";
  ctx.beginPath();
  ctx.ellipse(cx + 40, cy - radius * 0.72, 150, 36, -0.3, 0, Math.PI * 2);
  ctx.fill();

  const limb = ctx.createRadialGradient(cx, cy, radius * 0.55, cx, cy, radius);
  limb.addColorStop(0, "rgba(0, 0, 0, 0)");
  limb.addColorStop(1, "rgba(40, 8, 6, 0.72)");
  ctx.fillStyle = limb;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();

  ctx.strokeStyle = "rgba(255, 176, 120, 0.35)";
  ctx.lineWidth = 10;
  ctx.beginPath();
  ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
  ctx.stroke();
  texture.refresh();
}

function paintHabitat(scene: Phaser.Scene): void {
  const width = 680;
  const height = 380;
  const texture = scene.textures.createCanvas("os-habitat", width, height);
  if (!texture) return;
  const ctx = texture.getContext();
  ctx.clearRect(0, 0, width, height);

  ctx.fillStyle = "rgba(70, 24, 16, 0.45)";
  ctx.beginPath();
  ctx.ellipse(340, 318, 250, 28, 0, 0, Math.PI * 2);
  ctx.fill();

  // Solar wing
  ctx.save();
  ctx.translate(78, 168);
  ctx.rotate(-0.35);
  roundRect(ctx, 0, 0, 150, 78, 8);
  ctx.fillStyle = "#16385f";
  ctx.fill();
  ctx.strokeStyle = "#8fdfff";
  ctx.lineWidth = 2;
  for (let row = 0; row < 3; row += 1) {
    for (let col = 0; col < 4; col += 1) {
      ctx.strokeRect(10 + col * 34, 10 + row * 20, 28, 14);
    }
  }
  ctx.restore();

  // Buried berm
  const berm = ctx.createLinearGradient(0, 250, 0, 340);
  berm.addColorStop(0, "#d4845c");
  berm.addColorStop(1, "#8d3c28");
  ctx.fillStyle = berm;
  ctx.beginPath();
  ctx.moveTo(120, 300);
  ctx.quadraticCurveTo(250, 210, 430, 236);
  ctx.quadraticCurveTo(560, 250, 600, 310);
  ctx.quadraticCurveTo(420, 360, 180, 348);
  ctx.closePath();
  ctx.fill();

  // Dome
  const dome = ctx.createLinearGradient(230, 70, 430, 280);
  dome.addColorStop(0, "#ffe0c4");
  dome.addColorStop(0.45, "#f0b48a");
  dome.addColorStop(1, "#c47855");
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.moveTo(210, 268);
  ctx.quadraticCurveTo(230, 90, 390, 78);
  ctx.quadraticCurveTo(530, 90, 540, 250);
  ctx.quadraticCurveTo(380, 300, 210, 268);
  ctx.fill();
  ctx.strokeStyle = "rgba(120, 48, 32, 0.45)";
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 236, 214, 0.45)";
  ctx.lineWidth = 2;
  for (const y of [130, 175, 220]) {
    ctx.beginPath();
    ctx.moveTo(230, y + 40);
    ctx.quadraticCurveTo(370, y - 10, 510, y + 28);
    ctx.stroke();
  }

  // Airlock
  ctx.fillStyle = "#5d6e86";
  roundRect(ctx, 300, 188, 86, 92, 10);
  ctx.fill();
  ctx.fillStyle = "#9af4ff";
  ctx.globalAlpha = 0.85;
  ctx.beginPath();
  ctx.arc(343, 228, 16, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.fillStyle = "#d7e4f4";
  roundRect(ctx, 332, 214, 22, 18, 4);
  ctx.fill();

  // Windows
  ctx.fillStyle = "#16324a";
  for (const [x, y] of [
    [250, 150],
    [455, 156],
    [400, 126],
  ] as const) {
    ctx.beginPath();
    ctx.ellipse(x, y, 18, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#b9fbff";
    ctx.beginPath();
    ctx.ellipse(x - 3, y - 2, 8, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#16324a";
  }

  // Little rover
  ctx.fillStyle = "#c9d5e4";
  roundRect(ctx, 130, 252, 70, 28, 8);
  ctx.fill();
  ctx.fillStyle = "#7ee7ff";
  roundRect(ctx, 146, 242, 28, 14, 4);
  ctx.fill();
  ctx.fillStyle = "#2c2420";
  ctx.beginPath();
  ctx.arc(148, 282, 8, 0, Math.PI * 2);
  ctx.arc(184, 282, 8, 0, Math.PI * 2);
  ctx.fill();

  texture.refresh();
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}
