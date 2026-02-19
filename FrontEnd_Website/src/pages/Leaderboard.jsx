import "./leaderboard.css";

const seededMatches = [
  { id: 1, teamA: "Nova", teamB: "Vortex", mapsA: 2, mapsB: 0 },
  { id: 2, teamA: "Echo", teamB: "Blaze", mapsA: 2, mapsB: 1 },
  { id: 3, teamA: "Nova", teamB: "Echo", mapsA: 1, mapsB: 2 },
  { id: 4, teamA: "Titan", teamB: "Vortex", mapsA: 2, mapsB: 1 },
  { id: 5, teamA: "Blaze", teamB: "Titan", mapsA: 0, mapsB: 2 },
  { id: 6, teamA: "Vortex", teamB: "Echo", mapsA: 2, mapsB: 1 },
  { id: 7, teamA: "Nova", teamB: "Blaze", mapsA: 2, mapsB: 1 },
  { id: 8, teamA: "Titan", teamB: "Echo", mapsA: 1, mapsB: 2 },
];

const getTeamLeaderboard = (matches) => {
  const table = {};

  const ensureTeam = (teamName) => {
    if (!table[teamName]) {
      table[teamName] = {
        team: teamName,
        wins: 0,
        losses: 0,
        mapWins: 0,
        mapLosses: 0,
        mapDiff: 0,
        points: 0,
      };
    }
  };

  matches.forEach((match) => {
    const { teamA, teamB, mapsA, mapsB } = match;

    ensureTeam(teamA);
    ensureTeam(teamB);

    table[teamA].mapWins += mapsA;
    table[teamA].mapLosses += mapsB;
    table[teamB].mapWins += mapsB;
    table[teamB].mapLosses += mapsA;

    if (mapsA > mapsB) {
      table[teamA].wins += 1;
      table[teamA].points += 3;
      table[teamB].losses += 1;
    } else if (mapsB > mapsA) {
      table[teamB].wins += 1;
      table[teamB].points += 3;
      table[teamA].losses += 1;
    }
  });

  return Object.values(table)
    .map((row) => ({
      ...row,
      mapDiff: row.mapWins - row.mapLosses,
    }))
    .sort((a, b) => {
      if (b.points !== a.points) return b.points - a.points;
      if (b.mapDiff !== a.mapDiff) return b.mapDiff - a.mapDiff;
      if (b.mapWins !== a.mapWins) return b.mapWins - a.mapWins;
      return a.team.localeCompare(b.team);
    });
};

export default function Leaderboard() {
  const standings = getTeamLeaderboard(seededMatches);

  return (
    <div className="leaderboard-page">
      <h1>Team Leaderboard</h1>
      <p className="leaderboard-subtitle">
        Rankings are based on match results. Win = 3 points.
      </p>

      {standings.length === 0 ? (
        <div className="leaderboard-empty">
          No matches recorded yet. Add results to generate standings.
        </div>
      ) : (
        <div className="leaderboard-table-wrap">
          <table className="leaderboard-table">
            <thead>
              <tr>
                <th>Rank</th>
                <th>Team</th>
                <th>W-L</th>
                <th>Map Diff</th>
                <th>Points</th>
              </tr>
            </thead>
            <tbody>
              {standings.map((team, index) => (
                <tr key={team.team}>
                  <td>{index + 1}</td>
                  <td>{team.team}</td>
                  <td>
                    {team.wins}-{team.losses}
                  </td>
                  <td>{team.mapDiff > 0 ? `+${team.mapDiff}` : team.mapDiff}</td>
                  <td>{team.points}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
