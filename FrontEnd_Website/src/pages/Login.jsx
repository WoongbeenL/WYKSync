import { useState } from "react";
import { isSupabaseConfigured, supabase } from "../lib/supabaseClient";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
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

    setIsSubmitting(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    onLogin(data.user?.email || email);
    goToTournaments();
  };

  const handleSignup = (e) => {
    e.preventDefault();

    if (!email || !password) {
      setError("Email and password are required.");
      return;
    }

    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address.");
      return;
    }

    setError("");
    setMode("profile");
  };

  const handleProfile = async (e) => {
    e.preventDefault();

    if (!displayName.trim()) {
      setError("Please enter a display name.");
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
      options: {
        data: {
          display_name: displayName.trim(),
          full_name: displayName.trim(),
          username: displayName.trim(),
        },
      },
    });

    setIsSubmitting(false);

    if (signupError) {
      setError(signupError.message);
      return;
    }

    if (data.session) {
      onLogin(data.user?.email || email);
      goToTournaments();
      return;
    }

    setError("Signup successful. Check your email to verify, then log in.");
    setMode("login");
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
  };

  const testBackend = async () => {
    const backendUrl = import.meta.env.VITE_BACKEND_URL;

    setBackendTestResult("Testing backend...");

    try {
      const response = await fetch(`${backendUrl}/`);
      const body = await response.text();
      setBackendTestResult(`Backend OK (${response.status}): ${body}`);
    } catch (err) {
      setBackendTestResult(`Backend error: ${err.message}`);
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
            : handleProfile
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
        {mode === "profile" && <h1>Complete Profile</h1>}

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

        {mode === "profile" && (
          <input
            placeholder="Display Name"
            value={displayName}
            autoComplete="nickname"
            onChange={(e) => setDisplayName(e.target.value)}
          />
        )}

        {error && <p>{error}</p>}

        <button
          type="submit"
          disabled={isSubmitting || !isSupabaseConfigured}
          title={
            !isSupabaseConfigured
              ? "Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment."
              : ""
          }
        >
          {mode === "login"
            ? isSubmitting
              ? "Logging in..."
              : "Login"
            : mode === "signup"
              ? "Continue"
              : isSubmitting
                ? "Creating account..."
                : "Finish Sign Up"}
        </button>

        <button type="button" onClick={testBackend}>
          Test Backend
        </button>

        {backendTestResult && <p>{backendTestResult}</p>}
      </div>
    </form>
  );
}
