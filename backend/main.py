# File: backend/main.py
import math
import asyncio
from fastapi import FastAPI, UploadFile, File, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from starlette.concurrency import run_in_threadpool
import shutil
import os
import pandas as pd

from data_analyzer import analyze_dataset
from models import train_and_generate
from trainer import get_accuracy_report, generate_ai_summary
from ai_brain import get_ai_analysis, chat_with_data 

app = FastAPI(title="SynData Guard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

UPLOAD_DIR = "storage/uploads"
MODEL_DIR = "storage/models"
OUTPUT_DIR = "storage/outputs"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)

# --- REAL-TIME JOB TRACKER ---
JOB_STATUS = {}

def sanitize_for_json(data):
    if isinstance(data, float) and math.isnan(data):
        return 0.0
    elif isinstance(data, dict):
        return {k: sanitize_for_json(v) for k, v in data.items()}
    elif isinstance(data, list):
        return [sanitize_for_json(v) for v in data]
    return data

@app.get("/")
def home():
    return {"message": "SynData Guard System Active"}

# --- STATUS ENDPOINT ---
@app.get("/status/{filename}")
async def get_status(filename: str):
    # Returns the live status, defaulting to 0 if not started
    return JOB_STATUS.get(filename, {"step": "Initializing...", "progress": 0})

@app.post("/upload")
async def upload_file(file: UploadFile = File(...)):
    file_path = os.path.join(UPLOAD_DIR, file.filename)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)
    
    analysis_report = analyze_dataset(file_path)
    if "error" in analysis_report:
        raise HTTPException(status_code=400, detail=analysis_report["error"])
        
    return analysis_report

@app.post("/analyze_ai")
async def analyze_with_ai(filename: str = Body(..., embed=True)):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")
    ai_insight = get_ai_analysis(file_path)
    return {"ai_response": ai_insight}

@app.post("/chat")
async def chat_endpoint(filename: str = Body(...), message: str = Body(...)):
    file_path = os.path.join(UPLOAD_DIR, filename)
    response = chat_with_data(message, file_path)
    return {"response": response}

@app.post("/generate_advanced")
async def generate_advanced(
    filename: str = Body(...),
    model_type: str = Body(...),
    rows: int = Body(...),
    frozen_cols: list = Body([]),
    removed_cols: list = Body([])
):
    file_path = os.path.join(UPLOAD_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="File not found")

    try:
        # Step 1: Initialize
        JOB_STATUS[filename] = {"step": f"Training {model_type.upper()} Neural Network (This takes time)...", "progress": 15}
        
        # We use run_in_threadpool so the heavy ML task doesn't freeze the /status endpoint
        csv_path, synthetic_df = await run_in_threadpool(
            train_and_generate, file_path, model_type, rows, frozen_cols, removed_cols
        )
        
        # Step 2: Evaluation
        JOB_STATUS[filename] = {"step": "Evaluating Fidelity Score via SDMetrics...", "progress": 75}
        accuracy, chart_data = await run_in_threadpool(
            get_accuracy_report, file_path, synthetic_df
        )
        
        # Step 3: AI Summary
        JOB_STATUS[filename] = {"step": "Consulting AI Analyst...", "progress": 90}
        safe_accuracy = sanitize_for_json(accuracy)
        safe_chart_data = sanitize_for_json(chart_data)
        safe_sample_data = sanitize_for_json(synthetic_df.head(5).to_dict(orient="records"))
        
        ai_summary_text = await run_in_threadpool(
            generate_ai_summary, safe_accuracy, model_type
        )
        
        # Step 4: Finalize Paths
        JOB_STATUS[filename] = {"step": "Finalizing payload...", "progress": 100}
        
        # --- THE FIX: Define safe_csv_path BEFORE returning it ---
        safe_csv_path = csv_path.replace("\\", "/")
        
        return {
            "status": "Success",
            "accuracy_score": safe_accuracy,
            "ai_summary": ai_summary_text,
            "chart_data": safe_chart_data,
            "sample_data": safe_sample_data,
            "download_url": f"http://localhost:8000/download?path={safe_csv_path}"
        }
    except Exception as e:
        JOB_STATUS[filename] = {"step": "Error occurred!", "progress": 0}
        print(f"Generation Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/download")
async def download_file(path: str):
    return FileResponse(path, media_type='text/csv', filename=os.path.basename(path))

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)