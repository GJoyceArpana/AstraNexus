import type {
    BleepHat,
    DifficultyMode,
    HabitatShell,
    LandingSite,
    OutpostGameState,
    PlayerLoadout,
    RoverTool,
} from '../mechanics/types.ts';
import { SHELL_MAX_BURST_KPA } from '../mechanics/pressureExperiment.ts';

// ============================================================================
// 1. HABITAT SHELL TRADE-OFF CONFIGURATIONS
// ============================================================================

export interface HabitatShellConfig {
    id: HabitatShell;
    name: string;
    subtitle: string;
    description: string;
    maxBurstKpa: number;
    massKg: number;
    baseRadiationShieldingPercent: number; // Bare shielding before regolith is piled
    regolithTargetMeters: number;          // Depth needed to reach 95%+ protection
    thermalInsulationRating: 'Medium' | 'High' | 'Superior';
    sol7PayloadMassPenaltyKg: number;      // Mass penalty that eats into return capsule budget
    pros: string[];
    cons: string[];
    nasaFact: string;
    badgeIcon: string;
}

export const HABITAT_SHELL_CONFIGS: Record<HabitatShell, HabitatShellConfig> = {
    inflatable_kevlar: {
        id: 'inflatable_kevlar',
        name: 'TransHab Expandable Dome',
        subtitle: 'Lightweight Multi-layer Kevlar & Vectran Shell',
        description:
            'A compact expandable habitat shell based on NASA TransHab research. Extremely lightweight to transport from Earth, but highly vulnerable to high internal pressure and Mars radiation until covered with regolith.',
        maxBurstKpa: SHELL_MAX_BURST_KPA.inflatable_kevlar, // 72.0 kPa
        massKg: 4200,
        baseRadiationShieldingPercent: 22, // Low bare shielding
        regolithTargetMeters: 3.0,          // Requires full 3 meters in Sol 1
        thermalInsulationRating: 'Medium',
        sol7PayloadMassPenaltyKg: 0,        // Lowest launch mass saves return capsule payload
        pros: [
            'Lightest payload: reserves maximum mass for return samples and fuel in Sol 7',
            'Quick initial deployment with minimum power draw',
            'Flexible impact-absorbing outer weave against micro-meteorites'
        ],
        cons: [
            'Low burst threshold (72 kPa): pops if pumped anywhere near Earth pressure (101.3 kPa)!',
            'Minimum radiation protection until buried under 3m of Martian regolith',
            'Moderate thermal insulation requires steady heater power at night'
        ],
        nasaFact:
            'NASA tested the TransHab concept and the Bigelow Expandable Activity Module (BEAM) on the ISS. Expandable structures compact into rocket fairings and expand in space, offering great volume-to-mass ratios.',
        badgeIcon: '🎪'
    },

    rigid_composite: {
        id: 'rigid_composite',
        name: 'Aerospace Rigid Composite Cylinder',
        subtitle: 'Carbon-Fiber & Aluminum-Lithium Pressure Hull',
        description:
            'A pre-fabricated, ultra-sturdy rigid metallic-composite module. Virtually immune to overpressurization blowouts, but very heavy, consuming precious payload capacity for the Sol 7 return mission.',
        maxBurstKpa: SHELL_MAX_BURST_KPA.rigid_composite, // 110.0 kPa
        massKg: 13500,
        baseRadiationShieldingPercent: 62, // Moderate built-in shielding
        regolithTargetMeters: 1.5,          // Needs less regolith covering
        thermalInsulationRating: 'High',
        sol7PayloadMassPenaltyKg: 650,      // Heavy hull cuts into return fuel & sample budget
        pros: [
            'Highest burst threshold (110 kPa): completely safe from overpressure blowout during Sol 0',
            'Strong built-in shielding (62% protection) requires only 1.5m regolith to be fully safe',
            'Excellent thermal retention keeps crew warm during dust storms'
        ],
        cons: [
            'Heavy mass consumes 650 kg of the return capsule mass budget in Sol 7',
            'High upfront power requirement to warm up rigid structure',
            'Difficult to patch in the field if penetrated'
        ],
        nasaFact:
            'NASA’s Orion capsule and Apollo command modules used rigid aluminum-lithium alloys and titanium skins. They provide supreme structural predictability but demand powerful launch vehicles (like SLS).',
        badgeIcon: '🏛️'
    },

    regolith_hybrid: {
        id: 'regolith_hybrid',
        name: '3D-Printed Regolith Vault',
        subtitle: 'Sintered Basalt Arch with Polymer Infill',
        description:
            'An expandable inner bladder designed from the ground up to interlock with 3D-printed or bulldozer-piled Martian regolith. Offers the ultimate long-term radiation and thermal protection, but demands rover excavation in Sol 1.',
        maxBurstKpa: SHELL_MAX_BURST_KPA.regolith_hybrid, // 90.0 kPa
        massKg: 7800,
        baseRadiationShieldingPercent: 40,
        regolithTargetMeters: 2.5,
        thermalInsulationRating: 'Superior',
        sol7PayloadMassPenaltyKg: 250,
        pros: [
            'High burst tolerance (90 kPa) handles comfortable Martian habitability pressures',
            'Superior thermal mass prevents catastrophic freezing if power fails briefly',
            'Blocks 98% of solar flare radiation once regolith is applied'
        ],
        cons: [
            'Requires immediate rover dozer work in Sol 1 to stabilize thermal envelope',
            'Moderate payload mass penalty for structural scaffolding',
            'Complex initial airlock seal check'
        ],
        nasaFact:
            'NASA’s 3D-Printed Habitat Challenge explored using Martian soil (regolith) combined with recyclable biopolymers to create thick protective shells on Mars, shielding crews from Galactic Cosmic Rays.',
        badgeIcon: '🏗️'
    }
};

