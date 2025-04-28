import google.generativeai as genai # type: ignore
import pandas as pd

# 🔹 Configure Gemini API Key (Replace 'your-api-key' with an actual key)
genai.configure(api_key="AIzaSyBefbLxIwo7cOR_17puATVCZzBVlSyQu38")

def analyze_comments(csv_path, user_prompt):
    # Load Comments
    comments_df = pd.read_csv(csv_path)
    comments = comments_df["Comment"].dropna().tolist()

    # Limit number of comments for better processing
    limited_comments = comments[:100] if len(comments) > 100 else comments

    # 🔹 Create a prompt for the LLM with user input
    prompt = f"ANSWER IN 2 LINES  {user_prompt}\n\n{limited_comments}"

    # 🔹 Gemini API Call
    model = genai.GenerativeModel('gemini-2.0-flash')
    response = model.generate_content(prompt)

    return response.text
