import React, { useState, useEffect } from 'react';
import '../Flicktionary.css';

function levenshtein(a, b) {
    const matrix = [];
    const lenA = a.length;
    const lenB = b.length;

    for (let i = 0; i <= lenB; i++) {
        matrix[i] = [i];
    }
    for (let j = 0; j <= lenA; j++) {
        matrix[0][j] = j;
    }

    for (let i = 1; i <= lenB; i++) {
        for (let j = 1; j <= lenA; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j - 1] + 1
                );
            }
        }
    }

    return matrix[lenB][lenA];
}

function Flicktionary() {
    const [guess, setGuess] = useState('');
    const [titleGuess, setTitleGuess] = useState('');
    const [guesses, setGuesses] = useState(() => {
        const saved = localStorage.getItem('flicktionary-guesses');
        return saved ? JSON.parse(saved) : [];
    });
    const [gameWon, setGameWon] = useState(() => {
        const saved = localStorage.getItem('flicktionary-gameWon');
        return saved ? JSON.parse(saved) : false;
    });
    const [todayMovie, setTodayMovie] = useState(null);
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
    const [fetchError, setFetchError] = useState(false);
    const [fetchLoading, setFetchLoading] = useState(true);

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

    const handleTitleGuess = () => {
        if (!titleGuess.trim()) return;

        const normalizedGuess = titleGuess.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
        const normalizedAnswer = todayMovie?.title?.toLowerCase().replace(/[^a-z0-9]/g, '');

        const distance = levenshtein(normalizedGuess, normalizedAnswer);
        const threshold = Math.ceil(normalizedAnswer.length * 0.2);

        if (distance <= threshold) {
            setGameWon(true);
            setSecretMovie(todayMovie);
        } else {
            alert(`Not quite! You're ${distance} edits away from the correct title.`);
        }

        setTitleGuess('');
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

    const resetGame = () => {
        localStorage.removeItem('flicktionary-guesses');
        localStorage.removeItem('flicktionary-gameWon');
        localStorage.removeItem('flicktionary-secretMovie');
        localStorage.removeItem('flicktionary-hint');
        window.location.reload();
    };

    const displayGuesses = guesses.length > 1
        ? [
            guesses[0],
            ...guesses.slice(1).sort((a, b) => parseFloat(b.similarity) - parseFloat(a.similarity))
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
                <p> Error fetching today's movie statistics.</p>
            )}

            {!secretMovie && (
                <div className="guess-section">
                    <h2>Describe the Movie</h2>
                    <form onSubmit={handleSubmit} className="guess-form">
                        <input
                            type="text"
                            value={guess}
                            onChange={(e) => setGuess(e.target.value)}
                            placeholder="Enter a thematic description..."
                            disabled={loading || gameWon}
                        />
                        <button type="submit" disabled={loading || gameWon} className={loading ? 'loading' : ''}>Guess</button>
                    </form>

                    <h3 className="or-separator">— or —</h3>

                    <h2>Guess the Title</h2>
                    <div className="title-guess-form">
                        <input
                            type="text"
                            value={titleGuess}
                            onChange={(e) => setTitleGuess(e.target.value)}
                            placeholder="Enter the movie title..."
                            disabled={loading || gameWon}
                        />
                        <button
                            type="button"
                            onClick={handleTitleGuess}
                            disabled={loading || gameWon}
                            className={loading ? 'loading' : ''}
                        >
                            Submit Title Guess
                        </button>
                    </div>

                    <div className="game-controls">
                        <button onClick={getHint} disabled={!!hint || loading} className={loading ? 'loading' : ''}>
                            {loading ? 'Loading Hint...' : 'Hint'}
                        </button>
                        <button onClick={giveUp} disabled={loading} className={loading ? 'loading' : ''}>
                            {loading ? 'Revealing...' : 'Give Up'}
                        </button>
                    </div>
                </div>
            )}

            {secretMovie && (
                <div className="secret-movie">
                    <h2>{secretMovie.title} ({secretMovie.year})</h2>
                    <p>{secretMovie.plot}</p>
                    <div className="result-summary">
                        <strong>You guessed it in {guesses.length} {guesses.length === 1 ? 'guess' : 'guesses'}!</strong>
                    </div>
                    <button onClick={resetGame}>Play Again Tomorrow</button>
                </div>
            )}


            {hint && (
                <div className="hint-box">
                    <p>
                        Hint: The movie title starts with "{hint.firstLetter}" and was released in {hint.year}.
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
                                    className={`proximity-${g.proximity.replace(' ', '-')}${i === 0 ? ' recent' : ''}`}
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
                <p>You can also try guessing the exact movie title directly!</p>
                <p>You have unlimited guesses! Good luck!</p>
            </div>
        </div>
    );
}

export default Flicktionary;
