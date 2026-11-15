# NASA data integration

The title screen uses the existing server-side NASA proxy at
`GET /api/nasa/space-weather`. The endpoint requests the official NASA CCMC
DONKI Solar Flare (`FLR`) and Coronal Mass Ejection (`CME`) feeds, combines
their actual records, and returns `totalEvents` for the status indicator.

The server-side DONKI service applies a seven-day date range, a 30-day maximum,
a 15-second upstream timeout, and a ten-minute in-memory cache. The browser
also applies an eight-second display timeout so the title screen remains
usable when the server or NASA is unavailable.

Mars terrain uses the locally bundled Jezero CTX mosaic generated from the
verified NASA Mars Trek WMTS layer:

`JEZ_ctx_B_soc_008_orthoMosaic_6m_Eqc_latTs0_lon0`

The verified capabilities URL is recorded in
`server/data/jezero-ctx-metadata.json`, and the source remains NASA Mars Trek.

For deployment, run the server proxy with its server-side environment
configuration. Do not put a NASA credential in frontend `VITE_` variables.
If deploying the proxy through Vercel, configure the server-only NASA
environment variables in **Project Settings → Environment Variables** and
deploy the API route alongside the frontend.
