import Navbar from "./components/Navbar";
import Leaderboard from "./pages/Leaderboard";
import Overlay from "./pages/Overlay";
import Tournaments from "./pages/Tournaments";
import Vetos from "./pages/Vetos";
import Home from "./pages/Home";
import Footer from "./components/Footer";
import Login from "./pages/Login";
import { useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "./lib/supabaseClient";

function App() {
  
const [user, setUser] = useState(null);
  const path = window.location.pathname;

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      return;
    }

    const loadSession = async () => {
      const { data } = await supabase.auth.getSession();
      setUser(data.session?.user?.email || null);
    };

    loadSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user?.email || null);
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    if (!supabase) {
      setUser(null);
      return;
    }

    await supabase.auth.signOut();
    setUser(null);
  };

  let page;
  switch (path) {
    case "/tournaments":
      page = <Tournaments user={user} />;
      break;
    case "/leaderboard":
      page = <Leaderboard />;
      break;
    case "/vetos":
      page = <Vetos />;
      break;
    case "/overlay":
      page = <Overlay />;
      break;
    case "/login":
      page = <Login onLogin={setUser} />;
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
          <span>Logged in as {user}</span>
          <button onClick={handleLogout}>Logout</button>
        </>
      ) : (
        <a href="/login">Login</a>
      )}
    </div>
      <div className={path === "/" || path === "/home" ? "" : "container"}>
        {page}
      </div>
      <Footer/>
    </>
  );
}

export default App;
