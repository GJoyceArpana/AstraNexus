/** Story lines for Bleep. The narrative team can edit this file without touching scenes. */

export const bleepLines = {
  menuGreeting:
    "Hey, Cadet! Mars is an amazing place, but surviving here takes teamwork!",
  menuStart: "Suit up! First we pick how you want to train.",
  pressureHigh: "Careful! Your habitat pressure is getting too high!",
  shieldPraise: "Great job! Your regolith shielding is protecting the outpost.",
} as const;

export type BleepLineId = keyof typeof bleepLines;
