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
   Route Name   : GET /me
   Parameter    : Request object with current user id
   Return       : Json response
                  id: UUID. User ID
                  display name: CITEXT. Display Name
                  is_onboarded: Boolean. Has user been onboarded?
                  created_at: Timestampz. When profile was created
                  updated_at: Timestampz. When profile was updated
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

    if (error) throw error;

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
    // REMOVE LATER --------------------------------------------------
    if (!req.user.id) {
      console.error("PATCH /me/profile error: NULL User ID");
      return res.status(400).json({ error: "User ID is NULL or undefiend!" });
    }
    // REMOVE LATER --------------------------------------------------^^^^^^^^^^^^^^^^^^^^^^^^
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

    if (error) throw error;

    res.json({ profile: data });
  } catch (err) {
    console.error("PATCH /me/profile error: ", err);
    res.status(500).json({ error: err });
  }
});

module.exports = router;
