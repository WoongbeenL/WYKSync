import "./vetoes.css";
// This page is the map veto tool, so most of the logic is about turn order and map state.
import { useEffect, useMemo, useState } from "react";

//TODO: Add a link for each team to do map vetoes along with spectators or find a different way to differentiate it.
// Full map pool list for when the user wants every map available.
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
// Competitive pool is the smaller set used for standard matches.
const COMPETITIVE_MAPS = ["Ascent", "Bind", "Haven", "Split", "Lotus", "Sunset", "Icebox"];
const SIDE_OPTIONS = ["Attack", "Defense"];
// This builds the image path for each map card.
const MAP_IMAGE_FILENAMES = ALL_MAPS.reduce((acc, map) => {
  acc[map] = `/maps/${map.toLowerCase()}.jpg`;
  return acc;
}, {});

// If a map image is missing, this SVG fallback keeps the card from looking broken.
const getFallbackMapImage = (mapName) =>
  `data:image/svg+xml;utf8,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="1200"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stop-color="#231f20"/><stop offset="100%" stop-color="#111"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" fill="#ff4655" font-size="92" text-anchor="middle" dominant-baseline="middle" font-family="Arial, Helvetica, sans-serif">${mapName}</text></svg>`
  )}`;

// Every map starts out available with no team attached to it yet.
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

// Chooses which pool of maps should be active based on the dropdown.
const getActiveMapPool = (poolKey) => {
  if (poolKey === "all") return ALL_MAPS;
  if (poolKey === "comp") return COMPETITIVE_MAPS;
  // TODO: Replace with selected custom map set when custom pool is implemented.
  return COMPETITIVE_MAPS;
};

// Builds the step-by-step veto order depending on BO1, BO3, BO5, etc.
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

export default function Vetoes() {
// These store what the user types for team names.
  const [teamA, setTeamA] = useState("");
  const [teamB, setTeamB] = useState("");

  // This stores whether the team order is decided by coin flip or manually.
  const [mode, setMode] = useState(null); 

  const [coinWinner, setCoinWinner] = useState(null);
  const [team1, setTeam1] = useState(null);
  const [team2, setTeam2] = useState(null);
  const [teamInputErrors, setTeamInputErrors] = useState({});

  // These control the current veto settings and progress.
  const [selectedMapPool, setSelectedMapPool] = useState("comp");
  const [selectedVeto, setSelectedVeto] = useState("bo3");
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

  // Runs when the Coin Flip button is pressed.
  const runCoinFlip = () => {
    if (!validateTeamInputs()) return;
    const winner = Math.random() < 0.5 ? teamA : teamB;
    setCoinWinner(winner);
  };

  // Updates the map pool dropdown choice.
  const handleChange = (event) => {
    setSelectedMapPool(event.target.value);
  };

   // Updates the veto format dropdown choice.
  const vetoPick = (event) => {
    setSelectedVeto(event.target.value);
  };

  // Resets the current veto progress but keeps the chosen teams and settings.
  const resetVetoProgress = () => {
    setActingAs("spectator");
    setActionHistory([]);
    setPickedMaps([]);
    setCurrentStepIndex(0);
    setDeciderMap(null);
    setMapStates(getInitialMapStates());
  };

  // Basic validation so the veto flow does not start with missing or duplicate team names.
  const validateTeamInputs = () => {
    const errors = {};
    const trimmedTeamA = teamA.trim();
    const trimmedTeamB = teamB.trim();

    if (!trimmedTeamA) {
      errors.teamA = "Team A name is required.";
    }
    if (!trimmedTeamB) {
      errors.teamB = "Team B name is required.";
    }
    if (trimmedTeamA && trimmedTeamB && trimmedTeamA.toLowerCase() === trimmedTeamB.toLowerCase()) {
      errors.general = "Team names must be different.";
    }

    setTeamInputErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Clears the specific field error when the user starts typing again.
  const clearTeamInputError = (field) => {
    setTeamInputErrors((prev) => {
      const next = { ...prev };
      delete next[field];
      delete next.general;
      return next;
    });
  };

  // The coin flip winner chooses whether they want to be Team 1 or Team 2.
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

  // Manual mode skips the coin flip and just assigns the order directly.
  const startManualOrder = (firstTeam) => {
    if (!validateTeamInputs()) return;
    const secondTeam = firstTeam === teamA ? teamB : teamA;
    setTeam1(firstTeam);
    setTeam2(secondTeam);
    setCoinWinner(null);
    resetVetoProgress();
  };

  useEffect(() => {
    // If the format or map pool changes, the current veto progress should restart.
    if (team1 && team2) {
      resetVetoProgress();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedVeto, selectedMapPool]);

  // Once all planned actions are done, this checks whether we can mark a decider map.
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

  // Handles clicking a map card for bans and picks.
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

  // Handles the side selection step after a map is chosen.
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
    <div className="vetoes">
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
          {/*TODO: Add functionality to modify the way vetoes go depending on this choice.*/}
          <option value="bo1">Best of 1</option>
          <option value="bo3">Best of 3</option>
          <option value="bo5">Best of 5</option>
          <option value="custom">Custom</option>
        </select>
      </label>
      </div>

      <div className="title_n_paragraph">
        <h1>Map Vetoes</h1>
        <p>
          Enter both team names to begin the veto process.
        </p>
      </div>

    {/*TODO: Replace with login needed to continue. */}
      {/* Team input area starts the whole veto flow. */}
      <div className="team-inputs">
        <div className="team-input-group">
          <input
            className={teamInputErrors.teamA ? "field-error" : ""}
            type="text"
            placeholder="Team A Name"
            value={teamA}
            onChange={(e) => {
              setTeamA(e.target.value);
              clearTeamInputError("teamA");
            }}
          />
          {teamInputErrors.teamA && <p className="input-error-text">{teamInputErrors.teamA}</p>}
        </div>
        <div className="team-input-group">
          <input
            className={teamInputErrors.teamB ? "field-error" : ""}
            type="text"
            placeholder="Team B Name"
            value={teamB}
            onChange={(e) => {
              setTeamB(e.target.value);
              clearTeamInputError("teamB");
            }}
          />
          {teamInputErrors.teamB && <p className="input-error-text">{teamInputErrors.teamB}</p>}
        </div>
      </div>
      {teamInputErrors.general && <p className="input-error-text">{teamInputErrors.general}</p>}

      {/* User picks how team order should be decided. */}
      {!mode && (
        <div className="decider-buttons">
          <button
            className="flow-btn"
            onClick={() => {
              if (!validateTeamInputs()) return;
              setMode("coin");
            }}
          >
            Coin Flip
          </button>
          <button
            className="flow-btn"
            onClick={() => {
              if (!validateTeamInputs()) return;
              setMode("manual");
            }}
          >
            Manual Team Order
          </button>
        </div>
      )}

      {/* If coin flip mode was picked, show the flip button first. */}
      {mode === "coin" && !coinWinner && (
        <button className="flow-btn" onClick={runCoinFlip}>Flip Coin</button>
        )}

      {/* Once there is a winner, let them choose team order. */}
      {coinWinner && !team1 && (
        <>
          <p>{coinWinner} won the coin flip!</p>
          <p>Choose your team:</p>

          <button className="flow-btn" onClick={() => chooseTeam("team1")}>
            Be Team 1
          </button>

          <button className="flow-btn" onClick={() => chooseTeam("team2")}>
            Be Team 2
          </button>
        </>
      )}
      {/* Main veto interface after both team slots are set. */}
      {team1 && team2 && (
        <div className='final'>
          <>
          <h3>Final Teams</h3>
          <p>Team 1: {team1} | Team 2: {team2}</p>
          <label className="acting-role">
            <span>You are:</span>
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
          {selectedVeto === "bo3" && !vetoComplete && (
            <p>Map 3 (Decider): TBD</p>
          )}
          {vetoComplete && (
            <p>
              {selectedVeto === "bo3"
                ? `Veto complete. Map 3 (Decider): ${deciderMap || "TBD"}`
                : `Veto complete. Final map: ${deciderMap || availableMaps.join(", ")}`}
            </p>
          )}
          </>
          <>
          {/* Map cards act like the main control surface for bans and picks. */}
          <div className={`map-grid ${selectedMapPool === "all" ? "map-grid-square" : "map-grid-vertical"}`}>
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
                <img
                  className="map-btn-image"
                  src={MAP_IMAGE_FILENAMES[map]}
                  alt={`${map} map`}
                  loading="lazy"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = getFallbackMapImage(map);
                  }}
                />
                {isPicked && (
                  <span className="map-btn-status map-btn-status-picked">
                    Map {mapState.mapNumber}
                  </span>
                )}
                {isDecider && (
                  <span className="map-btn-status map-btn-status-decider">
                    Decider
                  </span>
                )}
                <span className="map-btn-label">
                  {map}
                  {isPicked && ` (Map ${mapState.mapNumber})`}
                  {isDecider && " (Decider)"}
                </span>
              </button>
            );
          })}
          </div>
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
              {selectedVeto === "bo3" && (
                <p>Map 3 (Decider): {deciderMap || "TBD"}</p>
              )}
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

     {/* Manual mode buttons only show if that flow was selected. */}
      {mode === "manual" && (
        <div className="manual-order">
          <p>Manually choose which team goes first.</p>
          <button className="flow-btn" onClick={() => startManualOrder(teamA)}>{teamA} goes first</button>
          <button className="flow-btn" onClick={() => startManualOrder(teamB)}>{teamB} goes first</button>
        </div>
      )}
    </div>
  );
}
