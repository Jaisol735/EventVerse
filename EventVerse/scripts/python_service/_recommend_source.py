from dotenv import load_dotenv
import os
import google.generativeai as genai

# Load .env API key
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

if not api_key:
    api_key = input("Enter your Gemini API key: ").strip()

genai.configure(api_key=api_key)
model = genai.GenerativeModel("gemini-2.5-flash")

def load_hashtags(file="hashtags.txt"):
    """Load hashtags from file"""
    if not os.path.exists(file):
        return []
    with open(file, "r", encoding="utf-8") as f:
        return [line.strip().lower() for line in f if line.strip()]

def find_similar_hashtags(words, hashtags):
    """Use Gemini to find exact + semantically similar hashtags"""
    results = {}
    for word in words:
        prompt = (
            f"You are given a list of hashtags: {hashtags}\n"
            f"Find hashtags that are either:\n"
            f"1. Exact match for '{word}'\n"
            f"2. Or semantically similar (same or close meaning).\n"
            f"Return only hashtags as a list (no explanation)."
        )
        try:
            response = model.generate_content(prompt)
            matches = response.text.strip().splitlines()
            matches = [m.strip().lstrip("#") for m in matches if m.strip()]
            results[word] = matches
        except Exception as e:
            results[word] = [f"⚠️ Error: {e}"]
    return results

def main():
    user_input = input("Enter words in format 'Word: word1 word2 word3 ...': ").strip()
    
    if not user_input.lower().startswith("word:"):
        print("❌ Invalid format! Use: Word: word1 word2 word3 ...")
        return
    
    words = user_input.split(":", 1)[1].strip().split()
    hashtags = load_hashtags()

    if not hashtags:
        print("⚠️ No hashtags found in hashtags.txt")
        return
    
    results = find_similar_hashtags(words, hashtags)
    
    print("\n🔎 Search Results:")
    for word, matches in results.items():
        print(f"\n{word.capitalize()} → {matches}")

if __name__ == "__main__":
    main()
