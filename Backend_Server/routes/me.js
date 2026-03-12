/*
 * File Name    : me.js
 * Project      : PROG3221 - Capstone Project
 * Programmers  : Will Lee
 * Date         : 2/17/2026
 * Description  : This is a js file to handle /me route.
 */

const express = require("express");
const router = express.Router();

const supabase = require("../lib/supabase");
const requireUser = require("../middleware/requireUser");

router.use(requireUser);

/*
   Route Name   : GET /me/search
   Parameter    : display_name (query param)
   Return       : Json response
                  profiles: Array. Returns matching profiles.
   Purpose      : Searches for profiles by display_name.
                  Used to find users to add as tournament organisers.
*/
router.get("/search", async (req, res) => {
  try {
    const { display_name } = req.query;

    if (!display_name || !display_name.trim()) {
      return res
        .status(400)
        .json({ error: "display_name query parameter is required" });
    }

    if (display_name.trim().length < 3) {
      return res
        .status(400)
        .json({ error: "Search term must be at least 3 characters" });
    }

    const { data: profiles, error } = await supabase
      .from("profiles")
      .select("id, display_name")
      .ilike("display_name", `%${display_name.trim()}%`)
      .neq("id", req.user.id) // exclude the user requesting
      .limit(10);

    if (error) throw error;

    res.json({ profiles });
  } catch (err) {
    console.error("GET /me/search error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : GET /me
   Parameter    : Request object with current user id
   Return       : Json response
                  id: UUID. User ID
                  display name: CITEXT. Display Name
                  is_onboarded: Boolean. Has user been onboarded?
   Purpose      : This route returns the user data based on user ID.
*/
router.get("/", async (req, res) => {
  try {
    const userId = req.user.id;

    const { data, error } = await supabase
      .from("profiles")
      .select("id, display_name, is_onboarded")
      .eq("id", userId)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Profile not found" });
      }
      throw error;
    }

    res.json(data);
  } catch (err) {
    console.error("GET /me error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : PATCH /me/profile
   Parameter    : Request object with current user id
   Return       : Json response
                  profile: Object. Returns selected rows from Supabase.
   Purpose      : This route handles completing user profiles.
*/
router.patch("/profile", async (req, res) => {
  try {
    const userId = req.user.id;
    const { display_name } = req.body;

    if (!display_name || !display_name.trim()) {
      return res.status(400).json({ error: "display_name is required" });
    }

    const { data, error } = await supabase
      .from("profiles")
      .update({
        display_name: display_name.trim(),
        is_onboarded: true,
      })
      .eq("id", userId)
      .select()
      .single();

    if (error) {
      // Check for specific error codes.
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Profile not found" });
      }
      if (error.code === "23514") {
        return res
          .status(400)
          .json({ error: "display_name must be between 3 and 20 characters" });
      }
      if (error.code === "23505") {
        return res.status(409).json({ error: "display_name is already taken" });
      }
      throw error;
    }

    res.json({ profile: data });
  } catch (err) {
    console.error("PATCH /me/profile error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
