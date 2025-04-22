import React from 'react';

function AmazonLink({ movieTitle, movieYear }) {
  // Your Amazon Associates tag
  const associateTag = 'salnatale-20'; // Replace with your actual tag
  
  // Format the movie title for the search query
  const formattedTitle = encodeURIComponent(`${movieTitle} ${movieYear}`);
  
  // Create the Amazon search URL with your associate tag
  const amazonUrl = `https://www.amazon.com/s?k=${formattedTitle}&i=instant-video&tag=${associateTag}`;
  
  return (
    <div className="amazon-link">
      <a 
        href={amazonUrl} 
        target="_blank" 
        rel="noopener noreferrer"
        className="amazon-button"
      >
        <i className="fa fa-amazon"></i> Watch on Amazon
      </a>
    </div>
  );
}

export default AmazonLink;