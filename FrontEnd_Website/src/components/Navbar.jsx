// Navbar stays on every page and gives quick links to the main sections.
import logoImg from "../assets/WYKSync.png";

// Simple nav component for site branding and page links.
export default function Navbar() {
  return (
    <nav className="nav">
      {/* Left side keeps the logo and project name together as one brand block. */}
      <div className="nav-brand">
        <img src={logoImg} alt="Logo" className="logo" />
        <a href="/" className="site-title">
          WYKSync
        </a>
      </div>
      {/* Main site links live here so every page can be reached quickly. */}
      <ul>
        <CustomLink href="/home">Home</CustomLink>
        <CustomLink href="/team-profile">Team Profile</CustomLink>
        <CustomLink href="/tournament">Tournaments</CustomLink>
        <CustomLink href="/overlay">Overlay Demo</CustomLink>
        <CustomLink href="/vetoes">Vetoes</CustomLink>
      </ul>
    </nav>
  );
}

// This helper highlights the current page link in the nav.
function CustomLink({ href, children, ...props }) {
  const path = window.location.pathname;
  return (
    // When the path matches, we add the active class for the current-page highlight.
    <li className={path === href ? "active" : ""}>
      <a href={href} {...props}>
        {children}
      </a>
    </li>
  );
}
