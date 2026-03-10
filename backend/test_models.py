import google.generativeai as genai

# PASTE YOUR KEY HERE
API_KEY = "AIzaSyC9fQ9gFD-dhTvwymiywzwzLG7JAppSFI4" 

genai.configure(api_key=API_KEY)

print("Fetching available models...")
try:
    for m in genai.list_models():
        if 'generateContent' in m.supported_generation_methods:
            print(f"- {m.name}")
except Exception as e:
    print(f"Error: {e}")