## Imports
import selenium
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.common.keys import Keys
from selenium.webdriver.support import expected_conditions as EC
from selenium.webdriver.common.by import By
from selenium.webdriver.support.wait import WebDriverWait
from selenium.common import exceptions
from webdriver_manager.chrome import ChromeDriverManager
import time
import io
import pandas as pd
import numpy as np
import csv
import sys
import os  # For directory management

## Function definition
def scrapfyt(url):
    # Create directory for saving scraped data
    save_dir = "scraped_data"
    os.makedirs(save_dir, exist_ok=True)  # Ensure the folder exists
    print(f"✅ Directory '{save_dir}' created or already exists.")

    # Opening Chrome and URL
    option = webdriver.ChromeOptions()
    option.add_argument('--headless')
    option.add_argument('--no-sandbox')
    option.add_argument("--mute-audio")
    option.add_argument("--disable-extensions")
    option.add_argument('--disable-dev-shm-usage')

    # Initialize WebDriver
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=option)

    driver.set_window_size(960, 800)  
    driver.get(url)
    time.sleep(2)

    # Pause YouTube video
    try:
        pause_button = WebDriverWait(driver, 10).until(EC.element_to_be_clickable((By.CLASS_NAME, 'ytp-play-button')))
        pause_button.click()
        time.sleep(0.2)
        pause_button.click()
    except exceptions.TimeoutException:
        print("❌ Timeout: Could not find video play button.")
        driver.quit()
        return None

    time.sleep(4)  

    # Scroll to load comments
    last_height = driver.execute_script("return document.documentElement.scrollHeight")
    while True:
        driver.execute_script("window.scrollTo(0, document.documentElement.scrollHeight);")
        time.sleep(4)
        new_height = driver.execute_script("return document.documentElement.scrollHeight")
        if new_height == last_height:
            break
        last_height = new_height

    # One last scroll to ensure everything is loaded
    driver.execute_script("window.scrollTo(0, document.documentElement.scrollHeight);")

    try:
        # Video Details
        video_title = driver.find_element(By.NAME, 'title').get_attribute('content')
        print(f"🎥 Video Title: {video_title}")

        video_owner_elements = driver.find_elements(By.XPATH, '//*[@id="text"]/a')
        video_owner = video_owner_elements[0].text if video_owner_elements else "Unknown"
        print(f"📢 Video Owner: {video_owner}")

        video_comment_with_replies = driver.find_element(By.XPATH, '//*[@id="count"]/yt-formatted-string/span[1]').text + ' Comments'
        print(f"💬 Total Comments (with replies): {video_comment_with_replies}")

        # Scraping comments
        users = driver.find_elements(By.XPATH, '//*[@id="author-text"]/span')
        comments = driver.find_elements(By.XPATH, '//*[@id="content-text"]')

        # **Debugging Step: Check if comments exist**
        if not users or not comments:
            print("⚠️ No comments found. Exiting.")
            driver.quit()
            return None

        print(f"📥 Found {len(comments)} comments.")

        # File paths for saving
        comments_csv_path = os.path.join(save_dir, "comments.csv")
        full_comments_csv_path = os.path.join(save_dir, "Full Comments.csv")

        # Saving comments to CSV
        with io.open(comments_csv_path, 'w', newline='', encoding="utf-16") as file:
            writer = csv.writer(file, delimiter=",", quoting=csv.QUOTE_ALL)
            writer.writerow(["Username", "Comment"])
            for username, comment in zip(users, comments):
                writer.writerow([username.text, comment.text])

        print(f"✅ Comments saved to {comments_csv_path}")

        # Reading the comments from CSV into a DataFrame
        commentsfile = pd.read_csv(comments_csv_path, encoding="utf-16")

        # Clean NaN values
        all_comments = commentsfile.replace(np.nan, '-', regex=True)

        # Save full comments to a new CSV
        all_comments.to_csv(full_comments_csv_path, index=False)
        print(f"✅ Full Comments saved to {full_comments_csv_path}")

        # Total comments without replies
        video_comment_without_replies = str(len(commentsfile)) + ' Comments'
        print(f"💬 Total Comments (without replies): {video_comment_without_replies}")

        return all_comments, video_title, video_owner, video_comment_with_replies, video_comment_without_replies

    except Exception as e:
        print(f"❌ Error occurred while scraping: {e}")
        return None

    finally:
        driver.quit()  # Close the driver after scraping is finished
