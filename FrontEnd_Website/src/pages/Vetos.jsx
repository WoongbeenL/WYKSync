import "./vetos.css";
// useState allows page to remember values like team names
import { useEffect, useMemo, useState } from "react";

//TODO: Add a link for each team to do map vetos along with spectators or find a different way to differentiate it.
const ALL_MAPS = [
  "Corrode",
  "Abyss",
  "Sunset",
  "Lotus",
  "Pearl",
  "Fracture",
  "Breeze",
  "Icebox",
  "Ascent",
  "Haven",
  "Bind",
  "Split",
];
const COMPETITIVE_MAPS = ["Ascent", "Bind", "Haven", "Split", "Lotus", "Sunset", "Icebox"];
const SIDE_OPTIONS = ["Attack", "Defense"];

const getInitialMapStates = () =>
  ALL_MAPS.reduce((acc, map) => {
    acc[map] = {
      status: "available",
      by: null,
      mapNumber: null,
      side: null,
      sideBy: null,
    };
    return acc;
  }, {});

const getActiveMapPool = (poolKey) => {
  if (poolKey === "all") return ALL_MAPS;
  if (poolKey === "comp") return COMPETITIVE_MAPS;
  // TODO: Replace with selected custom map set when custom pool is implemented.
  return COMPETITIVE_MAPS;
};

