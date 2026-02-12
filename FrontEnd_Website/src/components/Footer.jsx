import React from "react";
import './footer.css';
import fb from '../assets/fb.png';
import twitter from '../assets/twitter.png';
import linkedin from '../assets/linkedin.webp';
import instagram from '../assets/insta.webp';

const Footer=()=>{
    return (
        <div className="footer">
            <div className="sb__footer section_padding">
                <div className="sb__footer-links">
                    <div className="sb__footer-links-div">
                        <h4>Platform</h4>
                        <a href="/overlay">
                            <p>Live Overlay</p>
                        </a>
                        <a href="/leaderboard">
                            <p>Leaderboards</p>
                        </a>
                        <a href="/vetos">
                            <p>Vetos</p>
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
                    <div className="sb__footer-links-div">
                        <h4>Follow Us</h4>
                        <div className="socialmedia">
                            <p><img src={fb} alt=""/></p>
                            <p><img src={twitter} alt=""/></p>
                            <p><img src={linkedin} alt=""/></p>
                            <p><img src={instagram} alt=""/></p>
                        </div>
                    </div>
                </div>
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