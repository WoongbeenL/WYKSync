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
  // track which tab is active in details view
  const [activeTab, setActiveTab] = useState("about");


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
      <button className="back-btn" onClick={() => {setSelectedTournament(null);setActiveTab("about");}}>
        Back to Tournaments
      </button>
      <h2>{selectedTournament.name}</h2>

      {/* Tabs */}
      <div className="tournament-tabs">
        <button
          className={activeTab === "about" ? "active" : ""}
          onClick={() => setActiveTab("about")}
        >
          About
        </button>

        <button
          className={activeTab === "rules" ? "active" : ""}
          onClick={() => setActiveTab("rules")}
        >
          Rules
        </button>

        <button
          className={activeTab === "prizes" ? "active" : ""}
          onClick={() => setActiveTab("prizes")}
        >
          Prizes
        </button>

        <button
          className={activeTab === "schedule" ? "active" : ""}
          onClick={() => setActiveTab("schedule")}
        >
          Schedule
        </button>
      </div>

  {/* Tab Content */}
  <div className="tournament-content">

    {activeTab === "about" && (
      <>
        <p><strong>Teams:</strong> {selectedTournament.teams}</p>
        <p><strong>Prize Pool:</strong> ${selectedTournament.prizePool}</p>
        <p>This tournament is part of the WYKSync competitive series.</p>
      </>
    )}

    {activeTab === "rules" && (
      <>
        <p>• Standard Valorant competitive rules apply.</p>
        <p>• All matches are Best of 3.</p>
        <p>• Overtime enabled.</p>
      </>
    )}

    {activeTab === "prizes" && (
      <>
        <p>1st Place: 60%</p>
        <p>2nd Place: 30%</p>
        <p>3rd Place: 10%</p>
      </>
    )}

    {activeTab === "schedule" && (
      <>
        <p>Group Stage: TBD</p>
        <p>Playoffs: TBD</p>
        <p>Grand Finals: TBD</p>
      </>
    )}

  </div>

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