// ============================================================================
// 2. ROVER TOOL TRADE-OFF CONFIGURATIONS
// ============================================================================

export interface RoverToolConfig {
    id: RoverTool;
    name: string;
    subtitle: string;
    description: string;
    batteryCostPerAction: number;         // Rover battery % consumed per deployment
    regolithExcavationMultiplier: number; // Piling regolith speed multiplier
    iceMiningYieldMultiplier: number;     // Water ice extraction speed multiplier
    perchlorateDetection: boolean;        // Detects toxic dust pockets in Sol 2
    scienceScanBonusPercent: number;      // Bonus scientific discovery score
    pros: string[];
    cons: string[];
    nasaFact: string;
    badgeIcon: string;
}

export const ROVER_TOOL_CONFIGS: Record<RoverTool, RoverToolConfig> = {
    percussion_drill: {
        id: 'percussion_drill',
        name: 'TRIDENT Percussion Ice Drill',
        subtitle: 'High-Torque Subsurface Rotary-Impact Drill',
        description:
            'A 1-meter deep rotary percussion coring drill designed to penetrate Martian permafrost and subsurface ice lenses. Produces 2.5x water ice yields in Sol 4, but is poor at moving bulk soil.',
        batteryCostPerAction: 15,
        regolithExcavationMultiplier: 0.8, // Slow at earthmoving
        iceMiningYieldMultiplier: 2.5,     // 250% ice extraction in Sol 4
        perchlorateDetection: false,
        scienceScanBonusPercent: 15,
        pros: [
            '+150% water ice harvesting speed in Sol 4: solves colony dehydration fast',
            'Can extract core samples from hard frozen ground up to 1 meter depth',
            'Provides +15% scientific discovery bonus from deep geological strata'
        ],
        cons: [
            'Inefficient at pushing surface regolith for Sol 1 radiation shielding',
            'Higher battery drain (15% per use) requires vigilant rover power management',
            'Cannot detect microscopic perchlorate chemical dust'
        ],
        nasaFact:
            'NASA’s VIPER mission and PRIME-1 payload carry TRIDENT (The Regolith and Ice Drill for Exploring New Terrains) to drill 1 meter below the surface to search for subsurface water ice.',
        badgeIcon: '🔩'
    },

    regolith_dozer: {
        id: 'regolith_dozer',
        name: 'Martian Excavation Dozer Blade',
        subtitle: 'Serrated Heavy-Duty Regolith Scoop & Leveller',
        description:
            'A rugged front-mounted dozer blade with serrated teeth for mass excavation. Piles 3m of regolith shielding 2.5x faster in Sol 1 and clears blinding dust from solar panels during the Sol 3 storm.',
        batteryCostPerAction: 10,
        regolithExcavationMultiplier: 2.5, // 250% regolith speed
        iceMiningYieldMultiplier: 0.7,     // Weak at deep ice drilling
        perchlorateDetection: false,
        scienceScanBonusPercent: 0,
        pros: [
            '+150% regolith piling speed: completes the 3m Sol 1 shielding challenge effortlessly',
            'Rapidly scrapes solar panels clean in Sol 3, recovering lost power instantly',
            'Lowest battery drain (10%) for bulk physical surface maneuvers'
        ],
        cons: [
            'Cannot penetrate hard deep ice permafrost in Sol 4, yielding 30% less water',
            'Provides zero scientific sensor scanning bonuses',
            'Cannot analyze toxic perchlorate chemical levels in the soil'
        ],
        nasaFact:
            'NASA’s RASSOR (Regolith Advanced Surface Systems Operations Robot) uses dual bucket drums to dig and haul bulk planetary soil in low gravity without requiring heavy vehicle counterweights.',
        badgeIcon: '🚜'
    },

    spectrometer_arm: {
        id: 'spectrometer_arm',
        name: 'SHERLOC Raman & APXS Arm',
        subtitle: 'Multi-Wavelength Raman & X-Ray Spectrometer Turret',
        description:
            'A high-precision articulated robotic arm equipped with Raman luminescence and Alpha Particle X-ray spectrometers. Scans and neutralizes perchlorate contamination in Sol 2 and doubles scientific scores.',
        batteryCostPerAction: 12,
        regolithExcavationMultiplier: 1.0,
        iceMiningYieldMultiplier: 1.2,
        perchlorateDetection: true,        // Flags dangerous perchlorates
        scienceScanBonusPercent: 50,       // +50% science telemetry score
        pros: [
            'Detects and flags dangerous perchlorate dust in Sol 2, cutting toxicity risks by 50%',
            '+50% scientific discovery bonus: yields top NASA OSDR telemetry scores',
            'Pinpoints high-purity ice deposits for steady water extraction'
        ],
        cons: [
            'Average mechanical speed at piling regolith in Sol 1',
            'Delicate optical sensors require dust lens cleaning after storms',
            'Slower ice extraction than the specialized heavy percussion drill'
        ],
        nasaFact:
            'Perseverance carries SHERLOC (Scanning Habitable Environments with Raman & Luminescence for Organics & Chemicals) on its arm to map minerals and detect biosignatures with sub-millimeter precision.',
        badgeIcon: '🔬'
    }
};

