import { useEffect, useMemo, useState } from "react";
import "./tournaments.css";

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

  const pageSize = 6;

  const formatDateTimeLabel = (value) => {
    if (!value) return "TBD";
    return new Date(value).toLocaleString();
  };

  const addTournament = () => {
    if (!name || !teams || !prizePool || !organizer || !startDateTime) return;

    const participants = [];
    const standings = [];

    const newTournament = {
      id: Date.now(),
      name,
      teams,
      prizePool,
      organizer,
      startDateTime,
      game,
      status,
      format,
      rules,
      participants,
      standings,
    };

    setTournaments([...tournaments, newTournament]);

    setName("");
    setTeams("");
    setPrizePool("");
    setOrganizer("");
    setStartDateTime("");
    setGame("Valorant");
    setStatus("upcoming");
    setFormat("Single Elimination");
    setRules("Standard competitive rules apply. All matches are Best of 3.");
  };

  const deleteTournament = (id) => {
    setTournaments(tournaments.filter((t) => t.id !== id));
  };

  const updateSelectedTournament = (updatedTournament) => {
    setSelectedTournament(updatedTournament);
    setTournaments((prev) =>
      prev.map((tournament) =>
        tournament.id === updatedTournament.id ? updatedTournament : tournament
      )
    );
  };

  const joinTournament = () => {
    if (!selectedTournament || !user) return;

    const capacity = Number(selectedTournament.teams);
    const participants = selectedTournament.participants || [];

    if (participants.includes(user) || participants.length >= capacity) return;

    const updatedParticipants = [...participants, user];
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

    const participants = selectedTournament.participants || [];
    if (!participants.includes(user)) return;

    const updatedParticipants = participants.filter((participant) => participant !== user);
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

  return (
    <div className="tournaments">
      <h1>Tournaments</h1>

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
                  selectedTournament.participants.includes(user) ? (
                    <button className="leave-btn" onClick={leaveTournament}>
                      Leave Tournament
                    </button>
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
              <input
                type="text"
                placeholder="Tournament Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />

              <input
                type="number"
                placeholder="Number of Teams"
                value={teams}
                onChange={(e) => setTeams(e.target.value)}
              />

              <input
                type="number"
                placeholder="Prize Pool ($)"
                value={prizePool}
                onChange={(e) => setPrizePool(e.target.value)}
              />

              <input
                type="text"
                placeholder="Organizer"
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
              />

              <input
                type="datetime-local"
                value={startDateTime}
                onChange={(e) => setStartDateTime(e.target.value)}
              />

              <select value={game} onChange={(e) => setGame(e.target.value)}>
                <option value="Valorant">Valorant</option>
                <option value="League of Legends">League of Legends</option>
                <option value="CS2">CS2</option>
                <option value="Rocket League">Rocket League</option>
              </select>

              <select value={status} onChange={(e) => setStatus(e.target.value)}>
                <option value="upcoming">Upcoming</option>
                <option value="live">Live</option>
                <option value="completed">Completed</option>
              </select>

              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="Single Elimination">Single Elimination</option>
                <option value="Double Elimination">Double Elimination</option>
                <option value="Round Robin">Round Robin</option>
              </select>

              <input
                type="text"
                placeholder="Rules summary"
                value={rules}
                onChange={(e) => setRules(e.target.value)}
              />

              <button onClick={addTournament}>
                Add Tournament
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
