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

router.use(requireUser);

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
   Route Name   : GET /tournaments
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
    console.error("GET /tournaments error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : POST /tournaments
   Parameter    : Request object with current user id
                  name: String. Tournament name.
                  description: String. (optional) Tournament description.
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
    const { name, description, start_date, end_date, format } = req.body;

    const onboarded = await checkIsOnboarded(userId);
    if (!onboarded) {
      return res.status(403).json({
        error: "You must complete your profile before creating a tournament",
      });
    }

    if (!name || !name.trim()) {
      return res.status(400).json({ error: "Tournament name is required" });
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
    console.error("POST /tournaments error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : GET /tournaments/:id
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
    console.error("GET /tournaments/:id error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : PUT /tournaments/:id
   Parameter    : Request object with current user id
                  id: Int. Tournament ID.
                  name: String. (optional) New tournament name.
                  description: String. (optional) New description.
                  start_date: Date. (optional) New start date.
                  end_date: Date. (optional) New end date.
                  format: String. (optional) New format.
                  status: String. (optional) New status.
   Return       : Json response
                  tournament: Object. Returns the updated tournament.
   Purpose      : Updates a tournament. Owner and admin only.
*/
router.put("/:id", async (req, res) => {
  try {
    const userId = req.user.id;
    const { id: tournament_id } = req.params;
    const { name, description, start_date, end_date, format, status } =
      req.body;

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

    if (start_date && end_date && new Date(end_date) < new Date(start_date)) {
      return res
        .status(400)
        .json({ error: "end_date cannot be before start_date" });
    }

    const updates = {};
    if (name) updates.name = name.trim();
    if (description !== undefined)
      updates.description = description?.trim() || null;
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
    console.error("PUT /tournaments/:id error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : DELETE /tournaments/:id
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
    console.error("DELETE /tournaments/:id error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : POST /tournaments/:id/teams
   Parameter    : Request object with current user id
                  id: Int. Tournament ID.
   Return       : Json response
                  entry: Object. Returns the created team_tournament row.
   Purpose      : Registers the coach's team into a tournament.
                  Coach only.
*/
router.post("/:id/teams", async (req, res) => {
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
      .select("tournament_id, status")
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
    console.error("POST /tournaments/:id/teams error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : DELETE /tournaments/:id/teams
   Parameter    : Request object with current user id
                  id: Int. Tournament ID.
   Return       : Json response
                  message: String. Success message.
   Purpose      : Withdraws the coach's team from a tournament.
                  Coach only.
*/
router.delete("/:id/teams", async (req, res) => {
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
    console.error("DELETE /tournaments/:id/teams error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : POST /tournaments/:id/organizers
   Parameter    : Request object with current user id
                  id: Int. Tournament ID.
                  user_id: UUID. The user to add as an organizer.
                  role: String. Must be 'admin'.
   Return       : Json response
                  organizer: Object. Returns the created user_tournament row.
   Purpose      : Adds a user as a tournament organizer. Owner only.
*/
router.post("/:id/organizers", async (req, res) => {
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
    console.error("POST /tournaments/:id/organizers error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : DELETE /tournaments/:id/organizers
   Parameter    : Request object with current user id
                  id: Int. Tournament ID.
                  user_id: UUID. The organizer to remove.
   Return       : Json response
                  message: String. Success message.
   Purpose      : Removes a user from tournament organizers. Owner only.
*/
router.delete("/:id/organizers", async (req, res) => {
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
    console.error("DELETE /tournaments/:id/organizers error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
