// Get the current YouTube video URL
const videoUrl = window.location.href;

// Send it to the background script or use it in the extension
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getVideoUrl") {
    sendResponse({ url: videoUrl });
  }
});
