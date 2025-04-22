// Add this component to src/components/MovieFeedback.js
import React, { useState } from 'react';

function MovieFeedback({ movieId, originalQuery }) {
  const [feedback, setFeedback] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const handleFeedback = async (isCorrect) => {
    setIsSubmitting(true);
    
    try {
      const apiUrl = `${process.env.REACT_APP_API_URL}/api/movie-feedback`;
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imdbID: movieId,
          isCorrect,
          query: originalQuery
        }),
      });
      
      if (response.ok) {
        setFeedback(isCorrect ? 'positive' : 'negative');
      } else {
        console.error('Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="movie-feedback">
      <p className="feedback-question">Was this the movie you were thinking of?</p>
      <div className="feedback-buttons">
        <button 
          className={`feedback-btn ${feedback === 'positive' ? 'active' : ''}`}
          onClick={() => handleFeedback(true)}
          disabled={isSubmitting || feedback !== null}
        >
          <i className="fa fa-thumbs-up"></i>
          Yes
        </button>
        <button 
          className={`feedback-btn ${feedback === 'negative' ? 'active' : ''}`}
          onClick={() => handleFeedback(false)}
          disabled={isSubmitting || feedback !== null}
        >
          <i className="fa fa-thumbs-down"></i>
          No
        </button>
      </div>
      {feedback && (
        <p className="feedback-thanks">
          Thanks for your feedback!
        </p>
      )}
    </div>
  );
}

export default MovieFeedback;