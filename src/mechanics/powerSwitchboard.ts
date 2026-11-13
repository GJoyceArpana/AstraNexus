import type { DifficultyMode, ModuleId, OutpostGameState } from './types.ts';
import {
    calculatePowerDemand,
    calculatePowerGeneration,
    NASA_SPECS,
} from '../systems/ResourceManager.ts';
import { eventBus } from '../systems/EventManager.ts';

// ============================================================================
// 1. MODULE DEFINITIONS & SPECIFICATIONS (For Anusha's Switchboard UI)
// ============================================================================

export interface SwitchboardModuleInfo {
    id: ModuleId;
    name: string;
    shortLabel: string;
    icon: string;
    powerDrawKw: number;
    priority: number; // 1 = Highest (Life Support), 6 = Lowest (Comms)
    isLifeCritical: boolean;
    description: string;
    statusDescription: {
        powered: string;
        unpowered: string;
    };
    nasaFact: string;
}

export const SWITCHBOARD_MODULES: Record<ModuleId, SwitchboardModuleInfo> = {
    life_support: {
        id: 'life_support',
        name: 'ECLSS Atmospheric & Water Loop',
        shortLabel: 'LIFE SUPPORT',
        icon: '🫧',
        powerDrawKw: NASA_SPECS.MODULE_POWER_DRAW_KW.life_support, // 3.0 kW
        priority: 1, // Top priority: Never trips first
        isLifeCritical: true,
        description:
            'Recycles exhaled CO2 back into breathable O2 (75% recovery) and purifies crew greywater (90% recovery). Essential for long-term survival.',
        statusDescription: {
            powered: 'ONLINE: Scrubbing CO2 and recycling 90% of greywater.',
            unpowered: 'OFFLINE: WARNING! O2 and water reserves draining rapidly!',
        },
        nasaFact:
            'The International Space Station’s Environmental Control and Life Support System (ECLSS) achieves over 90% water recycling from urine and cabin moisture condensation.',
    },

    thermal_heater: {
        id: 'thermal_heater',
        name: 'Habitat Thermal Regulation System',
        shortLabel: 'HEATERS',
        icon: '🌡️',
        powerDrawKw: NASA_SPECS.MODULE_POWER_DRAW_KW.thermal_heater, // 2.5 kW
        priority: 2,
        isLifeCritical: true,
        description:
            'Active resistive and heat-pipe thermal grid protecting the habitat from brutal -60°C to -120°C Martian night-time temperatures.',
        statusDescription: {
            powered: 'ONLINE: Habitat interior stabilized at a comfortable 21°C.',
            unpowered: 'OFFLINE: Sub-zero freeze hazard! Hypothermia risk if unpowered.',
        },
        nasaFact:
            'Mars surface temperatures average -63°C (-80°F) and can plunge to -140°C at night. Spacecraft utilize electric heaters and Radioisotope Heater Units (RHUs) to survive.',
    },

    moxie: {
        id: 'moxie',
        name: 'MOXIE Oxygen Generator',
        shortLabel: 'MOXIE O2',
        icon: '💨',
        powerDrawKw: NASA_SPECS.MODULE_POWER_DRAW_KW.moxie, // 4.5 kW
        priority: 3,
        isLifeCritical: false,
        description:
            'Solid Oxide Electrolysis system that takes thin Martian CO2 and cracks it into carbon monoxide and breathable O2 (+24% O2/Sol).',
        statusDescription: {
            powered: 'PRODUCING: Generating +24% fresh oxygen per Sol from Mars atmosphere.',
            unpowered: 'IDLE: Zero fresh oxygen generation. Relying on reserves.',
        },
        nasaFact:
            'NASA’s MOXIE instrument on the Perseverance rover successfully produced breathable oxygen on Mars by heating CO2 to 800°C and splitting it into O2 and CO.',
    },

    water_extractor: {
        id: 'water_extractor',
        name: 'Subsurface Permafrost Ice Melter',
        shortLabel: 'ICE MELTER',
        icon: '💧',
        powerDrawKw: NASA_SPECS.MODULE_POWER_DRAW_KW.water_extractor, // 3.5 kW
        priority: 4,
        isLifeCritical: false,
        description:
            'Heats and vacuums subsurface glacial ice and permafrost from the Martian regolith, pumping +20% fresh water into colony tanks each Sol.',
        statusDescription: {
            powered: 'EXTRACTING: Melting subsurface ice (+20% fresh water per Sol).',
            unpowered: 'IDLE: No ice extraction. Colony depends on stored water.',
        },
        nasaFact:
            'Radar instruments like SHARAD on Mars Reconnaissance Orbiter discovered vast sheets of underground water ice across Mars, which future astronauts will mine for drinking water and rocket propellant.',
    },

    led_greenhouse: {
        id: 'led_greenhouse',
        name: 'LED Hydroponic Potato Biosphere',
        shortLabel: 'GREENHOUSE',
        icon: '🥔',
        powerDrawKw: NASA_SPECS.MODULE_POWER_DRAW_KW.led_greenhouse, // 3.0 kW
        priority: 5,
        isLifeCritical: false,
        description:
            'High-PAR pink/blue LED grow lights cultivating hearty Martian potatoes and microgreens. Yields +16% food per Sol, consuming 4% water.',
        statusDescription: {
            powered: 'GROWING: Hydroponic potatoes thriving under LED spectrum (+16% food/Sol).',
            unpowered: 'DARK: Crops dormant. Starvation countdown continues.',
        },
        nasaFact:
            'NASA’s Veggie and Advanced Plant Habitat on the ISS have successfully grown salad greens, radishes, and chili peppers in microgravity under specialized red, blue, and green LEDs.',
    },

    comms_array: {
        id: 'comms_array',
        name: 'Deep Space Network Transceiver',
        shortLabel: 'DSN COMMS',
        icon: '📡',
        powerDrawKw: NASA_SPECS.MODULE_POWER_DRAW_KW.comms_array, // 2.0 kW
        priority: 6, // Lowest priority: Safe to shed first in an overload
        isLifeCritical: false,
        description:
            'High-gain parabolic antenna linking the outpost with NASA’s Deep Space Network on Earth. Enables telemetry analysis and Mission Control guidance.',
        statusDescription: {
            powered: 'LINKED: Real-time telemetry linked with Earth. Mission Control hints active.',
            unpowered: 'MUTED: Offline. Communication blackout with Earth.',
        },
        nasaFact:
            'Deep Space Network (DSN) dishes in California, Spain, and Australia maintain continuous contact with Mars missions across interplanetary distances up to 400 million kilometers.',
    },
};

