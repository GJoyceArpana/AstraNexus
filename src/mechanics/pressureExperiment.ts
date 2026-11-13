import type { HabitatShell, OutpostGameState } from './types';

export const MARS_AMBIENT_PRESSURE_KPA = 0.61;
export const MIN_SAFE_BREATHABLE_KPA = 34.0; // NASA low-pressure pure-O2 hab minimum
export const OPTIMAL_TARGET_KPA = 55.0;      // Safe operating target

// Maximum outward pressure differential (deltaP) each shell can survive before popping
export const SHELL_MAX_BURST_KPA: Record<HabitatShell, number> = {
    inflatable_kevlar: 72.0, // Pops if pumped up to Earth pressure (101.3 kPa)!
    rigid_composite: 110.0,  // Handles full Earth pressure safely
    regolith_hybrid: 90.0,   // Medium-high burst limit
};

export interface PressureStepResult {
    internalPressureKpa: number;
    pressureDifferentialKpa: number;
    wallStressPercent: number; // 0 to 100%+ (for UI gauge & tent stretch visual)
    isBreathable: boolean;
    hasPopped: boolean;
    warningLevel: 'LOW_PRESSURE' | 'SAFE_ZONE' | 'HIGH_STRESS' | 'POPPED';
}

/**
 * Evaluates current wall stress and checks if the habitat tent pops.
 */
export function evaluateTentPressure(
    internalPressureKpa: number,
    shell: HabitatShell
): PressureStepResult {
    const maxBurst = SHELL_MAX_BURST_KPA[shell];
    const clampedPressure = Math.max(MARS_AMBIENT_PRESSURE_KPA, internalPressureKpa);
    const deltaP = clampedPressure - MARS_AMBIENT_PRESSURE_KPA;
    const wallStressPercent = Math.round((deltaP / maxBurst) * 100);

    if (deltaP >= maxBurst) {
        return {
            internalPressureKpa: Number(clampedPressure.toFixed(2)),
            pressureDifferentialKpa: Number(deltaP.toFixed(2)),
            wallStressPercent,
            isBreathable: false,
            hasPopped: true,
            warningLevel: 'POPPED',
        };
    }

    let warningLevel: PressureStepResult['warningLevel'] = 'SAFE_ZONE';
    if (clampedPressure < MIN_SAFE_BREATHABLE_KPA) {
        warningLevel = 'LOW_PRESSURE';
    } else if (wallStressPercent >= 80) {
        warningLevel = 'HIGH_STRESS';
    }

    return {
        internalPressureKpa: Number(clampedPressure.toFixed(2)),
        pressureDifferentialKpa: Number(deltaP.toFixed(2)),
        wallStressPercent,
        isBreathable: clampedPressure >= MIN_SAFE_BREATHABLE_KPA,
        hasPopped: false,
        warningLevel,
    };
}

/**
 * Called when the player pumps air into the habitat (+kPa).
 * Triggers Emergency Abort if the tent pops.
 */
export function pumpHabitatAir(
    state: OutpostGameState,
    deltaKpa: number = 5.0
): { state: OutpostGameState; result: PressureStepResult } {
    const nextPressure = state.environment.internalPressureKpa + deltaKpa;
    const result = evaluateTentPressure(nextPressure, state.loadout.habitatShell);

    const updatedState: OutpostGameState = {
        ...state,
        environment: {
            ...state.environment,
            internalPressureKpa: result.internalPressureKpa,
        },
        resources: {
            ...state.resources,
            hullIntegrity: result.hasPopped
                ? 0
                : Math.max(10, state.resources.hullIntegrity - (result.warningLevel === 'HIGH_STRESS' ? 5 : 0)),
        },
        status: result.hasPopped ? 'emergency_abort' : state.status,
        abortReason: result.hasPopped ? 'TENT_OVERPRESSURE_BLOWOUT' : state.abortReason,
    };

    return { state: updatedState, result };
}

/**
 * Called when the player vents excess pressure (-kPa) to relieve wall stress.
 */
export function ventHabitatAir(
    state: OutpostGameState,
    deltaKpa: number = 4.0
): { state: OutpostGameState; result: PressureStepResult } {
    const nextPressure = Math.max(
        MARS_AMBIENT_PRESSURE_KPA,
        state.environment.internalPressureKpa - deltaKpa
    );
    const result = evaluateTentPressure(nextPressure, state.loadout.habitatShell);

    const updatedState: OutpostGameState = {
        ...state,
        environment: {
            ...state.environment,
            internalPressureKpa: result.internalPressureKpa,
        },
    };

    return { state: updatedState, result };
}

/**
 * Locks in the habitat pressure to finish the opening experiment and move to Sol 1.
 */
export function lockHabitatPressure(state: OutpostGameState): {
    success: boolean;
    state: OutpostGameState;
    reason?: string;
} {
    const evalResult = evaluateTentPressure(
        state.environment.internalPressureKpa,
        state.loadout.habitatShell
    );

    if (evalResult.hasPopped) {
        return {
            success: false,
            state: { ...state, status: 'emergency_abort', abortReason: 'TENT_OVERPRESSURE_BLOWOUT' },
            reason: 'Habitat burst from over-pressurization!',
        };
    }

    if (!evalResult.isBreathable) {
        return {
            success: false,
            state,
            reason: `Pressure too low (${evalResult.internalPressureKpa} kPa). Reach at least ${MIN_SAFE_BREATHABLE_KPA} kPa to breathe safely.`,
        };
    }

    return {
        success: true,
        state: {
            ...state,
            currentSol: 1,
            status: 'in_progress',
            decisionLog: [
                ...state.decisionLog,
                `Sol 0: Pressurized ${state.loadout.habitatShell} to ${evalResult.internalPressureKpa} kPa (${evalResult.wallStressPercent}% wall stress).`,
            ],
        },
    };
}