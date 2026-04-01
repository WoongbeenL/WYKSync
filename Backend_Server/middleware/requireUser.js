/*
 * File Name    : requireUser.js
 * Project      : PROG3221 - Capstone Project
 * Programmers  : Will Lee
 * Date         : 2/17/2026
 * Description  : This is a js file that creates a middleware to be used by routes after authentication.
 */

const supabase = require("../lib/supabase");

async function requireUser(req, res, next) {
  try {
    // Grab authorization from http request header
    const authorizationHeader = req.headers.authorization;

    // Check if authorization header starts with "Bearer ", if not return status 401
    if (!authorizationHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Missing authorization token" });
    }

    // Parse out the token from the format "Bearer tokenblahblah"
    const token = authorizationHeader.split(" ")[1];

    // Use Supabase Auth getUser function
    const { data, error } = await supabase.auth.getUser(token);

    // If there is an error OR either data or data.user is missing/undefined/null return status 401
    if (error || !data?.user) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    //
    req.user = data.user;
    next();
  } catch (err) {
    console.error("requireUser error: ", err);
    res.status(500).json({ error: "Authentication Error" });
  }
}

module.exports = requireUser;
