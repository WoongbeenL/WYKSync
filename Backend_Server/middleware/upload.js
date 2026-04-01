/*
 * File Name    : upload.js
 * Project      : PROG3221 - Capstone Project
 * Programmers  : Will Lee
 * Date         : 4/1/2026
 * Description  : This is a js file that creates an upload middleware for image uploading.
 */

const multer = require("multer");

const storage = multer.memoryStorage(); // Store in memory as a buffer and pass to cloudinary.

const upload = multer({
  storage,
  limits: { fileSize: 2 * 1024 * 1024 }, // Max 2MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.mimetype)) {
      return cb(new Error("Only JPEG, "));
    }
    cb(null, true);
  },
});

module.exports = upload;
