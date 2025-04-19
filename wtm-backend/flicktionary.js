// flicktionary.js - Our Semantle-style movie guessing game
const fetch = require('node-fetch');
// Function to select a random movie from the vector database
async function selectDailyMovie(index) {
    try {
        // Get all movies from the vector DB
        const allMovies = await getAllMovies(index);
        
        // If no movies in DB, return a default movie
        if (!allMovies || allMovies.length === 0) {
            return {
                imdbID: "tt0111161",
                title: "The Shawshank Redemption",
                year: "1994",
                plot: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency."
            };
        }
        
        // Create a pseudorandom but deterministic selection based on the date
        const today = new Date();
        const dateString = `${today.getFullYear()}-${today.getMonth() + 1}-${today.getDate()}`;
        
        // Create a simple hash of the date string to use as our random seed
        let hash = 0;
        for (let i = 0; i < dateString.length; i++) {
            hash = ((hash << 5) - hash) + dateString.charCodeAt(i);
            hash |= 0; // Convert to 32bit integer
        }
        
        // Use the hash to select a movie
        const movieIndex = Math.abs(hash) % allMovies.length;
        return allMovies[movieIndex].metadata;
        
    } catch (error) {
        console.error("Error selecting daily movie:", error);
        throw error;
    }
}

// Helper function to get all movies from the vector DB
async function getAllMovies(index, limit = 100) {
    try {
        // Fetch all vectors (note: this might not be efficient for large datasets)
        const allVectors = await index.fetch({
            ids: [], // Empty array to fetch all vectors
            limit: limit
        });
        
        return Object.values(allVectors.vectors).map(vector => ({
            id: vector.id,
            metadata: vector.metadata
        }));
    } catch (error) {
        console.error("Error fetching all movies:", error);
        return [];
    }
}

// Function to calculate similarity between user input and secret movie
async function calculateSimilarity(index, userInput, secretMovie) {
    try {
        // Use Pinecone's similarity search to compare the user input to the secret movie
        const queryResults = await index.query({
            text: userInput,
            filter: { imdbID: { $eq: secretMovie.imdbID } },
            topK: 1,
            includeMetadata: true
        });
        
        if (!queryResults.matches || queryResults.matches.length === 0) {
            return {
                similarity: 0,
                proximity: "cold"
            };
        }
        
        // Get the similarity score from the results
        const similarityScore = queryResults.matches[0].score * 100; // Convert to percentage
        
        // Define proximity based on similarity score
        let proximity;
        if (similarityScore < 15) {
            proximity = "cold";
        } else if (similarityScore < 30) {
            proximity = "cool";
        } else if (similarityScore < 45) {
            proximity = "warm";
        } else if (similarityScore < 70) {
            proximity = "hot";
        } else {
            proximity = "very hot";
        }
        
        return {
            similarity: similarityScore.toFixed(2),
            proximity: proximity
        };
        
    } catch (error) {
        console.error("Error calculating similarity:", error);
        throw error;
    }
}

// Add Flicktionary routes to an Express app
function addFlickionaryRoutes(app, index) {
    // Get today's movie (admin only or for testing)
    app.get('/api/flicktionary/today', async (req, res) => {
        try {
            const dailyMovie = await selectDailyMovie(index);
            // For testing only - in production don't send the movie details directly
            res.json({ success: true, movie: dailyMovie });
        } catch (error) {
            console.error("Error getting daily movie:", error);
            res.status(500).json({ error: 'Failed to get daily movie' });
        }
    });
    
    // Submit a guess
    app.post('/api/flicktionary/guess', async (req, res) => {
        try {
            const { guess } = req.body;
            
            if (!guess) {
                return res.status(400).json({ error: 'Guess is required' });
            }
            
            const dailyMovie = await selectDailyMovie(index);
            const result = await calculateSimilarity(index, guess, dailyMovie);
            
            // Check if the guess is the correct movie title
            const isCorrect = guess.toLowerCase() === dailyMovie.title.toLowerCase();
            
            res.json({
                success: true,
                similarity: result.similarity,
                proximity: result.proximity,
                correct: isCorrect,
                // Only include movie details if they got it correct
                movie: isCorrect ? dailyMovie : null
            });
            
        } catch (error) {
            console.error("Error processing guess:", error);
            res.status(500).json({ error: 'Failed to process guess' });
        }
    });
    
    // Get a hint (e.g., first letter, genre, year, etc.)
    app.get('/api/flicktionary/hint', async (req, res) => {
        try {
            const dailyMovie = await selectDailyMovie(index);
            
            // Create a hint that doesn't give away too much
            const hint = {
                firstLetter: dailyMovie.title.charAt(0),
                year: dailyMovie.year,
                length: dailyMovie.title.length
            };
            
            res.json({ success: true, hint });
        } catch (error) {
            console.error("Error getting hint:", error);
            res.status(500).json({ error: 'Failed to get hint' });
        }
    });
    
    // Give up and get the answer
    app.get('/api/flicktionary/give-up', async (req, res) => {
        try {
            const dailyMovie = await selectDailyMovie(index);
            res.json({ success: true, movie: dailyMovie });
        } catch (error) {
            console.error("Error getting answer:", error);
            res.status(500).json({ error: 'Failed to get answer' });
        }
    });
}

module.exports = {
    selectDailyMovie,
    calculateSimilarity,
    addFlickionaryRoutes
};