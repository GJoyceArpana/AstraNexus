
import express from "express";

import {
  getSpaceWeather,
  getSolarFlares,
  getCMEs
} from "../services/donkiService.js";

const router = express.Router();

function handleNASAError(res, error) {
  console.error("NASA API error:", error.message);

  const isBadRequest =
    error.message.startsWith("Invalid date") ||
    error.message.startsWith("Date range");

  res.status(isBadRequest ? 400 : 502).json({
    success: false,
    message: isBadRequest
      ? error.message
      : "Unable to retrieve NASA data. Please try again later."
  });
}

// General space-weather notifications
router.get("/space-weather", async (req, res) => {
  try {
    const data = await getSpaceWeather();
    res.json({ success: true, data });
  } catch (error) {
    handleNASAError(res, error);
  }
});

// Solar flares
router.get("/solar-flares", async (req, res) => {
  try {
    const data = await getSolarFlares(
      req.query.startDate,
      req.query.endDate
    );

    res.json({ success: true, data });
  } catch (error) {
    handleNASAError(res, error);
  }
});

// Coronal mass ejections
router.get("/cmes", async (req, res) => {
  try {
    const data = await getCMEs(
      req.query.startDate,
      req.query.endDate
    );

    res.json({ success: true, data });
  } catch (error) {
    handleNASAError(res, error);
  }
});

export default router;
