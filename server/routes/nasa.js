
import express from "express";
import { getSpaceWeather } from "../services/donkiService.js";

const router = express.Router();

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

export default router;
