import { cssColor } from "./palette";

export const fontFamily = {
  display: '"Orbitron", "Trebuchet MS", sans-serif',
  body: '"Nunito", "Trebuchet MS", sans-serif',
} as const;

export type TextRole = "display" | "title" | "subtitle" | "body" | "button" | "caption";

const sizePx: Record<TextRole, { base: number; large: number }> = {
  display: { base: 52, large: 52 },
  title: { base: 32, large: 36 },
  subtitle: { base: 22, large: 26 },
  body: { base: 20, large: 24 },
  button: { base: 22, large: 26 },
  caption: { base: 15, large: 18 },
};

export function textStyle(
  role: TextRole,
  color: number,
  large = false,
): Phaser.Types.GameObjects.Text.TextStyle {
  const size = large ? sizePx[role].large : sizePx[role].base;
  const display = role === "display" || role === "title" || role === "subtitle";

  return {
    fontFamily: display || role === "caption" ? fontFamily.display : fontFamily.body,
    fontSize: `${size}px`,
    fontStyle: "700",
    color: cssColor(color),
    align: "center",
    resolution: 2,
  };
}