const getActionPlan = (format, firstTeam, secondTeam, mapCount, poolKey) => {
  if (!firstTeam || !secondTeam) return [];
  const appendBansUntilDecider = (baseActions) => {
    if (poolKey !== "all") return baseActions;

    const removedByBase = baseActions.filter(
      (action) => action.type === "ban" || action.type === "pick"
    ).length;
    const remainingAfterBase = mapCount - removedByBase;
    const extraBansNeeded = Math.max(0, remainingAfterBase - 1);
    const baseBanCount = baseActions.filter((action) => action.type === "ban").length;

    const extraBans = Array.from({ length: extraBansNeeded }, (_, index) => {
      const team = (baseBanCount + index) % 2 === 0 ? firstTeam : secondTeam;
      return { type: "ban", team, label: `${team} bans one map.` };
    });

    return [...baseActions, ...extraBans];
  };

  if (format === "bo3") {
    return appendBansUntilDecider([
      { type: "ban", team: firstTeam, label: `${firstTeam} bans one map.` },
      { type: "ban", team: secondTeam, label: `${secondTeam} bans one map.` },
      { type: "pick", team: firstTeam, mapNumber: 1, label: `${firstTeam} picks Map 1.` },
      { type: "side", team: secondTeam, mapNumber: 1, label: `${secondTeam} picks side for Map 1.` },
      { type: "pick", team: secondTeam, mapNumber: 2, label: `${secondTeam} picks Map 2.` },
      { type: "side", team: firstTeam, mapNumber: 2, label: `${firstTeam} picks side for Map 2.` },
      { type: "ban", team: firstTeam, label: `${firstTeam} bans one map.` },
      { type: "ban", team: secondTeam, label: `${secondTeam} bans one map.` },
    ]);
  }

  if (format === "bo5") {
    return appendBansUntilDecider([
      { type: "ban", team: firstTeam, label: `${firstTeam} bans one map.` },
      { type: "ban", team: secondTeam, label: `${secondTeam} bans one map.` },
      { type: "pick", team: firstTeam, mapNumber: 1, label: `${firstTeam} picks Map 1.` },
      { type: "side", team: secondTeam, mapNumber: 1, label: `${secondTeam} picks side for Map 1.` },
      { type: "pick", team: secondTeam, mapNumber: 2, label: `${secondTeam} picks Map 2.` },
      { type: "side", team: firstTeam, mapNumber: 2, label: `${firstTeam} picks side for Map 2.` },
      { type: "pick", team: firstTeam, mapNumber: 3, label: `${firstTeam} picks Map 3.` },
      { type: "side", team: secondTeam, mapNumber: 3, label: `${secondTeam} picks side for Map 3.` },
      { type: "pick", team: secondTeam, mapNumber: 4, label: `${secondTeam} picks Map 4.` },
      { type: "side", team: firstTeam, mapNumber: 4, label: `${firstTeam} picks side for Map 4.` },
    ]);
  }

  // BO1 and custom default to alternating bans until one map remains.
  return Array.from({ length: Math.max(0, mapCount - 1) }, (_, index) => {
    const team = index % 2 === 0 ? firstTeam : secondTeam;
    return { type: "ban", team, label: `${team} bans one map.` };
  });
};

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
  const [selectedMapPool, setSelectedMapPool] = useState("all");
  const [selectedVeto, setSelectedVeto] = useState("bo1");
  const [actingAs, setActingAs] = useState("spectator");
  const [mapStates, setMapStates] = useState(getInitialMapStates);
  const [actionHistory, setActionHistory] = useState([]);
  const [pickedMaps, setPickedMaps] = useState([]);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [deciderMap, setDeciderMap] = useState(null);
  const activeMaps = useMemo(
    () => getActiveMapPool(selectedMapPool),
    [selectedMapPool]
  );

  const actionPlan = useMemo(
    () => getActionPlan(selectedVeto, team1, team2, activeMaps.length, selectedMapPool),
    [selectedVeto, team1, team2, activeMaps.length, selectedMapPool]
  );
  const currentAction = actionPlan[currentStepIndex] || null;
  const availableMaps = activeMaps.filter(
    (map) => (mapStates[map]?.status || "available") === "available"
  );
  const vetoComplete = team1 && team2 && !currentAction;

  // Runs when the Coin Flip button is pressed
  const runCoinFlip = () => {
    const winner = Math.random() < 0.5 ? teamA : teamB;
    setCoinWinner(winner);
  };

  //Handle the change event to update the state
  const handleChange = (event) => {
    setSelectedMapPool(event.target.value);
  };

   //Handle the change event to update the state
  const vetoPick = (event) => {
    setSelectedVeto(event.target.value);
  };

  const resetVetoProgress = () => {
    setActingAs("spectator");
    setActionHistory([]);
    setPickedMaps([]);
    setCurrentStepIndex(0);
    setDeciderMap(null);
    setMapStates(getInitialMapStates());
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
    resetVetoProgress();
  };

  const startManualOrder = (firstTeam) => {
    const secondTeam = firstTeam === teamA ? teamB : teamA;
    setTeam1(firstTeam);
    setTeam2(secondTeam);
    setCoinWinner(null);
    resetVetoProgress();
  };

  useEffect(() => {
    if (team1 && team2) {
      resetVetoProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVeto, selectedMapPool]);

  const finishIfNeeded = (nextMapStates, nextStepIndex) => {
    if (nextStepIndex < actionPlan.length) return;

    const remainingMaps = activeMaps.filter(
      (map) => (nextMapStates[map]?.status || "available") === "available"
    );
    if (remainingMaps.length === 1) {
      const finalMap = remainingMaps[0];
      setDeciderMap(finalMap);
      nextMapStates[finalMap] = {
        ...nextMapStates[finalMap],
        status: "decider",
      };
    }
  };

  const handleMapAction = (mapName) => {
    if (!team1 || !team2 || vetoComplete || !currentAction) return;

    const actingTeamName =
      actingAs === "team1" ? team1 : actingAs === "team2" ? team2 : null;

    if (!actingTeamName || actingTeamName !== currentAction.team) return;
    if (currentAction.type !== "ban" && currentAction.type !== "pick") return;
    if ((mapStates[mapName]?.status || "available") !== "available") return;

    const nextStepIndex = currentStepIndex + 1;
    const nextMapStates = { ...mapStates };
    const nextHistory = [...actionHistory];
    const nextPicked = [...pickedMaps];

    if (currentAction.type === "ban") {
      nextMapStates[mapName] = {
        ...nextMapStates[mapName],
        status: "banned",
        by: currentAction.team,
      };
      nextHistory.push({
        team: currentAction.team,
        action: "banned",
        detail: mapName,
      });
    } else {
      nextMapStates[mapName] = {
        ...nextMapStates[mapName],
        status: "picked",
        by: currentAction.team,
        mapNumber: currentAction.mapNumber,
      };
      nextPicked.push({
        map: mapName,
        mapNumber: currentAction.mapNumber,
        pickedBy: currentAction.team,
        side: null,
        sideBy: null,
      });
      nextHistory.push({
        team: currentAction.team,
        action: "picked",
        detail: `Map ${currentAction.mapNumber}: ${mapName}`,
      });
    }

    finishIfNeeded(nextMapStates, nextStepIndex);
    setMapStates(nextMapStates);
    setPickedMaps(nextPicked);
    setActionHistory(nextHistory);
    setCurrentStepIndex(nextStepIndex);
  };

  const handleSidePick = (sideChoice) => {
    if (!team1 || !team2 || vetoComplete || !currentAction) return;
    if (currentAction.type !== "side") return;

    const actingTeamName =
      actingAs === "team1" ? team1 : actingAs === "team2" ? team2 : null;
    if (!actingTeamName || actingTeamName !== currentAction.team) return;

    const targetMap = pickedMaps.find(
      (entry) => entry.mapNumber === currentAction.mapNumber
    );
    if (!targetMap) return;

    const nextStepIndex = currentStepIndex + 1;
    const nextMapStates = {
      ...mapStates,
      [targetMap.map]: {
        ...mapStates[targetMap.map],
        side: sideChoice,
        sideBy: currentAction.team,
      },
    };
    const nextPicked = pickedMaps.map((entry) =>
      entry.mapNumber === currentAction.mapNumber
        ? { ...entry, side: sideChoice, sideBy: currentAction.team }
        : entry
    );
    const nextHistory = [
      ...actionHistory,
      {
        team: currentAction.team,
        action: "chose side",
        detail: `Map ${currentAction.mapNumber}: ${sideChoice}`,
      },
    ];

    finishIfNeeded(nextMapStates, nextStepIndex);
    setMapStates(nextMapStates);
    setPickedMaps(nextPicked);
    setActionHistory(nextHistory);
    setCurrentStepIndex(nextStepIndex);
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
          {!vetoComplete && currentAction && (
            <p>
              Current action: <strong>{currentAction.label}</strong>
            </p>
          )}
          {vetoComplete && (
            <p>
              Veto complete. Final map: {deciderMap || availableMaps.join(", ")}
            </p>
          )}
          </>
          <>
          {activeMaps.map((map) => {
            const mapState = mapStates[map] || {
              status: "available",
              by: null,
              mapNumber: null,
            };
            const actingTeamName =
              actingAs === "team1" ? team1 : actingAs === "team2" ? team2 : null;
            const isMapStep =
              currentAction && (currentAction.type === "ban" || currentAction.type === "pick");
            const isLocked =
              vetoComplete ||
              !isMapStep ||
              !actingTeamName ||
              actingTeamName !== currentAction.team;
            const isBanned = mapState.status === "banned";
            const isPicked = mapState.status === "picked";
            const isDecider = mapState.status === "decider";
            return (
              <button
                key={map}
                onClick={() => handleMapAction(map)}
                disabled={isLocked || isBanned || isPicked || isDecider}
                className={
                  isBanned
                    ? "map-btn banned"
                    : isPicked
                      ? "map-btn picked"
                      : isDecider
                        ? "map-btn decider"
                        : "map-btn available"
                }
                title={
                  isBanned
                    ? `Banned by ${mapState.by}`
                    : isPicked
                      ? `Picked by ${mapState.by} (Map ${mapState.mapNumber})`
                      : isDecider
                        ? "Final decider map"
                        : isLocked
                          ? "Not your turn"
                          : currentAction?.type === "pick"
                            ? `Pick ${map}`
                            : `Ban ${map}`
                }
              >
                {map}
                {isPicked && ` (Map ${mapState.mapNumber})`}
                {isDecider && " (Decider)"}
              </button>
            );
          })}
          </>
          {currentAction?.type === "side" && (
            <div className="side-picker">
              <p>{currentAction.label}</p>
              {SIDE_OPTIONS.map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => handleSidePick(side)}
                >
                  {side}
                </button>
              ))}
            </div>
          )}

          {pickedMaps.length > 0 && (
            <div className="picked-maps">
              <h4>Map Picks</h4>
              {pickedMaps
                .slice()
                .sort((a, b) => a.mapNumber - b.mapNumber)
                .map((entry) => (
                  <p key={`${entry.map}-${entry.mapNumber}`}>
                    Map {entry.mapNumber}: {entry.map} (picked by {entry.pickedBy})
                    {entry.side ? `, side by ${entry.sideBy}: ${entry.side}` : ""}
                  </p>
                ))}
            </div>
          )}

          {actionHistory.length > 0 && (
            <div className="ban-history">
              <h4>Veto Log</h4>
              <div className="veto-log-chat">
                {actionHistory.map((entry, index) => (
                  <p className="veto-log-message" key={`${entry.team}-${entry.action}-${entry.detail}-${index}`}>
                    {index + 1}. {entry.team} {entry.action} {entry.detail}
                  </p>
                ))}
              </div>
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
