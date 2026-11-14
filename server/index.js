
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import nasaRoutes from "./routes/nasa.js";

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
app.get("/api/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "Outpost Sol backend is running",
    timestamp: new Date().toISOString()
  });
});

app.use("/api/nasa", nasaRoutes);

app.listen(PORT, () => {
  console.log("ASTRA NEXUS BACKEND");
  console.log(`Server running at http://localhost:${PORT}`);
});
