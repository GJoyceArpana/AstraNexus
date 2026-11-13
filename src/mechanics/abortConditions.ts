import type { AbortReason, MissionStatus, OutpostGameState } from './types.ts';
import { calculateRadiationExposure, NASA_SPECS } from '../systems/ResourceManager.ts';
import { calculateLoadoutEffects } from '../systems/TradeOffSystem.ts';
import { eventBus } from '../systems/EventManager.ts';

// ============================================================================
// 1. SCIENTIFIC ROOT-CAUSE EXPLANATIONS (For Diya's Abort Screen)
// ============================================================================

export interface AbortRootCause {
    reason: AbortReason;
    title: string;
    summary: string;
    scientificExplanation: string;
    recoveryHint: string;
    nasaReference: string;
    icon: string;
}

export const ABORT_ROOT_CAUSES: Record<AbortReason, AbortRootCause> = {
    NONE: {
        reason: 'NONE',
        title: 'All Systems Nominal',
        summary: 'Outpost operations are proceeding within safe environmental parameters.',
        scientificExplanation: 'Continuous life support, thermal balance, and structural integrity maintained.',
        recoveryHint: 'Maintain current module allocation and monitor resource reserves.',
        nasaReference: 'NASA Flight Operations Directorate (FOD) nominal telemetry standards.',
        icon: '✅',
    },

    TENT_OVERPRESSURE_BLOWOUT: {
        reason: 'TENT_OVERPRESSURE_BLOWOUT',
        title: 'Catastrophic Hull Overpressure Blowout',
        summary: 'Internal atmospheric pressure exceeded the structural tensile limit of the habitat shell, resulting in explosive decompression into Mars vacuum.',
        scientificExplanation:
            'Mars external pressure is only 0.61 kPa (near-vacuum). Pumping the habitat up to Earth sea-level pressure (101.3 kPa) creates a 100+ kPa outward pressure differential that lightweight expandable Kevlar cannot sustain.',
        recoveryHint:
            'Vent excess air! NASA Mars habitats operate safely at lower pressure (34.0 to 55.0 kPa pure or enriched oxygen), reducing outward wall stress by over 50%.',
        nasaReference: 'NASA Apollo Command Module and Skylab low-pressure (34 kPa) environmental architecture.',
        icon: '💥',
    },

    HYPOXIA_OXYGEN_DEPLETED: {
        reason: 'HYPOXIA_OXYGEN_DEPLETED',
        title: 'Acute Hypoxia & Oxygen Depletion',
        summary: 'Outpost breathable oxygen reserves dropped to zero. Crew suffered irreversible cerebral hypoxia.',
        scientificExplanation:
            'Each astronaut consumes ~0.84 kg of oxygen per day. Without active ECLSS catalytic recycling or MOXIE solid oxide electrolysis, carbon dioxide buildup and oxygen starvation become lethal within hours.',
        recoveryHint:
            'Keep Life Support active at all times! Prioritize power to the MOXIE module to split atmospheric CO2 into fresh O2 before reserves drop below 20%.',
        nasaReference: 'NASA Human Integration Design Handbook (HIDH) - Section 6: Environmental Control.',
        icon: '🫁',
    },

    DEHYDRATION_WATER_DEPLETED: {
        reason: 'DEHYDRATION_WATER_DEPLETED',
        title: 'Colony Dehydration Crisis',
        summary: 'Potable water reserves completely ran dry. Life-support water loops collapsed.',
        scientificExplanation:
            'Human metabolic hydration demands 2.5–3.0 liters of water daily. On Mars, unrecovered greywater and lack of subsurface ice extraction lead to rapid systemic dehydration.',
        recoveryHint:
            'Equip the TRIDENT percussion drill and power the Ice Melter module to extract subsurface permafrost ice early in the mission.',
        nasaReference: 'NASA Water Recovery System (WRS) aboard the International Space Station.',
        icon: '💧',
    },

    STARVATION_FOOD_DEPLETED: {
        reason: 'STARVATION_FOOD_DEPLETED',
        title: 'Caloric Starvation & Crop Failure',
        summary: 'Emergency food rations ran out and hydroponic agricultural yields were insufficient to sustain crew metabolism.',
        scientificExplanation:
            'Astronauts require 2,500–3,000 kilocalories daily to work in Mars EVA suits. Stored rations are finite; without continuous high-PAR LED photosynthesis, food reserves deplete steadily.',
        recoveryHint:
            'Power the LED Greenhouse module and ensure at least 5% water reserves are maintained so hydroponic Martian potatoes can mature.',
        nasaReference: 'NASA Advanced Plant Habitat (APH) and Veggie crop cultivation experiments on ISS.',
        icon: '🥔',
    },

    ACUTE_RADIATION_SICKNESS: {
        reason: 'ACUTE_RADIATION_SICKNESS',
        title: 'Acute Radiation Sickness (ARS)',
        summary: 'Cumulative deep-space ionizing radiation exceeded safe biological thresholds, compromising crew DNA and hematology.',
        scientificExplanation:
            'Mars lacks a global magnetosphere. Galactic Cosmic Rays (GCR) and solar Coronal Mass Ejections (CMEs) deliver unshielded surface doses over 0.70 mSv/Sol, and up to 85+ mSv during solar proton events.',
        recoveryHint:
            'Excavate and pile at least 3.0 meters of Martian regolith over the habitat roof during Sol 1, and seek shelter immediately during DONKI flare warnings!',
        nasaReference: 'NASA RadLab dosimetry database and Curiosity rover Radiation Assessment Detector (RAD).',
        icon: '☢️',
    },

    PERCHLORATE_TOXICITY: {
        reason: 'PERCHLORATE_TOXICITY',
        title: 'Severe Perchlorate Chemical Poisoning',
        summary: 'Aggressive Martian perchlorate salts infiltrated the living quarters and contaminated life-support ventilation.',
        scientificExplanation:
            'Martian regolith contains 0.5%–1.0% toxic magnesium and calcium perchlorates (ClO4-). Inhaling or ingesting perchlorate dust inhibits thyroid iodine uptake and severely impairs human respiration.',
        recoveryHint:
            'Always use the exterior rear-entry Suitport to enter the habitat! Keep suits latched outside the pressurized cabin to prevent red dust contamination.',
        nasaReference: 'NASA Phoenix Mars Lander discovery of toxic perchlorate soil chemistry in 2008.',
        icon: '☠️',
    },

    THERMAL_FREEZE_POWER_LOSS: {
        reason: 'THERMAL_FREEZE_POWER_LOSS',
        title: 'Habitat Sub-Zero Freezing & Hypothermia',
        summary: 'Electrical grid blackout disabled habitat heating units during brutal sub-zero Martian night temperatures.',
        scientificExplanation:
            'Martian surface temperatures regularly plummet to -60°C to -120°C. Without active resistive heaters or waste heat pipes, habitat interiors freeze solid within hours.',
        recoveryHint:
            'Deploy the 10 kW Kilopower nuclear reactor during dust storms so thermal heaters never lose electrical power when solar arrays are obscured.',
        nasaReference: 'NASA KRUSTY (Kilopower Reactor Using Stirling Technology) thermal power architecture.',
        icon: '🥶',
    },

    RETURN_CAPSULE_OVERWEIGHT: {
        reason: 'RETURN_CAPSULE_OVERWEIGHT',
        title: 'Mars Ascent Vehicle (MAV) Overweight Abort',
        summary: 'Total liftoff mass of the Earth Return Vehicle exceeded the 15,000 kg rocket propellant thrust budget. Ascent stage failed to achieve escape velocity.',
        scientificExplanation:
            'The Tsiolkovsky rocket equation dictates that takeoff thrust is strictly limited by propellant mass fraction. Launching excess hardware or unmeasured payload results in ballistic crash.',
        recoveryHint:
            'Choose lightweight habitat shells (Inflatable Kevlar saves 650 kg) or jettison non-essential gear before igniting the ascent engine in Sol 7!',
        nasaReference: 'NASA Mars Sample Return (MSR) Mars Ascent Vehicle mass budget allocations.',
        icon: '🚀',
    },
};

