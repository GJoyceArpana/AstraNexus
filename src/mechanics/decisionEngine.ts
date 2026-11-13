import type { OutpostGameState } from './types.ts';
import { calculateLoadoutEffects, HABITAT_SHELL_CONFIGS, ROVER_TOOL_CONFIGS } from '../systems/TradeOffSystem.ts';
import { eventBus } from '../systems/EventManager.ts';

// ============================================================================
// 1. CASCADING CONSEQUENCE DATA STRUCTURES
// ============================================================================

export type ConsequenceType = 'BUFF' | 'DEBUFF' | 'CRUCIAL';

export interface DecisionConsequence {
    id: string;
    originSol: number;
    affectedSols: number[];
    title: string;
    description: string;
    type: ConsequenceType;
    icon: string;
    resourceModifiers: {
        oxygenLeakageDelta?: number;       // % extra daily O2 leak if hull was stressed
        waterHarvestMultiplier?: number;   // Yield modifier for subsurface ice
        regolithExcavationMultiplier?: number;
        perchlorateToxicityDelta?: number; // % extra perchlorate dust in cabin
        solarFlareDamageMultiplier?: number; // Modifies CME radiation in Sol 5
        returnCapsuleMassPenaltyKg?: number; // Extra mass on Sol 7 liftoff
        gridStabilityBonusKw?: number;     // Extra power stability in Sol 6
    };
    educationalLesson: string;
    nasaHistoricalComparison: string;
}

export interface DecisionEngineAudit {
    totalDecisionsLogged: number;
    activeConsequences: DecisionConsequence[];
    engineeringGrade: 'A+' | 'A' | 'B' | 'C' | 'D';
    strategicSummary: string;
    chainEvaluations: Array<{
        chainName: string;
        decisionMade: string;
        cascadingImpact: string;
        nasaComparison: string;
    }>;
}

// ============================================================================
// 2. CASCADING CONSEQUENCE ENGINE
// ============================================================================

