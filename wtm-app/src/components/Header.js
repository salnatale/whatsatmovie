import React from 'react';
import { Link } from 'react-router-dom';  // Importing the Link component for navigation
import logo from '../logo.png';

const menuOnClick = () => {
    const menuBar = document.getElementById("menu-bar");
    const nav = document.getElementById("nav");
    const menuBg = document.getElementById("menu-bg");

    if (menuBar) menuBar.classList.toggle("change");
    if (nav) nav.classList.toggle("change");
    if (menuBg) menuBg.classList.toggle("change-bg");
};
const handleShareClick = () => {
    if (navigator.share) {
        navigator.share({
            title: 'What\'s That Movie?',
            text: 'Check out this awesome movie discovery app!',
            url: window.location.href,
        })
            .then(() => console.log('Successful share'))
            .catch((error) => {
                console.log('Error sharing:', error);
                showFallbackShare();  // Call the fallback function on error
            });
    } else {
        console.log('Web Share API is not supported in your browser.');
        showFallbackShare();  // Call the fallback function if the API is not supported
    }
};
const showFallbackShare = async () => {
    try {
        await navigator.clipboard.writeText(window.location.href);
        alert('URL copied to clipboard! Share it wherever you like.');
    } catch (err) {
        console.error('Failed to copy: ', err);
        alert('Failed to copy the URL. Please copy it manually.');
    }
};
function Header() {
    return (
        <header className='app-header'>
            <div id="menu">
                <div id="menu-bar" onClick={menuOnClick}>
                    <div id="bar1" class="bar"></div>
                    <div id="bar2" class="bar"></div>
                    <div id="bar3" class="bar"></div>
                </div>
                <nav class="nav" id="nav">
                    <ul>
                        <i className="fas fa-share-alt" onClick={handleShareClick}></i>
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/about">About</Link></li>

                    </ul>
                </nav>
            </div>

            <div class="menu-bg" id="menu-bg"></div>

            <div className='sliding-text'>
                {/* <span>There once was a ship that put to sea
            The name of the ship was the Billy O' Tea
            The winds blew up, her bow dipped down
            Oh blow, my bully boys, blow ...  Soon may the
            Wellerman come
            To bring us sugar and tea and rum
            One day, when the tonguing is done
            We'll take our leave and go ...
            She'd not been two weeks from shore
            When down on her a right whale bore
            The captain called all hands and swore
            He'd take that whale in tow ... Soon may the Wellerman come
            To bring us sugar and tea and rum
            One day, when the tonguing is done
            We'll take our leave and go</span> */}
            </div>
            <a href="/">
                <img className="site-logo" src={logo} alt="Logo" />
            </a>
        </header >
    );
}

export default Header;
