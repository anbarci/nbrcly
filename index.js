const express = require('express');
const Genius = require("genius-lyrics");
const rateLimit = require("express-rate-limit");
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
const port = process.env.PORT || 3000;
const Client = new Genius.Client();

// Middleware
app.use(helmet());
app.use(morgan('combined'));
app.use(cors());
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.'
});
app.use(limiter);

// Şarkı sözlerini düzenleme fonksiyonu
function formatLyrics(lyrics) {
  return lyrics
    .replace(/\[/g, '\n[')  // Köşeli parantezleri yeni satıra al
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
}

// Ana route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to the Lyrics API', version: '1.1.0' });
});

// Lyrics arama route'u
app.get('/lyrics', async (req, res) => {
    try {
        const songName = req.query.song;
        if (!songName) {
            return res.status(400).json({ error: 'Song parameter is required' });
        }
        const searches = await Client.songs.search(songName);
        if (searches.length === 0) {
            return res.status(404).json({ error: 'No lyrics found' });
        }
        const firstSong = searches[0];
        let lyrics = await firstSong.lyrics();
        lyrics = formatLyrics(lyrics);

        res.json({
            song: firstSong.title,
            artist: firstSong.artist.name,
            lyrics: lyrics,
            album: firstSong.album ? firstSong.album.name : 'Unknown',
            releaseDate: firstSong.releaseDate || 'Unknown',
            image: firstSong.image
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while fetching lyrics' });
    }
});

// Sanatçı bilgisi route'u
app.get('/artist', async (req, res) => {
    try {
        const artistName = req.query.name;
        if (!artistName) {
            return res.status(400).json({ error: 'Artist name parameter is required' });
        }
        const artists = await Client.artists.search(artistName);
        if (artists.length === 0) {
            return res.status(404).json({ error: 'No artist found' });
        }
        const artist = artists[0];
        res.json({
            name: artist.name,
            image: artist.image,
            description: artist.description,
            socialMedia: artist.socialMedia
        });
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while fetching artist information' });
    }
});

// Şarkı arama route'u
app.get('/search', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query) {
            return res.status(400).json({ error: 'Search query is required' });
        }
        const searches = await Client.songs.search(query);
        const results = searches.map(song => ({
            title: song.title,
            artist: song.artist.name,
            album: song.album ? song.album.name : 'Unknown',
            releaseDate: song.releaseDate || 'Unknown',
            image: song.image
        }));
        res.json(results);
    } catch (error) {
        console.error('Error:', error);
        res.status(500).json({ error: 'An error occurred while searching for songs' });
    }
});

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Not Found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!', details: err.message });
});

// Server başlatma
app.listen(port, () => {
    console.log(`Lyrics API running at http://localhost:${port}`);
});
