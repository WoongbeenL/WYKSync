// Tournaments page handles viewing, filtering, creating, and joining tournaments.
import { useEffect, useMemo, useState } from "react";
import "./tournaments.css";
import defaultTournamentImage from "../assets/defaulttourney.jpg";
import {
  fetchCurrentUserTeamProfile,
  getCachedTeamProfileForCurrentUser,
} from "../lib/teamProfile";
import { supabase } from "../lib/supabaseClient";
import {
  backendUrl,
  requestBackendWithFallback,
} from "../lib/backendApi";

const getTournamentAdminStorageKey = (userIdentifier) =>
  `tournament-admin:${String(userIdentifier || "").trim().toLowerCase()}`;

const readManagedTournamentIds = (userIdentifier) => {
  if (typeof window === "undefined" || !userIdentifier) return [];

  try {
    const stored = window.localStorage.getItem(
      getTournamentAdminStorageKey(userIdentifier)
    );
    const parsed = stored ? JSON.parse(stored) : [];
    return Array.isArray(parsed) ? parsed.map((id) => String(id)) : [];
  } catch {
    return [];
  }
};

const writeManagedTournamentIds = (userIdentifier, ids) => {
  if (typeof window === "undefined" || !userIdentifier) return;

  try {
    window.localStorage.setItem(
      getTournamentAdminStorageKey(userIdentifier),
      JSON.stringify(ids)
    );
  } catch {
    // Ignore storage failures.
  }
};

const TOURNAMENT_META_STORAGE_KEY = "tournament-meta-overrides";

const readTournamentMetaOverrides = () => {
  if (typeof window === "undefined") return {};

  try {
    const stored = window.localStorage.getItem(TOURNAMENT_META_STORAGE_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
};

const writeTournamentMetaOverrides = (state) => {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      TOURNAMENT_META_STORAGE_KEY,
      JSON.stringify(state)
    );
  } catch {
    // Ignore storage failures.
  }
};

const hashString = (value) => {
  let hash = 0;

  for (let index = 0; index < value.length; index += 1) {
    hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
  }

  return hash;
};

const getBracketSize = (maxTeams) => {
  if (maxTeams <= 4) return 4;
  return 8;
};

const getSingleElimSeedOrder = (size) => {
  if (size <= 4) {
    return [1, 4, 2, 3];
  }

  return [1, 8, 4, 5, 3, 6, 2, 7];
};

const buildSingleElimRounds = (participants, maxTeams, tournamentId) => {
  const bracketSize = getBracketSize(Math.max(4, Number(maxTeams) || 4));
  const seedOrder = getSingleElimSeedOrder(bracketSize);
  const stableTeams = [...participants].sort(
    (teamA, teamB) =>
      hashString(`${tournamentId}:${teamA}`) - hashString(`${tournamentId}:${teamB}`)
  );
  const seededTeams = Array.from({ length: bracketSize }, (_, index) => {
    const teamName = stableTeams[index] || "";
    return {
      seed: seedOrder[index],
      name: teamName,
      status: teamName ? "team" : index < Number(maxTeams) ? "open" : "bye",
    };
  });
  const rounds = [];
  let currentRound = seededTeams;
  let roundLabelIndex = 1;

  while (currentRound.length > 1) {
    const matches = [];

    for (let index = 0; index < currentRound.length; index += 2) {
      const topEntry = currentRound[index];
      const bottomEntry = currentRound[index + 1];

      matches.push({
        id: `round-${roundLabelIndex}-match-${index / 2}`,
        topEntry,
        bottomEntry,
      });
    }

    rounds.push(matches);
    currentRound = matches.map((match, index) => ({
      seed: `R${roundLabelIndex + 1}-${index + 1}`,
      name: "",
      status: "pending",
    }));
    roundLabelIndex += 1;
  }

  return rounds;
};

const getSwissRoundCount = (maxTeams) => {
  if (Number(maxTeams) <= 4) return 2;
  return 3;
};

const buildSwissData = (participants, maxTeams, tournamentId) => {
  const activeTeams = [...participants].sort(
    (teamA, teamB) =>
      hashString(`${tournamentId}:${teamA}`) - hashString(`${tournamentId}:${teamB}`)
  );
  const totalSlots = Math.max(4, Number(maxTeams) || 4);
  const paddedTeams = Array.from({ length: totalSlots }, (_, index) => activeTeams[index] || "");
  const roundCount = getSwissRoundCount(maxTeams);
  const rounds = [];

  for (let roundIndex = 0; roundIndex < roundCount; roundIndex += 1) {
    const rotatedTeams =
      roundIndex === 0
        ? paddedTeams
        : paddedTeams.map(
            (_, index) => paddedTeams[(index + roundIndex) % paddedTeams.length]
          );
    const matches = [];

    for (let index = 0; index < rotatedTeams.length; index += 2) {
      matches.push({
        id: `swiss-round-${roundIndex + 1}-match-${index / 2}`,
        leftTeam: rotatedTeams[index] || "",
        rightTeam: rotatedTeams[index + 1] || "",
      });
    }

    rounds.push({
      id: `round-${roundIndex + 1}`,
      label: `R${roundIndex + 1}`,
      title: `Round ${roundIndex + 1}`,
      matches,
    });
  }

  const leaderboard = activeTeams.map((team, index) => {
    return {
      rank: index + 1,
      team,
      wins: 0,
      losses: 0,
      points: 0,
      gameDiff: 0,
      buchholz: 0,
    };
  });

  return { rounds, leaderboard };
};

const buildDoubleElimData = (participants, maxTeams, tournamentId) => {
  const bracketSize = getBracketSize(Math.max(4, Number(maxTeams) || 4));
  const seedOrder = getSingleElimSeedOrder(bracketSize);
  const stableTeams = [...participants].sort(
    (teamA, teamB) =>
      hashString(`${tournamentId}:${teamA}`) - hashString(`${tournamentId}:${teamB}`)
  );
  const seededTeams = Array.from({ length: bracketSize }, (_, index) => ({
    seed: seedOrder[index],
    name: stableTeams[index] || "",
    status: stableTeams[index]
      ? "team"
      : index < Number(maxTeams)
        ? "open"
        : "bye",
  }));

  const winnerRounds = [];
  let currentWinnerRound = seededTeams;
  let winnerRoundIndex = 1;

  while (currentWinnerRound.length > 1) {
    const matches = [];

    for (let index = 0; index < currentWinnerRound.length; index += 2) {
      matches.push({
        id: `winner-round-${winnerRoundIndex}-match-${index / 2}`,
        topEntry: currentWinnerRound[index],
        bottomEntry: currentWinnerRound[index + 1],
      });
    }

    winnerRounds.push({
      id: `winner-round-${winnerRoundIndex}`,
      title:
        currentWinnerRound.length === 2
          ? "Winner Final"
          : `Winner Round ${winnerRoundIndex}`,
      matches,
    });

    currentWinnerRound = matches.map((_, index) => ({
      seed: `W${winnerRoundIndex + 1}-${index + 1}`,
      name: "",
      status: "pending",
    }));
    winnerRoundIndex += 1;
  }

  const loserRoundSizes =
    bracketSize === 8 ? [2, 2, 2, 1] : [1, 1];
  const loserRounds = loserRoundSizes.map((matchCount, roundIndex) => ({
    id: `loser-round-${roundIndex + 1}`,
    title:
      roundIndex === loserRoundSizes.length - 1
        ? "Loser Final"
        : `Loser Round ${roundIndex + 1}`,
    matches: Array.from({ length: matchCount }, (_, matchIndex) => ({
      id: `loser-round-${roundIndex + 1}-match-${matchIndex + 1}`,
      topEntry: {
        seed: `L${roundIndex + 1}-${matchIndex * 2 + 1}`,
        name: "",
        status: "pending",
      },
      bottomEntry: {
        seed: `L${roundIndex + 1}-${matchIndex * 2 + 2}`,
        name: "",
        status: "pending",
      },
    })),
  }));

  return { winnerRounds, loserRounds };
};

