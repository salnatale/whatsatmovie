// flicktionary.js — with daily LLM‑powered micro‑summary caching

const fs   = require('fs');
const path = require('path');
const { OpenAI } = require("openai");
const openai = new OpenAI({ apiKey: process.env.GPT_API_KEY });
const axios = require('axios');
const OMDB_KEY = process.env.OMDB_API_KEY;


// Pinecone embed model
const EMBEDDING_MODEL = "llama-text-embed-v2";

const RANDOM_CACHE_PATH = path.join(__dirname, 'randomCache.json');
let randomCache = { date: null, items: [] };
// ---------------------------------------------------------------------

// Try to load yesterday’s cache on startup
try {
    randomCache = JSON.parse(fs.readFileSync(RANDOM_CACHE_PATH, 'utf8'));
  } catch {
    /* ignore missing or bad cache */
  }
  
  // Helper to rebuild the cache
  async function regenerateRandom(pc, index) {
    const all    = await getAllMovies(pc, index,true);
    const sample = all.sort(() => 0.5 - Math.random()).slice(0, 10);
  
    const detailed = await Promise.all(sample.map(async m => {
      try {
        const r = await axios.get('http://www.omdbapi.com/', {
          params: { i: m.imdbID, apikey: OMDB_KEY }
        });
        return { originalQuery: m.originalQuery, imdbID: m.imdbID, Poster: r.data.Poster };
      } catch {
        return { originalQuery: m.originalQuery, imdbID: m.imdbID, Poster: '' };
      }
    }));
  
    randomCache = { date: new Date().toDateString(), items: detailed };
    fs.writeFileSync(RANDOM_CACHE_PATH, JSON.stringify(randomCache), 'utf8');
  }

// where we store our daily cache
const CACHE_PATH = path.join(__dirname, 'dailyCache.json');
let dailyCache = { date: null };
// load existing cache if present
try {
  dailyCache = JSON.parse(fs.readFileSync(CACHE_PATH, 'utf8'));
} catch {
  /* no cache yet */
}
function saveCache() {
  fs.writeFileSync(CACHE_PATH, JSON.stringify(dailyCache), 'utf8');
}

const DEFAULT_MOVIE = {
  imdbID: "tt0111161",
  title: "The Shawshank Redemption",
  year: "1994",
  plot: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency."
};

async function embedText(pc, text) {
  const res = await pc.inference.embed(
    EMBEDDING_MODEL,
    [ text ],
    { inputType: "query" }
  );
  return res;
}

// your existing “getAllMovies” & “selectDailyMovie” unchanged…

async function getAllMovies(pc, index, isCorrect = false, limit = 1000) {
  console.log(`getAllMovies: querying up to ${limit} movie records…`);

  try {
    // 1) Get a “dummy” embedding just to drive a full‐scan
    const embeddingResponse = await embedText(pc, "the");
    const vector = embeddingResponse.data[0].values;
    console.log("Embedding vector length:", vector.length);

    // 2) Build the query payload
    const queryParams = {
      vector,
      topK: limit,
      includeMetadata: true,
      includeValues: false
    };

    // 3) If the caller only wants the ones marked correct, add a filter
    if (isCorrect) {
      queryParams.filter = {
        isCorrect: { "$eq": true }
      };
      console.log("Applying filter: only metadata.isCorrect === true");
    }

    // 4) Run the query
    const results = await index.query(queryParams);
    const matches = results.matches || [];
    console.log(`getAllMovies: retrieved ${matches.length} movie records`);

    // 5) Return just the metadata payloads
    return matches.map(m => m.metadata);
  }
  catch (err) {
    console.error("getAllMovies: Error fetching all movies:", err);
    return [];
  }
}

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

// simple cosine helper
function cosineSim(a, b) {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    na  += a[i]*a[i];
    nb  += b[i]*b[i];
  }
  return dot / (Math.sqrt(na)*Math.sqrt(nb));
}

