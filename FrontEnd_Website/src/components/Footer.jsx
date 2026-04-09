// Footer shows extra project links and the social icons at the bottom of the page.
import React from "react";
import './footer.css';

// Keeping this as a small reusable footer component makes the layout cleaner.
const Footer=()=>{
    return (
        <div className="footer">
            <div className="sb__footer section_padding">
                {/* The footer is split into columns so links are easier to scan. */}
                <div className="sb__footer-links">
                    {/* These columns are grouped so the footer feels more organized. */}
                    <div className="sb__footer-links-div">
                        <h4>Platform</h4>
                        <a href="/overlay">
                            <p>Live Overlay</p>
                        </a>
                        <a href="/vetoes">
                            <p>Vetoes</p>
                        </a>
                    </div>
                    <div className="sb__footer-links-div">
                        <h4>Broadcast</h4>
                        <a href="/overlay">
                            <p>Observer Tools</p>
                        </a>
                        <a href="/overlay">
                            <p>Live Match Data</p>
                        </a>
                        <a href="/overlay">
                            <p>HUD Control</p>
                        </a>
                        <a href="/overlay">
                            <p>Scoreboards</p>
                        </a>
                    </div>
                    <div className="sb__footer-links-div">
                        <h4>Developers</h4>
                        <a href="/about">
                            <p>About the Project</p>
                        </a>
                        <a href="/about">
                            <p>Tech Stack</p>
                        </a>
                        <a href="/about">
                            <p>GitHub</p>
                        </a>
                        <a href="/about">
                            <p>API Docs</p>
                        </a>
                    </div>
                    <div className="sb__footer-links-div">
                        <h4>WYKSync</h4>
                        <a href="/about">
                            <p>Our Team</p>
                        </a>
                         <a href="/about">
                            <p>Capstone</p>
                        </a>
                        <a href="/about">
                            <p>Press Kit</p>
                        </a>
                         <a href="/contact">
                            <p>Contact Us</p>
                        </a>
                    </div>
                </div>
                {/* Simple divider before the copyright line. */}
                <hr></hr>
                <div className="sb__footer-below"></div>
                <div className="sb__footer-copyright">
                    <p>
                        @{(new Date().getFullYear())} WYKSync. All right reserved.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Footer
