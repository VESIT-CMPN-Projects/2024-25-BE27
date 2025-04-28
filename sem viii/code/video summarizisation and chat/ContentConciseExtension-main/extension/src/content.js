import React from 'react';
import { createRoot } from 'react-dom/client';
import Chat from './Chat.jsx';
import './chat.css';

const YT_INITIAL_PLAYER_RESPONSE_RE = /ytInitialPlayerResponse\s*=\s*({.+?})\s*;\s*(?:var\s+(?:meta|head)|<\/script|\n)/;
const CHAT_WITH_YOUTUBE_APP_ID = 'cwy-app-container';

/**
 * Comparison function used to sort tracks by priority
 */
function compareTracks(track1, track2) {
    const langCode1 = track1.languageCode;
    const langCode2 = track2.languageCode;

    if (langCode1 === 'en' && langCode2 !== 'en') return -1; // English comes first
    if (langCode1 !== 'en' && langCode2 === 'en') return 1; // English comes first
    if (track1.kind !== 'asr' && track2.kind === 'asr') return -1; // Non-ASR comes first
    if (track1.kind === 'asr' && track2.kind !== 'asr') return 1; // Non-ASR comes first

    return 0; // Preserve order if both have the same priority
}

/**
 * Fetches the transcript for the given video.
 * @param {Array} tracks - The caption tracks array.
 * @returns {Promise<Object|null>} Resolves with the transcript JSON or null if unavailable.
 */
async function fetchTranscript(tracks) {
    if (!tracks || tracks.length === 0) {
        console.warn('No caption tracks available.');
        return null;
    }

    // Sort tracks to prioritize English and non-ASR
    tracks.sort(compareTracks);

    try {
        const transcriptUrl = tracks[0].baseUrl + '&fmt=json3';
        console.log('Transcript URL:', transcriptUrl);
        const transcriptResponse = await fetch(transcriptUrl);
        if (!transcriptResponse.ok) {
            throw new Error(`Failed to fetch transcript: ${transcriptResponse.status}`);
        }
        const transcript = await transcriptResponse.json();
        console.log('Transcript fetched successfully:', transcript);
        return transcript;
    } catch (error) {
        console.error('Error fetching transcript:', error);
        return null;
    }
}

/**
 * Injects the chat component into the page
 * @returns {Promise<boolean>} true if chat was injected, false otherwise
 */
async function injectChat() {
    const videoID = new URLSearchParams(window.location.search).get('v');
    if (!videoID) {
        console.warn('Not on a video page. No video ID found.');
        return false;
    }

    const chatContainer = document.getElementById('chat-container');
    if (!chatContainer) {
        console.warn('Chat container not found on the page.');
        return false;
    }

    const appContainer = document.getElementById(CHAT_WITH_YOUTUBE_APP_ID);
    if (appContainer) {
        const currentVideoID = appContainer.getAttribute('video-id');
        if (currentVideoID === videoID) {
            console.log('Chat already injected for this video.');
            return true;
        } else {
            appContainer.remove();
        }
    }

    const app = document.createElement('div');
    app.id = CHAT_WITH_YOUTUBE_APP_ID;

    let player = window.ytInitialPlayerResponse;

    if (!player || videoID !== player.videoDetails.videoId) {
        try {
            const response = await fetch(`https://www.youtube.com/watch?v=${videoID}`);
            const body = await response.text();
            const match = body.match(YT_INITIAL_PLAYER_RESPONSE_RE);
            if (!match) throw new Error('Failed to parse ytInitialPlayerResponse.');
            player = JSON.parse(match[1]);
        } catch (error) {
            console.error('Error fetching or parsing player response:', error);
            return false;
        }
    }

    const metadata = {
        title: player.videoDetails.title,
        duration: player.videoDetails.lengthSeconds,
        author: player.videoDetails.author,
        views: player.videoDetails.viewCount,
        description: player.microformat?.playerMicroformatRenderer?.description?.simpleText || '',
    };

    const tracks = player.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];
    const transcript = await fetchTranscript(tracks);

    if (!transcript) {
        console.warn('Transcript is unavailable. Stopping chat injection.');
        return false;
    }

    const result = { transcript, metadata };
    const root = createRoot(app);
    root.render(<Chat info={result} />);

    chatContainer.prepend(app);
    return true;
}

/**
 * Polls the page until the chat container is ready, then injects the chat component
 */
const startCheckingForReady = () => {
    const videoID = new URLSearchParams(window.location.search).get('v');
    if (!videoID) return;

    const check = async () => {
        const injected = await injectChat();
        if (!injected) setTimeout(check, 100); // Retry every 100ms
    };
    check();
};

startCheckingForReady();

document.addEventListener('yt-navigate-finish', injectChat);
document.addEventListener('yt-navigate-start', startCheckingForReady);
document.addEventListener('DOMContentLoaded', () => {
    const chatContainer = document.createElement('div');
    chatContainer.id = 'chat-container';
    chatContainer.style.position = 'fixed';
    chatContainer.style.bottom = '0';
    chatContainer.style.right = '0';
    chatContainer.style.width = '300px';
    chatContainer.style.height = '400px';
    chatContainer.style.zIndex = '9999';
    chatContainer.style.overflowY = 'auto';
    document.body.appendChild(chatContainer);
});
