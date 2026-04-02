/*
 * File Name    : cloudinary.js
 * Project      : PROG3221 - Capstone Project
 * Programmers  : Will Lee
 * Date         : 4/1/2026
 * Description  : This is a js file that creates a cloudinary module to be used by middleware and routes.
 */

const cloudinary = require("cloudinary").v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

module.exports = cloudinary;
