const getStorageKey = (userIdentifier) =>
  `wyksync_team_profile:${String(userIdentifier || "guest").toLowerCase()}`;

export const fetchCurrentUserTeamProfile = async (userIdentifier) => {
  if (!userIdentifier) {
    return { teamProfile: null, error: "You must be logged in." };
  }

  try {
    const raw = localStorage.getItem(getStorageKey(userIdentifier));
    if (!raw) return { teamProfile: null, error: null };
    const parsed = JSON.parse(raw);

    if (!parsed?.teamName) return { teamProfile: null, error: null };
    return {
      teamProfile: {
        teamId: parsed.teamId || null,
        teamName: parsed.teamName,
        joinCode: parsed.joinCode || "",
        role: parsed.role || "captain",
      },
      error: null,
    };
  } catch {
    return { teamProfile: null, error: "Could not read saved team profile." };
  }
};

export const createTeamForCurrentUser = async ({ teamName, joinCode, userIdentifier }) => {
  if (!userIdentifier) {
    return { teamProfile: null, error: "You must be logged in." };
  }

  const normalizedName = String(teamName || "").trim();
  if (!normalizedName) {
    return { teamProfile: null, error: "Team name is required." };
  }

  const profile = {
    teamId: Date.now(),
    teamName: normalizedName,
    joinCode: String(joinCode || "").trim(),
    role: "captain",
  };

  try {
    localStorage.setItem(getStorageKey(userIdentifier), JSON.stringify(profile));
    return { teamProfile: profile, error: null };
  } catch {
    return { teamProfile: null, error: "Could not save team profile locally." };
  }
};

export const disbandTeamForCurrentUser = async (userIdentifier) => {
  if (!userIdentifier) {
    return { error: "You must be logged in." };
  }

  try {
    localStorage.removeItem(getStorageKey(userIdentifier));
    return { error: null };
  } catch {
    return { error: "Could not remove team profile." };
  }
};