// ============================================================================
// 3. BLEEP HAT TRADE-OFF CONFIGURATIONS
// ============================================================================

export interface BleepHatConfig {
    id: BleepHat;
    name: string;
    subtitle: string;
    description: string;
    passivePowerGenKw: number;              // Continuous auxiliary power added to base grid
    stormCommandQueueCapacity: number;     // Number of pre-programmed commands in Sol 5 storm
    earlySolarStormWarningSeconds: number; // Advance warning time before solar flare hits
    passiveRoverRechargePercentPerSol: number; // Passive battery recharge for rover
    unlocksTelemetryHints: boolean;         // Earth comms advice from Commander Maya
    pros: string[];
    cons: string[];
    nasaFact: string;
    badgeIcon: string;
}

export const BLEEP_HAT_CONFIGS: Record<BleepHat, BleepHatConfig> = {
    comms_dish: {
        id: 'comms_dish',
        name: 'High-Gain Telemetry Dish',
        subtitle: 'Parabolic Deep Space Network Link Antenna',
        description:
            'Equips Bleep with a high-gain parabolic antenna hooked directly into NASA’s Deep Space Network. Allows 5 pre-programmed commands during Sol 5’s storm blackout and unlocks hints from Mission Control.',
        passivePowerGenKw: 0,
        stormCommandQueueCapacity: 5, // 5 command slots vs standard 3
        earlySolarStormWarningSeconds: 15,
        passiveRoverRechargePercentPerSol: 0,
        unlocksTelemetryHints: true,
        pros: [
            'Expands pre-programmed command slots to 5 in Sol 5, preventing rover freeze-up during blackout',
            'Unlocks direct Mission Control hints from Commander Maya whenever resources dip low',
            'Reduces perceived signal latency when communicating with Earth'
        ],
        cons: [
            'Provides zero auxiliary power generation',
            'Does not passively recharge the rover battery',
            'Vulnerable to high wind drag during severe dust storms'
        ],
        nasaFact:
            'Mars missions communicate with Earth via the Deep Space Network (DSN) antennas in Goldstone, Madrid, and Canberra. Light travel times range from 4 to 24 minutes depending on orbital alignment.',
        badgeIcon: '📡'
    },

    solar_cap: {
        id: 'solar_cap',
        name: 'Multi-Junction Solar Umbrella',
        subtitle: 'High-Efficiency Gallium Arsenide Solar Parasol',
        description:
            'A sun-tracking multi-junction solar array perched atop Bleep. Generates +1.5 kW auxiliary electricity during daylight and passively trickles +15% battery back to the rover each Sol.',
        passivePowerGenKw: 1.5,
        stormCommandQueueCapacity: 3,
        earlySolarStormWarningSeconds: 0,
        passiveRoverRechargePercentPerSol: 15,
        unlocksTelemetryHints: false,
        pros: [
            '+1.5 kW constant daylight power helps prevent blackouts during Sol 3 dust storm',
            'Passively charges rover battery by +15% per Sol without needing outpost plug',
            'Serves as an emergency micro-grid if the main solar array gets covered in dust'
        ],
        cons: [
            'Standard command queue limit (3 commands) during Sol 5 solar storm blackout',
            'No early warning sensor for incoming Coronal Mass Ejections (CMEs)',
            'Solar efficiency drops by 60% during peak dust storm atmospheric opacity'
        ],
        nasaFact:
            'NASA’s Mars Exploration Rovers Spirit and Opportunity relied entirely on multi-junction solar cells, which kept Opportunity operating on Mars for over 14 Earth years until a global dust storm.',
        badgeIcon: '☀️'
    },

    radiation_dosimeter: {
        id: 'radiation_dosimeter',
        name: 'RadLab Solid-State Dosimeter',
        subtitle: 'Silicon Particle Detector & Magnetometer Beanie',
        description:
            'A miniaturized radiation monitor derived from NASA’s RadLab and Curiosity’s RAD instrument. Provides a 45-second advance warning before Coronal Mass Ejections (CMEs) arrive in Sol 5.',
        passivePowerGenKw: 0,
        stormCommandQueueCapacity: 3,
        earlySolarStormWarningSeconds: 45, // 45 seconds to get crew into storm shelter!
        passiveRoverRechargePercentPerSol: 0,
        unlocksTelemetryHints: false,
        pros: [
            '45-second early warning before Sol 5 solar flare hits: plenty of time to enter storm shelter',
            'Precise cumulative mSv dosimetry readings on HUD, preventing acute radiation sickness',
            'Audio-visual Geiger-counter audio feedback when approaching radiation hotspots'
        ],
        cons: [
            'Zero auxiliary power output for outpost systems',
            'No rover battery charging capability',
            'Standard 3-slot command queue limit during communication delays'
        ],
        nasaFact:
            'Curiosity’s Radiation Assessment Detector (RAD) measured interplanetary radiation en route to Mars and has measured surface radiation doses since 2012, proving deep-space missions require robust radiation mitigation.',
        badgeIcon: '☢️'
    }
};

