import { simulatedCrewState } from "../data/simulationDefaults";
import type { GameSettings, GameStateData } from "../types/state";

const STORAGE_KEY = "outpost-sol-settings";

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }

  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function defaultSettings(): GameSettings {
  const reduced = prefersReducedMotion();

  return {
    soundVolume: 0.8,
    musicVolume: 0.55,
    voiceInstructions: true,
    animationsEnabled: !reduced,
    highContrast: false,
    largeText: false,
    reducedMotion: reduced,
  };
}

function clamp01(value: unknown, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function asBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function loadSettings(): GameSettings {
  const fallback = defaultSettings();

  try {
    if (typeof localStorage === "undefined") return fallback;
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return fallback;

    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== "object" || parsed === null) return fallback;

    const record = parsed as Record<string, unknown>;

    return {
      soundVolume: clamp01(record.soundVolume, fallback.soundVolume),
      musicVolume: clamp01(record.musicVolume, fallback.musicVolume),
      voiceInstructions: asBoolean(record.voiceInstructions, fallback.voiceInstructions),
      animationsEnabled: asBoolean(record.animationsEnabled, fallback.animationsEnabled),
      highContrast: asBoolean(record.highContrast, fallback.highContrast),
      largeText: asBoolean(record.largeText, fallback.largeText),
      reducedMotion: asBoolean(record.reducedMotion, fallback.reducedMotion),
    };
  } catch {
    return fallback;
  }
}

function saveSettings(settings: GameSettings): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Private browsing can block storage. The session still keeps the values.
  }
}

function createInitialState(): GameStateData {
  return {
    selectedAgeMode: null,
    selectedLandingSite: null,
    selectedHull: null,
    selectedEquipment: [],
    currentSol: 0,
    completedSols: [],
    oxygen: simulatedCrewState.oxygen,
    water: simulatedCrewState.water,
    food: simulatedCrewState.food,
    power: simulatedCrewState.power,
    battery: simulatedCrewState.battery,
    radiationExposure: simulatedCrewState.radiationExposure,
    perchlorateExposure: simulatedCrewState.perchlorateExposure,
    habitatPressure: simulatedCrewState.habitatPressure,
    hullIntegrity: simulatedCrewState.hullIntegrity,
    activeModules: [],
    missionStatus: "menu",
    settings: loadSettings(),
  };
}

type StateListener = () => void;

class GameStateManager {
  private state: GameStateData;
  private readonly listeners = new Set<StateListener>();

  constructor() {
    this.state = createInitialState();
  }

  get(): GameStateData {
    return this.state;
  }

  update(patch: Partial<Omit<GameStateData, "settings">>): void {
    const next: GameStateData = {
      ...this.state,
      ...patch,
      settings: this.state.settings,
    };

    if (patch.selectedEquipment) next.selectedEquipment = [...patch.selectedEquipment];
    if (patch.completedSols) next.completedSols = [...patch.completedSols];
    if (patch.activeModules) next.activeModules = [...patch.activeModules];

    this.state = next;
    this.emit();
  }

  updateSettings(patch: Partial<GameSettings>): void {
    this.state = {
      ...this.state,
      settings: {
        ...this.state.settings,
        ...patch,
      },
    };
    saveSettings(this.state.settings);
    this.emit();
  }

  /** Clears the mission and keeps the saved interface settings. */
  resetMission(): void {
    const settings = { ...this.state.settings };
    this.state = {
      ...createInitialState(),
      settings,
    };
    this.emit();
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) listener();
  }
}

export const gameState = new GameStateManager();