export class DecisionEngine {
    /**
     * Evaluates all past player decisions recorded in the game state and determines
     * their compounding, cascading consequences on the current and upcoming Sols.
     */
    public static evaluateCascadingConsequences(state: OutpostGameState): DecisionConsequence[] {
        const consequences: DecisionConsequence[] = [];
        const currentSol = state.currentSol;
        const loadout = state.loadout;
        const env = state.environment;
        const log = state.decisionLog;

        // --------------------------------------------------------------------
        // CHAIN 1: Sol 0 Pressurization Quality -> Sols 1-7 Atmospheric Leakage
        // --------------------------------------------------------------------
        const pressurizedLog = log.find((l) => l.includes('Pressurized'));
        if (pressurizedLog) {
            const isHighStress = pressurizedLog.includes('HIGH_STRESS') || pressurizedLog.includes('80%') || pressurizedLog.includes('90%');
            if (isHighStress) {
                consequences.push({
                    id: 'consequence_micro_fissures',
                    originSol: 0,
                    affectedSols: [1, 2, 3, 4, 5, 6, 7],
                    title: 'Hull Micro-Fissures (Chronic O2 Leak)',
                    description: 'Over-pressurizing the habitat shell during Sol 0 stretched structural seams, causing a chronic -3% daily oxygen leak.',
                    type: 'DEBUFF',
                    icon: '💨',
                    resourceModifiers: {
                        oxygenLeakageDelta: -3.0,
                    },
                    educationalLesson: 'Pressure vessels in vacuum experience tensile hoop stress. Over-inflating creates microscopic structural flaws that bleed atmosphere.',
                    nasaHistoricalComparison: 'NASA designs space habitats (like Skylab and TransHab) with multi-layer redundant bladders to avoid permanent tensile deformation.',
                });
            } else {
                consequences.push({
                    id: 'consequence_perfect_seal',
                    originSol: 0,
                    affectedSols: [1, 2, 3, 4, 5, 6, 7],
                    title: 'Hermetic Hull Seal',
                    description: 'Calibrated atmospheric pressurization (34–55 kPa) preserved elastic seam integrity with 0% chronic leakage.',
                    type: 'BUFF',
                    icon: '🛡️',
                    resourceModifiers: {
                        oxygenLeakageDelta: 0,
                    },
                    educationalLesson: 'Operating at low pressure (~34 kPa pure O2) minimizes differential delta-P across the hull, preventing seam strain.',
                    nasaHistoricalComparison: 'Apollo spacecraft operated at 34 kPa pure oxygen, drastically reducing hull mass and preventing decompression leaks.',
                });
            }
        }

        // --------------------------------------------------------------------
        // CHAIN 2: Sol 0 Shell Selection -> Sol 7 MAV Return Rocket Payload
        // --------------------------------------------------------------------
        const shellConfig = HABITAT_SHELL_CONFIGS[loadout.habitatShell];
        if (shellConfig.sol7PayloadMassPenaltyKg > 0) {
            consequences.push({
                id: 'consequence_shell_payload_penalty',
                originSol: 0,
                affectedSols: [7],
                title: `Heavy Habitat Mass Penalty (+${shellConfig.sol7PayloadMassPenaltyKg} kg)`,
                description: `Choosing the rigid metallic hull adds ${shellConfig.sol7PayloadMassPenaltyKg} kg to the Sol 7 return launch budget, restricting sample return capacity.`,
                type: 'DEBUFF',
                icon: '⚖️',
                resourceModifiers: {
                    returnCapsuleMassPenaltyKg: shellConfig.sol7PayloadMassPenaltyKg,
                },
                educationalLesson: 'In aerospace engineering, initial payload mass follows the "Gear Ratio": every kg landed on Mars compounds into rocket fuel required to leave.',
                nasaHistoricalComparison: 'NASA’s Mars Sample Return architecture rigorously caps ascent vehicle mass at ~450 kg to ensure liftoff rockets fit inside transit heatshields.',
            });
        } else {
            consequences.push({
                id: 'consequence_lightweight_kevlar_bonus',
                originSol: 0,
                affectedSols: [7],
                title: 'Maximum Return Payload Margin (0 kg penalty)',
                description: 'The lightweight inflatable shell preserves maximum rocket thrust margin for Sol 7, allowing up to 500 kg of Martian rock samples.',
                type: 'BUFF',
                icon: '💎',
                resourceModifiers: {
                    returnCapsuleMassPenaltyKg: 0,
                },
                educationalLesson: 'Expandable habitats compact into lightweight launch envelopes, leaving surplus rocket capacity for science return payloads.',
                nasaHistoricalComparison: 'NASA BEAM on the ISS proved expandable Kevlar/Vectran structures provide maximum habitable volume per kilogram of rocket fairing mass.',
            });
        }

        // --------------------------------------------------------------------
        // CHAIN 3: Sol 1 Regolith Shielding Depth -> Sol 5 Solar Flare Survival
        // --------------------------------------------------------------------
        if (currentSol >= 1) {
            if (env.regolithThicknessM >= 3.0) {
                consequences.push({
                    id: 'consequence_bunker_storm_immunity',
                    originSol: 1,
                    affectedSols: [5],
                    title: 'Basalt Radiation Vault (96% Flare Protection)',
                    description: 'The 3.0m regolith mound built during Sol 1 absorbs 96% of Sol 5’s Coronal Mass Ejection, reducing a lethal 85 mSv flare to just 3.4 mSv!',
                    type: 'BUFF',
                    icon: '🏰',
                    resourceModifiers: {
                        solarFlareDamageMultiplier: 0.04,
                    },
                    educationalLesson: 'Compacted Martian soil is dense in basalt and silicates, which absorb secondary neutrons and high-energy solar proton radiation.',
                    nasaHistoricalComparison: 'NASA Langley’s Mars Ice Dome and 3D-Printed Habitat Challenge emphasize subterranean regolith shielding for radiation mitigation.',
                });
            } else if (env.regolithThicknessM < 2.0 && currentSol >= 4) {
                consequences.push({
                    id: 'consequence_unshielded_storm_danger',
                    originSol: 1,
                    affectedSols: [5],
                    title: 'Inadequate Radiation Shielding (Severe CME Exposure)',
                    description: 'Habitat roof has less than 2.0m of regolith. The incoming Sol 5 solar flare will penetrate the living quarters with high radiation dose!',
                    type: 'DEBUFF',
                    icon: '⚠️',
                    resourceModifiers: {
                        solarFlareDamageMultiplier: 0.75, // 75% of lethal flare penetrates
                    },
                    educationalLesson: 'Thin habitat roofs fail to attenuate Galactic Cosmic Rays and Coronal Mass Ejections, leading to chromosome damage and Acute Radiation Sickness.',
                    nasaHistoricalComparison: 'During the August 1972 solar storm (between Apollo 16 and 17), an unshielded astronaut on the Moon would have received a lethal radiation dose.',
                });
            }
        }

        // --------------------------------------------------------------------
        // CHAIN 4: Sol 0 Rover Tool -> Sol 3 Storm & Sol 4 Water Extraction
        // --------------------------------------------------------------------
        const toolEffects = calculateLoadoutEffects(loadout);
        if (loadout.roverTool === 'regolith_dozer') {
            consequences.push({
                id: 'consequence_dozer_synergy',
                originSol: 0,
                affectedSols: [1, 3],
                title: 'Dozer Earthmoving & Panel Clearing Utility',
                description: 'The front blade allowed rapid regolith excavation in Sol 1 and clears storm dust off solar panels in Sol 3, but mines ice slowly in Sol 4.',
                type: 'CRUCIAL',
                icon: '🚜',
                resourceModifiers: {
                    regolithExcavationMultiplier: 2.5,
                    solarClearingAbility: true,
                    waterHarvestMultiplier: 0.7,
                },
                educationalLesson: 'Specialized heavy earthmoving equipment is superior for planetary surface construction but poor at deep cryo-coring.',
                nasaHistoricalComparison: 'NASA’s RASSOR excavation rover is optimized to haul metric tons of loose regolith while leaving deep coring to specialized drills.',
            });
        } else if (loadout.roverTool === 'percussion_drill') {
            consequences.push({
                id: 'consequence_drill_water_surplus',
                originSol: 0,
                affectedSols: [4],
                title: 'TRIDENT Cryo-Drill High Water Yield (+150%)',
                description: 'The percussion core drill yields 2.5x more water ice in Sol 4, permanently securing colony hydration and hydroponics.',
                type: 'BUFF',
                icon: '🔩',
                resourceModifiers: {
                    waterHarvestMultiplier: 2.5,
                },
                educationalLesson: 'Subsurface rotary percussion coring fractures dense permafrost ice lenses that surface scoops cannot penetrate.',
                nasaHistoricalComparison: 'NASA VIPER and PRIME-1 carry the TRIDENT percussion drill to extract water ice up to 1 meter beneath lunar polar craters.',
            });
        }

        // --------------------------------------------------------------------
        // CHAIN 5: Sol 2 Suitport Protocol -> Sols 3-7 Air Quality
        // --------------------------------------------------------------------
        if (currentSol >= 2) {
            if (env.perchlorateLevel > 20) {
                consequences.push({
                    id: 'consequence_perchlorate_contamination',
                    originSol: 2,
                    affectedSols: [3, 4, 5, 6, 7],
                    title: 'Toxic Dust Cabin Infiltration',
                    description: 'Bypassing the exterior Suitport allowed toxic perchlorates into the cabin, causing progressive respiratory and crew health degradation.',
                    type: 'DEBUFF',
                    icon: '☣️',
                    resourceModifiers: {
                        perchlorateToxicityDelta: 10,
                    },
                    educationalLesson: 'Martian dust contains reactive oxidizers and perchlorates that cling electrostatically to spacesuits and must be quarantined outside.',
                    nasaHistoricalComparison: 'Apollo astronauts noted lunar dust smelled like gunpowder and caused severe hay-fever-like symptoms ("lunar dust sickness") inside the LM.',
                });
            } else {
                consequences.push({
                    id: 'consequence_sterile_air_quality',
                    originSol: 2,
                    affectedSols: [3, 4, 5, 6, 7],
                    title: 'Decontaminated Habitat Air',
                    description: 'Strict Suitport airlock discipline prevented red chemical dust from entering quarters, maintaining 100% crew respiratory health.',
                    type: 'BUFF',
                    icon: '🌱',
                    resourceModifiers: {
                        perchlorateToxicityDelta: 0,
                    },
                    educationalLesson: 'Suitports keep the dusty spacesuit outside the habitat shell, allowing the astronaut to slide in through a sealed rear hatch.',
                    nasaHistoricalComparison: 'NASA Johnson Space Center designed the Suitport concept specifically to solve the planetary dust contamination dilemma.',
                });
            }
        }

        // --------------------------------------------------------------------
        // CHAIN 6: Sol 3 Kilopower Activation -> Sol 6 Multi-System Stability
        // --------------------------------------------------------------------
        if (currentSol >= 3 && env.kilopowerActive) {
            consequences.push({
                id: 'consequence_nuclear_grid_stability',
                originSol: 3,
                affectedSols: [6],
                title: 'Nuclear Micro-Grid Stabilization (+10 kW)',
                description: 'Deploying the KRUSTY nuclear reactor during Sol 3 ensures the heavy 4-module continuous load in Sol 6 runs without tripping breakers.',
                type: 'BUFF',
                icon: '⚛️',
                resourceModifiers: {
                    gridStabilityBonusKw: 10.0,
                },
                educationalLesson: 'Fission surface power provides uninterruptible baseload electricity immune to diurnal night cycles and global dust storms.',
                nasaHistoricalComparison: 'NASA’s Fission Surface Power project targets a 40 kW nuclear reactor for lunar Artemis basecamps and Mars outposts by early 2030s.',
            });
        }

        return consequences;
    }

