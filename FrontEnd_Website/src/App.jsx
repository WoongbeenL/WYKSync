// Main app file that decides which page to show and keeps track of auth state.
import Navbar from "./components/Navbar";
import Overlay from "./pages/Overlay";
import Tournaments from "./pages/Tournaments";
import Vetoes from "./pages/Vetoes";
import TeamProfile from "./pages/TeamProfile";
import Home from "./pages/Home";
import Footer from "./components/Footer";
import Login from "./pages/Login";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";

const backendUrl = (import.meta.env.VITE_BACKEND_URL || "").replace(/\/$/, "");

// App is basically acting like our page router and auth manager.
function App() {
  const [user, setUser] = useState(null);
  const [displayIdentity, setDisplayIdentity] = useState("");
  const [path, setPath] = useState(window.location.pathname);
  const resolvedPath = path === "/login" && user ? "/tournament" : path;

  // This grabs the nicer display name from the backend if the user has one saved.
  const fetchDisplayIdentity = async (token, fallbackEmail) => {
    if (!backendUrl || !token) return fallbackEmail || "";

    try {
      const response = await fetch(`${backendUrl}/me`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) return fallbackEmail || "";

      const meData = await response.json();
      const displayName = String(meData?.display_name || "").trim();
      return displayName || fallbackEmail || "";
    } catch {
      return fallbackEmail || "";
    }
  };

  // This keeps our local auth state in sync with whatever Supabase says the session is.
  const syncUserFromSession = async (session) => {
    const email = session?.user?.email || null;
    setUser(email);

    if (!email) {
      setDisplayIdentity("");
      return;
    }

    const resolvedDisplayIdentity = await fetchDisplayIdentity(
      session?.access_token,
      email
    );
    setDisplayIdentity(resolvedDisplayIdentity);
  };

  useEffect(() => {
    // Listen for browser back/forward navigation so the page updates correctly.
    const handleRouteChange = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    // Load the saved session on page refresh so the user stays logged in.
    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      await syncUserFromSession(data.session || null);
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        await syncUserFromSession(session || null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    // Logged-in users should not stay on the login page, so we push them forward.
    if (path === "/login" && user) {
      window.history.replaceState({}, "", "/tournament");
      window.dispatchEvent(new Event("popstate"));
    }
  }, [path, user]);

  // Logs the user out and clears the auth bar right away.
  const handleLogout = async () => {
    if (!supabase) {
      setUser(null);
      setDisplayIdentity("");
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
    setDisplayIdentity("");
  };

  // Re-checks the current session after login or profile changes.
  const handleLogin = async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    await syncUserFromSession(data.session || null);
  };

  // This switch chooses which page component should render for the current path.
  let page;
  switch (resolvedPath) {
    case "/tournament":
      page = <Tournaments user={user} />;
      break;
    case "/vetoes":
      page = <Vetoes />;
      break;
    case "/overlay":
      page = <Overlay />;
      break;
    case "/team-profile":
      page = <TeamProfile user={user} onProfileUpdated={handleLogin} />;
      break;
    case "/login":
      page = <Login onLogin={handleLogin} />;
      break;
    case "/":
    case "/home":
      page = <Home />;
      break;
    default:
      page = <Home />;
      break;
  }
  return (
    <>
      <Navbar />
      {/* Small auth bar under the navbar so users can see their login status. */}
      <div className="auth-bar">
      {user ? (
        <>
          <span>Logged in as {displayIdentity || user}</span>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <a href="/login">Login</a>
      )}
    </div>
      {/* Home gets a different wrapper so it can use the full page layout. */}
      <div
        className={
          resolvedPath === "/" || resolvedPath === "/home"
            ? ""
            : resolvedPath === "/vetoes"
              ? "container container-vetoes"
              : "container"
        }
      >
        {page}
      </div>
      <Footer />
    </>
  );
}

export default App;
