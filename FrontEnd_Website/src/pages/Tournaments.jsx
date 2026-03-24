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

// This page has a lot going on, so helper functions keep the JSX from getting too messy.
export default function Tournaments({ user }) {
  const defaultGame = "Valorant";

  // Dropdown options for tournament format.
  const formatOptions = [
    { value: "single elim", label: "Single Elimination" },
    { value: "double elim", label: "Double Elimination" },
    { value: "round robin", label: "Round Robin" },
    { value: "swiss", label: "Swiss" },
  ];

  const [tournaments, setTournaments] = useState([]);
  const [name, setName] = useState("");
  const [teams, setTeams] = useState("");
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
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [gameFilter, setGameFilter] = useState("all");
  const [dateFilter, setDateFilter] = useState("");
  const [sortBy, setSortBy] = useState("date-desc");
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
  const normalizeTournament = (tournament) => ({
    ...tournament,
    id: tournament.id ?? tournament.tournament_id,
    teams: tournament.teams ?? tournament.team_limit ?? 0,
    prizePool: tournament.prizePool ?? tournament.prize_pool ?? "",
    organizer: tournament.organizer ?? "TBD",
    startDateTime: tournament.startDateTime ?? tournament.start_date ?? "",
    endDateTime: tournament.endDateTime ?? tournament.end_date ?? "",
    game: tournament.game ?? defaultGame,
    imageUrl:
      tournament.imageUrl ??
      tournament.image_url ??
      tournament.banner_url ??
      defaultTournamentImage,
    status: tournament.status ?? "upcoming",
    format: tournament.format ?? "single elim",
    rules: tournament.rules ?? tournament.description ?? "No rules provided.",
    participants: Array.isArray(tournament.participants) ? tournament.participants : [],
    standings: Array.isArray(tournament.standings) ? tournament.standings : [],
  });

  // Validates the create-tournament form before we try to submit it.
  const validateTournamentForm = () => {
    const errors = {};
    const trimmedName = name.trim();
    const trimmedRules = rules.trim();
    const teamCount = Number(teams);
    const prize = Number(prizePool);

    if (!trimmedName) {
      errors.name = "Tournament name is required.";
    }
    if (!teams) {
      errors.teams = "Number of teams is required.";
    } else if (!Number.isInteger(teamCount) || teamCount < 2) {
      errors.teams = "Team count must be a whole number of at least 2.";
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

  const canManageTournament = (tournament) =>
    Boolean(tournament && user && managedTournamentIds.includes(String(tournament.id)));

  const canAttemptManageTournament = (tournament) => Boolean(tournament && user);

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

  // Loads tournament data from the backend.
  const fetchTournaments = async () => {
    if (!backendUrl) {
      setApiError("VITE_BACKEND_URL is missing.");
      return;
    }

    setApiError("");
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

    setTournaments(
      Array.isArray(result.data?.tournaments)
        ? result.data.tournaments.map(normalizeTournament)
        : []
    );
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
        const createdTournament = normalizeTournament({
          ...payload.tournament,
          organizer: organizer.trim() || "You",
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
    setTeams("");
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
  const joinTournament = () => {
    if (!selectedTournament || !user) return;
    if (!teamProfile) return;

    const capacity = Number(selectedTournament.teams);
    const participants = selectedTournament.participants || [];
    const registrationIdentity = getRegistrationIdentity();
    const alreadyRegistered =
      participants.includes(registrationIdentity) || participants.includes(user);

    if (alreadyRegistered || participants.length >= capacity) return;

    const updatedParticipants = [...participants, registrationIdentity];
    const updatedTournament = {
      ...selectedTournament,
      participants: updatedParticipants,
      standings: selectedTournament.standings.length
        ? selectedTournament.standings
        : updatedParticipants.slice(0, Math.min(4, updatedParticipants.length)).map((team, index) => ({
            rank: index + 1,
            team,
            record: "0-0",
          })),
    };

    updateSelectedTournament(updatedTournament);
  };

  // Removes the current user's team from the selected tournament.
  const leaveTournament = () => {
    if (!selectedTournament || !user) return;
    const registrationIdentity = getRegistrationIdentity();

    const participants = selectedTournament.participants || [];
    if (!participants.includes(registrationIdentity) && !participants.includes(user)) return;

    const updatedParticipants = participants.filter(
      (participant) => participant !== registrationIdentity && participant !== user
    );
    const updatedTournament = {
      ...selectedTournament,
      participants: updatedParticipants,
      standings: selectedTournament.standings.filter(
        (item) => item.team !== registrationIdentity && item.team !== user
      ),
    };

    updateSelectedTournament(updatedTournament);
  };

  // Memo keeps the filter/sort work from re-running unless the inputs actually change.
  const filteredAndSortedTournaments = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    const filtered = tournaments.filter((tournament) => {
      const matchesSearch =
        !normalizedSearch ||
        tournament.name.toLowerCase().includes(normalizedSearch) ||
        tournament.organizer.toLowerCase().includes(normalizedSearch) ||
        tournament.game.toLowerCase().includes(normalizedSearch);

      const matchesStatus =
        statusFilter === "all" || tournament.status === statusFilter;

      const matchesGame = gameFilter === "all" || tournament.game === gameFilter;

      const matchesDate =
        !dateFilter || tournament.startDateTime?.slice(0, 10) === dateFilter;

      return matchesSearch && matchesStatus && matchesGame && matchesDate;
    });

    filtered.sort((a, b) => {
      if (sortBy === "date-asc") {
        return new Date(a.startDateTime) - new Date(b.startDateTime);
      }
      if (sortBy === "date-desc") {
        return new Date(b.startDateTime) - new Date(a.startDateTime);
      }
      if (sortBy === "name-asc") {
        return a.name.localeCompare(b.name);
      }
      if (sortBy === "prize-desc") {
        return Number(b.prizePool) - Number(a.prizePool);
      }
      if (sortBy === "prize-asc") {
        return Number(a.prizePool) - Number(b.prizePool);
      }
      return 0;
    });

    return filtered;
  }, [tournaments, searchTerm, statusFilter, gameFilter, dateFilter, sortBy]);

  const totalPages = Math.max(
    1,
    Math.ceil(filteredAndSortedTournaments.length / pageSize)
  );
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedTournaments = filteredAndSortedTournaments.slice(
    (safeCurrentPage - 1) * pageSize,
    safeCurrentPage * pageSize
  );
  const availableGames = [...new Set(tournaments.map((t) => t.game))];

  useEffect(() => {
    // Changing filter controls should reset the list back to page 1.
    setCurrentPage(1);
  }, [searchTerm, statusFilter, gameFilter, dateFilter, sortBy]);

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
  }, [selectedTournament]);

  return (
    <div className="tournaments">
      <h1>Tournaments</h1>
      {apiError && hasCheckedSession && <p className="team-required-error">{apiError}</p>}

      {selectedTournament ? (
        <div className="tournament-details">
          {/* Detail view replaces the grid when one tournament is selected. */}
          <button
            className="back-btn"
            onClick={() => {
              setSelectedTournament(null);
              setActiveTab("overview");
            }}
          >
            Back to Tournaments
          </button>
          <h2>{selectedTournament.name}</h2>

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
              className={activeTab === "standings" ? "active" : ""}
              onClick={() => setActiveTab("standings")}
            >
              Bracket/Standings
            </button>
          </div>

          <div className="tournament-content">
            {activeTab === "overview" && (
              <>
                <div className="detail-grid">
                  <p><strong>Organizer:</strong> {selectedTournament.organizer}</p>
                  <p><strong>Start:</strong> {formatDateTimeLabel(selectedTournament.startDateTime)}</p>
                  <p><strong>End:</strong> {formatDateTimeLabel(selectedTournament.endDateTime)}</p>
                  <p><strong>Teams:</strong> {selectedTournament.teams}</p>
                  <p><strong>Registered:</strong> {selectedTournament.participants.length}/{selectedTournament.teams}</p>
                  <p><strong>Prize Pool:</strong> {formatPrizePoolLabel(selectedTournament.prizePool)}</p>
                  <p><strong>Game:</strong> {selectedTournament.game}</p>
                  <p><strong>Status:</strong> {selectedTournament.status}</p>
                  <p><strong>Format:</strong> {formatTournamentFormatLabel(selectedTournament.format)}</p>
                </div>

                {canAttemptManageTournament(selectedTournament) && (
                  <div className="tournament-admin-panel">
                    <div className="tournament-admin-header">
                      <div>
                        <h3>Tournament Admin</h3>
                        <p>
                          Edit requests are sent to the backend. If you are the owner/admin,
                          the changes will save.
                        </p>
                      </div>
                      {!isEditingTournament && (
                        <button type="button" className="join-btn" onClick={() => beginEditingTournament(selectedTournament)}>
                          Edit Tournament
                        </button>
                      )}
                    </div>

                    {isEditingTournament && (
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
                    )}
                  </div>
                )}
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
                <ul className="participants-list">
                  {selectedTournament.participants.length === 0 && (
                    <li>No participants yet.</li>
                  )}
                  {selectedTournament.participants.map((team) => (
                    <li key={team}>{team}</li>
                  ))}
                </ul>
              </div>
            )}

            {activeTab === "standings" && (
              <div className="detail-section">
                <h3>Current Standings</h3>
                <table className="standings-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Team</th>
                      <th>Record</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedTournament.standings.length === 0 && (
                      <tr>
                        <td colSpan="3">Standings will appear after teams sign up.</td>
                      </tr>
                    )}
                    {selectedTournament.standings.map((item) => (
                      <tr key={`${item.rank}-${item.team}`}>
                        <td>{item.rank}</td>
                        <td>{item.team}</td>
                        <td>{item.record}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
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
                <input
                  className={formErrors.name ? "field-error" : ""}
                  type="text"
                  placeholder="Tournament Name"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    clearFieldError("name");
                  }}
                />
                {formErrors.name && <p className="input-error-text">{formErrors.name}</p>}
              </div>

              <div className="input-group">
                <input
                  className={formErrors.teams ? "field-error" : ""}
                  type="number"
                  placeholder="Number of Teams"
                  value={teams}
                  onChange={(e) => {
                    setTeams(e.target.value);
                    clearFieldError("teams");
                  }}
                />
                {formErrors.teams && <p className="input-error-text">{formErrors.teams}</p>}
              </div>

              <div className="input-group">
                <input
                  className={formErrors.prizePool ? "field-error" : ""}
                  type="number"
                  placeholder="Prize Pool ($)"
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
                <input
                  type="text"
                  placeholder="Organizer"
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
                <select value={format} onChange={(e) => setFormat(e.target.value)}>
                  {formatOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="input-group">
                <input
                  className={formErrors.rules ? "field-error" : ""}
                  type="text"
                  placeholder="Rules summary"
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
            {/* These controls let users search and narrow down the tournament list. */}
            <input
              type="text"
              placeholder="Search tournaments, organizer, game..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">All Statuses</option>
              <option value="upcoming">Upcoming</option>
              <option value="live">Live</option>
              <option value="complete">Completed</option>
            </select>

            <select value={gameFilter} onChange={(e) => setGameFilter(e.target.value)}>
              <option value="all">All Games</option>
              {availableGames.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            />

            <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
              <option value="date-desc">Date: Newest</option>
              <option value="date-asc">Date: Oldest</option>
              <option value="name-asc">Name: A-Z</option>
              <option value="prize-desc">Prize: High to Low</option>
              <option value="prize-asc">Prize: Low to High</option>
            </select>
          </div>

          <div className="tournament-grid">
            {filteredAndSortedTournaments.length === 0 && (
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
