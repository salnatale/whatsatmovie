import React, { useState, useEffect } from 'react';
import '../Flicktionary.css';

function Flicktionary() {
    const [guess, setGuess] = useState('');
    const [guesses, setGuesses] = useState(() => {
        const saved = localStorage.getItem('flicktionary-guesses');
        return saved ? JSON.parse(saved) : [];
    });
    const [gameWon, setGameWon] = useState(() => {
        const saved = localStorage.getItem('flicktionary-gameWon');
        return saved ? JSON.parse(saved) : false;
    });

    // The daily target movie (for stats & hints)
    const [todayMovie, setTodayMovie] = useState(null);
    // The movie to reveal when the user wins or gives up
    const [secretMovie, setSecretMovie] = useState(() => {
        const saved = localStorage.getItem('flicktionary-secretMovie');
        return saved ? JSON.parse(saved) : null;
    });

    const [loading, setLoading] = useState(false);
    const [hint, setHint] = useState(() => {
        const saved = localStorage.getItem('flicktionary-hint');
        return saved ? JSON.parse(saved) : null;
    });
    const [stats, setStats] = useState(null);
    // Add this to your state variables
    const [fetchError, setFetchError] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);
    // On mount, fetch today's movie & stats
    // Then update your useEffect
    useEffect(() => {
        (async () => {
            setFetchLoading(true);
            setFetchError(false);

            const apiUrl = process.env.REACT_APP_API_URL;
            try {
                const resp = await fetch(`${apiUrl}/api/flicktionary/today`);
                const { movie, stats } = await resp.json();
                setTodayMovie(movie);
                setStats(stats);
            } catch (err) {
                console.error("Failed to load today's movie:", err);
                setFetchError(true);
            } finally {
                setFetchLoading(false);
            }
        })();
    }, []);

    // Persist to localStorage when relevant state changes
    useEffect(() => {
        localStorage.setItem('flicktionary-guesses', JSON.stringify(guesses));
    }, [guesses]);
    useEffect(() => {
        localStorage.setItem('flicktionary-gameWon', JSON.stringify(gameWon));
    }, [gameWon]);
    useEffect(() => {
        localStorage.setItem('flicktionary-secretMovie', JSON.stringify(secretMovie));
    }, [secretMovie]);
    useEffect(() => {
        localStorage.setItem('flicktionary-hint', JSON.stringify(hint));
    }, [hint]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!guess.trim()) return;

        setLoading(true);
        try {
            const apiUrl = process.env.REACT_APP_API_URL;
            const response = await fetch(`${apiUrl}/api/flicktionary/guess`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
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
                setGameWon(false);
            }
        } catch (error) {
            console.error("Error giving up:", error);
        }
    };

    // Clears stored game state & reloads for tomorrow
    const resetGame = () => {
        localStorage.removeItem('flicktionary-guesses');
        localStorage.removeItem('flicktionary-gameWon');
        localStorage.removeItem('flicktionary-secretMovie');
        localStorage.removeItem('flicktionary-hint');
        window.location.reload();
    };
    // build the display order:
    const displayGuesses = guesses.length > 1
        ? [
            // always keep the newest guess at the top
            guesses[0],
            // then sort the remaining guesses by similarity descending
            ...guesses
                .slice(1)
                .sort((a, b) =>
                    parseFloat(b.similarity) - parseFloat(a.similarity)
                )
        ]
        : guesses;

    return (
        <div className="flicktionary-container">
            <h1>Flicktionary</h1>

            {fetchLoading ? (
                <p>Loading your daily movie…</p>
            ) : fetchError ? (
                <p>Failed to load today's movie. Please try refreshing the page.</p>
            ) : stats && todayMovie ? (
                <p>
                    The nearest description has a similarity of {stats.nearest}%,
                    the tenth‑nearest has {stats.tenth}%, and the thousandth nearest
                    has {stats.thousandth}%.
                </p>
            ) : (
                <p> Error fetching todays movie statistics.</p>
            )}

            {/* Form until user reveals or wins */}
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
                    <button onClick={resetGame}>Play Again Tomorrow</button>
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
                    <p>
                        Hint: The movie title starts with "{hint.firstLetter}"
                        and was released in {hint.year}.
                    </p>
                </div>
            )}

            {guesses.length > 0 && (
                <div className="guesses-container">
                    <table className="guesses-table">
                        <thead>
                            <tr>
                                <th>#</th><th>Guess</th><th>Similarity</th><th>Proximity</th>
                            </tr>
                        </thead>
                        <tbody>
                            {displayGuesses.map((g, i) => (
                                <tr
                                    key={g.number}
                                    className={
                                        `proximity-${g.proximity.replace(' ', '-')}` +
                                        (i === 0 ? ' recent' : '')
                                    }
                                >
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
