import "./home.css";

export default function Home() {
  return (
    <div className="home">
      <section className="hero">
        <h1>WYKSync</h1>
        <h3>Real-Time Valorant Broadcast Overlays</h3>
        <p>
          Short paragraph about our project. Short paragraph about our project. Short paragraph about our project. Short paragraph about our project.
        </p>
        <div className="hero-buttons">
            <button>Launch Overlay</button>
            <button>Observer Login</button>
        </div>  
      </section>
    <section className="section">
      <h2>The Problem</h2>
      <p>
        talk about manual input being an issue and using multiple tools to keep overlays updated needing the have brackets from tournament websites along with map vetos etc.
      </p>
      
      <h2>Our Solution</h2>
      <p>
        what we plan to fix and resolve. talk about the connection between this application and our overlay. talk about the vetos being more readable.
      </p>
    </section>
    
    <section className="features">
      <h2>Platform Features</h2>
      <p>insert features from our document report</p>
      <ul>
        <li>one</li>
        <li>two</li>
        <li>three</li>
        <li>four</li>
      </ul>
    </section>

    <section className="meet">
      <h2>Meet the Team</h2>
      <p>
        Built by a student team of three developers with hands on experiences within the esports production world.
      </p>

      <h2>Ready to start broadcasting smarter?</h2>
      <div className="hero-buttons">
        <button>Open Overlay Demo</button>
        <button>Contact Us</button>
      </div>
    </section>
  </div>
  );
}
