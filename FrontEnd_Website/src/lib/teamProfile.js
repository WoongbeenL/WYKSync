// Team profile helpers keep the page components from getting overloaded with API details.
import { requestBackend } from "./backendApi";

// Normalizes different backend response shapes into one frontend-friendly object.
const normalizeTeamProfile = (payload) => {
  const team = payload?.team || payload?.teamProfile || payload?.profile || payload;
  if (!team || typeof team !== "object") return null;

  const teamName = String(team.teamName || team.name || "").trim();
  if (!teamName) return null;

  return {
    teamId: team.teamId || team.team_id || team.id || null,
    teamName,
    joinCode: String(team.joinCode || team.join_code || "").trim(),
    role: String(team.role || "captain"),
    members: Array.isArray(team.members) ? team.members : [],
  };
};

// Same idea as above, but this one is for the join-team preview response.
const normalizeJoinPreview = (payload) => {
  const preview = payload?.preview || payload?.team || payload?.teamProfile || payload;
  if (!preview || typeof preview !== "object") return null;

  return {
    teamId: preview.teamId || preview.team_id || preview.id || null,
    teamName: String(preview.teamName || preview.name || "").trim(),
    joinCode: String(preview.joinCode || preview.join_code || "").trim(),
    members: Array.isArray(preview.members) ? preview.members : [],
  };
};

// Loads the current logged-in user's team profile.
export const fetchCurrentUserTeamProfile = async (userIdentifier) => {
  if (!userIdentifier) {
    return { teamProfile: null, error: "You must be logged in." };
  }

  const result = await requestBackend("/team/current", {
    requireAuth: true,
    fallbackError: "Could not load team profile.",
    allowNotFound: true,
  });

  return {
    teamProfile: normalizeTeamProfile(result.data),
    error: result.error,
  };
};

// Creates a new team for the current user.
export const createTeamForCurrentUser = async ({ teamName, userIdentifier }) => {
  if (!userIdentifier) {
    return { teamProfile: null, error: "You must be logged in." };
  }

  const normalizedName = String(teamName || "").trim();
  if (!normalizedName) {
    return { teamProfile: null, error: "Team name is required." };
  }

  const result = await requestBackend("/team", {
    method: "POST",
    requireAuth: true,
    fallbackError: "Could not create team.",
    body: {
      name: normalizedName,
    },
  });

  return {
    teamProfile: normalizeTeamProfile(result.data),
    error: result.error,
  };
};

// Updates the current team's name.
export const updateTeamForCurrentUser = async ({
  teamId,
  teamName,
  userIdentifier,
}) => {
  if (!userIdentifier) {
    return { teamProfile: null, error: "You must be logged in." };
  }
  if (!teamId) {
    return { teamProfile: null, error: "Team ID is required." };
  }

  const normalizedName = String(teamName || "").trim();
  if (!normalizedName) {
    return { teamProfile: null, error: "Team name is required." };
  }

  const result = await requestBackend(`/team/${teamId}`, {
    method: "PATCH",
    requireAuth: true,
    fallbackError: "Could not update team.",
    body: {
      name: normalizedName,
    },
  });

  return {
    teamProfile: normalizeTeamProfile(result.data),
    error: result.error,
  };
};

// Deletes the current team.
export const disbandTeamForCurrentUser = async ({
  teamId,
  userIdentifier,
}) => {
  if (!userIdentifier) {
    return { error: "You must be logged in." };
  }
  if (!teamId) {
    return { error: "Team ID is required." };
  }

  const result = await requestBackend(`/team/${teamId}`, {
    method: "DELETE",
    requireAuth: true,
    fallbackError: "Could not delete team.",
  });

  return { error: result.error };
};

// Checks a join code and returns preview info before a real join is confirmed.
export const previewTeamJoin = async ({ joinCode, userIdentifier }) => {
  if (!userIdentifier) {
    return { preview: null, error: "You must be logged in." };
  }

  const normalizedJoinCode = String(joinCode || "").trim();
  if (!normalizedJoinCode) {
    return { preview: null, error: "Join code is required." };
  }

  const result = await requestBackend("/team/join", {
    method: "POST",
    requireAuth: true,
    fallbackError: "Could not preview team join.",
    body: {
      join_code: normalizedJoinCode,
      preview: true,
    },
  });

  return {
    preview: normalizeJoinPreview(result.data),
    error: result.error,
  };
};
