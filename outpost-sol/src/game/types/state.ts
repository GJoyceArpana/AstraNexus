export type AgeMode = "junior-cadet" | "flight-director";

export type LandingSiteId = "jezero" | "arcadia";

export type HullId = "rigid-steel" | "kevlar-rock-bolts";

export type EquipmentId =
  | "wide-scoop"
  | "thermal-drill"
  | "geiger-antenna"
  | "electrostatic-blower";

export type PowerModuleId =
  | "pressure-circulator"
  | "radiation-shield"
  | "suitport"
  | "moxie"
  | "ice-melter"
  | "greenhouse";

export type MissionStatus = "standby" | "active" | "alert" | "complete" | "recovery";

export type Settings = {
  soundVolume: number;
  musicVolume: number;
  voiceInstructions: boolean;
  animations: boolean;
  highContrast: boolean;
  largeText: boolean;
  reducedMotion: boolean;
};

/**
 * Shared mission state. Resource numbers are simulated game values
 * on a 0–100 scale unless a later system documents a different unit.
 */
export type GameState = {
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
  crewHealth: number;
  suitCondition: number;
  activeModules: PowerModuleId[];
  missionStatus: MissionStatus;
  engineeringScore: number | null;
  settings: Settings;
};
