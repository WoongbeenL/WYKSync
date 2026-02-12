import { useState } from "react";

export default function Tournaments() {

  //save all tournaments
  const [tournaments, setTournaments] = useState([]);

  //save input field value
  const [name, setName] = useState("");
  const [teams, setTeams] = useState("");
  const [prizePool, setPrizePool] = useState("");

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

       {/* Tournament List */}
      <ul>
        {tournaments.length === 0 && (
          <p>No tournaments created yet.</p>
        )}

        {tournaments.map((tournament) => (
          <li key={tournament.id}>
            <strong>{tournament.name}</strong> — 
            {tournament.teams} Teams — 
            ${tournament.prizePool} Prize Pool

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
