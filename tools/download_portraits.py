import os
import re
import requests
from bs4 import BeautifulSoup
from urllib.parse import urljoin

# --- Configuration ---
BASE_URL = os.environ.get("PORTRAIT_SOURCE_URL", "")
OUTPUT_DIR = "assets/portraits/source_raw"

def download_portraits():
    if not os.path.exists(OUTPUT_DIR):
        os.makedirs(OUTPUT_DIR)

    if not BASE_URL:
        print("Error: PORTRAIT_SOURCE_URL is not set.")
        return

    print(f"Fetching page: {BASE_URL}")
    response = requests.get(BASE_URL)
    if response.status_code != 200:
        print(f"Error: Failed to fetch page. Status code: {response.status_code}")
        return

    soup = BeautifulSoup(response.text, 'html.parser')
    
    # Looking for images in the portraits section
    # The links are in <a> tags with class 'portrait__content'
    
    portrait_links = soup.find_all('a', class_='portrait__content')
    download_count = 0
    
    for link in portrait_links:
        src = link.get('href')
        caption = link.get('data-caption', '')
        
        if not src:
            continue
            
        img_url = urljoin("https://kongming.net/", src)
        
        # Create a clean filename from the data-download-filename or the src
        filename = link.get('data-download-filename')
        if not filename:
            filename = os.path.basename(src)
            
        output_path = os.path.join(OUTPUT_DIR, filename)
        
        # Skip if already exists
        if os.path.exists(output_path):
            continue
            
        print(f"Downloading: {filename} from {img_url}")
        try:
            img_response = requests.get(img_url)
            if img_response.status_code == 200:
                with open(output_path, 'wb') as f:
                    f.write(img_response.content)
                download_count += 1
            else:
                print(f"Failed to download {img_url}: Status {img_response.status_code}")
        except Exception as e:
            print(f"Failed to download {img_url}: {e}")

    print(f"Finished! Downloaded {download_count} portraits to {OUTPUT_DIR}")

if __name__ == "__main__":
    # Check if bs4 is installed, if not try to install it or use regex
    try:
        import bs4
    except ImportError:
        print("BeautifulSoup4 not found. Installing...")
        import subprocess
        subprocess.check_call(["pip", "install", "beautifulsoup4"])
        from bs4 import BeautifulSoup
        
    download_portraits()

