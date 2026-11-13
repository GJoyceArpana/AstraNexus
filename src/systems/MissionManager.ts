import type {
    AbortReason,
    DifficultyMode,
    ModuleId,
    OutpostGameState,
    RoverActionType,
} from '../mechanics/types.ts';
import {
    calculatePowerDemand,
    calculatePowerGeneration,
    calculateRadiationExposure,
    NASA_SPECS,
} from './ResourceManager.ts';
import { calculateLoadoutEffects } from './TradeOffSystem.ts';
import { eventBus } from './EventManager.ts';

// ============================================================================
// 1. MISSION OBJECTIVE DATA STRUCTURE
// ============================================================================

export interface MissionObjective {
    id: string;
    solNumber: number;
    title: string;
    description: string;
    completed: boolean;
    progressCurrent: number;
    progressTarget: number;
    unit: string;
    nasaFact: string;
}

// Maximum allowed liftoff mass for the Mars Ascent Vehicle (MAV)
export const MAX_RETURN_CAPSULE_MASS_KG = 15000;

// Base MAV components
export const MAV_BASE_MASS = {
    rocketDryMassKg: 9500,
    propellantMassKg: 3500,
    crewAndSuppliesKg: 1200,
};

// ============================================================================
// 2. MISSION MANAGER CLASS & ENGINE
// ============================================================================