// ============================================================================
// 4. COMBINED LOADOUT EFFECTS & MODIFIERS
// ============================================================================

export interface CombinedLoadoutEffects {
    totalPayloadMassKg: number;
    effectiveBurstKpa: number;
    baseRadiationProtectionPercent: number;
    regolithTargetMeters: number;
    regolithPilingSpeedMultiplier: number;
    iceMiningYieldMultiplier: number;
    perchlorateScanningActive: boolean;
    scienceScoreBonusPercent: number;
    passiveSolarPowerKw: number;
    roverPassiveRechargePercent: number;
    stormCommandQueueSlots: number;
    solarFlareWarningSeconds: number;
    missionControlHintsUnlocked: boolean;
    sol7PayloadMassPenaltyKg: number;
    activeSynergies: Array<{ name: string; description: string }>;
}

/**
 * Calculates the combined mathematical and gameplay modifiers of the player's full loadout.
 */
export function calculateLoadoutEffects(loadout: PlayerLoadout): CombinedLoadoutEffects {
    const shell = HABITAT_SHELL_CONFIGS[loadout.habitatShell];
    const tool = ROVER_TOOL_CONFIGS[loadout.roverTool];
    const hat = BLEEP_HAT_CONFIGS[loadout.bleepHat];

    const totalPayloadMassKg = shell.massKg + 250 + 45; // Base gear + tool + hat mass
    const effectiveBurstKpa = shell.maxBurstKpa;
    const baseRadiationProtectionPercent = shell.baseRadiationShieldingPercent;
    const regolithTargetMeters = shell.regolithTargetMeters;

    const regolithPilingSpeedMultiplier = tool.regolithExcavationMultiplier;
    const iceMiningYieldMultiplier = tool.iceMiningYieldMultiplier;
    const perchlorateScanningActive = tool.perchlorateDetection;
    const scienceScoreBonusPercent = tool.scienceScanBonusPercent;

    const passiveSolarPowerKw = hat.passivePowerGenKw;
    const roverPassiveRechargePercent = hat.passiveRoverRechargePercentPerSol;
    const stormCommandQueueSlots = hat.stormCommandQueueCapacity;
    const solarFlareWarningSeconds = hat.earlySolarStormWarningSeconds;
    const missionControlHintsUnlocked = hat.unlocksTelemetryHints;
    const sol7PayloadMassPenaltyKg = shell.sol7PayloadMassPenaltyKg;

    // Detect gameplay synergies between selections
    const activeSynergies: Array<{ name: string; description: string }> = [];

    // Synergy 1: Heavy Fortress
    if (loadout.habitatShell === 'regolith_hybrid' && loadout.roverTool === 'regolith_dozer') {
        activeSynergies.push({
            name: 'Rapid Fortress Architecture',
            description: 'Regolith Hybrid shell + Dozer Blade unlocks +20% faster radiation shelter construction!'
        });
    }

    // Synergy 2: Deep Cryo-Prospector
    if (loadout.roverTool === 'percussion_drill' && loadout.bleepHat === 'solar_cap') {
        activeSynergies.push({
            name: 'Cryo-Power Dynamo',
            description: 'Percussion Drill + Bleep Solar Cap ensures constant recharge while extracting deep water ice!'
        });
    }

    // Synergy 3: NASA Science Specialist
    if (loadout.roverTool === 'spectrometer_arm' && loadout.bleepHat === 'comms_dish') {
        activeSynergies.push({
            name: 'Deep Space Telemetry Link',
            description: 'Spectrometer + Comms Dish transmits real-time OSDR bioscience data directly to Earth for max points!'
        });
    }

    // Synergy 4: Solar Storm Sentinel
    if (loadout.habitatShell === 'regolith_hybrid' && loadout.bleepHat === 'radiation_dosimeter') {
        activeSynergies.push({
            name: 'Solar Storm Sentinel',
            description: 'Dosimeter warning paired with thick regolith vault provides near-total immunity to CME damage!'
        });
    }

    return {
        totalPayloadMassKg,
        effectiveBurstKpa,
        baseRadiationProtectionPercent,
        regolithTargetMeters,
        regolithPilingSpeedMultiplier,
        iceMiningYieldMultiplier,
        perchlorateScanningActive,
        scienceScoreBonusPercent,
        passiveSolarPowerKw,
        roverPassiveRechargePercent,
        stormCommandQueueSlots,
        solarFlareWarningSeconds,
        missionControlHintsUnlocked,
        sol7PayloadMassPenaltyKg,
        activeSynergies
    };
}

