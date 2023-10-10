import React from 'react';
import { Route, Switch } from 'react-router-dom';
import HomePage from '../pages/HomePage.js';
import AboutPage from '../pages/AboutPage.js';

function MainContent() {
    return (
        <div className="app-content">
            <Switch>
                <Route path="/about" component={AboutPage} />
                <Route path="/" exact component={HomePage} />
                {/* ... other routes */}
            </Switch>
        </div>
    );
}

export default MainContent;
