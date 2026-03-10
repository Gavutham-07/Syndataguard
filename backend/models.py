# File: backend/models.py
from sdv.single_table import CTGANSynthesizer, TVAESynthesizer, GaussianCopulaSynthesizer
from sdv.metadata import SingleTableMetadata
import pandas as pd
import numpy as np 
import os
import warnings

# Suppress those annoying warnings
warnings.filterwarnings("ignore")

MODEL_DIR = "storage/models"
OUTPUT_DIR = "storage/outputs"
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

def get_model_class(model_type):
    """
    Returns the correct SDV class based on user choice.
    """
    if model_type == "tvae":
        return TVAESynthesizer
    elif model_type == "gaussian":
        return GaussianCopulaSynthesizer
    elif model_type == "ctgan":
        return CTGANSynthesizer
    else:
        return TVAESynthesizer 

def train_and_generate(file_path, model_type, rows_to_generate, frozen_cols=[], removed_cols=[]):
    """
    1. Loads data
    2. Removes unwanted columns
    3. Trains selected model
    4. Generates data
    5. Overwrites 'Frozen' columns with real data (Sampling)
    """
    # 1. Load Data
    try:
        data = pd.read_csv(file_path)
    except Exception as e:
        raise ValueError(f"Failed to read CSV: {e}")
    
    # 2. Remove Columns (if any)
    valid_removed = [c for c in removed_cols if c not in frozen_cols and c in data.columns]
    if valid_removed:
        data = data.drop(columns=valid_removed, errors='ignore')

    # 3. Detect Metadata
    metadata = SingleTableMetadata()
    metadata.detect_from_dataframe(data)

    # 4. Initialize Model
    ModelClass = get_model_class(model_type)
    model = ModelClass(metadata)
    
    # 5. Train
    print(f"Starting training with {model_type}...")
    model.fit(data)
    
    # 6. Generate (AI guesses everything first)
    print(f"Generating {rows_to_generate} rows...")
    synthetic_data = model.sample(num_rows=rows_to_generate)
    
    # 7. Apply "Freezing" Logic
    if frozen_cols:
        print(f"Applying lock to columns: {frozen_cols}")
        for col in frozen_cols:
            if col in data.columns and col in synthetic_data.columns:
                real_values = data[col].values
                filled_values = np.random.choice(real_values, size=rows_to_generate, replace=True)
                synthetic_data[col] = filled_values

    # 8. Save Output
    filename = os.path.basename(file_path)
    output_path = os.path.join(OUTPUT_DIR, f"synthetic_{filename}")
    synthetic_data.to_csv(output_path, index=False)
    
    return output_path, synthetic_data