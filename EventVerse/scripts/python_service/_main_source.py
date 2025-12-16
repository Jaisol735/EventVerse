from dotenv import load_dotenv
import os
import google.generativeai as genai  # Only import the package, not submodules/classes
import re

# 🔹 Load .env variables
load_dotenv()
api_key = os.getenv("GOOGLE_API_KEY")

# 🔹 Fallback to manual input if env not found
if not api_key:
    api_key = input("Enter your Gemini API key: ").strip()

# 🔑 Configure Gemini
genai.configure(api_key=api_key)  # This is correct for recent versions

model = genai.GenerativeModel("gemini-2.5-flash")  # This is correct for recent versions


def clean_output(text):
    """Extract clean description and hashtags from Gemini response."""
    description = ""
    hashtags = []

    lines = text.splitlines()
    for line in lines:
        line = line.strip()
        if line.startswith("#"):
            hashtags.append(line)
        elif line and not line.lower().startswith(("here's", "1.", "2.", "**")):
            description += line + " "
    
    description = description.strip()
    # Find hashtags inside text using regex (if Gemini put them inline)
    inline_tags = re.findall(r"#\w+", text)
    for tag in inline_tags:
        if tag not in hashtags:
            hashtags.append(tag)
    
    # Clean hashtags → remove "#" symbol for storage
    hashtags_clean = [tag.lstrip("#") for tag in hashtags]

    return description, hashtags, hashtags_clean


def analyze_media(file_path, media_type):
    """Send image or video to Gemini and get description + hashtags + usage stats."""
    prompt = (
    f"Analyze this {media_type} and generate content suitable for Instagram:\n"
    "1. Write a short, catchy description in 2-4 lines.\n"
    "2. Suggest 2-3 relevant hashtags that are trendy and related to the content.\n"
    "Ensure the description is engaging and fits Instagram style."
)


    # Check if input is a URL or local file
    if file_path.startswith("http"):
        response = model.generate_content([prompt, file_path])
    else:
        uploaded_file = genai.upload_file(file_path)  # This is correct for recent versions
        response = model.generate_content([prompt, uploaded_file])

    description_text = response.text.strip()
    usage = response.usage_metadata
    description, hashtags, hashtags_clean = clean_output(description_text)
    return description, hashtags, hashtags_clean, usage


def save_output(media_type, description, hashtags, hashtags_clean, usage):
    """Save results in terminal + two txt files."""
    output = (
        f"1\n"
        f"{media_type}\n"
        f"Description: {description}\n"
        f"Hashtags: {hashtags}\n"
        f"Tokens used → Input: {usage.prompt_token_count}, "
        f"Output: {usage.candidates_token_count}, "
        f"Total: {usage.total_token_count}\n"
        f"{'-'*50}\n"
    )

    # Print to terminal
    print(output)

    # Save formatted output
    with open("output.txt", "w", encoding="utf-8") as f:
        f.write(output)

    # Save hashtags (append, one per line)
    with open("hashtags.txt", "a", encoding="utf-8") as f:
        for tag in hashtags_clean:
            f.write(tag + "\n")


def main():
    file_path = input("Enter image/video path or URL: ").strip()
    media_type = input("Is this an 'image' or 'video'? ").strip().lower()

    if media_type not in ["image", "video"]:
        print("❌ Invalid input! Please enter 'image' or 'video'.")
        return

    print("⏳ Sending to Gemini... please wait.")
    try:
        description, hashtags, hashtags_clean, usage = analyze_media(file_path, media_type)
        save_output(media_type.capitalize(), description, hashtags, hashtags_clean, usage)
    except Exception as e:
        print(f"⚠️ Error: {e}")


if __name__ == "__main__":
    main()
    main()
