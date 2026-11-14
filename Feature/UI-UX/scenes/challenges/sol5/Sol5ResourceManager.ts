import type { Sol5ResourceState, SubsystemId, Sol5MissionResults } from "./types.ts";

export interface ResourceManagerCallbacks {
    onResourceUpdate: (state: Sol5ResourceState) => void;
    onCriticalAlert: (msg: string, isHazard: boolean) => void;
    onMissionFail: (results: Sol5MissionResults) => void;
    onMissionVictory: (results: Sol5MissionResults) => void;
}

export class Sol5ResourceManager {
    private state: Sol5ResourceState;
    private callbacks: ResourceManagerCallbacks;
    private isEnded = false;
    private startTime = 0;
    private repairsCount = 0;

    // Subsystem repair tracking
    private repairedSystems: Record<SubsystemId, boolean> = {
        air_distribution: false,
        electrical_grid: false,
        oxygen_regulation: false,
        structural_hull: false
    };

    constructor(callbacks: ResourceManagerCallbacks) {
        this.callbacks = callbacks;
        this.startTime = Date.now();
        this.state = {
            oxygenReserve: 72,
            habitatPressure: 44.0, // kPa
            structuralIntegrity: 36, // %
            electricalPower: 16.0,  // kW
            timeRemainingSec: 300,  // 5 minutes
            isDepressurizing: true,
            isOxygenLeaking: true,
            isPowerOverloaded: true,
            isCriticalWarning: false
        };
    }

    public getState(): Sol5ResourceState {
        return { ...this.state };
    }

    public isRepaired(id: SubsystemId): boolean {
        return this.repairedSystems[id];
    }

    public getRepairsCount(): number {
        return this.repairsCount;
    }

    public update(deltaMs: number) {
        if (this.isEnded) return;

        const deltaSec = deltaMs / 1000;

        // 1. Mission Countdown
        this.state.timeRemainingSec = Math.max(0, this.state.timeRemainingSec - deltaSec);
        if (this.state.timeRemainingSec <= 0) {
            this.triggerFailure("TIME_EXPIRED");
            return;
        }

        // 2. Dynamic Habitat Consequences
        // A. Structural Breaches cause continuous pressure depressurization
        if (!this.repairedSystems.structural_hull) {
            const pressureLoss = 0.40 * deltaSec;
            this.state.habitatPressure = Math.max(10.0, this.state.habitatPressure - pressureLoss);
            // Ambient Mars dust abrasion slowly degrades remaining unpatched hull
            this.state.structuralIntegrity = Math.max(5.0, this.state.structuralIntegrity - 0.08 * deltaSec);
        }

        // B. Air Distribution Leak vents oxygen and drops cabin pressure
        if (!this.repairedSystems.air_distribution) {
            this.state.oxygenReserve = Math.max(0, this.state.oxygenReserve - 0.32 * deltaSec);
            this.state.habitatPressure = Math.max(10.0, this.state.habitatPressure - 0.22 * deltaSec);
        } else {
            // Repaired air distribution assists circulation
            if (this.repairedSystems.electrical_grid && !this.repairedSystems.oxygen_regulation) {
                // Compressor slowly replenishes pressure if hull is sealed
                if (this.repairedSystems.structural_hull) {
                    this.state.habitatPressure = Math.min(58.0, this.state.habitatPressure + 0.35 * deltaSec);
                }
            }
        }

        // C. Electrical Grid provides power to O2 scrubbers and heaters
        if (this.repairedSystems.electrical_grid) {
            this.state.electricalPower = 52.0; // Stabilized nominal grid
            if (this.repairedSystems.air_distribution) {
                this.state.oxygenReserve = Math.min(100, this.state.oxygenReserve + 0.20 * deltaSec);
            }
        } else {
            // Power fluctuates in brownout state
            this.state.electricalPower = 15.0 + Math.sin(Date.now() * 0.003) * 3.0;
        }

        // D. Oxygen Pressure Regulation maintains target 60.5 kPa
        if (this.repairedSystems.oxygen_regulation) {
            // System actively servo-stabilizes to nominal NASA pressure (60.5 kPa)
            const targetKPa = 60.5;
            const diff = targetKPa - this.state.habitatPressure;
            this.state.habitatPressure += diff * Math.min(1.0, 1.2 * deltaSec);

            // Active O2 scrubbers bring oxygen back to full reserve
            this.state.oxygenReserve = Math.min(100, this.state.oxygenReserve + 0.50 * deltaSec);
        }

        // 3. Warning Threshold Checks
        const isLowPressure = this.state.habitatPressure < 30.0;
        const isLowO2 = this.state.oxygenReserve < 25.0;
        const isLowHull = this.state.structuralIntegrity < 20.0;

        this.state.isCriticalWarning = isLowPressure || isLowO2 || isLowHull || this.state.timeRemainingSec < 60;

        // 4. Catastrophic Failure Conditions
        if (this.state.habitatPressure <= 18.0) {
            this.triggerFailure("DEPRESSURIZATION");
            return;
        }
        if (this.state.oxygenReserve <= 0) {
            this.triggerFailure("HYPOXIA");
            return;
        }
        if (this.state.structuralIntegrity <= 0) {
            this.triggerFailure("STRUCTURAL_COLLAPSE");
            return;
        }

        this.callbacks.onResourceUpdate(this.getState());
    }

