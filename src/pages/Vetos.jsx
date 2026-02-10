import "./vetos.css";
// useState allows page to remember values like team names
import { useState } from "react";

//TODO: Add a link for each team to do map vetos along with spectators or find a different way to differentiate it.

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
  const[selectedMapPool, setSelectedMapPool] = useState(null);
  const [selectedVeto, setSelectedVeto] = useState(null);

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
          </>
          <>
          <button>map1</button>
          <button>map2</button>
          <button>map3</button>
          <button>map4</button>
          <button>map5</button>
          <button>map6</button>
          <button>map7</button>
          </>
        </div>
      )}

     {/* if manual was chosen*/}
      {mode === "manual" && (
        <p>Manually choose which team goes first.</p>
      )}
    </div>
  );
}