export class MissionManager {
    /**
     * Retrieves the active mission objectives for the current Sol.
     */
    public static getObjectivesForSol(state: OutpostGameState): MissionObjective[] {
        const sol = state.currentSol;
        const loadoutEffects = calculateLoadoutEffects(state.loadout);
        const objectives: MissionObjective[] = [];

        switch (sol) {
            case 0:
                objectives.push({
                    id: 'sol0_pressurize',
                    solNumber: 0,
                    title: 'Pressurize Habitat',
                    description: 'Pump atmospheric mix to at least 34.0 kPa without popping the tent shell.',
                    completed: state.environment.internalPressureKpa >= 34.0,
                    progressCurrent: Number(state.environment.internalPressureKpa.toFixed(1)),
                    progressTarget: 34.0,
                    unit: 'kPa',
                    nasaFact: 'Apollo and EVA suits operate at ~34 kPa pure O2 to reduce shell stress in vacuum.',
                });
                break;

            case 1: {
                const targetMeters = loadoutEffects.regolithTargetMeters;
                const currentMeters = state.environment.regolithThicknessM;
                objectives.push(
                    {
                        id: 'sol1_pile_regolith',
                        solNumber: 1,
                        title: 'Excavate Regolith Shield',
                        description: `Use the rover to pile at least ${targetMeters}m of Martian soil over the habitat roof.`,
                        completed: currentMeters >= targetMeters,
                        progressCurrent: Number(currentMeters.toFixed(1)),
                        progressTarget: targetMeters,
                        unit: 'm',
                        nasaFact: '3 meters of Martian regolith blocks ~95% of cosmic rays and solar radiation.',
                    },
                    {
                        id: 'sol1_rad_safe',
                        solNumber: 1,
                        title: 'Verify Radiation Shielding',
                        description: 'Ensure interior daily dose drops to safe background levels (<0.15 mSv/Sol).',
                        completed: currentMeters >= targetMeters,
                        progressCurrent: currentMeters >= targetMeters ? 0.05 : 0.70,
                        progressTarget: 0.15,
                        unit: 'mSv',
                        nasaFact: 'Curiosity’s RAD instrument showed unshielded surface doses can reach 300+ mSv/year.',
                    }
                );
                break;
            }

            case 2:
                objectives.push(
                    {
                        id: 'sol2_perchlorate_check',
                        solNumber: 2,
                        title: 'Suitport Air Isolation',
                        description: 'Keep interior toxic perchlorate contamination below 20% during surface EVAs.',
                        completed: state.environment.perchlorateLevel < 20,
                        progressCurrent: Math.round(state.environment.perchlorateLevel),
                        progressTarget: 20,
                        unit: '%',
                        nasaFact: 'Phoenix lander discovered perchlorates (0.5-1.0%) in Martian soil, which are toxic to humans.',
                    },
                    {
                        id: 'sol2_sample_soil',
                        solNumber: 2,
                        title: 'Sample Martian Regolith',
                        description: 'Use the rover arm to collect geological samples from the crater floor.',
                        completed: state.decisionLog.some((l) => l.includes('Sampled soil')),
                        progressCurrent: state.decisionLog.filter((l) => l.includes('Sampled soil')).length,
                        progressTarget: 1,
                        unit: 'sample',
                        nasaFact: 'Perseverance gathers core samples and seals them in titanium tubes for Earth return.',
                    }
                );
                break;

            case 3:
                objectives.push(
                    {
                        id: 'sol3_activate_kilopower',
                        solNumber: 3,
                        title: 'Deploy Kilopower Fission Reactor',
                        description: 'Dust storm has cut solar by 75%! Activate the 10 kW nuclear reactor.',
                        completed: state.environment.kilopowerActive,
                        progressCurrent: state.environment.kilopowerActive ? 10 : 0,
                        progressTarget: 10,
                        unit: 'kW',
                        nasaFact: 'NASA KRUSTY (Kilopower) uses a cast uranium-235 core and sodium heat pipes to make 10 kW.',
                    },
                    {
                        id: 'sol3_clean_panels',
                        solNumber: 3,
                        title: 'Scrape Solar Array Clean',
                        description: 'Drive the rover dozer to scrape atmospheric dust off the solar array glass.',
                        completed: state.decisionLog.some((l) => l.includes('Cleaned solar panels')),
                        progressCurrent: state.decisionLog.filter((l) => l.includes('Cleaned solar panels')).length,
                        progressTarget: 1,
                        unit: 'clean',
                        nasaFact: 'Opportunity rover was saved multiple times by "cleaning events" where wind cleared panel dust.',
                    }
                );
                break;

            case 4: {
                const active = state.activeModules;
                objectives.push(
                    {
                        id: 'sol4_moxie_o2',
                        solNumber: 4,
                        title: 'MOXIE Oxygen Production',
                        description: 'Power MOXIE to generate fresh O2 from atmospheric CO2 (+24%/Sol).',
                        completed: active.includes('moxie'),
                        progressCurrent: active.includes('moxie') ? 24 : 0,
                        progressTarget: 24,
                        unit: '% O2',
                        nasaFact: 'MOXIE on Mars completed 16 successful runs, producing 122 grams of breathable oxygen.',
                    },
                    {
                        id: 'sol4_ice_melter',
                        solNumber: 4,
                        title: 'Subsurface Ice Harvesting',
                        description: 'Power the Ice Melter or use the TRIDENT drill to extract fresh water.',
                        completed: active.includes('water_extractor') || state.decisionLog.some((l) => l.includes('Drilled subsurface ice')),
                        progressCurrent: active.includes('water_extractor') ? 20 : 0,
                        progressTarget: 20,
                        unit: '% H2O',
                        nasaFact: 'Glaciers buried under centimeters of dust in Arcadia Planitia hold vast clean water reserves.',
                    },
                    {
                        id: 'sol4_led_potatoes',
                        solNumber: 4,
                        title: 'Hydroponic Potato Cultivation',
                        description: 'Power the LED Greenhouse to grow fresh crops (+16% food/Sol).',
                        completed: active.includes('led_greenhouse'),
                        progressCurrent: active.includes('led_greenhouse') ? 16 : 0,
                        progressTarget: 16,
                        unit: '% Food',
                        nasaFact: 'The International Potato Center (CIP) and NASA proved hearty potatoes can grow in Mars-like soil.',
                    }
                );
                break;
            }

            case 5:
                objectives.push(
                    {
                        id: 'sol5_storm_shelter',
                        solNumber: 5,
                        title: 'Crew Solar Storm Shelter',
                        description: 'Get all astronauts inside the thick regolith bunker before CME particles hit.',
                        completed: state.environment.regolithThicknessM >= 2.5,
                        progressCurrent: Number(state.environment.regolithThicknessM.toFixed(1)),
                        progressTarget: 2.5,
                        unit: 'm regolith',
                        nasaFact: 'Coronal Mass Ejections (CMEs) fire billion-ton clouds of magnetized solar plasma across space.',
                    },
                    {
                        id: 'sol5_queue_commands',
                        solNumber: 5,
                        title: 'Pre-Programmed Command Queue',
                        description: 'Queue autonomous rover commands to execute during the 12-minute radio blackout.',
                        completed: state.decisionLog.some((l) => l.includes('Executed pre-programmed')),
                        progressCurrent: state.decisionLog.filter((l) => l.includes('Executed pre-programmed')).length,
                        progressTarget: 1,
                        unit: 'sequence',
                        nasaFact: 'Curiosity and Perseverance drive autonomously using Hazcams and visual odometry during radio delays.',
                    }
                );
                break;

            case 6: {
                const isOverloaded = state.resources.powerUsed > state.resources.powerAvailable;
                const bufferSafe = state.resources.oxygen >= 50 && state.resources.water >= 50 && state.resources.food >= 50;
                objectives.push(
                    {
                        id: 'sol6_grid_balance',
                        solNumber: 6,
                        title: 'Sustain Colony Grid Surplus',
                        description: 'Maintain electrical balance under continuous load with 0 breaker trips.',
                        completed: !isOverloaded && state.activeModules.length >= 3,
                        progressCurrent: Math.max(0, state.resources.powerAvailable - state.resources.powerUsed),
                        progressTarget: 1.0,
                        unit: 'kW surplus',
                        nasaFact: 'Power distribution on the ISS uses 120V DC architecture with computerized load-shedding.',
                    },
                    {
                        id: 'sol6_resource_buffer',
                        solNumber: 6,
                        title: 'Maintain 50% Emergency Buffers',
                        description: 'Ensure Oxygen, Water, and Food all remain above 50% safety reserves.',
                        completed: bufferSafe,
                        progressCurrent: Math.min(state.resources.oxygen, state.resources.water, state.resources.food),
                        progressTarget: 50,
                        unit: '% min',
                        nasaFact: 'NASA space missions enforce strict "redundancy buffers" (two-failure tolerance for life-support).',
                    }
                );
                break;
            }

            case 7: {
                const budget = MissionManager.calculateReturnCapsuleBudget(state, 150);
                objectives.push(
                    {
                        id: 'sol7_mass_budget',
                        solNumber: 7,
                        title: 'Return Vehicle Mass Budget',
                        description: 'Ensure total takeoff mass does not exceed the 15,000 kg rocket limit.',
                        completed: !budget.isOverweight,
                        progressCurrent: budget.totalMassKg,
                        progressTarget: MAX_RETURN_CAPSULE_MASS_KG,
                        unit: 'kg',
                        nasaFact: 'The Tsiolkovsky rocket equation dictates that exponential fuel is required for every extra kg launched.',
                    },
                    {
                        id: 'sol7_launch',
                        solNumber: 7,
                        title: 'Ascent Stage Ignition',
                        description: 'Ignite the MAV engine to blast off from Mars and return to Earth!',
                        completed: state.status === 'mission_success',
                        progressCurrent: state.status === 'mission_success' ? 1 : 0,
                        progressTarget: 1,
                        unit: 'launch',
                        nasaFact: 'The Mars Ascent Vehicle (MAV) will be the first rocket ever to launch from the surface of another planet.',
                    }
                );
                break;
            }
        }

        return objectives;
    }

