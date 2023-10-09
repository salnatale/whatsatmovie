import React, { useState } from 'react';
import './App.css';

function App() {
  const [response, setResponse] = useState('');
  const [success, setSuccess] = useState(true);

  const [inputText, setInputText] = useState('');
  const [movies, setMovies] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!inputText.trim()) {
      return; // Exit early if input is empty or whitespace only
    }
    setLoading(true);

    const apiUrl = process.env.REACT_APP_API_URL;
    console.log(apiUrl);

    try {
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: inputText,
        }),
      });
      const data = await res.json();
      if (data.success === false) {
        setSuccess(false);
        setMovies([]); // Clear any previous movies
      } else {
        setSuccess(true);
        setMovies(data.movies);
      }
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };
  const handleRetry = () => {
    // Clear previous movies or any error messages
    setMovies([]);
    setSuccess(true); // Reset success state if you want to hide the error message and show the input again
    setInputText(''); // Clear the input text or leave it as is depending on your UX choice

    // Optionally, refocus the input field for user convenience
    // This requires a useRef hook for the input element
    // inputRef.current.focus();
  };
  const renderStars = (rating) => {
    if (isNaN(rating) || rating < 0 || rating > 10) {
      return <span>Invalid Rating</span>;
    }

    const fullStars = Math.floor(rating / 2);
    const halfStar = rating % 2 >= 0.5 ? 1 : 0;
    const emptyStars = 5 - fullStars - halfStar;

    return (
      <div className="stars">
        {Array(fullStars).fill().map((_, i) => (
          <i key={i} className="fa fa-star" />
        ))}
        {halfStar ? <i className="fa fa-star-half-o" /> : null}
        {Array(emptyStars).fill().map((_, i) => (
          <i key={i + fullStars} className="fa fa-star-o" />
        ))}
      </div>
    );
  };
  return (
    <div className="app">
      <h1 style={{ cursor: 'pointer' }} onClick={() => window.location.href = '/'}>What's That Movie?</h1>

      <div className="input-container">
        <input
          type="text"
          placeholder="Describe the Movie..."
          value={inputText}
          onChange={e => setInputText(e.target.value)}
        />
        <button onClick={handleSubmit} disabled={loading}>
          {loading ? "Loading..." : "Enter"}
        </button>
      </div>
      <div className="container"> {/* Add the container div */}
        {success ? (
          <div className="movies">
            {movies.map(movie => (
              <div key={movie.imdbID} className="movie-card">
                <img className="movie-poster" src={movie.Poster} alt={movie.Title} />
                <div className="movie-details">
                  <h2>{movie.Title} ({movie.Year})</h2>
                  <p>{movie.Plot}</p>
                  <p>Actors: {movie.Actors}</p>
                  <div className="movie-rating">
                    {renderStars(Number(movie.imdbRating))}
                    <span> {movie.imdbRating}</span>
                  </div>
                </div>
              </div>
            ))}

          </div>
        ) : (
          <div className="error-message">
            <h3>No movies found based on the given description. Please try again with more details.</h3>
            {/* Optional retry button */}
            <div className="retry-container">
              <button onClick={handleRetry}>Retry</button>
            </div>
          </div>
        )}
      </div>
      {movies.length > 0 && (
        <h3>Not what you were looking for? Please refine search to add more movie-specific detail.</h3>
      )}
    </div >
  );
}

export default App;
