import React from 'react';
import Header from './components/Header.js';
import Footer from './components/Footer.js';
import MainContent from './components/MainContent.js';

import {
    BrowserRouter as Router
} from 'react-router-dom';

import './App.css';


function App() {
    return (
        <Router>
            <div className="app">
                <Header />
                <MainContent />
                <Footer />
            </div>
        </Router>

    );
}

export default App;