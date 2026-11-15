import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nasaRoutes from "./routes/nasa.js";
import { getCsaFoodProductionData } from "./services/csaFoodService.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (same-origin on Vercel, curl, mobile apps)
    // plus localhost and any *.vercel.app deployment
    if (
      !origin ||
      origin === "http://localhost:5173" ||
      origin === "http://127.0.0.1:5173" ||
      origin.endsWith(".vercel.app")
    ) {
      callback(null, true);
    } else {
      callback(new Error(`CORS blocked for origin: ${origin}`));
    }
  }
}));

app.use(express.json());

app.get(["/", "/api"], (_req, res) => {
  res.json({
    message: "ASTRA NEXUS Mission Control API",
    status: "ONLINE"
  });
});

app.get("/api/csa/food-production", (_req, res) => {
  res.json(getCsaFoodProductionData());
});

app.use("/api/nasa", nasaRoutes);

if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log("ASTRA NEXUS BACKEND");
    console.log(`Server running at http://localhost:${PORT}`);
  });
}

export default app;