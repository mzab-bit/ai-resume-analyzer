# 🧠 AI Resume Analyzer

An AI-powered web app that analyzes resumes (PDF/DOCX), extracts skills,
and compares them against a job description to highlight skill gaps and
give improvement suggestions.

## Features
- Upload a resume in PDF or DOCX format
- Extracts technical & soft skills using keyword-based detection
- Paste a job description to get a **match score** and **missing skills**
- Actionable suggestions to improve your resume

## Tech Stack
- **Backend:** FastAPI (Python)
- **Resume Parsing:** pdfplumber, python-docx
- **Frontend:** HTML, Bootstrap 5, vanilla JS

## How to Run

1. Create and activate a virtual environment:
   ```bash
   python -m venv venv
   # Windows:
   venv\Scripts\activate
   # Mac/Linux:
   source venv/bin/activate
   ```

2. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```

3. Run the app:
   ```bash
   uvicorn main:app --reload
   ```

4. Open your browser at: `http://127.0.0.1:8000`

## Project Structure
```
ai-resume-analyzer/
├── main.py            # FastAPI app & routes
├── analyzer.py         # Resume parsing + skill-gap analysis logic
├── skills_data.py       # Skills database used for matching
├── requirements.txt
├── templates/
│   └── index.html      # Frontend UI
├── static/
│   ├── style.css
│   └── script.js
└── README.md
```

## Future Improvements
- Use an LLM API (OpenAI/Gemini) for smarter, natural-language suggestions
- Semantic skill matching (via embeddings) instead of exact keyword match
- ATS-friendliness scoring (formatting, sections, length)
- Support multiple job descriptions at once

## Author
Zubair — BS Software Engineering, Lahore Garrison University
