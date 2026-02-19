import "./vetos.css";
// useState allows page to remember values like team names
import { useState } from "react";

//TODO: Add a link for each team to do map vetos along with spectators or find a different way to differentiate it.
const ALL_MAPS = ["Ascent", "Bind", "Haven", "Split", "Lotus", "Sunset", "Icebox"];

export default function Vetos() {
// these store what the user types for team names
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");

  //this stores what mode the user chooses "coin" or "manual"
  const [mode, setMode] = useState(null); 

  const [coinWinner, setCoinWinner] = useState(null);
  const [team1, setTeam1] = useState(null);
  const [team2, setTeam2] = useState(null);

  //initiallized state for selected value
  const[selectedMapPool, setSelectedMapPool] = useState("all");
  const [selectedVeto, setSelectedVeto] = useState("bo1");
  const [currentTurn, setCurrentTurn] = useState(null);
  const [actingAs, setActingAs] = useState("spectator");
  const [mapStates, setMapStates] = useState({});
  const [banHistory, setBanHistory] = useState([]);

  // Runs when the Coin Flip button is pressed
  const runCoinFlip = () => {
    const winner = Math.random() < 0.5 ? teamA : teamB;
    setCoinWinner(winner);
  };

  //Handle the change event to update the state
  const handleChange = (event) => {
    setSelectedMapPool(event.target.value);
  }

   //Handle the change event to update the state
  const vetoPick = (event) => {
    setSelectedVeto(event.target.value);
  }

  // Winner chooses which team number they want
  const chooseTeam = (choice) => {
    if (choice === "team1") {
      setTeam1(coinWinner);
      setTeam2(coinWinner === teamA ? teamB : teamA);
    } else {
      setTeam2(coinWinner);
      setTeam1(coinWinner === teamA ? teamB : teamA);
    }
    setCurrentTurn(coinWinner);
    setActingAs("spectator");
    setBanHistory([]);
    setMapStates(
      ALL_MAPS.reduce((acc, map) => {
        acc[map] = { status: "available", by: null };
        return acc;
      }, {})
    );
  };

  const startManualOrder = (firstTeam) => {
    const secondTeam = firstTeam === teamA ? teamB : teamA;
    setTeam1(firstTeam);
    setTeam2(secondTeam);
    setCurrentTurn(firstTeam);
    setCoinWinner(null);
    setActingAs("spectator");
    setBanHistory([]);
    setMapStates(
      ALL_MAPS.reduce((acc, map) => {
        acc[map] = { status: "available", by: null };
        return acc;
      }, {})
    );
  };

  const targetRemainingByVeto = {
    bo1: 1,
    bo3: 3,
    bo5: 5,
    custom: 1,
  };

  const targetRemaining = targetRemainingByVeto[selectedVeto] || 1;
  const availableMaps = ALL_MAPS.filter((map) => (mapStates[map]?.status || "available") === "available");
  const vetoComplete = team1 && team2 && availableMaps.length <= targetRemaining;

  const handleBanMap = (mapName) => {
    if (!team1 || !team2 || vetoComplete) return;

    const actingTeamName =
      actingAs === "team1" ? team1 : actingAs === "team2" ? team2 : null;

    if (!actingTeamName || actingTeamName !== currentTurn) return;
    if ((mapStates[mapName]?.status || "available") !== "available") return;

    const nextMapStates = {
      ...mapStates,
      [mapName]: { status: "banned", by: currentTurn },
    };
    const nextAvailableCount = ALL_MAPS.filter(
      (map) => (nextMapStates[map]?.status || "available") === "available"
    ).length;

    setMapStates(nextMapStates);
    setBanHistory((prev) => [...prev, { team: currentTurn, map: mapName }]);

    if (nextAvailableCount <= targetRemaining) {
      setCurrentTurn(null);
      return;
    }

    setCurrentTurn(currentTurn === team1 ? team2 : team1);
  };

  return (
    <div className="vetos">
      <div className="dropdown_menus">
         <label>
        Pick a Map Pool:
        <select value={selectedMapPool} onChange={handleChange}>
          <option value="all">All Maps</option>
          <option value="comp">Competitive Pool</option>
          {/*TODO: Add functionality to be given a checklist for custom*/}
          <option value="custom">Custom</option>
        </select>
      </label>
       <label>
        Pick a Map Veto:
        <select value={selectedVeto} onChange={vetoPick}>
          {/*TODO: Add functionality to modify the way vetos go depending on this choice.*/}
          <option value="bo1">Best of 1</option>
          <option value="bo3">Best of 3</option>
          <option value="bo5">Best of 5</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      </div>

      <div className="title_n_paragraph">
        <h1>Map Vetos</h1>
        <p>
          Enter both team names to begin the veto process.
        </p>
      </div>

    {/*TODO: Replace with login needed to continue. */}
      {/* Team Inputs */}
      <div className="team-inputs">
        <input
          type="text"
          placeholder="Team A Name"
          value={teamA}
          onChange={(e) => setTeamA(e.target.value)}
        />
        <input
          type="text"
          placeholder="Team B Name"
          value={teamB}
          onChange={(e) => setTeamB(e.target.value)}
        />
      </div>

      {/* Only show buttons once both teams exist */}
      {teamA && teamB && !mode && (
        <div className="decider-buttons">
          <button onClick={() => setMode("coin")}>Coin Flip</button>
          <button onClick={() => setMode("manual")}>Manual Team Order</button>
        </div>
      )}

      {/* if coin was chosen*/}
      {mode === "coin" && !coinWinner && (
        <button onClick={runCoinFlip}>Flip Coin</button>
        )}

      {/* Show winner */}
      {coinWinner && !team1 && (
        <>
          <p>{coinWinner} won the coin flip!</p>
          <p>Choose your team:</p>

          <button onClick={() => chooseTeam("team1")}>
            Be Team 1
          </button>

          <button onClick={() => chooseTeam("team2")}>
            Be Team 2
          </button>
        </>
      )}
      {/* Final result */}
      {/* TODO: Add Logic to Map Bans Need to Add Map Pool Feature ability to pick what maps are in rotation (7 maps). Then what Type of Vetos BO1, BO3, BO5.*/}
      {team1 && team2 && (
        <div className='final'>
          <>
          <h3>Final Teams</h3>
          <p>Team 1: {team1}</p>
          <p>Team 2: {team2}</p>
          <label>
            You are:
            <select value={actingAs} onChange={(e) => setActingAs(e.target.value)}>
              <option value="spectator">Spectator</option>
              <option value="team1">{team1}</option>
              <option value="team2">{team2}</option>
            </select>
          </label>
          {!vetoComplete && <p>Current turn: {currentTurn || "None"}</p>}
          {vetoComplete && (
            <p>
              Veto complete. Remaining map(s): {availableMaps.join(", ")}
            </p>
          )}
          </>
          <>
          {ALL_MAPS.map((map) => {
            const mapState = mapStates[map] || { status: "available", by: null };
            const actingTeamName =
              actingAs === "team1" ? team1 : actingAs === "team2" ? team2 : null;
            const isLocked = vetoComplete || !actingTeamName || actingTeamName !== currentTurn;
            const isBanned = mapState.status === "banned";
            return (
              <button
                key={map}
                onClick={() => handleBanMap(map)}
                disabled={isLocked || isBanned}
                className={isBanned ? "map-btn banned" : "map-btn available"}
                title={
                  isBanned
                    ? `Banned by ${mapState.by}`
                    : isLocked
                      ? "Not your turn"
                      : `Ban ${map}`
                }
              >
                {map}
              </button>
            );
          })}
          </>
          {banHistory.length > 0 && (
            <div className="ban-history">
              <h4>Ban Order</h4>
              {banHistory.map((entry, index) => (
                <p key={`${entry.map}-${index}`}>
                  {index + 1}. {entry.team} banned {entry.map}
                </p>
              ))}
            </div>
          )}
        </div>
      )}

     {/* if manual was chosen*/}
      {mode === "manual" && (
        <div className="manual-order">
          <p>Manually choose which team goes first.</p>
          <button onClick={() => startManualOrder(teamA)}>{teamA} goes first</button>
          <button onClick={() => startManualOrder(teamB)}>{teamB} goes first</button>
        </div>
      )}
    </div>
  );
}
