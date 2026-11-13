export type DifficultyMode = 'junior_cadet' | 'flight_director';
export type LandingSite = 'jezero_crater' | 'arcadia_planitia';

// Task #2: Engineering loadout trade-offs
export type HabitatShell = 'inflatable_kevlar' | 'rigid_composite' | 'regolith_hybrid';
export type RoverTool = 'percussion_drill' | 'regolith_dozer' | 'spectrometer_arm';
export type BleepHat = 'comms_dish' | 'solar_cap' | 'radiation_dosimeter';

export type {
    HabitatShellConfig,
    RoverToolConfig,
    BleepHatConfig,
    CombinedLoadoutEffects,
} from '../systems/TradeOffSystem.ts';
export { createInitialGameState } from '../systems/TradeOffSystem.ts';

// Task #4: Six power switchboard modules
export type ModuleId =
    | 'life_support'
    | 'moxie'
    | 'water_extractor'
    | 'led_greenhouse'
    | 'comms_array'
    | 'thermal_heater';

// Task #7: Rover actions
export type RoverActionType =
    | 'pile_regolith'
    | 'clean_solar_panels'
    | 'drill_ice'
    | 'sample_soil'
    | 'enter_storm_shelter';

export type MissionStatus = 'in_progress' | 'sol_complete' | 'mission_success' | 'emergency_abort';

// Task #8: Root causes for Diya's abort screen
export type AbortReason =
    | 'NONE'
    | 'TENT_OVERPRESSURE_BLOWOUT'
    | 'HYPOXIA_OXYGEN_DEPLETED'
    | 'DEHYDRATION_WATER_DEPLETED'
    | 'STARVATION_FOOD_DEPLETED'
    | 'ACUTE_RADIATION_SICKNESS'
    | 'PERCHLORATE_TOXICITY'
    | 'THERMAL_FREEZE_POWER_LOSS'
    | 'RETURN_CAPSULE_OVERWEIGHT';

export interface PlayerLoadout {
    habitatShell: HabitatShell;
    roverTool: RoverTool;
    bleepHat: BleepHat;
}

export interface CoreResources {
    oxygen: number;         // 0 - 100 (%)
    water: number;          // 0 - 100 (%)
    food: number;           // 0 - 100 (%)
    powerAvailable: number; // kW produced by Solar + Kilopower
    powerUsed: number;      // kW drawn by active modules
    roverBattery: number;   // 0 - 100 (%)
    hullIntegrity: number;  // 0 - 100 (%)
    crewHealth: number;     // 0 - 100 (%)
    radiationDose: number;  // Cumulative mSv (Safe threshold < 500 mSv)
}

export interface OutpostEnvironment {
    internalPressureKpa: number; // Earth ~101.3 kPa, safe Mars hab ~34 - 70 kPa
    regolithThicknessM: number;  // Target >= 3.0m for radiation shielding
    perchlorateLevel: number;    // 0 - 100 (dust toxicity buildup)
    dustStormIntensity: number;  // 0 - 1 (reduces solar output)
    solarFlareActive: boolean;   // Triggered via Ganesh's NASA DONKI API
    kilopowerActive: boolean;    // Fission backup power (10 kW steady)
    suitportSealed: boolean;     // Prevents perchlorate dust entry
}

export interface OutpostGameState {
    mode: DifficultyMode;
    landingSite: LandingSite;
    currentSol: number; // 0 = Tent Experiment, 1..7 = Main Sols
    status: MissionStatus;
    abortReason: AbortReason;
    loadout: PlayerLoadout;
    resources: CoreResources;
    environment: OutpostEnvironment;
    activeModules: ModuleId[];            // Max 3 (Junior Cadet) or 4 (Flight Director)
    queuedStormCommands: RoverActionType[]; // Sol 5 pre-programmed commands
    decisionLog: string[];                // History of choices affecting later Sols
}