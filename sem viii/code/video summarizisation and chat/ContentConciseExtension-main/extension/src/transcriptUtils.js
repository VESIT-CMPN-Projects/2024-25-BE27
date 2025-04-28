export function generateStructuredData(description, transcript) {
    const timestampRegex = /(\d{1,2}:\d{2}(?::\d{2})?)\s+-?\s*(.+)/g;

    const timestamps = [];
    let match;

    // Extract timestamps and titles from description
    while ((match = timestampRegex.exec(description)) !== null) {
        timestamps.push({
            stime: match[1], // Start time
            title: match[2].trim() // Title
        });
    }

    // Check if any timestamps were found
    if (timestamps.length === 0) {
        return false;
    }

    const structuredData = [];
    for (let i = 0; i < timestamps.length; i++) {
        const stime = timestamps[i].stime;
        const etime = timestamps[i + 1] ? timestamps[i + 1].stime : "END"; // Next timestamp's stime or "END"
        const title = timestamps[i].title;

        const text = extractRelevantText(stime, etime, transcript); // Extract text for the section

        structuredData.push(`${stime} - ${etime} - ${title} - ${text}`);
    }

    return structuredData;
}

function extractRelevantText(stime, etime, transcript) {
    // Convert timestamps into milliseconds
    const toMilliseconds = (time) => {
        const parts = time.split(":").map(Number);
        if (parts.length === 2) return parts[0] * 60 * 1000 + parts[1] * 1000; // MM:SS
        if (parts.length === 3) return parts[0] * 3600 * 1000 + parts[1] * 60 * 1000 + parts[2] * 1000; // HH:MM:SS
        return 0;
    };

    const stimeMs = toMilliseconds(stime);
    const etimeMs = etime === "END" ? Infinity : toMilliseconds(etime);

    // Filter transcript events within the time range
    const relevantEvents = transcript.events.filter((event) => {
        const eventTime = event.tStartMs;
        return eventTime >= stimeMs && eventTime < etimeMs;
    });

    // Concatenate and clean the text
    return relevantEvents
        .map((event) => event.segs?.map((seg) => seg.utf8).join(' ') || '')
        .join(' ')
        .replace(/[\u200B-\u200D\uFEFF]/g, '')
        .replace(/\s+/g, ' ')
        .trim();
}
