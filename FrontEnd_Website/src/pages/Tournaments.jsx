import { useState } from "react";

export default function Tournaments() {

  //save all tournaments
  const [tournaments, setTournaments] = useState([]);

  //save input field value
  const [newTournament, setNewTournament] = useState("");

  // adds new tournament
  const addTournament = () => {
    if (newTournament.trim() === "") return;

    const tournament = {
      id: Date.now(), // unique ID
      name: newTournament
    };

    setTournaments([...tournaments, tournament]);
    setNewTournament(""); // clear input
  };

  // Delete tournament
  const deleteTournament = (id) => {
    const updated = tournaments.filter(t => t.id !== id);
    setTournaments(updated);
  };

  return (
    <div className="tournaments">
      <h1>Tournaments</h1>

      {/* Input n add Button */}
      <div className="tournament-input">
        <input
          type="text"
          placeholder="Enter tournament name"
          value={newTournament}
          onChange={(e) => setNewTournament(e.target.value)}
        />
        <button onClick={addTournament}>
          Add Tournament
        </button>
      </div>

      {/* Tournament List */}
      <ul>
        {tournaments.length === 0 && (
          <p>No tournaments created yet.</p>
        )}

        {tournaments.map((tournament) => (
          <li key={tournament.id}>
            {tournament.name}
            <button
              onClick={() => deleteTournament(tournament.id)}
              style={{ marginLeft: "10px" }}
            >
              Delete
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
