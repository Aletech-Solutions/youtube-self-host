# src/scripts/download_video.sh
#!/bin/bash

# This script is for downloading videos from YouTube using yt-dlp
URL=$1

# Run yt-dlp with the provided URL
cd ./videos
./yt-dlp.exe "$URL" -o "./videos/%(title)s.%(ext)s"