// ============================================================================
// 2. PLUG CONSTRAINTS (Junior Cadet vs Flight Director)
// ============================================================================

/**
 * Junior Cadet: 3 physical plugs.
 * Flight Director: 4 physical plugs.
 */
export function getMaxPlugs(mode: DifficultyMode): number {
    return mode === 'junior_cadet' ? 3 : 4;
}

export interface SwitchboardToggleResult {
    success: boolean;
    action: 'PLUGGED' | 'UNPLUGGED' | 'NO_OP';
    moduleId: ModuleId;
    activeModules: ModuleId[];
    plugsUsed: number;
    maxPlugs: number;
    powerAvailableKw: number;
    powerDrawnKw: number;
    powerSurplusKw: number;
    isOverloaded: boolean;
    trippedModules?: ModuleId[];
    message: string;
}

// ============================================================================
// 3. CORE SWITCHBOARD ACTIONS
// ============================================================================

/**
 * Checks whether a module can be safely plugged in given current plug slot limits.
 */
export function canPlugModule(
    state: OutpostGameState,
    moduleId: ModuleId
): { allowed: boolean; reason?: string } {
    const maxPlugs = getMaxPlugs(state.mode);
    const isAlreadyPlugged = state.activeModules.includes(moduleId);

    if (isAlreadyPlugged) {
        return { allowed: true }; // Unplugging is always allowed
    }

    if (state.activeModules.length >= maxPlugs) {
        return {
            allowed: false,
            reason: `All ${maxPlugs} power plugs are in use! Unplug an active module first.`,
        };
    }

    return { allowed: true };
}

