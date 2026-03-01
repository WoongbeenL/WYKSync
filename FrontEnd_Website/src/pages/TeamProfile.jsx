import { useEffect, useState } from "react";
import {
  createTeamForCurrentUser,
  disbandTeamForCurrentUser,
  fetchCurrentUserTeamProfile,
} from "../lib/teamProfile";
import "./team-profile.css";

export default function TeamProfile({ user }) {
  const [teamName, setTeamName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [teamProfile, setTeamProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

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
