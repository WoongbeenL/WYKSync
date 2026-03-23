/*
 * File Name    : veto.js
 * Project      : PROG3221 - Capstone Project
 * Programmers  : Will Lee
 * Date         : 3/4/2026
 * Description  : This is a js file to handle /veto route.
 */

const express = require("express");
const router = express.Router();

const supabase = require("../lib/supabase");
const requireUser = require("../middleware/requireUser");

router.use(requireUser);

// -----------------------------------------------------------------
// VETO SEQUENCES
// Defines the full order of actions for each format.
// 'team1' = team_id1, 'team2' = team_id2

const BO3_SEQUENCE = [
  { action: "ban", team: "team1" }, // 1
  { action: "ban", team: "team2" }, // 2
  { action: "pick", team: "team1" }, // 3 — Map 1
  { action: "pick_side", team: "team2" }, // 4 — Side for Map 1
  { action: "pick", team: "team2" }, // 5 — Map 2
  { action: "pick_side", team: "team1" }, // 6 — Side for Map 2
  { action: "ban", team: "team1" }, // 7
  { action: "ban", team: "team2" }, // 8
  { action: "pick_side", team: "team2" }, // 9 — Side for decider (team2 picked last)
];

const BO5_SEQUENCE = [
  { action: "ban", team: "team1" }, // 1
  { action: "ban", team: "team2" }, // 2
  { action: "pick", team: "team1" }, // 3 — Map 1
  { action: "pick_side", team: "team2" }, // 4 — Side for Map 1
  { action: "pick", team: "team2" }, // 5 — Map 2
  { action: "pick_side", team: "team1" }, // 6 — Side for Map 2
  { action: "pick", team: "team1" }, // 7 — Map 3
  { action: "pick_side", team: "team2" }, // 8 — Side for Map 3
  { action: "pick", team: "team2" }, // 9 — Map 4
  { action: "pick_side", team: "team1" }, // 10 — Side for Map 4
  { action: "pick_side", team: "team2" }, // 11 — Side for decider (team2 picked last)
];

const getSequence = (format) => {
  if (format === "BO3") return BO3_SEQUENCE;
  if (format === "BO5") return BO5_SEQUENCE;
  return null;
};

// -----------------------------------------------------------------
// HELPER: Get map_id for a pick_side action
// For non-decider pick_sides: returns the map from the previous pick.
// For decider pick_sides: returns the last remaining active map.

const getPickSideMapId = (
  actionOrder,
  sequence,
  existingVetoes,
  activeMaps,
) => {
  const prevStep = sequence[actionOrder - 2]; // actionOrder is 1-indexed

  if (prevStep && prevStep.action === "pick") {
    // Map is whatever was picked in the immediately preceding step
    const prevVeto = existingVetoes.find(
      (v) => v.action_order === actionOrder - 1,
    );
    return prevVeto ? prevVeto.map_id : null;
  }

  // Decider — return the one remaining active map
  const usedMapIds = existingVetoes
    .filter((v) => v.action === "ban" || v.action === "pick")
    .map((v) => v.map_id);

  const remaining = activeMaps.filter((m) => !usedMapIds.includes(m.map_id));

  return remaining.length === 1 ? remaining[0].map_id : null;
};

// -----------------------------------------------------------------
// Routes

