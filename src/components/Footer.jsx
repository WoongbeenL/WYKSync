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
                        <h4>For Business</h4>
                        <a href="/employer">
                            <p>Employer</p>
                        </a>
                        <a href="/emp">
                            <p>Emp</p>
                        </a>
                        <a href="/individual">
                            <p>Individual</p>
                        </a>
                    </div>
                    <div className="sb__footer-links-div">
                        <h4>Resources</h4>
                        <a href="/resource">
                            <p>Resource Center</p>
                        </a>
                        <a href="/resource">
                            <p>Testimonials</p>
                        </a>
                        <a href="/resource">
                            <p>STV</p>
                        </a>
                    </div>
                    <div className="sb__footer-links-div">
                        <h4>Partners</h4>
                        <a href="/employer">
                            <p>Lead Developer</p>
                        </a>
                    </div>
                    <div className="sb__footer-links-div">
                        <h4>Company</h4>
                        <a href="/about">
                            <p>About</p>
                        </a>
                        <a href="/press">
                            <p>Press</p>
                        </a>
                        <a href="/career">
                            <p>Career</p>
                        </a>
                         <a href="/contact">
                            <p>Contact</p>
                        </a>
                    </div>
                    <div className="sb__footer-links-div">
                        <h4>Coming soon on</h4>
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