/**
 * 1) Pick today’s movie
 * 2) If not cached for today:
 *    • generate micro‑summaries via LLM
 *    • embed each & store the vectors
 * 3) Return { date, movie, microSums, vecs }
 */
async function getDailySecret(pc, index) {
    const today = new Date().toDateString();
  
    // 1) Reload from disk if it exists
    if (fs.existsSync(CACHE_PATH)) {
      try {
        const raw = fs.readFileSync(CACHE_PATH, 'utf8');
        const parsed = JSON.parse(raw);
  
        // sanity‑check the shape
        if (
          parsed.date === today &&
          parsed.movie &&
          Array.isArray(parsed.microSums) &&
          Array.isArray(parsed.vecs) &&
          parsed.stats
        ) {
          dailyCache = parsed;
          return dailyCache;
        }
      } catch (err) {
        console.warn("Corrupted cache file, regenerating:", err);
        // fall through to regenerate
      }
    }
  
    // 2) Cache is missing or stale → regenerate

    // pick today's secret movie
    const movie = await selectDailyMovie(pc, index);
  
    // build the LLM prompt
    const prompt = `
  Here are the details for a movie:
    Title: ${movie.title}
    Year: ${movie.year}
    Plot: ${movie.plot}
  
  Please write 5 very different one‑sentence "elevator pitch" summaries highlighting:
    1) the core conflict,
    2) the emotional theme,
    3) the setting/tone,
    4) a memorable hook or twist,
    5) an overarching summary.
  Respond with exactly the JSON array of strings, no markdown, no backticks.
    `.trim();
  
    // call the LLM
    const resp = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }]
    });
  
    // strip any fences and parse JSON
    let text = resp.choices[0].message.content.trim()
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim();
    const microSums = JSON.parse(text);
  
    // embed each micro-summary
    const embeds = await Promise.all(
      microSums.map(s => embedText(pc, s))
    );
    const vecs = embeds.map(e => e.data[0].values);
  
    // build a centroid vector for stats querying
    const secretVec = vecs[0].map((_, i) =>
      vecs.reduce((sum, v) => sum + v[i], 0) / vecs.length
    );
  
    // compute nearest/tenth/thousandth stats
    const stats = await getSimilarityStats(pc, index, secretVec);
  
    // 3) Persist new cache
    dailyCache = { date: today, movie, microSums, vecs, stats };
    fs.writeFileSync(CACHE_PATH, JSON.stringify(dailyCache), 'utf8');
  
    return dailyCache;
  }

async function getSimilarityStats(pc, index, secretVec) {
    const TOP_K = 1000;
    const results = await index.query({
      vector: secretVec,
      topK:     TOP_K,
      // no need for metadata or values here
      includeMetadata: false,
      includeValues:   false
    });
  
    // Pinecone scores are dot products or cosines in [0,1]
    const scores = results.matches.map(m => m.score * 100);
  
    return {
      nearest:     scores[0]?.toFixed(2)  ?? null,
      tenth:       scores[9]?.toFixed(2)  ?? null,
      thousandth:  scores[999]?.toFixed(2) ?? null
    };
  }

/**
 * Calculate similarity by comparing the guess
 * to each micro‑summary vector (max strategy).
 */
async function calculateSimilarity(pc, index, guess) {
  console.log(`calculating similarity for guess="${guess}"…`);

  const { movie, vecs } = await getDailySecret(pc, index);

  // embed guess
  const embedGuess = await embedText(pc, guess);
  const guessVec = embedGuess.data[0].values;

  // score against each hook
  const sims = vecs.map(v => cosineSim(guessVec, v));
  const raw  = Math.max(...sims);
  const pct  = (raw * 100).toFixed(2);

  let proximity;
  if (raw < 0.15) proximity = "cold";
  else if (raw < 0.30) proximity = "cool";
  else if (raw < 0.45) proximity = "warm";
  else if (raw < 0.70) proximity = "hot";
  else proximity = "very hot";

  return { similarity: pct, proximity, movie };
}