/*
   Route Name   : GET /vetoes
   Parameter    : match_id (query param)
   Return       : Json response
                  vetoes: Array. All veto actions for the match.
                  next: Object. The next expected action, or null if complete.
   Purpose      : Returns all veto actions for a match and what the next
                  expected action is, so the frontend can drive the UI.
*/
router.get("/", async (req, res) => {
  try {
    const { match_id } = req.query;

    if (!match_id) {
      return res
        .status(400)
        .json({ error: "match_id query parameter is required" });
    }

    // Check match exists
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("match_id, status, format, team_id1, team_id2")
      .eq("match_id", match_id)
      .maybeSingle();

    if (matchError || !match) {
      return res.status(404).json({ error: "Match not found" });
    }

    const { data: vetoes, error } = await supabase
      .from("vetoes")
      .select("*, maps(name)")
      .eq("match_id", match_id)
      .order("action_order", { ascending: true });

    if (error) throw error;

    // Compute next expected action for the frontend
    const sequence = getSequence(match.format);
    const nextStep = sequence ? sequence[vetoes.length] : null;

    const next = nextStep
      ? {
          action: nextStep.action,
          team_id: nextStep.team === "team1" ? match.team_id1 : match.team_id2,
          action_order: vetoes.length + 1,
        }
      : null;

    res.json({ vetoes, next });
  } catch (err) {
    console.error("GET /vetoes error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

/*
   Route Name   : POST /vetoes
   Parameter    : Request object with current user id
                  match_id: INT. The match this veto belongs to.
                  map_id: INT. (required for ban and pick, omit for pick_side)
                  side: String. (required for pick_side only — 'attack' or 'defense')
   Return       : Json response
                  veto: Object. The inserted veto action.
                  next: Object. The next expected action, or null if complete.
   Purpose      : Submits the next veto action for a match. Validates it is
                  the coach's turn, the action type is correct, the map is
                  available, and updates match team statuses accordingly.
*/
router.post("/", async (req, res) => {
  try {
    const userId = req.user.id;
    const { match_id, map_id, side } = req.body;

    if (!match_id) {
      return res.status(400).json({ error: "match_id is required" });
    }

    // Fetch match
    const { data: match, error: matchError } = await supabase
      .from("matches")
      .select("match_id, status, format, team_id1, team_id2")
      .eq("match_id", match_id)
      .maybeSingle();

    if (matchError || !match) {
      return res.status(404).json({ error: "Match not found" });
    }

    if (match.status !== "veto") {
      return res.status(400).json({ error: "Match is not in the veto phase" });
    }

    // Get the veto sequence for this format
    const sequence = getSequence(match.format);
    if (!sequence) {
      return res
        .status(400)
        .json({ error: "Unsupported match format for veto" });
    }

    // Fetch existing vetoes to determine current position
    const { data: existingVetoes, error: vetoesError } = await supabase
      .from("vetoes")
      .select("*")
      .eq("match_id", match_id)
      .order("action_order", { ascending: true });

    if (vetoesError) throw vetoesError;

    const action_order = existingVetoes.length + 1;

    if (action_order > sequence.length) {
      return res.status(400).json({ error: "Veto phase is already complete" });
    }

    const currentStep = sequence[action_order - 1];
    const expectedAction = currentStep.action;
    const expectedTeamId =
      currentStep.team === "team1" ? match.team_id1 : match.team_id2;

    // Check the requesting user is the coach of the expected team
    const { data: membership, error: memberError } = await supabase
      .from("team_members")
      .select("team_id")
      .eq("id", userId)
      .eq("role", "coach")
      .maybeSingle();

    if (memberError || !membership) {
      return res
        .status(403)
        .json({ error: "You must be a coach to submit a veto action" });
    }

    if (membership.team_id !== expectedTeamId) {
      return res.status(403).json({ error: "It is not your team's turn" });
    }

    // Fetch all active maps
    const { data: activeMaps, error: mapsError } = await supabase
      .from("maps")
      .select("map_id")
      .eq("is_active", true);

    if (mapsError) throw mapsError;

    // Build the veto insert payload
    const vetoPayload = {
      match_id,
      team_id: membership.team_id,
      action: expectedAction,
      action_order,
    };

    if (expectedAction === "ban" || expectedAction === "pick") {
      // map_id required from client
      if (!map_id) {
        return res
          .status(400)
          .json({ error: "map_id is required for ban and pick actions" });
      }

      // Check map is active
      const isActive = activeMaps.some((m) => m.map_id === map_id);
      if (!isActive) {
        return res
          .status(400)
          .json({ error: "Map is not in the active map pool" });
      }

      // Check map has not already been banned or picked
      const alreadyUsed = existingVetoes.some(
        (v) =>
          v.map_id === map_id && (v.action === "ban" || v.action === "pick"),
      );

      if (alreadyUsed) {
        return res
          .status(409)
          .json({ error: "This map has already been banned or picked" });
      }

      vetoPayload.map_id = map_id;
    } else if (expectedAction === "pick_side") {
      // side required from client
      if (!side || !["attack", "defense"].includes(side)) {
        return res.status(400).json({
          error: "side must be 'attack' or 'defense' for pick_side actions",
        });
      }

      // Compute map_id server-side
      const computedMapId = getPickSideMapId(
        action_order,
        sequence,
        existingVetoes,
        activeMaps,
      );

      if (!computedMapId) {
        return res
          .status(500)
          .json({ error: "Could not determine map for side pick" });
      }

      vetoPayload.map_id = computedMapId;
      vetoPayload.side = side;
    }

    // Insert the veto action
    const { data: veto, error: insertError } = await supabase
      .from("vetoes")
      .insert(vetoPayload)
      .select()
      .single();

    if (insertError) throw insertError;

    // Update match team statuses based on next step
    const nextStep = sequence[action_order]; // action_order is now the index of the next step
    const matchUpdates = {};

    if (!nextStep) {
      // Veto is complete — move match to live
      matchUpdates.status = "live";
      matchUpdates.team1_status = "not_checked_in";
      matchUpdates.team2_status = "not_checked_in";
    } else {
      // Update turn indicators
      if (nextStep.team === "team1") {
        matchUpdates.team1_status = "veto";
        matchUpdates.team2_status = "wait";
      } else {
        matchUpdates.team1_status = "wait";
        matchUpdates.team2_status = "veto";
      }
    }

    const { error: matchUpdateError } = await supabase
      .from("matches")
      .update(matchUpdates)
      .eq("match_id", match_id);

    if (matchUpdateError) throw matchUpdateError;

    // Build next action info for the frontend
    const next = nextStep
      ? {
          action: nextStep.action,
          team_id: nextStep.team === "team1" ? match.team_id1 : match.team_id2,
          action_order: action_order + 1,
        }
      : null;

    res.status(201).json({ veto, next });
  } catch (err) {
    console.error("POST /vetoes error: ", err);
    res.status(500).json({ error: "Server Error" });
  }
});

module.exports = router;
