import { requestBackend } from "./backendApi";

const normalizeTeamProfile = (payload) => {
  const team = payload?.team || payload?.teamProfile || payload?.profile || payload;
  if (!team || typeof team !== "object") return null;

  const teamName = String(team.teamName || team.name || "").trim();
  if (!teamName) return null;

  return {
    teamId: team.teamId || team.id || null,
    teamName,
    joinCode: String(team.joinCode || team.join_code || "").trim(),
    role: String(team.role || "captain"),
    members: Array.isArray(team.members) ? team.members : [],
  };
};

const normalizeJoinPreview = (payload) => {
  const preview = payload?.preview || payload?.team || payload?.teamProfile || payload;
  if (!preview || typeof preview !== "object") return null;

  return {
    teamId: preview.teamId || preview.id || null,
    teamName: String(preview.teamName || preview.name || "").trim(),
    joinCode: String(preview.joinCode || preview.join_code || "").trim(),
    members: Array.isArray(preview.members) ? preview.members : [],
  };
};

export const fetchCurrentUserTeamProfile = async (userIdentifier) => {
  if (!userIdentifier) {
    return { teamProfile: null, error: "You must be logged in." };
  }

  const result = await requestBackend("/team", {
    requireAuth: true,
    fallbackError: "Could not load team profile.",
    allowNotFound: true,
  });

  return {
    teamProfile: normalizeTeamProfile(result.data),
    error: result.error,
  };
};

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
      teamName: normalizedName,
    },
  });

  return {
    teamProfile: normalizeTeamProfile(result.data),
    error: result.error,
  };
};

export const updateTeamForCurrentUser = async ({ teamName, userIdentifier }) => {
  if (!userIdentifier) {
    return { teamProfile: null, error: "You must be logged in." };
  }

  const normalizedName = String(teamName || "").trim();
  if (!normalizedName) {
    return { teamProfile: null, error: "Team name is required." };
  }

  const result = await requestBackend("/team", {
    method: "PATCH",
    requireAuth: true,
    fallbackError: "Could not update team.",
    body: {
      teamName: normalizedName,
    },
  });

  return {
    teamProfile: normalizeTeamProfile(result.data),
    error: result.error,
  };
};

export const disbandTeamForCurrentUser = async (userIdentifier) => {
  if (!userIdentifier) {
    return { error: "You must be logged in." };
  }

  const result = await requestBackend("/team", {
    method: "DELETE",
    requireAuth: true,
    fallbackError: "Could not delete team.",
  });

  return { error: result.error };
};

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
      joinCode: normalizedJoinCode,
      preview: true,
    },
  });

  return {
    preview: normalizeJoinPreview(result.data),
    error: result.error,
  };
};
