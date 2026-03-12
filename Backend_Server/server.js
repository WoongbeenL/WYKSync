/*
 * File Name    : server.js
 * Project      : PROG3221 - Capstone Project
 * Programmers  : Will Lee
 * Date         : 2/12/2026
 * Description  : This is a Node.js file to host a backend server for WYKSync.
 */

require("dotenv").config();

const express = require("express");
const cors = require("cors");

const meRoutes = require("./routes/me");
const teamRoutes = require("./routes/team");
const tournamentRoutes = require("./route/tournament");

const app = express();

const allowedOrigins = [
  process.env.FRONTEND_URL,
  "http://localhost:5173",
].filter(Boolean);

// Security Middleware
app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      console.log("Blocked by CORS:", origin);
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);

app.use(express.json());

// Root of API
app.get("/", (req, res) => {
  res.json({
    service: "WYKSync API",
    status: "Running",
    version: "1.0.0",
  });
});

// /health Route of API
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// /me Route of API
app.use("/me", meRoutes);
// /team Route of API
app.use("/team", teamRoutes);
// /tournament Route of API
app.use("/tournament", tournamentRoutes);

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: "Internal Server Error" });
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`),
);
