
const NASA_BASE_URL =
  "https://ccmc.gsfc.nasa.gov/DONKI-API/get";

const CACHE_DURATION = 10 * 60 * 1000;
const REQUEST_TIMEOUT = 15000;
const MAX_RANGE_DAYS = 30;
const DEFAULT_RANGE_DAYS = 7;

const cache = new Map();

export class DonkiError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = "DonkiError";
    this.statusCode = statusCode;
  }
}

// Format a date as YYYY-MM-DD in UTC.
function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

// Validate date format and actual calendar date.
function parseDate(value, field) {
  if (
    typeof value !== "string" ||
    !/^\d{4}-\d{2}-\d{2}$/.test(value)
  ) {
    throw new DonkiError(
      `Invalid ${field}. Use YYYY-MM-DD.`,
      400
    );
  }

  const date = new Date(`${value}T00:00:00.000Z`);

  if (
    Number.isNaN(date.getTime()) ||
    formatDate(date) !== value
  ) {
    throw new DonkiError(
      `Invalid ${field}. Use YYYY-MM-DD.`,
      400
    );
  }

  return date;
}

// Default: latest seven days.
// Maximum: 30 days.
export function resolveDateRange(
  startDateValue,
  endDateValue
) {
  const today = new Date();

  const endDate = endDateValue
    ? parseDate(endDateValue, "endDate")
    : new Date(`${formatDate(today)}T00:00:00.000Z`);

  const startDate = startDateValue
    ? parseDate(startDateValue, "startDate")
    : new Date(endDate);

  if (!startDateValue) {
    startDate.setUTCDate(
      startDate.getUTCDate() - DEFAULT_RANGE_DAYS
    );
  }

  if (startDate > endDate) {
    throw new DonkiError(
      "startDate must be on or before endDate.",
      400
    );
  }

  const rangeInDays =
    (endDate.getTime() - startDate.getTime()) /
    (24 * 60 * 60 * 1000);

  if (rangeInDays > MAX_RANGE_DAYS) {
    throw new DonkiError(
      "Date range cannot exceed 30 days.",
      400
    );
  }

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
}

// Normalize NASA Solar Flare records.
function normalizeSolarFlare(item) {
  return {
    flrID: item.flrID ?? null,
    beginTime: item.beginTime ?? null,
    peakTime: item.peakTime ?? null,
    endTime: item.endTime ?? null,
    classType: item.classType ?? null,
    sourceLocation: item.sourceLocation ?? null,
    activeRegionNum: item.activeRegionNum ?? null,
    instruments: Array.isArray(item.instruments)
      ? item.instruments
      : [],
    link: item.link ?? null
  };
}

// Normalize NASA CME records.
function normalizeCME(item) {
  const analyses = Array.isArray(item.cmeAnalyses)
    ? item.cmeAnalyses
    : [];

  const preferredAnalysis =
    analyses.find(
      (analysis) => analysis.isMostAccurate === true
    ) ?? analyses[0] ?? null;

  return {
    activityID: item.activityID ?? null,
    startTime: item.startTime ?? null,
    sourceLocation: item.sourceLocation ?? null,
    activeRegionNum: item.activeRegionNum ?? null,
    catalog: item.catalog ?? null,
    note: item.note ?? null,

    cmeAnalyses: analyses.map((analysis) => ({
      speed: analysis.speed ?? null,
      latitude: analysis.latitude ?? null,
      longitude: analysis.longitude ?? null,
      halfAngle: analysis.halfAngle ?? null,
      isMostAccurate: analysis.isMostAccurate ?? null
    })),

    speed: preferredAnalysis?.speed ?? null,
    latitude: preferredAnalysis?.latitude ?? null,
    longitude: preferredAnalysis?.longitude ?? null,
    halfAngle: preferredAnalysis?.halfAngle ?? null,
    isMostAccurate:
      preferredAnalysis?.isMostAccurate ?? null,

    link: item.link ?? null
  };
}

// Normalize NASA DONKI notifications.
function normalizeNotification(item) {
  return {
    messageID: item.messageID ?? null,
    messageType: item.messageType ?? null,
    messageIssueTime: item.messageIssueTime ?? null,
    messageBody: item.messageBody ?? null,
    messageURL: item.messageURL ?? null
  };
}

// Request data from the official NASA CCMC DONKI API.
async function fetchDonki(endpoint, range) {
  const baseUrl = (
    process.env.NASA_DONKI_BASE_URL || NASA_BASE_URL
  ).replace(/\/+$/, "");

  const params = new URLSearchParams({
    startDate: range.startDate,
    endDate: range.endDate
  });

  const url = `${baseUrl}/${endpoint}?${params.toString()}`;

  const controller = new AbortController();

  const timeout = setTimeout(
    () => controller.abort(),
    REQUEST_TIMEOUT
  );

  try {
    console.log(`DONKI request: ${endpoint}`);

    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      headers: {
        Accept: "application/json"
      }
    });

    if (!response.ok) {
      // Do not log the full URL or sensitive query parameters.
      console.error(
        "DONKI upstream HTTP status:",
        response.status,
        response.statusText
      );

      throw new DonkiError(
        `NASA DONKI returned HTTP ${response.status}.`,
        502
      );
    }

    const data = await response.json();

    if (!Array.isArray(data)) {
      throw new DonkiError(
        "NASA DONKI returned an invalid response.",
        502
      );
    }

    return data;
  } catch (error) {
    if (error instanceof DonkiError) {
      throw error;
    }

    if (error.name === "AbortError") {
      throw new DonkiError(
        "NASA DONKI request timed out.",
        502
      );
    }

    console.error(
      "DONKI connection error:",
      error.message
    );

    throw new DonkiError(
      "Unable to reach NASA DONKI.",
      502
    );
  } finally {
    clearTimeout(timeout);
  }
}

// Retrieve, normalize, sort and cache events.
async function getEvents(
  endpoint,
  normalizer,
  startDate,
  endDate
) {
  const range = resolveDateRange(
    startDate,
    endDate
  );

  const cacheKey =
    `${endpoint}:${range.startDate}:${range.endDate}`;

  const cached = cache.get(cacheKey);

  if (
    cached &&
    Date.now() - cached.fetchedAt < CACHE_DURATION
  ) {
    return {
      ...cached.data,
      cached: true
    };
  }

  const items = await fetchDonki(endpoint, range);

  const events = items
    .map(normalizer)
    .sort((a, b) => {
      const dateA = new Date(
        a.beginTime ||
        a.startTime ||
        a.messageIssueTime ||
        0
      ).getTime();

      const dateB = new Date(
        b.beginTime ||
        b.startTime ||
        b.messageIssueTime ||
        0
      ).getTime();

      return dateB - dateA;
    });

  const result = {
    source: "NASA DONKI",
    fetchedAt: new Date().toISOString(),
    period: range,
    totalEvents: events.length,
    data: events,
    status:
      events.length > 0
        ? "EVENTS_REPORTED"
        : "NO_EVENTS_REPORTED"
  };

  cache.set(cacheKey, {
    data: result,
    fetchedAt: Date.now()
  });

  return {
    ...result,
    cached: false
  };
}

// Public service functions.
export function getSpaceWeather(startDate, endDate) {
  return getEvents(
    "notifications",
    normalizeNotification,
    startDate,
    endDate
  );
}

export function getSolarFlares(startDate, endDate) {
  return getEvents(
    "FLR",
    normalizeSolarFlare,
    startDate,
    endDate
  );
}

export function getCMEs(startDate, endDate) {
  return getEvents(
    "CME",
    normalizeCME,
    startDate,
    endDate
  );
}
