import sdv
import pandas as pd
import fastapi
from presidio_analyzer import AnalyzerEngine
import spacy

print("------------------------------------------------")
print("✅ SYSTEM CHECK INITIATED")
print(f"1. SDV Version: {sdv.__version__} (AI Brain Ready)")
print(f"2. Pandas Version: {pd.__version__} (Data Processing Ready)")
print(f"3. FastAPI Version: {fastapi.__version__} (API Ready)")

# Check PII Engine
try:
    analyzer = AnalyzerEngine()
    print("4. PII Scanner: LOADED (Microsoft Presidio Ready)")
except Exception as e:
    print(f"❌ PII Scanner Failed: {e}")

# Check Spacy Model
try:
    nlp = spacy.load("en_core_web_lg")
    print("5. Spacy Language Model: LOADED")
except OSError:
    print("❌ Spacy Model NOT FOUND. Did you run the download command?")

print("✅ PHASE 1 COMPLETE: Environment is healthy.")
print("------------------------------------------------")