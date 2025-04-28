from flask import Flask, request, jsonify
import os
import pyfile_web_scraping  # Import scraping function
import pandas as pd
from llm_analysis import analyze_comments  # Import the LLM analysis function
from flask_cors import CORS   # type: ignore

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}}) 

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FULL_COMMENTS_PATH = os.path.join(BASE_DIR, "scraped_data", "Full Comments.csv")


# 🔹 Route for Scraping YouTube Comments
@app.route('/scrap', methods=['POST'])
def scrap_comments():
    url = request.json.get('youtube_url') if request.is_json else request.form.get('youtube_url')

    if not url:
        return jsonify({"error": "No YouTube URL provided"}), 400  # Return JSON error

    # Scraping YouTube comments
    file_and_detail = pyfile_web_scraping.scrapfyt(url)
    full_comments_path = "scraped_data/Full Comments.csv"

    # Return scraping result as JSON
    video_title, video_owner, video_comment_with_replies, video_comment_without_replies = file_and_detail[1:]
    return jsonify({
        "message": "Scraping completed successfully!",
        "video_title": video_title,
        "video_owner": video_owner,
        "comments_with_replies": video_comment_with_replies,
        "comments_without_replies": video_comment_without_replies,
        "comments_csv_path": full_comments_path
    })


# 🔹 New API for LLM-based Analysis of Comments
@app.route('/chat', methods=['POST'])
def chat():
    # Get the user's query from the POST request
    data = request.get_json()

    if not data or 'message' not in data:
        return jsonify({"error": "No query provided"}), 400
    
    user_query = data['message']  # Extract the query from the request

    # Path to the full comments CSV file
    full_comments_path = "scraped_data/Full Comments.csv"

    # Get the user-provided prompt and pass it to the analyze_comments function
    summary = analyze_comments(full_comments_path, user_query)

    # Return the LLM's response as JSON
    return jsonify({
        "message": "Response generated successfully!",
        "response": summary
    })


if __name__ == "__main__":
    app.run(debug=True)
