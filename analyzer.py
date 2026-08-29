"""
analyzer.py
Core logic for the AI Resume Analyzer:
1. Extract text from PDF / DOCX resumes
2. Detect skills present in resume + job description
3. Compare the two to find skill gaps
4. Generate simple improvement suggestions

FUTURE FEATURE IDEAS (add these later):
- Swap keyword matching for a real NLP/embedding model (e.g. sentence-
  transformers) for fuzzy/semantic skill matching instead of exact text match.
- Use an LLM API (OpenAI/Gemini) to generate personalized, natural-language
  improvement suggestions instead of static templates.
- Score resume formatting/ATS-friendliness (bullet count, length, sections).
- Support multiple job descriptions and rank resume fit against each.
- Extract and validate contact info, LinkedIn/GitHub links.
"""

import re
import pdfplumber
import docx
from skills_data import SKILLS_DB


def extract_text_from_pdf(file_path: str) -> str:
    text = ""
    with pdfplumber.open(file_path) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text += page_text + "\n"
    return text


def extract_text_from_docx(file_path: str) -> str:
    doc = docx.Document(file_path)
    return "\n".join(paragraph.text for paragraph in doc.paragraphs)


def extract_text(file_path: str) -> str:
    if file_path.lower().endswith(".pdf"):
        return extract_text_from_pdf(file_path)
    elif file_path.lower().endswith(".docx"):
        return extract_text_from_docx(file_path)
    else:
        raise ValueError("Unsupported file type. Please upload a PDF or DOCX file.")


def find_skills(text: str) -> set:
    """Find which known skills from SKILLS_DB appear in the given text."""
    text_lower = text.lower()
    found = set()
    for skill in SKILLS_DB:
        # word-boundary-safe match, handles multi-word skills too
        pattern = r'(?<!\w)' + re.escape(skill) + r'(?!\w)'
        if re.search(pattern, text_lower):
            found.add(skill)
    return found


# Comprehensive list of high-impact ATS power action verbs
ACTION_VERBS_DB = [
    "accelerated", "achieved", "administered", "advanced", "advised", "allocated",
    "analyzed", "architected", "assembled", "authored", "automated", "boosted",
    "budgeted", "built", "centralized", "championed", "collaborated", "constructed",
    "converted", "coordinated", "created", "customized", "debugged", "decreased",
    "delivered", "deployed", "designed", "developed", "devised", "diagnosed",
    "directed", "documented", "doubled", "drafted", "drove", "engineered",
    "enhanced", "established", "evaluated", "exceeded", "executed", "expanded",
    "expedited", "formulated", "generated", "guided", "implemented", "improved",
    "increased", "initiated", "innovated", "inspected", "installed", "integrated",
    "introduced", "investigated", "launched", "lead", "led", "managed",
    "maximized", "mentored", "migrated", "minimized", "modeled", "monitored",
    "negotiated", "optimized", "orchestrated", "organized", "overhauled", "oversaw",
    "pioneered", "planned", "programmed", "published", "redesigned", "reduced",
    "refactored", "resolved", "restructured", "revamped", "saved", "scaled",
    "secured", "simplified", "spearheaded", "standardized", "streamlined", "strengthened",
    "supervised", "trained", "transformed", "troubleshot", "upgraded", "validated",
]

STOP_WORDS = {
    "the", "and", "to", "of", "a", "in", "for", "is", "on", "that", "by", "this",
    "with", "i", "you", "it", "not", "or", "be", "are", "from", "at", "as", "your",
    "all", "have", "new", "more", "an", "was", "we", "will", "home", "can", "us",
    "about", "if", "page", "my", "has", "search", "free", "but", "our", "one",
    "other", "do", "no", "information", "time", "they", "site", "he", "up", "may",
    "what", "which", "their", "news", "out", "use", "any", "there", "see", "only",
    "so", "his", "when", "contact", "here", "business", "who", "web", "also", "now",
    "help", "get", "pm", "view", "online", "first", "am", "been", "would", "how",
    "were", "me", "s", "services", "some", "these", "click", "its", "like", "service",
    "than", "find", "price", "date", "back", "top", "people", "had", "list", "name",
    "just", "over", "state", "year", "day", "into", "email", "two", "health", "world",
    "re", "next", "used", "work", "experience", "resume", "years", "skills", "job"
}


