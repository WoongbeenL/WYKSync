import { useState } from "react";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function Login({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");

  const goToTournaments = () => {
    window.history.pushState({}, "", "/tournaments");
    window.dispatchEvent(new Event("popstate"));
  };

  const handleLogin = (e) => {
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
    onLogin(email);
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

  const handleProfile = (e) => {
    e.preventDefault();

    if (!displayName.trim()) {
      setError("Please enter a display name.");
      return;
    }

    setError("");
    onLogin(email);
    goToTournaments();
  };

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError("");
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
              onChange={(e) => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        )}

        {mode === "profile" && (
          <input
            placeholder="Display Name"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
          />
        )}

        {error && <p>{error}</p>}

        <button type="submit">
          {mode === "login"
            ? "Login"
            : mode === "signup"
              ? "Continue"
              : "Finish Sign Up"}
        </button>
      </div>
    </form>
  );
}
