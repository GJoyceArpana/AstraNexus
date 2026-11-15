import type {
    AbortReason,
    CoreResources,
    LandingSite,
    OutpostEnvironment,
    OutpostGameState,
} from './types.ts';
import {
    calculateRadiationExposure,
    getResourceFlowSummary,
    NASA_SPECS,
} from '../systems/ResourceManager.ts';
import { calculateLoadoutEffects } from '../systems/TradeOffSystem.ts';
import { eventBus } from '../systems/EventManager.ts';

// ============================================================================
// 1. SOL ENVIRONMENTAL PROFILES & MISSION CHALLENGES (Sols 0 to 7)
// ============================================================================

export interface SolEnvironmentProfile {
    solNumber: number;
    title: string;
    codename: string;
    briefing: string;
    hazardAlert: string;
    dustStormIntensity: number; // 0.0 (clear) to 1.0 (blackout dust storm)
    solarFlareExpected: boolean; // Triggers CME particle spike
    perchlorateRiskActive: boolean;
    recommendedModules: string[];
    objectives: string[];
    nasaHistoricalContext: string;
}

export const SOL_PROFILES: Record<number, SolEnvironmentProfile> = {
    0: {
        solNumber: 0,
        title: 'Arrival & Pressurization',
        codename: 'DONT POP THE TENT',
        briefing:
            'Welcome to Mars, Commander! Your outpost tent has unfolded on the surface. You must pump in breathable atmosphere without exceeding structural burst limits.',
        hazardAlert:
            'External pressure is just 0.61 kPa (near vacuum). Overpressurizing the Kevlar shell past 72 kPa will cause a catastrophic blowout!',
        dustStormIntensity: 0.05,
        solarFlareExpected: false,
        perchlorateRiskActive: false,
        recommendedModules: ['life_support'],
        objectives: [
            'Pressurize the habitat to at least 34.0 kPa for breathable pure O2',
            'Do NOT exceed shell burst pressure limits',
            'Lock in atmospheric seal to begin Sol 1',
        ],
        nasaHistoricalContext:
            'NASA’s Apollo spacecraft and space suits operate at low pressure (~34 kPa pure O2) to minimize structural stress on lightweight pressure vessels in vacuum.',
    },

    1: {
        solNumber: 1,
        title: 'Radiation Shielding & Regolith Barrier',
        codename: 'DIRT FORTRESS',
        briefing:
            'Mars has no global magnetic field and only 1% of Earth’s atmosphere. Galactic Cosmic Rays (GCR) are penetrating your habitat hull.',
        hazardAlert:
            'Unshielded surface radiation exceeds 0.70 mSv/Sol! Excavate and pile at least 3.0 meters of compacted Martian regolith to block 95% of cosmic rays.',
        dustStormIntensity: 0.08,
        solarFlareExpected: false,
        perchlorateRiskActive: false,
        recommendedModules: ['life_support', 'thermal_heater'],
        objectives: [
            'Deploy the rover to excavate loose Martian basalt regolith',
            'Pile at least 3.0m of regolith over the habitat roof',
            'Verify habitat interior radiation drops to safe levels (<0.1 mSv/Sol)',
        ],
        nasaHistoricalContext:
            'NASA studies confirm that 3 meters of Martian regolith provides radiation protection equivalent to Earth’s atmosphere, shielding astronauts from cancer-causing cosmic rays.',
    },

    2: {
        solNumber: 2,
        title: 'Toxic Dust & Suitport Protocol',
        codename: 'THE PERCHLORATE BARRIER',
        briefing:
            'The fine red Martian dust is chemically aggressive, containing toxic calcium and magnesium perchlorates (ClO4-) that destroy human thyroid function.',
        hazardAlert:
            'Never bring spacesuits inside the living quarters! Use the exterior rear-entry Suitport to keep toxic perchlorate dust outside.',
        dustStormIntensity: 0.15,
        solarFlareExpected: false,
        perchlorateRiskActive: true,
        recommendedModules: ['life_support', 'thermal_heater', 'comms_array'],
        objectives: [
            'Conduct surface soil sampling with the rover',
            'Keep habitat perchlorate contamination level below 20%',
            'Verify Suitport airlock seals remain intact during EVA entry',
        ],
        nasaHistoricalContext:
            'NASA’s Phoenix lander discovered that Martian soil contains 0.5% to 1.0% perchlorates, prompting NASA to design rear-entry "Suitports" that latch outside habitats.',
    },

    3: {
        solNumber: 3,
        title: 'Martian Dust Storm & Kilopower',
        codename: 'THE RED GALE',
        briefing:
            'A regional dust storm has enveloped Jezero Crater. Fine atmospheric dust particles have blocked 75% of solar irradiance. Solar power is collapsing!',
        hazardAlert:
            'Solar array generation plunged from 15.0 kW to 3.75 kW! Activate the 10 kW Kilopower nuclear reactor immediately to prevent colony freeze-out.',
        dustStormIntensity: 0.85, // Severe opacity
        solarFlareExpected: false,
        perchlorateRiskActive: true,
        recommendedModules: ['life_support', 'thermal_heater'],
        objectives: [
            'Deploy the KRUSTY 10 kW Kilopower fission reactor',
            'Balance the power switchboard to avoid grid brownouts',
            'Use the rover dozer to scrape dust buildup off solar glass',
        ],
        nasaHistoricalContext:
            'NASA’s Opportunity rover fell silent in 2018 during a global dust storm. To ensure continuous power independent of sunlight, NASA developed the Kilopower (KRUSTY) reactor.',
    },

    4: {
        solNumber: 4,
        title: 'The Resource Production Trinity',
        codename: 'LIVING OFF THE LAND',
        briefing:
            'Earth supply reserves are running low. The outpost must achieve full In-Situ Resource Utilization (ISRU) independence for oxygen, water, and food.',
        hazardAlert:
            'Food and water reserves will deplete in 2 Sols unless MOXIE, the Ice Melter, and the LED Greenhouse are powered simultaneously.',
        dustStormIntensity: 0.30,
        solarFlareExpected: false,
        perchlorateRiskActive: false,
        recommendedModules: ['moxie', 'water_extractor', 'led_greenhouse', 'life_support'],
        objectives: [
            'Run MOXIE to produce +24% fresh oxygen from Mars CO2',
            'Drill subsurface permafrost to harvest +20% fresh water',
            'Harvest first batch of LED hydroponic Martian potatoes (+16% food)',
        ],
        nasaHistoricalContext:
            'NASA’s ISRU strategy relies on harvesting local resources: MOXIE cracks CO2 into O2, subsurface ice provides water, and Veggie/APH chambers grow fresh crops.',
    },

    5: {
        solNumber: 5,
        title: 'Solar Particle Storm & Comms Latency',
        codename: 'THE 12-MINUTE SILENCE',
        briefing:
            'NASA’s DONKI space weather network detected an X-class solar flare launching a Coronal Mass Ejection (CME) directly toward Mars. Simultaneously, orbital alignment causes a 12-minute radio blackout.',
        hazardAlert:
            'Lethal particle radiation spike (+85 mSv)! Rover cannot be controlled in real-time. Pre-program autonomous commands before communications go dark.',
        dustStormIntensity: 0.20,
        solarFlareExpected: true, // CME particle event
        perchlorateRiskActive: false,
        recommendedModules: ['life_support', 'thermal_heater'],
        objectives: [
            'Order all crew members into the 3m regolith storm shelter',
            'Queue pre-programmed rover commands to drive into hangar shelter',
            'Survive the high-energy proton storm with total dose under 500 mSv',
        ],
        nasaHistoricalContext:
            'Radio signals between Earth and Mars take 4 to 24 minutes one-way. During solar storms, energetic particles disrupt communications, requiring autonomous robotic decision-making.',
    },

    6: {
        solNumber: 6,
        title: 'Total System Integration',
        codename: 'COLONY GRIDLOCK',
        briefing:
            'The outpost is operating at peak capacity. A sudden thermal cold front tests every engineering system simultaneously under maximum continuous load.',
        hazardAlert:
            'All life-support, thermal, power, and recycling systems must run with zero room for error. Overloading the grid will trip critical breakers.',
        dustStormIntensity: 0.40,
        solarFlareExpected: false,
        perchlorateRiskActive: true,
        recommendedModules: ['life_support', 'thermal_heater', 'moxie', 'water_extractor'],
        objectives: [
            'Maintain electrical grid stability with 0 breaker trips',
            'Keep oxygen, water, and food above 50% safety reserves',
            'Inspect all 5 outpost structures for structural integrity',
        ],
        nasaHistoricalContext:
            'NASA’s Artemis and Moon-to-Mars architecture tests "Total System Integration": proving power, ECLSS, habitats, and rovers work harmoniously before human landing.',
    },

    7: {
        solNumber: 7,
        title: 'Return Capsule Mass & Volume Budget',
        codename: 'JOURNEY HOME',
        briefing:
            'The Earth Return Vehicle (ERV) has arrived in Jezero Crater to bring your crew and scientific discoveries home. Rocket fuel is finite—mass is your final enemy.',
        hazardAlert:
            'Maximum takeoff payload capacity is strictly 15,000 kg! Every kilogram of heavy habitat hardware cuts into rock sample return capacity.',
        dustStormIntensity: 0.10,
        solarFlareExpected: false,
        perchlorateRiskActive: false,
        recommendedModules: ['comms_array', 'life_support'],
        objectives: [
            'Calculate total return capsule takeoff mass',
            'Balance rock samples, telemetry data, and surviving crew',
            'Successfully ignite ascent stage and escape Mars gravity to win!',
        ],
        nasaHistoricalContext:
            'The Mars Sample Return (MSR) and Mars Ascent Vehicle (MAV) face rigorous rocket equation constraints: every additional kilogram on Mars requires 10+ kg of fuel to launch.',
    },
};

