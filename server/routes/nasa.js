
import express from "express";

import {
  DonkiError,
  getCMEs,
  getSolarFlares,
  getSpaceWeather
} from "../services/donkiService.js";

const router = express.Router();

function routeError(res, error) {
  const statusCode =
    error instanceof DonkiError
      ? error.statusCode
      : 502;

  console.error(
    "DONKI request failed:",
    error.message
  );

  return res.status(statusCode).json({
    success: false,
    message:
      statusCode === 400
        ? error.message
        : "Unable to retrieve NASA DONKI data."
  });
}

function dateQuery(req) {
  const { startDate, endDate } = req.query;

  if (
    (startDate !== undefined &&
      typeof startDate !== "string") ||
    (endDate !== undefined &&
      typeof endDate !== "string")
  ) {
    throw new DonkiError(
      "Provide one valid startDate and endDate.",
      400
    );
  }

  return { startDate, endDate };
}

async function handleRequest(res, request) {
  try {
    const data = await request();

    return res.json({
      success: true,
      ...data
    });
  } catch (error) {
    return routeError(res, error);
  }
}

router.get("/space-weather", (req, res) => {
  return handleRequest(res, () => {
    const { startDate, endDate } = dateQuery(req);

    return getSpaceWeather(startDate, endDate);
  });
});

router.get("/solar-flares", (req, res) => {
  return handleRequest(res, () => {
    const { startDate, endDate } = dateQuery(req);

    return getSolarFlares(startDate, endDate);
  });
});

router.get("/cmes", (req, res) => {
  return handleRequest(res, () => {
    const { startDate, endDate } = dateQuery(req);

    return getCMEs(startDate, endDate);
  });
});

export default router;
