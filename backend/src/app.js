// src/app.js
const express = require('express');
const cors = require('cors'); // Import CORS
const videoRoutes = require('./routes/videoRoute');
const { downloadVideo } = require('./controllers/videoController');

const app = express();
const PORT = process.env.PORT || 3000;

// Use CORS middleware to allow all origins
app.use(cors());

app.use(express.json());
app.use('/api/videos', videoRoutes);

app.post('/api/videos/download', downloadVideo);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