const buildRoundRobinData = (participants, maxTeams, tournamentId) => {
  const activeTeams = [...participants].sort(
    (teamA, teamB) =>
      hashString(`${tournamentId}:${teamA}`) - hashString(`${tournamentId}:${teamB}`)
  );
  const totalSlots = Math.max(4, Number(maxTeams) || 4);
  const paddedTeams = Array.from({ length: totalSlots }, (_, index) => ({
    slot: index + 1,
    name: activeTeams[index] || "",
  }));
  const rounds = [];

  for (let roundIndex = 0; roundIndex < Math.max(totalSlots - 1, 1); roundIndex += 1) {
    const rotated = [...paddedTeams];
    if (roundIndex > 0) {
      const anchor = rotated[0];
      const rotating = rotated.slice(1);
      const shift = roundIndex % rotating.length;
      const nextRotating = [
        ...rotating.slice(rotating.length - shift),
        ...rotating.slice(0, rotating.length - shift),
      ];
      rotated.splice(0, rotated.length, anchor, ...nextRotating);
    }

    const matches = [];
    for (let index = 0; index < totalSlots / 2; index += 1) {
      const leftEntry = rotated[index];
      const rightEntry = rotated[totalSlots - 1 - index];

      matches.push({
        id: `round-robin-round-${roundIndex + 1}-match-${index + 1}`,
        leftSlot: leftEntry.slot,
        leftTeam: leftEntry.name,
        rightSlot: rightEntry.slot,
        rightTeam: rightEntry.name,
      });
    }

    rounds.push({
      id: `round-robin-round-${roundIndex + 1}`,
      title: `Round ${roundIndex + 1}`,
      matches,
    });
  }

  const standings = paddedTeams.map((entry) => ({
    rank: entry.slot,
    team: entry.name || `Open Slot ${entry.slot}`,
    wins: 0,
    losses: 0,
  }));

  return { rounds, standings };
};