def find_action_verbs(text: str) -> list:
    """Find power action verbs in the text."""
    text_lower = text.lower()
    found = set()
    for verb in ACTION_VERBS_DB:
        pattern = r'(?<!\w)' + re.escape(verb) + r'(?!\w)'
        if re.search(pattern, text_lower):
            found.add(verb)
    return sorted(found)


def detect_impact_metrics(text: str) -> list:
    """Detect numbers, percentages, currency, and measurable indicators in resume text."""
    # Matches patterns like 30%, $50K, 10x, 500+, 200k+, etc.
    patterns = [
        r'(?<!\w)\d+(?:\.\d+)?%',  # 30%, 99.9%
        r'\$\s*\d+(?:,\d+)*(?:\.\d+)?(?:\s*[kKmMbB](?:illion)?)?',  # $50k, $1.5M
        r'(?<!\w)\d+(?:\.\d+)?\s*(?:x|X)(?!\w)',  # 10x, 2.5x
        r'(?<!\w)\d+(?:,\d+)*(?:[kKmMbB])?\+(?!\w)',  # 500+, 1,000+, 200k+
        r'\b(?:increased|decreased|reduced|improved|boosted|saved|grew)\s+(?:by\s+)?(?:\$|\d+[%kKmMbB]*)',  # improved by 40%
    ]
    matches = []
    for pat in patterns:
        for m in re.finditer(pat, text, re.IGNORECASE):
            match_str = m.group(0).strip()
            if match_str and match_str not in matches:
                matches.append(match_str)
    return matches[:10]


def extract_keyword_density(text: str, top_n: int = 10) -> list:
    """Extract most frequent meaningful words for keyword balance analysis."""
    words = re.findall(r'\b[a-zA-Z]{3,}\b', text.lower())
    freq = {}
    for w in words:
        if w not in STOP_WORDS and len(w) > 2:
            freq[w] = freq.get(w, 0) + 1
    
    sorted_words = sorted(freq.items(), key=lambda x: x[1], reverse=True)
    return [{"word": w, "count": c} for w, c in sorted_words[:top_n]]


def calculate_grade(match_percent):
    if match_percent is None:
        return "N/A"
    if match_percent >= 90:
        return "A+"
    if match_percent >= 80:
        return "A"
    if match_percent >= 70:
        return "B+"
    if match_percent >= 60:
        return "B"
    if match_percent >= 50:
        return "C"
    return "D"


def calculate_ats_health_score(match_percent, action_verbs_count, metrics_count, sections_count, word_count):
    """Calculate an overall ATS health score (0 - 100) based on multiple industry criteria."""
    # 1. Skill Fit Score (40%)
    skill_score = match_percent if match_percent is not None else min(100, 50 + (sections_count * 15))
    
    # 2. Action Verbs Score (20%): 6+ verbs is ideal
    verb_score = min(100, int((action_verbs_count / 6) * 100))
    
    # 3. Measurable Impact Score (15%): 3+ quantified metrics is ideal
    metric_score = min(100, int((metrics_count / 3) * 100))
    
    # 4. Section Structure Score (15%): 3/3 sections
    section_score = int((sections_count / 3) * 100)
    
    # 5. Length & Readability Score (10%)
    if 250 <= word_count <= 850:
        length_score = 100
    elif 150 <= word_count <= 1100:
        length_score = 75
    else:
        length_score = 45

    overall = round(
        (skill_score * 0.40) +
        (verb_score * 0.20) +
        (metric_score * 0.15) +
        (section_score * 0.15) +
        (length_score * 0.10)
    )

    return {
        "overall_score": min(100, max(0, overall)),
        "skill_score": round(skill_score),
        "verb_score": verb_score,
        "metric_score": metric_score,
        "section_score": section_score,
        "length_score": length_score,
    }


