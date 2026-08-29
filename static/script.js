/**
 * AI Resume Analyzer - Modern UI/UX Controller
 */

document.addEventListener("DOMContentLoaded", () => {
  // Elements
  const form = document.getElementById("analyzeForm");
  const resumeFileInput = document.getElementById("resumeFile");
  const dropZone = document.getElementById("dropZone");
  const dropZonePrompt = document.getElementById("dropZonePrompt");
  const fileInfoBox = document.getElementById("fileInfoBox");
  const fileNameDisplay = document.getElementById("fileNameDisplay");
  const fileSizeDisplay = document.getElementById("fileSizeDisplay");
  const fileTypeIcon = document.getElementById("fileTypeIcon");
  const removeFileBtn = document.getElementById("removeFileBtn");

  const jobDescriptionInput = document.getElementById("jobDescription");
  const jdCharCount = document.getElementById("jdCharCount");
  const clearJdBtn = document.getElementById("clearJdBtn");
  const presetButtons = document.querySelectorAll(".preset-btn");

  const submitBtn = document.getElementById("submitBtn");
  const loadingBox = document.getElementById("loadingBox");
  const loadingStatusText = document.getElementById("loadingStatusText");
  const errorBox = document.getElementById("errorBox");
  const errorMessage = document.getElementById("errorMessage");
  const resultsBox = document.getElementById("resultsBox");

  const themeToggleBtn = document.getElementById("themeToggleBtn");
  const newAnalysisBtn = document.getElementById("newAnalysisBtn");
  const copySummaryBtn = document.getElementById("copySummaryBtn");
  const printReportBtn = document.getElementById("printReportBtn");
  const skillSearchInput = document.getElementById("skillSearchInput");
  const skillTabs = document.querySelectorAll("#skillTabs .nav-link");

  // State
  let currentReportData = null;
  let activeFilter = "all";
  let activeSearchQuery = "";
  let statusInterval = null;

  // Job Presets Data
  const JOB_PRESETS = {
    fullstack: `Looking for a versatile Full Stack Developer to build modern web applications.
Requirements:
- 3+ years of experience with Python, JavaScript, TypeScript, React, and Node.js.
- Strong knowledge of relational and NoSQL databases (PostgreSQL, MongoDB, Redis).
- Experience with Docker, CI/CD, Git, GitHub, REST APIs, and microservices.
- Familiarity with Unit Testing, TDD, Agile/Scrum, and good teamwork skills.`,

    python: `Senior Python Backend Engineer.
Requirements:
- Deep experience in Python, FastAPI, Django, and Flask.
- Expertise in database architecture with PostgreSQL, Redis, and SQL.
- Strong hands-on knowledge of Docker, AWS, Git, REST API integration, and microservices.
- Experience with Unit Testing, CI/CD pipelines, and problem solving.`,

    frontend: `Frontend React Specialist.
Requirements:
- Strong proficiency in JavaScript, TypeScript, React, Next.js, HTML, and CSS.
- Experience styling with Tailwind, Bootstrap, and modern CSS systems.
- Familiarity with UI/UX Design, Figma, REST API integration, and Git.
- Passion for responsive design, accessibility, and clean architecture.`,

    ai: `AI / Machine Learning Engineer.
Requirements:
- Strong background in Python, Machine Learning, Deep Learning, and NLP.
- Hands-on experience with PyTorch, TensorFlow, Scikit-learn, Pandas, NumPy, and OpenCV.
- Knowledge of LLM, LangChain, RAG, and Vector databases.
- Experience with data analysis, data visualization, and Git.`,

    devops: `DevOps & Cloud Infrastructure Engineer.
Requirements:
- Extensive experience with AWS, GCP, Docker, and Kubernetes.
- Infrastructure as Code with Terraform and Linux administration.
- Robust CI/CD workflows using Jenkins, GitHub Actions, and Git.
- Proficiency in Nginx, microservices, security practices, and Python/Bash scripting.`,

    uiux: `UI/UX Designer & Product Specialist.
Requirements:
- Expertise in Figma, Adobe XD, Photoshop, and Illustrator.
- Proven experience in UI/UX Design, user research, wireframing, and design systems.
- Strong understanding of HTML, CSS, and collaboration with frontend developers.
- Excellent communication, leadership, and time management skills.`,
  };

  /* --------------------------------------------------------------------------
     1. Theme Management (Dark / Light Mode)
     -------------------------------------------------------------------------- */
  function initTheme() {
    const savedTheme = localStorage.getItem("resume_ai_theme") || "dark";
    setTheme(savedTheme);
  }

  function setTheme(theme) {
    document.documentElement.setAttribute("data-bs-theme", theme);
    localStorage.setItem("resume_ai_theme", theme);

    const darkIcon = themeToggleBtn.querySelector(".theme-icon-dark");
    const lightIcon = themeToggleBtn.querySelector(".theme-icon-light");

    if (theme === "dark") {
      darkIcon.classList.remove("d-none");
      lightIcon.classList.add("d-none");
    } else {
      darkIcon.classList.add("d-none");
      lightIcon.classList.remove("d-none");
    }
  }

  themeToggleBtn.addEventListener("click", () => {
    const currentTheme = document.documentElement.getAttribute("data-bs-theme") || "dark";
    setTheme(currentTheme === "dark" ? "light" : "dark");
  });

  initTheme();

  /* --------------------------------------------------------------------------
     2. Drag & Drop Resume File Handling
     -------------------------------------------------------------------------- */
  function formatBytes(bytes, decimals = 1) {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
  }

  function updateFileDisplay(file) {
    if (!file) {
      dropZonePrompt.classList.remove("d-none");
      fileInfoBox.classList.add("d-none");
      resumeFileInput.value = "";
      return;
    }

    const isPdf = file.name.toLowerCase().endsWith(".pdf");
    const isDocx = file.name.toLowerCase().endsWith(".docx");

    if (!isPdf && !isDocx) {
      showError("Please upload a valid .PDF or .DOCX resume file.");
      resumeFileInput.value = "";
      return;
    }

    errorBox.classList.add("d-none");
    fileNameDisplay.textContent = file.name;
    fileSizeDisplay.textContent = formatBytes(file.size);

    if (isPdf) {
      fileTypeIcon.innerHTML = `<i class="fa-solid fa-file-pdf text-danger fs-3"></i>`;
    } else {
      fileTypeIcon.innerHTML = `<i class="fa-solid fa-file-word text-primary fs-3"></i>`;
    }

    dropZonePrompt.classList.add("d-none");
    fileInfoBox.classList.remove("d-none");
  }

  // Prevent default drag behaviors on window & dropzone
  ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });

  ["dragenter", "dragover"].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.add("dragover");
    });
  });

  ["dragleave", "drop"].forEach((eventName) => {
    dropZone.addEventListener(eventName, () => {
      dropZone.classList.remove("dragover");
    });
  });

  // Handle Drop
  dropZone.addEventListener("drop", (e) => {
    const dt = e.dataTransfer;
    const files = dt.files;
    if (files.length > 0) {
      resumeFileInput.files = files;
      updateFileDisplay(files[0]);
    }
  });

  // Handle Manual File Select
  resumeFileInput.addEventListener("change", (e) => {
    if (e.target.files.length > 0) {
      updateFileDisplay(e.target.files[0]);
    }
  });

  // Remove File Button
  removeFileBtn.addEventListener("click", (e) => {
    e.preventDefault();
    e.stopPropagation();
    updateFileDisplay(null);
  });

  /* --------------------------------------------------------------------------
     3. Job Description & Presets
     -------------------------------------------------------------------------- */
  function updateJdWordCount() {
    const text = jobDescriptionInput.value.trim();
    const words = text ? text.split(/\s+/).length : 0;
    jdCharCount.textContent = `${words} ${words === 1 ? "word" : "words"}`;
  }

  jobDescriptionInput.addEventListener("input", updateJdWordCount);

  presetButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const presetKey = btn.getAttribute("data-preset");
      if (JOB_PRESETS[presetKey]) {
        jobDescriptionInput.value = JOB_PRESETS[presetKey];
        updateJdWordCount();

        // Brief visual feedback on button
        btn.classList.add("btn-primary", "text-white");
        setTimeout(() => {
          btn.classList.remove("btn-primary", "text-white");
        }, 400);
      }
    });
  });

  clearJdBtn.addEventListener("click", () => {
    jobDescriptionInput.value = "";
    updateJdWordCount();
  });

  /* --------------------------------------------------------------------------
     4. Form Submission & Animated Scanner Loading
     -------------------------------------------------------------------------- */
  const SCAN_MESSAGES = [
    "Extracting text and structure from document...",
    "Scanning for programming languages & frameworks...",
    "Comparing skills with target job description...",
    "Calculating ATS compatibility & match metrics...",
    "Synthesizing actionable improvement recommendations...",
  ];

  function startScanningAnimation() {
    let index = 0;
    loadingStatusText.textContent = SCAN_MESSAGES[0];
    statusInterval = setInterval(() => {
      index = (index + 1) % SCAN_MESSAGES.length;
      loadingStatusText.textContent = SCAN_MESSAGES[index];
    }, 900);
  }

  function stopScanningAnimation() {
    if (statusInterval) {
      clearInterval(statusInterval);
      statusInterval = null;
    }
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    if (!resumeFileInput.files.length) {
      showError("Please select or drop your resume file (.PDF or .DOCX).");
      return;
    }

    const formData = new FormData();
    formData.append("resume", resumeFileInput.files[0]);
    formData.append("job_description", jobDescriptionInput.value.trim());

    // UI state
    errorBox.classList.add("d-none");
    resultsBox.classList.add("d-none");
    loadingBox.classList.remove("d-none");
    submitBtn.disabled = true;
    startScanningAnimation();

    // Scroll smoothly to loading area
    loadingBox.scrollIntoView({ behavior: "smooth", block: "center" });

    try {
      const response = await fetch("/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      stopScanningAnimation();
      loadingBox.classList.add("d-none");
      submitBtn.disabled = false;

      if (!response.ok) {
        showError(data.error || "Failed to analyze resume.");
        return;
      }

      currentReportData = data;
      renderResults(data);

      // Smooth scroll to results
      setTimeout(() => {
        resultsBox.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    } catch (err) {
      stopScanningAnimation();
      loadingBox.classList.add("d-none");
      submitBtn.disabled = false;
      showError("Network connection error. Please ensure the server is running.");
    }
  });

  function showError(msg) {
    errorMessage.textContent = msg;
    errorBox.classList.remove("d-none");
    errorBox.scrollIntoView({ behavior: "smooth", block: "center" });
  }

  /* --------------------------------------------------------------------------
     5. Render Dashboard Results
     -------------------------------------------------------------------------- */
  function animateScoreNumber(targetPercent) {
    const scoreNumberEl = document.getElementById("scoreNumber");
    const ringFill = document.getElementById("scoreRingFill");
    const circumference = 314.159; // 2 * PI * 50

    if (targetPercent === null || targetPercent === undefined) {
      scoreNumberEl.textContent = "N/A";
      ringFill.style.strokeDashoffset = circumference;
      ringFill.style.stroke = "#64748b";
      return;
    }

    // Set color based on score
    let strokeColor = "#ef4444"; // red
    if (targetPercent >= 75) {
      strokeColor = "#10b981"; // green
    } else if (targetPercent >= 50) {
      strokeColor = "#f59e0b"; // yellow
    }
    ringFill.style.stroke = strokeColor;

    // Animate SVG stroke offset
    const offset = circumference - (targetPercent / 100) * circumference;
    ringFill.style.strokeDashoffset = offset;

    // Counter animation
    let current = 0;
    const duration = 1200;
    const startTime = performance.now();

    function updateCounter(currentTime) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutProgress = 1 - Math.pow(1 - progress, 3);
      current = Math.round(easeOutProgress * targetPercent);
      scoreNumberEl.textContent = `${current}%`;

      if (progress < 1) {
        requestAnimationFrame(updateCounter);
      } else {
        scoreNumberEl.textContent = `${targetPercent}%`;
      }
    }

    requestAnimationFrame(updateCounter);
  }

  function renderResults(data) {
    resultsBox.classList.remove("d-none");

    const hasJd = data.jd_skills && data.jd_skills.length > 0;

    // 1. Match Gauge & Grade
    const matchGradeBadge = document.getElementById("matchGradeBadge");
    const matchSubtext = document.getElementById("matchSubtext");
    const tabMatchedItem = document.getElementById("tabMatchedItem");
    const tabMissingItem = document.getElementById("tabMissingItem");

    if (hasJd && data.match_percent !== null) {
      animateScoreNumber(data.match_percent);
      const grade = data.match_grade || "N/A";
      matchGradeBadge.textContent = `Grade: ${grade}`;
      matchGradeBadge.className = "badge grade-badge";

      if (grade.startsWith("A")) matchGradeBadge.classList.add("grade-a");
      else if (grade.startsWith("B")) matchGradeBadge.classList.add("grade-b");
      else if (grade.startsWith("C")) matchGradeBadge.classList.add("grade-c");
      else matchGradeBadge.classList.add("grade-d");

      matchSubtext.textContent = `Matched ${data.matched_skills.length} of ${data.jd_skills.length} required skills`;
      tabMatchedItem.classList.remove("d-none");
      tabMissingItem.classList.remove("d-none");
    } else {
      animateScoreNumber(null);
      matchGradeBadge.textContent = "General Analysis";
      matchGradeBadge.className = "badge grade-badge grade-b";
      matchSubtext.textContent = "Paste a job description to calculate ATS % match";
      tabMatchedItem.classList.add("d-none");
      tabMissingItem.classList.add("d-none");
    }

    // 2. Metric Overview Counts
    document.getElementById("totalSkillsCount").textContent = data.total_skills_found || 0;
    document.getElementById("matchedSkillsCount").textContent = (data.matched_skills || []).length;
    document.getElementById("missingSkillsCount").textContent = (data.missing_skills || []).length;
    document.getElementById("resumeWordCount").textContent = data.word_count || 0;
    document.getElementById("readTimeVal").textContent = `~${data.reading_time_minutes || 1} min read`;

    // 3. ATS Health & Impact Breakdown
    const ats = data.ats_breakdown || {};
    const verbsCount = data.action_verbs_count || 0;
    const metricsCount = data.impact_metrics_count || 0;

    document.getElementById("actionVerbsCount").textContent = verbsCount;
    document.getElementById("actionVerbsScore").textContent = `${ats.verb_score || 0}% Strength`;
    document.getElementById("actionVerbsBar").style.width = `${ats.verb_score || 0}%`;

    const actionVerbsContainer = document.getElementById("actionVerbsContainer");
    actionVerbsContainer.innerHTML = "";
    if (data.action_verbs && data.action_verbs.length > 0) {
      data.action_verbs.slice(0, 10).forEach(verb => {
        const span = document.createElement("span");
        span.className = "action-verb-badge";
        span.textContent = verb;
        actionVerbsContainer.appendChild(span);
      });
    } else {
      actionVerbsContainer.innerHTML = `<span class="text-secondary fs-xs">No strong power action verbs detected.</span>`;
    }

    document.getElementById("impactMetricsCount").textContent = metricsCount;
    document.getElementById("impactMetricsScore").textContent = `${ats.metric_score || 0}% Strength`;
    document.getElementById("impactMetricsBar").style.width = `${ats.metric_score || 0}%`;

    const impactMetricsContainer = document.getElementById("impactMetricsContainer");
    impactMetricsContainer.innerHTML = "";
    if (data.impact_metrics && data.impact_metrics.length > 0) {
      data.impact_metrics.forEach(metric => {
        const span = document.createElement("span");
        span.className = "impact-metric-badge";
        span.textContent = metric;
        impactMetricsContainer.appendChild(span);
      });
    } else {
      impactMetricsContainer.innerHTML = `<span class="text-secondary fs-xs">No measurable numbers or % detected.</span>`;
    }

    // Keyword Density
    const keywordDensityContainer = document.getElementById("keywordDensityContainer");
    keywordDensityContainer.innerHTML = "";
    if (data.keyword_density && data.keyword_density.length > 0) {
      data.keyword_density.forEach(item => {
        const span = document.createElement("span");
        span.className = "keyword-density-pill";
        span.innerHTML = `<strong>${item.word}</strong>: ${item.count}x`;
        keywordDensityContainer.appendChild(span);
      });
    }

    // 4. Section Detectors
    const sections = data.sections_detected || {};
    renderSectionBadge("badgeExp", sections.experience, "Work Experience");
    renderSectionBadge("badgeProj", sections.projects, "Projects");
    renderSectionBadge("badgeEdu", sections.education, "Education");

    // 5. Tab Badge Counts
    const resumeOnlySkills = (data.resume_skills || []).filter(
      (s) => !(data.matched_skills || []).includes(s)
    );

    const allDistinctSkills = Array.from(
      new Set([
        ...(data.resume_skills || []),
        ...(data.missing_skills || []),
        ...(data.matched_skills || []),
      ])
    );

    document.getElementById("tabCountAll").textContent = allDistinctSkills.length;
    document.getElementById("tabCountMatched").textContent = (data.matched_skills || []).length;
    document.getElementById("tabCountMissing").textContent = (data.missing_skills || []).length;
    document.getElementById("tabCountResume").textContent = resumeOnlySkills.length;

    // 6. Skill Matrix Badges
    filterAndRenderSkills();

    // 7. AI Bullet Point Enhancements
    renderBulletEnhancements(data.bullet_enhancements || []);

    // 8. Actionable Suggestions
    renderSuggestions(data.suggestions || []);

    // Pre-populate Cover Letter
    generateCoverLetterPreview();
  }

  function renderSectionBadge(id, isDetected, label) {
    const el = document.getElementById(id);
    if (!el) return;
    if (isDetected) {
      el.className = "badge bg-success-subtle text-success border border-success-subtle";
      el.innerHTML = `<i class="fa-solid fa-circle-check me-1"></i> ${label}`;
    } else {
      el.className = "badge bg-secondary-subtle text-secondary border";
      el.innerHTML = `<i class="fa-solid fa-circle-minus me-1"></i> ${label} (Not detected)`;
    }
  }

  /* --------------------------------------------------------------------------
     6. Skill Matrix Filtering & Live Search
     -------------------------------------------------------------------------- */
  function filterAndRenderSkills() {
    if (!currentReportData) return;

    const container = document.getElementById("skillsContainer");
    const noMatchNotice = document.getElementById("noSkillsMatchNotice");
    container.innerHTML = "";

    const matched = new Set(currentReportData.matched_skills || []);
    const missing = new Set(currentReportData.missing_skills || []);
    const resume = new Set(currentReportData.resume_skills || []);

    // Build skill items with type tags
    let skillList = [];

    // Matched skills
    matched.forEach((s) => {
      skillList.push({ name: s, type: "matched", label: "Matched" });
    });

    // Missing skills
    missing.forEach((s) => {
      skillList.push({ name: s, type: "missing", label: "Missing from JD" });
    });

    // Resume only skills
    resume.forEach((s) => {
      if (!matched.has(s)) {
        skillList.push({ name: s, type: "resume-only", label: "Resume Only" });
      }
    });

    // Apply Tab Filter
    let filtered = skillList.filter((item) => {
      if (activeFilter === "all") return true;
      if (activeFilter === "matched") return item.type === "matched";
      if (activeFilter === "missing") return item.type === "missing";
      if (activeFilter === "resume-only") return item.type === "resume-only";
      return true;
    });

    // Apply Search Query Filter
    if (activeSearchQuery) {
      const q = activeSearchQuery.toLowerCase();
      filtered = filtered.filter((item) => item.name.toLowerCase().includes(q));
    }

    if (filtered.length === 0) {
      noMatchNotice.classList.remove("d-none");
      return;
    }

    noMatchNotice.classList.add("d-none");

    // Sort alphabetically
    filtered.sort((a, b) => a.name.localeCompare(b.name));

    filtered.forEach((item) => {
      const badge = document.createElement("span");
      badge.className = `skill-badge ${item.type}`;

      let iconHtml = `<i class="fa-solid fa-briefcase"></i>`;
      if (item.type === "matched") {
        iconHtml = `<i class="fa-solid fa-circle-check"></i>`;
      } else if (item.type === "missing") {
        iconHtml = `<i class="fa-solid fa-triangle-exclamation"></i>`;
      }

      badge.innerHTML = `${iconHtml} <span>${item.name}</span>`;
      badge.title = `${item.name} (${item.label}) - Click to copy`;

      badge.addEventListener("click", () => {
        navigator.clipboard.writeText(item.name);
        showToast(`Copied skill "${item.name}"`);
      });

      container.appendChild(badge);
    });
  }

  // Tab Switching
  skillTabs.forEach((tab) => {
    tab.addEventListener("click", (e) => {
      e.preventDefault();
      skillTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeFilter = tab.getAttribute("data-filter");
      filterAndRenderSkills();
    });
  });

  // Search Filter
  skillSearchInput.addEventListener("input", (e) => {
    activeSearchQuery = e.target.value.trim();
    filterAndRenderSkills();
  });

  /* --------------------------------------------------------------------------
     7. AI Bullet Point Enhancements
     -------------------------------------------------------------------------- */
  function renderBulletEnhancements(bullets) {
    const container = document.getElementById("bulletEnhancementsContainer");
    container.innerHTML = "";

    if (!bullets || bullets.length === 0) {
      container.innerHTML = `<div class="text-secondary fs-sm">No specific bullet recommendations.</div>`;
      return;
    }

    bullets.forEach((b, index) => {
      const card = document.createElement("div");
      card.className = "bullet-card";

      card.innerHTML = `
        <div class="d-flex justify-content-between align-items-center mb-2">
          <span class="badge bg-secondary-subtle text-secondary fs-xs">Example ${index + 1}</span>
          <div class="d-flex align-items-center gap-2">
            <span class="badge bg-success-subtle text-success fs-xs"><i class="fa-solid fa-arrow-trend-up me-1"></i>${b.impact}</span>
            <button type="button" class="btn btn-xs btn-outline-primary copy-bullet-btn" title="Copy enhanced bullet">
              <i class="fa-solid fa-copy me-1"></i>Copy
            </button>
          </div>
        </div>
        <div class="bullet-original mb-2">
          <i class="fa-solid fa-xmark text-danger me-1"></i>Before: "${b.original}"
        </div>
        <div class="bullet-enhanced">
          <i class="fa-solid fa-check text-success me-1"></i><strong>Enhanced:</strong> "${b.enhanced}"
        </div>
      `;

      const copyBtn = card.querySelector(".copy-bullet-btn");
      copyBtn.addEventListener("click", () => {
        navigator.clipboard.writeText(b.enhanced);
        showToast("Enhanced bullet copied to clipboard!");
      });

      container.appendChild(card);
    });
  }

  /* --------------------------------------------------------------------------
     8. Suggestions Rendering
     -------------------------------------------------------------------------- */
  function renderSuggestions(suggestions) {
    const container = document.getElementById("suggestionsContainer");
    container.innerHTML = "";

    if (!suggestions || suggestions.length === 0) {
      container.innerHTML = `<div class="text-secondary fs-sm">No specific recommendations at this time. Your resume is well optimized!</div>`;
      return;
    }

    suggestions.forEach((text) => {
      const item = document.createElement("div");
      item.className = "suggestion-item";

      let icon = "fa-lightbulb";
      if (text.toLowerCase().includes("outstanding") || text.toLowerCase().includes("strong") || text.toLowerCase().includes("solid")) {
        item.classList.add("success");
        icon = "fa-circle-check";
      } else if (text.toLowerCase().includes("low") || text.toLowerCase().includes("missing") || text.toLowerCase().includes("quantify")) {
        item.classList.add("warning");
        icon = "fa-triangle-exclamation";
      }

      item.innerHTML = `
        <i class="fa-solid ${icon} text-primary mt-1 flex-shrink-0"></i>
        <div>${text}</div>
      `;
      container.appendChild(item);
    });
  }

  /* --------------------------------------------------------------------------
     9. AI Tailored Cover Letter Generator
     -------------------------------------------------------------------------- */
  const coverLetterText = document.getElementById("coverLetterText");
  const coverLetterJobTitle = document.getElementById("coverLetterJobTitle");
  const coverLetterCompany = document.getElementById("coverLetterCompany");
  const regenerateCoverLetterBtn = document.getElementById("regenerateCoverLetterBtn");
  const copyCoverLetterBtn = document.getElementById("copyCoverLetterBtn");
  const downloadCoverLetterBtn = document.getElementById("downloadCoverLetterBtn");

  async function generateCoverLetterPreview() {
    if (!currentReportData) return;

    try {
      const res = await fetch("/generate-cover-letter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resume_skills: currentReportData.resume_skills || [],
          jd_skills: currentReportData.jd_skills || [],
          job_title: coverLetterJobTitle.value.trim() || "Software Engineer",
          company_name: coverLetterCompany.value.trim() || "Hiring Team"
        })
      });

      const data = await res.json();
      if (data.cover_letter) {
        coverLetterText.value = data.cover_letter;
      }
    } catch (err) {
      console.error("Cover letter error", err);
    }
  }

  if (regenerateCoverLetterBtn) {
    regenerateCoverLetterBtn.addEventListener("click", () => {
      generateCoverLetterPreview();
      showToast("Regenerated cover letter!");
    });
  }

  if (copyCoverLetterBtn) {
    copyCoverLetterBtn.addEventListener("click", () => {
      if (!coverLetterText.value) return;
      navigator.clipboard.writeText(coverLetterText.value);
      showToast("Cover letter copied to clipboard!");
    });
  }

  if (downloadCoverLetterBtn) {
    downloadCoverLetterBtn.addEventListener("click", () => {
      if (!coverLetterText.value) return;
      const blob = new Blob([coverLetterText.value], { type: "text/plain;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "Cover_Letter.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast("Downloaded Cover_Letter.txt");
    });
  }

  /* --------------------------------------------------------------------------
     10. Action Toolbar (Copy, Print, Reset)
     -------------------------------------------------------------------------- */
  function showToast(msg) {
    const toastEl = document.getElementById("actionToast");
    const toastMessage = document.getElementById("toastMessage");
    if (!toastEl) return;

    toastMessage.textContent = msg;
    const toast = new bootstrap.Toast(toastEl, { delay: 2500 });
    toast.show();
  }

  copySummaryBtn.addEventListener("click", () => {
    if (!currentReportData) return;

    const matchText =
      currentReportData.match_percent !== null
        ? `${currentReportData.match_percent}% (Grade ${currentReportData.match_grade})`
        : "N/A (No Job Description provided)";

    const summaryText = `AI Resume Analysis Report
================================
Match Score: ${matchText}
Total Skills Detected: ${currentReportData.total_skills_found || 0}
Matched Skills: ${(currentReportData.matched_skills || []).join(", ") || "None"}
Missing Skills: ${(currentReportData.missing_skills || []).join(", ") || "None"}
Action Verbs Found: ${currentReportData.action_verbs_count || 0}
Quantifiable Metrics: ${currentReportData.impact_metrics_count || 0}

AI Suggestions:
${(currentReportData.suggestions || []).map((s, i) => `${i + 1}. ${s}`).join("\n")}
================================
Generated with AI Resume Analyzer`;

    navigator.clipboard.writeText(summaryText).then(() => {
      showToast("Report summary copied to clipboard!");
    });
  });

  printReportBtn.addEventListener("click", () => {
    window.print();
  });

  newAnalysisBtn.addEventListener("click", () => {
    form.reset();
    updateFileDisplay(null);
    updateJdWordCount();
    resultsBox.classList.add("d-none");
    window.scrollTo({ top: 0, behavior: "smooth" });
  });
});