// ============================================================================
// 5. GAME STATE INTEGRATION & LOADOUT VALIDATION
// ============================================================================

/**
 * Creates a fully initialized, balanced OutpostGameState ready for Sol 0 or Sol 1.
 * Joyce can call this single function in BootScene, StartScene, or CustomizationScene.
 */
export function createInitialGameState(
    mode: DifficultyMode = 'junior_cadet',
    landingSite: LandingSite = 'jezero_crater',
    loadout?: PlayerLoadout
): OutpostGameState {
    const finalLoadout = loadout || getDefaultLoadout(mode);
    const effects = calculateLoadoutEffects(finalLoadout);

    return {
        mode,
        landingSite,
        currentSol: 0, // Starts at Sol 0 (Tent Experiment)
        status: 'in_progress',
        abortReason: 'NONE',
        loadout: finalLoadout,
        resources: {
            oxygen: 100,
            water: 100,
            food: 100,
            powerAvailable: 15.0 + effects.passiveSolarPowerKw, // 15 kW baseline + Bleep bonus
            powerUsed: 0,
            roverBattery: 100,
            hullIntegrity: 100,
            crewHealth: 100,
            radiationDose: 0,
        },
        environment: {
            internalPressureKpa: 0.61, // Mars ambient initially
            regolithThicknessM: 0,
            perchlorateLevel: 0,
            dustStormIntensity: 0,
            solarFlareActive: false,
            kilopowerActive: false,
            suitportSealed: true,
        },
        activeModules: ['life_support'], // Life support on by default
        queuedStormCommands: [],
        decisionLog: [
            `Mission Initialized: ${mode === 'junior_cadet' ? 'Junior Cadet' : 'Flight Director'} mode at ${
                landingSite === 'jezero_crater' ? 'Jezero Crater' : 'Arcadia Planitia'
            }.`,
            `Initial Gear: Shell=[${getHabitatShellConfig(finalLoadout.habitatShell).name}], Tool=[${
                getRoverToolConfig(finalLoadout.roverTool).name
            }], Bleep Hat=[${getBleepHatConfig(finalLoadout.bleepHat).name}].`,
        ],
    };
}

