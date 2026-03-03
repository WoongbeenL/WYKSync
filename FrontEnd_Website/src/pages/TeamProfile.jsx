import { useEffect, useState } from "react";
import {
  createTeamForCurrentUser,
  disbandTeamForCurrentUser,
  fetchCurrentUserTeamProfile,
} from "../lib/teamProfile";
import { supabase } from "../lib/supabaseClient";
import "./team-profile.css";

const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

const parseBackendError = async (response, fallback) => {
  const text = await response.text();
  if (!text) return fallback;

  try {
    const parsed = JSON.parse(text);
    return parsed.error || parsed.message || text;
  } catch {
    return text;
  }
};

export default function TeamProfile({ user, onProfileUpdated }) {
  const [teamName, setTeamName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [teamProfile, setTeamProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentEmail, setCurrentEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [accountError, setAccountError] = useState("");
  const [accountSuccess, setAccountSuccess] = useState("");
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  const [isSavingDisplayName, setIsSavingDisplayName] = useState(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  useEffect(() => {
    let active = true;

    const loadTeamProfile = async () => {
      if (!user) {
        setTeamProfile(null);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);
      setError("");
      const { teamProfile: loadedProfile, error: loadError } =
        await fetchCurrentUserTeamProfile(user);
      if (!active) return;

      if (loadError) {
        setError(loadError);
      }
      setTeamProfile(loadedProfile);
      setIsLoading(false);
    };

    loadTeamProfile();

    return () => {
      active = false;
    };
  }, [user]);

  useEffect(() => {
    let active = true;

    const loadAccountProfile = async () => {
      if (!user) {
        setCurrentEmail("");
        setDisplayName("");
        setNewEmail("");
        setAccountError("");
        setAccountSuccess("");
        return;
      }

      if (!supabase) {
        setAccountError("Supabase auth is not configured.");
        return;
      }

      setIsAccountLoading(true);
      setAccountError("");
      setAccountSuccess("");

      const { data } = await supabase.auth.getSession();
      const session = data.session;
      const token = session?.access_token;
      const sessionEmail = session?.user?.email || user;

      if (!active) return;
      setCurrentEmail(sessionEmail);

      if (!token || !backendUrl) {
        setDisplayName("");
        setIsAccountLoading(false);
        return;
      }

      try {
        const response = await fetch(`${backendUrl}/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!response.ok) {
          const message = await parseBackendError(
            response,
            `GET /me failed with status ${response.status}.`
          );
          if (!active) return;
          setAccountError(message);
          setIsAccountLoading(false);
          return;
        }

        const meData = await response.json();
        if (!active) return;
        setDisplayName(String(meData?.display_name || ""));
      } catch (err) {
        if (!active) return;
        setAccountError(`Could not load account profile: ${err.message}`);
      } finally {
        if (active) {
          setIsAccountLoading(false);
        }
      }
    };

    loadAccountProfile();

    return () => {
      active = false;
    };
  }, [user]);

  const handleSaveDisplayName = async (event) => {
    event.preventDefault();

    const trimmedDisplayName = displayName.trim();
    if (!trimmedDisplayName) {
      setAccountError("Display ID is required.");
      return;
    }
    if (!backendUrl) {
      setAccountError("Backend URL is missing. Add VITE_BACKEND_URL.");
      return;
    }
    if (!supabase) {
      setAccountError("Supabase auth is not configured.");
      return;
    }

    setAccountError("");
    setAccountSuccess("");
    setIsSavingDisplayName(true);

    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setAccountError("Missing auth token. Please log in again.");
        return;
      }

      const response = await fetch(`${backendUrl}/me/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: trimmedDisplayName,
        }),
      });

      if (!response.ok) {
        const message = await parseBackendError(
          response,
          `PATCH /me/profile failed with status ${response.status}.`
        );
        setAccountError(message);
        return;
      }

      setDisplayName(trimmedDisplayName);
      setAccountSuccess("Display ID updated.");
      if (typeof onProfileUpdated === "function") {
        await onProfileUpdated();
      }
    } catch (err) {
      setAccountError(`Could not update display ID: ${err.message}`);
    } finally {
      setIsSavingDisplayName(false);
    }
  };

  const handleSaveEmail = async (event) => {
    event.preventDefault();

    const trimmedEmail = newEmail.trim();
    if (!trimmedEmail) {
      setAccountError("New email is required.");
      return;
    }
    if (!supabase) {
      setAccountError("Supabase auth is not configured.");
      return;
    }

    setAccountError("");
    setAccountSuccess("");
    setIsSavingEmail(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        email: trimmedEmail,
      });

      if (updateError) {
        setAccountError(updateError.message);
        return;
      }

      setCurrentEmail(trimmedEmail);
      setNewEmail("");
      setAccountSuccess("Email update requested. Check your inbox to confirm the new email.");
      if (typeof onProfileUpdated === "function") {
        await onProfileUpdated();
      }
    } catch (err) {
      setAccountError(`Could not update email: ${err.message}`);
    } finally {
      setIsSavingEmail(false);
    }
  };

  const handleCreateTeam = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!teamName.trim()) {
      setError("Team name is required.");
      return;
    }

    setIsSaving(true);
    const { teamProfile: createdTeam, error: createError } = await createTeamForCurrentUser({
      teamName,
      joinCode,
      userIdentifier: user,
    });
    setIsSaving(false);

    if (createError) {
      setError(createError);
      if (createdTeam) setTeamProfile(createdTeam);
      return;
    }

    setTeamProfile(createdTeam);
    setSuccess("Team profile created. You can now register for tournaments.");
    setTeamName("");
    setJoinCode("");
  };

  const handleDisbandTeam = async () => {
    if (!user || !teamProfile) return;

    const confirmed = window.confirm(`Disband "${teamProfile.teamName}"?`);
    if (!confirmed) return;

    setError("");
    setSuccess("");
    setIsSaving(true);
    const { error: disbandError } = await disbandTeamForCurrentUser(user);
    setIsSaving(false);

    if (disbandError) {
      setError(disbandError);
      return;
    }

    setTeamProfile(null);
    setSuccess("Team disbanded.");
  };

  return (
    <div className="team-profile-page">
      <h1>Team Profile</h1>
      {!user && (
        <div className="team-profile-card">
          <p>
            <a href="/login">Log in</a> to create your team profile.
          </p>
        </div>
      )}

      {user && (
        <div className="team-profile-card team-profile-form">
          <h2>Account Settings</h2>
          {isAccountLoading ? (
            <p>Loading account settings...</p>
          ) : (
            <>
              <p>
                <strong>Current Email:</strong> {currentEmail || user}
              </p>
              <form className="team-profile-form" onSubmit={handleSaveDisplayName}>
                <input
                  type="text"
                  placeholder="Display ID"
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                />
                <button type="submit" disabled={isSavingDisplayName}>
                  {isSavingDisplayName ? "Saving Display ID..." : "Save Display ID"}
                </button>
              </form>
              <form className="team-profile-form" onSubmit={handleSaveEmail}>
                <input
                  type="email"
                  placeholder="New Email"
                  value={newEmail}
                  onChange={(event) => setNewEmail(event.target.value)}
                />
                <button type="submit" disabled={isSavingEmail}>
                  {isSavingEmail ? "Saving Email..." : "Change Email"}
                </button>
              </form>
            </>
          )}
          {accountError && <p className="team-profile-error">{accountError}</p>}
          {accountSuccess && <p className="team-profile-success">{accountSuccess}</p>}
        </div>
      )}

      {user && isLoading && (
        <div className="team-profile-card">
          <p>Loading your team profile...</p>
        </div>
      )}

      {user && !isLoading && teamProfile && (
        <div className="team-profile-card">
          <h2>{teamProfile.teamName}</h2>
          <p>
            <strong>Role:</strong> {teamProfile.role}
          </p>
          <p>
            <strong>Join Code:</strong> {teamProfile.joinCode || "Not set"}
          </p>
          <p className="team-profile-ready">
            Team profile complete. Tournament registration is enabled.
          </p>
          <button
            type="button"
            className="team-profile-disband-btn"
            onClick={handleDisbandTeam}
            disabled={isSaving}
          >
            {isSaving ? "Disbanding..." : "Disband Team"}
          </button>
          {error && <p className="team-profile-error">{error}</p>}
          {success && <p className="team-profile-success">{success}</p>}
        </div>
      )}

      {user && !isLoading && !teamProfile && (
        <form className="team-profile-card team-profile-form" onSubmit={handleCreateTeam}>
          <h2>Create Team</h2>
          <p className="team-profile-note">
            Temporary frontend-only team profile until backend team endpoints are available.
          </p>
          <input
            type="text"
            placeholder="Team Name"
            value={teamName}
            onChange={(event) => setTeamName(event.target.value)}
          />
          <input
            type="text"
            placeholder="Join Code (optional)"
            value={joinCode}
            onChange={(event) => setJoinCode(event.target.value)}
          />
          {error && <p className="team-profile-error">{error}</p>}
          {success && <p className="team-profile-success">{success}</p>}
          <button type="submit" disabled={isSaving}>
            {isSaving ? "Creating Team..." : "Create Team Profile"}
          </button>
        </form>
      )}

      {user && !isLoading && teamProfile && error && <p className="team-profile-error">{error}</p>}
    </div>
  );
}
