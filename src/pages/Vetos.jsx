// useState allows page to remember values like team names
import { useState } from "react";

export default function Vetos() {
// these store what the user types for team names
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");

  //this stores what mode the user chooses "coin" or "manual"
  const [mode, setMode] = useState(null); 

  const [coinWinner, setCoinWinner] = useState(null);
  const [team1, setTeam1] = useState(null);
  const [team2, setTeam2] = useState(null);

  // Runs when the Coin Flip button is pressed
  const runCoinFlip = () => {
    const winner = Math.random() < 0.5 ? teamA : teamB;
    setCoinWinner(winner);
  };

  // Winner chooses which team number they want
  const chooseTeam = (choice) => {
    if (choice === "team1") {
      setTeam1(coinWinner);
      setTeam2(coinWinner === teamA ? teamB : teamA);
    } else {
      setTeam2(coinWinner);
      setTeam1(coinWinner === teamA ? teamB : teamA);
    }
  };

  return (
    <div className="vetos">
      <h1>Map Vetos</h1>
      <p>
        Enter both team names to begin the veto process.
      </p>

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
        <div>
          <h3>Final Teams</h3>
          <p>Team 1: {team1}</p>
          <p>Team 2: {team2}</p>
        </div>
      )}

     {/* if manual was chosen*/}
      {mode === "manual" && (
        <p>Manually choose which team goes first.</p>
      )}
    </div>
  );
}
