export type BleepMood = "idle" | "talk" | "excited" | "warning" | "thinking";

export type BleepLine = {
  id: string;
  mood: BleepMood;
  text: string;
};

export const bleepLines = {
  greeting: {
    id: "greeting",
    mood: "talk",
    text: "Hey, Cadet! Mars is an amazing place, but surviving here takes teamwork!",
  },
  startMission: {
    id: "start-mission",
    mood: "excited",
    text: "Suit sealed! Next we'll choose your mission mode. I can't wait!",
  },
  pressureHigh: {
    id: "pressure-high",
    mood: "warning",
    text: "Careful! Your habitat pressure is getting too high!",
  },
  shieldGood: {
    id: "shield-good",
    mood: "excited",
    text: "Great job! Your regolith shielding is protecting the outpost.",
  },
  howToPlay: {
    id: "how-to-play",
    mood: "thinking",
    text: "Five lessons keep this outpost standing. Start with the tent — then we learn the rest together.",
  },
  settings: {
    id: "settings",
    mood: "idle",
    text: "You can make the sounds, words, and motion comfortable for you.",
  },
} as const satisfies Record<string, BleepLine>;
