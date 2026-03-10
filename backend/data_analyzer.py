# File: backend/data_analyzer.py
import pandas as pd
import numpy as np
import os
from presidio_analyzer import AnalyzerEngine
import warnings

# Clean logs
warnings.simplefilter(action='ignore', category=FutureWarning)

# Initialize PII Scanner once
try:
    analyzer = AnalyzerEngine()
except Exception as e:
    print(f"Warning: Presidio could not load. PII scanning disabled. {e}")
    analyzer = None

def get_recommended_rows(current_rows):
    if current_rows < 500:
        return 1000, "Your dataset is small. We recommend generating at least 1,000 rows for better statistical learning."
    elif current_rows < 5000:
        return current_rows * 2, "Doubling your row count will improve model robustness."
    else:
        return current_rows, "Your dataset size is optimal for high-accuracy generation."

def analyze_dataset(file_path):
    try:
        df = pd.read_csv(file_path)
    except Exception as e:
        return {"error": f"Could not read file: {str(e)}"}

    total_rows = len(df)
    recommended_count, recommendation_text = get_recommended_rows(total_rows)
    
    analysis_result = {
        "filename": os.path.basename(file_path),
        "total_rows": total_rows,
        "recommended_rows": recommended_count,
        "ai_recommendation": recommendation_text,
        "columns": []
    }

    # Helper for safe PII check
    def check_pii(val):
        if not analyzer: return False, None
        results = analyzer.analyze(text=str(val), entities=["EMAIL_ADDRESS", "PHONE_NUMBER", "US_SSN", "IP_ADDRESS"], language='en')
        return (True, results[0].entity_type) if results else (False, None)

    # Scan sample
    sample_data = df.head(20)

    for col in df.columns:
        # Determine Type
        is_numeric = pd.api.types.is_numeric_dtype(df[col])
        unique_count = df[col].nunique()
        
        col_type = "Categorical"
        if is_numeric and unique_count > 20: 
            col_type = "Numerical"
        if "date" in col.lower() or "time" in col.lower():
            col_type = "Datetime"

        # PII Check
        pii_risk = "None"
        pii_type = None
        
        # Check first 20 rows
        score = 0
        for val in sample_data[col]:
            is_pii, type_found = check_pii(val)
            if is_pii:
                score += 1
                pii_type = type_found
        
        if score > 2:
            pii_risk = "High"

        analysis_result["columns"].append({
            "name": col,
            "type": col_type,
            "unique_values": unique_count,
            "pii_risk": pii_risk,
            "pii_type": pii_type
        })

    return analysis_result