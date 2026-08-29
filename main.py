"""
main.py
FastAPI backend for the AI Resume Analyzer.

Run locally with:
    uvicorn main:app --reload

Then open http://127.0.0.1:8000 in your browser.
"""

import os
import shutil
import uuid

from fastapi import FastAPI, File, UploadFile, Form
from fastapi.responses import HTMLResponse, JSONResponse, PlainTextResponse
from fastapi.staticfiles import StaticFiles

from pydantic import BaseModel
from analyzer import extract_text, analyze_resume, generate_cover_letter

app = FastAPI(title="AI Resume Analyzer")

UPLOAD_DIR = "uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)

app.mount("/static", StaticFiles(directory="static"), name="static")


class CoverLetterRequest(BaseModel):
    resume_skills: list = []
    jd_skills: list = []
    job_title: str = "Software Engineer"
    company_name: str = "Hiring Team"


@app.get("/", response_class=HTMLResponse)
async def home():
    with open(os.path.join("templates", "index.html"), "r", encoding="utf-8") as f:
        return HTMLResponse(content=f.read())


@app.get("/robots.txt", response_class=PlainTextResponse)
async def robots():
    return "User-agent: *\nAllow: /\n"


@app.get("/sitemap.xml", response_class=PlainTextResponse)
async def sitemap():
    return """<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>/</loc>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>"""



@app.post("/analyze")
async def analyze(
    resume: UploadFile = File(...),
    job_description: str = Form(default=""),
):
    # Save uploaded file temporarily with a unique name
    ext = os.path.splitext(resume.filename)[1]
    temp_filename = f"{uuid.uuid4().hex}{ext}"
    temp_path = os.path.join(UPLOAD_DIR, temp_filename)

    try:
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(resume.file, buffer)

        resume_text = extract_text(temp_path)

        if not resume_text.strip():
            return JSONResponse(
                status_code=400,
                content={"error": "Couldn't extract text from this file. Please try a different PDF/DOCX."},
            )

        result = analyze_resume(resume_text, job_description)
        return JSONResponse(content=result)

    except ValueError as e:
        return JSONResponse(status_code=400, content={"error": str(e)})
    except Exception as e:
        return JSONResponse(status_code=500, content={"error": f"Something went wrong: {str(e)}"})
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.post("/generate-cover-letter")
async def api_cover_letter(req: CoverLetterRequest):
    letter = generate_cover_letter(
        resume_skills=req.resume_skills,
        jd_skills=req.jd_skills,
        job_title=req.job_title,
        company_name=req.company_name
    )
    return JSONResponse(content={"cover_letter": letter})

