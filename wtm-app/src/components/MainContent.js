import React from 'react';
import { Route, Switch } from 'react-router-dom';
import HomePage from '../pages/HomePage.js';
import AboutPage from '../pages/AboutPage.js';
import Flicktionary from '../pages/Flicktionary.js';

function MainContent() {
    return (
        <div className="app-content">
            <Switch>
                <Route path="/about" component={AboutPage} />
                <Route path="/flicktionary" component={Flicktionary} />
                <Route path="/" exact component={HomePage} />
                {/* ... other routes */}
            </Switch>
        </div>
    );
}

export default MainContent;