/**
 * Mount routes: use getDailySecret in /today, calculateSimilarity in /guess,
 * and reuse cached movie for /hint & /give-up.
 */
function addFlicktionaryRoutes(app, pc, index) {
  app.get('/api/flicktionary/today', async (req, res) => {
      const { movie, stats } = await getDailySecret(pc, index);
      // add console logs for debugging
        console.log("[ROUTE] GET /api/flicktionary/today");
        console.log("[ROUTE] Today's movie:", movie.title);
        console.log("[ROUTE] Movie stats:", stats);
      res.json({ success: true, movie, stats });
  });
// inside addFlicktionaryRoutes(app, pc, index) or similar:

app.get('/api/flicktionary/random', async (req, res) => {
    const today = new Date().toDateString();
  
    // Only regenerate if the date has changed since last cache
    if (randomCache.date !== today) {
      await regenerateRandom(pc, index);
    }
  
    // Return the cached array (no OMDb calls here)
    res.json({ success: true, items: randomCache.items });
  });

  app.post('/api/flicktionary/guess', async (req, res) => {
    const { guess } = req.body;
    if (!guess) return res.status(400).json({ error: 'Guess is required' });

    const { similarity, proximity, movie } =
      await calculateSimilarity(pc, index, guess);

    const correct =
      guess.trim().toLowerCase() === movie.title.toLowerCase();

    res.json({
      success: true,
      similarity,
      proximity,
      correct,
      movie: correct ? movie : null
    });
  });

  app.get('/api/flicktionary/hint', async (req, res) => {
    const { movie } = await getDailySecret(pc, index);
    const hint = {
      firstLetter: movie.title[0],
      year:        movie.year,
      length:      movie.title.length
    };
    res.json({ success: true, hint });
  });

  app.get('/api/flicktionary/give-up', async (req, res) => {
    const { movie } = await getDailySecret(pc, index);
    res.json({ success: true, movie });
  });
}

module.exports = {
  selectDailyMovie,
  calculateSimilarity,
  addFlicktionaryRoutes
};

// -------------------

// const { OpenAI } = require("openai");
// const openai = new OpenAI({ apiKey: process.env.GPT_API_KEY });
// // flicktionary.js — embed‑then‑query version with descriptive logging

// const DEFAULT_MOVIE = {
//     imdbID: "tt0111161",
//     title: "The Shawshank Redemption",
//     year: "1994",
//     plot: "Two imprisoned men bond over a number of years, finding solace and eventual redemption through acts of common decency."
// };

// // Which embedding model to use
// const EMBEDDING_MODEL = "llama-text-embed-v2";

// /**
//  * Helper: embed a single piece of text via Pinecone’s inference API.
//  */
// async function embedText(pc, text) {
//     console.log(`embedText: embedding text "${text}"…`);
//     // 1) Pass `model` and `inputs` positionally
//     // 2) Use `inputType` camelCase (not `input_type`)
//     const res = await pc.inference.embed(
//         EMBEDDING_MODEL,      // e.g. "llama-text-embed-v2"
//         [text],             // must be an array of strings
//         { inputType: "query" } // optional params in camelCase
//     );
//     // res is an array; each item has { values: number[] }
//     return res;
// }


// /**
//  * Grab “all” movies by embedding a dummy token and querying on vector.
//  */
// async function getAllMovies(pc, index, limit = 1000) {
//     console.log(`getAllMovies: querying up to ${limit} movie records…`);
//     try {
//         const embedding = await embedText(pc, "the");    // any non‑empty text
//         console.log("embedding:", embedding);
//         // log embedding values
//         console.log("embedding[0].values:",);
//         const results = await index.query({
//             vector: embedding["data"][0].values,
//             topK: limit,
//             includeMetadata: true,
//             includeValues: false
//         });

