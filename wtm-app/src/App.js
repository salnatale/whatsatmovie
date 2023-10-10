import React from 'react';
import Header from './components/Header.js';
import Footer from './components/Footer.js';
import MainContent from './components/MainContent.js';

import './App.css';
import logo from './logo.png';


function App() {
    return (

        <div className="app">
            <Header logoSrc={logo} />
            <MainContent />
            <Footer />
        </div>

    );
}

export default App;