import type { AgeMode, EquipmentId, HullId, LandingSiteId } from "../types/state.ts";

export type GameModifier = {
  id: string;
  label: string;
  /** Fractional change. 0.25 means +25%. Negative values are penalties. */
  amount: number;
};

export type AgeModeProfile = {
  id: AgeMode;
  title: string;
  ages: string;
  description: string;
  features: string[];
};

export const ageModes: readonly AgeModeProfile[] = [
  {
    id: "junior-cadet",
    title: "JUNIOR CADET",
    ages: "Ages 7–9",
    description: "Learn how to survive on Mars through simple experiments, colourful gauges and guided instructions.",
    features: [
      "Voice-friendly instructions",
      "Large icons",
      "Simplified resource indicators",
      "Three power plugs",
      "Guided hints",
      "Friendly explanations",
    ],
  },
  {
    id: "flight-director",
    title: "FLIGHT DIRECTOR",
    ages: "Ages 10–12",
    description: "Take control of a Mars outpost using engineering decisions and mission telemetry.",
    features: [
      "Detailed telemetry",
      "Scientific units",
      "Four power plugs",
      "Engineering challenges",
      "Resource efficiency scoring",
      "More detailed explanations",
    ],
  },
];

export type LandingSiteProfile = {
  id: LandingSiteId;
  name: string;
  terrain: string;
  description: string;
  advantages: string[];
  challenges: string[];
  modifiers: GameModifier[];
};

export const landingSites: readonly LandingSiteProfile[] = [
  {
    id: "jezero",
    name: "JEZERO CRATER",
    terrain: "Ancient crater and river delta",
    description: "A crater landscape inspired by a dried river delta, with places to look for ice.",
    advantages: ["Ancient crater landscape", "River delta-inspired terrain", "Ice exploration opportunities"],
    challenges: ["Solar panels catch less sun in this simulation"],
    modifiers: [
      { id: "ice-yield", label: "Ice drill yield", amount: 0.25 },
      { id: "solar-efficiency", label: "Solar efficiency", amount: -0.15 },
    ],
  },
  {
    id: "arcadia",
    name: "ARCADIA PLANITIA",
    terrain: "Broad northern plains",
    description: "Open plains with more sunlight and ice hiding under the surface.",
    advantages: ["Broad plains", "More solar exposure", "Subsurface ice exploration"],
    challenges: ["The ice drill works more slowly in this simulation"],
    modifiers: [
      { id: "solar-efficiency", label: "Solar efficiency", amount: 0.25 },
      { id: "ice-speed", label: "Ice drill speed", amount: -0.2 },
    ],
  },
];

export type HullProfile = {
  id: HullId;
  name: string;
  summary: string;
  tradeoffs: string[];
  modifiers: GameModifier[];
};

export const hulls: readonly HullProfile[] = [
  {
    id: "rigid-steel",
    name: "Rigid Steel Hull",
    summary: "Better pressure protection.",
    tradeoffs: ["Costs one additional rover battery charge."],
    modifiers: [
      { id: "pressure-protection", label: "Pressure protection", amount: 0.2 },
      { id: "rover-battery", label: "Rover battery charge cost", amount: 1 },
    ],
  },
  {
    id: "kevlar-rock-bolts",
    name: "Reinforced Kevlar + Rock Bolts",
    summary: "Faster setup.",
    tradeoffs: ["Loses 10% hull integrity during dust storms."],
    modifiers: [
      { id: "setup-speed", label: "Setup speed", amount: 0.25 },
      { id: "storm-hull", label: "Hull integrity in a dust storm", amount: -0.1 },
    ],
  },
];

export type EquipmentProfile = {
  id: EquipmentId;
  name: string;
  summary: string;
  tradeoffs: string[];
  modifiers: GameModifier[];
};

export const equipmentCatalog: readonly EquipmentProfile[] = [
  {
    id: "wide-scoop",
    name: "Wide Bulldozer Scoop",
    summary: "Builds regolith shielding faster.",
    tradeoffs: ["Slower ice digging."],
    modifiers: [
      { id: "regolith-speed", label: "Regolith piling speed", amount: 0.3 },
      { id: "ice-speed", label: "Ice digging speed", amount: -0.2 },
    ],
  },
  {
    id: "thermal-drill",
    name: "Thermal Ice Drill",
    summary: "Melts ice faster.",
    tradeoffs: ["Slower regolith piling."],
    modifiers: [
      { id: "ice-speed", label: "Ice melting speed", amount: 0.3 },
      { id: "regolith-speed", label: "Regolith piling speed", amount: -0.2 },
    ],
  },
  {
    id: "geiger-antenna",
    name: "Bleep's Geiger Antenna",
    summary: "Provides an early warning in the game's radiation-event scenario.",
    tradeoffs: ["Takes an equipment slot the scoop or drill might have used."],
    modifiers: [{ id: "radiation-warning", label: "Radiation warning lead time", amount: 1 }],
  },
  {
    id: "electrostatic-blower",
    name: "Electrostatic Blower",
    summary: "Cleans suit dust 30% faster in the game simulation.",
    tradeoffs: ["Does not help with digging or shielding speed."],
    modifiers: [{ id: "dust-clean", label: "Suit dust cleaning speed", amount: 0.3 }],
  },
];

export function formatModifier(modifier: GameModifier): string {
  if (modifier.id === "rover-battery" || modifier.id === "radiation-warning") {
    return modifier.amount > 0 ? `+${modifier.amount} ${modifier.label}` : modifier.label;
  }
  const percent = Math.round(modifier.amount * 100);
  const sign = percent > 0 ? "+" : "";
  return `${sign}${percent}% ${modifier.label}`;
}