    /**
     * Called when a player completes an engineering puzzle
     */
    public markSystemRepaired(id: SubsystemId) {
        if (this.repairedSystems[id]) return;

        this.repairedSystems[id] = true;
        this.repairsCount++;

        switch (id) {
            case "air_distribution":
                this.state.isOxygenLeaking = false;
                this.callbacks.onCriticalAlert("AIR DISTRIBUTION MANIFOLD SEALED! LEAK HALTED.", false);
                break;
            case "electrical_grid":
                this.state.isPowerOverloaded = false;
                this.state.electricalPower = 52.0;
                this.callbacks.onCriticalAlert("ELECTRICAL CIRCUIT RESTORED! HEATER BUS ONLINE.", false);
                break;
            case "structural_hull":
                this.state.isDepressurizing = false;
                this.state.structuralIntegrity = 100.0;
                this.callbacks.onCriticalAlert("STRUCTURAL HULL COMPOSITE SEALED! DECOMPRESSION STOPPED.", false);
                break;
            case "oxygen_regulation":
                this.state.habitatPressure = 60.5;
                this.callbacks.onCriticalAlert("OXYGEN REGULATION SERVO-STABILIZED AT 60.5 kPa!", false);
                break;
        }

        this.callbacks.onResourceUpdate(this.getState());

        // Check Victory Condition: All 4 systems repaired!
        if (
            this.repairedSystems.air_distribution &&
            this.repairedSystems.electrical_grid &&
            this.repairedSystems.structural_hull &&
            this.repairedSystems.oxygen_regulation
        ) {
            this.triggerVictory();
        }
    }

    private triggerFailure(reason: Sol5MissionResults["failureReason"]) {
        if (this.isEnded) return;
        this.isEnded = true;

        const results = this.calculateResults(false, reason);
        this.callbacks.onMissionFail(results);
    }

    private triggerVictory() {
        if (this.isEnded) return;
        this.isEnded = true;

        const results = this.calculateResults(true);
        this.callbacks.onMissionVictory(results);
    }

    private calculateResults(
        isSuccess: boolean,
        failureReason?: Sol5MissionResults["failureReason"]
    ): Sol5MissionResults {
        const elapsedSec = Math.round((Date.now() - this.startTime) / 1000);
        const timeBonus = Math.max(0, Math.round(this.state.timeRemainingSec * 8));
        const oxygenBonus = Math.round(this.state.oxygenReserve * 15);
        const pressureBonus = Math.round(Math.max(0, 100 - Math.abs(60.5 - this.state.habitatPressure) * 3) * 12);
        const integrityBonus = Math.round(this.state.structuralIntegrity * 10);
        const powerBonus = Math.round(this.state.electricalPower * 10);

        let totalScore = timeBonus + oxygenBonus + pressureBonus + integrityBonus + powerBonus;
        if (!isSuccess) {
            totalScore = Math.round(totalScore * 0.35);
        }

        let stars: 1 | 2 | 3 = 1;
        let rankTitle: Sol5MissionResults["rankTitle"] = "ROOKIE CADET";

        if (isSuccess) {
            if (totalScore >= 4200 && this.state.timeRemainingSec > 120) {
                stars = 3;
                rankTitle = "FLIGHT COMMANDER";
            } else if (totalScore >= 2800) {
                stars = 2;
                rankTitle = "SYSTEMS SPECIALIST";
            } else {
                stars = 1;
                rankTitle = "ROOKIE CADET";
            }
        }

        return {
            isSuccess,
            failureReason,
            completionTimeSec: elapsedSec,
            finalOxygenPct: Math.round(this.state.oxygenReserve),
            finalPressureKPa: Math.round(this.state.habitatPressure * 10) / 10,
            finalIntegrityPct: Math.round(this.state.structuralIntegrity),
            finalPowerKW: Math.round(this.state.electricalPower),
            repairsCompleted: this.repairsCount,
            performanceScore: totalScore,
            rankTitle,
            stars
        };
    }
}
