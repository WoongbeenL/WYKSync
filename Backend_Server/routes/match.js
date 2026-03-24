/*
 * File Name    : match.js
 * Project      : PROG3221 - Capstone Project
 * Programmers  : Will Lee
 * Date         : 3/4/2026
 * Description  : This is a js file to handle /match route.
 */

const express = require("express");
const router = express.Router();

const supabase = require("../lib/supabase");
const requireUser = require("../middleware/requireUser");

router.use(requireUser);

// -----------------------------------------------------------------
// Helper functions

/*
   Function Name   : getTournamentRole
   Parameter    : userId: UUID, tournamentId: INT
   Return       : String: Role of the user in the tournament, or null.
   Purpose      : Checks if the user has a role in the tournament and returns it.
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

/*
   Function Name   : getMatchWithTournament
   Parameter    : matchId: INT
   Return       : Object: Match data including tournament_id, or null.
   Purpose      : Fetches a match and its tournament_id for use in auth checks.
*/
const getMatchWithTournament = async (matchId) => {
  const { data, error } = await supabase
    .from("matches")
    .select("*, tournament_id")
    .eq("match_id", matchId)
    .maybeSingle();

  if (error || !data) return null;
  return data;
};

/*
   Function Name   : getCoachTeam
   Parameter    : userId: UUID
   Return       : INT: team_id of the team the user coaches, or null.
   Purpose      : Returns the team_id of the team the user is a coach of.
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

// -----------------------------------------------------------------
// Routes

/*
   Route Name   : GET /matches
   Parameter    : tournament_id (query param)
   Return       : Json response
                  matches: Array. Returns all matches for a tournament.
   Purpose      : Returns all matches for a given tournament.
*/
router.get("/", async (req, res) => {
  try {
    const { tournament_id } = req.query;

    if (!tournament_id) {
      return res
        .status(400)
        .json({ error: "tournament_id query parameter is required" });
    }

    // Check tournament exists
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("tournament_id")
      .eq("tournament_id", tournament_id)
      .maybeSingle();

    if (tournamentError || !tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    const { data: matches, error } = await supabase
      .from("matches")
      .select("*")
      .eq("tournament_id", tournament_id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    res.json({ matches });
  } catch (err) {
    console.error("GET /matches error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : POST /matches
   Parameter    : Request object with current user id
                  tournament_id: INT. Tournament the match belongs to.
                  team_id1: INT. First team.
                  team_id2: INT. Second team.
                  format: String. (optional) Match format, defaults to 'BO3'.
   Return       : Json response
                  match: Object. Returns the created match.
   Purpose      : Creates a new match. Owner and admin only.
*/
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { tournament_id, team_id1, team_id2, format } = req.body;

    if (!tournament_id) {
      return res.status(400).json({ error: "tournament_id is required" });
    }
    if (!team_id1) {
      return res.status(400).json({ error: "team_id1 is required" });
    }
    if (!team_id2) {
      return res.status(400).json({ error: "team_id2 is required" });
    }
    if (team_id1 === team_id2) {
      return res
        .status(400)
        .json({ error: "A team cannot be matched against itself" });
    }

    // Check organizer role
    const role = await getTournamentRole(userId, tournament_id);
    if (role !== "owner" && role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    // Check tournament exists and is live
    const { data: tournament, error: tournamentError } = await supabase
      .from("tournaments")
      .select("tournament_id, status")
      .eq("tournament_id", tournament_id)
      .maybeSingle();

    if (tournamentError || !tournament) {
      return res.status(404).json({ error: "Tournament not found" });
    }

    if (tournament.status !== "live") {
      return res
        .status(400)
        .json({ error: "Matches can only be created for live tournaments" });
    }

    // Check both teams are registered in the tournament
    const { data: registrations, error: regError } = await supabase
      .from("team_tournament")
      .select("team_id")
      .eq("tournament_id", tournament_id)
      .in("team_id", [team_id1, team_id2]);

    if (regError) throw regError;

    if (!registrations || registrations.length < 2) {
      return res
        .status(400)
        .json({ error: "Both teams must be registered in this tournament" });
    }

    const { data: match, error } = await supabase
      .from("matches")
      .insert({
        tournament_id,
        team_id1,
        team_id2,
        format: format || "BO3",
      })
      .select()
      .single();

    if (error) {
      if (error.code === "22P02") {
        return res.status(400).json({ error: "Invalid match format" });
      }
      throw error;
    }

    res.status(201).json({ match });
  } catch (err) {
    console.error("POST /matches error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : GET /matches/:id
   Parameter    : id: INT. Match ID.
   Return       : Json response
                  match: Object. Returns match data.
   Purpose      : Returns a single match by its ID.
*/
router.get("/:id", async (req, res) => {
  try {
    const { id } = req.params;

    const { data: match, error } = await supabase
      .from("matches")
      .select("*")
      .eq("match_id", id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return res.status(404).json({ error: "Match not found" });
      }
      throw error;
    }

    res.json({ match });
  } catch (err) {
    console.error("GET /matches/:id error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : DELETE /matches/:id
   Parameter    : Request object with current user id
                  id: INT. Match ID.
   Return       : Json response
                  message: String. Success message.
   Purpose      : Deletes a match. Owner and admin only.
*/
router.delete("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const match = await getMatchWithTournament(id);
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    const role = await getTournamentRole(userId, match.tournament_id);
    if (role !== "owner" && role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { error } = await supabase
      .from("matches")
      .delete()
      .eq("match_id", id);

    if (error) throw error;

    res.json({ message: "Match deleted successfully" });
  } catch (err) {
    console.error("DELETE /matches/:id error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : PATCH /matches/:id/checkin
   Parameter    : Request object with current user id
                  id: INT. Match ID.
   Return       : Json response
                  match: Object. Returns the updated match.
   Purpose      : Allows a coach to check in their team for a match.
                  Automatically updates match status to 'veto' when
                  both teams have checked in.
*/
router.patch("/:id/checkin", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    const match = await getMatchWithTournament(id);
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    // Match must be in not_checked_in status
    if (match.status !== "not_checked_in") {
      return res
        .status(400)
        .json({ error: "Match is no longer accepting check ins" });
    }

    // Check the user is a coach of one of the two teams
    const team_id = await getCoachTeam(userId);
    if (!team_id) {
      return res.status(403).json({ error: "You must be a coach to check in" });
    }

    if (team_id !== match.team_id1 && team_id !== match.team_id2) {
      return res
        .status(403)
        .json({ error: "You are not a coach of either team in this match" });
    }

    // Determine which team is checking in and prevent double check in
    const updates = {};

    if (team_id === match.team_id1) {
      if (match.team1_status === "checked_in") {
        return res
          .status(409)
          .json({ error: "Your team has already checked in" });
      }
      updates.team1_status = "checked_in";
    } else {
      if (match.team2_status === "checked_in") {
        return res
          .status(409)
          .json({ error: "Your team has already checked in" });
      }
      updates.team2_status = "checked_in";
    }

    // If both teams are checked in after this update, move match to veto
    const team1CheckedIn =
      team_id === match.team_id1 ? true : match.team1_status === "checked_in";
    const team2CheckedIn =
      team_id === match.team_id2 ? true : match.team2_status === "checked_in";

    if (team1CheckedIn && team2CheckedIn) {
      updates.status = "veto";
      updates.team1_status = "veto";
      updates.team2_status = "wait";
    }

    const { data: updatedMatch, error } = await supabase
      .from("matches")
      .update(updates)
      .eq("match_id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ match: updatedMatch });
  } catch (err) {
    console.error("PATCH /matches/:id/checkin error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : PATCH /matches/:id/status
   Parameter    : Request object with current user id
                  id: INT. Match ID.
                  status: String. New match status.
   Return       : Json response
                  match: Object. Returns the updated match.
   Purpose      : Updates the status of a match. Owner and admin only.
*/
router.patch("/:id/status", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "status is required" });
    }

    const match = await getMatchWithTournament(id);
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    const role = await getTournamentRole(userId, match.tournament_id);
    if (role !== "owner" && role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const { data: updatedMatch, error } = await supabase
      .from("matches")
      .update({ status })
      .eq("match_id", id)
      .select()
      .single();

    if (error) {
      if (error.code === "22P02") {
        return res.status(400).json({ error: "Invalid status value" });
      }
      throw error;
    }

    res.json({ match: updatedMatch });
  } catch (err) {
    console.error("PATCH /matches/:id/status error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : PATCH /matches/:id/score
   Parameter    : Request object with current user id
                  id: INT. Match ID.
                  team1_score: INT. (optional) New score for team 1.
                  team2_score: INT. (optional) New score for team 2.
   Return       : Json response
                  match: Object. Returns the updated match.
   Purpose      : Updates the score of a match. Owner and admin only.
*/
router.patch("/:id/score", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const { team1_score, team2_score } = req.body;

    if (team1_score === undefined && team2_score === undefined) {
      return res.status(400).json({
        error: "At least one of team1_score or team2_score is required",
      });
    }

    if (
      team1_score !== undefined &&
      (typeof team1_score !== "number" || team1_score < 0)
    ) {
      return res
        .status(400)
        .json({ error: "team1_score must be a non-negative number" });
    }

    if (
      team2_score !== undefined &&
      (typeof team2_score !== "number" || team2_score < 0)
    ) {
      return res
        .status(400)
        .json({ error: "team2_score must be a non-negative number" });
    }

    const match = await getMatchWithTournament(id);
    if (!match) {
      return res.status(404).json({ error: "Match not found" });
    }

    const role = await getTournamentRole(userId, match.tournament_id);
    if (role !== "owner" && role !== "admin") {
      return res.status(403).json({ error: "Forbidden" });
    }

    const updates = {};
    if (team1_score !== undefined) updates.team1_score = team1_score;
    if (team2_score !== undefined) updates.team2_score = team2_score;

    const { data: updatedMatch, error } = await supabase
      .from("matches")
      .update(updates)
      .eq("match_id", id)
      .select()
      .single();

    if (error) throw error;

    res.json({ match: updatedMatch });
  } catch (err) {
    console.error("PATCH /matches/:id/score error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
