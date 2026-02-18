import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

const buildBackendFetchError = (action, err) =>
  `${action} failed: ${err.message}. Check VITE_BACKEND_URL, backend status, and CORS allowlist for http://localhost:5173 and https://wyksync.vercel.app.`;

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [profileToken, setProfileToken] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [backendTestResult, setBackendTestResult] = useState("");

  const goToTournaments = () => {
    window.history.pushState({}, "", "/tournaments");
    window.dispatchEvent(new Event("popstate"));
  };

  const handleLogin = async (e) => {
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

    const { data, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (loginError) {
      setIsSubmitting(false);
      setError(loginError.message);
      return;
    }

    await handlePostAuth(data.session, data.user?.email || email);
  };

  const handleSignup = async (e) => {
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

    await handlePostAuth(data.session, data.user?.email || email);
  };

  const handlePostAuth = async (session, userEmail) => {
    if (!backendUrl) {
      setIsSubmitting(false);
      setError("Backend URL is missing. Add VITE_BACKEND_URL.");
      return;
    }

    if (!session?.access_token) {
      setIsSubmitting(false);
      setError("Auth token missing. Please try logging in again.");
      return;
    }

    try {
      const meResponse = await fetch(`${backendUrl}/me`, {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (!meResponse.ok) {
        const message = await meResponse.text();
        setIsSubmitting(false);
        setError(message || `GET /me failed with status ${meResponse.status}.`);
        return;
      }

      const meData = await meResponse.json();

      if (meData.is_onboarded) {
        setIsSubmitting(false);
        onLogin(userEmail);
        goToTournaments();
        return;
      }

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
    e.preventDefault();

    if (!displayName.trim()) {
      setError("Please enter a display name.");
      return;
    }

    if (!backendUrl) {
      setError("Backend URL is missing. Add VITE_BACKEND_URL.");
      return;
    }

    let token = profileToken;
    if (!token && supabase) {
      const { data: sessionData } = await supabase.auth.getSession();
      token = sessionData.session?.access_token || "";
    }

    if (!token) {
      setError("Missing auth token. Please log in again.");
      return;
    }

    setError("");
    setIsSubmitting(true);

    try {
      const response = await fetch(`${backendUrl}/me/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          display_name: displayName.trim(),
        }),
      });

      if (!response.ok) {
        const message = await response.text();
        setIsSubmitting(false);
        setError(message || `PATCH /me/profile failed with status ${response.status}.`);
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
    setMode(nextMode);
    setError("");
  };

  const testBackend = async () => {
    if (!backendUrl) {
      setBackendTestResult("Backend URL missing. Add VITE_BACKEND_URL.");
      return;
    }

    setBackendTestResult("Testing backend...");

    try {
      const response = await fetch(`${backendUrl}/`);
      const body = await response.text();
      setBackendTestResult(`Backend OK (${response.status}): ${body}`);
    } catch (err) {
      setBackendTestResult(buildBackendFetchError("Backend root request", err));
    }
  };

  return (
    <form
      className="login"
      onSubmit={
        mode === "login"
          ? handleLogin
          : mode === "signup"
            ? handleSignup
            : handleOnboarding
      }
    >
      <div className="login">
        <div>
          <button type="button" onClick={() => switchMode("login")}>
            Login
          </button>
          <button type="button" onClick={() => switchMode("signup")}>
            Sign Up
          </button>
        </div>

        {mode === "login" && <h1>Login</h1>}
        {mode === "signup" && <h1>Sign Up</h1>}
        {mode === "onboarding" && <h1>Complete Profile</h1>}

        {(mode === "login" || mode === "signup") && (
          <>
            <input
              type="email"
              placeholder="Email"
              value={email}
              autoComplete="email"
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
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
            placeholder="Display Name"
            value={displayName}
            autoComplete="nickname"
            onChange={(e) => setDisplayName(e.target.value)}
          />
        )}

        {error && <p>{error}</p>}

        <button type="submit" disabled={isSubmitting}>
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

        <button type="button" onClick={testBackend}>
          Test Backend
        </button>

        {backendTestResult && <p>{backendTestResult}</p>}
      </div>
    </form>
  );
}