    // ========================================================================
    // 3. ROVER SURFACE ACTIONS (Task #7 Integration)
    // ========================================================================

    /**
     * Executes an active rover field operation.
     */
    public static performRoverAction(
        state: OutpostGameState,
        action: RoverActionType
    ): { state: OutpostGameState; success: boolean; message: string } {
        const effects = calculateLoadoutEffects(state.loadout);
        let nextState = { ...state };

        switch (action) {
            case 'pile_regolith': {
                // Battery drain: 10% (dozer) or 15% (others)
                const batCost = state.loadout.roverTool === 'regolith_dozer' ? 10 : 15;
                if (nextState.resources.roverBattery < batCost) {
                    return { state, success: false, message: `Insufficient rover battery! Needs ${batCost}%.` };
                }

                // Thickness yield: 1.25m (dozer) or 0.5m (others)
                const thicknessYield = Number((0.5 * effects.regolithPilingSpeedMultiplier).toFixed(2));
                const nextThickness = Number(
                    (nextState.environment.regolithThicknessM + thicknessYield).toFixed(2)
                );

                nextState = {
                    ...nextState,
                    resources: {
                        ...nextState.resources,
                        roverBattery: nextState.resources.roverBattery - batCost,
                    },
                    environment: {
                        ...nextState.environment,
                        regolithThicknessM: nextThickness,
                    },
                    decisionLog: [
                        ...nextState.decisionLog,
                        `Rover Action: Piled +${thicknessYield}m regolith (Total: ${nextThickness}m). Battery: -${batCost}%.`,
                    ],
                };

                eventBus.emit('NOTIFICATION', {
                    message: `🏗️ Piled +${thicknessYield}m regolith! Shield depth: ${nextThickness}m.`,
                    color: '#8ce8b8',
                });
                break;
            }

            case 'clean_solar_panels': {
                const batCost = 10;
                if (nextState.resources.roverBattery < batCost) {
                    return { state, success: false, message: `Insufficient rover battery! Needs ${batCost}%.` };
                }

                // Lowers effective dust intensity, restoring power
                const currentDust = nextState.environment.dustStormIntensity;
                const nextDust = Math.max(0, Number((currentDust - 0.25).toFixed(2)));

                nextState = {
                    ...nextState,
                    resources: {
                        ...nextState.resources,
                        roverBattery: nextState.resources.roverBattery - batCost,
                    },
                    environment: {
                        ...nextState.environment,
                        dustStormIntensity: nextDust,
                    },
                    decisionLog: [
                        ...nextState.decisionLog,
                        `Rover Action: Cleaned solar panels. Dust opacity reduced from ${currentDust} to ${nextDust}.`,
                    ],
                };

                eventBus.emit('NOTIFICATION', {
                    message: '☀️ Solar panels scraped clean! Electrical output restored.',
                    color: '#f4bd58',
                });
                break;
            }

            case 'drill_ice': {
                const batCost = state.loadout.roverTool === 'percussion_drill' ? 12 : 16;
                if (nextState.resources.roverBattery < batCost) {
                    return { state, success: false, message: `Insufficient rover battery! Needs ${batCost}%.` };
                }

                const waterGain = Number((15 * effects.iceMiningYieldMultiplier).toFixed(1));
                const nextWater = Math.min(100, nextState.resources.water + waterGain);

                nextState = {
                    ...nextState,
                    resources: {
                        ...nextState.resources,
                        water: nextWater,
                        roverBattery: nextState.resources.roverBattery - batCost,
                    },
                    decisionLog: [
                        ...nextState.decisionLog,
                        `Rover Action: Drilled subsurface ice. Yielded +${waterGain}% water.`,
                    ],
                };

                eventBus.emit('NOTIFICATION', {
                    message: `💧 Harvested subsurface ice permafrost (+${waterGain}% water)!`,
                    color: '#53d9f5',
                });
                break;
            }

            case 'sample_soil': {
                const batCost = 12;
                if (nextState.resources.roverBattery < batCost) {
                    return { state, success: false, message: `Insufficient rover battery! Needs ${batCost}%.` };
                }

                // If suitport is unsealed, perchlorate dust enters hab
                const perchlorateSpike = nextState.environment.suitportSealed ? 0 : 15;
                const nextPerchlorate = Math.min(100, nextState.environment.perchlorateLevel + perchlorateSpike);

                const scienceBonus = effects.scienceScoreBonusPercent;
                const note = effects.perchlorateScanningActive
                    ? 'SHERLOC arm detected safe sample site with zero perchlorate contamination.'
                    : 'Soil sample collected.';

                nextState = {
                    ...nextState,
                    resources: {
                        ...nextState.resources,
                        roverBattery: nextState.resources.roverBattery - batCost,
                    },
                    environment: {
                        ...nextState.environment,
                        perchlorateLevel: nextPerchlorate,
                    },
                    decisionLog: [
                        ...nextState.decisionLog,
                        `Rover Action: Sampled soil (${note}, +${scienceBonus}% science). Perchlorate: +${perchlorateSpike}%.`,
                    ],
                };

                eventBus.emit('NOTIFICATION', {
                    message: `🔬 Sampled crater soil! ${effects.perchlorateScanningActive ? 'Perchlorates flagged!' : ''}`,
                    color: '#65E5FF',
                });
                break;
            }

            case 'enter_storm_shelter': {
                nextState = {
                    ...nextState,
                    decisionLog: [...nextState.decisionLog, 'Rover secured inside storm shelter.'],
                };
                eventBus.emit('NOTIFICATION', {
                    message: '🛡️ Rover secured in subterranean hangar!',
                    color: '#8ce8b8',
                });
                break;
            }
        }

        eventBus.emit('RESOURCE_UPDATED', nextState.resources);
        return { state: nextState, success: true, message: 'Rover action completed.' };
    }

