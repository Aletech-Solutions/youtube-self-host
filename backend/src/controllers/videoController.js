// src/controllers/videoController.js
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const crypto = require('crypto');

// Function to read video files from the directory
const getVideoFiles = (dir) => {
    return fs.readdirSync(dir).filter(file => 
        file.endsWith('.mp4') || file.endsWith('.webm') // Filter for .mp4 and .webm files
    ) .map(file => ({
            title: file.replace('.mp4', ''),
            path: path.join(dir, file)
        }));
};

exports.getVideoThumbnail = (req, res) => {
    // Decode the title from the URL path
    const title = decodeURIComponent(req.params.title); // Decode the title
    const videoPath = `${title}.mp4`; // Assuming all videos are saved with a .mp4 extension
    const videoFullPath = path.join(__dirname, '../../videos', videoPath); // Construct the full video path
    const thumbnailPath = path.join(__dirname, '../../thumbnails', `${title}.jpg`); // Thumbnail path

    // Check if the video file exists
    fs.stat(videoFullPath, (err) => {
        if (err) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Check if the thumbnail already exists
        fs.stat(thumbnailPath, (err) => {
            if (!err) {
                // If thumbnail exists, send it
                return res.sendFile(thumbnailPath);
            } else {
                // Thumbnail doesn't exist, create it using ffmpeg
                const command = `ffmpeg -i "${videoFullPath}" -ss 00:00:01.000 -vframes 1 "${thumbnailPath}"`; // Generate thumbnail at 1 second

                exec(command, (execErr) => {
                    if (execErr) {
                        console.error('Error generating thumbnail:', execErr);
                        return res.status(500).json({ message: 'Error generating thumbnail' });
                    }

                    // Send the generated thumbnail
                    res.sendFile(thumbnailPath);
                });
            }
        });
    });
};

// Function to get all videos with unique IDs
exports.getAllVideos = (req, res) => {
    try {
        const videosDir = path.join(__dirname, '../../videos');
        const videos = getVideoFiles(videosDir);

        // Generate unique ID for each video and add metadata from .info.json
        const videosWithId = videos.map(video => {
            const baseName = path.basename(video.title, '.mp4');
            const metadataPath = path.join(videosDir, `${baseName}.info.json`);
            console.log("[Info] Metadata file: ", metadataPath);

            let metadata = {};
            if (fs.existsSync(metadataPath)) {
                const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
                metadata = JSON.parse(metadataContent);
            } else {
                console.warn(`Metadata file not found: ${metadataPath}`);
            }

            const uniqueId = crypto.createHash('sha256')
                .update(video.title + JSON.stringify(metadata))
                .digest('hex');

            return {
                id: uniqueId,
                title: video.title,
                metadata: metadata,
            };
        });

        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const startIndex = (page - 1) * limit;
        const endIndex = page * limit;

        // Slice the videos array for pagination
        const resultVideos = videosWithId.slice(startIndex, endIndex);

        // Send the paginated response
        res.json({
            total: videosWithId.length,
            page,
            limit,
            videos: resultVideos
        });
    } catch (error) {
        console.error("Error fetching videos:", error);
        res.status(500).json({ message: "Error retrieving videos" });
    }
};

// Endpoint for filtering videos by title
exports.filterVideosByTitle = (req, res) => {
    const videosDir = path.join(__dirname, '../../videos');
    const videos = getVideoFiles(videosDir);
    const query = req.query.title.toLowerCase();

    // Generate unique ID for each video and include metadata
    const filteredVideos = videos.map(video => {
        const baseName = path.basename(video.title, '.mp4');
        const metadataPath = path.join(videosDir, `${baseName}.info.json`);
        console.log("[Info] Metadata file: ", metadataPath);

        let metadata = {};
        if (fs.existsSync(metadataPath)) {
            const metadataContent = fs.readFileSync(metadataPath, 'utf-8');
            metadata = JSON.parse(metadataContent);
        } else {
            console.warn(`Metadata file not found: ${metadataPath}`);
        }

        const uniqueId = crypto.createHash('sha256')
            .update(video.title + JSON.stringify(metadata))
            .digest('hex');

        return {
            id: uniqueId,
            title: video.title,
            metadata: metadata,
        };
    }).filter(video => 
        video.title.toLowerCase().includes(query)
    );

    res.json({
        total: filteredVideos.length,
        videos: filteredVideos
    });
};

function renameFiles(videosDir) {
    fs.readdir(videosDir, (err, files) => {
        if (err) {
            return console.error('Unable to scan directory: ' + err);
        }

        files.forEach(file => {
            const oldFilePath = path.join(videosDir, file);
            // Replace _ or - with spaces in the file name
            const newFileName = file.replace(/[_-]/g, ' ');
            const newFilePath = path.join(videosDir, newFileName);

            // Rename the file
            fs.rename(oldFilePath, newFilePath, (err) => {
                if (err) {
                    console.error('Error renaming file:', err);
                } else {
                    console.log(`Renamed: ${file} -> ${newFileName}`);
                }
            });
        });
    });
}

exports.downloadVideo = (req, res) => {
    const { url } = req.body;

    if (!url) {
        return res.status(400).json({ error: 'YouTube URL is required.' });
    }

    const videosDir = path.join(__dirname, '../../videos');
    
    // Update this to the actual path of yt-dlp.exe
    const ytDlpPath = path.join(videosDir, 'ytdlp.exe'); // Adjust this if yt-dlp.exe is in a different directory

    // Create the command to execute
    const downloadCommand = `${ytDlpPath} -S ext --restrict-filenames --write-info-json  "${url}" -o  "${path.join(videosDir, '(%(channel)s) %(title)s')}"`;
    
    // Execute the command
    exec(downloadCommand, { cwd: videosDir }, (error, stdout, stderr) => {
        if (error) {
            console.error(`Error executing script: ${error}`);
            return res.status(500).json({ error: 'Failed to download video.', details: stderr });
        }
        renameFiles(videosDir)
        res.status(200).json({ message: 'Video download started.', output: stdout, error: stderr });
    });
};

// src/controllers/videoController.js


// Function to serve a video file given a path
exports.serveVideo = (req, res) => {
    // Decode the title from the URL path
    const title = decodeURIComponent(req.params.title); // Decode the title
    const videoPath = `${title}.mp4`; // Assuming all videos are saved with a .mp4 extension
    const fullPath = path.join(__dirname, '../../videos', videoPath); // Construct the full path

    // Check if the file exists
    fs.stat(fullPath, (err, stats) => {
        console.log("[info] Now running: "+fullPath)
        if (err || !stats.isFile()) {
            return res.status(404).json({ message: 'Video not found' });
        }

        // Set the appropriate content type for video files
        res.setHeader('Content-Type', 'video/mp4'); // Change this based on the video type if needed
        res.setHeader('Content-Length', stats.size); // Set the content length

        // Create a read stream for the video file
        const stream = fs.createReadStream(fullPath);
        
        // Handle errors from the stream
        stream.on('error', (streamErr) => {
            console.error('Stream error:', streamErr);
            res.status(500).json({ message: 'Error streaming video' });
        });

        // Pipe the stream to the response
        stream.pipe(res);
    });
};