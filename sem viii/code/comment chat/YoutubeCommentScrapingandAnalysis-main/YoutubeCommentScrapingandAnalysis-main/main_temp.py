from flask import Flask, request, jsonify
import pyfile_web_scraping
import sentiment_analysis_youtube_comments
import pandas as pd
from bertopic import BERTopic  # Import BERTopic
import os
from llm_analysis import analyze_comments 

app = Flask(__name__)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FULL_COMMENTS_PATH = os.path.join(BASE_DIR, "scraped_data", "Full Comments.csv")


@app.route('/scrap', methods=['POST'])
def scrap_comments():
    url = request.json.get('youtube_url') if request.is_json else request.form.get('youtube_url')

    if not url:
        return jsonify({"error": "No YouTube URL provided"}), 400  # Return JSON error

    # Scraping YouTube comments
    file_and_detail = pyfile_web_scraping.scrapfyt(url)
    full_comments_path = "scraped_data/Full Comments.csv"

    # Perform sentiment analysis
    sentiment = sentiment_analysis_youtube_comments.sepposnegcom(full_comments_path)

    # Extract relevant data
    video_title, video_owner, video_comment_with_replies, video_comment_without_replies = file_and_detail[1:]
    pos_comments_csv, neg_comments_csv, video_positive_comments, video_negative_comments = sentiment

    # Convert positive and negative comments CSV to lists
    pos_comments_list = pd.read_csv('Positive Comments.csv').to_dict(orient='records')
    neg_comments_list = pd.read_csv('Negative Comments.csv').to_dict(orient='records')

    # 🔹 Perform Topic Modeling using BERTopic
    comments_df = pd.read_csv(full_comments_path)  # Load all scraped comments
    if "Comment" in comments_df.columns and not comments_df.empty:
        comments = comments_df["Comment"].dropna().tolist()  # Extract comments
        topic_model = BERTopic()  # Initialize BERTopic
        topics, _ = topic_model.fit_transform(comments)  # Apply topic modeling
        topic_info = topic_model.get_topic_info().to_dict(orient="records")  # Extract topic details
    else:
        topic_info = [{"Topic": "No comments available"}]  # Fallback if no comments

    # JSON response for Chrome extension
    return jsonify({
        "message": "Scraping and analysis completed successfully!",
        "video_title": video_title,
        "video_owner": video_owner,
        "comments_with_replies": video_comment_with_replies,
        "comments_without_replies": video_comment_without_replies,
        "positive_comments": video_positive_comments,
        "negative_comments": video_negative_comments,
        "positive_comments_csv": pos_comments_list,
        "negative_comments_csv": neg_comments_list,
        "topic_discussion": topic_info  # 🔥 Added Topic Modeling Output
    })


# 🔹 New API for LLM-based Analysis
@app.route('/chat', methods=['POST'])
def chat():
    # Get the user's query from the POST request
    data = request.get_json()

    if not data or 'query' not in data:
        return jsonify({"error": "No query provided"}), 400
    
    user_query = data['query']  # Extract the query from the request

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