    /**
     * Applies all active consequence modifiers directly to the game state.
     */
    public static applyCascadingConsequences(state: OutpostGameState): OutpostGameState {
        const consequences = DecisionEngine.evaluateCascadingConsequences(state);
        let updatedState = { ...state };

        for (const cons of consequences) {
            // Apply oxygen leak
            if (cons.resourceModifiers.oxygenLeakageDelta) {
                updatedState = {
                    ...updatedState,
                    resources: {
                        ...updatedState.resources,
                        oxygen: Math.max(0, updatedState.resources.oxygen + cons.resourceModifiers.oxygenLeakageDelta * 0.1),
                    },
                };
            }

            // Apply perchlorate dust buildup
            if (cons.resourceModifiers.perchlorateToxicityDelta) {
                updatedState = {
                    ...updatedState,
                    environment: {
                        ...updatedState.environment,
                        perchlorateLevel: Math.min(100, updatedState.environment.perchlorateLevel + cons.resourceModifiers.perchlorateToxicityDelta * 0.1),
                    },
                };
            }
        }

        return updatedState;
    }

    /**
     * Generates a comprehensive decision trail audit for Diya's final NASA comparison screen.
     */
    public static generateNasaDecisionAudit(state: OutpostGameState): DecisionEngineAudit {
        const consequences = DecisionEngine.evaluateCascadingConsequences(state);
        const log = state.decisionLog;

        const buffCount = consequences.filter((c) => c.type === 'BUFF').length;
        const debuffCount = consequences.filter((c) => c.type === 'DEBUFF').length;

        let engineeringGrade: DecisionEngineAudit['engineeringGrade'] = 'B';
        if (buffCount >= 4 && debuffCount === 0) engineeringGrade = 'A+';
        else if (buffCount >= 3 && debuffCount <= 1) engineeringGrade = 'A';
        else if (debuffCount >= 3) engineeringGrade = 'C';

        const chainEvaluations = consequences.map((c) => ({
            chainName: c.title,
            decisionMade: `Originated in Sol ${c.originSol}`,
            cascadingImpact: c.description,
            nasaComparison: c.nasaHistoricalComparison,
        }));

        const strategicSummary = `Your outpost architecture demonstrated ${engineeringGrade}-grade engineering efficiency. By making decisions in Sols 0–3 that anticipated the Sol 5 solar flare and Sol 7 return capsule constraints, your engineering choices aligned closely with real-world NASA In-Situ Resource Utilization (ISRU) doctrines.`;

        return {
            totalDecisionsLogged: log.length,
            activeConsequences: consequences,
            engineeringGrade,
            strategicSummary,
            chainEvaluations,
        };
    }
}

