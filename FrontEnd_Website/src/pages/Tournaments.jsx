import { useState } from "react";
import "./tournaments.css";

export default function Tournaments() {

  //save all tournaments
  const [tournaments, setTournaments] = useState([]);

  //save input field value
  const [name, setName] = useState("");
  const [teams, setTeams] = useState("");
  const [prizePool, setPrizePool] = useState("");

  // track which tournament is currently open
  const [selectedTournament, setSelectedTournament] = useState(null);

  // adds new tournament
  const addTournament = () => {
    if (!name || !teams || !prizePool) return;

    const newTournament = {
      id: Date.now(), // unique ID
      name: name,
      teams: teams,
      prizePool: prizePool
    };

    setTournaments([...tournaments, newTournament]);

    // clear input
    setName("");
    setTeams("");
    setPrizePool("");
  };

  //Delete tournament
  const deleteTournament = (id) => {
    setTournaments(tournaments.filter(t => t.id !== id));
  };

  return (
    <div className="tournaments">
      <h1>Tournaments</h1>

      {/* If a tournament is selected, show details page */}
      {selectedTournament ? (
        <div className="tournament-details">

          <h2>{selectedTournament.name}</h2>
          <p><strong>Teams:</strong> {selectedTournament.teams}</p>
          <p><strong>Prize Pool:</strong> ${selectedTournament.prizePool}</p>

          <button onClick={() => setSelectedTournament(null)}>
            Back to Tournaments
          </button>

        </div>
      ) : (
        <>
          {/* Input n add Button */}
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

            <button onClick={addTournament}>
              Add Tournament
            </button>

          </div>

          {/* Tournament Grid */}
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
                {/* Image Placeholder */}
                <div className="tournament-image">
                  Image
                </div>

                {/* Tournament Info */}
                <div className="tournament-info">
                  <h3>{tournament.name}</h3>
                  <p>{tournament.teams} Teams</p>
                  <p>${tournament.prizePool} Prize Pool</p>
                </div>

                {/* Delete Button */}
                <button
                  className="delete-btn"
                  onClick={(e) => {
                    e.stopPropagation(); // prevents card click
                    deleteTournament(tournament.id);
                  }}
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
