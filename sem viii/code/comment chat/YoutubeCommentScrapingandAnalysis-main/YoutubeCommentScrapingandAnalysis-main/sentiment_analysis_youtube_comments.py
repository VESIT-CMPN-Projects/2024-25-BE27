## Imports
import pandas as pd
import csv
import nltk
import os
from nltk.sentiment.vader import SentimentIntensityAnalyzer  # Ensure correct import

## Function definition
def sepposnegcom(comment_file):
    print(f"\nReading dataset from: {comment_file}")  # Debugging step

    ## Reading Dataset
    dataset = pd.read_csv(comment_file, encoding_errors='ignore')
    print(f"\nDataset shape: {dataset.shape}")  # Print dataset size
    print("\nDataset Preview:\n", dataset.head())  # Print first few rows

    if 'Comment' not in dataset.columns:
        print("Error: 'Comment' column not found in dataset!")  # Debugging step
        return None, None, '0 Comments', '0 Comments'

    ## Remove missing values in 'Comment' column
    dataset = dataset.dropna(subset=['Comment'])
    print(f"\nDataset shape after dropping NaN comments: {dataset.shape}")

    ## Sentiment analysis of comments using VADER sentiment analyzer
    analyser = SentimentIntensityAnalyzer()

    def vader_sentiment_result(sent):
        scores = analyser.polarity_scores(sent)
        sentiment = "Positive" if scores["pos"] > scores["neg"] else "Negative"
        
        print(f"\nComment: {sent}")  # Debugging
        print(f"Sentiment Scores: {scores}")  # Debugging
        print(f"Assigned Sentiment: {sentiment}")  # Debugging

        return 1 if scores["pos"] > scores["neg"] else 0  # 1 for Positive, 0 for Negative

    dataset['vader_sentiment'] = dataset['Comment'].apply(lambda x: vader_sentiment_result(str(x)))

    ## Check sentiment analysis output
    print("\nSentiment Distribution:\n", dataset['vader_sentiment'].value_counts())  # Debugging step

    ## Fix: Convert sentiment column to integer (to prevent `(1,)` issue)
    dataset['vader_sentiment'] = dataset['vader_sentiment'].astype(int)

    ## Separating Positive and Negative Comments
    for sentiment, group in dataset.groupby('vader_sentiment'):
        sentiment_str = str(sentiment)  # Convert to string
        filename = f"{sentiment_str}.csv"
        print(f"\nSaving {filename} with {len(group)} records")  # Debugging
        group.to_csv(filename, index=False)

    ## Handling empty CSV files **only if no comments exist**
    if not os.path.exists('1.csv') or os.stat('1.csv').st_size == 0:
        print("\nNo positive comments found, creating empty file.")  # Debugging
        with open('1.csv', 'w', encoding='UTF8', newline='') as f1:
            writer1 = csv.writer(f1)
            writer1.writerow(['Username', 'Comment'])
            writer1.writerow(['No Positive Comments', ''])

    if not os.path.exists('0.csv') or os.stat('0.csv').st_size == 0:
        print("\nNo negative comments found, creating empty file.")  # Debugging
        with open('0.csv', 'w', encoding='UTF8', newline='') as f0:
            writer0 = csv.writer(f0)
            writer0.writerow(['Username', 'Comment'])
            writer0.writerow(['No Negative Comments', ''])

    ## Read the positive and negative comments into DataFrames
    pos = pd.read_csv("1.csv", engine='python')
    neg = pd.read_csv("0.csv", engine='python')

    ## Save the positive and negative comments to new CSV files
    pos.to_csv("Positive Comments.csv", index=False)
    neg.to_csv("Negative Comments.csv", index=False)

    ## Print final CSV content for debugging
    print("\nFinal Positive Comments CSV:\n", pos.head())
    print("\nFinal Negative Comments CSV:\n", neg.head())

    ## Count the number of positive and negative comments
    video_positive_comments = f"{len(pos)} Comments"
    video_negative_comments = f"{len(neg)} Comments"

    ## Handle the case where no positive or negative comments exist
    if len(pos) == 0:
        video_positive_comments = '0 Comments'
    if len(neg) == 0:
        video_negative_comments = '0 Comments'

    print(f"\nFinal Counts - Positive: {video_positive_comments}, Negative: {video_negative_comments}")  # Debugging

    ## Return function
    return pos, neg, video_positive_comments, video_negative_comments