/**
 * Returns a recommended loadout based on the chosen difficulty mode.
 */
export function getDefaultLoadout(mode: DifficultyMode = 'junior_cadet'): PlayerLoadout {
    if (mode === 'junior_cadet') {
        // Safe, forgiving loadout: Rigid composite avoids burst blowout, dozer helps build cover quickly
        return {
            habitatShell: 'rigid_composite',
            roverTool: 'regolith_dozer',
            bleepHat: 'solar_cap'
        };
    }

    // Flight director: High-skill strategic trade-off loadout
    return {
        habitatShell: 'inflatable_kevlar',
        roverTool: 'spectrometer_arm',
        bleepHat: 'radiation_dosimeter'
    };
}

/**
 * Validates that all three loadout components have been chosen.
 */
export function validateLoadout(loadout?: Partial<PlayerLoadout>): {
    valid: boolean;
    missing: string[];
} {
    const missing: string[] = [];
    if (!loadout?.habitatShell) missing.push('Habitat Shell');
    if (!loadout?.roverTool) missing.push('Rover Tool');
    if (!loadout?.bleepHat) missing.push('Bleep Hat');

    return {
        valid: missing.length === 0,
        missing
    };
}

/**
 * Applies the chosen loadout to the central OutpostGameState, logging the trade-offs into the decision history.
 */
export function applyLoadoutToGameState(
    state: OutpostGameState,
    loadout: PlayerLoadout
): OutpostGameState {
    const effects = calculateLoadoutEffects(loadout);
    const shellConfig = HABITAT_SHELL_CONFIGS[loadout.habitatShell];
    const toolConfig = ROVER_TOOL_CONFIGS[loadout.roverTool];
    const hatConfig = BLEEP_HAT_CONFIGS[loadout.bleepHat];

    const loadoutLogEntry = `Sol 0 Loadout Finalized: Shell=[${shellConfig.name} (${shellConfig.maxBurstKpa} kPa burst limit)], Tool=[${toolConfig.name}], Bleep Hat=[${hatConfig.name}]. Total payload: ${effects.totalPayloadMassKg} kg.`;

    return {
        ...state,
        loadout,
        resources: {
            ...state.resources,
            powerAvailable: state.resources.powerAvailable + effects.passiveSolarPowerKw
        },
        decisionLog: [...state.decisionLog, loadoutLogEntry]
    };
}

/**
 * Quick helper getters for external modules (e.g. Anusha's UI or Joyce's scene managers).
 */
export function getHabitatShellConfig(shell: HabitatShell): HabitatShellConfig {
    return HABITAT_SHELL_CONFIGS[shell];
}

export function getRoverToolConfig(tool: RoverTool): RoverToolConfig {
    return ROVER_TOOL_CONFIGS[tool];
}

export function getBleepHatConfig(hat: BleepHat): BleepHatConfig {
    return BLEEP_HAT_CONFIGS[hat];
}
