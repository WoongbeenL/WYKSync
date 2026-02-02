import Navbar from "./components/Navbar";
import Leaderboard from "./pages/Leaderboard";
import Overlay from "./pages/Overlay";
import Tournaments from "./pages/Tournaments";
import Vetos from "./pages/Vetos";
import Home from "./pages/Home";
import Footer from "./components/Footer";


function App() {
  let Component;
  switch (window.location.pathname) {
    case "/tournaments":
      Component = Tournaments;
      break;
    case "/leaderboard":
      Component = Leaderboard;
      break;
    case "/vetos":
      Component = Vetos;
      break;
    case "/overlay":
      Component = Overlay;
      break;
    case "/":
    case "/home":
      Component = Home;
      break;
  }
  return (
    <>
      <Navbar />
      <div className={Component === Home ? "" : "container"}>
        <Component />
      </div>
      <Footer/>
    </>
  );
}

export default App;