def analyze_resume(resume_text: str, job_description: str = "") -> dict:
    resume_skills = find_skills(resume_text)
    action_verbs = find_action_verbs(resume_text)
    impact_metrics = detect_impact_metrics(resume_text)
    keyword_density = extract_keyword_density(resume_text)
    
    words = resume_text.split()
    word_count = len(words)
    reading_time = max(1, round(word_count / 200, 1))

    has_projects = bool(re.search(r'\b(project|projects)\b', resume_text.lower()))
    has_education = bool(re.search(r'\b(education|university|college|degree|bachelor|master|phd|b\.s|b\.e|m\.s|academic)\b', resume_text.lower()))
    has_experience = bool(re.search(r'\b(experience|employment|work history|career|work experience)\b', resume_text.lower()))
    
    detected_sections_count = sum([has_projects, has_education, has_experience])

    result = {
        "resume_skills": sorted(resume_skills),
        "total_skills_found": len(resume_skills),
        "action_verbs": action_verbs,
        "action_verbs_count": len(action_verbs),
        "impact_metrics": impact_metrics,
        "impact_metrics_count": len(impact_metrics),
        "keyword_density": keyword_density,
        "word_count": word_count,
        "reading_time_minutes": reading_time,
        "sections_detected": {
            "projects": has_projects,
            "education": has_education,
            "experience": has_experience,
        },
    }

    if job_description.strip():
        jd_skills = find_skills(job_description)
        missing_skills = sorted(jd_skills - resume_skills)
        matched_skills = sorted(jd_skills & resume_skills)

        match_percent = (
            round((len(matched_skills) / len(jd_skills)) * 100, 1)
            if jd_skills else 0
        )

        ats_breakdown = calculate_ats_health_score(
            match_percent, len(action_verbs), len(impact_metrics), detected_sections_count, word_count
        )

        result.update({
            "jd_skills": sorted(jd_skills),
            "matched_skills": matched_skills,
            "missing_skills": missing_skills,
            "match_percent": match_percent,
            "match_grade": calculate_grade(match_percent),
            "ats_breakdown": ats_breakdown,
            "suggestions": generate_suggestions(missing_skills, match_percent, len(action_verbs), len(impact_metrics)),
            "bullet_enhancements": generate_enhanced_bullets(matched_skills, missing_skills),
        })
    else:
        ats_breakdown = calculate_ats_health_score(
            None, len(action_verbs), len(impact_metrics), detected_sections_count, word_count
        )

        result.update({
            "jd_skills": [],
            "matched_skills": [],
            "missing_skills": [],
            "match_percent": None,
            "match_grade": "N/A",
            "ats_breakdown": ats_breakdown,
            "suggestions": generate_general_suggestions(resume_text, resume_skills, len(action_verbs), len(impact_metrics)),
            "bullet_enhancements": generate_enhanced_bullets(sorted(resume_skills), []),
        })

    return result


def generate_suggestions(missing_skills: list, match_percent: float, verbs_count: int, metrics_count: int) -> list:
    suggestions = []

    if match_percent == 100:
        suggestions.append("🌟 Outstanding match! Your resume covers 100% of the target job description's recognized technical skills.")
    elif match_percent >= 70:
        suggestions.append(f"✅ Strong compatibility ({match_percent}%). A few targeted additions could guarantee high ATS ranking.")
    else:
        suggestions.append(f"⚠️ Low skill alignment ({match_percent}%). Your resume matches under half of the required keywords for this role.")

    if missing_skills:
        top_missing = ", ".join(missing_skills[:5])
        suggestions.append(f"🎯 Add missing high-priority keywords: {top_missing} inside your experience or skills summary.")

    if verbs_count < 5:
        suggestions.append("⚡ Use more power action verbs (e.g. 'architected', 'spearheaded', 'orchestrated') to begin bullet points.")

    if metrics_count < 2:
        suggestions.append("📈 Quantify your achievements! Include measurable impact (e.g., 'reduced load time by 35%', 'managed $50k budget').")

    return suggestions


