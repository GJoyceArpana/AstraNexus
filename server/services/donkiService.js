const NASA_BASE_URL = "https://api.nasa.gov/DONKI";
const CACHE_DURATION = 10 * 60 * 1000;
const REQUEST_TIMEOUT = 8000;

const cache = new Map();

export class DonkiError extends Error {
  constructor(message, statusCode = 502) {
    super(message);
    this.name = "DonkiError";
    this.statusCode = statusCode;
  }
}

function formatDate(date) {
  return date.toISOString().slice(0, 10);
}

function parseDate(value, field) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new DonkiError(`Invalid ${field}. Use YYYY-MM-DD.`, 400);
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime()) || formatDate(date) !== value) {
    throw new DonkiError(`Invalid ${field}. Use YYYY-MM-DD.`, 400);
  }

  return date;
}

export function resolveDateRange(startDateValue, endDateValue) {
  const today = new Date();
  const endDate = endDateValue
    ? parseDate(endDateValue, "endDate")
    : new Date(`${formatDate(today)}T00:00:00.000Z`);
  const startDate = startDateValue
    ? parseDate(startDateValue, "startDate")
    : new Date(endDate);

  if (!startDateValue) {
    startDate.setUTCDate(startDate.getUTCDate() - 7);
  }

  if (startDate > endDate) {
    throw new DonkiError("startDate must be on or before endDate.", 400);
  }

  const rangeInDays = (endDate - startDate) / (24 * 60 * 60 * 1000);
  if (rangeInDays > 30) {
    throw new DonkiError("Date range cannot exceed 30 days.", 400);
  }

  return {
    startDate: formatDate(startDate),
    endDate: formatDate(endDate)
  };
}

function normalizeEvent(item, type, index) {
  const id = item.messageID || item.flrID || item.activityID || item.cmeID;
  const issuedAt =
    item.messageIssueTime ||
    item.beginTime ||
    item.startTime ||
    item.issueTime ||
    null;

  return {
    id: id || `${type.toLowerCase()}-${index}`,
    type,
    issuedAt,
    title:
      item.messageType ||
      item.classType ||
      item.note ||
      `${type} event`,
    description:
      item.messageBody ||
      item.note ||
      item.comments ||
      "",
    sourceUrl: item.messageURL || null,
    classType: item.classType || null
  };
}

async function fetchDonki(endpoint, range) {
  const apiKey = process.env.NASA_API_KEY;
  if (!apiKey) {
    throw new DonkiError("NASA DONKI is not configured.", 502);
  }

  const params = new URLSearchParams({
    startDate: range.startDate,
    endDate: range.endDate,
    api_key: apiKey
  });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const baseUrl = process.env.NASA_DONKI_BASE_URL || NASA_BASE_URL;
    const response = await fetch(`${baseUrl}/${endpoint}?${params}`, {
      signal: controller.signal
    });

    if (!response.ok) {
      throw new DonkiError("NASA DONKI returned an upstream error.", 502);
    }

    const data = await response.json();
    if (!Array.isArray(data)) {
      throw new DonkiError("NASA DONKI returned an invalid response.", 502);
    }

    return data;
  } catch (error) {
    if (error instanceof DonkiError) throw error;
    if (error.name === "AbortError") {
      throw new DonkiError("NASA DONKI request timed out.", 502);
    }
    throw new DonkiError("Unable to reach NASA DONKI.", 502);
  } finally {
    clearTimeout(timeout);
  }
}

async function getEvents(endpoint, type, startDate, endDate) {
  const range = resolveDateRange(startDate, endDate);
  const cacheKey = `${endpoint}:${range.startDate}:${range.endDate}`;
  const cached = cache.get(cacheKey);

  if (cached && Date.now() - cached.fetchedAt < CACHE_DURATION) {
    return { ...cached.data, cached: true };
  }

  const items = await fetchDonki(endpoint, range);
  const events = items
    .map((item, index) => normalizeEvent(item, type, index))
    .sort(
      (a, b) =>
        new Date(b.issuedAt || 0).getTime() -
        new Date(a.issuedAt || 0).getTime()
    );
  const result = {
    source: "NASA DONKI",
    fetchedAt: new Date().toISOString(),
    period: range,
    totalEvents: events.length,
    latestEvents: events.slice(0, 5),
    status: events.length > 0 ? "EVENTS_REPORTED" : "NO_EVENTS_REPORTED"
  };

  cache.set(cacheKey, { data: result, fetchedAt: Date.now() });
  return { ...result, cached: false };
}

export function getSpaceWeather(startDate, endDate) {
  return getEvents("notifications", "Notification", startDate, endDate);
}

export function getSolarFlares(startDate, endDate) {
  return getEvents("FLR", "Solar Flare", startDate, endDate);
}

export function getCMEs(startDate, endDate) {
  return getEvents("CME", "CME", startDate, endDate);
}