/**
 * Plugs a module into the switchboard.
 * Automatically checks plug capacity and warns if power demand exceeds available generation.
 */
export function plugModule(
    state: OutpostGameState,
    moduleId: ModuleId
): { state: OutpostGameState; result: SwitchboardToggleResult } {
    const maxPlugs = getMaxPlugs(state.mode);
    const modInfo = SWITCHBOARD_MODULES[moduleId];

    if (state.activeModules.includes(moduleId)) {
        const powerGen = calculatePowerGeneration(state);
        const powerDrawn = calculatePowerDemand(state.activeModules);
        return {
            state,
            result: {
                success: true,
                action: 'NO_OP',
                moduleId,
                activeModules: state.activeModules,
                plugsUsed: state.activeModules.length,
                maxPlugs,
                powerAvailableKw: powerGen.totalKw,
                powerDrawnKw: powerDrawn,
                powerSurplusKw: Number((powerGen.totalKw - powerDrawn).toFixed(2)),
                isOverloaded: powerDrawn > powerGen.totalKw,
                message: `${modInfo.shortLabel} is already plugged in.`,
            },
        };
    }

    if (state.activeModules.length >= maxPlugs) {
        const powerGen = calculatePowerGeneration(state);
        const powerDrawn = calculatePowerDemand(state.activeModules);
        return {
            state,
            result: {
                success: false,
                action: 'NO_OP',
                moduleId,
                activeModules: state.activeModules,
                plugsUsed: state.activeModules.length,
                maxPlugs,
                powerAvailableKw: powerGen.totalKw,
                powerDrawnKw: powerDrawn,
                powerSurplusKw: Number((powerGen.totalKw - powerDrawn).toFixed(2)),
                isOverloaded: powerDrawn > powerGen.totalKw,
                message: `Cannot plug in ${modInfo.shortLabel}: All ${maxPlugs} plugs in use!`,
            },
        };
    }

    const nextActive = [...state.activeModules, moduleId];
    const powerGen = calculatePowerGeneration(state);
    const nextDrawn = calculatePowerDemand(nextActive);
    const isOverloaded = nextDrawn > powerGen.totalKw;

    const nextState: OutpostGameState = {
        ...state,
        activeModules: nextActive,
        resources: {
            ...state.resources,
            powerAvailable: powerGen.totalKw,
            powerUsed: nextDrawn,
        },
        decisionLog: [
            ...state.decisionLog,
            `Switchboard: Plugged in [${modInfo.shortLabel}]. Total load: ${nextDrawn} kW / ${powerGen.totalKw} kW.`,
        ],
    };

    if (isOverloaded) {
        eventBus.emit('POWER_OVERLOAD', {
            used: nextDrawn,
            available: powerGen.totalKw,
        });
        eventBus.emit('NOTIFICATION', {
            message: `⚠️ POWER OVERLOAD: Drawing ${nextDrawn} kW against ${powerGen.totalKw} kW!`,
            color: '#FF6B6B',
        });
    }

    eventBus.emit('RESOURCE_UPDATED', nextState.resources);

    return {
        state: nextState,
        result: {
            success: true,
            action: 'PLUGGED',
            moduleId,
            activeModules: nextActive,
            plugsUsed: nextActive.length,
            maxPlugs,
            powerAvailableKw: powerGen.totalKw,
            powerDrawnKw: nextDrawn,
            powerSurplusKw: Number((powerGen.totalKw - nextDrawn).toFixed(2)),
            isOverloaded,
            message: isOverloaded
                ? `Plugged in ${modInfo.shortLabel}, but grid is OVERLOADED! (${nextDrawn} kW / ${powerGen.totalKw} kW)`
                : `Plugged in ${modInfo.shortLabel} (+${modInfo.powerDrawKw} kW). Grid stable.`,
        },
    };
}

/**
 * Unplugs a module from the switchboard.
 */