    // ========================================================================
    // 4. SOL 3: KILOPOWER NUCLEAR REACTOR TOGGLE
    // ========================================================================

    public static toggleKilopower(state: OutpostGameState): {
        state: OutpostGameState;
        activated: boolean;
        message: string;
    } {
        const nextActive = !state.environment.kilopowerActive;
        const nextEnv = {
            ...state.environment,
            kilopowerActive: nextActive,
        };

        const powerGen = calculatePowerGeneration({ ...state, environment: nextEnv });

        const nextState: OutpostGameState = {
            ...state,
            environment: nextEnv,
            resources: {
                ...state.resources,
                powerAvailable: powerGen.totalKw,
            },
            decisionLog: [
                ...state.decisionLog,
                `Kilopower Reactor: ${nextActive ? 'ACTIVATED (+10 kW steady fission power)' : 'DEACTIVATED'}. Total grid: ${powerGen.totalKw} kW.`,
            ],
        };

        eventBus.emit('NOTIFICATION', {
            message: nextActive
                ? '⚛️ KILOPOWER ONLINE: 10 kW continuous nuclear fission active!'
                : '⚛️ KILOPOWER OFFLINE: Reactor on standby.',
            color: nextActive ? '#40FFAA' : '#FFA500',
        });
        eventBus.emit('RESOURCE_UPDATED', nextState.resources);

        return {
            state: nextState,
            activated: nextActive,
            message: nextActive ? 'Kilopower reactor is now supplying 10 kW continuous power.' : 'Kilopower shut down.',
        };
    }

