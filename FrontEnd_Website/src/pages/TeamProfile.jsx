import { useEffect, useState } from "react";
import {
  createTeamForCurrentUser,
  disbandTeamForCurrentUser,
  fetchCurrentUserTeamProfile,
  previewTeamJoin,
  updateTeamForCurrentUser,
} from "../lib/teamProfile";
import { supabase } from "../lib/supabaseClient";
import { backendUrl, parseBackendError } from "../lib/backendApi";
import "./team-profile.css";

export default function TeamProfile({ user, onProfileUpdated }) {
  const [teamName, setTeamName] = useState("");
  const [teamProfile, setTeamProfile] = useState(null);
  const [joinPreviewCode, setJoinPreviewCode] = useState("");
  const [joinPreview, setJoinPreview] = useState(null);
  const [joinPreviewError, setJoinPreviewError] = useState("");
  const [isPreviewingJoin, setIsPreviewingJoin] = useState(false);
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
      setTeamName(loadedProfile?.teamName || "");
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
      userIdentifier: user,
    });
    setIsSaving(false);

    if (createError) {
      setError(createError);
      if (createdTeam) setTeamProfile(createdTeam);
      return;
    }

    setTeamProfile(createdTeam);
    setTeamName(createdTeam?.teamName || "");
    setSuccess("Team profile created.");
  };

  const handleUpdateTeam = async (event) => {
    event.preventDefault();
    setError("");
    setSuccess("");

    if (!teamName.trim()) {
      setError("Team name is required.");
      return;
    }

    setIsSaving(true);
    const { teamProfile: updatedTeam, error: updateError } =
      await updateTeamForCurrentUser({
        teamName,
        userIdentifier: user,
      });
    setIsSaving(false);

    if (updateError) {
      setError(updateError);
      return;
    }

    setTeamProfile(updatedTeam);
    setTeamName(updatedTeam?.teamName || "");
    setSuccess("Team profile updated.");
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
    setTeamName("");
    setSuccess("Team disbanded.");
  };

  const handlePreviewJoin = async (event) => {
    event.preventDefault();
    setJoinPreview(null);
    setJoinPreviewError("");

    if (!joinPreviewCode.trim()) {
      setJoinPreviewError("Join code is required.");
      return;
    }

    setIsPreviewingJoin(true);
    const { preview, error: previewError } = await previewTeamJoin({
      joinCode: joinPreviewCode,
      userIdentifier: user,
    });
    setIsPreviewingJoin(false);

    if (previewError) {
      setJoinPreviewError(previewError);
      return;
    }

    if (!preview) {
      setJoinPreviewError("No team preview was returned by the backend.");
      return;
    }

    setJoinPreview(preview);
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
          <form className="team-profile-form" onSubmit={handleUpdateTeam}>
            <input
              type="text"
              placeholder="Team Name"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
            />
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Saving Team..." : "Update Team"}
            </button>
          </form>
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
        <>
          <form className="team-profile-card team-profile-form" onSubmit={handleCreateTeam}>
            <h2>Create Team</h2>
            <input
              type="text"
              placeholder="Team Name"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
            />
            {error && <p className="team-profile-error">{error}</p>}
            {success && <p className="team-profile-success">{success}</p>}
            <button type="submit" disabled={isSaving}>
              {isSaving ? "Creating Team..." : "Create Team"}
            </button>
          </form>

          <form className="team-profile-card team-profile-form" onSubmit={handlePreviewJoin}>
            <h2>Join Team</h2>
            <input
              type="text"
              placeholder="Join Code"
              value={joinPreviewCode}
              onChange={(event) => setJoinPreviewCode(event.target.value)}
            />
            <button type="submit" disabled={isPreviewingJoin}>
              {isPreviewingJoin ? "Checking Team..." : "Find Team"}
            </button>
            {joinPreviewError && <p className="team-profile-error">{joinPreviewError}</p>}
            {joinPreview && (
              <div className="team-preview-card">
                <p>
                  <strong>Team:</strong> {joinPreview.teamName || "Unknown"}
                </p>
                <p>
                  <strong>Members:</strong> {joinPreview.members.length}
                </p>
              </div>
            )}
          </form>
        </>
      )}

      {user && !isLoading && teamProfile && error && <p className="team-profile-error">{error}</p>}
    </div>
  );
}
