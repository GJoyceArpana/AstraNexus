/** Mission-control palette for Outpost Sol. Values are hex numbers for Phaser. */

export const palette = {
  space: 0x070d18,
  navy: 0x0b1426,
  navyRaised: 0x16304a,
  charcoal: 0x1c2636,
  panel: 0x10192c,
  orange: 0xe36b3a,
  orangeHot: 0xff8d4e,
  terracotta: 0xc4543a,
  deepRed: 0x8c2f39,
  ridge: 0x8a4038,
  ground: 0xc2613f,
  sand: 0xf0d7b0,
  cyan: 0x3ee0f0,
  turquoise: 0x2ec8c0,
  electric: 0x4da3ff,
  safe: 0x3ddc97,
  warn: 0xf5c451,
  critical: 0xff5a6a,
  white: 0xf7f4ef,
  muted: 0xc5d0e0,
  ink: 0x1a120e,
} as const;

export type PaletteName = keyof typeof palette;

export function cssColor(color: number): string {
  return `#${color.toString(16).padStart(6, "0")}`;
}

export function statusColor(level: "safe" | "warn" | "critical"): number {
  if (level === "safe") return palette.safe;
  if (level === "warn") return palette.warn;
  return palette.critical;
}
