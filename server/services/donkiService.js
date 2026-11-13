
const NASA_BASE_URL = "https://api.nasa.gov/DONKI";

let cachedData = null;
let lastFetchedAt = 0;

const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes

export async function getSpaceWeather() {
  if (
    cachedData &&
    Date.now() - lastFetchedAt < CACHE_DURATION
  ) {
    return { ...cachedData, cached: true };
  }

  const apiKey = process.env.NASA_API_KEY;

  if (!apiKey) {
    throw new Error("NASA_API_KEY is missing from .env");
  }

  const endDate = new Date();
  const startDate = new Date();
  startDate.setUTCDate(startDate.getUTCDate() - 7);

  const formatDate = (date) =>
    date.toISOString().slice(0, 10);

  const params = new URLSearchParams({
    startDate: formatDate(startDate),
    endDate: formatDate(endDate),
    api_key: apiKey
  });

  const response = await fetch(
    `${NASA_BASE_URL}/notifications?${params}`
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `NASA DONKI returned ${response.status}: ${errorText}`
    );
  }

  const notifications = await response.json();

  const events = Array.isArray(notifications)
    ? notifications.map((item, index) => ({
        id: item.messageID || `event-${index}`,
        type: item.messageType || "Unknown",
        issuedAt: item.messageIssueTime || null,
        title: item.messageType || "Space weather update",
        description: item.messageBody || "",
        sourceUrl: item.messageURL || null
      }))
    : [];

  events.sort(
    (a, b) =>
      new Date(b.issuedAt || 0) -
      new Date(a.issuedAt || 0)
  );

  const result = {
    source: "NASA DONKI",
    fetchedAt: new Date().toISOString(),
    period: {
      start: formatDate(startDate),
      end: formatDate(endDate)
    },
    totalEvents: events.length,
    latestEvents: events.slice(0, 5),
    status: events.length > 0
      ? "EVENTS_REPORTED"
      : "NO_EVENTS_REPORTED"
  };

  cachedData = result;
  lastFetchedAt = Date.now();

  return { ...result, cached: false };
}
