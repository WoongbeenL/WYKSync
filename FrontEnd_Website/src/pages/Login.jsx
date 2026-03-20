// Login page handles login, signup, and first-time onboarding in one place.
import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import "./login.css";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// This cleans up the backend URL just in case the env var has a trailing slash.
const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

// Small helper so the backend error messages make more sense to whoever is testing.
const buildBackendFetchError = (action, err) =>
  `${action} failed: ${err.message}. Check VITE_BACKEND_URL, backend status, and CORS allowlist for your frontend domain.`;

// Backend errors can come back as text or JSON, so this tries both.
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

// One component handles the whole auth flow so the UX stays in one card.
export default function Login({ onLogin }) {
  // This decides whether the card is showing login, signup, or onboarding.
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  // We keep the token around because onboarding needs to patch the user profile.
  const [profileToken, setProfileToken] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // This is our basic page redirect after the auth flow finishes.
  const goToTournaments = () => {
    // Quick route change without needing a full page reload.
    window.history.pushState({}, "", "/tournaments");
    window.dispatchEvent(new Event("popstate"));
  };

  // Handles normal email/password login.
  const handleLogin = async (e) => {
    // Stops the browser from reloading the page when the form submits.
    e.preventDefault();

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }

    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    // Ask Supabase to log the user in.
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setIsSubmitting(false);
      setError(loginError.message);
      return;
    }

    // After auth, we ask the backend whether the user already finished setup.
    await handlePostAuth(data.session, data.user?.email || email);
  };

  // Handles account creation before we move into the same post-auth flow.
  const handleSignup = async (e) => {
    // Stops the browser from reloading the page when the form submits.
    e.preventDefault();

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    if (!isSupabaseConfigured || !supabase) {
      setError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    // Creates the new auth account in Supabase.
    const { data, error: signupError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signupError) {
      setIsSubmitting(false);
      setError(signupError.message);
      return;
    }

    if (!data.session) {
      setIsSubmitting(false);
      setError("Signup successful. Check your email to verify, then log in.");
      setMode("login");
      return;
    }

    // Once a real session exists, signup uses the same next steps as login.
    await handlePostAuth(data.session, data.user?.email || email);
  };

  // Shared post-auth check to decide if the user enters the app or finishes onboarding.
  const handlePostAuth = async (session, userEmail) => {
    // Frontend cannot continue this part without the backend URL.
    if (!backendUrl) {
      setIsSubmitting(false);
      setError("Backend URL is missing. Add VITE_BACKEND_URL.");
      return;
    }

    // Protected backend routes need the access token.
    if (!session?.access_token) {
      setIsSubmitting(false);
      setError("Auth token missing. Please try logging in again.");
      return;
    }

    try {
      // Load the user's backend profile and onboarding flag.
      const meResponse = await fetch(`${backendUrl}/me`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!meResponse.ok) {
        const message = await parseBackendError(
          meResponse,
          `GET /me failed with status ${meResponse.status}.`
        );
        setIsSubmitting(false);
        setError(message);
        return;
      }

      const meData = await meResponse.json();

      // If onboarding is already done, we send them right into the app.
      if (meData.is_onboarded) {
        setIsSubmitting(false);
        onLogin(userEmail);
        goToTournaments();
        return;
      }

      // Otherwise we keep them here and switch the form into onboarding mode.
      setIsSubmitting(false);
      setProfileToken(session.access_token);
      setDisplayName(meData.display_name || "");
      setMode("onboarding");
    } catch (err) {
      setIsSubmitting(false);
      setError(buildBackendFetchError("Could not reach backend GET /me", err));
    }
  };

  // Handles the short onboarding step where a display name gets saved.
  const handleOnboarding = async (e) => {
    // Stops the browser from reloading the page when the form submits.
    e.preventDefault();

    // We read the latest form value directly so we always save the current text.
    const formData = new FormData(e.currentTarget);
    const typedDisplayName = String(formData.get("display_name") || "").trim();

    if (!typedDisplayName) {
      setError("Please enter a display name.");
      return;
    }

    if (!backendUrl) {
      setError("Backend URL is missing. Add VITE_BACKEND_URL.");
      return;
    }

    let token = profileToken;
    if (!token && supabase) {
      // Fallback in case the saved token was cleared for some reason.
      const { data: sessionData } = await supabase.auth.getSession();
      token = sessionData.session?.access_token || "";
    }

    if (!token) {
      setError("Missing auth token. Please log in again.");
      return;
    }

    setDisplayName(typedDisplayName);
    setError("");
    setIsSubmitting(true);

    try {
      // Save the display name and mark onboarding as done on the backend.
      const response = await fetch(`${backendUrl}/me/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: typedDisplayName,
        }),
      });

      if (!response.ok) {
        const message = await parseBackendError(
          response,
          `PATCH /me/profile failed with status ${response.status}.`
        );
        setIsSubmitting(false);
        setError(message);
        return;
      }

      setIsSubmitting(false);
      onLogin(email);
      goToTournaments();
    } catch (err) {
      setError(buildBackendFetchError("Could not update profile PATCH /me/profile", err));
      setIsSubmitting(false);
    }
  };

  // Switching tabs should also reset old error messages so the UI feels cleaner.
  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
  };

  return (
    <form
      className="auth-page"
      onSubmit={
        mode === "login"
          ? handleLogin
          : mode === "signup"
            ? handleSignup
            : handleOnboarding
      }
    >
      <div className="auth-card">
        <div className="auth-tabs">
          <button
            type="button"
            className={mode === "login" ? "auth-tab active" : "auth-tab"}
            onClick={() => switchMode("login")}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === "signup" ? "auth-tab active" : "auth-tab"}
            onClick={() => switchMode("signup")}
          >
            Sign Up
          </button>
        </div>

        {mode === "login" && <h1 className="auth-title">Login</h1>}
        {mode === "signup" && <h1 className="auth-title">Sign Up</h1>}
        {mode === "onboarding" && <h1 className="auth-title">Complete Profile</h1>}

        {(mode === "login" || mode === "signup") && (
          <>
            <input
              className="auth-input"
              type="email"
              placeholder="Email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              className="auth-input"
              type="password"
              placeholder="Password"
              value={password}
              autoComplete={mode === "login" ? "current-password" : "new-password"}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}

        {mode === "onboarding" && (
          <input
            className="auth-input"
            name="display_name"
            placeholder="Display Name"
            value={displayName}
            autoComplete="nickname"
            onChange={(e) => setDisplayName(e.target.value)}
          />
        )}

        {error && <p className="auth-error">{error}</p>}

        <button className="auth-submit" type="submit" disabled={isSubmitting}>
          {mode === "login"
            ? isSubmitting
              ? "Logging in..."
              : "Login"
            : mode === "signup"
              ? isSubmitting
                ? "Creating account..."
                : "Sign Up"
              : isSubmitting
                ? "Saving profile..."
                : "Save Profile"}
        </button>
      </div>
    </form>
  );
}