//         const matches = results.matches || [];
//         console.log(`getAllMovies: retrieved ${matches.length} movie records`);
//         return matches.map(m => m.metadata);
//     } catch (err) {
//         console.error("getAllMovies: Error fetching all movies:", err);
//         return [];
//     }
// }

// /**
//  * Pick today’s movie by hashing the date.
//  */
// async function selectDailyMovie(pc, index) {
//     console.log("selectDailyMovie: fetching all movies to pick today's title…");
//     try {
//         const all = await getAllMovies(pc, index);
//         if (!all.length) {
//             console.log("selectDailyMovie: no movies found, using DEFAULT_MOVIE");
//             return DEFAULT_MOVIE;
//         }

//         console.log(`selectDailyMovie: ${all.length} movies available`);
//         const d = new Date();
//         const ds = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
//         console.log(`selectDailyMovie: date string "${ds}"`);
//         let h = 0;
//         for (let c of ds) {
//             h = ((h << 5) - h) + c.charCodeAt(0);
//             h |= 0;
//         }
//         const pick = Math.abs(h) % all.length;
//         console.log(`selectDailyMovie: hash ${h} → pick index ${pick}`);
//         return all[pick];
//     } catch (err) {
//         console.error("selectDailyMovie: Error selecting daily movie:", err);
//         return DEFAULT_MOVIE;
//     }
// }
// // simple cosine‐similarity helper
// function cosineSim(a, b) {
//     let dot = 0, normA = 0, normB = 0;
//     for (let i = 0; i < a.length; i++) {
//         dot += a[i] * b[i];
//         normA += a[i] * a[i];
//         normB += b[i] * b[i];
//     }
//     return dot / (Math.sqrt(normA) * Math.sqrt(normB));
// }
// /**
//  * Embed the user’s guess, run a vector query, and pull out the secret movie’s score.
//  */
// // async function calculateSimilarity(pc, index, guess, secret) {
// //     console.log(`calculateSimilarity: computing similarity for guess "${guess}"…`);
// //     try {
// //         const embedding = await embedText(pc, guess);
// //         const results = await index.query({
// //             vector: embedding["data"][0].values,
// //             topK: 171,
// //             includeMetadata: false,
// //             includeValues: false
// //         });

// //         const hits = results.matches || [];
// //         console.log(`calculateSimilarity: received ${hits.length} hits`);
// //         const hit = hits.find(m => m.id === secret.imdbID);
// //         const raw = (hit?.score ?? 0);
// //         const pct = (raw * 100).toFixed(2);
// //         console.log(`calculateSimilarity: raw score=${raw}, pct=${pct}%`);

// //         let proximity;
// //         if (raw < 0.15) proximity = "cold";
// //         else if (raw < 0.30) proximity = "cool";
// //         else if (raw < 0.45) proximity = "warm";
// //         else if (raw < 0.70) proximity = "hot";
// //         else proximity = "very hot";
// //         console.log(`calculateSimilarity: proximity="${proximity}"`);

// //         return { similarity: pct, proximity };
// //     } catch (err) {
// //         console.error("calculateSimilarity: Error:", err);
// //         return { similarity: "0.00", proximity: "cold" };
// //     }
// // }
// /**
//  * Use an LLM to spin out 4 very different 1‑sentence pitches for the movie.
//  */
// async function generateMicroSummaries(openai, movie) {
//     const prompt = `
//   Here are the details for a movie:
//     Title: ${movie.title}
//     Year: ${movie.year}
//     Plot: ${movie.plot}
  
//   Please write 5 very different one‑sentence "elevator pitch" summaries highlighting:

//     1) the core conflict,
//     2) the emotional theme,
//     3) the setting/tone,
//     4) a memorable hook or twist.
//     5) an encompassing summary of the movie.
//   Each summary should be unique and distinct from the others.
//   Return them as a JSON array of strings, and respond with exactly the JSON array, no markdown, no backticks.
//     `.trim();