    // ========================================================================
    // 5. SOL 5: AUTONOMOUS COMMAND QUEUEING (Comms Blackout Challenge)
    // ========================================================================

    public static queueStormCommand(
        state: OutpostGameState,
        action: RoverActionType
    ): { state: OutpostGameState; success: boolean; message: string } {
        const loadoutEffects = calculateLoadoutEffects(state.loadout);
        const maxSlots = loadoutEffects.stormCommandQueueSlots; // 3 standard, 5 with comms dish

        if (state.queuedStormCommands.length >= maxSlots) {
            return {
                state,
                success: false,
                message: `Command queue full! Max ${maxSlots} autonomous instructions allowed.`,
            };
        }

        const nextQueue = [...state.queuedStormCommands, action];
        const nextState: OutpostGameState = {
            ...state,
            queuedStormCommands: nextQueue,
            decisionLog: [...state.decisionLog, `Queued Autonomous Command: [${action}] (${nextQueue.length}/${maxSlots}).`],
        };

        return {
            state: nextState,
            success: true,
            message: `Command [${action}] added to autonomous buffer (${nextQueue.length}/${maxSlots}).`,
        };
    }

    public static executeQueuedStormCommands(state: OutpostGameState): {
        state: OutpostGameState;
        executedCount: number;
        log: string[];
    } {
        let current = { ...state };
        const log: string[] = [];
        const queue = [...current.queuedStormCommands];

        for (const action of queue) {
            const res = MissionManager.performRoverAction(current, action);
            log.push(`${action}: ${res.message}`);
            current = res.state;
        }

        const nextState: OutpostGameState = {
            ...current,
            queuedStormCommands: [],
            decisionLog: [
                ...current.decisionLog,
                `Executed pre-programmed commands (${queue.length} commands during blackout).`,
            ],
        };

        eventBus.emit('NOTIFICATION', {
            message: `🤖 Autonomous Command Sequence executed successfully (${queue.length} actions)!`,
            color: '#8ce8b8',
        });

        return { state: nextState, executedCount: queue.length, log };
    }

