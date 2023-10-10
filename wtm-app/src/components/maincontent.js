import React from 'react';
import { Route, Switch } from 'react-router-dom';
import HomePage from '../pages/HomePage';
import AboutPage from '../pages/AboutPage';
import ContactPage from '../pages/ContactPage';

function MainContent() {
    return (
        <div className="app-content">
            <Switch>
                <Route path="/about" component={AboutPage} />
                <Route path="/contact" component={ContactPage} />
                <Route path="/" exact component={HomePage} />
                {/* ... other routes */}
            </Switch>
        </div>
    );
}

export default MainContent;