def generate_general_suggestions(resume_text: str, resume_skills: set, verbs_count: int, metrics_count: int) -> list:
    suggestions = []
    word_count = len(resume_text.split())

    if len(resume_skills) < 5:
        suggestions.append("📌 Your resume lists relatively few recognizable technical skills. Consider creating a prominent 'Technical Skills' section.")
    if word_count < 200:
        suggestions.append("📝 Your resume is under 200 words. Expand on project descriptions, tech stacks, and team contributions.")
    if word_count > 900:
        suggestions.append("✂️ Your resume is over 900 words. Keep it concise (1-2 pages maximum) to avoid ATS parsing drop-offs.")
    if verbs_count < 4:
        suggestions.append("💪 Strengthen bullet points by starting each with impactful action verbs like 'Engineered', 'Streamlined', or 'Deployed'.")
    if metrics_count < 1:
        suggestions.append("📊 Add metrics and numbers (%, $, scale, users) to prove the measurable business impact of your work.")

    if not suggestions:
        suggestions.append("🎉 Solid foundation! Paste a specific job description to receive targeted keyword gap matching.")

    return suggestions


def generate_enhanced_bullets(matched_skills: list, missing_skills: list) -> list:
    """Generate high-impact bullet rewrite examples incorporating action verbs and metrics."""
    skills = (matched_skills + missing_skills)[:4]
    tech1 = skills[0] if len(skills) > 0 else "Python"
    tech2 = skills[1] if len(skills) > 1 else "React"
    tech3 = skills[2] if len(skills) > 2 else "Docker"

    return [
        {
            "original": f"Worked on backend development using {tech1}.",
            "enhanced": f"Architected high-throughput REST APIs using {tech1}, reducing server response latency by 35% across 100k+ active monthly requests.",
            "technologies": [tech1],
            "impact": "+35% latency improvement"
        },
        {
            "original": f"Responsible for building user interface components in {tech2}.",
            "enhanced": f"Spearheaded responsive frontend redesign utilizing {tech2}, boosting mobile user engagement by 28% and streamlining checkout flow.",
            "technologies": [tech2],
            "impact": "+28% user engagement"
        },
        {
            "original": f"Helped with deployment and {tech3} containers.",
            "enhanced": f"Orchestrated containerized microservices deployment with {tech3} and automated CI/CD pipelines, slashing release cycles by 50%.",
            "technologies": [tech3],
            "impact": "50% faster release cycles"
        }
    ]


def generate_cover_letter(resume_skills: list, jd_skills: list, job_title: str = "Software Engineer", company_name: str = "Hiring Team") -> str:
    """Craft a professional, high-converting cover letter tailored to matching skills and target job."""
    matched = [s.title() for s in set(resume_skills) & set(jd_skills)] if jd_skills else [s.title() for s in resume_skills[:4]]
    matched_str = ", ".join(matched[:4]) if matched else "modern software engineering practices"

    letter = f"""Dear {company_name},

I am writing to express my strong enthusiasm for the {job_title} position. With a solid foundation in {matched_str}, I have consistently delivered robust, high-performance solutions that bridge technical complexity with measurable business impact.

Throughout my career, I have specialized in designing scalable architectures, optimizing application performance, and collaborating closely with cross-functional teams to build resilient products. My hands-on proficiency with {matched_str} allows me to rapidly integrate into engineering workflows, troubleshoot complex systems, and maintain clean, testable codebases.

I am particularly excited about this opportunity because my background in modern development methodologies and passion for continuous improvement align directly with the requirements for this role. I would welcome the opportunity to discuss how my skill set and dedication can contribute to your team's ongoing success.

Thank you for your time and consideration.

Sincerely,
Candidate
"""
    return letter.strip()

