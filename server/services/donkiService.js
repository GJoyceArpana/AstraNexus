
const NASA_BASE_URL = "https://api.nasa.gov/DONKI";

const CACHE_DURATION = 10 * 60 * 1000;
const REQUEST_TIMEOUT = 10000;

const cache = new Map();

function getDateRange(start, end) {
  const endDate = end || new Date().toISOString().slice(0, 10);
  const startDate = start || (() => {
    const date = new Date(`${endDate}T00:00:00Z`);
    date.setUTCDate(date.getUTCDate() - 7);
    return date.toISOString().slice(0, 10);
  })();

  const isValidDate = (value) => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const date = new Date(`${value}T00:00:00Z`);
    return !Number.isNaN(date.getTime()) &&
      date.toISOString().slice(0, 10) === value;
  };

  if (!isValidDate(startDate) || !isValidDate(endDate)) {
    throw new Error("Invalid date. Use YYYY-MM-DD.");
  }

  const difference =
    (new Date(`${endDate}T00:00:00Z`) -
      new Date(`${startDate}T00:00:00Z`)) / 86400000;

  if (difference < 0 || difference > 30) {
    throw new Error("Date range must be between 0 and 30 days.");
  }

  return { startDate, endDate };
}

async function fetchDONKI(endpoint, start, end) {
  const apiKey = process.env.NASA_API_KEY;

  if (!apiKey) {
    throw new Error("NASA_API_KEY is missing from .env");
  }

  const { startDate, endDate } = getDateRange(start, end);
  const cacheKey = `${endpoint}:${startDate}:${endDate}`;

  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return { rawData: cached.data, cached: true, startDate, endDate };
  }

  const params = new URLSearchParams({
    startDate,
    endDate,
    api_key: apiKey
  });

  const response = await fetch(
    `${NASA_BASE_URL}/${endpoint}?${params}`,
    { signal: AbortSignal.timeout(REQUEST_TIMEOUT) }
  );

  if (!response.ok) {
    throw new Error(`NASA DONKI returned HTTP ${response.status}`);
  }

  const rawData = await response.json();

  if (!Array.isArray(rawData)) {
    throw new Error("Unexpected response format from NASA DONKI.");
  }

  cache.set(cacheKey, {
    data: rawData,
    timestamp: Date.now()
  });

  return { rawData, cached: false, startDate, endDate };
}

function sortByDate(events, field = "date") {
  return events.sort((a, b) =>
    new Date(b[field] || 0) - new Date(a[field] || 0)
  );
}

// 1. General space-weather notifications
export async function getSpaceWeather() {
  const result = await fetchDONKI("notifications");

  const events = result.rawData.map((item, index) => ({
    id: item.messageID || `event-${index}`,
    type: item.messageType || "Unknown",
    issuedAt: item.messageIssueTime || null,
    title: item.messageType || "Space weather update",
    description: item.messageBody || "",
    sourceUrl: item.messageURL || null
  }));

  sortByDate(events, "issuedAt");

  return {
    source: "NASA DONKI",
    fetchedAt: new Date().toISOString(),
    period: {
      start: result.startDate,
      end: result.endDate
    },
    totalEvents: events.length,
    latestEvents: events.slice(0, 5),
    status: events.length ? "EVENTS_REPORTED" : "NO_EVENTS_REPORTED",
    cached: result.cached
  };
}

// 2. Solar flare events
export async function getSolarFlares(start, end) {
  const result = await fetchDONKI("FLR", start, end);

  const events = result.rawData.map((item) => ({
    id: item.flrID || null,
    type: "SOLAR_FLARE",
    date: item.beginTime || null,
    peakTime: item.peakTime || null,
    endTime: item.endTime || null,
    classification: item.classType || "Unknown",
    sourceLocation: item.sourceLocation || null,
    activeRegionNumber: item.activeRegionNum || null,
    instruments: item.instruments || [],
    sourceUrl: item.link || null
  }));

  sortByDate(events);

  return {
    source: "NASA DONKI",
    endpoint: "FLR",
    fetchedAt: new Date().toISOString(),
    period: {
      start: result.startDate,
      end: result.endDate
    },
    totalEvents: events.length,
    events,
    cached: result.cached
  };
}

// 3. Coronal mass ejection events
export async function getCMEs(start, end) {
  const result = await fetchDONKI("CME", start, end);

  const events = result.rawData.map((item) => ({
    id: item.activityID || null,
    type: "CORONAL_MASS_EJECTION",
    date: item.startTime || null,
    sourceLocation: item.sourceLocation || null,
    activeRegionNumber: item.activeRegionNum || null,
    catalog: item.catalog || null,
    note: item.note || null,

    analyses: (item.cmeAnalyses || []).map((analysis) => ({
      time: analysis.time21_5 || null,
      speedKmPerSecond: analysis.speed ?? null,
      latitude: analysis.latitude ?? null,
      longitude: analysis.longitude ?? null,
      halfAngle: analysis.halfAngle ?? null,
      type: analysis.type || null,
      isMostAccurate: analysis.isMostAccurate ?? false
    })),

    sourceUrl: item.link || null
  }));

  sortByDate(events);

  return {
    source: "NASA DONKI",
    endpoint: "CME",
    fetchedAt: new Date().toISOString(),
    period: {
      start: result.startDate,
      end: result.endDate
    },
    totalEvents: events.length,
    events,
    cached: result.cached
  };
}
