import React from 'react';
import Header from './components/Header';
import Footer from './components/Footer';
import MainContent from './components/maincontent';

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