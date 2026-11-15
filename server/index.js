
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nasaRoutes from "./routes/nasa.js";
import { getCsaFoodProductionData } from "../services/csaFoodService.js";

app.get("/api/csa/food-production", (_req, res) => {
    res.json(getCsaFoodProductionData());
});
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://127.0.0.1:5173"
  ]
}));

app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    message: "ASTRA NEXUS Mission Control API",
    status: "ONLINE"
  });
});

app.use("/api/nasa", nasaRoutes);

app.listen(PORT, () => {
  console.log("ASTRA NEXUS BACKEND");
  console.log(`Server running at http://localhost:${PORT}`);
});
