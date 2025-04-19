// flicktionary.js — embed‑then‑query version with descriptive logging

const DEFAULT_MOVIE = {
    imdbID: "tt0111161",
    title: "The Shawshank Redemption",
    year: "1994",
    plot: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency."
};

// Which embedding model to use
const EMBEDDING_MODEL = "llama-text-embed-v2";

/**
 * Helper: embed a single piece of text via Pinecone’s inference API.
 */
async function embedText(pc, text) {
    console.log(`embedText: embedding text "${text}"…`);
    // 1) Pass `model` and `inputs` positionally
    // 2) Use `inputType` camelCase (not `input_type`)
    const res = await pc.inference.embed(
      EMBEDDING_MODEL,      // e.g. "llama-text-embed-v2"
      [ text ],             // must be an array of strings
      { inputType: "query" } // optional params in camelCase
    );
    // res is an array; each item has { values: number[] }
    const vec = res[0]?.values;
    if (!vec) throw new Error("embedText: no embedding returned");
    return vec;
  }
  

/**
 * Grab “all” movies by embedding a dummy token and querying on vector.
 */
async function getAllMovies(pc, index, limit = 1000) {
    console.log(`getAllMovies: querying up to ${limit} movie records…`);
    try {
        const dummyVec = await embedText(pc, "the");    // any non‑empty text
        const results = await index.query({
            namespace: "",       // default
            vector: dummyVec,
            topK: limit,
            includeMetadata: true,
            includeValues: false
        });

        const matches = results.matches || [];
        console.log(`getAllMovies: retrieved ${matches.length} movie records`);
        return matches.map(m => m.metadata);
    } catch (err) {
        console.error("getAllMovies: Error fetching all movies:", err);
        return [];
    }
}

/**
 * Pick today’s movie by hashing the date.
 */
async function selectDailyMovie(pc, index) {
    console.log("selectDailyMovie: fetching all movies to pick today's title…");
    try {
        const all = await getAllMovies(pc, index);
        if (!all.length) {
            console.log("selectDailyMovie: no movies found, using DEFAULT_MOVIE");
            return DEFAULT_MOVIE;
        }

        console.log(`selectDailyMovie: ${all.length} movies available`);
        const d = new Date();
        const ds = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        console.log(`selectDailyMovie: date string "${ds}"`);
        let h = 0;
        for (let c of ds) {
            h = ((h << 5) - h) + c.charCodeAt(0);
            h |= 0;
        }
        const pick = Math.abs(h) % all.length;
        console.log(`selectDailyMovie: hash ${h} → pick index ${pick}`);
        return all[pick];
    } catch (err) {
        console.error("selectDailyMovie: Error selecting daily movie:", err);
        return DEFAULT_MOVIE;
    }
}

/**
 * Embed the user’s guess, run a vector query, and pull out the secret movie’s score.
 */
async function calculateSimilarity(pc, index, guess, secret) {
    console.log(`calculateSimilarity: computing similarity for guess "${guess}"…`);
    try {
        const vec = await embedText(pc, guess);
        const results = await index.query({
            namespace: "",
            vector: vec,
            topK: 100,
            includeMetadata: false,
            includeValues: false
        });

        const hits = results.matches || [];
        console.log(`calculateSimilarity: received ${hits.length} hits`);
        const hit = hits.find(m => m.id === secret.imdbID);
        const raw = (hit?.score ?? 0);
        const pct = (raw * 100).toFixed(2);
        console.log(`calculateSimilarity: raw score=${raw}, pct=${pct}%`);

        let proximity;
        if (raw < 0.15) proximity = "cold";
        else if (raw < 0.30) proximity = "cool";
        else if (raw < 0.45) proximity = "warm";
        else if (raw < 0.70) proximity = "hot";
        else proximity = "very hot";
        console.log(`calculateSimilarity: proximity="${proximity}"`);

        return { similarity: pct, proximity };
    } catch (err) {
        console.error("calculateSimilarity: Error:", err);
        return { similarity: "0.00", proximity: "cold" };
    }
}

/**
 * Mount routes. Now takes your Pinecone client *and* index.
 */
function addFlicktionaryRoutes(app, pc, index) {
    app.get('/api/flicktionary/today', async (req, res) => {
        console.log("[ROUTE] GET /api/flicktionary/today");
        const movie = await selectDailyMovie(pc, index);
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

        const secret = await selectDailyMovie(pc, index);
        const { similarity, proximity } = await calculateSimilarity(pc, index, guess, secret);
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
        const m = await selectDailyMovie(pc, index);
        const hint = { firstLetter: m.title[0], year: m.year, length: m.title.length };
        console.log("[ROUTE] Hint:", hint);
        res.json({ success: true, hint });
    });

    app.get('/api/flicktionary/give-up', async (req, res) => {
        console.log("[ROUTE] GET /api/flicktionary/give-up");
        const movie = await selectDailyMovie(pc, index);
        console.log("[ROUTE] Reveal movie:", movie.title);
        res.json({ success: true, movie });
    });
}

module.exports = {
    selectDailyMovie,
    calculateSimilarity,
    addFlicktionaryRoutes
};
