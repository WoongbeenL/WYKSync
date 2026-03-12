import { useEffect, useMemo, useState } from "react";
import "./tournaments.css";
import { fetchCurrentUserTeamProfile } from "../lib/teamProfile";
import { supabase } from "../lib/supabaseClient";
import {
  backendUrl,
  requestBackendWithFallback,
} from "../lib/backendApi";

export default function Tournaments({ user }) {
  const [tournaments, setTournaments] = useState([]);
  const [name, setName] = useState("");
  const [teams, setTeams] = useState("");
  const [prizePool, setPrizePool] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [game, setGame] = useState("Valorant");
  const [status, setStatus] = useState("upcoming");
  const [format, setFormat] = useState("Single Elimination");
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

  const pageSize = 6;

  const formatDateTimeLabel = (value) => {
    if (!value) return "TBD";
    return new Date(value).toLocaleString();
  };

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
    if (!prizePool) {
      errors.prizePool = "Prize pool is required.";
    } else if (!Number.isFinite(prize) || prize < 0) {
      errors.prizePool = "Prize pool must be a valid number 0 or greater.";
    }
    if (!startDateTime) {
      errors.startDateTime = "Start date and time is required.";
    }
    if (!trimmedRules) {
      errors.rules = "Rules summary is required.";
    }

    return errors;
  };

  const clearFieldError = (fieldName) => {
    if (!formErrors[fieldName]) return;
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next[fieldName];
      return next;
    });
  };

  const fetchTournaments = async () => {
    if (!backendUrl) {
      setApiError("VITE_BACKEND_URL is missing.");
      return;
    }

    setApiError("");
    const result = await requestBackendWithFallback(
      ["/tournaments", "/tournament"],
      {
        fallbackError: "Could not load tournaments.",
        allowNotFound: true,
      }
    );

    if (result.error) {
      setApiError(result.error);
      return;
    }

    setTournaments(Array.isArray(result.data?.tournaments) ? result.data.tournaments : []);
  };

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
        ["/tournaments", "/tournament"],
        {
          method: "POST",
          requireAuth: true,
          fallbackError: "Could not create tournament.",
          body: {
          name: name.trim(),
          teams: Number(teams),
          prizePool: Number(prizePool),
          organizer: organizer.trim() || "TBD",
          startDateTime,
          game,
          status,
          format,
          rules: rules.trim(),
          },
        }
      );

      if (response.error) {
        setApiError(response.error);
        return;
      }

      const payload = response.data;
      if (payload?.tournament) {
        setTournaments((prev) => [payload.tournament, ...prev]);
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
    setGame("Valorant");
    setStatus("upcoming");
    setFormat("Single Elimination");
    setRules("Standard competitive rules apply. All matches are Best of 3.");
    setFormErrors({});
  };

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
        [`/tournaments/${id}`, `/tournament/${id}`],
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
    } catch (err) {
      setApiError(`Could not delete tournament: ${err.message}`);
    }
  };

  const updateSelectedTournament = (updatedTournament) => {
    setSelectedTournament(updatedTournament);
    setTournaments((prev) =>
      prev.map((tournament) =>
        tournament.id === updatedTournament.id ? updatedTournament : tournament
      )
    );
  };

  const getRegistrationIdentity = () => teamProfile?.teamName || user;

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
      standings: selectedTournament.standings.filter((item) => item.team !== user),
    };

    updateSelectedTournament(updatedTournament);
  };

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
    setCurrentPage(1);
  }, [searchTerm, statusFilter, gameFilter, dateFilter, sortBy]);

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    let active = true;

    const loadTeamProfile = async () => {
      if (!user) {
        setTeamProfile(null);
        setTeamProfileError("");
        setTeamProfileLoading(false);
        return;
      }

      setTeamProfileLoading(true);
      setTeamProfileError("");
      const { teamProfile: loadedTeamProfile, error } =
        await fetchCurrentUserTeamProfile(user);
      if (!active) return;

      setTeamProfile(loadedTeamProfile);
      setTeamProfileError(error || "");
      setTeamProfileLoading(false);
    };

    loadTeamProfile();

    return () => {
      active = false;
    };
  }, [user]);

  return (
    <div className="tournaments">
      <h1>Tournaments</h1>
      {apiError && <p className="team-required-error">{apiError}</p>}

      {selectedTournament ? (
        <div className="tournament-details">
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
              <div className="detail-grid">
                <p><strong>Organizer:</strong> {selectedTournament.organizer}</p>
                <p><strong>Start:</strong> {formatDateTimeLabel(selectedTournament.startDateTime)}</p>
                <p><strong>Teams:</strong> {selectedTournament.teams}</p>
                <p><strong>Registered:</strong> {selectedTournament.participants.length}/{selectedTournament.teams}</p>
                <p><strong>Prize Pool:</strong> ${selectedTournament.prizePool}</p>
                <p><strong>Game:</strong> {selectedTournament.game}</p>
                <p><strong>Status:</strong> {selectedTournament.status}</p>
                <p><strong>Format:</strong> {selectedTournament.format}</p>
              </div>
            )}

            {activeTab === "rules" && (
              <div className="detail-section">
                <p><strong>Format:</strong> {selectedTournament.format}</p>
                <p>{selectedTournament.rules}</p>
              </div>
            )}

            {activeTab === "participants" && (
              <div className="detail-section">
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
                <input
                  className={formErrors.startDateTime ? "field-error" : ""}
                  type="datetime-local"
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
                <select value={game} onChange={(e) => setGame(e.target.value)}>
                  <option value="Valorant">Valorant</option>
                  <option value="League of Legends">League of Legends</option>
                  <option value="CS2">CS2</option>
                  <option value="Rocket League">Rocket League</option>
                </select>
              </div>

              <div className="input-group">
                <select value={status} onChange={(e) => setStatus(e.target.value)}>
                  <option value="upcoming">Upcoming</option>
                  <option value="live">Live</option>
                  <option value="completed">Completed</option>
                </select>
              </div>

              <div className="input-group">
                <select value={format} onChange={(e) => setFormat(e.target.value)}>
                  <option value="Single Elimination">Single Elimination</option>
                  <option value="Double Elimination">Double Elimination</option>
                  <option value="Round Robin">Round Robin</option>
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
              <option value="completed">Completed</option>
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
                <div className="tournament-image">
                  Image
                </div>

                <div className="tournament-info">
                  <h3>{tournament.name}</h3>
                  <p>{tournament.teams} Teams</p>
                  <p>${tournament.prizePool} Prize Pool</p>
                  <p>{formatDateTimeLabel(tournament.startDateTime)}</p>
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
