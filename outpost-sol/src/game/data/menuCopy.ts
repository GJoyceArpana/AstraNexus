export const menuCopy = {
  eyebrow: "MARS RESEARCH OUTPOST",
  title: "OUTPOST SOL",
  subtitle: "FIVE WAYS NOT TO POP!",
  tagline: "Your mission. Your Mars base. Your survival.",
  buttons: {
    start: "START MISSION",
    howTo: "HOW TO PLAY",
    objectives: "MISSION OBJECTIVES",
    settings: "SETTINGS",
  },
  attribution:
    "Made for the NASA Space Apps Challenge 2026. An independent educational game. Not an official NASA mission or endorsement.",
  vistaLabel: "SURFACE VIEW  ·  SIMULATED",
  howToTitle: "HOW TO PLAY",
  howToIntro:
    "You are caring for a pretend Mars outpost. The numbers in this game are a simulation, made for learning and play.",
  objectivesTitle: "MISSION OBJECTIVES",
  objectivesIntro: "Seven sols. Each one teaches a different way to keep the crew safe.",
  settingsTitle: "SETTINGS",
  launchTitle: "CREW CALLED",
  launchNote:
    "Standby readings below are simulated placeholders. Choosing a mission mode is the next step.",
  roger: "ROGER THAT",
  done: "DONE",
} as const;

export const fiveWays = [
  {
    title: "Don't pop the tent",
    detail: "Mars air is far too thin to breathe. The habitat holds a safe pocket of air. Pump it too hard and a weak shell can pop.",
  },
  {
    title: "Cover the habitat",
    detail: "A mound of regolith — Mars soil — helps block space radiation in this simulation.",
  },
  {
    title: "Clean the dust",
    detail: "Sticky reddish dust can carry perchlorates. The suitport is where the crew brushes it off.",
  },
  {
    title: "Share the power",
    detail: "Solar panels can fade in a dust storm. You choose which machines stay switched on.",
  },
  {
    title: "Pack for the trip home",
    detail: "Oxygen, water, and food have to last through the mission and the long journey back.",
  },
] as const;
