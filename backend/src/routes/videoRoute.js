// src/routes/videoRoutes.js
const express = require('express');
const videoController = require('../controllers/videoController');

const router = express.Router();

// Route for fetching all videos
router.get('/', videoController.getAllVideos);

// Route for filtering videos by title
router.get('/search', videoController.filterVideosByTitle);

router.get('/serve/:title', videoController.serveVideo);

router.get('/thumbnail/:title', videoController.getVideoThumbnail);

module.exports = router;
