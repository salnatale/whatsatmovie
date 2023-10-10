import React, { useState } from 'react';
import './App.css';
import logo from './logo.png';

function App() {
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
    // const apiUrl = 'https://goldfish-app-78svx.ondigitalocean.app/api/generate-text'
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

  const handleShareClick = () => {
    if (navigator.share) {
      navigator.share({
        title: 'What\'s That Movie?',
        text: 'Check out this awesome movie discovery app!',
        url: window.location.href,
      })
        .then(() => console.log('Successful share'))
        .catch((error) => {
          console.log('Error sharing:', error);
          showFallbackShare();  // Call the fallback function on error
        });
    } else {
      console.log('Web Share API is not supported in your browser.');
      showFallbackShare();  // Call the fallback function if the API is not supported
    }
  };
  const showFallbackShare = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      alert('URL copied to clipboard! Share it wherever you like.');
    } catch (err) {
      console.error('Failed to copy: ', err);
      alert('Failed to copy the URL. Please copy it manually.');
    }
  };
  function StreamingDropdown() {
    const [isOpen, setIsOpen] = useState(false); // State to toggle dropdown visibility

    const countries = ["USA", "Canada", "UK", "Australia", "India"]; // Example country list, modify as needed

    return (
      <div className="streaming-dropdown">
        <button onClick={() => setIsOpen(!isOpen)}>Where to watch ▼ </button>
        {isOpen && (
          <ul className="country-list">
            {countries.map(country => (
              <li key={country}>{country}</li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="app">
      <header className='app-header'>
        <a href="/">
          <img className="site-logo" src={logo} alt="Logo" />
        </a>
        <div className='sliding-text'>
          {/* <span>There once was a ship that put to sea
            The name of the ship was the Billy O' Tea
            The winds blew up, her bow dipped down
            Oh blow, my bully boys, blow ...  Soon may the
            Wellerman come
            To bring us sugar and tea and rum
            One day, when the tonguing is done
            We'll take our leave and go ...
            She'd not been two weeks from shore
            When down on her a right whale bore
            The captain called all hands and swore
            He'd take that whale in tow ... Soon may the Wellerman come
            To bring us sugar and tea and rum
            One day, when the tonguing is done
            We'll take our leave and go</span> */}
        </div>
        <i className="fas fa-share-alt" onClick={handleShareClick}></i>
      </header>
      <div className='app-content'>
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
                    <div className="movie-title-section">
                      <div className='movie-title-text'>
                        <h2>{movie.Title} ({movie.Year})</h2>
                      </div>
                      <StreamingDropdown />
                    </div>
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
        {
          movies.length > 0 && (
            <h3>Not what you were looking for? Please refine search to add more movie-specific detail.</h3>
          )
        }
      </div>
      <footer className="footer">
        <div className="footer-content">
          © 2023 What's That Movie?.  All rights reserved.
          <div className='donate-button'>
            <form action="https://www.paypal.com/donate" method="post" target="_top">
              <input type="hidden" name="business" value="B5KZCR5DRGUVE" />
              <input type="hidden" name="no_recurring" value="0" />
              <input type="hidden" name="item_name" value="All donations go towards helping supplement the costs I face running this webpage. Thanks for your support!" />
              <input type="hidden" name="currency_code" value="USD" />
              <input type="image" src="https://www.paypalobjects.com/en_US/i/btn/btn_donate_SM.gif" border="0" name="submit" title="PayPal - The safer, easier way to pay online!" alt="Donate with PayPal button" />
              <img alt="" border="0" src="https://www.paypal.com/en_US/i/scr/pixel.gif" width="1" height="1" />
            </form>
          </div>
        </div >
      </footer>
    </div >

  );
}

export default App;
