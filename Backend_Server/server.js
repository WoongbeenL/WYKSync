/*
* Filename     : server.js
* Project      : PROG3221 - Capstone Project
* Programmers  : Will Lee
* Date         : 2/12/2026
* Description  : This is a Node.js file to host a backend server for WYKSync.
*/

const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.send("Backend running");
});

app.use(cors({
  origin: process.env.FRONTEND_URL
}));

const PORT = process.env.PORT || 10000;
app.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on ${PORT}`)
);
