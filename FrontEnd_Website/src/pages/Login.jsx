import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";
import "./login.css";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// backend base url from env with trailing slash removed
const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

// builds a clearer fetch error message for backend calls
const buildBackendFetchError = (action, err) =>
  `${action} failed: ${err.message}. Check VITE_BACKEND_URL, backend status, and CORS allowlist for your frontend domain.`;

// parses error whether backend returns text or json
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

export default function Login({ onLogin }) {
  // mode decides which screen to show
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  // keep token for patch me profile call
  const [profileToken, setProfileToken] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const goToTournaments = () => {
    // quick route change to tournaments
    window.history.pushState({}, "", "/tournaments");
    window.dispatchEvent(new Event("popstate"));
  };

  const handleLogin = async (e) => {
    // stops full page refresh on form submit
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

    // logs user in through supabase auth
    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setIsSubmitting(false);
      setError(loginError.message);
      return;
    }

    // asks backend if user is already onboarded
    await handlePostAuth(data.session, data.user?.email || email);
  };

  const handleSignup = async (e) => {
    // stops full page refresh on form submit
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

    // creates account in supabase auth
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

    // same post auth flow as login once session exists
    await handlePostAuth(data.session, data.user?.email || email);
  };

  const handlePostAuth = async (session, userEmail) => {
    // frontend cannot continue without backend url
    if (!backendUrl) {
      setIsSubmitting(false);
      setError("Backend URL is missing. Add VITE_BACKEND_URL.");
      return;
    }

    // token is required for protected backend routes
    if (!session?.access_token) {
      setIsSubmitting(false);
      setError("Auth token missing. Please try logging in again.");
      return;
    }

    try {
      // gets profile + onboarding status from backend
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

      // onboarded users go straight into app
      if (meData.is_onboarded) {
        setIsSubmitting(false);
        onLogin(userEmail);
        goToTournaments();
        return;
      }

      // not onboarded users are sent to profile setup step
      setIsSubmitting(false);
      setProfileToken(session.access_token);
      setDisplayName(meData.display_name || "");
      setMode("onboarding");
    } catch (err) {
      setIsSubmitting(false);
      setError(buildBackendFetchError("Could not reach backend GET /me", err));
    }
  };

  const handleOnboarding = async (e) => {
    // stops full page refresh on form submit
    e.preventDefault();

    // read latest display name from the submitted form
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
      // fallback if token state was cleared
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
      // saves display name and completes onboarding
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

  const switchMode = (nextMode) => {
    // switching tabs should also clear stale error text
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
