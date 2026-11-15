import type { OutpostGameState } from '../mechanics/types.ts';
import { eventBus } from '../systems/EventManager.ts';

export interface MovementInput {
    left: boolean;
    right: boolean;
    up: boolean;
    down: boolean;
}

export interface WorldBounds {
    minX: number;
    maxX: number;
    minY: number;
    maxY: number;
}

export const DEFAULT_ASTRONAUT_BOUNDS: WorldBounds = {
    minX: 30,
    maxX: 1250,
    minY: 150,
    maxY: 635,
};

/**
 * Controller entity for the player-controlled astronaut character.
 * Encapsulates position, low-gravity EVA movement, suitport docking,
 * and vehicle embarkation/disembarkation.
 */
export class AstronautController {
    public x: number;
    public y: number;
    public speed: number = 3.2; // Mars low-gravity walk speed (0.38g)
    public isFacingLeft: boolean = false;
    public isInsideRover: boolean = false;
    public isInsideHabitat: boolean = false;
    public isSuitportDocked: boolean = false;
    public name: string;
    public gender: 'boy' | 'girl';

    constructor(
        initialX: number = 540,
        initialY: number = 595,
        name: string = 'Commander Maya',
        gender: 'boy' | 'girl' = 'boy'
    ) {
        this.x = initialX;
        this.y = initialY;
        this.name = name;
        this.gender = gender;
    }

    /**
     * Updates astronaut movement based on directional input.
     * Enforces world bounds and flips orientation.
     */
    public move(
        input: MovementInput,
        bounds: WorldBounds = DEFAULT_ASTRONAUT_BOUNDS
    ): { dx: number; dy: number; moved: boolean } {
        if (this.isInsideRover) {
            return { dx: 0, dy: 0, moved: false };
        }

        let dx = 0;
        let dy = 0;

        if (input.left) dx -= this.speed;
        if (input.right) dx += this.speed;
        if (input.up) dy -= this.speed;
        if (input.down) dy += this.speed;

        // Diagonal normalization to prevent faster diagonal running
        if (dx !== 0 && dy !== 0) {
            dx *= 0.7071;
            dy *= 0.7071;
        }

        if (dx < 0) this.isFacingLeft = true;
        if (dx > 0) this.isFacingLeft = false;

        this.x = Math.max(bounds.minX, Math.min(bounds.maxX, this.x + dx));
        this.y = Math.max(bounds.minY, Math.min(bounds.maxY, this.y + dy));

        return { dx, dy, moved: dx !== 0 || dy !== 0 };
    }

    /**
     * Docks astronaut to the exterior Suitport airlock to decontaminate toxic soil.
     */
    public dockSuitport(state: OutpostGameState): { state: OutpostGameState; message: string } {
        this.isSuitportDocked = true;
        this.isInsideHabitat = true;

        const nextEnv = {
            ...state.environment,
            suitportSealed: true,
        };

        const nextState: OutpostGameState = {
            ...state,
            environment: nextEnv,
            decisionLog: [
                ...state.decisionLog,
                'Astronaut docked via Suitport. Suit remained outside habitat living quarters (0% dust contamination).',
            ],
        };

        eventBus.emit('NOTIFICATION', {
            message: '🚪 SUITPORT LATCHED: Zero toxic perchlorate dust entered the habitat!',
            color: '#8ce8b8',
        });

        return {
            state: nextState,
            message: 'Suitport sealed. Crew safely transitioned into habitat without chemical contamination.',
        };
    }

    /**
     * Undocks astronaut from habitat for surface EVA.
     */
    public undockForEVA(state: OutpostGameState): { state: OutpostGameState } {
        this.isSuitportDocked = false;
        this.isInsideHabitat = false;
        return { state };
    }

    /**
     * Enters the Mars exploration rover.
     */
    public enterRover(roverX: number, roverY: number): void {
        this.isInsideRover = true;
        this.x = roverX;
        this.y = roverY;
    }

    /**
     * Exits the rover, positioning the astronaut to the right of the vehicle.
     */
    public exitRover(
        roverX: number,
        roverY: number,
        bounds: WorldBounds = DEFAULT_ASTRONAUT_BOUNDS
    ): void {
        this.isInsideRover = false;
        this.x = Math.max(bounds.minX, Math.min(bounds.maxX, roverX + 70));
        this.y = Math.max(bounds.minY, Math.min(bounds.maxY, roverY));
    }

    /**
     * Calculates Euclidean distance to a target point (e.g. building or rover).
     */
    public getDistanceTo(targetX: number, targetY: number): number {
        const dx = this.x - targetX;
        const dy = this.y - targetY;
        return Math.sqrt(dx * dx + dy * dy);
    }
}

