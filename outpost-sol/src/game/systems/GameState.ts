import type { GameState, Settings } from "../types/state.ts";

const STORAGE_KEY = "outpost-sol.v1";

function systemSettings(): Settings {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const contrast = window.matchMedia("(prefers-contrast: more)").matches;
  return {
    soundVolume: 0.7,
    musicVolume: 0.45,
    voiceInstructions: false,
    animations: !motion,
    highContrast: contrast,
    largeText: false,
    reducedMotion: motion,
  };
}

export function createDefaultState(): GameState {
  return {
    selectedAgeMode: null,
    selectedLandingSite: null,
    selectedHull: null,
    selectedEquipment: [],
    currentSol: 0,
    completedSols: [],
    oxygen: 86,
    water: 74,
    food: 80,
    power: 62,
    battery: 90,
    radiationExposure: 18,
    perchlorateExposure: 8,
    habitatPressure: 70,
    hullIntegrity: 100,
    crewHealth: 100,
    suitCondition: 96,
    activeModules: [],
    missionStatus: "standby",
    engineeringScore: null,
    settings: systemSettings(),
  };
}

function clamp01(value: unknown, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(1, Math.max(0, value));
}

function asBool(value: unknown, fallback: boolean): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function sanitize(raw: Partial<GameState> | null): GameState {
  const base = createDefaultState();
  if (!raw || typeof raw !== "object") return base;
  const settings = raw.settings ?? {};
  return {
    ...base,
    ...raw,
    selectedEquipment: Array.isArray(raw.selectedEquipment) ? raw.selectedEquipment : [],
    completedSols: Array.isArray(raw.completedSols) ? raw.completedSols.filter((n) => typeof n === "number") : [],
    activeModules: Array.isArray(raw.activeModules) ? raw.activeModules : [],
    settings: {
      soundVolume: clamp01(settings.soundVolume, base.settings.soundVolume),
      musicVolume: clamp01(settings.musicVolume, base.settings.musicVolume),
      voiceInstructions: asBool(settings.voiceInstructions, base.settings.voiceInstructions),
      animations: asBool(settings.animations, base.settings.animations),
      highContrast: asBool(settings.highContrast, base.settings.highContrast),
      largeText: asBool(settings.largeText, base.settings.largeText),
      reducedMotion: asBool(settings.reducedMotion, base.settings.reducedMotion),
    },
  };
}

type Listener = (state: GameState) => void;

class GameStateStore {
  private state: GameState;
  private readonly listeners = new Set<Listener>();

  constructor() {
    this.state = this.read();
  }

  get(): GameState {
    return this.state;
  }

  patch(partial: Partial<Omit<GameState, "settings">>): void {
    this.state = { ...this.state, ...partial };
    this.persist();
    this.emit();
  }

  patchSettings(partial: Partial<Settings>): void {
    this.state = {
      ...this.state,
      settings: { ...this.state.settings, ...partial },
    };
    this.persist();
    this.emit();
  }

  resetProgress(): void {
    const settings = this.state.settings;
    this.state = { ...createDefaultState(), settings };
    this.persist();
    this.emit();
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit(): void {
    for (const listener of this.listeners) listener(this.state);
  }

  private read(): GameState {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return createDefaultState();
      return sanitize(JSON.parse(raw) as Partial<GameState>);
    } catch {
      return createDefaultState();
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch {
      // Private browsing can block storage. The session still keeps state in memory.
    }
  }
}

export const gameState = new GameStateStore();
