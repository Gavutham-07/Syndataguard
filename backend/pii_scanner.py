# File: backend/pii_scanner.py
from presidio_analyzer import AnalyzerEngine
import pandas as pd

# Initialize the engine once (it's heavy)
analyzer = AnalyzerEngine()

def scan_pii(df: pd.DataFrame):
    """
    Scans a DataFrame for PII columns.
    Returns a list of suspicious columns and what kind of PII they might contain.
    """
    pii_results = []
    
    # We only check the first 20 rows to be fast
    sample_data = df.head(20)
    
    for column in df.columns:
        # Convert column data to a list of strings
        column_values = sample_data[column].astype(str).tolist()
        
        # Check for PII in this column
        score = 0
        pii_type = "Unknown"
        
        for value in column_values:
            results = analyzer.analyze(text=value, entities=["EMAIL_ADDRESS", "PHONE_NUMBER", "PERSON", "US_SSN", "IP_ADDRESS"], language='en')
            if results:
                score += 1
                pii_type = results[0].entity_type
        
        # If more than 10% of the rows have PII, flag the column
        if score > 2: 
            pii_results.append({
                "column": column,
                "type": pii_type,
                "risk": "High"
            })
            
    return pii_results