// ============================================================================
// 2. MISSION ACHIEVEMENTS & FINAL SCORECARD
// ============================================================================

export interface MissionAchievementBadge {
    id: string;
    name: string;
    description: string;
    icon: string;
    unlocked: boolean;
}

export interface FinalMissionScorecard {
    totalScore: number; // 0 - 10,000
    rank: 'Junior Cadet' | 'Mars Explorer' | 'Flight Director' | 'Legendary Pioneer';
    solsSurvived: number;
    crewHealthPercent: number;
    finalOxygenPercent: number;
    finalWaterPercent: number;
    finalFoodPercent: number;
    cumulativeRadiationDoseMsv: number;
    badges: MissionAchievementBadge[];
    nasaComparisonSummary: string;
}

// ============================================================================
// 3. ABORT CHECK ENGINE
// ============================================================================

export class AbortManager {
    /**
     * Evaluates current game state against all 8 failure modes.
     * Returns whether an abort was triggered and provides full scientific root-cause details.
     */
    public static evaluateAbortState(state: OutpostGameState): {
        aborted: boolean;
        reason: AbortReason;
        explanation: AbortRootCause;
    } {
        // 1. Oxygen Depletion
        if (state.resources.oxygen <= 0) {
            return {
                aborted: true,
                reason: 'HYPOXIA_OXYGEN_DEPLETED',
                explanation: ABORT_ROOT_CAUSES.HYPOXIA_OXYGEN_DEPLETED,
            };
        }

        // 2. Water Depletion
        if (state.resources.water <= 0) {
            return {
                aborted: true,
                reason: 'DEHYDRATION_WATER_DEPLETED',
                explanation: ABORT_ROOT_CAUSES.DEHYDRATION_WATER_DEPLETED,
            };
        }

        // 3. Food Depletion
        if (state.resources.food <= 0) {
            return {
                aborted: true,
                reason: 'STARVATION_FOOD_DEPLETED',
                explanation: ABORT_ROOT_CAUSES.STARVATION_FOOD_DEPLETED,
            };
        }

        // 4. Acute Radiation Sickness (500 mSv limit)
        if (state.resources.radiationDose >= NASA_SPECS.CAREER_RADIATION_LIMIT_MSV) {
            return {
                aborted: true,
                reason: 'ACUTE_RADIATION_SICKNESS',
                explanation: ABORT_ROOT_CAUSES.ACUTE_RADIATION_SICKNESS,
            };
        }

        // 5. Perchlorate Toxicity (85% limit)
        if (state.environment.perchlorateLevel >= 85) {
            return {
                aborted: true,
                reason: 'PERCHLORATE_TOXICITY',
                explanation: ABORT_ROOT_CAUSES.PERCHLORATE_TOXICITY,
            };
        }

        // 6. Thermal Freezing
        if (
            state.resources.powerUsed > state.resources.powerAvailable &&
            !state.activeModules.includes('thermal_heater') &&
            state.resources.crewHealth <= 10
        ) {
            return {
                aborted: true,
                reason: 'THERMAL_FREEZE_POWER_LOSS',
                explanation: ABORT_ROOT_CAUSES.THERMAL_FREEZE_POWER_LOSS,
            };
        }

        // If existing state already marked an abort (e.g. from pressure experiment or overweight launch)
        if (state.status === 'emergency_abort' && state.abortReason !== 'NONE') {
            return {
                aborted: true,
                reason: state.abortReason,
                explanation: ABORT_ROOT_CAUSES[state.abortReason],
            };
        }

        return {
            aborted: false,
            reason: 'NONE',
            explanation: ABORT_ROOT_CAUSES.NONE,
        };
    }

