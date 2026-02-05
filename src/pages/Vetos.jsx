// useState allows page to remember values like team names
import { useState } from "react";

export default function Vetos() {
// these store what the user types for team names
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");

  //this stores what mode the user chooses "coin" or "manual"
  const [mode, setMode] = useState(null); 

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
      {mode === "coin" && (
        <p>Coin flip will decide whether {teamA} or {teamB} chooses first.</p>
      )}

     {/* if manual was chosen*/}
      {mode === "manual" && (
        <p>Manually choose which team goes first.</p>
      )}
    </div>
  );
}
