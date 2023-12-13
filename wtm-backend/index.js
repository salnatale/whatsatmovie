require('dotenv').config();
const cors = require('cors');
const OpenAI = require('openai');
const axios = require('axios');
const express = require('express');
const API_KEY = process.env.OMDB_API_KEY;
const fs = require('fs');
async function getMovieDetails(movieName) {
    const encodedMovieName = movieName.replace(/ /g, '+');  // Replacing spaces with '+'

    const response = await axios.get(`http://www.omdbapi.com/?t=${encodedMovieName}&apikey=${API_KEY}`);
    return response.data;
}
function hasMultipleTitles(inputText) {
    const regexPattern = /\d\./;
    return regexPattern.test(inputText);
}
const app = express();
const PORT = process.env.PORT
const GPT_API_ENDPOINT = 'https://api.openai.com/v1/chat/completions';
const GPT_API_KEY = process.env.GPT_API_KEY
const openai = new OpenAI({ apiKey: GPT_API_KEY });

app.use(express.json());


app.use(cors()); // Use CORS middleware

app.post('/api/generate-text', async (req, res) => {
    try {
        const userDescription = req.body.prompt;
        console.log("Input:", userDescription)

        // Constructing the specific prompt for the model
        const fullPrompt = `
        You are an expert in movies. Based on the following description, please identify the movie(s). If you are confident about a single movie, provide its title in the format "Title: [Movie Name]". If you are unsure and there are multiple possibilities, list up to five of them in the format "Possible Titles: 1. [Movie Name 1], 2. [Movie Name 2], etc..  Please provide only the titles, without any descriptions or additional information.""
        `;

        const response = await openai.chat.completions.create({
            model: "gpt-3.5-turbo",
            messages: [{ "role": "system", "content": `${fullPrompt}` },
            { "role": "user", "content": `${userDescription}` }],
        });
        // const response = await axios.post(GPT_API_ENDPOINT, {
        //     model: "gpt-3.5-turbo", // or another model of your choice
        //     prompt: fullPrompt,
        //     max_tokens: 150
        // }, {
        //     headers: {
        //         'Authorization': `Bearer ${GPT_API_KEY}`,
        //         'Content-Type': 'application/json'
        //     }
        // });
        console.log("Raw API Response:", response);



        const generatedText = response.choices[0].message.content;
        const regex = /(?<=\d\.\s)([^\n,]+?)(?=\s\(\d{4}\)|,|\n|$)/g;
        // const regex = /(?<=\d\.\s)(?:“|")?([^\n,"]+?)(?:”|")?(?=\s\(\d{4}\)|,|\n|$)/g;
        const titles = [];
        let match;
        if (hasMultipleTitles(generatedText)) {
            while ((match = regex.exec(generatedText)) !== null) {
                titles.push(match[1].trim()); // Only pushing the movie title, not the year
            }
        } else {
            // Assuming the single title will always have the format "Title: Movie Name"
            const singleTitleMatch = generatedText.match(/Title: (.+)$/);
            if (singleTitleMatch) {
                titles.push(singleTitleMatch[1].trim());
            }
        }
        console.log("Generated Text:", generatedText);
        console.log("Titles Array:", titles)
        // res.json({ text: titles.join(', ') }); // Sending back the joined list of movie titles
        const movieDetailsPromises = titles.map(title => getMovieDetails(title));
        const allMovieDetails = await Promise.all(movieDetailsPromises);

        // Check if no valid movies were found
        if (!titles.length || allMovieDetails.every(detail => detail.Response === 'False')) {
            console.log("json response:", {
                success: false,
                message: 'No movies found based on the given description.'
            })
            return res.json({
                success: false,
                message: 'No movies found based on the given description.'
            });
        }

        allMovieDetails.forEach(details => {
            if (details.Response === 'False') {
                console.log('Error fetching movie details:', details.Error);
            } else {
                console.log('Movie Details:', details);
            }
        });

        // res.json({ success: true, movies: allMovieDetails });
        const validMovies = allMovieDetails.filter(movie => {
            return movie.Title && movie.Title !== "()" && movie.Actors && movie.Actors !== "N/A" && movie.imdbRating && movie.imdbRating !== "Invalid Rating";
        });

        // Check if no valid movies were found
        if (!validMovies.length) {
            console.log("json response:", {
                success: false,
                message: 'No valid movies found based on the given description, saving gen text to file'
            })
            // Define a filename
            const filename = `no-movies-found-${Date.now()}.txt`;

            // Write the generated text to a file
            fs.writeFile(filename, generatedText, (err) => {
                if (err) {
                    console.error('Error writing to file:', err);
                } else {
                    console.log(`Generated text saved to ${filename}`);
                }
            });
            return res.json({
                success: false,
                message: 'No valid movies found based on the given description.'
            });
        }

        // If there are valid movies, log the details and send the response
        validMovies.forEach(details => {
            if (details.Response === 'False') {
                console.log('Error fetching movie details:', details.Error);
            } else {
                console.log('Valid Movie Details:', details);
            }
        });

        res.json({ success: true, movies: validMovies });

    } catch (error) {
        console.error("Server Error:", error);
        res.status(500).json({ error: 'Failed to generate text' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
