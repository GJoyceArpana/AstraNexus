import type { Settings } from "../types/state.ts";

export const VIEW_W = 1280;
export const VIEW_H = 720;

export const Font = {
  display: '"Orbitron", "Trebuchet MS", "Segoe UI", sans-serif',
  body: '"Nunito", "Trebuchet MS", "Segoe UI", sans-serif',
} as const;

export const Depth = {
  backdrop: 0,
  stars: 2,
  mars: 4,
  dustBack: 6,
  terrain: 8,
  habitat: 10,
  dustFront: 12,
  bleep: 14,
  ui: 20,
  bubble: 24,
  modal: 40,
  toast: 70,
} as const;

export type Palette = {
  space: number;
  navy: number;
  panel: number;
  sand: number;
  mars: number;
  terracotta: number;
  cyan: number;
  turquoise: number;
  blue: number;
  green: number;
  yellow: number;
  red: number;
  text: number;
  textMuted: number;
  textOnAccent: number;
  stroke: number;
};

const basePalette: Palette = {
  space: 0x070b16,
  navy: 0x10192c,
  panel: 0x16233a,
  sand: 0xffc48a,
  mars: 0xe06a3a,
  terracotta: 0xc4543a,
  cyan: 0x3ee0ff,
  turquoise: 0x2ad4c5,
  blue: 0x4aa3ff,
  green: 0x3ddc84,
  yellow: 0xffd15c,
  red: 0xff5d6c,
  text: 0xf6f3ee,
  textMuted: 0xc5d0e4,
  textOnAccent: 0x2a1208,
  stroke: 0x3ee0ff,
};

const contrastPalette: Palette = {
  ...basePalette,
  space: 0x03050c,
  navy: 0x070d18,
  panel: 0x0c1424,
  sand: 0xffd7a8,
  text: 0xffffff,
  textMuted: 0xe7eefb,
  cyan: 0x7af0ff,
  stroke: 0x7af0ff,
};

export function paletteFor(settings: Pick<Settings, "highContrast">): Palette {
  return settings.highContrast ? contrastPalette : basePalette;
}

export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

export function fontScale(settings: Pick<Settings, "largeText">): number {
  return settings.largeText ? 1.16 : 1;
}

export function fontPx(size: number, settings: Pick<Settings, "largeText">): string {
  return `${Math.round(size * fontScale(settings))}px`;
}

export type MeterTone = "safe" | "caution" | "critical" | "info";

export function toneColor(tone: MeterTone, palette: Palette): number {
  if (tone === "safe") return palette.green;
  if (tone === "caution") return palette.yellow;
  if (tone === "critical") return palette.red;
  return palette.cyan;
}

export function toneForPercent(value: number, dangerWhenHigh = false): MeterTone {
  const level = dangerWhenHigh ? value : 100 - value;
  if (level >= 80) return "critical";
  if (level >= 55) return "caution";
  return "safe";
}
