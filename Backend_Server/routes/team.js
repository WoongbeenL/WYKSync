/*
 * File Name    : team.js
 * Project      : PROG3221 - Capstone Project
 * Programmers  : Will Lee
 * Date         : 3/4/2026
 * Description  : This is a js file to handle /team route.
 */

const express = require("express");
const router = express.Router();

const supabase = require("../lib/supabase");
const requireUser = require("../middleware/requireUser");

router.use(requireUser);

// -----------------------------------------------------------------
// Helper function

/*
   Function Name   : generateJoinCode
   Parameter    : N/A
   Return       : String: Random 6 characters
   Purpose      : This function creates a random join code.
*/
const generateJoinCode = async () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";

  while (true) {
    const join_code = Array.from({ length: 6 }, () =>
      chars.charAt(Math.floor(Math.random() * chars.length)),
    ).join("");

    const { data: existing } = await supabase
      .from("teams")
      .select("join_code")
      .eq("join_code", join_code)
      .maybeSingle();

    if (!existing) return join_code;
  }
};

/*
   Function Name   : isTeamCoach
   Parameter    : userId: INT. Id of the user to check for
                  teamId: INT. Id of the team to check for
   Return       : Boolean. Return true if data exists and error is false. Else, return false.
   Purpose      : This function checks if the user is a coach of the team
*/
const isTeamCoach = async (userId, teamId) => {
  const { data, error } = await supabase
    .from("team_members")
    .select("team_member_id")
    .eq("id", userId)
    .eq("team_id", teamId)
    .eq("role", "coach")
    .single();

  return Boolean(data) && !error;
};

// -----------------------------------------------------------------
// Routes

/*
   Route Name   : GET /team/current
   Parameter    : Request object with current user id
   Return       : Json response
                  team: Object. Returns current user's team data with role.
   Purpose      : Returns the authenticated user's current team.
*/
router.get("/current", async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: membership, error } = await supabase
      .from("team_members")
      .select("role, teams (*)")
      .eq("id", userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!membership?.teams) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({
      team: {
        ...membership.teams,
        role: membership.role,
      },
    });
  } catch (err) {
    console.error("GET /team/current error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : GET /team
   Parameter    : Request object with a join code
   Return       : Json response
                  team: Object. Returns team data.
   Purpose      : Returns a team by the join code.
*/
router.get("/", async (req, res) => {
  try {
    const { join_code } = req.query;

    if (!join_code) {
      return res
        .status(400)
        .json({ error: "join_code query parameter is required" });
    }

    const { data: team, error } = await supabase
      .from("teams")
      .select("*")
      .eq("join_code", join_code.toUpperCase())
      .single();

    if (error || !team) {
      return res.status(404).json({ error: "Team not found" });
    }

    res.json({ team });
  } catch (err) {
    console.error("GET /team error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : POST /team
   Parameter    : Request object with current user id
                  name: String. Team name.
   Return       : Json response
                  team: Object. Returns the created team.
   Purpose      : Creates a new team and assigns the creator as coach
                  in team_members.
*/
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Team name is required" });
    }

    // Check if the user is onboarded
    const { data: profile } = await supabase
      .from("profiles")
      .select("is_onboarded")
      .eq("id", userId)
      .single();

    if (!profile?.is_onboarded) {
      return res.status(403).json({
        error: "You must complete your profile before creating a team",
      });
    }

    // Check user is not already on a team
    const { data: currentMember } = await supabase
      .from("team_members")
      .select("team_member_id")
      .eq("id", userId)
      .maybeSingle();

    if (currentMember) {
      return res
        .status(409)
        .json({ error: "You are already a member of a team" });
    }

    const join_code = await generateJoinCode();

    const { data: team, error: teamError } = await supabase
      .from("teams")
      .insert({ name: name.trim(), join_code })
      .select()
      .single();

    if (teamError) {
      if (teamError.code === "23505") {
        return res
          .status(409)
          .json({ error: "A team with this name already exists" });
      }
      throw teamError;
    }

    const { error: memberError } = await supabase.from("team_members").insert({
      id: userId,
      team_id: team.team_id,
      role: "coach",
    });

    if (memberError) {
      // Delete the team if coach assignment fails
      await supabase.from("teams").delete().eq("team_id", team.team_id);
      throw memberError;
    }

    res.status(201).json({ team });
  } catch (err) {
    console.error("POST /team error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : POST /team/join
   Parameter    : Request object with current user id
                  join_code: String. Team join code.
   Return       : Json response
                  member: Object. Returns the created team_member row.
   Purpose      : Allows onboarded users to join a team using the join code.
*/
router.post("/join", async (req, res) => {
  try {
    const userId = req.user.id;
    const { join_code } = req.body;

    if (!join_code || !join_code.trim()) {
      return res.status(400).json({ error: "join_code is required" });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("is_onboarded")
      .eq("id", userId)
      .single();

    if (!profile?.is_onboarded) {
      return res.status(403).json({
        error: "You must complete your profile before joining a team",
      });
    }

    // Look up the team by join code
    const { data: team, error: teamError } = await supabase
      .from("teams")
      .select("team_id")
      .eq("join_code", join_code.toUpperCase())
      .single();

    if (teamError || !team) {
      return res.status(404).json({ error: "Team not found" });
    }

    // Insert user into team_members as a player
    const { data: member, error: memberError } = await supabase
      .from("team_members")
      .insert({
        id: userId,
        team_id: team.team_id,
        role: "player",
      })
      .select()
      .single();

    if (memberError) {
      // User is already on a team (unique constraint on id)
      if (memberError.code === "23505") {
        return res
          .status(409)
          .json({ error: "You are already a member of a team" });
      }
      throw memberError;
    }

    res.status(201).json({ member });
  } catch (err) {
    console.error("POST /team/join error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : PATCH /team/:team_id
   Parameter    : Request object with current user id
                  team_id: Int. Team ID.
                  name: String. (optional) New team name.
                  logo_url: String. (optional) New logo URL.
   Return       : Json response
                  team: Object. Returns the updated team.
   Purpose      : Updates a team's details. Coach only, enforced by RLS.
*/
router.patch("/:team_id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { team_id } = req.params;
    const { name, logo_url } = req.body;

    const isCoach = await isTeamCoach(userId, team_id);
    if (!isCoach) {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!name && !logo_url) {
      return res
        .status(400)
        .json({ error: "At least one field (name, logo_url) is required" });
    }

    const updates = {};
    if (name) updates.name = name.trim();
    if (logo_url) updates.logo_url = logo_url;

    const { data: team, error } = await supabase
      .from("teams")
      .update(updates)
      .eq("team_id", team_id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Team not found" });
      }
      throw error;
    }

    // RLS will return no rows if user is not the coach
    if (!team) {
      return res.status(403).json({ error: "Forbidden" });
    }

    res.json({ team });
  } catch (err) {
    console.error("PATCH /team/:team_id error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : DELETE /team/:team_id
   Parameter    : Request object with current user id
                  team_id: Int. Team ID.
   Return       : Json response
                  message: String. Success message.
   Purpose      : Deletes a team. Coach only, enforced by RLS.
*/
router.delete("/:team_id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { team_id } = req.params;

    const isCoach = await isTeamCoach(userId, team_id);
    if (!isCoach) {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { error } = await supabase
      .from("teams")
      .delete()
      .eq("team_id", team_id);

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Team not found" });
      }
      throw error;
    }

    res.json({ message: "Team deleted successfully" });
  } catch (err) {
    console.error("DELETE /team/:team_id error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
