export type AgeMode = "junior-cadet" | "flight-director";

export type LandingSiteId = "jezero" | "arcadia";

export type HullId = "rigid-steel" | "kevlar-rock-bolts";

export type EquipmentId =
  | "bulldozer-scoop"
  | "thermal-ice-drill"
  | "geiger-antenna"
  | "electrostatic-blower";

export type PowerModuleId =
  | "pressure-circulator"
  | "radiation-shield"
  | "suitport"
  | "moxie"
  | "ice-melter"
  | "greenhouse";

export type MissionStatus =
  | "menu"
  | "setup"
  | "active"
  | "paused"
  | "emergency"
  | "complete";

export type GameSettings = {
  soundVolume: number;
  musicVolume: number;
  voiceInstructions: boolean;
  animationsEnabled: boolean;
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
};

export type GameStateData = {
  selectedAgeMode: AgeMode | null;
  selectedLandingSite: LandingSiteId | null;
  selectedHull: HullId | null;
  selectedEquipment: EquipmentId[];
  currentSol: number;
  completedSols: number[];
  oxygen: number;
  water: number;
  food: number;
  power: number;
  battery: number;
  radiationExposure: number;
  perchlorateExposure: number;
  habitatPressure: number;
  hullIntegrity: number;
  activeModules: PowerModuleId[];
  missionStatus: MissionStatus;
  settings: GameSettings;
};
