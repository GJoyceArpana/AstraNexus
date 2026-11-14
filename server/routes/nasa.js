import express from "express";
import {
  DonkiError,
  getCMEs,
  getSolarFlares,
  getSpaceWeather
} from "../services/donkiService.js";

const router = express.Router();

function routeError(res, error) {
  const statusCode = error instanceof DonkiError ? error.statusCode : 502;
  console.error("DONKI request failed:", error.message);
  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 400
        ? error.message
        : "Unable to retrieve NASA space-weather data."
  });
}

function dateQuery(req) {
  return [req.query.startDate, req.query.endDate];
}

router.get("/space-weather", async (req, res) => {
  try {
    const [startDate, endDate] = dateQuery(req);
    res.json({
      success: true,
      data: await getSpaceWeather(startDate, endDate)
    });
  } catch (error) {
    routeError(res, error);
  }
});

router.get("/solar-flares", async (req, res) => {
  try {
    const [startDate, endDate] = dateQuery(req);
    res.json({
      success: true,
      data: await getSolarFlares(startDate, endDate)
    });
  } catch (error) {
    routeError(res, error);
  }
});

router.get("/cmes", async (req, res) => {
  try {
    const [startDate, endDate] = dateQuery(req);
    res.json({
      success: true,
      data: await getCMEs(startDate, endDate)
    });
  } catch (error) {
    routeError(res, error);
  }
});

export default router;
