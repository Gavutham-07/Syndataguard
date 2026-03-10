# File: backend/ai_brain.py
import google.generativeai as genai
import pandas as pd
import os

API_KEY = "AIzaSyC9fQ9gFD-dhTvwymiywzwzLG7JAppSFI4" 

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel('gemini-flash-lite-latest')

def get_ai_analysis(file_path):
    try:
        df = pd.read_csv(file_path)
        columns = list(df.columns)
        sample = df.head(3).to_string()
        
        prompt = f"""
        Act as a Senior Data Scientist.
        Dataset Columns: {columns}
        Sample Data:
        {sample}

        Analyze this and return a VALID JSON string (NO MARKDOWN, NO ```json tags) with these exact keys:
        1. "dataset_topic": Short description of what this data is.
        2. "model_recommendation": Which model (TVAE or CTGAN) is best and why?
        3. "privacy_constraints": List of sensitive columns to watch out for.
        """
        response = model.generate_content(prompt)
        
        # Clean up any markdown formatting the AI might add
        clean_text = response.text.replace("```json", "").replace("```", "").strip()
        return clean_text
        
    except Exception as e:
        # Return a JSON error structure so Frontend doesn't break
        return f'{{"dataset_topic": "Error Analysis", "model_recommendation": "Manual Check", "privacy_constraints": "AI Error: {str(e)}"}}'

def chat_with_data(user_message, file_path):
    try:
        df = pd.read_csv(file_path)
        columns = list(df.columns)
        
        prompt = f"""
        Context: Dataset with columns {columns}.
        User Question: "{user_message}"
        Answer simply as a Data Assistant.
        """
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        return f"I'm having trouble thinking right now. Error: {str(e)}"