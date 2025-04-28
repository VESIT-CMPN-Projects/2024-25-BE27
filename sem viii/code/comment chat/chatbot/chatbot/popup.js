document.addEventListener("DOMContentLoaded", async function() {
    const chatBox = document.getElementById("chat-box");
    const chatInputContainer = document.getElementById("chat-input-container");

    // Add a scraping message
    chatBox.innerHTML = '<div class="message bot-message">Scraping comments... Please wait.</div>';

    // Get the current tab URL (video URL from browser)
    chrome.tabs.query({ active: true, currentWindow: true }, async function(tabs) {
        const youtubeUrl = tabs[0].url;

        try {
            const response = await fetch('http://127.0.0.1:5000/scrap', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ youtube_url: youtubeUrl })
            });

            const data = await response.json();

            if (response.ok) {
                chatBox.innerHTML += '<div class="message bot-message">Scraping complete! You can now chat.</div>';
                chatInputContainer.classList.remove("hidden");
            } else {
                chatBox.innerHTML += '<div class="message bot-message">Error: ' + data.error + '</div>';
            }
        } catch (error) {
            chatBox.innerHTML += '<div class="message bot-message">Failed to scrape comments.</div>';
        }
    });
});

// Chat functionality
document.getElementById('send-btn').addEventListener('click', async function() {
    const userInput = document.getElementById('user-input').value;
    if (!userInput.trim()) return;

    addMessage(userInput, 'user-message');

    // Send request to analyze comments
    try {
        const response = await fetch('http://127.0.0.1:5000/chat', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ query: userInput })
        });

        const data = await response.json();

        if (response.ok) {
            addMessage(data.response, 'bot-message');
        } else {
            addMessage('Error: ' + data.error, 'bot-message');
        }
    } catch (error) {
        addMessage('Failed to connect to server.', 'bot-message');
    }

    document.getElementById('user-input').value = ''; // Clear input field
});

// Function to add messages dynamically to the chat
function addMessage(text, className) {
    const chatBox = document.getElementById('chat-box');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    messageDiv.textContent = text;
    chatBox.appendChild(messageDiv);
    chatBox.scrollTop = chatBox.scrollHeight; // Auto-scroll to bottom
}