//     const resp = await openai.chat.completions.create({
//         model: "gpt-4o-mini",
//         messages: [{ role: "user", content: prompt }]
//     });

//     return JSON.parse(resp.choices[0].message.content);
// }

// async function calculateSimilarity(pc, index, guess, secret) {

//     console.log(`calculateSimilarity: computing similarity for guess "${guess}"…`);

//     // 1) embed the user’s guess
//     const embedGuess = await embedText(pc, guess);
//     const guessVec = embedGuess["data"][0].values;

//     // 2) generate & embed 4 micro‑summaries, then average their vectors
//     const microSums = await generateMicroSummaries(openai, secret);
//     // embed each summary sentence
//     const embeds = await Promise.all(microSums.map(s => embedText(pc, s)));
//     const vecs = embeds.map(e => e.data[0].values);
//     // average them element‑wise
//     const secretVec = vecs[0].map((_, i) =>
//         vecs.reduce((sum, v) => sum + v[i], 0) / vecs.length
//     );
//     const sims = vecs.map(v => cosineSim(guessVec, v));
//     // 3) compute cosine similarity directly
//     const raw = Math.max(...sims);
//     const pct = (raw * 100).toFixed(2);
//     console.log(`raw score=${raw}, pct=${pct}%`);

//     // 4) bucket into cold/cool/… as before
//     let proximity = raw < 0.15 ? "cold"
//         : raw < 0.30 ? "cool"
//             : raw < 0.45 ? "warm"
//                 : raw < 0.70 ? "hot"
//                     : "very hot";
//     console.log(`proximity="${proximity}"`);

//     return { similarity: pct, proximity };
// }

// /**
//  * Mount routes. Now takes your Pinecone client *and* index.
//  */
// function addFlicktionaryRoutes(app, pc, index) {
//     app.get('/api/flicktionary/today', async (req, res) => {
//         console.log("[ROUTE] GET /api/flicktionary/today");
//         const movie = await selectDailyMovie(pc, index);
//         console.log("[ROUTE] Today's movie:", movie.title);
//         res.json({ success: true, movie });
//     });

//     app.post('/api/flicktionary/guess', async (req, res) => {
//         console.log("[ROUTE] POST /api/flicktionary/guess", req.body);
//         const { guess } = req.body;
//         if (!guess) {
//             console.warn("[ROUTE] No guess provided");
//             return res.status(400).json({ error: 'Guess is required' });
//         }

//         const secret = await selectDailyMovie(pc, index);
//         const { similarity, proximity } = await calculateSimilarity(pc, index, guess, secret);
//         const correct = guess.trim().toLowerCase() === secret.title.toLowerCase();
//         console.log(`Guess result: correct=${correct}, similarity=${similarity}, proximity=${proximity}`);

//         res.json({
//             success: true,
//             similarity,
//             proximity,
//             correct,
//             movie: correct ? secret : null
//         });
//     });

//     app.get('/api/flicktionary/hint', async (req, res) => {
//         console.log("[ROUTE] GET /api/flicktionary/hint");
//         const m = await selectDailyMovie(pc, index);
//         const hint = { firstLetter: m.title[0], year: m.year, length: m.title.length };
//         console.log("[ROUTE] Hint:", hint);
//         res.json({ success: true, hint });
//     });

//     app.get('/api/flicktionary/give-up', async (req, res) => {
//         console.log("[ROUTE] GET /api/flicktionary/give-up");
//         const movie = await selectDailyMovie(pc, index);
//         console.log("[ROUTE] Reveal movie:", movie.title);
//         res.json({ success: true, movie });
//     });
// }

// module.exports = {
//     selectDailyMovie,
//     calculateSimilarity,
//     addFlicktionaryRoutes
// };
