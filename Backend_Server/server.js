/*
* Filename     : server.js
* Project      : PROG3221 - Capstone Project
* Programmers  : Will Lee
* Date         : 2/12/2026
* Description  : This is a Node.js file to host a backend server for WYKSync.
*/

require('dotenv').config();

const express = require("express");
const cors = require("cors");

const app = express();

// Seucirity Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || "https://localhost:5173"
}));

app.use(express.json());

// Root of API
app.get("/", (req, res) => {
  res.json({
    service: "WYKSync API",
    status: "Running",
    version: "1.0.0"
  })
});

// /health Route of API
app.get("/health", (req, res) => {
  res.status(200).json({ status: "ok" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).send("Internal Server Error");
});

const PORT = process.env.PORT || 10000;

app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on port ${PORT}`)
);
