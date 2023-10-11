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
                        <li><Link to="/">Home</Link></li>
                        <li><Link to="/about">About</Link></li>
                        <i className="fas fa-share-alt" onClick={handleShareClick}></i>
                    </ul>
                </nav>
            </div>

            <div class="menu-bg" id="menu-bg"></div>

            <div className='sliding-text'>
                <span>"It's right on the tip of my tongue... that film... Oh, why can't I remember? The one with that scene in the rain? Ugh, this is driving me nuts. It's so vivid in my mind! I can see the characters, the settings, the plot twists... but what's its name? What's its name? Come on, brain. It's not that obscure indie film, not that blockbuster from last summer. Gah! I can almost hear the title, in there somewhere. Why can't I just remember it? Every time I think I'm close, it slips away. What's the name? What's the name? It's going to bother me all day if I don't figure this out. What's the name of that darn movie?"</span>
            </div>
            <a href="/">
                <img className="site-logo" src={logo} alt="Logo" />
            </a>
        </header >
    );
}

export default Header;