export function unplugModule(
    state: OutpostGameState,
    moduleId: ModuleId
): { state: OutpostGameState; result: SwitchboardToggleResult } {
    const maxPlugs = getMaxPlugs(state.mode);
    const modInfo = SWITCHBOARD_MODULES[moduleId];

    if (!state.activeModules.includes(moduleId)) {
        const powerGen = calculatePowerGeneration(state);
        const powerDrawn = calculatePowerDemand(state.activeModules);
        return {
            state,
            result: {
                success: true,
                action: 'NO_OP',
                moduleId,
                activeModules: state.activeModules,
                plugsUsed: state.activeModules.length,
                maxPlugs,
                powerAvailableKw: powerGen.totalKw,
                powerDrawnKw: powerDrawn,
                powerSurplusKw: Number((powerGen.totalKw - powerDrawn).toFixed(2)),
                isOverloaded: powerDrawn > powerGen.totalKw,
                message: `${modInfo.shortLabel} is already unplugged.`,
            },
        };
    }

    const nextActive = state.activeModules.filter((id) => id !== moduleId);
    const powerGen = calculatePowerGeneration(state);
    const nextDrawn = calculatePowerDemand(nextActive);
    const isOverloaded = nextDrawn > powerGen.totalKw;

    const nextState: OutpostGameState = {
        ...state,
        activeModules: nextActive,
        resources: {
            ...state.resources,
            powerAvailable: powerGen.totalKw,
            powerUsed: nextDrawn,
        },
        decisionLog: [
            ...state.decisionLog,
            `Switchboard: Unplugged [${modInfo.shortLabel}]. Total load: ${nextDrawn} kW / ${powerGen.totalKw} kW.`,
        ],
    };

    eventBus.emit('RESOURCE_UPDATED', nextState.resources);

    return {
        state: nextState,
        result: {
            success: true,
            action: 'UNPLUGGED',
            moduleId,
            activeModules: nextActive,
            plugsUsed: nextActive.length,
            maxPlugs,
            powerAvailableKw: powerGen.totalKw,
            powerDrawnKw: nextDrawn,
            powerSurplusKw: Number((powerGen.totalKw - nextDrawn).toFixed(2)),
            isOverloaded,
            message: `Unplugged ${modInfo.shortLabel}. Freed ${modInfo.powerDrawKw} kW.`,
        },
    };
}

/**
 * Toggles a module on or off. Perfect for one-click UI toggle buttons.
 */
export function toggleModule(
    state: OutpostGameState,
    moduleId: ModuleId
): { state: OutpostGameState; result: SwitchboardToggleResult } {
    if (state.activeModules.includes(moduleId)) {
        return unplugModule(state, moduleId);
    }
    return plugModule(state, moduleId);
}

// ============================================================================
// 4. AUTOMATIC LOAD SHEDDING / CIRCUIT BREAKER TRIPPING
// ============================================================================

/**
 * If an acute event (e.g. Sol 3 dust storm) slashes power generation below active load,
 * this function automatically sheds non-essential modules in reverse priority order:
 * Comms (6) -> Greenhouse (5) -> Water Extractor (4) -> MOXIE (3)
 * to preserve life-critical Heaters (2) and Life Support (1).
 */
