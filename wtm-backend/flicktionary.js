// flicktionary.js — integrated‐inference version with descriptive logging
const DEFAULT_MOVIE = {
    imdbID: "tt0111161",
    title: "The Shawshank Redemption",
    year: "1994",
    plot: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency."
};

/**
 * Grab “all” movies by doing a non-empty text search with a large topK.
 */
async function getAllMovies(index, limit = 1000) {
    console.log(`getAllMovies: querying up to ${limit} movie records...`);
    try {
        const res = await index.searchRecords({
            query: {
                topK: limit,
                inputs: { text: "the" }  // any non‑empty text to satisfy embedder
            },
            fields: ["imdbID", "title", "year", "plot"]
        });

        const matches = res.matches || [];
        console.log(`getAllMovies: retrieved ${matches.length} movie records`);
        return matches.map(m => ({
            id: m.id,
            metadata: {
                imdbID: m.fields.imdbID,
                title: m.fields.title,
                year: m.fields.year,
                plot: m.fields.plot
            }
        }));
    } catch (err) {
        console.error("getAllMovies: Error fetching all movies:", err);
        return [];
    }
}

/**
 * Pick today’s movie by hashing the date.
 */
async function selectDailyMovie(index) {
    console.log("selectDailyMovie: fetching all movies to pick today's title...");
    try {
        const all = await getAllMovies(index);
        if (!all.length) {
            console.log("selectDailyMovie: no movies found, using DEFAULT_MOVIE");
            return DEFAULT_MOVIE;
        }

        console.log(`selectDailyMovie: ${all.length} movies available for selection`);
        const d = new Date();
        const ds = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        console.log(`selectDailyMovie: date string for hashing: ${ds}`);
        let h = 0;
        for (let i = 0; i < ds.length; i++) {
            h = ((h << 5) - h) + ds.charCodeAt(i);
            h |= 0;
        }
        const pick = Math.abs(h) % all.length;
        console.log(`selectDailyMovie: hash result ${h}, selected index ${pick}`);
        return all[pick].metadata;
    } catch (err) {
        console.error("selectDailyMovie: Error selecting daily movie:", err);
        return DEFAULT_MOVIE;
    }
}

/**
 * Run a text‐based semantic search for the user’s guess,
 * then find the secret movie’s score in the hits.
 */
async function calculateSimilarity(index, userInput, secret) {
    console.log(`calculateSimilarity: computing similarity for guess: "${userInput}"`);
    try {
        const res = await index.searchRecords({
            query: {
                inputs: { text: userInput },
                topK: 100
            }
        });

        const hits = res.matches || [];
        console.log(`calculateSimilarity: received ${hits.length} search hits`);
        const hit = hits.find(m => m.id === secret.imdbID);
        const raw = (hit?.score ?? hit?._score ?? 0);
        const score = raw * 100;
        console.log(`calculateSimilarity: raw score for secret movie (${secret.imdbID}) = ${raw}, similarity% = ${score.toFixed(2)}`);

        let proximity;
        if (score < 15) proximity = "cold";
        else if (score < 30) proximity = "cool";
        else if (score < 45) proximity = "warm";
        else if (score < 70) proximity = "hot";
        else proximity = "very hot";
        console.log(`calculateSimilarity: proximity level = ${proximity}`);

        return {
            similarity: score.toFixed(2),
            proximity
        };
    } catch (err) {
        console.error("calculateSimilarity: Error calculating similarity:", err);
        return { similarity: 0, proximity: "cold" };
    }
}

/**
 * Attach the four Flicktionary endpoints with logging.
 */
function addFlicktionaryRoutes(app, index) {
    app.get('/api/flicktionary/today', async (req, res) => {
        console.log("[ROUTE] GET /api/flicktionary/today");
        const movie = await selectDailyMovie(index);
        console.log("[ROUTE] Today's movie:", movie.title);
        res.json({ success: true, movie });
    });

    app.post('/api/flicktionary/guess', async (req, res) => {
        console.log("[ROUTE] POST /api/flicktionary/guess", req.body);
        const { guess } = req.body;
        if (!guess) {
            console.warn("[ROUTE] No guess provided");
            return res.status(400).json({ error: 'Guess is required' });
        }

        const secret = await selectDailyMovie(index);
        const { similarity, proximity } = await calculateSimilarity(index, guess, secret);
        const correct = guess.trim().toLowerCase() === secret.title.toLowerCase();
        console.log(`Guess result: correct=${correct}, similarity=${similarity}, proximity=${proximity}`);

        res.json({
            success: true,
            similarity,
            proximity,
            correct,
            movie: correct ? secret : null
        });
    });

    app.get('/api/flicktionary/hint', async (req, res) => {
        console.log("[ROUTE] GET /api/flicktionary/hint");
        const m = await selectDailyMovie(index);
        const hint = {
            firstLetter: m.title.charAt(0),
            year: m.year,
            length: m.title.length
        };
        console.log("[ROUTE] Hint for today's movie:", hint);
        res.json({ success: true, hint });
    });

    app.get('/api/flicktionary/give-up', async (req, res) => {
        console.log("[ROUTE] GET /api/flicktionary/give-up");
        const movie = await selectDailyMovie(index);
        console.log("[ROUTE] Revealing today's movie:", movie.title);
        res.json({ success: true, movie });
    });
}

module.exports = {
    selectDailyMovie,
    calculateSimilarity,
    addFlicktionaryRoutes
};