/*
 * File Name    : tournament.js
 * Project      : PROG3221 - Capstone Project
 * Programmers  : Will Lee
 * Date         : 2/17/2026
 * Description  : This is a js file to handle /tournament route.
 */

const express = require("express");
const router = express.Router();

const supabase = require("../lib/supabase");
const requireUser = require("../middleware/requireUser");

/*
   Route Name   : GET /tournament/:id/overlay
   Parameter    : id: Int. Tournament ID.
   Return       : Json response
                  overlay: Object. Returns formatted veto result for the overlay app.
   Purpose      : Return the   veto result for the current streamed match as json
                  No authentication required — read only public endpoint.
*/
router.get("/:id/overlay", async (req, res) => {
  try {
    const { id: tournament_id } = req.params;

    // Fetch tournament and its current streaming match
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("tournament_id, name, stream_match_id")
      .eq("tournament_id", tournament_id)
      .maybeSingle();

    if (tournamentError || !tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    if (!tournament.stream_match_id) {
      return res
        .status(404)
        .json({ error: "No match is currently being streamed" });
    }

    // Fetch the match with both teams including tricode
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select(
        `
        match_id,
        format,
        team_id1,
        team_id2,
        teams_a:team_id1 ( name, tricode ),
        teams_b:team_id2 ( name, tricode )
      `,
      )
      .eq("match_id", tournament.stream_match_id)
      .single();

    if (matchError || !match) {
      return res.status(404).json({ error: "Streamed match not found" });
    }

    // Fetch all veto actions for this match
    const { data: vetoes, error: vetoesError } = await supabase
      .from("vetoes")
      .select(
        `
        action,
        side,
        team_id,
        maps ( name )
      `,
      )
      .eq("match_id", tournament.stream_match_id)
      .order("action_order", { ascending: true });

    if (vetoesError) throw vetoesError;

    // Helper: get tricode by team_id
    const getTricode = (teamId) => {
      if (teamId === match.team_id1) return match.teams_a.tricode;
      if (teamId === match.team_id2) return match.teams_b.tricode;
      return null;
    };

    // Build picks and bans from veto actions
    const picks = [];
    const bans = [];
    const pendingPicks = [];

    for (const veto of vetoes) {
      if (veto.action === "ban") {
        bans.push({
          map: veto.maps.name,
          banned_by: getTricode(veto.team_id),
        });
      } else if (veto.action === "pick") {
        pendingPicks.push({
          map: veto.maps.name,
          picked_by: getTricode(veto.team_id),
        });
      } else if (veto.action === "pick_side") {
        const matchedPick = pendingPicks.find((p) => p.map === veto.maps.name);

        if (matchedPick) {
          // Regular pick — attach side
          picks.push({
            map: matchedPick.map,
            picked_by: matchedPick.picked_by,
            side: veto.side,
          });
          pendingPicks.splice(pendingPicks.indexOf(matchedPick), 1);
        } else {
          // Decider — last remaining map
          picks.push({
            map: veto.maps.name,
            picked_by: "decider",
            side: veto.side,
          });
        }
      }
    }

    res.json({
      overlay: {
        team_a: {
          name: match.teams_a.name,
          tricode: match.teams_a.tricode,
        },
        team_b: {
          name: match.teams_b.name,
          tricode: match.teams_b.tricode,
        },
        bans,
        picks,
      },
    });
  } catch (err) {
    console.error("GET /tournament/:id/overlay error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

router.use(requireUser); // Comes AFTER GET /tournament/:id/overlay

// -----------------------------------------------------------------
// Helper function

/*
   Function Name   : checkIsOnboarded
   Parameter    : userId: INT. Id of user to check the value of is_onboarded for.
   Return       : Boolean: True or false based on the value of is_onboaded
   Purpose      : This function checks if the user has completed onboarding.
*/
const checkIsOnboarded = async (userId) => {
  const { data, error } = await supabase
    .from("profiles")
    .select("is_onboarded")
    .eq("id", userId)
    .single();

  if (error || !data) return false;
  return data.is_onboarded === true;
};

/*
   Function Name   : getCoachTeam
   Parameter    : N/A
   Return       : userId: INT. Id of user to check for
   Purpose      : This function gets the id of a team where the user is a coach for.
                  If no team matches the user_id, null is returned instead.
*/
const getCoachTeam = async (userId) => {
  const { data, error } = await supabase
    .from("team_members")
    .select("team_id")
    .eq("id", userId)
    .eq("role", "coach")
    .maybeSingle();

  if (error || !data) return null;
  return data.team_id;
};

/*
   Function Name   : getTournamentRole
   Parameter    : N/A
   Return       : userId: INT. Id of user to check for
   Purpose      : This function checks if the user has a role for the tournament and returns it.
                  If no role is found, null is returned instead.
*/
const getTournamentRole = async (userId, tournamentId) => {
  const { data, error } = await supabase
    .from("user_tournament")
    .select("role")
    .eq("id", userId)
    .eq("tournament_id", tournamentId)
    .maybeSingle();

  if (error || !data) return null;
  return data.role;
};

// -----------------------------------------------------------------
// Routes

/*
   Route Name   : GET /tournament
   Parameter    : None
   Return       : Json response
                  tournaments: Array. Returns all tournaments.
   Purpose      : Returns a list of all tournaments.
*/
router.get("/", async (req, res) => {
  try {
    const { data: tournaments, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) throw error;

    res.json({ tournaments });
  } catch (err) {
    console.error("GET /tournament error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : POST /tournament
   Parameter    : Request object with current user id
                  name: String. Tournament name.
                  description: String. (optional) Tournament description.
                  team_min_limit: Int. Tournament minimum required team limit.
                  team_max_limit: Int. Tournament maximum team limit.
                  start_date: Date. Tournament start date.
                  end_date: Date. Tournament end date.
                  format: String. Tournament format.
   Return       : Json response
                  tournament: Object. Returns the created tournament.
   Purpose      : Creates a new tournament. The creator is automatically
                  assigned as owner via the on_tournament_created trigger.
*/
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      name,
      description,
      team_min_limit,
      team_max_limit,
      start_date,
      end_date,
      format,
    } = req.body;

    const onboarded = await checkIsOnboarded(userId);
    if (!onboarded) {
      return res.status(403).json({
        error: "You must complete your profile before creating a tournament",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Tournament name is required" });
    }

    const min = Number(team_min_limit);
    const max = Number(team_max_limit);

    if (!Number.isInteger(min) || min < 1) {
      return res
        .status(400)
        .json({ error: "team_min_limit must be a positive integer" });
    }
    if (!Number.isInteger(max) || max < 1) {
      return res
        .status(400)
        .json({ error: "team_max_limit must be a positive integer" });
    }
    if (min > max) {
      return res
        .status(400)
        .json({ error: "team_min_limit cannot exceed team_max_limit" });
    }

    if (!start_date) {
      return res.status(400).json({ error: "start_date is required" });
    }
    if (!end_date) {
      return res.status(400).json({ error: "end_date is required" });
    }
    if (!format) {
      return res.status(400).json({ error: "format is required" });
    }
    if (new Date(end_date) < new Date(start_date)) {
      return res
        .status(400)
        .json({ error: "end_date cannot be before start_date" });
    }

    const { data: tournament, error } = await supabase
      .from("tournaments")
      .insert({
        name: name.trim(),
        description: description?.trim() || null,
        team_min_limit,
        team_max_limit,
        start_date,
        end_date,
        format,
      })
      .select()
      .single();

    if (error) {
      if (error.code === "22P02") {
        return res.status(400).json({ error: "Invalid tournament format" });
      }
      throw error;
    }

    // Manually assign the creator as owner
    const { error: ownerError } = await supabase
      .from("user_tournament")
      .insert({
        id: userId,
        tournament_id: tournament.tournament_id,
        role: "owner",
      });

    if (ownerError) {
      // Delete the tournament if owner assignment fails
      await supabase
        .from("tournaments")
        .delete()
        .eq("tournament_id", tournament.tournament_id);
      throw ownerError;
    }

    res.status(201).json({ tournament });
  } catch (err) {
    console.error("POST /tournament error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : GET /tournament/:id
   Parameter    : id: Int. Tournament ID.
   Return       : Json response
                  tournament: Object. Returns tournament data.
   Purpose      : Returns a single tournament by its ID.
*/
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: tournament, error } = await supabase
      .from("tournaments")
      .select("*")
      .eq("tournament_id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Tournament not found" });
      }
      throw error;
    }

    res.json({ tournament });
  } catch (err) {
    console.error("GET /tournament/:id error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : PATCH /tournament/:id
   Parameter    : Request object with current user id
                  id: Int. Tournament ID.
                  name: String. (optional) New tournament name.
                  description: String. (optional) New description.
                  team_min_limit: Int. (optional) New minimum team limit.
                  team_max_limit: Int. (optional) New maximum team limit.
                  start_date: Date. (optional) New start date.
                  end_date: Date. (optional) New end date.
                  format: String. (optional) New format.
                  status: String. (optional) New status.
   Return       : Json response
                  tournament: Object. Returns the updated tournament.
   Purpose      : Updates a tournament. Owner and admin only.
*/
router.patch("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: tournament_id } = req.params;
    const {
      name,
      description,
      team_min_limit,
      team_max_limit,
      start_date,
      end_date,
      format,
      status,
    } = req.body;

    const role = await getTournamentRole(userId, tournament_id);
    if (role !== "owner" && role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (
      !name &&
      !description &&
      !start_date &&
      !end_date &&
      !format &&
      !status
    ) {
      return res.status(400).json({ error: "At least one field is required" });
    }

    if (team_min_limit !== undefined) {
      if (!Number.isInteger(team_min_limit) || team_min_limit < 1) {
        return res
          .status(400)
          .json({ error: "team_min_limit must be a positive integer" });
      }
    }
    if (team_max_limit !== undefined) {
      if (!Number.isInteger(team_max_limit) || team_max_limit < 1) {
        return res
          .status(400)
          .json({ error: "team_max_limit must be a positive integer" });
      }
    }
    if (
      team_min_limit !== undefined &&
      team_max_limit !== undefined &&
      team_min_limit > team_max_limit
    ) {
      return res
        .status(400)
        .json({ error: "team_min_limit cannot exceed team_max_limit" });
    }

    if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
      return res
        .status(400)
        .json({ error: "end_date cannot be before start_date" });
    }

    const updates = {};
    if (name) updates.name = name.trim();
    if (description !== undefined)
      updates.description = description?.trim() || null;
    if (team_min_limit !== undefined) updates.team_min_limit = team_min_limit;
    if (team_max_limit !== undefined) updates.team_max_limit = team_max_limit;
    if (start_date) updates.start_date = start_date;
    if (end_date) updates.end_date = end_date;
    if (format) updates.format = format;
    if (status) updates.status = status;

    const { data: tournament, error } = await supabase
      .from("tournaments")
      .update(updates)
      .eq("tournament_id", tournament_id)
      .select()
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Tournament not found" });
      }
      if (error.code === "22P02") {
        return res
          .status(400)
          .json({ error: "Invalid format or status value" });
      }
      throw error;
    }

    res.json({ tournament });
  } catch (err) {
    console.error("PATCH /tournament/:id error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : DELETE /tournament/:id
   Parameter    : Request object with current user id
                  id: Int. Tournament ID.
   Return       : Json response
                  message: String. Success message.
   Purpose      : Deletes a tournament. Owner only.
*/
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: tournament_id } = req.params;

    const role = await getTournamentRole(userId, tournament_id);
    if (role !== "owner") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { error } = await supabase
      .from("tournaments")
      .delete()
      .eq("tournament_id", tournament_id);

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Tournament not found" });
      }
      throw error;
    }

    res.json({ message: "Tournament deleted successfully" });
  } catch (err) {
    console.error("DELETE /tournament/:id error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : GET /tournament/:id/team
   Parameter    : id: Int. Tournament ID.
   Return       : Json response
                  teams: Array. Returns all registered teams in the tournament.
   Purpose      : Returns a list of all participating teams in the tournament.
*/
router.get("/:id/team", async (req, res) => {
  try {
    const { id: tournament_id } = req.params;

    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("tournament_id")
      .eq("tournament_id", tournament_id)
      .maybeSingle();

    if (tournamentError || !tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const { data: teams, error } = await supabase
      .from("team_tournament")
      .select("teams(*)")
      .eq("tournament_id", tournament_id);

    if (error) throw error;

    res.json({ teams: teams.map((t) => t.teams) });
  } catch (err) {
    console.error("GET /tournaments/:id/team error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : POST /tournament/:id/team
   Parameter    : Request object with current user id
                  id: Int. Tournament ID.
   Return       : Json response
                  entry: Object. Returns the created team_tournament row.
   Purpose      : Registers the coach's team into a tournament.
                  Coach only.
*/
router.post("/:id/team", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: tournament_id } = req.params;

    const team_id = await getCoachTeam(userId);
    if (!team_id) {
      return res
        .status(403)
        .json({ error: "You must be a coach to register a team" });
    }

    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("tournament_id, status, team_max_limit")
      .eq("tournament_id", tournament_id)
      .single();

    if (tournamentError || !tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    if (tournament.status !== "upcoming") {
      return res
        .status(400)
        .json({ error: "Tournament is no longer accepting teams" });
    }

    // Add after the status check
    const { count, error: countError } = await supabase
      .from("team_tournament")
      .select("*", { count: "exact", head: true })
      .eq("tournament_id", tournament_id);

    if (countError) throw countError;

    if (count >= tournament.team_max_limit) {
      return res
        .status(400)
        .json({ error: "Tournament has reached its maximum team limit" });
    }

    const { data: entry, error } = await supabase
      .from("team_tournament")
      .insert({ team_id, tournament_id })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res.status(409).json({
          error: "Your team is already registered in this tournament",
        });
      }
      throw error;
    }

    res.status(201).json({ entry });
  } catch (err) {
    console.error("POST /tournament/:id/team error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : DELETE /tournament/:id/team
   Parameter    : Request object with current user id
                  id: Int. Tournament ID.
   Return       : Json response
                  message: String. Success message.
   Purpose      : Withdraws the coach's team from a tournament.
                  Coach only.
*/
router.delete("/:id/team", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: tournament_id } = req.params;

    const team_id = await getCoachTeam(userId);
    if (!team_id) {
      return res
        .status(403)
        .json({ error: "You must be a coach to withdraw a team" });
    }

    const { data: entry, error: entryError } = await supabase
      .from("team_tournament")
      .select("team_tournament_id")
      .eq("team_id", team_id)
      .eq("tournament_id", tournament_id)
      .maybeSingle();

    if (entryError || !entry) {
      return res
        .status(404)
        .json({ error: "Your team is not registered in this tournament" });
    }

    const { error } = await supabase
      .from("team_tournament")
      .delete()
      .eq("team_id", team_id)
      .eq("tournament_id", tournament_id);

    if (error) throw error;

    res.json({ message: "Team withdrawn from tournament successfully" });
  } catch (err) {
    console.error("DELETE /tournament/:id/team error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : POST /tournament/:id/organizer
   Parameter    : Request object with current user id
                  id: Int. Tournament ID.
                  user_id: UUID. The user to add as an organizer.
                  role: String. Must be 'admin'.
   Return       : Json response
                  organizer: Object. Returns the created user_tournament row.
   Purpose      : Adds a user as a tournament organizer. Owner only.
*/
router.post("/:id/organizer", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: tournament_id } = req.params;
    const { user_id, role } = req.body;

    const requesterRole = await getTournamentRole(userId, tournament_id);
    if (requesterRole !== "owner") {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }
    if (!role || role !== "admin") {
      return res.status(400).json({ error: "role must be 'admin'" });
    }

    // Prevent owner from being overwritten
    if (user_id === userId) {
      return res
        .status(400)
        .json({ error: "You cannot add yourself as an organizer" });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user_id)
      .single();

    if (profileError || !profile) {
      return res.status(404).json({ error: "User not found" });
    }

    const { data: organizer, error } = await supabase
      .from("user_tournament")
      .insert({ id: user_id, tournament_id, role })
      .select()
      .single();

    if (error) {
      if (error.code === "23505") {
        return res
          .status(409)
          .json({ error: "User is already an organizer for this tournament" });
      }
      throw error;
    }

    res.status(201).json({ organizer });
  } catch (err) {
    console.error("POST /tournament/:id/organizer error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : DELETE /tournament/:id/organizer
   Parameter    : Request object with current user id
                  id: Int. Tournament ID.
                  user_id: UUID. The organizer to remove.
   Return       : Json response
                  message: String. Success message.
   Purpose      : Removes a user from tournament organizer. Owner only.
*/
router.delete("/:id/organizer", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: tournament_id } = req.params;
    const { user_id } = req.body;

    const requesterRole = await getTournamentRole(userId, tournament_id);
    if (requesterRole !== "owner") {
      return res.status(403).json({ error: "Forbidden" });
    }

    if (!user_id) {
      return res.status(400).json({ error: "user_id is required" });
    }

    // Prevent owner from removing themselves
    if (user_id === userId) {
      return res
        .status(400)
        .json({ error: "You cannot remove yourself as the owner" });
    }

    const { data: organizer, error: organizerError } = await supabase
      .from("user_tournament")
      .select("user_tournament_id, role")
      .eq("id", user_id)
      .eq("tournament_id", tournament_id)
      .maybeSingle();

    if (organizerError || !organizer) {
      return res.status(404).json({ error: "Organizer not found" });
    }

    // Prevent removing another owner
    if (organizer.role === "owner") {
      return res
        .status(400)
        .json({ error: "Cannot remove the tournament owner" });
    }

    const { error } = await supabase
      .from("user_tournament")
      .delete()
      .eq("id", user_id)
      .eq("tournament_id", tournament_id);

    if (error) throw error;

    res.json({ message: "Organizer removed successfully" });
  } catch (err) {
    console.error("DELETE /tournament/:id/organizer error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
