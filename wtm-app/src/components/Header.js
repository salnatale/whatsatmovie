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
                <span>Ah, the whimsical world of cinema! You know, I was just pondering about that one film... oh, what was it? The one with the charismatic cactus who becomes the mayor of a bustling metropolis, only to discover that the city's water supply is actually... lemonade? No, that's not it.

                    Or perhaps it was the romantic drama where a sentient spaghetti falls in love with a rebellious meatball, and together they navigate the culinary complexities of a world dominated by health-conscious salads. The climax, set in a microwave, was nothing short of electromagnetic poetry.

                    Wait, no, it might've been that avant-garde post-post-modern neo-noir film where everyone speaks in Morse code, and the protagonist is a disillusioned detective who’s trying to solve the mystery of why socks keep disappearing from washing machines. The twist at the end? The socks were actually interdimensional travelers. Pure cinematic genius!

                    Ah, movies! Such a dazzling array of imagination and oddities. They capture the essence of our wildest dreams, making us laugh, cry, and question our very existence. But for the life of me, I can't recall the title of that one movie...</span>
            </div>
            <a href="/">
                <img className="site-logo" src={logo} alt="Logo" />
            </a>
        </header >
    );
}

export default Header;
