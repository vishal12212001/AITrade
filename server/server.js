import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

import authRoutes from "./routes/auth.js";
import adminRoutes from "./routes/admin.js";
import aiRoutes from "./routes/aiRoutes.js";
import accountRoutes from "./routes/accounts.js";

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

// ---- API ROUTES ----
app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/ai", aiRoutes);  
app.use("/api/accounts", accountRoutes);

// ---- DATABASE ----
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log("MongoDB connected"))
  .catch(err => console.log("MongoDB error:", err));

// ---- DEFAULT ROUTE ----
app.get("/", (req, res) => {
  res.send("AI Trade Backend is running...");
});

// ---- SERVER LISTEN ----
app.listen(process.env.PORT || 5000, () =>
  console.log("Server running")
);
