import React, { useState } from 'react';
import '../Flicktionary.css';

function Flicktionary() {
    const [guess, setGuess] = useState('');
    const [guesses, setGuesses] = useState([]);
    const [gameWon, setGameWon] = useState(false);
    const [secretMovie, setSecretMovie] = useState(null);
    const [loading, setLoading] = useState(false);
    const [hint, setHint] = useState(null);
    
    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!guess.trim()) return;
        
        setLoading(true);
        try {
            const apiUrl = process.env.REACT_APP_API_URL;
            const response = await fetch(`${apiUrl}/api/flicktionary/guess`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ guess: guess.trim() }),
            });
            
            const data = await response.json();
            
            if (data.success) {
                const newGuess = {
                    number: guesses.length + 1,
                    text: guess,
                    similarity: data.similarity,
                    proximity: data.proximity
                };
                
                setGuesses([newGuess, ...guesses]);
                setGuess('');
                
                if (data.correct) {
                    setGameWon(true);
                    setSecretMovie(data.movie);
                }
            }
        } catch (error) {
            console.error("Error submitting guess:", error);
        } finally {
            setLoading(false);
        }
    };
    
    const getHint = async () => {
        try {
            const apiUrl = process.env.REACT_APP_API_URL;
            const response = await fetch(`${apiUrl}/api/flicktionary/hint`);
            const data = await response.json();
            
            if (data.success) {
                setHint(data.hint);
            }
        } catch (error) {
            console.error("Error getting hint:", error);
        }
    };
    
    const giveUp = async () => {
        try {
            const apiUrl = process.env.REACT_APP_API_URL;
            const response = await fetch(`${apiUrl}/api/flicktionary/give-up`);
            const data = await response.json();
            
            if (data.success) {
                setSecretMovie(data.movie);
                setGameWon(false); // They didn't win, they gave up
            }
        } catch (error) {
            console.error("Error giving up:", error);
        }
    };
    
    return (
        <div className="flicktionary-container">
            <h1>Flicktionary</h1>
            
            <div className="top-info">
                <p>The nearest description has a similarity of 55.05, the tenth-nearest has a similarity of 42.29, and the thousandth nearest has a similarity of 24.9</p>
                <p>Game #{new Date().toISOString().split('T')[0]}</p> {/* Use date as game number */}
            </div>
            
            {!secretMovie ? (
                <form onSubmit={handleSubmit} className="guess-form">
                    <input
                        type="text"
                        value={guess}
                        onChange={(e) => setGuess(e.target.value)}
                        placeholder="Describe the movie..."
                        disabled={loading || gameWon}
                    />
                    <button type="submit" disabled={loading || gameWon}>
                        Guess
                    </button>
                </form>
            ) : (
                <div className="secret-movie">
                    <h2>{secretMovie.title} ({secretMovie.year})</h2>
                    <p>{secretMovie.plot}</p>
                    <button onClick={() => window.location.reload()}>Play Again Tomorrow</button>
                </div>
            )}
            
            {!secretMovie && (
                <div className="hint-buttons">
                    <button onClick={getHint} disabled={!!hint}>Hint</button>
                    <button onClick={giveUp}>Give Up</button>
                </div>
            )}
            
            {hint && (
                <div className="hint-box">
                    <p>Hint: The movie title starts with "{hint.firstLetter}" and was released in {hint.year}.</p>
                </div>
            )}
            
            {guesses.length > 0 && (
                <div className="guesses-container">
                    <table className="guesses-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Guess</th>
                                <th>Similarity</th>
                                <th>Proximity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {guesses.map((g) => (
                                <tr key={g.number} className={`proximity-${g.proximity.replace(' ', '-')}`}>
                                    <td>{g.number}</td>
                                    <td>{g.text}</td>
                                    <td>{g.similarity}</td>
                                    <td>({g.proximity})</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
            
            <div className="game-instructions">
                <h3>How to play?</h3>
                <p>The objective is to guess the secret movie.</p>
                <p>Enter descriptions of movies, and we'll tell you how semantically similar your description is to the secret movie.</p>
                <p>Unlike traditional movie guessing games, this is about the meaning and themes rather than just the title.</p>
                <p>You have unlimited guesses! Good luck!</p>
            </div>
        </div>
    );
}

export default Flicktionary;