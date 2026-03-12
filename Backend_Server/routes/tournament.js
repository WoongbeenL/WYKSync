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

const getFirstDefined = (...values) =>
  values.find((value) => value !== undefined && value !== null);

const normalizeTournament = (row = {}) => {
  const teamsValue = getFirstDefined(row.teams, row.team_count, row.teamCount, 0);
  const prizePoolValue = getFirstDefined(
    row.prizePool,
    row.prize_pool,
    row.prize_pool_amount,
    0,
  );

  return {
    id: getFirstDefined(row.tournamentId, row.id),
    name: row.name || "Untitled Tournament",
    teams: String(teamsValue),
    prizePool: String(prizePoolValue),
    organizer: getFirstDefined(row.organizer, row.organizer_name, "TBD"),
    startDateTime: getFirstDefined(row.startDateTime, row.start_date, null),
    game: getFirstDefined(row.game, row.game_title, "Valorant"),
    status: row.status || "upcoming",
    format: row.format || "Single Elimination",
    rules:
      getFirstDefined(row.rules, row.description) ||
      "Standard competitive rules apply. All matches are Best of 3.",
    participants: [],
    standings: [],
  };
};

router.get("/", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tournaments")
      .select("*")
      .order("start_date", { ascending: true, nullsFirst: false });

    if (error) throw error;

    const tournaments = (data || []).map(normalizeTournament);
    res.json({ tournaments });
  } catch (err) {
    console.error("GET /tournament error:", err);
    res.status(500).json({ error: "Could not load tournaments." });
  }
});

router.post("/", requireUser, async (req, res) => {
  try {
    const {
      name,
      teams,
      prizePool,
      organizer,
      startDateTime,
      game,
      status,
      format,
      rules,
    } = req.body || {};

    const trimmedName = String(name || "").trim();
    const parsedTeams = Number(teams);
    const parsedPrizePool = Number(prizePool);

    if (!trimmedName) {
      return res.status(400).json({ error: "Tournament name is required." });
    }
    if (!Number.isInteger(parsedTeams) || parsedTeams < 2) {
      return res.status(400).json({ error: "Team count must be at least 2." });
    }
    if (!Number.isFinite(parsedPrizePool) || parsedPrizePool < 0) {
      return res.status(400).json({ error: "Prize pool must be 0 or greater." });
    }

    const parsedStartDate = startDateTime ? new Date(startDateTime) : null;
    const startDate =
      parsedStartDate && !Number.isNaN(parsedStartDate.getTime())
        ? parsedStartDate.toISOString().slice(0, 10)
        : null;

    const rowToInsert = {
      name: trimmedName,
      teams: parsedTeams,
      team_count: parsedTeams,
      prizePool: parsedPrizePool,
      prize_pool: parsedPrizePool,
      organizer: String(organizer || "").trim() || "TBD",
      game: String(game || "Valorant"),
      rules:
        String(rules || "").trim() ||
        "Standard competitive rules apply. All matches are Best of 3.",
      description:
        String(rules || "").trim() ||
        "Standard competitive rules apply. All matches are Best of 3.",
      start_date: startDate,
      end_date: startDate,
      format: String(format || "Single Elimination"),
      status: String(status || "upcoming"),
    };

    const { data, error } = await supabase
      .from("tournaments")
      .insert([rowToInsert])
      .select("*")
      .single();

    if (error) {
      const fallbackInsert = {
        name: trimmedName,
        description:
          String(rules || "").trim() ||
          "Standard competitive rules apply. All matches are Best of 3.",
        start_date: startDate,
        end_date: startDate,
        format: String(format || "Single Elimination"),
        status: String(status || "upcoming"),
      };

      const { data: fallbackData, error: fallbackError } = await supabase
        .from("tournaments")
        .insert([fallbackInsert])
        .select("*")
        .single();

      if (fallbackError) throw fallbackError;

      const mergedTournament = normalizeTournament({
        ...fallbackData,
        teams: parsedTeams,
        prizePool: parsedPrizePool,
        organizer: String(organizer || "").trim() || "TBD",
        game: String(game || "Valorant"),
        rules:
          String(rules || "").trim() ||
          "Standard competitive rules apply. All matches are Best of 3.",
      });

      return res.status(201).json({ tournament: mergedTournament });
    }

    res.status(201).json({ tournament: normalizeTournament(data) });
  } catch (err) {
    console.error("POST /tournament error:", err);
    res.status(500).json({ error: "Could not create tournament." });
  }
});

router.delete("/:id", requireUser, async (req, res) => {
  try {
    const id = req.params.id;
    if (!id) {
      return res.status(400).json({ error: "Tournament id is required." });
    }

    const { error: deleteError } = await supabase
      .from("tournaments")
      .delete()
      .eq("tournamentId", id);

    if (deleteError) {
      const { error: fallbackDeleteError } = await supabase
        .from("tournaments")
        .delete()
        .eq("id", id);

      if (fallbackDeleteError) throw fallbackDeleteError;
    }

    res.status(204).send();
  } catch (err) {
    console.error("DELETE /tournament/:id error:", err);
    res.status(500).json({ error: "Could not delete tournament." });
  }
});

module.exports = router;
