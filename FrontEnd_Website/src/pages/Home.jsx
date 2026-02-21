import "./home.css";

export default function Home() {
  const teamMembers = [
    {
      role: "Frontend Developer",
      name: "Kristin Theoret",
      linkedin: "https://www.linkedin.com/in/kristin-theoret/",
    },
    {
      role: "Backend Developer",
      name: "Will Lee",
      linkedin: "https://www.linkedin.com/in/insert-will-linkedin/",
    },
    {
      role: "Team Lead Developer",
      name: "Ygnacio Maza Sanchez",
      linkedin: "https://www.linkedin.com/in/insert-ygnacio-linkedin/",
    },
  ];

  return (
    <div className="home">
      <section className="hero">
        <h1>WYKSync</h1>
        <h3>Real-Time Valorant Broadcast Overlays</h3>
        <p>
          WYKSync is an esports broadcast management system developed for the PROG3321 Systems Project course.
        </p>
        <div className="hero-buttons">
            <button onClick={() => (window.location.href = "/overlay")}>Launch Overlay</button>
            <button>Observer Login</button>
        </div>  
      </section>
    <section className="section">
      <h2>The Problem</h2>
      <p>
        WYKSync was created to simplify and help improve esports and collegiate broadcasts.

        Live productions often require multiple tools to manage tournaments, match data, overlays, and statistics making a lot of manual input required for the broadcast teams.
        This increases the risk of human error, and adds stress to production teams during live events.

        The purpose of WYKSync is to bring all the tools needed to run an event in one place allowing production staff to focus on gameplay and viewer experience rather than manual data entry.
      </p>
      
      <h2>Our Solution</h2>
      <p>
        WYKSync provides an all-in-one broadcast management system that integrates tournament organization, live match data, and overlay control.
        We are also upgrading and modifying existing overlay controls to improve the observers experience such as the ability to keep HUD controls from the game like player correspondance to number keeping it only on the observers side as well as keeping observers information such as timeouts and tech pauses.
    
      </p>
    </section>
    
    <section className="features">
      <h2>Platform Features</h2>
      <ul>
        <li>Manage Tournaments</li>
        <li>Manage Teams</li>
        <li>Manage Matches</li>
        <li>Manage Statistics</li>
        <li>Manage Vetoes</li>
        <li>Manage Overlay</li>
        <li>Pull live Match data</li>
      </ul>
    </section>

    <section className="meet">
      <h2>Meet the Team</h2>
      <p className="meet-subtitle">
        Built by a student team of three developers with hands-on experience in esports production.
      </p>

      <div className="team-grid">
        {teamMembers.map((member) => (
          <article key={member.name} className="team-card">
            <p className="team-role">{member.role}</p>
            <h3>{member.name}</h3>
            <a
              href={member.linkedin}
              target="_blank"
              rel="noopener noreferrer"
              className="team-link"
            >
              LinkedIn Profile
            </a>
          </article>
        ))}
      </div>

      <h2>Ready to start broadcasting smarter?</h2>
      <div className="hero-buttons">
        <button onClick={() => (window.location.href = "/overlay")}>Open Overlay Demo</button>
        <button>Contact Us</button>
      </div>
    </section>
  </div>
  );
}