// ============================================================================
// 2. SOL TRANSITION REPORT & METRICS (For Joyce & Diya)
// ============================================================================

export interface SolTransitionReport {
    completedSol: number;
    nextSol: number;
    title: string;
    briefing: string;
    hazardAlert: string;
    startingResources: CoreResources;
    endingResources: CoreResources;
    netResourceDeltas: {
        oxygen: number;
        water: number;
        food: number;
        radiationDoseTodayMsv: number;
    };
    dustPanelEfficiencyLossPercent: number;
    cumulativeRadiationMsv: number;
    missionStatus: OutpostGameState['status'];
    abortReason: AbortReason;
    objectivesForNextSol: string[];
    nasaHistoricalContext: string;
    decisionLogExcerpt: string[];
}

// ============================================================================
// 3. CUMULATIVE SOL ADVANCEMENT ENGINE
// ============================================================================

/**
 * Executes a full Sol-to-Sol progression transition.
 * Carries over cumulative resources, applies wear-and-tear, evaluates mission survival,
 * and sets up environmental conditions for the next Sol.
 */
export function advanceToNextSol(state: OutpostGameState): {
    state: OutpostGameState;
    report: SolTransitionReport;
} {
    const currentSol = state.currentSol;
    const nextSolNum = currentSol + 1;
    const loadoutEffects = calculateLoadoutEffects(state.loadout);

    const startingResources = { ...state.resources };
    const summary = getResourceFlowSummary(state);

    // 1. Calculate cumulative end-of-day resource values
    let nextO2 = Math.min(100, Math.max(0, startingResources.oxygen + summary.netOxygenDelta));
    let nextH2O = Math.min(100, Math.max(0, startingResources.water + summary.netWaterDelta));
    let nextFood = Math.min(100, Math.max(0, startingResources.food + summary.netFoodDelta));
    const solDoseMsv = summary.estimatedDosePerSolMsv;
    const nextRad = Number((startingResources.radiationDose + solDoseMsv).toFixed(3));

    // Passive rover recharge from Bleep's solar cap:
    const roverRecharge = loadoutEffects.roverPassiveRechargePercent;
    const nextRoverBat = Math.min(100, startingResources.roverBattery + roverRecharge);

    // Micro-meteorite and thermal expansion wear-and-tear on hull:
    const hullWear = state.environment.dustStormIntensity > 0.5 ? 4.0 : 1.5;
    const nextHull = Math.max(10, startingResources.hullIntegrity - hullWear);

    // 2. Check Abort Conditions
    let missionStatus = state.status;
    let abortReason = state.abortReason;

    if (nextO2 <= 0) {
        missionStatus = 'emergency_abort';
        abortReason = 'HYPOXIA_OXYGEN_DEPLETED';
    } else if (nextH2O <= 0) {
        missionStatus = 'emergency_abort';
        abortReason = 'DEHYDRATION_WATER_DEPLETED';
    } else if (nextFood <= 0) {
        missionStatus = 'emergency_abort';
        abortReason = 'STARVATION_FOOD_DEPLETED';
    } else if (nextRad >= NASA_SPECS.CAREER_RADIATION_LIMIT_MSV) {
        missionStatus = 'emergency_abort';
        abortReason = 'ACUTE_RADIATION_SICKNESS';
    } else if (state.environment.perchlorateLevel >= 85) {
        missionStatus = 'emergency_abort';
        abortReason = 'PERCHLORATE_TOXICITY';
    }

    // 3. Victory Check at Sol 7
    if (nextSolNum > 7 && missionStatus !== 'emergency_abort') {
        missionStatus = 'mission_success';
    }

    // 4. Setup Next Sol Environmental Profile
    const nextProfile = SOL_PROFILES[Math.min(7, nextSolNum)];

    // Solar panels accumulate fine dust unless cleaned by regolith dozer:
    const dustPanelEfficiencyLossPercent = Number(
        (nextProfile.dustStormIntensity * 10).toFixed(1)
    );

    const updatedEnvironment: OutpostEnvironment = {
        ...state.environment,
        dustStormIntensity: nextProfile.dustStormIntensity,
        solarFlareActive: nextProfile.solarFlareExpected,
        // Suitport sealed by default at start of each Sol
        suitportSealed: true,
    };

    const updatedResources: CoreResources = {
        oxygen: Number(nextO2.toFixed(1)),
        water: Number(nextH2O.toFixed(1)),
        food: Number(nextFood.toFixed(1)),
        powerAvailable: summary.powerAvailableKw,
        powerUsed: summary.powerDrawnKw,
        roverBattery: nextRoverBat,
        hullIntegrity: Number(nextHull.toFixed(1)),
        crewHealth: startingResources.crewHealth,
        radiationDose: nextRad,
    };

    const nextLogEntry = `Sol ${currentSol} Debrief: O2=${nextO2.toFixed(0)}%, H2O=${nextH2O.toFixed(0)}%, Food=${nextFood.toFixed(0)}%, DoseToday=+${solDoseMsv.toFixed(2)} mSv (Cumulative: ${nextRad} mSv). Status: ${missionStatus}.`;

    const nextState: OutpostGameState = {
        ...state,
        currentSol: nextSolNum,
        status: missionStatus,
        abortReason,
        resources: updatedResources,
        environment: updatedEnvironment,
        decisionLog: [...state.decisionLog, nextLogEntry],
    };

    // Build the report for Joyce & Diya
    const report: SolTransitionReport = {
        completedSol: currentSol,
        nextSol: nextSolNum,
        title: nextProfile.title,
        briefing: nextProfile.briefing,
        hazardAlert: nextProfile.hazardAlert,
        startingResources,
        endingResources: updatedResources,
        netResourceDeltas: {
            oxygen: summary.netOxygenDelta,
            water: summary.netWaterDelta,
            food: summary.netFoodDelta,
            radiationDoseTodayMsv: solDoseMsv,
        },
        dustPanelEfficiencyLossPercent,
        cumulativeRadiationMsv: nextRad,
        missionStatus,
        abortReason,
        objectivesForNextSol: nextProfile.objectives,
        nasaHistoricalContext: nextProfile.nasaHistoricalContext,
        decisionLogExcerpt: nextState.decisionLog.slice(-3),
    };

    // Emit event bus signals
    if (missionStatus === 'emergency_abort') {
        eventBus.emit('EMERGENCY_ABORT', { reason: abortReason, state: nextState });
    } else if (missionStatus === 'mission_success') {
        eventBus.emit('MISSION_SUCCESS', nextState);
    } else {
        eventBus.emit('SOL_ADVANCED', { newSol: nextSolNum, state: nextState });
    }

    eventBus.emit('RESOURCE_UPDATED', nextState.resources);

    return { state: nextState, report };
}

// ============================================================================
// 4. HELPER QUERY FUNCTIONS (For UI Panels & Briefings)
// ============================================================================

export function getSolProfile(sol: number): SolEnvironmentProfile {
    return SOL_PROFILES[sol] || SOL_PROFILES[7];
}

export function getAllSolProfiles(): SolEnvironmentProfile[] {
    return Object.values(SOL_PROFILES);
}

