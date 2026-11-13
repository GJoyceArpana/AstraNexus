export type SolBrief = {
  sol: number;
  title: string;
  summary: string;
  objectives: string[];
  challenges: string[];
};

export const solBriefs: SolBrief[] = [
  {
    sol: 1,
    title: "BUILD YOUR SHIELD",
    summary: "Hold habitat pressure, pile regolith, and spend rover battery with care.",
    objectives: ["Keep pressure in the safe band", "Build regolith shielding", "Balance rover battery use"],
    challenges: ["Shielding takes power from the rover"],
  },
  {
    sol: 2,
    title: "THE DUST PROBLEM",
    summary: "Perchlorate dust sticks to suits. The suitport has to clean it off.",
    objectives: ["Watch contamination", "Run the suitport", "Keep the crew clear of dust"],
    challenges: ["Dust returns after surface work"],
  },
  {
    sol: 3,
    title: "THE GREAT DUST STORM",
    summary: "Sunlight drops. Choose what stays powered, and meet the Kilopower idea.",
    objectives: ["Manage a smaller power budget", "Keep life support running"],
    challenges: ["Solar generation falls during the storm"],
  },
  {
    sol: 4,
    title: "GROWING FOOD AND MAKING OXYGEN",
    summary: "MOXIE, the ice melter, and the LED potato greenhouse share one power board.",
    objectives: ["Make oxygen", "Melt subsurface ice", "Feed the greenhouse"],
    challenges: ["All three systems want power"],
  },
  {
    sol: 5,
    title: "THE 20-MINUTE DECISION",
    summary: "A simulated delay means the crew needs commands prepared in advance.",
    objectives: ["Retract solar panels", "Seal the suitport", "Divert power", "Shelter the crew"],
    challenges: ["You cannot wait for a real-time answer"],
  },
  {
    sol: 6,
    title: "SYSTEM STRESS TEST",
    summary: "A micrometeorite scenario stresses pressure and drops oxygen to a 35% warning.",
    objectives: ["Respond to hull damage", "Stretch the oxygen that remains"],
    challenges: ["Several systems complain at once"],
  },
  {
    sol: 7,
    title: "THE JOURNEY HOME",
    summary: "Plan food, water, oxygen, exercise, and storage for a seven-month return.",
    objectives: ["Balance supplies", "Keep room for exercise equipment", "Respect mass limits"],
    challenges: ["The ship cannot carry everything"],
  },
];
