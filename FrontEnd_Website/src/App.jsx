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

function App() {
  const [user, setUser] = useState(null);
  const [displayIdentity, setDisplayIdentity] = useState("");
  const [path, setPath] = useState(window.location.pathname);
  const resolvedPath = path === "/login" && user ? "/tournaments" : path;

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
    const handleRouteChange = () => setPath(window.location.pathname);
    window.addEventListener("popstate", handleRouteChange);
    return () => window.removeEventListener("popstate", handleRouteChange);
  }, []);

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

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
    if (path === "/login" && user) {
      window.history.replaceState({}, "", "/tournaments");
      setPath("/tournaments");
    }
  }, [path, user]);

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

  const handleLogin = async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    await syncUserFromSession(data.session || null);
  };

  let page;
  switch (resolvedPath) {
    case "/tournaments":
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
      <Footer/>
    </>
  );
}

export default App;
