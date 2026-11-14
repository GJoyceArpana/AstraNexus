/**
 * Scene keys for Outpost Sol.
 * Crew setup uses OutpostCrewScene because CustomizationScene is already
 * used by the existing Astra Nexus flow.
 */
export const SceneKeys = {
  boot: "BootScene",
  mainMenu: "OutpostMainMenu",
  ageSelection: "AgeSelectionScene",
  landingSite: "LandingSiteScene",
  customization: "OutpostCrewScene",
  experiment: "ExperimentScene",
  briefing: "MissionBriefingScene",
  marsBase: "MarsBaseScene",
  power: "PowerManagementScene",
  emergency: "EmergencyScene",
  results: "ResultsScene",
  legacyStart: "StartScene",
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