// This page has a lot going on, so helper functions keep the JSX from getting too messy.
export default function Tournaments({ user }) {
  const defaultGame = "Valorant";
  const teamSizeOptions = [4, 5, 6, 7, 8];

  // Dropdown options for tournament format.
  const formatOptions = [
    { value: "single elim", label: "Single Elimination" },
    { value: "double elim", label: "Double Elimination" },
    { value: "round robin", label: "Round Robin" },
    { value: "swiss", label: "Swiss" },
  ];

  const [tournaments, setTournaments] = useState([]);
  const [name, setName] = useState("");
  const [minTeams, setMinTeams] = useState("4");
  const [maxTeams, setMaxTeams] = useState("8");
  const [prizePool, setPrizePool] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [endDateTime, setEndDateTime] = useState("");
  const [game, setGame] = useState(defaultGame);
  const [status, setStatus] = useState("upcoming");
  const [format, setFormat] = useState("single elim");
  const [rules, setRules] = useState(
    "Standard competitive rules apply. All matches are Best of 3."
  );
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [dateFilter, setDateFilter] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [formErrors, setFormErrors] = useState({});
  const [teamProfile, setTeamProfile] = useState(null);
  const [teamProfileLoading, setTeamProfileLoading] = useState(false);
  const [teamProfileError, setTeamProfileError] = useState("");
  const [apiError, setApiError] = useState("");
  const [isSavingTournament, setIsSavingTournament] = useState(false);
  const [isUpdatingTournament, setIsUpdatingTournament] = useState(false);
  const [hasCheckedSession, setHasCheckedSession] = useState(false);
  const [managedTournamentIds, setManagedTournamentIds] = useState([]);
  const [isEditingTournament, setIsEditingTournament] = useState(false);
  const [editName, setEditName] = useState("");
  const [editStartDateTime, setEditStartDateTime] = useState("");
  const [editEndDateTime, setEditEndDateTime] = useState("");
  const [editFormat, setEditFormat] = useState("single elim");
  const [editStatus, setEditStatus] = useState("upcoming");
  const [editRules, setEditRules] = useState("");
  const [tournamentMetaOverrides, setTournamentMetaOverrides] = useState({});
  const [activeSwissRound, setActiveSwissRound] = useState(0);
  const [activeRoundRobinRound, setActiveRoundRobinRound] = useState(0);

  const pageSize = 6;

  // Formats date/time values so the cards and details page look more readable.
  const formatDateTimeLabel = (value) => {
    if (!value) return "TBD";
    return new Date(value).toLocaleString();
  };

  // Formats prize pool text while safely handling missing values.
  const formatPrizePoolLabel = (value) => {
    if (value === "" || value === null || value === undefined) return "TBD";
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) return "TBD";
    return `$${numericValue}`;
  };

  // Turns backend format codes into labels the UI can show nicely.
  const formatTournamentFormatLabel = (value) => {
    const matchedFormat = formatOptions.find((option) => option.value === value);
    return matchedFormat?.label || value || "TBD";
  };

  // Normalizes backend tournament data so the rest of the page can use one shape.
  const normalizeTournament = (tournament, metaOverrides = tournamentMetaOverrides) => {
    const normalizedId = String(tournament.id ?? tournament.tournament_id ?? "");
    const metaOverride = metaOverrides[normalizedId] || {};
    const participants = Array.isArray(tournament.participants)
      ? [...new Set(tournament.participants.filter(Boolean))]
      : [];

    return {
      ...tournament,
      id: tournament.id ?? tournament.tournament_id,
      minTeams:
        tournament.minTeams ??
        tournament.min_teams ??
        tournament.team_min_limit ??
        metaOverride.minTeams ??
        4,
      teams:
        tournament.teams ??
        tournament.team_limit ??
        tournament.team_max_limit ??
        metaOverride.teams ??
        0,
      prizePool:
        tournament.prizePool ?? tournament.prize_pool ?? metaOverride.prizePool ?? "",
      organizer: tournament.organizer ?? metaOverride.organizer ?? "TBD",
      startDateTime: tournament.startDateTime ?? tournament.start_date ?? "",
      endDateTime: tournament.endDateTime ?? tournament.end_date ?? "",
      game: tournament.game ?? metaOverride.game ?? defaultGame,
      imageUrl:
        tournament.imageUrl ??
        tournament.image_url ??
        tournament.banner_url ??
        defaultTournamentImage,
      status: tournament.status ?? metaOverride.status ?? "upcoming",
      format: tournament.format ?? metaOverride.format ?? "single elim",
      rules:
        tournament.rules ??
        tournament.description ??
        metaOverride.rules ??
        "No rules provided.",
      participants,
      standings: Array.isArray(tournament.standings) ? tournament.standings : [],
    };
  };

  const buildStandings = (participants, existingStandings = []) => {
    if (Array.isArray(existingStandings) && existingStandings.length) {
      return existingStandings;
    }

    return participants
      .slice(0, Math.min(4, participants.length))
      .map((team, index) => ({
        rank: index + 1,
        team,
        record: "0-0",
      }));
  };

  // Validates the create-tournament form before we try to submit it.
  const validateTournamentForm = () => {
    const errors = {};
    const trimmedName = name.trim();
    const trimmedRules = rules.trim();
    const parsedMinTeams = Number(minTeams);
    const parsedMaxTeams = Number(maxTeams);
    const prize = Number(prizePool);

    if (!trimmedName) {
      errors.name = "Tournament name is required.";
    }
    if (!Number.isInteger(parsedMinTeams) || parsedMinTeams < 4 || parsedMinTeams > 8) {
      errors.minTeams = "Minimum teams must be between 4 and 8.";
    }
    if (!Number.isInteger(parsedMaxTeams) || parsedMaxTeams < 4 || parsedMaxTeams > 8) {
      errors.maxTeams = "Maximum teams must be between 4 and 8.";
    } else if (parsedMaxTeams < parsedMinTeams) {
      errors.maxTeams = "Maximum teams cannot be less than minimum teams.";
    }
    if (prizePool && (!Number.isFinite(prize) || prize < 0)) {
      errors.prizePool = "Prize pool must be a valid number 0 or greater.";
    }
    if (!startDateTime) {
      errors.startDateTime = "Start date is required.";
    }
    if (!endDateTime) {
      errors.endDateTime = "End date is required.";
    } else if (startDateTime && new Date(endDateTime) < new Date(startDateTime)) {
      errors.endDateTime = "End date cannot be before the start date.";
    }
    if (!trimmedRules) {
      errors.rules = "Rules summary is required.";
    }

    return errors;
  };

  // Clears one field error after the user starts fixing that input.
  const clearFieldError = (fieldName) => {
    if (!formErrors[fieldName]) return;
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  const saveTournamentMetaOverride = (tournamentId, patch) => {
    const key = String(tournamentId);
    const currentOverrides = readTournamentMetaOverrides();
    const nextOverrides = {
      ...currentOverrides,
      [key]: {
        ...(currentOverrides[key] || {}),
        ...patch,
      },
    };

    setTournamentMetaOverrides(nextOverrides);
    writeTournamentMetaOverrides(nextOverrides);
    return nextOverrides[key];
  };

  const canManageTournament = (tournament) =>
    Boolean(tournament && user && managedTournamentIds.includes(String(tournament.id)));

  const beginEditingTournament = (tournament) => {
    if (!tournament) return;

    setEditName(tournament.name || "");
    setEditStartDateTime(tournament.startDateTime ? tournament.startDateTime.slice(0, 10) : "");
    setEditEndDateTime(tournament.endDateTime ? tournament.endDateTime.slice(0, 10) : "");
    setEditFormat(tournament.format || "single elim");
    setEditStatus(tournament.status || "upcoming");
    setEditRules(tournament.rules || "");
    setIsEditingTournament(true);
  };

  const cancelEditingTournament = () => {
    setIsEditingTournament(false);
  };

  const fetchTournamentParticipants = async (tournamentId) => {
    const result = await requestBackendWithFallback(
      [`/tournament/${tournamentId}/teams`],
      {
        requireAuth: true,
        fallbackError: "Could not load tournament participants.",
        allowNotFound: true,
      }
    );

    if (result.error || result.status === 404) {
      return [];
    }

    return Array.isArray(result.data?.teams)
      ? result.data.teams
          .map((team) => team?.name || "")
          .filter(Boolean)
      : [];
  };

  // Loads tournament data from the backend.
  const fetchTournaments = async () => {
    if (!backendUrl) {
      setApiError("VITE_BACKEND_URL is missing.");
      return;
    }

    setApiError("");
    const currentMetaOverrides = readTournamentMetaOverrides();
    setTournamentMetaOverrides(currentMetaOverrides);
    const result = await requestBackendWithFallback(
      ["/tournament"],
      {
        requireAuth: true,
        fallbackError: "Could not load tournaments.",
        allowNotFound: true,
      }
    );

    if (result.error) {
      setApiError(result.error);
      return;
    }

    const tournamentsWithParticipants = Array.isArray(result.data?.tournaments)
      ? await Promise.all(
          result.data.tournaments.map(async (tournament) => {
            const participants = await fetchTournamentParticipants(
              tournament.id ?? tournament.tournament_id
            );

            return {
              ...tournament,
              participants,
            };
          })
        )
      : [];

    const normalizedTournaments = tournamentsWithParticipants.map((tournament) =>
      normalizeTournament(
        {
          ...tournament,
          standings: buildStandings(tournament.participants, tournament.standings),
        },
        currentMetaOverrides
      )
    );

    setTournaments(
      normalizedTournaments
    );

    if (selectedTournament) {
      const refreshedSelectedTournament = normalizedTournaments.find(
        (tournament) => String(tournament.id) === String(selectedTournament.id)
      );
      setSelectedTournament(refreshedSelectedTournament || null);
    }

    return normalizedTournaments;
  };

  // Creates a new tournament from the form values.
  const addTournament = async () => {
    const errors = validateTournamentForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }
    if (!backendUrl) {
      setApiError("VITE_BACKEND_URL is missing.");
      return;
    }
    if (!supabase) {
      setApiError("Supabase auth is unavailable.");
      return;
    }

    try {
      setIsSavingTournament(true);
      setApiError("");
      const response = await requestBackendWithFallback(
        ["/tournament"],
        {
          method: "POST",
          requireAuth: true,
          fallbackError: "Could not create tournament.",
          body: {
            name: name.trim(),
            description: rules.trim(),
            start_date: startDateTime,
            end_date: endDateTime,
            game,
            format,
            team_min_limit: Number(minTeams),
            team_max_limit: Number(maxTeams),
            ...(prizePool ? { prize_pool: Number(prizePool) } : {}),
          },
        }
      );

      if (response.error) {
        setApiError(response.error);
        return;
      }

      const payload = response.data;
      if (payload?.tournament) {
        saveTournamentMetaOverride(payload.tournament.tournament_id ?? payload.tournament.id, {
          minTeams: Number(minTeams) || 4,
          teams: Number(maxTeams) || 8,
          prizePool: prizePool ? Number(prizePool) : "",
          organizer: organizer.trim() || "You",
          status,
          game,
          format,
          rules: rules.trim(),
        });
        const createdTournament = normalizeTournament({
          ...payload.tournament,
          minTeams:
            Number(minTeams) ||
            payload.tournament.minTeams ||
            payload.tournament.min_teams ||
            payload.tournament.team_min_limit ||
            4,
          teams:
            Number(maxTeams) ||
            payload.tournament.teams ||
            payload.tournament.team_limit ||
            payload.tournament.team_max_limit ||
            0,
          prizePool: prizePool ? Number(prizePool) : payload.tournament.prizePool ?? payload.tournament.prize_pool ?? "",
          organizer: organizer.trim() || "You",
          status,
          game,
          format,
          rules: rules.trim(),
          participants: [],
        });
        const nextManagedIds = [...new Set([...managedTournamentIds, String(createdTournament.id)])];

        setManagedTournamentIds(nextManagedIds);
        writeManagedTournamentIds(user, nextManagedIds);
        setTournaments((prev) => [createdTournament, ...prev]);
      }
    } catch (err) {
      setApiError(`Could not create tournament: ${err.message}`);
      return;
    } finally {
      setIsSavingTournament(false);
    }

    setName("");
    setMinTeams("4");
    setMaxTeams("8");
    setPrizePool("");
    setOrganizer("");
    setStartDateTime("");
    setEndDateTime("");
    setGame(defaultGame);
    setStatus("upcoming");
    setFormat("single elim");
    setRules("Standard competitive rules apply. All matches are Best of 3.");
    setFormErrors({});
  };

  // Deletes a tournament card and removes it from local state.
  const deleteTournament = async (id) => {
    if (!backendUrl) {
      setApiError("VITE_BACKEND_URL is missing.");
      return;
    }
    if (!supabase) {
      setApiError("Supabase auth is unavailable.");
      return;
    }

    try {
      setApiError("");
      const response = await requestBackendWithFallback(
        [`/tournament/${id}`],
        {
          method: "DELETE",
          requireAuth: true,
          fallbackError: `Could not delete tournament ${id}.`,
        }
      );

      if (response.error) {
        setApiError(response.error);
        return;
      }

      setTournaments((prev) => prev.filter((t) => String(t.id) !== String(id)));
      const currentMetaOverrides = readTournamentMetaOverrides();
      const nextMetaOverrides = { ...currentMetaOverrides };
      delete nextMetaOverrides[String(id)];
      setTournamentMetaOverrides(nextMetaOverrides);
      writeTournamentMetaOverrides(nextMetaOverrides);
      const nextManagedIds = managedTournamentIds.filter(
        (managedId) => managedId !== String(id)
      );
      setManagedTournamentIds(nextManagedIds);
      writeManagedTournamentIds(user, nextManagedIds);
      if (selectedTournament && String(selectedTournament.id) === String(id)) {
        setSelectedTournament(null);
        setActiveTab("overview");
      }
    } catch (err) {
      setApiError(`Could not delete tournament: ${err.message}`);
    }
  };

  const updateTournament = async () => {
    if (!selectedTournament) return;
    if (!backendUrl) {
      setApiError("VITE_BACKEND_URL is missing.");
      return;
    }
    if (!supabase) {
      setApiError("Supabase auth is unavailable.");
      return;
    }
    if (!editName.trim()) {
      setApiError("Tournament name is required.");
      return;
    }
    if (!editStartDateTime || !editEndDateTime) {
      setApiError("Start and end dates are required.");
      return;
    }
    if (new Date(editEndDateTime) < new Date(editStartDateTime)) {
      setApiError("End date cannot be before the start date.");
      return;
    }

    try {
      setIsUpdatingTournament(true);
      setApiError("");
      const response = await requestBackendWithFallback(
        [`/tournament/${selectedTournament.id}`],
        {
          method: "PUT",
          requireAuth: true,
          fallbackError: "Could not update tournament.",
          body: {
            name: editName.trim(),
            description: editRules.trim(),
            start_date: editStartDateTime,
            end_date: editEndDateTime,
            format: editFormat,
            status: editStatus,
          },
        }
      );

      if (response.error) {
        setApiError(response.error);
        return;
      }

      const payload = response.data;
      if (payload?.tournament) {
        saveTournamentMetaOverride(selectedTournament.id, {
          teams: selectedTournament.teams,
          prizePool: selectedTournament.prizePool,
          organizer: selectedTournament.organizer,
          game: selectedTournament.game,
          status: editStatus,
          format: editFormat,
          rules: editRules.trim(),
        });
        const updatedTournament = normalizeTournament({
          ...selectedTournament,
          ...payload.tournament,
        });
        const nextManagedIds = [
          ...new Set([...managedTournamentIds, String(updatedTournament.id)]),
        ];
        setManagedTournamentIds(nextManagedIds);
        writeManagedTournamentIds(user, nextManagedIds);
        updateSelectedTournament(updatedTournament);
      }

      setIsEditingTournament(false);
    } catch (err) {
      setApiError(`Could not update tournament: ${err.message}`);
    } finally {
      setIsUpdatingTournament(false);
    }
  };

  // Keeps the selected tournament and list view in sync.
  const updateSelectedTournament = (updatedTournament) => {
    setSelectedTournament(updatedTournament);
    setTournaments((prev) =>
      prev.map((tournament) =>
        tournament.id === updatedTournament.id ? updatedTournament : tournament
      )
    );
  };

  // Team name is used for registration if the user already has a team profile.
  const getRegistrationIdentity = () => teamProfile?.teamName || user;

  // Adds the current user's team to the selected tournament.
  const joinTournament = async () => {
    if (!selectedTournament || !user) return;
    if (!teamProfile) return;
    if (!backendUrl) {
      setApiError("VITE_BACKEND_URL is missing.");
      return;
    }

    const capacity = Number(selectedTournament.teams);
    const participants = selectedTournament.participants || [];
    const registrationIdentity = getRegistrationIdentity();
    const alreadyRegistered =
      participants.includes(registrationIdentity) || participants.includes(user);

    if (alreadyRegistered || participants.length >= capacity) return;

    setApiError("");
    const response = await requestBackendWithFallback(
      [`/tournament/${selectedTournament.id}/teams`],
      {
        method: "POST",
        requireAuth: true,
        fallbackError: "Could not register team for tournament.",
      }
    );

    if (response.error && response.status !== 409) {
      setApiError(response.error);
      return;
    }

    const updatedParticipants = await fetchTournamentParticipants(selectedTournament.id);
    const updatedTournament = {
      ...selectedTournament,
      participants: updatedParticipants,
      standings: buildStandings(updatedParticipants, selectedTournament.standings),
    };

    updateSelectedTournament(updatedTournament);
  };

  // Removes the current user's team from the selected tournament.
  const leaveTournament = async () => {
    if (!selectedTournament || !user) return;
    if (!backendUrl) {
      setApiError("VITE_BACKEND_URL is missing.");
      return;
    }
    const registrationIdentity = getRegistrationIdentity();

    const participants = selectedTournament.participants || [];
    if (!participants.includes(registrationIdentity) && !participants.includes(user)) return;

    setApiError("");
    const response = await requestBackendWithFallback(
      [`/tournament/${selectedTournament.id}/teams`],
      {
        method: "DELETE",
        requireAuth: true,
        fallbackError: "Could not withdraw team from tournament.",
      }
    );

    if (response.error) {
      setApiError(response.error);
      return;
    }

    const updatedParticipants = await fetchTournamentParticipants(selectedTournament.id);
    const updatedTournament = {
      ...selectedTournament,
      participants: updatedParticipants,
      standings: selectedTournament.standings.filter(
        (item) => item.team !== registrationIdentity && item.team !== user
      ),
    };

    updateSelectedTournament(updatedTournament);
  };

  const filteredTournaments = useMemo(() => {
    const filtered = tournaments.filter(
      (tournament) =>
        !dateFilter || tournament.startDateTime?.slice(0, 10) === dateFilter
    );

    filtered.sort(
      (a, b) => new Date(b.startDateTime) - new Date(a.startDateTime)
    );

    return filtered;
  }, [tournaments, dateFilter]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredTournaments.length / pageSize)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTournaments = filteredTournaments.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );
  const bracketRounds = useMemo(() => {
    if (!selectedTournament || selectedTournament.format !== "single elim") {
      return [];
    }

    return buildSingleElimRounds(
      selectedTournament.participants || [],
      selectedTournament.teams,
      selectedTournament.id
    );
  }, [selectedTournament]);
  const swissData = useMemo(() => {
    if (!selectedTournament || selectedTournament.format !== "swiss") {
      return { rounds: [], leaderboard: [] };
    }

    return buildSwissData(
      selectedTournament.participants || [],
      selectedTournament.teams,
      selectedTournament.id
    );
  }, [selectedTournament]);
  const doubleElimData = useMemo(() => {
    if (!selectedTournament || selectedTournament.format !== "double elim") {
      return { winnerRounds: [], loserRounds: [] };
    }

    return buildDoubleElimData(
      selectedTournament.participants || [],
      selectedTournament.teams,
      selectedTournament.id
    );
  }, [selectedTournament]);
  const roundRobinData = useMemo(() => {
    if (!selectedTournament || selectedTournament.format !== "round robin") {
      return { rounds: [], standings: [] };
    }

    return buildRoundRobinData(
      selectedTournament.participants || [],
      selectedTournament.teams,
      selectedTournament.id
    );
  }, [selectedTournament]);

  useEffect(() => {
    // Changing filter controls should reset the list back to page 1.
    setCurrentPage(1);
  }, [dateFilter]);

  useEffect(() => {
    let active = true;

    const prepareTournamentPage = async () => {
      if (!supabase) {
        if (active) {
          setHasCheckedSession(true);
          setApiError("Supabase auth is unavailable.");
        }
        return;
      }

      await supabase.auth.getSession();
      if (!active) return;

      setHasCheckedSession(true);
      await fetchTournaments();
    };

    prepareTournamentPage();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setTournamentMetaOverrides(readTournamentMetaOverrides());
  }, []);

  useEffect(() => {
    if (!user) {
      setManagedTournamentIds([]);
      return;
    }

    setManagedTournamentIds(readManagedTournamentIds(user));
  }, [user]);

  useEffect(() => {
    let active = true;

    // Load the user's team profile so the page can decide whether registration is allowed.
    const loadTeamProfile = async () => {
      if (!user) {
        setTeamProfile(null);
        setTeamProfileError("");
        setTeamProfileLoading(false);
        return;
      }

      const cachedTeam = getCachedTeamProfileForCurrentUser(user);
      if (cachedTeam) {
        setTeamProfile(cachedTeam);
      }

      setTeamProfileLoading(true);
      setTeamProfileError("");
      const { teamProfile: loadedTeamProfile, error } =
        await fetchCurrentUserTeamProfile(user);
      if (!active) return;

      setTeamProfile(loadedTeamProfile || cachedTeam || null);
      setTeamProfileError(loadedTeamProfile ? "" : error || "");
      setTeamProfileLoading(false);
    };

    loadTeamProfile();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    if (!selectedTournament) {
      setIsEditingTournament(false);
      return;
    }

    setEditName(selectedTournament.name || "");
    setEditStartDateTime(
      selectedTournament.startDateTime ? selectedTournament.startDateTime.slice(0, 10) : ""
    );
    setEditEndDateTime(
      selectedTournament.endDateTime ? selectedTournament.endDateTime.slice(0, 10) : ""
    );
    setEditFormat(selectedTournament.format || "single elim");
    setEditStatus(selectedTournament.status || "upcoming");
    setEditRules(selectedTournament.rules || "");
    setActiveSwissRound(0);
    setActiveRoundRobinRound(0);
  }, [selectedTournament]);

  return (
    <div className="tournaments">
      {!selectedTournament && <h1>Tournaments</h1>}
      {apiError && hasCheckedSession && <p className="team-required-error">{apiError}</p>}
      {selectedTournament ? (
        <div className="tournament-details">
          {/* Detail view replaces the grid when one tournament is selected. */}
          <div className="tournament-topbar">
            <button
              className="back-btn"
              onClick={() => {
                setSelectedTournament(null);
                setActiveTab("overview");
              }}
            >
              Back to Tournaments
            </button>
            {canManageTournament(selectedTournament) && !isEditingTournament && (
              <button
                type="button"
                className="join-btn tournament-edit-btn"
                onClick={() => beginEditingTournament(selectedTournament)}
              >
                Edit Tournament
              </button>
            )}
          </div>
          <h2>{selectedTournament.name}</h2>
          {canManageTournament(selectedTournament) && isEditingTournament && (
            <div className="tournament-admin-panel">
              <div className="tournament-admin-form">
                <div className="input-group">
                  <label htmlFor="edit-tournament-name">Tournament Name</label>
                  <input
                    id="edit-tournament-name"
                    type="text"
                    value={editName}
                    onChange={(event) => setEditName(event.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="edit-tournament-start-date">Start Date</label>
                  <input
                    id="edit-tournament-start-date"
                    type="date"
                    value={editStartDateTime}
                    onChange={(event) => setEditStartDateTime(event.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="edit-tournament-end-date">End Date</label>
                  <input
                    id="edit-tournament-end-date"
                    type="date"
                    value={editEndDateTime}
                    onChange={(event) => setEditEndDateTime(event.target.value)}
                  />
                </div>

                <div className="input-group">
                  <label htmlFor="edit-tournament-format">Format</label>
                  <select
                    id="edit-tournament-format"
                    value={editFormat}
                    onChange={(event) => setEditFormat(event.target.value)}
                  >
                    {formatOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="edit-tournament-status">Status</label>
                  <select
                    id="edit-tournament-status"
                    value={editStatus}
                    onChange={(event) => setEditStatus(event.target.value)}
                  >
                    <option value="upcoming">Upcoming</option>
                    <option value="live">Live</option>
                    <option value="complete">Completed</option>
                  </select>
                </div>

                <div className="input-group">
                  <label htmlFor="edit-tournament-rules">Rules</label>
                  <input
                    id="edit-tournament-rules"
                    type="text"
                    value={editRules}
                    onChange={(event) => setEditRules(event.target.value)}
                  />
                </div>

                <div className="tournament-admin-actions">
                  <button
                    type="button"
                    className="join-btn"
                    onClick={updateTournament}
                    disabled={isUpdatingTournament}
                  >
                    {isUpdatingTournament ? "Saving..." : "Save Changes"}
                  </button>
                  <button
                    type="button"
                    className="leave-btn"
                    onClick={cancelEditingTournament}
                    disabled={isUpdatingTournament}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="tournament-tabs">
            <button
              className={activeTab === "overview" ? "active" : ""}
              onClick={() => setActiveTab("overview")}
            >
              Overview
            </button>
            <button
              className={activeTab === "rules" ? "active" : ""}
              onClick={() => setActiveTab("rules")}
            >
              Rules/Format
            </button>
            <button
              className={activeTab === "participants" ? "active" : ""}
              onClick={() => setActiveTab("participants")}
            >
              Participants
            </button>
            <button
              className={activeTab === "bracket" ? "active" : ""}
              onClick={() => setActiveTab("bracket")}
            >
              Bracket
            </button>
          </div>

          <div className="tournament-content">
            {activeTab === "overview" && (
              <>
                <div className="detail-grid">
                  <p><strong>Organizer:</strong> {selectedTournament.organizer}</p>
                  <p><strong>Start:</strong> {formatDateTimeLabel(selectedTournament.startDateTime)}</p>
                  <p><strong>End:</strong> {formatDateTimeLabel(selectedTournament.endDateTime)}</p>
                  <p><strong>Teams:</strong> {selectedTournament.minTeams === selectedTournament.teams ? selectedTournament.teams : `${selectedTournament.minTeams}-${selectedTournament.teams}`}</p>
                  <p><strong>Registered:</strong> {selectedTournament.participants.length}/{selectedTournament.teams}</p>
                  <p><strong>Prize Pool:</strong> {formatPrizePoolLabel(selectedTournament.prizePool)}</p>
                  <p><strong>Game:</strong> {selectedTournament.game}</p>
                  <p><strong>Status:</strong> {selectedTournament.status}</p>
                  <p><strong>Format:</strong> {formatTournamentFormatLabel(selectedTournament.format)}</p>
                </div>
              </>
            )}

            {activeTab === "rules" && (
              <div className="detail-section">
                <p><strong>Format:</strong> {formatTournamentFormatLabel(selectedTournament.format)}</p>
                <p>{selectedTournament.rules}</p>
              </div>
            )}

            {activeTab === "participants" && (
              <div className="detail-section">
                {/* Registration area changes depending on login/team-profile state. */}
                <h3>Teams</h3>
                <p>
                  Registered: {selectedTournament.participants.length}/{selectedTournament.teams}
                </p>
                <div className="participants-table-wrap">
                  <table className="standings-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Team</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedTournament.participants.length === 0 ? (
                        <tr>
                          <td colSpan="2">No participants yet.</td>
                        </tr>
                      ) : (
                        selectedTournament.participants.map((team, index) => (
                          <tr key={team}>
                            <td>{index + 1}</td>
                            <td>{team}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
                {user ? (
                  selectedTournament.participants.includes(getRegistrationIdentity()) ||
                  selectedTournament.participants.includes(user) ? (
                    <button className="leave-btn" onClick={leaveTournament}>
                      Leave Tournament
                    </button>
                  ) : teamProfileLoading ? (
                    <p>Checking team profile...</p>
                  ) : !teamProfile ? (
                    <div className="team-required-cta">
                      <p>You need a team profile before registering.</p>
                      <a href="/team-profile">Create Team Profile</a>
                      {teamProfileError && <p className="team-required-error">{teamProfileError}</p>}
                    </div>
                  ) : (
                    <button
                      className="join-btn"
                      onClick={joinTournament}
                      disabled={selectedTournament.participants.length >= Number(selectedTournament.teams)}
                    >
                      {selectedTournament.participants.length >= Number(selectedTournament.teams)
                        ? "Tournament Full"
                        : "Sign Up To Play"}
                    </button>
                  )
                ) : (
                  <p>
                    <a href="/login">Log in</a> to sign up for this tournament.
                  </p>
                )}
              </div>
            )}

            {activeTab === "bracket" && (
              <div className="detail-section">
                <h3>Bracket</h3>
                {selectedTournament.format === "single elim" ? (
                  <div className="bracket-view">
                    <p className="bracket-summary">
                      Single elimination bracket based on a maximum of{" "}
                      {selectedTournament.teams} teams.
                    </p>
                    <div className="single-elim-bracket">
                      {bracketRounds.map((round, roundIndex) => (
                        <div className="bracket-round" key={`round-${roundIndex + 1}`}>
                          <h4>
                            {roundIndex === bracketRounds.length - 1
                              ? "Final"
                              : `Round ${roundIndex + 1}`}
                          </h4>
                          <div className="bracket-match-list">
                            {round.map((match) => (
                              <div className="bracket-match" key={match.id}>
                                <div className="bracket-slot">
                                  <span className="bracket-seed">
                                    {match.topEntry.seed}
                                  </span>
                                  <span
                                    className={`bracket-team bracket-team-${match.topEntry.status}`}
                                  >
                                    {match.topEntry.name ||
                                      (match.topEntry.status === "bye"
                                        ? "Bye"
                                        : "Open Slot")}
                                  </span>
                                </div>
                                <div className="bracket-slot">
                                  <span className="bracket-seed">
                                    {match.bottomEntry.seed}
                                  </span>
                                  <span
                                    className={`bracket-team bracket-team-${match.bottomEntry.status}`}
                                  >
                                    {match.bottomEntry.name ||
                                      (match.bottomEntry.status === "bye"
                                        ? "Bye"
                                        : "Open Slot")}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : selectedTournament.format === "swiss" ? (
                  <div className="swiss-view">
                    <div className="swiss-topbar">
                      <div className="swiss-round-tabs">
                        {swissData.rounds.map((round, roundIndex) => (
                          <button
                            key={round.id}
                            type="button"
                            className={activeSwissRound === roundIndex ? "active" : ""}
                            onClick={() => setActiveSwissRound(roundIndex)}
                          >
                            {round.label}
                          </button>
                        ))}
                      </div>
                      <div className="swiss-leaderboard-label">Leaderboard</div>
                    </div>
                    <div className="swiss-layout">
                      <div className="swiss-round-panel">
                        <h4>
                          {swissData.rounds[activeSwissRound]?.title || "Round 1"}
                        </h4>
                        <div className="swiss-match-grid">
                          {(swissData.rounds[activeSwissRound]?.matches || []).map(
                            (match, matchIndex) => (
                              <div className="swiss-match-card" key={match.id}>
                                <div className="swiss-match-header">
                                  <span>
                                    {swissData.rounds[activeSwissRound]?.label} - Game{" "}
                                    {matchIndex + 1}
                                  </span>
                                  <span>Set date & time</span>
                                </div>
                                <div className="swiss-match-body">
                                  <div className="swiss-match-team">
                                    <strong>Team 1</strong>
                                    <span>{match.leftTeam || "Open Slot"}</span>
                                  </div>
                                  <div className="swiss-match-vs">VS</div>
                                  <div className="swiss-match-team swiss-match-team-right">
                                    <strong>Team 2</strong>
                                    <span>{match.rightTeam || "Open Slot"}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                      <div className="swiss-leaderboard">
                        <h4>Leaderboard</h4>
                        <table className="standings-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>Team</th>
                              <th>W-L</th>
                              <th>GD</th>
                              <th>BH</th>
                              <th>P</th>
                            </tr>
                          </thead>
                          <tbody>
                            {swissData.leaderboard.length === 0 ? (
                              <tr>
                                <td colSpan="6">No teams registered yet.</td>
                              </tr>
                            ) : (
                              swissData.leaderboard.map((entry) => (
                                <tr key={entry.team}>
                                  <td>{entry.rank}</td>
                                  <td>{entry.team}</td>
                                  <td>
                                    {entry.wins}-{entry.losses}
                                  </td>
                                  <td>
                                    {entry.gameDiff > 0 ? `+${entry.gameDiff}` : entry.gameDiff}
                                  </td>
                                  <td>{entry.buchholz}</td>
                                  <td>{entry.points}</td>
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : selectedTournament.format === "double elim" ? (
                  <div className="bracket-view">
                    <p className="bracket-summary">
                      Double elimination bracket based on a maximum of{" "}
                      {selectedTournament.teams} teams.
                    </p>
                    <div className="double-elim-layout">
                      <section className="double-elim-section">
                        <h4>Winner Bracket</h4>
                        <div className="single-elim-bracket">
                          {doubleElimData.winnerRounds.map((round) => (
                            <div className="bracket-round" key={round.id}>
                              <h4>{round.title}</h4>
                              <div className="bracket-match-list">
                                {round.matches.map((match) => (
                                  <div className="bracket-match" key={match.id}>
                                    <div className="bracket-slot">
                                      <span className="bracket-seed">
                                        {match.topEntry.seed}
                                      </span>
                                      <span
                                        className={`bracket-team bracket-team-${match.topEntry.status}`}
                                      >
                                        {match.topEntry.name ||
                                          (match.topEntry.status === "bye"
                                            ? "Bye"
                                            : "Open Slot")}
                                      </span>
                                    </div>
                                    <div className="bracket-slot">
                                      <span className="bracket-seed">
                                        {match.bottomEntry.seed}
                                      </span>
                                      <span
                                        className={`bracket-team bracket-team-${match.bottomEntry.status}`}
                                      >
                                        {match.bottomEntry.name ||
                                          (match.bottomEntry.status === "bye"
                                            ? "Bye"
                                            : "Open Slot")}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                      <section className="double-elim-section">
                        <h4>Loser Bracket</h4>
                        <div className="single-elim-bracket">
                          {doubleElimData.loserRounds.map((round) => (
                            <div className="bracket-round" key={round.id}>
                              <h4>{round.title}</h4>
                              <div className="bracket-match-list">
                                {round.matches.map((match) => (
                                  <div className="bracket-match" key={match.id}>
                                    <div className="bracket-slot">
                                      <span className="bracket-seed">
                                        {match.topEntry.seed}
                                      </span>
                                      <span
                                        className={`bracket-team bracket-team-${match.topEntry.status}`}
                                      >
                                        {match.topEntry.name || "Open Slot"}
                                      </span>
                                    </div>
                                    <div className="bracket-slot">
                                      <span className="bracket-seed">
                                        {match.bottomEntry.seed}
                                      </span>
                                      <span
                                        className={`bracket-team bracket-team-${match.bottomEntry.status}`}
                                      >
                                        {match.bottomEntry.name || "Open Slot"}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    </div>
                  </div>
                ) : selectedTournament.format === "round robin" ? (
                  <div className="round-robin-view">
                    <div className="swiss-topbar">
                      <div className="swiss-round-tabs">
                        {roundRobinData.rounds.map((round, roundIndex) => (
                          <button
                            key={round.id}
                            type="button"
                            className={activeRoundRobinRound === roundIndex ? "active" : ""}
                            onClick={() => setActiveRoundRobinRound(roundIndex)}
                          >
                            R{roundIndex + 1}
                          </button>
                        ))}
                      </div>
                      <div className="swiss-leaderboard-label">Standings</div>
                    </div>
                    <div className="swiss-layout">
                      <div className="swiss-round-panel">
                        <h4>
                          {roundRobinData.rounds[activeRoundRobinRound]?.title || "Round 1"}
                        </h4>
                        <div className="swiss-match-grid">
                          {(roundRobinData.rounds[activeRoundRobinRound]?.matches || []).map(
                            (match, matchIndex) => (
                              <div className="swiss-match-card" key={match.id}>
                                <div className="swiss-match-header">
                                  <span>
                                    R{activeRoundRobinRound + 1} - Match {matchIndex + 1}
                                  </span>
                                  <span>Scheduled</span>
                                </div>
                                <div className="swiss-match-body">
                                  <div className="swiss-match-team">
                                    <strong>Team 1</strong>
                                    <span>{match.leftTeam || `Open Slot ${match.leftSlot}`}</span>
                                  </div>
                                  <div className="swiss-match-vs">VS</div>
                                  <div className="swiss-match-team swiss-match-team-right">
                                    <strong>Team 2</strong>
                                    <span>{match.rightTeam || `Open Slot ${match.rightSlot}`}</span>
                                  </div>
                                </div>
                              </div>
                            )
                          )}
                        </div>
                      </div>
                      <div className="swiss-leaderboard round-robin-standings-panel">
                        <h4>{selectedTournament.teams} Team Round Robin</h4>
                        <table className="standings-table">
                          <thead>
                            <tr>
                              <th>Team</th>
                              <th>Wins</th>
                              <th>Losses</th>
                            </tr>
                          </thead>
                          <tbody>
                            {roundRobinData.standings.map((entry) => (
                              <tr key={`rr-standing-${entry.rank}`}>
                                <td>{entry.team}</td>
                                <td>{entry.wins}</td>
                                <td>{entry.losses}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                ) : (
                  <p>
                    Bracket visual for {formatTournamentFormatLabel(selectedTournament.format)}{" "}
                    has not been added yet.
                  </p>
                )}
              </div>
            )}

          </div>
        </div>
      ) : (
        <>
          {user ? (
            <div className="tournament-input">
              {/* Create form only shows for logged-in users. */}
              <div className="input-group">
                <label htmlFor="tournament-name">Tournament Name</label>
                <input
                  id="tournament-name"
                  className={formErrors.name ? "field-error" : ""}
                  type="text"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError("name");
                  }}
                />
                {formErrors.name && <p className="input-error-text">{formErrors.name}</p>}
              </div>

              <div className="input-group">
                <label htmlFor="tournament-min-teams">Minimum Teams</label>
                <select
                  id="tournament-min-teams"
                  className={formErrors.minTeams ? "field-error" : ""}
                  value={minTeams}
                  onChange={(e) => {
                    const nextMinTeams = e.target.value;
                    setMinTeams(nextMinTeams);
                    clearFieldError("minTeams");
                    if (Number(maxTeams) < Number(nextMinTeams)) {
                      setMaxTeams(nextMinTeams);
                      clearFieldError("maxTeams");
                    }
                  }}
                >
                  {teamSizeOptions.map((option) => (
                    <option key={`min-${option}`} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
                {formErrors.minTeams && <p className="input-error-text">{formErrors.minTeams}</p>}
              </div>

              <div className="input-group">
                <label htmlFor="tournament-max-teams">Maximum Teams</label>
                <select
                  id="tournament-max-teams"
                  className={formErrors.maxTeams ? "field-error" : ""}
                  value={maxTeams}
                  onChange={(e) => {
                    setMaxTeams(e.target.value);
                    clearFieldError("maxTeams");
                  }}
                >
                  {teamSizeOptions
                    .filter((option) => option >= Number(minTeams))
                    .map((option) => (
                      <option key={`max-${option}`} value={option}>
                        {option}
                      </option>
                    ))}
                </select>
                {formErrors.maxTeams && <p className="input-error-text">{formErrors.maxTeams}</p>}
              </div>

              <div className="input-group">
                <label htmlFor="tournament-prize-pool">Prize Pool ($)</label>
                <input
                  id="tournament-prize-pool"
                  className={formErrors.prizePool ? "field-error" : ""}
                  type="number"
                  value={prizePool}
                  onChange={(e) => {
                    setPrizePool(e.target.value);
                    clearFieldError("prizePool");
                  }}
                />
                {formErrors.prizePool && (
                  <p className="input-error-text">{formErrors.prizePool}</p>
                )}
              </div>

              <div className="input-group">
                <label htmlFor="tournament-organizer">Organizer</label>
                <input
                  id="tournament-organizer"
                  type="text"
                  value={organizer}
                  onChange={(e) => {
                    setOrganizer(e.target.value);
                  }}
                />
              </div>

              <div className="input-group">
                <label htmlFor="tournament-start-date">Start Date</label>
                <input
                  id="tournament-start-date"
                  className={formErrors.startDateTime ? "field-error" : ""}
                  type="date"
                  value={startDateTime}
                  onChange={(e) => {
                    setStartDateTime(e.target.value);
                    clearFieldError("startDateTime");
                  }}
                />
                {formErrors.startDateTime && (
                  <p className="input-error-text">{formErrors.startDateTime}</p>
                )}
              </div>

              <div className="input-group">
                <label htmlFor="tournament-end-date">End Date</label>
                <input
                  id="tournament-end-date"
                  className={formErrors.endDateTime ? "field-error" : ""}
                  type="date"
                  value={endDateTime}
                  onChange={(e) => {
                    setEndDateTime(e.target.value);
                    clearFieldError("endDateTime");
                  }}
                />
                {formErrors.endDateTime && (
                  <p className="input-error-text">{formErrors.endDateTime}</p>
                )}
              </div>

              <div className="input-group">
                <label htmlFor="tournament-format">Format</label>
                <select
                  id="tournament-format"
                  value={format}
                  onChange={(e) => setFormat(e.target.value)}
                >
                  {formatOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <label htmlFor="tournament-rules">Rules Summary</label>
                <input
                  id="tournament-rules"
                  className={formErrors.rules ? "field-error" : ""}
                  type="text"
                  value={rules}
                  onChange={(e) => {
                    setRules(e.target.value);
                    clearFieldError("rules");
                  }}
                />
                {formErrors.rules && <p className="input-error-text">{formErrors.rules}</p>}
              </div>

              <button onClick={addTournament} disabled={isSavingTournament}>
                {isSavingTournament ? "Saving..." : "Add Tournament"}
              </button>
            </div>
          ) : (
            <div className="tournament-auth-cta">
              <p>Log in to create a tournament.</p>
              <a href="/login">Go to Login</a>
            </div>
          )}

          <div className="listing-toolbar">
            {/* Only the date filter remains for narrowing down the tournament list. */}
            <label className="listing-filter-button">
              <span>Filter</span>
              <input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </label>
          </div>

          <div className="tournament-grid">
            {filteredTournaments.length === 0 && (
              <p>No tournaments match your filters.</p>
            )}

            {paginatedTournaments.map((tournament) => (
              <div
                key={tournament.id}
                className="tournament-card"
                onClick={() => setSelectedTournament(tournament)}
              >
                {/* Placeholder image block until real tournament images are added. */}
                <div className="tournament-image">
                  <img
                    src={tournament.imageUrl || defaultTournamentImage}
                    alt={`${tournament.name} cover`}
                    onError={(event) => {
                      event.currentTarget.src = defaultTournamentImage;
                    }}
                  />
                </div>

                <div className="tournament-info">
                  <h3>{tournament.name}</h3>
                  <p>{tournament.teams} Teams</p>
                  <p>{formatPrizePoolLabel(tournament.prizePool)} Prize Pool</p>
                  <p>{formatDateTimeLabel(tournament.startDateTime)}</p>
                  <p>Ends {formatDateTimeLabel(tournament.endDateTime)}</p>
                  <p>{tournament.game}</p>
                  <p className={`status-pill status-${tournament.status}`}>
                    {tournament.status}
                  </p>
                  <p>By {tournament.organizer}</p>
                </div>

                {user && (
                  <button
                    className="delete-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteTournament(tournament.id);
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="pagination">
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
              disabled={safeCurrentPage === 1}
            >
              Previous
            </button>
            <span>
              Page {safeCurrentPage} of {totalPages}
            </span>
            <button
              type="button"
              onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
              disabled={safeCurrentPage === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}
