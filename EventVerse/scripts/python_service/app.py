import os
import re
from flask import Flask, request, jsonify
import google.generativeai as genai  # Only import the package, not submodules/classes

# Configure Gemini API key:
# Uses env GEMINI_API_KEY if present; otherwise falls back to the provided key you shared.
GEMINI_KEY = os.getenv("GEMINI_API_KEY", "AIzaSyDT4ctqyTDmnVf5HWXmyksN6vEBUTB_c_E")
genai.configure(api_key=GEMINI_KEY)  # This is correct for recent versions

model = genai.GenerativeModel("gemini-2.5-flash")  # This is correct for recent versions
app = Flask(__name__)

def clean_output(text: str):
    # Ported from main.py behavior
    description = ""
    hashtags = []

    lines = text.splitlines()
    for line in lines:
        s = line.strip()
        if not s:
            continue
        if s.startswith("#"):
            hashtags.append(s)
        elif not s.lower().startswith(("here's", "1.", "2.", "**")):
            description += s + " "

    description = description.strip()

    # find inline tags
    inline_tags = re.findall(r"#\w+", text)
    for tag in inline_tags:
        if tag not in hashtags:
            hashtags.append(tag)

    hashtags_clean = [h.lstrip("#") for h in hashtags]
    return description, hashtags, hashtags_clean

def analyze_media(file_url: str | None, file_path: str | None, media_type: str):
    prompt = (
    f"Analyze this {media_type} and generate content suitable for Instagram:\n"
    "1. Write a short, catchy description in 2-4 lines.\n"
    "2. Suggest 2-3 relevant hashtags that are trendy and related to the content.\n"
    "Ensure the description is engaging and fits Instagram style."
)


    if file_url:
        resp = model.generate_content([prompt, file_url])
    elif file_path:
        uploaded = genai.upload_file(file_path)  # This is correct for recent versions
        resp = model.generate_content([prompt, uploaded])
    else:
        raise ValueError("Either fileUrl or filePath is required.")

    text = resp.text.strip()
    description, hashtags, hashtags_clean = clean_output(text)

    usage = getattr(resp, "usage_metadata", None)
    usage_json = None
    if usage:
        usage_json = {
            "prompt_tokens": getattr(usage, "prompt_token_count", None),
            "candidate_tokens": getattr(usage, "candidates_token_count", None),
            "total_tokens": getattr(usage, "total_token_count", None),
        }

    return {
        "description": description,
        "hashtags": hashtags,
        "hashtags_clean": hashtags_clean,
        "usage": usage_json,
        "raw_text": text,
    }

def load_hashtags_from_file(path: str):
    if not os.path.exists(path):
        return []
    with open(path, "r", encoding="utf-8") as f:
        return [line.strip().lower() for line in f if line.strip()]

def find_similar_hashtags(words: list[str], hashtags: list[str]):
    results: dict[str, list[str]] = {}
    for word in words:
        prompt = (
            f"You are given a list of hashtags: {hashtags}\n"
            f"Find hashtags that are either:\n"
            f"1. Exact match for '{word}'\n"
            f"2. Or semantically similar (same or close meaning).\n"
            f"Return only hashtags as a list (no explanation)."
        )
        try:
            resp = model.generate_content(prompt)
            lines = [ln.strip() for ln in resp.text.strip().splitlines() if ln.strip()]
            # normalize list items, strip leading '#' if present
            matches = [ln.lstrip("#").lstrip("-").strip() for ln in lines]
            results[word] = matches
        except Exception as e:
            results[word] = [f"Error: {str(e)}"]
    return results

@app.post("/analyze")
def analyze():
    data = request.get_json(force=True, silent=True) or {}
    file_url = data.get("fileUrl")
    file_path = data.get("filePath")
    media_type = (data.get("mediaType") or "image").lower()
    try:
        result = analyze_media(file_url, file_path, media_type)
        return jsonify({"ok": True, **result}), 200
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

@app.post("/recommend")
def recommend():
    data = request.get_json(force=True, silent=True) or {}
    words = data.get("words") or []
    hashtags = data.get("hashtags")
    hashtags_file_path = data.get("hashtagsFilePath")  # optional override

    if hashtags is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        default_path = os.path.join(base_dir, "hashtags.txt")
        load_path = hashtags_file_path or default_path
        hashtags = load_hashtags_from_file(load_path)

    try:
        results = find_similar_hashtags(words, hashtags)
        return jsonify({"ok": True, "results": results}), 200
    except Exception as e:
        return jsonify({"ok": False, "error": str(e)}), 400

if __name__ == "__main__":
    # Runs on localhost:8000 — Node backend will call this.
    app.run(host="127.0.0.1", port=8000, debug=False)
