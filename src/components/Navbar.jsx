import { Children } from "react";
import fishImg from "../assets/fish.jpg";

export default function Navbar() {
  return (
    <nav className="nav">
      <img src={fishImg} alt="Logo" className="logo" />
      <a href="/" className="site-title">
        WYKSync
      </a>
      <ul>
        <CustomLink href="/home">Home</CustomLink>
        <CustomLink href="/tournaments">Tournaments</CustomLink>
        <CustomLink href="/overlay">Overlay Demo</CustomLink>
        <CustomLink href="/leaderboard">Leaderboard</CustomLink>
        <CustomLink href="/vetos">Vetos</CustomLink>
      </ul>
    </nav>
  );
}

function CustomLink({ href, children, ...props }) {
  const path = window.location.pathname;
  return (
    <li className={path === href ? "active" : ""}>
      <a href={href} {...props}>
        {children}
      </a>
    </li>
  );
}
