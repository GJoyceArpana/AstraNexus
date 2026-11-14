import express from "express";
import { getSpaceWeather } from "../services/donkiService.js";
import {
  getMarsWeatherTelemetry,
  getSol2State,
  processSol2EventDecision
} from "../services/marsWeatherService.js";

const router = express.Router();

/**
 * GET /api/nasa/space-weather
 * NASA DONKI Solar Flare & CME Telemetry
 */
router.get("/space-weather", async (req, res) => {
  try {
    const data = await getSpaceWeather();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("DONKI API error:", error.message);
    res.status(502).json({
      success: false,
      message: "Unable to retrieve NASA space-weather data.",
      error: error.message
    });
  }
});

/**
 * GET /api/nasa/mars-weather
 * NASA InSight Mars Atmospheric Telemetry (Pressure, Wind Gusts, Dust Opacity tau)
 */
router.get("/mars-weather", async (req, res) => {
  try {
    const data = await getMarsWeatherTelemetry();
    res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error("Mars Weather API error:", error.message);
    res.status(500).json({
      success: false,
      message: "Failed to fetch NASA Mars atmospheric weather data.",
      error: error.message
    });
  }
});

/**
 * GET /api/nasa/dust-event
 * Returns current Arcadia Planitia Dust Storm Event Telemetry & Decision Options
 */
router.get("/dust-event", async (req, res) => {
  try {
    const weather = await getMarsWeatherTelemetry();
    const sol2State = getSol2State();

    res.json({
      success: true,
      event: "A Martian dust devil just coated our radiator fins in toxic perchlorate salt and jammed the outdoor ice-pipe valve!",
      location: "Arcadia Planitia",
      sol: 2,
      telemetry: weather.dustTelemetry,
      weather: {
        atmosphericPressurePa: weather.atmosphericPressurePa,
        temperature: weather.temperature,
        wind: weather.wind
      },
      choices: [
        {
          id: "A",
          title: "Send Astronaut Outside to Clear Ice Pipe",
          benefit: "Ice Melter stays at 100% efficiency (+50% Water Production) for the Night Shift.",
          cost: "Suit gets covered in toxic perchlorate dust. Set lockedSuitportPlug = true and force modules.suitport = true for the Night Shift—leaving player with only 2 free Power Plugs across MOXIE, Ice Melter, and Greenhouse!"
        },
        {
          id: "B",
          title: "Stay Inside & Let Ice Pipe Freeze",
          benefit: "Nobody gets contaminated—keep all 3 Power Plugs free to allocate for the Night Shift (Suitport can remain unplugged).",
          cost: "Set icePipeFrozen = true—Subsurface Ice Melter loses 50% efficiency (+25% water instead of +50%) during the Night Shift."
        }
      ],
      currentState: sol2State
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/nasa/sol2/state
 * Retrieves current persistent Sol 2 engineering state
 */
router.get("/sol2/state", (req, res) => {
  try {
    const state = getSol2State();
    res.json({
      success: true,
      state
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/nasa/sol2/event-decision
 * Accepts choice: "A" | "B" and updates backend state
 */
router.post("/sol2/event-decision", (req, res) => {
  try {
    const { choice } = req.body;
    if (!choice || (choice !== "A" && choice !== "B")) {
      return res.status(400).json({
        success: false,
        message: "Invalid choice. Must be 'A' or 'B'."
      });
    }

    const updatedState = processSol2EventDecision(choice);
    res.json({
      success: true,
      message: `Night shift protocol established: Choice ${choice}`,
      state: updatedState
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

export default router;
