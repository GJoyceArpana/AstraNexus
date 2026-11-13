import type { OutpostGameState, RoverActionType, RoverTool } from '../mechanics/types.ts';
import { MissionManager } from '../systems/MissionManager.ts';
import { calculateLoadoutEffects } from '../systems/TradeOffSystem.ts';
import { eventBus } from '../systems/EventManager.ts';
import type { MovementInput, WorldBounds } from './Astronaut.ts';

export const DEFAULT_ROVER_BOUNDS: WorldBounds = {
    minX: 35,
    maxX: 1245,
    minY: 150,
    maxY: 650,
};

// Charging pad location in front of habitat
export const CHARGING_STATION_COORDS = { x: 400, y: 605 };

export interface OutpostBuildingNode {
    id: string;
    name: string;
    x: number;
    y: number;
    interactionRadius: number;
    actionPrompt: string;
}

export const BASE_BUILDINGS: OutpostBuildingNode[] = [
    {
        id: 'habitat',
        name: 'Mars Habitat & Suitport',
        x: 620,
        y: 475,
        interactionRadius: 85,
        actionPrompt: 'PRESS E TO ENTER HABITAT VIA SUITPORT',
    },
    {
        id: 'greenhouse',
        name: 'LED Hydroponic Greenhouse',
        x: 315,
        y: 500,
        interactionRadius: 75,
        actionPrompt: 'PRESS E TO INSPECT POTATO CROPS',
    },
    {
        id: 'solar_array',
        name: 'Solar Panel Array',
        x: 920,
        y: 535,
        interactionRadius: 80,
        actionPrompt: 'PRESS E TO SCRAPE DUST WITH DOZER',
    },
    {
        id: 'comms_tower',
        name: 'Deep Space Network Antenna',
        x: 1080,
        y: 450,
        interactionRadius: 70,
        actionPrompt: 'PRESS E TO PING MISSION CONTROL',
    },
    {
        id: 'oxygen_station',
        name: 'MOXIE Oxygen Refill Station',
        x: 790,
        y: 535,
        interactionRadius: 65,
        actionPrompt: 'PRESS E TO INSPECT OXYGEN RESERVES',
    },
];

/**
 * Controller entity for the Mars Rover.
 * Handles driving physics, battery depletion, tool-specific surface actions,
 * building proximity detection, and charging station docking.
 */
export class RoverController {
    public x: number;
    public y: number;
    public speed: number = 5.2; // Fast 4-wheel rover drive speed
    public isFacingLeft: boolean = false;
    public isOccupied: boolean = false;
    public isParkedInShelter: boolean = false;
    public isDockedAtChargingStation: boolean = false;
    public equippedTool: RoverTool;

    constructor(
        initialX: number = 400,
        initialY: number = 605,
        equippedTool: RoverTool = 'regolith_dozer'
    ) {
        this.x = initialX;
        this.y = initialY;
        this.equippedTool = equippedTool;
    }

    /**
     * Drives the rover using directional inputs.
     * Drains fractional battery while moving.
     */
    public drive(
        input: MovementInput,
        state: OutpostGameState,
        deltaSeconds: number = 0.016,
        bounds: WorldBounds = DEFAULT_ROVER_BOUNDS
    ): { state: OutpostGameState; moved: boolean } {
        if (!this.isOccupied) {
            return { state, moved: false };
        }

        // Battery check
        if (state.resources.roverBattery <= 0) {
            eventBus.emit('NOTIFICATION', {
                message: '🪫 ROVER BATTERY DEPLETED! Rover cannot move until recharged.',
                color: '#FF6B6B',
            });
            return { state, moved: false };
        }

        let dx = 0;
        let dy = 0;

        if (input.left) dx -= this.speed;
        if (input.right) dx += this.speed;
        if (input.up) dy -= this.speed;
        if (input.down) dy += this.speed;

        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        const moved = dx !== 0 || dy !== 0;

        if (dx < 0) this.isFacingLeft = true;
        if (dx > 0) this.isFacingLeft = false;

        this.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.x + dx));
        this.y = Math.max(bounds.minY, Math.min(bounds.maxY, this.y + dy));

        // Battery drain while driving (~0.25% per second of active driving)
        let nextBattery = state.resources.roverBattery;
        if (moved) {
            nextBattery = Math.max(0, nextBattery - 0.25 * deltaSeconds);
        }

        // Check if parked near charging station (< 60 px)
        const distToCharger = this.getDistanceTo(
            CHARGING_STATION_COORDS.x,
            CHARGING_STATION_COORDS.y
        );
        this.isDockedAtChargingStation = distToCharger < 60;

        const nextState: OutpostGameState = {
            ...state,
            resources: {
                ...state.resources,
                roverBattery: Number(nextBattery.toFixed(2)),
            },
        };

        return { state: nextState, moved };
    }

    /**
     * Performs a specialized rover action (drilling, dozing, cleaning, sampling).
     */
    public executeAction(
        action: RoverActionType,
        state: OutpostGameState
    ): { state: OutpostGameState; success: boolean; message: string } {
        const result = MissionManager.performRoverAction(state, action);
        return result;
    }

    /**
     * Recharges rover battery when docked at base charging station or via Bleep solar cap.
     */
    public recharge(
        state: OutpostGameState,
        deltaSeconds: number = 0.016
    ): { state: OutpostGameState; rechargedAmount: number } {
        let rechargeRatePerSec = 0;

        // Base charging pad rate: +2.0% per second
        if (this.isDockedAtChargingStation) {
            rechargeRatePerSec += 2.0;
        }

        // Bleep Solar Cap auxiliary charge
        const effects = calculateLoadoutEffects(state.loadout);
        if (effects.passiveSolarPowerKw > 0) {
            rechargeRatePerSec += 0.25;
        }

        if (rechargeRatePerSec <= 0 || state.resources.roverBattery >= 100) {
            return { state, rechargedAmount: 0 };
        }

        const gain = rechargeRatePerSec * deltaSeconds;
        const nextBattery = Math.min(100, state.resources.roverBattery + gain);

        const nextState: OutpostGameState = {
            ...state,
            resources: {
                ...state.resources,
                roverBattery: Number(nextBattery.toFixed(2)),
            },
        };

        return {
            state: nextState,
            rechargedAmount: Number(gain.toFixed(3)),
        };
    }

    /**
     * Finds the nearest outpost building within interaction distance.
     */
    public getNearestBuilding(
        buildings: OutpostBuildingNode[] = BASE_BUILDINGS
    ): { building: OutpostBuildingNode | null; distance: number } {
        let nearest: OutpostBuildingNode | null = null;
        let minDistance = Infinity;

        for (const b of buildings) {
            const dist = this.getDistanceTo(b.x, b.y);
            if (dist < b.interactionRadius && dist < minDistance) {
                minDistance = dist;
                nearest = b;
            }
        }

        return { building: nearest, distance: minDistance };
    }

    public getDistanceTo(targetX: number, targetY: number): number {
        const dx = this.x - targetX;
        const dy = this.y - targetY;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

