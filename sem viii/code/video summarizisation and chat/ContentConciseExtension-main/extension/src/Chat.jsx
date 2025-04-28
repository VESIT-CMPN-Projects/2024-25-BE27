import { useChat } from 'ai/react';
import { useEffect, useRef } from 'react';
import { generateStructuredData } from './transcriptUtils.js';

// NOTE: If deploying remotely, change this to the server's URL.
const CHAT_API_ENDPOINT = 'http://localhost:3000/api/chat';

export default function Chat({ info: { transcript, metadata } }) {
    // Generate structured data from metadata description and transcript
    const structuredData = generateStructuredData(metadata.description, transcript);
    let transcriptText;

    function formatTime(seconds) {
        const hrs = Math.floor(seconds / 3600);
        const mins = Math.floor((seconds % 3600) / 60);
        const secs = (seconds % 60).toFixed(2);
    
        if (hrs > 0) {
            return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
        }
        return `${mins.toString().padStart(2, '0')}:${secs.padStart(5, '0')}`;
    }
    
    const parsedTranscript = transcript.events
        .filter(event => event.segs) // Filter valid segments
        .map(event => {
            // Convert tStartMs and dDurationMs to formatted start and end times
            const starttime = formatTime(event.tStartMs / 1000);
            const endtime = formatTime((event.tStartMs + event.dDurationMs) / 1000);
    
            // Concatenate segments into a single text
            const text = event.segs.map(segment => segment.utf8).join(' ');
    
            // Return the formatted string
            return `${starttime}-${endtime} - ${text}`;
        })
        .join('\n')
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // Remove invalid characters
    .replace(/\s+/g, ' '); // Replace multiple spaces with a single space

    console.log('Parsed transcript:', parsedTranscript); // Log the parsed transcript

    if (!structuredData || structuredData.length === 0) {
        console.error('No timestamps found in the description.');
        transcriptText = parsedTranscript; // Use the plain parsed transcript
    } else {
        console.log('Structured data generated successfully.');
        transcriptText = structuredData.map(entry => entry).join('\n'); // Format structured data
    }

    // The useChat hook handles the chat logic.
    const { messages, input, handleInputChange, handleSubmit } = useChat({
        api: CHAT_API_ENDPOINT,
        initialMessages: [
            {
                id: '0',
                role: 'system',
                content: [
                    'START OF QUERY INSTRUCTIONS',
                    'You are a helpful assistant. Given the metadata and transcript of a YouTube video, your purpose is to answer any questions that follow.',
                    'END OF QUERY INSTRUCTIONS',
                    '',
                    'START OF SUMMARY INSTRUCTIONS',
                    'When asked to summarize the video:',
                    '- Provide a detailed summary that covers the main points.',
                    '- Include timestamps from the transcript where possible to indicate when key events or topics occur.',
                    '(starttime - endtime) title :\n summary \n',
                    'END OF SUMMARY INSTRUCTIONS',
                    '',
                    'START OF METADATA',
                    `Author: ${metadata.author}`,
                    `Title: ${metadata.title}`,
                    'END OF METADATA',
                    '',
                    'START OF TRANSCRIPT',
                    transcriptText,
                    'END OF TRANSCRIPT',
                ].join('\n'),
            },
        ],
    });

    // Reference to the conversation container for scrolling
    const conversationContainer = useRef(null);

    // Scroll to the bottom of the conversation container when messages are updated
    useEffect(() => {
        const elem = conversationContainer.current;
        if (elem) {
            elem.scrollTo({ top: elem.scrollHeight });
        }
    }, [messages]);

    return (
        <div className="chat-with-youtube-container">
            <div className="cwy-label">Chat with YouTube</div>
            <div ref={conversationContainer} className="cwy-conversation-container">
                {messages
                    .filter(message => message.role !== 'system') // Exclude system messages
                    .map(message => (
                        <div key={message.id} className={`message message-${message.role}`}>
                            {message.content}
                        </div>
                    ))}
            </div>
            <form className="cwy-form" onSubmit={handleSubmit}>
                <input
                    className="cwy-textbox"
                    value={input}
                    placeholder="Say something..."
                    onChange={handleInputChange}
                />
            </form>
        </div>
    );
}
