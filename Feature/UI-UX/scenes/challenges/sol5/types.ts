export type SubsystemId = "air_distribution" | "electrical_grid" | "oxygen_regulation" | "structural_hull";

export interface SubsystemStatus {
    id: SubsystemId;
    name: string;
    codename: string;
    icon: string;
    isRepaired: boolean;
    healthPct: number; // 0 to 100
    location: { x: number; y: number };
    severity: "CRITICAL" | "DEGRADED" | "NOMINAL";
    description: string;
}

export interface Sol5ResourceState {
    oxygenReserve: number;       // 0 to 100 (%)
    habitatPressure: number;     // 0 to 100 (kPa), nominal 56 - 64 kPa
    structuralIntegrity: number; // 0 to 100 (%)
    electricalPower: number;     // 0 to 100 (kW)
    timeRemainingSec: number;    // seconds countdown (starts at 300s = 5m00s)
    isDepressurizing: boolean;
    isOxygenLeaking: boolean;
    isPowerOverloaded: boolean;
    isCriticalWarning: boolean;
}

export interface Sol5Inventory {
    pipeConnectors: number;
    circuitRelays: number;
    replacementValves: number;
    patches: {
        aerogelSealant: number;     // for micro fissures
        carbonFiberPatch: number;   // for medium fractures
        titaniumClampingPlate: number; // for heavy punctures
    };
}

export interface Sol5RepairStationConfig {
    id: SubsystemId;
    title: string;
    actionHint: string;
    x: number;
    y: number;
    icon: string;
    color: number;
}

export interface Sol5MissionResults {
    isSuccess: boolean;
    failureReason?: "DEPRESSURIZATION" | "HYPOXIA" | "STRUCTURAL_COLLAPSE" | "POWER_BLACKOUT" | "TIME_EXPIRED";
    completionTimeSec: number;
    finalOxygenPct: number;
    finalPressureKPa: number;
    finalIntegrityPct: number;
    finalPowerKW: number;
    repairsCompleted: number;
    performanceScore: number;
    rankTitle: "ROOKIE CADET" | "SYSTEMS SPECIALIST" | "FLIGHT COMMANDER";
    stars: 1 | 2 | 3;
}
