import type { AgeMode } from "../types/state.ts";

/** Game-only tuning. These are not NASA measurements. */
export const SIMULATED_LABEL = "Simulated";

export const balance = {
  copy: {
    simulated: SIMULATED_LABEL,
    modifierDisclaimer: "Gameplay modifiers for this simulation. Not verified NASA measurements.",
  },
  pressure: {
    /** Experiment gauge fills until this value, then the tent pops. */
    popThreshold: 110,
    safeCeiling: 100,
    start: 24,
    pumpStep: 8,
  },
  power: {
    plugs: {
      "junior-cadet": 3,
      "flight-director": 4,
    } satisfies Record<AgeMode, number>,
    availableKWe: {
      "junior-cadet": 8,
      "flight-director": 10,
    } satisfies Record<AgeMode, number>,
  },
  storm: {
    solarGenerationMultiplier: 0.35,
  },
  stress: {
    oxygenWarningPercent: 35,
  },
  resources: {
    oxygen: { cautionBelow: 40, criticalBelow: 20 },
    water: { cautionBelow: 40, criticalBelow: 20 },
    food: { cautionBelow: 40, criticalBelow: 20 },
    battery: { cautionBelow: 30, criticalBelow: 15 },
    hullIntegrity: { cautionBelow: 50, criticalBelow: 30 },
    radiationExposure: { cautionAbove: 55, criticalAbove: 80 },
    perchlorateExposure: { cautionAbove: 45, criticalAbove: 75 },
    habitatPressure: { cautionAbove: 90, criticalAbove: 104 },
  },
} as const;

export function plugCount(mode: AgeMode | null): number {
  if (mode === "flight-director") return balance.power.plugs["flight-director"];
  return balance.power.plugs["junior-cadet"];
}
