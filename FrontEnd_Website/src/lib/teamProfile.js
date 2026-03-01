import { isSupabaseConfigured, supabase } from "./supabaseClient";

const MEMBERSHIP_USER_COLUMNS = ["user_id", "userId", "id"];
const TEAM_ID_COLUMNS = ["team_id", "teamId", "team_Id", "id"];

const normalizeTeamRecord = (team) => {
  if (!team) return null;
  const teamId = team.team_id ?? team.id ?? null;
  return {
    teamId,
    teamName: team.name || "",
    joinCode: team.join_code || "",
  };
};

const normalizeMembershipRecord = (membership) => {
  if (!membership) return null;
  return {
    teamId: membership.team_id ?? null,
    role: membership.role || "member",
  };
};

const getAuthenticatedUserId = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return { userId: null, error: "Supabase is not configured." };
  }

  const { data, error } = await supabase.auth.getUser();
  if (error) return { userId: null, error: error.message };
  return { userId: data.user?.id || null, error: null };
};

const getLatestMembershipForUser = async (userId) => {
  let lastErrorMessage = "";

  for (const column of MEMBERSHIP_USER_COLUMNS) {
    const { data, error } = await supabase
      .from("team_members")
      .select("*")
      .eq(column, userId)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) {
      lastErrorMessage = error.message || String(error);
      continue;
    }
    if (data?.length) {
      return { membership: normalizeMembershipRecord(data[0]), userColumn: column, error: null };
    }
  }

  return { membership: null, userColumn: null, error: lastErrorMessage || null };
};

const getTeamById = async (teamId) => {
  let lastErrorMessage = "";

  for (const column of TEAM_ID_COLUMNS) {
    const { data, error } = await supabase
      .from("teams")
      .select("*")
      .eq(column, teamId)
      .limit(1);

    if (error) {
      lastErrorMessage = error.message || String(error);
      continue;
    }
    if (data?.length) return { team: normalizeTeamRecord(data[0]), error: null };
  }

  return { team: null, error: lastErrorMessage || "Unable to load team details." };
};

const insertTeam = async (teamName, joinCode) => {
  const basePayload = {
    name: teamName.trim(),
  };
  const normalizedJoinCode = joinCode.trim();
  let lastErrorMessage = "";
  let joinCodeSupported = normalizedJoinCode.length > 0;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    const payload = joinCodeSupported
      ? { ...basePayload, join_code: normalizedJoinCode }
      : basePayload;
    const { data, error } = await supabase
      .from("teams")
      .insert(payload)
      .select("*")
      .single();

    if (!error) {
      const team = normalizeTeamRecord(data);
      if (team?.teamId) return { team, error: null };
      return { team: null, error: "Team created but team id was not returned by Supabase." };
    }

    const message = error.message || String(error);
    lastErrorMessage = message;
    if (joinCodeSupported && message.includes("join_code")) {
      // Support environments where teams.join_code is not present.
      joinCodeSupported = false;
      continue;
    }
    break;
  }

  return {
    team: null,
    error: `Could not create team in Supabase. ${lastErrorMessage}`.trim(),
  };
};

const deleteTeamById = async (teamId) => {
  for (const teamIdColumn of TEAM_ID_COLUMNS) {
    const { error } = await supabase.from("teams").delete().eq(teamIdColumn, teamId);
    if (!error) return;
  }
};

const insertMembership = async (userId, teamId) => {
  let lastErrorMessage = "";

  for (const column of MEMBERSHIP_USER_COLUMNS) {
    const payload = {
      [column]: userId,
      team_id: teamId,
      role: "captain",
    };

    const { error } = await supabase.from("team_members").insert(payload);
    if (!error) return { error: null };
    lastErrorMessage = error.message || String(error);
  }

  return {
    error: `Could not create team membership in Supabase. ${lastErrorMessage}`.trim(),
  };
};

export const fetchCurrentUserTeamProfile = async () => {
  if (!isSupabaseConfigured || !supabase) {
    return { teamProfile: null, error: "Supabase is not configured." };
  }

  const { userId, error: authError } = await getAuthenticatedUserId();
  if (authError) return { teamProfile: null, error: authError };
  if (!userId) return { teamProfile: null, error: null };

  const { membership, error: membershipError } = await getLatestMembershipForUser(userId);
  if (membershipError) return { teamProfile: null, error: membershipError };
  if (!membership?.teamId) return { teamProfile: null, error: null };

  const { team, error: teamError } = await getTeamById(membership.teamId);
  if (teamError) return { teamProfile: null, error: teamError };
  if (!team) return { teamProfile: null, error: null };

  return {
    teamProfile: {
      ...team,
      role: membership.role || "member",
    },
    error: null,
  };
};

export const createTeamForCurrentUser = async ({ teamName, joinCode }) => {
  if (!isSupabaseConfigured || !supabase) {
    return { teamProfile: null, error: "Supabase is not configured." };
  }

  const normalizedName = teamName.trim();
  if (!normalizedName) {
    return { teamProfile: null, error: "Team name is required." };
  }

  const { userId, error: authError } = await getAuthenticatedUserId();
  if (authError) return { teamProfile: null, error: authError };
  if (!userId) return { teamProfile: null, error: "You must be logged in." };

  const { membership } = await getLatestMembershipForUser(userId);
  if (membership?.teamId) {
    const { team } = await getTeamById(membership.teamId);
    return {
      teamProfile: team ? { ...team, role: membership.role || "member" } : null,
      error: "You already belong to a team.",
    };
  }

  const { team, error: teamCreateError } = await insertTeam(normalizedName, joinCode);
  if (teamCreateError || !team?.teamId) {
    return { teamProfile: null, error: teamCreateError || "Team creation failed." };
  }

  const { error: membershipInsertError } = await insertMembership(userId, team.teamId);
  if (membershipInsertError) {
    await deleteTeamById(team.teamId);
    return { teamProfile: null, error: membershipInsertError };
  }

  return {
    teamProfile: {
      ...team,
      role: "captain",
    },
    error: null,
  };
};