export function autoShedOverload(state: OutpostGameState): {
    state: OutpostGameState;
    trippedModules: ModuleId[];
} {
    const powerGen = calculatePowerGeneration(state);
    let currentDrawn = calculatePowerDemand(state.activeModules);

    if (currentDrawn <= powerGen.totalKw) {
        return { state, trippedModules: [] };
    }

    // Sort active modules by lowest priority first (highest priority number)
    const sortedToShed = [...state.activeModules].sort((a, b) => {
        return SWITCHBOARD_MODULES[b].priority - SWITCHBOARD_MODULES[a].priority;
    });

    const trippedModules: ModuleId[] = [];
    const remainingModules = [...state.activeModules];

    for (const modId of sortedToShed) {
        if (currentDrawn <= powerGen.totalKw) break;
        // Never automatically shed Life Support unless totally impossible
        if (modId === 'life_support') continue;

        const idx = remainingModules.indexOf(modId);
        if (idx !== -1) {
            remainingModules.splice(idx, 1);
            trippedModules.push(modId);
            currentDrawn = calculatePowerDemand(remainingModules);
        }
    }

    const nextState: OutpostGameState = {
        ...state,
        activeModules: remainingModules,
        resources: {
            ...state.resources,
            powerAvailable: powerGen.totalKw,
            powerUsed: currentDrawn,
        },
        decisionLog: [
            ...state.decisionLog,
            `Emergency Circuit Breaker Tripped: Automatically shut down [${trippedModules
                .map((m) => SWITCHBOARD_MODULES[m].shortLabel)
                .join(', ')}] to protect habitat life support.`,
        ],
    };

    if (trippedModules.length > 0) {
        eventBus.emit('NOTIFICATION', {
            message: `⚡ BREAKER TRIPPED: Shed ${trippedModules
                .map((m) => SWITCHBOARD_MODULES[m].shortLabel)
                .join(', ')} to prevent blackout!`,
            color: '#FFA500',
        });
        eventBus.emit('RESOURCE_UPDATED', nextState.resources);
    }

    return { state: nextState, trippedModules };
}

// ============================================================================
// 5. FULL SWITCHBOARD STATUS REPORT (For Anusha's Switchboard UI)
// ============================================================================

export interface ModuleSwitchView {
    id: ModuleId;
    info: SwitchboardModuleInfo;
    isActive: boolean;
    canToggle: boolean;
    disabledReason?: string;
}

export interface SwitchboardFullView {
    mode: DifficultyMode;
    maxPlugs: number;
    plugsUsed: number;
    plugsAvailable: number;
    powerAvailableKw: number;
    powerDrawnKw: number;
    powerSurplusKw: number;
    isOverloaded: boolean;
    plugSlots: Array<{ slotIndex: number; filled: boolean; moduleId?: ModuleId }>;
    modules: ModuleSwitchView[];
}

/**
 * Returns a complete, UI-ready visualization model for Anusha's switchboard screen.
 */
export function getSwitchboardFullView(state: OutpostGameState): SwitchboardFullView {
    const maxPlugs = getMaxPlugs(state.mode);
    const powerGen = calculatePowerGeneration(state);
    const powerDrawn = calculatePowerDemand(state.activeModules);
    const powerSurplus = Number((powerGen.totalKw - powerDrawn).toFixed(2));
    const isOverloaded = powerDrawn > powerGen.totalKw;

    // Build plug slots visualization ([🔌] [🔌] [ ⭕ ])
    const plugSlots: SwitchboardFullView['plugSlots'] = [];
    for (let i = 0; i < maxPlugs; i++) {
        if (i < state.activeModules.length) {
            plugSlots.push({
                slotIndex: i,
                filled: true,
                moduleId: state.activeModules[i],
            });
        } else {
            plugSlots.push({
                slotIndex: i,
                filled: false,
            });
        }
    }

    const allModuleIds: ModuleId[] = [
        'life_support',
        'moxie',
        'water_extractor',
        'led_greenhouse',
        'comms_array',
        'thermal_heater',
    ];

    const modules: ModuleSwitchView[] = allModuleIds.map((modId) => {
        const info = SWITCHBOARD_MODULES[modId];
        const isActive = state.activeModules.includes(modId);
        const checkCanPlug = canPlugModule(state, modId);

        return {
            id: modId,
            info,
            isActive,
            canToggle: isActive ? true : checkCanPlug.allowed,
            disabledReason: isActive ? undefined : checkCanPlug.reason,
        };
    });

    return {
        mode: state.mode,
        maxPlugs,
        plugsUsed: state.activeModules.length,
        plugsAvailable: maxPlugs - state.activeModules.length,
        powerAvailableKw: powerGen.totalKw,
        powerDrawnKw: powerDrawn,
        powerSurplusKw: powerSurplus,
        isOverloaded,
        plugSlots,
        modules,
    };
}

