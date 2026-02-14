import Navbar from "./components/Navbar";
import Leaderboard from "./pages/Leaderboard";
import Overlay from "./pages/Overlay";
import Tournaments from "./pages/Tournaments";
import Vetos from "./pages/Vetos";
import Home from "./pages/Home";
import Footer from "./components/Footer";
import Login from "./pages/Login";
import { useState } from "react";

function App() {
  
const [user, setUser] = useState(null);

  let Component;
  switch (window.location.pathname) {
    case "/tournaments":
      Component = user ? Tournaments : Login;
      break;
    case "/leaderboard":
      Component = Leaderboard;
      break;
    case "/vetos":
      Component = user ? Vetos : Login;
      break;
    case "/overlay":
      Component = Overlay;
      break;
    case "/login":
      Component = () => <Login onLogin={setUser} />;
      break;
    case "/":
    case "/home":
      Component = Home;
      break;
  }
  return (
    <>
      <Navbar />
      <div className="auth-bar">
      {user ? (
        <>
          <span>Logged in as {user}</span>
          <button onClick={() => setUser(null)}>Logout</button>
        </>
      ) : (
        <a href="/login">Login</a>
      )}
    </div>
      <div className={Component === Home ? "" : "container"}>
        <Component />
      </div>
      <Footer/>
    </>
  );
}

export default App;