    /**
     * Calculates final mission scorecard and awards badges for Diya's final screen.
     */
    public static calculateFinalScorecard(state: OutpostGameState): FinalMissionScorecard {
        const res = state.resources;
        const env = state.environment;

        // Base score calculations (0 - 10,000)
        let score = 0;
        score += res.crewHealth * 35; // Up to 3,500 pts
        score += res.oxygen * 15;     // Up to 1,500 pts
        score += res.water * 15;      // Up to 1,500 pts
        score += res.food * 15;       // Up to 1,500 pts

        // Radiation penalty: -4 pts per mSv absorbed
        const radPenalty = Math.round(res.radiationDose * 4);
        score = Math.max(0, score - radPenalty);

        // Regolith bonus
        if (env.regolithThicknessM >= 3.0) score += 1000;
        if (env.kilopowerActive) score += 500;
        if (state.mode === 'flight_director') score += 500; // Difficulty bonus

        score = Math.min(10000, Math.round(score));

        let rank: FinalMissionScorecard['rank'] = 'Junior Cadet';
        if (score >= 8500) rank = 'Legendary Pioneer';
        else if (score >= 6500) rank = 'Flight Director';
        else if (score >= 4500) rank = 'Mars Explorer';

        const badges: MissionAchievementBadge[] = [
            {
                id: 'red_planet_pioneer',
                name: 'Red Planet Pioneer',
                description: 'Survive all 7 Sols in the Martian wilderness.',
                icon: '🏅',
                unlocked: state.currentSol >= 7 && state.status !== 'emergency_abort',
            },
            {
                id: 'shield_of_jezero',
                name: 'Shield of Jezero',
                description: 'Constructed at least 3.0m of regolith radiation shielding.',
                icon: '🛡️',
                unlocked: env.regolithThicknessM >= 3.0,
            },
            {
                id: 'nuclear_vanguard',
                name: 'Nuclear Vanguard',
                description: 'Deployed and stabilized the colony with Kilopower fission.',
                icon: '⚛️',
                unlocked: env.kilopowerActive,
            },
            {
                id: 'martian_botanist',
                name: 'Martian Botanist',
                description: 'Cultivated and harvested hydroponic crops in the LED greenhouse.',
                icon: '🥔',
                unlocked: state.decisionLog.some((l) => l.includes('GREENHOUSE') || l.includes('potatoes')),
            },
            {
                id: 'deep_space_whisperer',
                name: 'Deep Space Whisperer',
                description: 'Successfully executed pre-programmed autonomous rover commands during blackout.',
                icon: '📡',
                unlocked: state.decisionLog.some((l) => l.includes('Autonomous Command Sequence') || l.includes('Executed pre-programmed')),
            },
            {
                id: 'ascent_master',
                name: 'Ascent Master',
                description: 'Launched the Mars Ascent Vehicle home safely within the 15,000 kg mass budget.',
                icon: '🚀',
                unlocked: state.status === 'mission_success',
            },
        ];

        const nasaComparisonSummary = `Your Outpost Sol team successfully preserved ${res.crewHealth.toFixed(0)}% crew health across 7 Martian Sols, keeping cumulative radiation to ${res.radiationDose.toFixed(1)} mSv (well below NASA's 500 mSv career limit). By applying In-Situ Resource Utilization (ISRU) for oxygen, water, and food, you proved human self-sufficiency on Mars is achievable!`;

        return {
            totalScore: score,
            rank,
            solsSurvived: state.currentSol,
            crewHealthPercent: res.crewHealth,
            finalOxygenPercent: res.oxygen,
            finalWaterPercent: res.water,
            finalFoodPercent: res.food,
            cumulativeRadiationDoseMsv: res.radiationDose,
            badges,
            nasaComparisonSummary,
        };
    }

    /**
     * Checkpoint recovery helper: allows Joyce's scene manager to retry a failed Sol
     * without resetting the entire campaign history.
     */
    public static restoreSolCheckpoint(state: OutpostGameState): OutpostGameState {
        return {
            ...state,
            status: 'in_progress',
            abortReason: 'NONE',
            resources: {
                ...state.resources,
                crewHealth: 100,
                oxygen: Math.max(35, state.resources.oxygen),
                water: Math.max(35, state.resources.water),
                food: Math.max(35, state.resources.food),
            },
            decisionLog: [...state.decisionLog, `Checkpoint Restored: Sol ${state.currentSol} restarted after emergency recovery.`],
        };
    }
}

