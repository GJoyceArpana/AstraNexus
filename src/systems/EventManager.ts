import type { AbortReason, CoreResources, OutpostGameState } from '../mechanics/types.ts';
import type { PressureStepResult } from '../mechanics/pressureExperiment.ts';

export type EventCallback<T = any> = (payload: T) => void;

export type OutpostEvent =
    | 'GAME_STATE_CHANGED'
    | 'RESOURCE_UPDATED'
    | 'PRESSURE_STEP'
    | 'POWER_OVERLOAD'
    | 'SOL_ADVANCED'
    | 'EMERGENCY_ABORT'
    | 'MISSION_SUCCESS'
    | 'NOTIFICATION';

export interface EventPayloadMap {
    GAME_STATE_CHANGED: OutpostGameState;
    RESOURCE_UPDATED: CoreResources;
    PRESSURE_STEP: PressureStepResult;
    POWER_OVERLOAD: { used: number; available: number };
    SOL_ADVANCED: { newSol: number; state: OutpostGameState };
    EMERGENCY_ABORT: { reason: AbortReason; state: OutpostGameState };
    MISSION_SUCCESS: OutpostGameState;
    NOTIFICATION: { message: string; color?: string; durationMs?: number };
}

/**
 * Central event bus for Outpost Sol.
 * Allows Joyce (Core Integration) and Anusha (UI/UX) to hook into Aniruddh's
 * engineering mechanics without any tight coupling or merge conflicts.
 */
export class OutpostEventManager {
    private static instance: OutpostEventManager;
    private listeners: Map<string, Set<EventCallback>> = new Map();

    public static getInstance(): OutpostEventManager {
        if (!OutpostEventManager.instance) {
            OutpostEventManager.instance = new OutpostEventManager();
        }
        return OutpostEventManager.instance;
    }

    public on<K extends OutpostEvent>(event: K, callback: EventCallback<EventPayloadMap[K]>): void {
        if (!this.listeners.has(event)) {
            this.listeners.set(event, new Set());
        }
        this.listeners.get(event)!.add(callback);
    }

    public off<K extends OutpostEvent>(event: K, callback: EventCallback<EventPayloadMap[K]>): void {
        const set = this.listeners.get(event);
        if (set) {
            set.delete(callback);
        }
    }

    public emit<K extends OutpostEvent>(event: K, payload: EventPayloadMap[K]): void {
        const set = this.listeners.get(event);
        if (set) {
            for (const cb of set) {
                try {
                    cb(payload);
                } catch (err) {
                    console.error(`[OutpostEventManager] Error in listener for "${event}":`, err);
                }
            }
        }
    }

    public clearAll(): void {
        this.listeners.clear();
    }
}

export const eventBus = OutpostEventManager.getInstance();

