import { useState } from "react";
import "./tournaments.css";

export default function Tournaments({ user }) {
  const [tournaments, setTournaments] = useState([]);
  const [name, setName] = useState("");
  const [teams, setTeams] = useState("");
  const [prizePool, setPrizePool] = useState("");
  const [organizer, setOrganizer] = useState("");
  const [startDateTime, setStartDateTime] = useState("");
  const [format, setFormat] = useState("Single Elimination");
  const [rules, setRules] = useState(
    "Standard competitive rules apply. All matches are Best of 3."
  );
  const [participantsInput, setParticipantsInput] = useState("");
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [activeTab, setActiveTab] = useState("overview");

  const formatDateTimeLabel = (value) => {
    if (!value) return "TBD";
    return new Date(value).toLocaleString();
  };

  const addTournament = () => {
    if (!name || !teams || !prizePool || !organizer || !startDateTime) return;

    const totalTeams = Number(teams);
    const parsedParticipants = participantsInput
      .split(",")
      .map((entry) => entry.trim())
      .filter(Boolean);

    const participants = parsedParticipants.slice(0, totalTeams);

    const standings = participants
      .slice(0, Math.min(4, participants.length))
      .map((team, index) => ({
        rank: index + 1,
        team,
        record: "0-0",
      }));

    const newTournament = {
      id: Date.now(),
      name,
      teams,
      prizePool,
      organizer,
      startDateTime,
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
    setFormat("Single Elimination");
    setRules("Standard competitive rules apply. All matches are Best of 3.");
    setParticipantsInput("");
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

              <select value={format} onChange={(e) => setFormat(e.target.value)}>
                <option value="Single Elimination">Single Elimination</option>
                <option value="Double Elimination">Double Elimination</option>
                <option value="Round Robin">Round Robin</option>
              </select>

              <input
                type="text"
                placeholder="Participants (comma separated)"
                value={participantsInput}
                onChange={(e) => setParticipantsInput(e.target.value)}
              />

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

          <div className="tournament-grid">
            {tournaments.length === 0 && (
              <p>No tournaments created yet.</p>
            )}

            {tournaments.map((tournament) => (
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
        </>
      )}
    </div>
  );
}
