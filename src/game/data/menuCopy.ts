export type InfoSection = {
  heading: string;
  paragraphs: string[];
  bullets: string[];
};

export const howToPlay: InfoSection = {
  heading: "HOW TO PLAY",
  paragraphs: [
    "You lead a Mars training outpost with Bleep, a friendly robot. Every number in this game is a simulation.",
  ],
  bullets: [
    "Pick Junior Cadet or Flight Director.",
    "Choose a landing site with gameplay modifiers.",
    "Pack a hull and tools. Each choice has a trade-off.",
    "Watch air, water, food, power, and the habitat shell.",
    "Power a few machines at a time. You cannot run them all.",
    "If a sol goes wrong, rewind and try a new plan.",
  ],
};

export const missionObjectives: InfoSection = {
  heading: "MISSION OBJECTIVES",
  paragraphs: [
    "Five ways not to pop — and to bring the crew home.",
  ],
  bullets: [
    "Keep habitat pressure in a safe range.",
    "Build regolith shielding and keep dust off the crew.",
    "Share limited power across life support.",
    "Make oxygen, melt ice, and grow food.",
    "Leave ready commands for the twenty-minute delay.",
    "Save enough air, water, and food for the journey home.",
  ],
};

export const departureCopy: InfoSection = {
  heading: "READY FOR DEPARTURE",
  paragraphs: [
    "Suit up! First we pick how you want to train.",
    "The next room is mission mode: Junior Cadet or Flight Director. That screen is the next stage, so this check sends you back to the title for now.",
  ],
  bullets: [],
};

export const attribution =
  "Made for NASA Space Apps Challenge 2026. Educational fan project — not an official NASA mission and not endorsed by NASA. Numbers in this game are simulations, not live NASA measurements.";

export function sectionPlainText(section: InfoSection): string {
  return [section.heading, ...section.paragraphs, ...section.bullets].join(". ");
}