    // ========================================================================
    // 6. SOL 7: RETURN CAPSULE MASS & VOLUME BUDGET
    // ========================================================================

    public static calculateReturnCapsuleBudget(
        state: OutpostGameState,
        samplesMassKg: number = 100
    ): {
        rocketDryMassKg: number;
        propellantMassKg: number;
        crewAndSuppliesKg: number;
        shellPayloadPenaltyKg: number;
        samplesMassKg: number;
        totalMassKg: number;
        maxCapacityKg: number;
        marginKg: number;
        isOverweight: boolean;
        canLaunch: boolean;
    } {
        const loadoutEffects = calculateLoadoutEffects(state.loadout);
        const shellPenalty = loadoutEffects.sol7PayloadMassPenaltyKg; // 0 (Kevlar), 250 (Hybrid), 650 (Rigid)

        const totalMassKg =
            MAV_BASE_MASS.rocketDryMassKg +
            MAV_BASE_MASS.propellantMassKg +
            MAV_BASE_MASS.crewAndSuppliesKg +
            shellPenalty +
            samplesMassKg;

        const marginKg = MAX_RETURN_CAPSULE_MASS_KG - totalMassKg;
        const isOverweight = totalMassKg > MAX_RETURN_CAPSULE_MASS_KG;
        const canLaunch = !isOverweight && state.resources.crewHealth > 20;

        return {
            rocketDryMassKg: MAV_BASE_MASS.rocketDryMassKg,
            propellantMassKg: MAV_BASE_MASS.propellantMassKg,
            crewAndSuppliesKg: MAV_BASE_MASS.crewAndSuppliesKg,
            shellPayloadPenaltyKg: shellPenalty,
            samplesMassKg,
            totalMassKg,
            maxCapacityKg: MAX_RETURN_CAPSULE_MASS_KG,
            marginKg,
            isOverweight,
            canLaunch,
        };
    }

    /**
     * Executes the final Mars Ascent Vehicle (MAV) launch.
     * Completes the entire game if successful, or triggers an overweight abort.
     */
    public static launchReturnCapsule(
        state: OutpostGameState,
        samplesMassKg: number = 100
    ): { state: OutpostGameState; success: boolean; message: string } {
        const budget = MissionManager.calculateReturnCapsuleBudget(state, samplesMassKg);

        if (budget.isOverweight) {
            const abortState: OutpostGameState = {
                ...state,
                status: 'emergency_abort',
                abortReason: 'RETURN_CAPSULE_OVERWEIGHT',
                decisionLog: [
                    ...state.decisionLog,
                    `Mission Failed: ERV failed to achieve escape velocity! Overweight by ${Math.abs(budget.marginKg)} kg.`,
                ],
            };
            eventBus.emit('EMERGENCY_ABORT', {
                reason: 'RETURN_CAPSULE_OVERWEIGHT',
                state: abortState,
            });
            return {
                state: abortState,
                success: false,
                message: `Liftoff Aborted! Return capsule is overweight by ${Math.abs(budget.marginKg)} kg. Jettison heavy equipment!`,
            };
        }

        const victoryState: OutpostGameState = {
            ...state,
            status: 'mission_success',
            decisionLog: [
                ...state.decisionLog,
                `MISSION SUCCESS: MAV successfully reached Mars orbit carrying ${samplesMassKg} kg of geological samples and healthy crew!`,
            ],
        };

        eventBus.emit('MISSION_SUCCESS', victoryState);
        eventBus.emit('NOTIFICATION', {
            message: '🚀 LIFTOFF SUCCESSFUL! Outpost Sol Mission Complete!',
            color: '#40FFAA',
        });

        return {
            state: victoryState,
            success: true,
            message: `Ascent engine ignited! Mars gravity escaped with ${budget.marginKg} kg payload margin.`,
        };
    }
}

